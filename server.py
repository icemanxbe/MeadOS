#!/usr/bin/env python3
"""MeadOS server — serves the app and stores all shared data in SQLite.

Zero dependencies: Python 3.8+ standard library only.

    python3 server.py                 # http://0.0.0.0:8080, db: meados.db
    python3 server.py --port 9000
    python3 server.py --db /path/to/meados.db

API:
    GET  /api/data     -> stored state JSON (404 when nothing saved yet)
    POST /api/data     -> replace stored state (body = state JSON)
    GET  /api/health   -> {ok, found, bytes, updatedAt, savedAt, historyCount, db}
    GET  /api/security -> {ok, protected, lan, ip, trustedNets, trustCf}
    POST /api/security -> set/clear password & trusted networks (LAN only)
    GET  /share        -> the app in share mode (never password-gated)
    GET  /api/share    -> state JSON with HA credentials stripped (public)
    POST /api/asset    -> store an uploaded image as a file under labels/
    GET  /labels/<f>   -> serve label/logo images (public, immutable cache)

Optional external-access password: when set (Settings -> Server Data, or
POST /api/security from a LAN device), every request that does NOT originate
from a private/LAN address must authenticate with HTTP Basic auth (the
browser shows its native password prompt; any username, the password counts).
LAN clients are never prompted. The password is stored as a salted PBKDF2
hash in the config table. Behind a reverse proxy the original client address
is taken from the rightmost X-Forwarded-For entry, which is the one appended
by your own proxy and cannot be spoofed by the client.

Every save is also appended to a history table (pruned to the most recent
HISTORY_KEEP rows) so accidental overwrites can be recovered with any
SQLite client:  sqlite3 meados.db "SELECT saved_at, length(data) FROM history;"
"""
import argparse
import base64
import contextlib
import re
import hashlib
import hmac
import ipaddress
import json
import os
import sqlite3
import sys
import urllib.parse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HISTORY_KEEP = 50
MAX_BODY = 64 * 1024 * 1024  # 64 MB — far above any realistic state size

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_FILE = os.path.join(BASE_DIR, "index.html")

# Uploaded label/logo images live as plain files next to index.html instead
# of base64 blobs inside the state JSON — keeping the state small (page loads
# went from multi-second JSON parses back to instant) and letting you browse,
# back up, or manually drop images into the folder. Files are also reachable
# by hand: put mylabel.png in labels/ and reference it as /labels/mylabel.png.
LABELS_DIR = os.path.join(BASE_DIR, "labels")
LABEL_EXTS = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp",
    "image/svg+xml": ".svg", "image/gif": ".gif",
}
LABEL_NAME_RE = None  # compiled lazily below (re imported at top)
MAX_ASSET = 16 * 1024 * 1024

DB_PATH = os.path.join(BASE_DIR, "meados.db")  # overridden by --db


LABEL_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+\.(png|jpe?g|webp|svg|gif)$", re.I)

# Static front-end assets served next to index.html (the app's JS/CSS were
# split out of the single-file HTML for maintainability). Public, ETag-cached.
STATIC_ASSETS = {
    "/app.js": "text/javascript; charset=utf-8",
    "/app.css": "text/css; charset=utf-8",
    "/test.html": "text/html; charset=utf-8",  # zero-dep unit checks (dev tool)
    # PWA assets — all public (the install/offline shell isn't sensitive).
    "/sw.js": "text/javascript; charset=utf-8",
    "/manifest.webmanifest": "application/manifest+json; charset=utf-8",
    "/icon.svg": "image/svg+xml",
    "/icon-192.png": "image/png",
    "/icon-512.png": "image/png",
    "/icon-maskable-512.png": "image/png",
    "/apple-touch-icon.png": "image/png",
}

# ---- baseline security headers (added to every response) ---------------------
# The app is a single self-contained HTML file built around one large inline
# <script> and thousands of inline on* handlers, so the CSP MUST permit
# 'unsafe-inline' for scripts/styles — a nonce/hash policy would disable inline
# event handlers and brick the UI. We still constrain object/base/frame and pin
# the few external origins actually used: Google Fonts (CSS + font files),
# Chart.js (cdnjs) and jsQR (jsdelivr). connect-src stays broad because the
# OPTIONAL Home Assistant integration talks to a user-configured host that may
# be plain-http on the LAN. Referrer-Policy: no-referrer keeps the share token
# (carried in the URL path) out of the Referer header sent to font/CDN origins.
# No HSTS here: this origin is plain HTTP behind the user's TLS proxy; emitting
# HSTS from the origin could lock out direct LAN http:// access. The proxy can
# add HSTS if desired.
_CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https: http:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
])
SECURITY_HEADERS = (
    ("Content-Security-Policy", _CSP),
    ("X-Content-Type-Options", "nosniff"),
    ("X-Frame-Options", "DENY"),
    ("Referrer-Policy", "no-referrer"),
    ("Cross-Origin-Opener-Policy", "same-origin"),
    # Lock down powerful features; the bottle-QR scanner needs the camera (self).
    ("Permissions-Policy", "geolocation=(), microphone=(), camera=(self), interest-cohort=()"),
)


