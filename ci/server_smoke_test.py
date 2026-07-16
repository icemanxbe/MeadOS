#!/usr/bin/env python3
"""Minimal API smoke test for server.py — stdlib only, no dependencies.

Run against a live server.py instance pointed at a throwaway database:
    python3 server.py --port 8123 --db /tmp/ci.db &
    python3 ci/server_smoke_test.py http://127.0.0.1:8123

Not a substitute for the unit checks in test.html (which cover domain logic);
this only proves the HTTP surface still wires up — routing, JSON handling,
the save/reload round trip, and the concurrency-guard rev header.
"""
import json
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123"
failures = []
total = 0


def check(name, cond, detail=""):
    global total
    total += 1
    if cond:
        print("PASS: %s" % name)
    else:
        print("FAIL: %s  %s" % (name, detail))
        failures.append(name)


def get(path, headers=None):
    req = urllib.request.Request(BASE + path, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, resp.read(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


def post(path, body, headers=None):
    data = json.dumps(body).encode("utf-8") if not isinstance(body, (bytes, bytearray)) else body
    h = {"Content-Type": "application/json"}
    h.update(headers or {})
    req = urllib.request.Request(BASE + path, data=data, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, resp.read(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


# 1. Static shell + module files are served.
status, body, _ = get("/")
check("GET / -> 200", status == 200, "got %d" % status)

status, body, _ = get("/test.html")
check("GET /test.html -> 200, contains unit-checks marker", status == 200 and b"unit checks" in body, "got %d" % status)

status, body, _ = get("/core/boot/00-manifest.js")
check("GET /core/boot/00-manifest.js -> 200, contains MODULE_MANIFEST", status == 200 and b"MODULE_MANIFEST" in body, "got %d" % status)

# 2. Health/security endpoints respond with the expected shape.
status, body, _ = get("/api/health")
try:
    health = json.loads(body)
except ValueError:
    health = {}
check("GET /api/health -> 200 json", status == 200 and isinstance(health, dict), "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/security")
try:
    sec = json.loads(body)
except ValueError:
    sec = {}
check("GET /api/security -> 200, ok:true", status == 200 and sec.get("ok") is True, "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/backup-status")
try:
    bkp = json.loads(body)
except ValueError:
    bkp = {}
check("GET /api/backup-status -> 200, reports enabled + backupDir", status == 200 and "enabled" in bkp and "backupDir" in bkp, "got %d %r" % (status, body[:200]))

# The automated backups directory must never be web-servable — only /core/,
# /labels/, /assets/ are whitelisted for static serving (server.py do_GET).
status, body, _ = get("/backups/")
check("GET /backups/ -> 404 (not web-servable)", status == 404, "got %d" % status)

# 3. Fresh database: no state saved yet.
status, body, _ = get("/api/data")
check("GET /api/data on fresh db -> 404", status == 404, "got %d %r" % (status, body[:200]))

# 4. Save/reload round trip.
sample_state = {"batches": [], "settings": {"units": "metric"}, "_smokeTest": True}
status, body, _ = post("/api/data", sample_state)
try:
    saved = json.loads(body)
except ValueError:
    saved = {}
check("POST /api/data -> 200, ok:true", status == 200 and saved.get("ok") is True, "got %d %r" % (status, body[:200]))

status, body, headers = get("/api/data")
try:
    reloaded = json.loads(body)
except ValueError:
    reloaded = {}
check("GET /api/data after save -> matches what was posted", status == 200 and reloaded.get("_smokeTest") is True, "got %d %r" % (status, body[:200]))
check("GET /api/data -> X-Data-Rev header present", bool(headers.get("X-Data-Rev")), "headers: %r" % headers)

# 5. Concurrency guard: a stale X-Base-Rev must be rejected with 409.
status, body, _ = post("/api/data", sample_state, headers={"X-Base-Rev": "not-the-real-rev"})
check("POST /api/data with stale X-Base-Rev -> 409", status == 409, "got %d %r" % (status, body[:200]))

# 6. Malformed body is rejected, not silently accepted.
status, body, _ = post("/api/data", b"not json", headers={"X-Base-Rev": "*"})
check("POST /api/data with non-JSON body -> 400", status == 400, "got %d %r" % (status, body[:200]))

# 7. Gravity readings — own table, not the state blob (see server.py module
# docstring). Round trip through add/get/delete, then a transactional import,
# then the strip-and-adopt guard that protects a stale client's still-blob-
# embedded "logs" from being silently destroyed by a newer client's save.
status, body, _ = get("/api/logs")
try:
    logs0 = json.loads(body)
except ValueError:
    logs0 = {}
check("GET /api/logs -> 200, ok:true, logs:{}", status == 200 and logs0.get("ok") is True and isinstance(logs0.get("logs"), dict),
      "got %d %r" % (status, body[:200]))

status, body, _ = post("/api/logs/add", {"batchId": "smoke-b1", "entry": {"id": "smoke-e1", "date": "2026-01-01", "gravity": 1.05}})
try:
    added = json.loads(body)
except ValueError:
    added = {}
check("POST /api/logs/add -> 200, echoes the normalized entry",
      status == 200 and added.get("ok") is True and added.get("entry", {}).get("id") == "smoke-e1",
      "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/logs")
try:
    logs1 = json.loads(body)
except ValueError:
    logs1 = {}
check("GET /api/logs after add -> contains smoke-b1/smoke-e1",
      any(e.get("id") == "smoke-e1" for e in (logs1.get("logs") or {}).get("smoke-b1", [])),
      "got %r" % (logs1.get("logs"),))

status, body, _ = post("/api/logs/delete", {"batchId": "smoke-b1", "id": "smoke-e1"})
try:
    deleted = json.loads(body)
except ValueError:
    deleted = {}
check("POST /api/logs/delete -> 200, deleted:1", status == 200 and deleted.get("deleted") == 1, "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/logs")
try:
    logs2 = json.loads(body)
except ValueError:
    logs2 = {}
check("GET /api/logs after delete -> smoke-b1 gone", "smoke-b1" not in (logs2.get("logs") or {}), "got %r" % (logs2.get("logs"),))

status, body, _ = post("/api/logs/import", {"logs": {"smoke-b2": [{"id": "smoke-i1", "date": "2026-01-02", "gravity": 1.04},
                                                                    {"date": "2026-01-03", "gravity": 1.02}]}})
try:
    imported = json.loads(body)
except ValueError:
    imported = {}
check("POST /api/logs/import -> 200, count:2 (missing id auto-generated)",
      status == 200 and imported.get("ok") is True and imported.get("count") == 2,
      "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/logs")
try:
    logs3 = json.loads(body)
except ValueError:
    logs3 = {}
check("GET /api/logs after import -> smoke-b2 has exactly 2 entries, both with ids",
      len((logs3.get("logs") or {}).get("smoke-b2", [])) == 2
      and all(e.get("id") for e in (logs3.get("logs") or {}).get("smoke-b2", [])),
      "got %r" % (logs3.get("logs"),))

# Adoption: a stale client's state blob still carrying "logs" gets those
# entries upserted into the table AND the key stripped from what's stored —
# so neither a fresh save nor a fresh history snapshot ever carries it again.
status, body, _ = post("/api/data", {"batches": [], "logs": {"smoke-b3": [{"id": "smoke-stale1", "date": "2026-01-04", "gravity": 1.06}]},
                                      "_smokeTest": True})
check("POST /api/data with embedded logs bucket -> 200", status == 200, "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/data")
try:
    reloaded2 = json.loads(body)
except ValueError:
    reloaded2 = {}
check("GET /api/data after stale-client save -> 'logs' key stripped", "logs" not in reloaded2, "got keys: %r" % (list(reloaded2.keys()),))

status, body, _ = get("/api/logs")
try:
    logs4 = json.loads(body)
except ValueError:
    logs4 = {}
check("GET /api/logs after stale-client save -> smoke-stale1 was adopted",
      any(e.get("id") == "smoke-stale1" for e in (logs4.get("logs") or {}).get("smoke-b3", [])),
      "got %r" % (logs4.get("logs"),))

# 8. Competition entries — same own-table treatment as gravity readings,
# reusing the shared strip-and-adopt/db_put_state machinery. One round trip
# through add/get/delete/import is enough; the underlying plumbing is already
# proven by section 7 above.
status, body, _ = post("/api/competitions/add", {"batchId": "smoke-c1", "entry": {
    "id": "smoke-ce1", "date": "2026-01-05", "competition": "NHC", "category": "M1A",
    "score": "38.5", "maxScore": "50", "award": "gold", "notes": "Balanced"}})
try:
    comp_added = json.loads(body)
except ValueError:
    comp_added = {}
check("POST /api/competitions/add -> 200, echoes the normalized entry",
      status == 200 and comp_added.get("ok") is True and comp_added.get("entry", {}).get("id") == "smoke-ce1",
      "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/competitions")
try:
    comps1 = json.loads(body)
except ValueError:
    comps1 = {}
check("GET /api/competitions after add -> contains smoke-c1/smoke-ce1",
      any(e.get("id") == "smoke-ce1" for e in (comps1.get("competitions") or {}).get("smoke-c1", [])),
      "got %r" % (comps1.get("competitions"),))

status, body, _ = post("/api/competitions/delete", {"batchId": "smoke-c1", "id": "smoke-ce1"})
try:
    comp_deleted = json.loads(body)
except ValueError:
    comp_deleted = {}
check("POST /api/competitions/delete -> 200, deleted:1", status == 200 and comp_deleted.get("deleted") == 1, "got %d %r" % (status, body[:200]))

status, body, _ = post("/api/competitions/import", {"competitions": {"smoke-c2": [
    {"id": "smoke-ci1", "date": "2026-01-06", "competition": "Local Show", "award": "silver"}]}})
try:
    comp_imported = json.loads(body)
except ValueError:
    comp_imported = {}
check("POST /api/competitions/import -> 200, count:1", status == 200 and comp_imported.get("count") == 1, "got %d %r" % (status, body[:200]))

status, body, _ = post("/api/data", {"batches": [], "competitions": {"smoke-c3": [
    {"id": "smoke-stale-comp", "date": "2026-01-07", "competition": "Old Show", "award": "bronze"}]}})
check("POST /api/data with embedded competitions bucket -> 200", status == 200, "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/data")
try:
    reloaded3 = json.loads(body)
except ValueError:
    reloaded3 = {}
check("GET /api/data after stale-client save -> 'competitions' key stripped", "competitions" not in reloaded3, "got keys: %r" % (list(reloaded3.keys()),))

status, body, _ = get("/api/competitions")
try:
    comps2 = json.loads(body)
except ValueError:
    comps2 = {}
check("GET /api/competitions after stale-client save -> smoke-stale-comp was adopted",
      any(e.get("id") == "smoke-stale-comp" for e in (comps2.get("competitions") or {}).get("smoke-c3", [])),
      "got %r" % (comps2.get("competitions"),))

# 9. Tasting notes — same own-table treatment, plus the one real wrinkle this
# bucket has that the others don't: wheel/bjcp are nested objects, stored as
# JSON TEXT columns server-side. The add/get round trip below specifically
# checks those survive intact, not just the flat fields.
sample_wheel = {"sweetness": 3, "body": 4, "acidity": 2, "honey": 4, "fruit": 0, "spice": 1, "finish": 3, "warmth": 2}
sample_bjcp = {"aroma": 10, "appearance": 3, "flavor": 17, "mouthfeel": 4, "overall": 8, "total": 42, "descriptor": "Excellent"}
status, body, _ = post("/api/tastings/add", {"batchId": "smoke-t1", "entry": {
    "id": "smoke-te1", "date": "2026-01-08", "rating": 4, "color": "Deep gold", "aroma": "Honey, floral",
    "flavor": "Balanced, dry finish", "finish": "Long, warm", "wheel": sample_wheel, "bjcp": sample_bjcp,
    "note": "Best batch yet"}})
try:
    tasting_added = json.loads(body)
except ValueError:
    tasting_added = {}
check("POST /api/tastings/add -> 200, echoes the normalized entry",
      status == 200 and tasting_added.get("ok") is True and tasting_added.get("entry", {}).get("id") == "smoke-te1",
      "got %d %r" % (status, body[:200]))
check("POST /api/tastings/add -> wheel round-trips intact (nested JSON column)",
      tasting_added.get("entry", {}).get("wheel") == sample_wheel,
      "got %r" % (tasting_added.get("entry", {}).get("wheel"),))
check("POST /api/tastings/add -> bjcp round-trips intact (nested JSON column)",
      tasting_added.get("entry", {}).get("bjcp") == sample_bjcp,
      "got %r" % (tasting_added.get("entry", {}).get("bjcp"),))

status, body, _ = get("/api/tastings")
try:
    tastings1 = json.loads(body)
except ValueError:
    tastings1 = {}
check("GET /api/tastings after add -> contains smoke-t1/smoke-te1 with wheel/bjcp intact",
      any(e.get("id") == "smoke-te1" and e.get("wheel") == sample_wheel and e.get("bjcp") == sample_bjcp
          for e in (tastings1.get("tastings") or {}).get("smoke-t1", [])),
      "got %r" % (tastings1.get("tastings"),))

# A tasting with no BJCP scoresheet (the common case — most tastings are just
# notes/rating/wheel) must store bjcp as null, not an empty object or "null" string.
status, body, _ = post("/api/tastings/add", {"batchId": "smoke-t1", "entry": {
    "id": "smoke-te2", "date": "2026-01-09", "rating": 3, "wheel": {}, "bjcp": None, "note": "Quick check-in"}})
try:
    tasting_added2 = json.loads(body)
except ValueError:
    tasting_added2 = {}
check("POST /api/tastings/add with no bjcp -> entry.bjcp is null, not {}",
      status == 200 and tasting_added2.get("entry", {}).get("bjcp") is None,
      "got %d %r" % (status, body[:200]))

status, body, _ = post("/api/tastings/delete", {"batchId": "smoke-t1", "id": "smoke-te1"})
try:
    tasting_deleted = json.loads(body)
except ValueError:
    tasting_deleted = {}
check("POST /api/tastings/delete -> 200, deleted:1", status == 200 and tasting_deleted.get("deleted") == 1, "got %d %r" % (status, body[:200]))

status, body, _ = post("/api/tastings/import", {"tastings": {"smoke-t2": [
    {"id": "smoke-ti1", "date": "2026-01-10", "rating": 5, "color": "Pale straw", "wheel": {"sweetness": 1}}]}})
try:
    tasting_imported = json.loads(body)
except ValueError:
    tasting_imported = {}
check("POST /api/tastings/import -> 200, count:1", status == 200 and tasting_imported.get("count") == 1, "got %d %r" % (status, body[:200]))

status, body, _ = post("/api/data", {"batches": [], "tastings": {"smoke-t3": [
    {"id": "smoke-stale-tasting", "date": "2026-01-11", "rating": 2, "note": "stale client note"}]}})
check("POST /api/data with embedded tastings bucket -> 200", status == 200, "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/data")
try:
    reloaded4 = json.loads(body)
except ValueError:
    reloaded4 = {}
check("GET /api/data after stale-client save -> 'tastings' key stripped", "tastings" not in reloaded4, "got keys: %r" % (list(reloaded4.keys()),))

status, body, _ = get("/api/tastings")
try:
    tastings2 = json.loads(body)
except ValueError:
    tastings2 = {}
check("GET /api/tastings after stale-client save -> smoke-stale-tasting was adopted",
      any(e.get("id") == "smoke-stale-tasting" for e in (tastings2.get("tastings") or {}).get("smoke-t3", [])),
      "got %r" % (tastings2.get("tastings"),))

# 10. Batch additions — same own-table treatment, simplest shape of the four
# (every field is a flat string). The one thing worth checking specifically:
# /add is an upsert by id, and the client relies on that for in-place edits
# (markAdditionRemoved re-POSTs the same id with an updated removedDate)
# rather than a separate edit endpoint — verify a second /add with the same
# id actually updates the row rather than erroring or duplicating it.
status, body, _ = post("/api/additions/add", {"batchId": "smoke-a1", "entry": {
    "id": "smoke-ae1", "date": "2026-01-12", "type": "fining", "item": "Bentonite",
    "amount": "1 tsp/gal", "removeBy": "2026-01-26", "removedDate": "", "notes": "Clarifying before bottling"}})
try:
    add_added = json.loads(body)
except ValueError:
    add_added = {}
check("POST /api/additions/add -> 200, echoes the normalized entry",
      status == 200 and add_added.get("ok") is True and add_added.get("entry", {}).get("id") == "smoke-ae1",
      "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/additions")
try:
    adds1 = json.loads(body)
except ValueError:
    adds1 = {}
check("GET /api/additions after add -> contains smoke-a1/smoke-ae1, removedDate empty",
      any(e.get("id") == "smoke-ae1" and e.get("removedDate") == "" for e in (adds1.get("additions") or {}).get("smoke-a1", [])),
      "got %r" % (adds1.get("additions"),))

# The "edit" case: re-POST the same id with removedDate now set (mirrors
# markAdditionRemoved's client-side upsert) -> same row updates, no duplicate.
status, body, _ = post("/api/additions/add", {"batchId": "smoke-a1", "entry": {
    "id": "smoke-ae1", "date": "2026-01-12", "type": "fining", "item": "Bentonite",
    "amount": "1 tsp/gal", "removeBy": "2026-01-26", "removedDate": "2026-01-20", "notes": "Clarifying before bottling"}})
check("POST /api/additions/add with same id -> 200, upserts (edit-via-add)", status == 200, "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/additions")
try:
    adds2 = json.loads(body)
except ValueError:
    adds2 = {}
matching = [e for e in (adds2.get("additions") or {}).get("smoke-a1", []) if e.get("id") == "smoke-ae1"]
check("GET /api/additions after edit-via-add -> exactly 1 row, removedDate updated (not duplicated)",
      len(matching) == 1 and matching[0].get("removedDate") == "2026-01-20",
      "got %r" % (matching,))

status, body, _ = post("/api/additions/delete", {"batchId": "smoke-a1", "id": "smoke-ae1"})
try:
    add_deleted = json.loads(body)
except ValueError:
    add_deleted = {}
check("POST /api/additions/delete -> 200, deleted:1", status == 200 and add_deleted.get("deleted") == 1, "got %d %r" % (status, body[:200]))

status, body, _ = post("/api/additions/import", {"additions": {"smoke-a2": [
    {"id": "smoke-ai1", "date": "2026-01-13", "type": "primary", "item": "Fermaid-O", "amount": "5 g"}]}})
try:
    add_imported = json.loads(body)
except ValueError:
    add_imported = {}
check("POST /api/additions/import -> 200, count:1", status == 200 and add_imported.get("count") == 1, "got %d %r" % (status, body[:200]))

status, body, _ = post("/api/data", {"batches": [], "additions": {"smoke-a3": [
    {"id": "smoke-stale-add", "date": "2026-01-14", "type": "stabilizer", "item": "Potassium sorbate"}]}})
check("POST /api/data with embedded additions bucket -> 200", status == 200, "got %d %r" % (status, body[:200]))

status, body, _ = get("/api/data")
try:
    reloaded5 = json.loads(body)
except ValueError:
    reloaded5 = {}
check("GET /api/data after stale-client save -> 'additions' key stripped", "additions" not in reloaded5, "got keys: %r" % (list(reloaded5.keys()),))

status, body, _ = get("/api/additions")
try:
    adds3 = json.loads(body)
except ValueError:
    adds3 = {}
check("GET /api/additions after stale-client save -> smoke-stale-add was adopted",
      any(e.get("id") == "smoke-stale-add" for e in (adds3.get("additions") or {}).get("smoke-a3", [])),
      "got %r" % (adds3.get("additions"),))

print()
if failures:
    print("%d/%d checks failed: %s" % (len(failures), total, ", ".join(failures)))
    sys.exit(1)
print("All %d server smoke checks passed." % total)
