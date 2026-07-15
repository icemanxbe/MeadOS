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

print()
if failures:
    print("%d/%d checks failed: %s" % (len(failures), total, ", ".join(failures)))
    sys.exit(1)
print("All %d server smoke checks passed." % total)