def store_label_asset(data_url):
    """Decode a data: URL and persist it under labels/. Content-addressed
    filename (sha256 prefix) so identical uploads dedupe. Returns the public
    URL path, or raises ValueError on malformed/unsupported input."""
    m = re.match(r"^data:([a-zA-Z0-9./+-]+);base64,(.+)$", data_url, re.S)
    if not m:
        raise ValueError("not a base64 data URL")
    mime = m.group(1).lower()
    if mime not in LABEL_EXTS:
        raise ValueError("unsupported image type: %s" % mime)
    try:
        blob = base64.b64decode(m.group(2), validate=False)
    except Exception:
        raise ValueError("invalid base64 payload")
    if not blob or len(blob) > MAX_ASSET:
        raise ValueError("image empty or larger than %d MB" % (MAX_ASSET // 1048576))
    name = hashlib.sha256(blob).hexdigest()[:24] + LABEL_EXTS[mime]
    os.makedirs(LABELS_DIR, exist_ok=True)
    path = os.path.join(LABELS_DIR, name)
    if not os.path.exists(path):
        with open(path, "wb") as f:
            f.write(blob)
    return "/labels/" + name


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def db_connect():
    """Connection wrapped so `with db_connect() as conn:` commits AND closes."""
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    @contextlib.contextmanager
    def _ctx():
        try:
            with conn:  # transaction scope (commit/rollback)
                yield conn
        finally:
            conn.close()
    return _ctx()


def db_init():
    with db_connect() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS state (
                   id         INTEGER PRIMARY KEY CHECK (id = 1),
                   data       TEXT NOT NULL,
                   saved_at   TEXT,
                   updated_at TEXT NOT NULL,
                   bytes      INTEGER NOT NULL
               )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS history (
                   id         INTEGER PRIMARY KEY AUTOINCREMENT,
                   data       TEXT NOT NULL,
                   saved_at   TEXT,
                   updated_at TEXT NOT NULL,
                   bytes      INTEGER NOT NULL
               )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS config (
                   key   TEXT PRIMARY KEY,
                   value TEXT NOT NULL
               )"""
        )


def get_config(key):
    with db_connect() as conn:
        row = conn.execute("SELECT value FROM config WHERE key = ?", (key,)).fetchone()
    return row[0] if row else None


def set_config(key, value):
    with db_connect() as conn:
        if value is None:
            conn.execute("DELETE FROM config WHERE key = ?", (key,))
        else:
            conn.execute(
                "INSERT INTO config (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )


# ---- trusted networks ----
# Private/loopback addresses always count as LAN. Additional CIDRs can be
# trusted via the UI (stored in config) or --trust on the command line —
# useful when requests arrive via NAT hairpin or a CDN and show a public IP.
TRUSTED_NETS_CLI = []  # filled from --trust args


def trusted_networks():
    nets = []
    raw = get_config("trusted_nets")
    if raw:
        try:
            for s in json.loads(raw):
                nets.append(ipaddress.ip_network(s, strict=False))
        except (ValueError, TypeError):
            pass
    return nets + TRUSTED_NETS_CLI


def trust_cf_header():
    return get_config("trust_cf") == "1"


# What counts as "the LAN". Deliberately NOT ipaddress.is_private: that also
# matches TEST-NET ranges and 240.0.0.0/4 (Class E) — Cloudflare's Pseudo-IPv4
# feature represents IPv6-only clients (phones on LTE!) with Class-E addresses,
# which made genuine external visitors count as LAN. Explicit list instead.
LAN_NETS = [ipaddress.ip_network(n) for n in (
    "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
    "127.0.0.0/8", "169.254.0.0/16",
    "::1/128", "fc00::/7", "fe80::/10",
)]


def ip_is_lan(ip):
    return any(ip in n for n in LAN_NETS)


# ---- external-access password (salted PBKDF2, never stored in plaintext) ----
PBKDF2_ITERATIONS = 200_000


def hash_password(pw):
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return "pbkdf2$%d$%s$%s" % (PBKDF2_ITERATIONS, salt.hex(), dk.hex())


def verify_password(pw, stored):
    try:
        _, iters, salt_hex, hash_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac(
            "sha256", pw.encode("utf-8"), bytes.fromhex(salt_hex), int(iters)
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


# ---- session cookies (HTML login page instead of HTTP Basic) -----------------
# After a correct password on /login, the browser gets a signed, HttpOnly
# session cookie so it isn't re-prompted. Cookies are HMAC-signed with a
# per-install secret (so they can't be forged) and carry an expiry.
SESSION_DAYS = 30


def _now_epoch():
    return int(datetime.now(timezone.utc).timestamp())


def session_secret():
    s = get_config("session_secret")
    if not s:
        s = os.urandom(32).hex()
        set_config("session_secret", s)
    return s


def make_session_token():
    payload = str(_now_epoch() + SESSION_DAYS * 86400)  # expiry epoch
    sig = hmac.new(session_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    return payload + "." + sig


def verify_session_token(tok):
    if not tok or "." not in tok:
        return False
    payload, sig = tok.rsplit(".", 1)
    expected = hmac.new(session_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return False
    try:
        return int(payload) > _now_epoch()
    except ValueError:
        return False


def login_logo_src():
    # Use the brewer's custom brand logo if one is set and directly servable
    # (a /labels/ asset or a data: URL); otherwise the default MeadOS crest.
    try:
        row = db_get_state()
        if row:
            logo = ((json.loads(row[0]) or {}).get("settings") or {}).get("brandLogo")
            if isinstance(logo, str) and (logo.startswith("/labels/") or logo.startswith("data:")):
                return logo
    except Exception:
        pass
    return "/icon.svg"


def login_page_html():
    # Self-contained styled login page (matches the app's dark/gold theme).
    return ("""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>MeadOS · Sign in</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Crimson+Pro:ital@0;1&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0b;color:#e8e0d0;font-family:'Crimson Pro',serif;padding:24px}
.box{width:100%;max-width:360px;background:linear-gradient(180deg,#131317,#101013);border:1px solid #2a2a35;border-radius:16px;padding:32px 28px;box-shadow:0 6px 30px rgba(0,0,0,.5);position:relative}
.box::before{content:'';position:absolute;top:0;left:26px;right:26px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.5),transparent)}
.crest{width:128px;height:128px;object-fit:contain;display:block;margin:0 auto 16px;filter:drop-shadow(0 0 14px rgba(201,168,76,.45))}
.logo{font-family:'Cinzel',serif;font-size:22px;color:#c9a84c;letter-spacing:4px;text-align:center;font-weight:700;text-shadow:0 0 20px rgba(201,168,76,.3)}
.sub{text-align:center;color:#8a7d66;font-size:12px;font-style:italic;margin:6px 0 22px}
label{display:block;font-family:'JetBrains Mono',monospace;font-size:11px;color:#8a7d66;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px}
input{width:100%;background:#18181c;border:1px solid #2a2a35;border-radius:6px;color:#e8e0d0;font-family:inherit;font-size:15px;padding:11px 13px;outline:none;transition:border-color .2s}
input:focus{border-color:#c9a84c;box-shadow:0 0 0 2px rgba(201,168,76,.12)}
button{width:100%;margin-top:16px;padding:11px;border-radius:6px;border:1px solid #c9a84c;background:linear-gradient(135deg,#2a1f08,#3d2e0a);color:#e8c97a;font-family:'Cinzel',serif;letter-spacing:2px;font-size:14px;cursor:pointer;transition:all .2s}
button:hover{background:linear-gradient(135deg,#3d2e0a,#5a4510)}
button:disabled{opacity:.6;cursor:default}
.err{color:#c05050;font-size:13px;text-align:center;min-height:18px;margin-top:12px}
</style></head><body>
<form class="box" onsubmit="return go(event)">
<img src="__LOGO_SRC__" alt="MeadOS" class="crest">
<div class="logo">MEAD&#332;S</div>
<div class="sub">Mead Brewing Companion</div>
<label for="pw">Password</label>
<input id="pw" type="password" autocomplete="current-password" autofocus>
<button id="btn" type="submit">Sign in</button>
<div class="err" id="err"></div>
</form>
<script>
function go(e){
  e.preventDefault();
  var btn=document.getElementById('btn'),err=document.getElementById('err');
  btn.disabled=true;err.textContent='';
  fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})})
    .then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j};});})
    .then(function(res){
      if(res.ok&&res.j&&res.j.ok){location.replace('/index.html'+(location.hash||''));}
      else{err.textContent=(res.j&&res.j.error)||'Sign in failed';btn.disabled=false;}
    })
    .catch(function(){err.textContent='Network error';btn.disabled=false;});
  return false;
}
</script>
</body></html>""").replace("__LOGO_SRC__", login_logo_src())


# ---- public share projection -------------------------------------------------
# Fields of a batch that are safe to expose on a public share page. Everything
# else (cost, private notes, internal fermenterId, etc.) is dropped. Whitelist,
# not blacklist — new private fields added later stay private by default.
SHARE_BATCH_FIELDS = (
    "id", "serial", "name", "recipeId", "style", "startDate",
    "volume", "og", "honey", "honeyType", "yeast", "nutrient",
)
SHARE_BOTTLING_FIELDS = ("date", "fg", "abv", "sweetness", "bottleCount")
SHARE_TASTING_FIELDS = ("date", "rating", "appearance", "aroma", "taste", "notes")
SHARE_LOG_FIELDS = ("date", "gravity")
SHARE_PHOTO_FIELDS = ("url", "caption", "stage", "date")
SHARE_RECIPE_FIELDS = (
    "id", "name", "style", "category", "ingredients",
    "minAgeDays", "peakAgeDays", "maxAgeDays",
)


def _pick(d, fields):
    if not isinstance(d, dict):
        return {}
    return {k: d[k] for k in fields if k in d}


def build_share_payload(state, token):
    """Resolve an unguessable share token to a single batch's PUBLIC projection.

    Returns a dict with just that batch (whitelisted fields), its gravity log,
    tastings, bottling summary, the matching custom recipe (only if the batch
    uses one — built-in recipes are resolved client-side), and the meadery's
    public display identity. Returns None when the token is unknown or its
    batch no longer exists.
    """
    if not isinstance(state, dict) or not token:
        return None
    tokens = state.get("shareTokens")
    if not isinstance(tokens, dict):
        return None
    batch_id = tokens.get(token)
    if not batch_id:
        return None
    batches = state.get("batches") or []
    batch = next((b for b in batches if isinstance(b, dict) and b.get("id") == batch_id), None)
    if not batch:
        return None

    logs = (state.get("logs") or {}).get(batch_id) or []
    tastings = (state.get("tastings") or {}).get(batch_id) or []
    bottling = (state.get("bottling") or {}).get(batch_id) or {}
    # Photos ride along too (only /labels/ asset URLs — they're already public
    # static files served by this same server). Whitelisted fields only.
    photos = (state.get("photos") or {}).get(batch_id) or []
    photos = [
        _pick(p, SHARE_PHOTO_FIELDS) for p in photos
        if isinstance(p, dict) and isinstance(p.get("url"), str) and p.get("url").startswith("/labels/")
    ]

    # Only ship a recipe object when the batch uses a CUSTOM recipe (built-in
    # recipe ids are recognised client-side and need nothing from the server).
    recipe = None
    rid = batch.get("recipeId")
    if rid:
        custom = state.get("customRecipes") or []
        match = next((r for r in custom if isinstance(r, dict) and r.get("id") == rid), None)
        if match:
            recipe = _pick(match, SHARE_RECIPE_FIELDS)

    ss = state.get("sharedSettings") if isinstance(state.get("sharedSettings"), dict) else {}
    meadery = {
        "brewerName": ss.get("brewerName") or "",
        "brandLogo": ss.get("brandLogo") or None,
    }

    return {
        "ok": True,
        "batch": _pick(batch, SHARE_BATCH_FIELDS),
        "logs": [_pick(l, SHARE_LOG_FIELDS) for l in logs if isinstance(l, dict)],
        "tastings": [_pick(t, SHARE_TASTING_FIELDS) for t in tastings if isinstance(t, dict)],
        "photos": photos,
        "bottling": _pick(bottling, SHARE_BOTTLING_FIELDS),
        "recipe": recipe,
        "meadery": meadery,
    }


# ---- ICS calendar feed -------------------------------------------------------
def _ics_escape(text):
    return (str(text).replace("\\", "\\\\").replace(";", "\\;")
            .replace(",", "\\,").replace("\n", "\\n").replace("\r", ""))


def _ics_fold(line):
    # RFC 5545: lines longer than 75 octets must be folded with CRLF + space.
    out = []
    while len(line.encode("utf-8")) > 73:
        # take a safe prefix (count by chars conservatively for multibyte)
        cut = 70
        while len(line[:cut].encode("utf-8")) > 73:
            cut -= 1
        out.append(line[:cut])
        line = " " + line[cut:]
    out.append(line)
    return out


def build_ics(events, token):
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MeadOS//Brewing Calendar//EN",
        "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:MeadOS Brewing",
        "X-WR-CALDESC:Upcoming mead brewing tasks and aging milestones",
    ]
    for ev in events or []:
        if not isinstance(ev, dict):
            continue
        date = str(ev.get("date") or "").replace("-", "")
        if len(date) != 8 or not date.isdigit():
            continue
        uid = _ics_escape(ev.get("uid") or (date + "@meados"))
        lines.append("BEGIN:VEVENT")
        lines.append("UID:" + uid)
        lines.append("DTSTAMP:" + stamp)
        lines.append("DTSTART;VALUE=DATE:" + date)
        lines += _ics_fold("SUMMARY:" + _ics_escape(ev.get("summary") or "MeadOS"))
        if ev.get("description"):
            lines += _ics_fold("DESCRIPTION:" + _ics_escape(ev.get("description")))
        lines.append("TRANSP:TRANSPARENT")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def db_get_state():
    with db_connect() as conn:
        row = conn.execute(
            "SELECT data, saved_at, updated_at, bytes FROM state WHERE id = 1"
        ).fetchone()
    return row


def db_put_state(raw):
    saved_at = None
    try:
        saved_at = json.loads(raw).get("savedAt")
    except (ValueError, AttributeError):
        pass
    now = utcnow()
    with db_connect() as conn:
        conn.execute(
            """INSERT INTO state (id, data, saved_at, updated_at, bytes)
               VALUES (1, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                   data = excluded.data,
                   saved_at = excluded.saved_at,
                   updated_at = excluded.updated_at,
                   bytes = excluded.bytes""",
            (raw, saved_at, now, len(raw)),
        )
        conn.execute(
            "INSERT INTO history (data, saved_at, updated_at, bytes) VALUES (?, ?, ?, ?)",
            (raw, saved_at, now, len(raw)),
        )
        conn.execute(
            "DELETE FROM history WHERE id NOT IN "
            "(SELECT id FROM history ORDER BY id DESC LIMIT ?)",
            (HISTORY_KEEP,),
        )
    return now


def db_history_list():
    with db_connect() as conn:
        rows = conn.execute(
            "SELECT id, saved_at, updated_at, bytes FROM history ORDER BY id DESC"
        ).fetchall()
    return [{"id": r[0], "savedAt": r[1], "updatedAt": r[2], "bytes": r[3]} for r in rows]


def db_history_get(hid):
    with db_connect() as conn:
        row = conn.execute("SELECT data FROM history WHERE id = ?", (hid,)).fetchone()
    return row[0] if row else None


def db_health():
    with db_connect() as conn:
        row = conn.execute(
            "SELECT saved_at, updated_at, bytes FROM state WHERE id = 1"
        ).fetchone()
        hist = conn.execute("SELECT COUNT(*) FROM history").fetchone()[0]
    out = {"ok": True, "db": os.path.basename(DB_PATH), "historyCount": hist}
    if row:
        out.update({"found": True, "savedAt": row[0], "updatedAt": row[1], "bytes": row[2]})
    else:
        out["found"] = False
    return out


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "MeadOS"

    # ---- security headers on every response ----
    # We track which headers a route already set so per-route policies win — the
    # /labels/ route sets a stricter `Content-Security-Policy: sandbox` for
    # untrusted uploaded SVGs, and we must not clobber it with the app CSP.
    def send_header(self, key, value):
        try:
            self._sent_header_keys.add(key.lower())
        except AttributeError:
            self._sent_header_keys = {key.lower()}
        super().send_header(key, value)

    def end_headers(self):
        sent = getattr(self, "_sent_header_keys", set())
        for k, v in SECURITY_HEADERS:
            if k.lower() not in sent:
                super().send_header(k, v)
        self._sent_header_keys = set()  # reset for the next response (keep-alive)
        super().end_headers()

    # ---- helpers ----
    def _send(self, code, body, ctype="application/json; charset=utf-8", extra_headers=None):
        if isinstance(body, (dict, list)):
            body = json.dumps(body)
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Expose-Headers", "X-Data-Rev")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):  # quieter logs: only API writes & errors
        if getattr(self, "path", "").startswith("/api") or (args and str(args[0]).startswith(("4", "5"))):
            sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    # ---- external-access password ----
    def _client_ip(self):
        peer = self.client_address[0]
        try:
            peer_private = ip_is_lan(ipaddress.ip_address(peer.split("%")[0]))
        except ValueError:
            peer_private = False
        if peer_private:
            # Request came through our own proxy — recover the original client.
            # Behind Cloudflare the rightmost XFF entry is just a CF edge node;
            # CF-Connecting-IP carries the real client. Only honored when
            # explicitly enabled, because a non-CF setup would let clients
            # spoof the header.
            if trust_cf_header():
                cf = self.headers.get("CF-Connecting-IP")
                if cf:
                    return cf.strip()
            xff = self.headers.get("X-Forwarded-For")
            if xff:
                # The rightmost entry was appended by OUR proxy and is the
                # address the proxy actually saw — clients can't spoof it.
                return xff.split(",")[-1].strip()
        return peer

    def _is_lan(self):
        try:
            ip = ipaddress.ip_address(self._client_ip().split("%")[0])
        except ValueError:
            return False
        if ip_is_lan(ip):
            return True
        return any(ip in net for net in trusted_networks())

    def _session_cookie(self):
        raw = self.headers.get("Cookie", "")
        for part in raw.split(";"):
            part = part.strip()
            if part.startswith("meados_session="):
                return part[len("meados_session="):]
        return ""

    def _auth_ok(self):
        """True when the request may proceed: no password set, LAN client,
        a valid login-session cookie, or valid HTTP Basic credentials (kept for
        programmatic clients; interactive users get the /login page)."""
        stored = get_config("external_password")
        if not stored or self._is_lan():
            return True
        if verify_session_token(self._session_cookie()):
            return True
        hdr = self.headers.get("Authorization", "")
        if hdr.startswith("Basic "):
            try:
                raw = base64.b64decode(hdr[6:]).decode("utf-8")
                pw = raw.split(":", 1)[1] if ":" in raw else raw
                if verify_password(pw, stored):
                    return True
            except Exception:
                pass
        return False

    def _set_cookie_header(self):
        # Secure only when the request arrived over HTTPS (don't set it on a
        # plain-http LAN/proxy hop, or the cookie would never be stored).
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto", "").lower() == "https" else ""
        return "meados_session=%s; HttpOnly; SameSite=Lax; Path=/; Max-Age=%d%s" % (
            make_session_token(), SESSION_DAYS * 86400, secure)

    def _send_auth_required(self):
        # API 401 — no WWW-Authenticate header, so browsers don't pop the native
        # Basic dialog; interactive page loads get the styled /login page instead.
        self.close_connection = True
        data = b'{"ok": false, "error": "login required"}'
        self.send_response(401)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    # ---- routes ----
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        # ---- public share endpoints — never password-gated ----
        # Share links are for guests: /share serves the app in share mode and
        # /api/share returns the state with HA credentials stripped. Everything
        # else stays behind the external-access password when one is set.
        # /share and /share/<token> both serve the read-only app shell. The
        # token (when present) is read client-side and exchanged for a single
        # sanitized batch via /api/share?token=… — it is never used to look up
        # anything here, so any string is safe to serve the shell for.
        if path == "/share" or path == "/share/" or path.startswith("/share/"):
            try:
                with open(INDEX_FILE, "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except OSError:
                self._send(500, {"ok": False, "error": "index.html not found next to server.py"})
            return
        if path == "/api/share":
            # SECURITY: a public share link must expose exactly ONE batch and
            # nothing else — no other batches, no supplies/suppliers/cabinets,
            # no settings, no HA credentials. The owner mints an unguessable
            # token (stored in state under shareTokens: {token: batchId}); we
            # resolve it server-side and return only that batch's public
            # projection. A missing/unknown token reveals nothing.
            qs = self.path.split("?", 1)[1] if "?" in self.path else ""
            token = ""
            for kv in qs.split("&"):
                if kv.startswith("token="):
                    token = urllib.parse.unquote(kv[6:]).strip()
                    break
            if not token:
                self._send(400, {"ok": False, "error": "share token required"})
                return
            row = db_get_state()
            if not row:
                self._send(404, {"ok": False, "error": "no data stored yet"})
                return
            try:
                state = json.loads(row[0])
            except ValueError:
                self._send(500, {"ok": False, "error": "stored state unreadable"})
                return
            payload = build_share_payload(state, token)
            if payload is None:
                # Indistinguishable response whether the token is unknown or the
                # batch was deleted — don't leak which.
                self._send(404, {"ok": False, "error": "share not found"})
                return
            self._send(200, json.dumps(payload).encode("utf-8"))
            return
        # Public calendar feed: /calendar/<token>.ics → all-day VEVENTs for the
        # batch whose owner enabled the feed. Gated by the same unguessable
        # token model as share links; an unknown token reveals nothing.
        if path.startswith("/calendar/") and path.endswith(".ics"):
            token = path[len("/calendar/"):-len(".ics")]
            row = db_get_state()
            state = None
            if row:
                try:
                    state = json.loads(row[0])
                except ValueError:
                    state = None
            if not state or not token or state.get("calendarToken") != token:
                self._send(404, {"ok": False, "error": "calendar not found"})
                return
            body = build_ics(state.get("calendarEvents") or [], token).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/calendar; charset=utf-8")
            self.send_header("Content-Disposition", 'inline; filename="meados.ics"')
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/favicon.ico":
            self._send(204, b"", "image/x-icon")
            return
        if path == "/login":
            # Public: the form itself must load before you're authenticated.
            # If already in (LAN / valid cookie / no password), skip to the app.
            if self._auth_ok():
                self.send_response(302)
                self.send_header("Location", "/index.html")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self._send(200, login_page_html(), "text/html; charset=utf-8")
            return
        if path == "/logout":
            self._send(200, {"ok": True}, extra_headers={
                "Set-Cookie": "meados_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"})
            return
        if path in STATIC_ASSETS:
            # Public so share-page guests (who may be behind the external
            # password) can load the app shell's JS/CSS. These contain no
            # secrets — the client app is not sensitive, only the data is, and
            # data still requires auth or a share token. Served with an ETag so
            # the ~1.4 MB app.js transfers only when it actually changes; the
            # browser revalidates with a tiny conditional request otherwise.
            fpath = os.path.join(BASE_DIR, path[1:])
            if not os.path.isfile(fpath):
                self._send(404, {"ok": False, "error": "not found"})
                return
            st = os.stat(fpath)
            etag = '"%x-%x"' % (int(st.st_mtime), st.st_size)
            if self.headers.get("If-None-Match") == etag:
                self.send_response(304)
                self.send_header("ETag", etag)
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                return
            with open(fpath, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", STATIC_ASSETS[path])
            self.send_header("Content-Length", str(len(data)))
            self.send_header("ETag", etag)
            # no-cache = always revalidate (cheap 304 when unchanged), never
            # serve a stale build silently.
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)
            return
        if path.startswith("/labels/"):
            # Public: label art must render on share pages for guests. Strict
            # filename allow-list prevents path traversal; long immutable
            # caching because content-addressed names never change content;
            # CSP sandbox neutralizes scripts inside uploaded SVGs.
            name = path[len("/labels/"):]
            if not LABEL_NAME_RE.match(name):
                self._send(404, {"ok": False, "error": "not found"})
                return
            fpath = os.path.join(LABELS_DIR, name)
            if not os.path.isfile(fpath):
                self._send(404, {"ok": False, "error": "not found"})
                return
            ext = os.path.splitext(name)[1].lower()
            mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                    ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif"}[ext]
            with open(fpath, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "sandbox")
            self.end_headers()
            self.wfile.write(data)
            return
        if path == "/":
            # Public bounce page. Legacy share links carry the batch in the
            # URL *fragment* (/#share=...), which never reaches the server —
            # so "/" can't be auth-gated without password-prompting share
            # guests. This tiny page inspects the fragment client-side:
            # share links forward to the public /share route, everything else
            # forwards to the gated /index.html with the fragment intact.
            bounce = ("<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
                      "<style>body{background:#0a0a0b}</style></head><body><script>"
                      "var h=location.hash||'';"
                      "if(h.indexOf('#share=')===0){location.replace('/share#'+h.slice(7));}"
                      "else{location.replace('/index.html'+h);}"
                      "</script></body></html>")
            self._send(200, bounce, "text/html; charset=utf-8")
            return
        if not self._auth_ok():
            # Interactive app-shell load → show the styled login page; API calls
            # get a plain 401 (the client can react without a native dialog).
            if path in ("/index.html", "/meadows.html"):
                self._send(200, login_page_html(), "text/html; charset=utf-8")
            else:
                self._send_auth_required()
            return
        if path == "/api/security":
            self._send(200, {
                "ok": True,
                "protected": bool(get_config("external_password")),
                "lan": self._is_lan(),
                "ip": self._client_ip(),
                "trustedNets": [str(n) for n in trusted_networks() if n not in TRUSTED_NETS_CLI],
                "trustCf": trust_cf_header(),
            })
            return
        if path in ("/index.html", "/meadows.html"):
            try:
                with open(INDEX_FILE, "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except OSError:
                self._send(500, {"ok": False, "error": "index.html not found next to server.py"})
        elif path == "/api/data":
            row = db_get_state()
            if row:
                # X-Data-Rev lets the client detect concurrent edits on save.
                self._send(200, row[0].encode("utf-8"), extra_headers={"X-Data-Rev": row[2] or ""})
            else:
                self._send(404, {"ok": False, "error": "no data stored yet"})
        elif path == "/api/health":
            self._send(200, db_health())
        elif path == "/api/history":
            self._send(200, {"ok": True, "items": db_history_list()})
        elif path.startswith("/api/history/"):
            try:
                hid = int(path.rsplit("/", 1)[1])
            except ValueError:
                self._send(400, {"ok": False, "error": "bad history id"})
                return
            data = db_history_get(hid)
            if data is None:
                self._send(404, {"ok": False, "error": "snapshot not found"})
            else:
                self._send(200, data.encode("utf-8"))
        else:
            self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/login":
            # Public: this IS the authentication step. Verify the password and,
            # on success, hand back a signed session cookie.
            stored = get_config("external_password")
            try:
                length = int(self.headers.get("Content-Length", 0))
            except ValueError:
                length = 0
            body = self.rfile.read(length).decode("utf-8", "replace") if length else ""
            pw = ""
            if "application/json" in self.headers.get("Content-Type", ""):
                try:
                    pw = (json.loads(body) or {}).get("password") or ""
                except ValueError:
                    pw = ""
            else:
                for kv in body.split("&"):
                    if kv.startswith("password="):
                        pw = urllib.parse.unquote_plus(kv[len("password="):])
            if not stored:
                self._send(400, {"ok": False, "error": "no password is set on this server"})
            elif verify_password(pw, stored):
                self._send(200, {"ok": True}, extra_headers={"Set-Cookie": self._set_cookie_header()})
            else:
                self._send(401, {"ok": False, "error": "Incorrect password"})
            return
        if not self._auth_ok():
            self._send_auth_required()
            return
        if path == "/api/security":
            # Changing the password is restricted to LAN clients — otherwise an
            # unprotected server could be locked by anyone on the internet.
            if not self._is_lan():
                self.close_connection = True  # request body is left unread
                self._send(403, {"ok": False, "error": "password can only be changed from inside the LAN"})
                return
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
            except (ValueError, UnicodeDecodeError):
                self._send(400, {"ok": False, "error": "invalid body"})
                return
            if "password" in body:
                pw = (body.get("password") or "").strip()
                if pw:
                    if len(pw) < 4:
                        self._send(400, {"ok": False, "error": "password too short (min 4 characters)"})
                        return
                    set_config("external_password", hash_password(pw))
                else:
                    set_config("external_password", None)
            if "trustedNets" in body:
                nets = body.get("trustedNets") or []
                if not isinstance(nets, list):
                    self._send(400, {"ok": False, "error": "trustedNets must be a list"})
                    return
                clean = []
                for s in nets:
                    try:
                        clean.append(str(ipaddress.ip_network(str(s).strip(), strict=False)))
                    except ValueError:
                        self._send(400, {"ok": False, "error": "invalid network: %s" % s})
                        return
                set_config("trusted_nets", json.dumps(clean) if clean else None)
            if "trustCf" in body:
                set_config("trust_cf", "1" if body.get("trustCf") else None)
            self._send(200, {
                "ok": True,
                "protected": bool(get_config("external_password")),
                "trustedNets": [str(n) for n in trusted_networks() if n not in TRUSTED_NETS_CLI],
                "trustCf": trust_cf_header(),
            })
            return
        if path == "/api/asset":
            try:
                length = int(self.headers.get("Content-Length", 0))
            except ValueError:
                length = 0
            if length <= 0 or length > MAX_ASSET * 2:
                self.close_connection = True
                self._send(413 if length > MAX_ASSET * 2 else 400,
                           {"ok": False, "error": "missing or oversized body"})
                return
            try:
                body = json.loads(self.rfile.read(length).decode("utf-8"))
                url = store_label_asset(body.get("data") or "")
            except (ValueError, UnicodeDecodeError) as e:
                self._send(400, {"ok": False, "error": str(e)})
                return
            self._send(200, {"ok": True, "url": url})
            return
        if path == "/api/asset/delete":
            # Delete a stored asset file. The client only calls this once it has
            # confirmed no other reference (photo/label/logo) still points at the
            # URL — assets are content-addressed, so the same file can back many
            # references. We just validate the path is a real labels/ asset name
            # and unlink it. Idempotent: a missing file is still "ok".
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
            except (ValueError, UnicodeDecodeError):
                self._send(400, {"ok": False, "error": "invalid body"})
                return
            ref = str(body.get("url") or "")
            name = ref[len("/labels/"):] if ref.startswith("/labels/") else ""
            # Filenames are 24 hex chars + a known extension (see store_label_asset)
            if not re.match(r"^[0-9a-f]{24}\.(png|jpg|webp|svg|gif)$", name):
                self._send(400, {"ok": False, "error": "not a deletable asset path"})
                return
            target = os.path.join(LABELS_DIR, name)
            # Defence in depth against traversal: resolved path must stay in LABELS_DIR
            if os.path.dirname(os.path.abspath(target)) != os.path.abspath(LABELS_DIR):
                self._send(400, {"ok": False, "error": "path outside asset directory"})
                return
            removed = False
            try:
                os.remove(target)
                removed = True
            except FileNotFoundError:
                pass
            except OSError as e:
                self._send(500, {"ok": False, "error": str(e)})
                return
            self._send(200, {"ok": True, "removed": removed})
            return
        if path == "/api/history/restore":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
                hid = int(body.get("id"))
            except (ValueError, UnicodeDecodeError, TypeError):
                self._send(400, {"ok": False, "error": "invalid body / id"})
                return
            data = db_history_get(hid)
            if data is None:
                self._send(404, {"ok": False, "error": "snapshot not found"})
                return
            updated = db_put_state(data)  # becomes current + a fresh history entry
            self._send(200, {"ok": True, "updatedAt": updated, "bytes": len(data)})
            return
        if path != "/api/data":
            self._send(404, {"ok": False, "error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self.close_connection = True  # body (if any) is left unread
            self._send(413 if length > MAX_BODY else 400,
                       {"ok": False, "error": "missing or oversized body"})
            return
        try:
            raw = self.rfile.read(length).decode("utf-8")
            json.loads(raw)  # reject non-JSON so the db can't be corrupted
        except (ValueError, UnicodeDecodeError):
            self._send(400, {"ok": False, "error": "body is not valid JSON"})
            return
        # Concurrency guard: the client sends the rev it last loaded in X-Base-Rev.
        # If the stored state moved on since then, another device saved first —
        # reject so we don't silently clobber it. "*" forces an overwrite.
        base_rev = self.headers.get("X-Base-Rev")
        cur = db_get_state()
        cur_rev = cur[2] if cur else None
        if base_rev != "*" and cur_rev and base_rev != cur_rev:
            self._send(409, {"ok": False, "error": "conflict", "currentRev": cur_rev})
            return
        updated = db_put_state(raw)
        self._send(200, {"ok": True, "bytes": len(raw), "updatedAt": updated})


def main():
    global DB_PATH
    ap = argparse.ArgumentParser(description="MeadOS server (SQLite-backed)")
    ap.add_argument("--host", default="0.0.0.0", help="bind address (default 0.0.0.0)")
    ap.add_argument("--port", type=int, default=8080, help="port (default 8080)")
    ap.add_argument("--db", default=DB_PATH, help="SQLite database path (default meados.db)")
    ap.add_argument("--trust", action="append", default=[], metavar="CIDR",
                    help="extra network that counts as LAN (repeatable), e.g. --trust 100.64.0.0/10")
    args = ap.parse_args()
    DB_PATH = os.path.abspath(args.db)
    for s in args.trust:
        TRUSTED_NETS_CLI.append(ipaddress.ip_network(s, strict=False))
    db_init()
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print("MeadOS server running on http://%s:%d" % (args.host, args.port))
    print("Data: %s (SQLite, WAL mode, last %d saves kept in history)" % (DB_PATH, HISTORY_KEEP))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
