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

print()
if failures:
    print("%d/%d checks failed: %s" % (len(failures), total, ", ".join(failures)))
    sys.exit(1)
print("All %d server smoke checks passed." % total)
