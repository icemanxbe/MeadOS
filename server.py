#!/usr/bin/env python3
# MeadOS — © 2026 icemanxbe (https://github.com/icemanxbe/MeadOS)
# Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE):
# free to use, modify and share for noncommercial purposes; selling is not permitted.
# Required Notice: Copyright © 2026 icemanxbe (https://github.com/icemanxbe/MeadOS)
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
import threading
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HISTORY_KEEP = 200  # state is a few tens of KB now, so deep undo history is cheap
MAX_BODY = 64 * 1024 * 1024  # 64 MB — far above any realistic state size

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_FILE = os.path.join(BASE_DIR, "index.html")

# Uploaded images live as plain files (not base64 blobs in the state JSON) so
# state stays small and the files are browsable/backup-able. They're organised
# under assets/ by purpose for tidiness:
#   assets/labels/  — bottle-label art
#   assets/photos/  — batch photo-journal images
#   assets/brand/   — brand logo + app/PWA icons (config images)
# Content-addressed filenames (sha256 prefix) are globally unique, so the same
# file resolves no matter which subdir it's in — that's what lets old
# /labels/<name> references keep working after the reorg (see find_user_asset).
LABELS_DIR = os.path.join(BASE_DIR, "labels")  # legacy dir, still searched
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
USER_ASSET_DIRS = {
    "labels": os.path.join(ASSETS_DIR, "labels"),
    "photos": os.path.join(ASSETS_DIR, "photos"),
    "brand":  os.path.join(ASSETS_DIR, "brand"),
}
# Bundled web assets moved out of the repo root for tidiness. The URL path is
# unchanged (e.g. /icon-192.png); only the on-disk location moved here.
BUNDLED_ASSET_FILE = {
    "/icon.svg": "assets/icons/icon.svg",
    "/icon-192.png": "assets/icons/icon-192.png",
    "/icon-512.png": "assets/icons/icon-512.png",
    "/icon-maskable-512.png": "assets/icons/icon-maskable-512.png",
    "/apple-touch-icon.png": "assets/icons/apple-touch-icon.png",
    "/chart.umd.js": "assets/vendor/chart.umd.js",
    "/jsQR.min.js": "assets/vendor/jsQR.min.js",
}
LABEL_EXTS = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp",
    "image/svg+xml": ".svg", "image/gif": ".gif",
}
LABEL_NAME_RE = None  # compiled lazily below (re imported at top)
ASSET_NAME_RE = re.compile(r"^[0-9a-f]{24}\.(?:png|jpe?g|webp|svg|gif)$", re.I)
# A public image reference: /labels/<name> (legacy) or /assets/<sub>/<name>.
PUBLIC_REF_RE = re.compile(
    r"^/(?:labels|assets/(?:labels|photos|brand))/([0-9a-f]{24}\.(?:png|jpe?g|webp|svg|gif))$", re.I)
MAX_ASSET = 16 * 1024 * 1024

DB_PATH = os.path.join(BASE_DIR, "meados.db")  # overridden by --db


def find_user_asset(name):
    """Locate a content-addressed upload by filename across the user-asset dirs
    (and the legacy labels/ dir). Returns the full path or None. Names are unique
    (content hash), so search-by-name keeps every old reference working no matter
    which subdir the file ends up in."""
    if not name or not ASSET_NAME_RE.match(name):
        return None
    for d in list(USER_ASSET_DIRS.values()) + [LABELS_DIR]:
        p = os.path.join(d, name)
        if os.path.isfile(p):
            return p
    return None


def public_asset_ref(ref):
    """Return ref unchanged if it's a valid /labels/ or /assets/ image reference
    that resolves to a real file on disk; else None."""
    if not isinstance(ref, str):
        return None
    m = PUBLIC_REF_RE.match(ref)
    return ref if (m and find_user_asset(m.group(1))) else None


_ASSET_REF_PAT = re.compile(
    r"/(?:labels|assets/(?:labels|photos|brand))/([0-9a-f]{24}\.(?:png|jpe?g|webp|svg|gif))", re.I)


def referenced_asset_names():
    """Every asset filename referenced by the current state OR any history
    snapshot — so orphan cleanup never deletes an image a restorable snapshot
    still needs."""
    names = set()
    blobs = []
    row = db_get_state()
    if row:
        blobs.append(row[0])
    try:
        with db_connect() as conn:
            for (d,) in conn.execute("SELECT data FROM history"):
                if d:
                    blobs.append(d)
    except sqlite3.Error:
        pass
    for b in blobs:
        for m in _ASSET_REF_PAT.finditer(b or ""):
            names.add(m.group(1).lower())
    return names


def scan_orphan_assets():
    """Uploaded image files not referenced anywhere (current state or history)."""
    referenced = referenced_asset_names()
    out, seen = [], set()
    for sub, d in list(USER_ASSET_DIRS.items()) + [("labels", LABELS_DIR)]:
        if not os.path.isdir(d):
            continue
        for fn in os.listdir(d):
            if not ASSET_NAME_RE.match(fn) or fn.lower() in seen:
                continue
            seen.add(fn.lower())
            if fn.lower() not in referenced:
                try:
                    sz = os.path.getsize(os.path.join(d, fn))
                except OSError:
                    sz = 0
                out.append({"name": fn, "dir": sub, "bytes": sz})
    return out


def _asset_kind_map():
    """name -> 'labels'|'photos'|'brand' for the CURRENT state's references, used
    to sort existing uploads into the right subdir during migration."""
    m = {}
    row = db_get_state()
    if not row:
        return m
    try:
        st = json.loads(row[0])
    except ValueError:
        return m

    def add(ref, kind):
        if isinstance(ref, str):
            mm = re.search(r"/([0-9a-f]{24}\.(?:png|jpe?g|webp|svg|gif))$", ref, re.I)
            if mm:
                m[mm.group(1).lower()] = kind

    ss = st.get("sharedSettings") if isinstance(st.get("sharedSettings"), dict) else {}
    add(ss.get("brandLogo"), "brand")
    add(ss.get("appIcon"), "brand")
    cl = ss.get("customLabels") if isinstance(ss.get("customLabels"), dict) else {}
    for v in cl.values():
        add(v, "labels")
    photos = st.get("photos") if isinstance(st.get("photos"), dict) else {}
    for arr in photos.values():
        if isinstance(arr, list):
            for p in arr:
                if isinstance(p, dict):
                    add(p.get("url"), "photos")
    return m


def migrate_assets():
    """One-time tidy (idempotent): move bundled web assets and existing uploads
    into the assets/ tree. Safe because find_user_asset resolves files wherever
    they end up, so references keep working throughout."""
    for d in ([ASSETS_DIR, os.path.join(ASSETS_DIR, "icons"), os.path.join(ASSETS_DIR, "vendor")]
              + list(USER_ASSET_DIRS.values())):
        os.makedirs(d, exist_ok=True)
    # Bundled icons/vendor: repo root -> assets/.
    for url, rel in BUNDLED_ASSET_FILE.items():
        dst = os.path.join(BASE_DIR, rel)
        legacy = os.path.join(BASE_DIR, url[1:])
        if not os.path.isfile(dst) and os.path.isfile(legacy):
            try:
                os.replace(legacy, dst)
            except OSError:
                pass
    # Existing uploads: legacy labels/ -> assets/<kind>/ by reference.
    if os.path.isdir(LABELS_DIR):
        kinds = _asset_kind_map()
        for fn in os.listdir(LABELS_DIR):
            if not ASSET_NAME_RE.match(fn):
                continue
            dst = os.path.join(USER_ASSET_DIRS[kinds.get(fn.lower(), "labels")], fn)
            if os.path.exists(dst):
                continue
            try:
                os.replace(os.path.join(LABELS_DIR, fn), dst)
            except OSError:
                pass
        try:
            if not os.listdir(LABELS_DIR):
                os.rmdir(LABELS_DIR)
        except OSError:
            pass


LABEL_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+\.(png|jpe?g|webp|svg|gif)$", re.I)

# Static front-end assets served next to index.html (the app's JS/CSS were
# split out of the single-file HTML for maintainability). Public, ETag-cached.
STATIC_ASSETS = {
    # The app's JS now lives as ordered modules under core/ (served by the
    # /core/ handler in do_GET); only app.css remains a top-level static asset.
    "/app.css": "text/css; charset=utf-8",
    # /test.html (zero-dep dev unit page) is served LAN-only — see do_GET.
    # PWA assets — all public (the install/offline shell isn't sensitive).
    "/sw.js": "text/javascript; charset=utf-8",
    "/icon.svg": "image/svg+xml",
    "/icon-192.png": "image/png",
    "/icon-512.png": "image/png",
    "/icon-maskable-512.png": "image/png",
    "/apple-touch-icon.png": "image/png",
    # Self-hosted libs (so script-src needs no third-party CDN origins).
    "/chart.umd.js": "text/javascript; charset=utf-8",
    "/jsQR.min.js": "text/javascript; charset=utf-8",
}

# ---- baseline security headers (added to every response) ---------------------
# The app is a single self-contained HTML file built around one large inline
# <script> and thousands of inline on* handlers, so the CSP MUST permit
# 'unsafe-inline' for scripts/styles — a nonce/hash policy would disable inline
# event handlers and brick the UI. We still constrain object/base/frame and pin
# the few external origins actually used. Chart.js and jsQR are now SELF-HOSTED,
# so script-src needs no third-party CDN; only Google Fonts (CSS + font files)
# stay pinned for styles/fonts. connect-src stays broad because the
# OPTIONAL Home Assistant integration talks to a user-configured host that may
# be plain-http on the LAN. Referrer-Policy: no-referrer keeps the share token
# (carried in the URL path) out of the Referer header sent to font/CDN origins.
# No HSTS here: this origin is plain HTTP behind the user's TLS proxy; emitting
# HSTS from the origin could lock out direct LAN http:// access. The proxy can
# add HSTS if desired.
_CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
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


def store_label_asset(data_url, kind="labels"):
    """Decode a data: URL and persist it under assets/<kind>/. Content-addressed
    filename (sha256 prefix) so identical uploads dedupe. `kind` ∈ labels|photos|
    brand (anything else → labels). Returns the public URL path, or raises
    ValueError on malformed/unsupported input."""
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
    sub = kind if kind in USER_ASSET_DIRS else "labels"
    name = hashlib.sha256(blob).hexdigest()[:24] + LABEL_EXTS[mime]
    d = USER_ASSET_DIRS[sub]
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, name)
    if not os.path.exists(path):
        with open(path, "wb") as f:
            f.write(blob)
    return "/assets/" + sub + "/" + name


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


# ---- Home Assistant connection (token kept server-side, never in state) ----
# The HA long-lived token used to ride the synced state blob, so it sat in the
# DB, in 50 history snapshots, and was served to every device. Now it lives in
# config and all HA calls are proxied server-side (POST /api/ha) so the browser
# never holds it. URLs are not secret but are also kept here so the proxy needs
# no state parse per call.
def _jwt_exp(tok):
    # Decode (without verifying) the exp claim of a JWT long-lived token so the
    # UI can show a rotation reminder. Returns unix seconds or None.
    if not tok or tok.count(".") != 2:
        return None
    try:
        payload = tok.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        exp = json.loads(base64.urlsafe_b64decode(payload)).get("exp")
        return int(exp) if isinstance(exp, (int, float)) else None
    except (ValueError, TypeError):
        return None


def extract_ha_token(raw):
    """If a state blob carries the HA token (legacy / stale client), move it to
    config and strip it from the blob. Returns the cleaned JSON string (same
    object when nothing changed)."""
    if '"haToken"' not in raw:
        return raw
    try:
        obj = json.loads(raw)
    except ValueError:
        return raw
    ss = obj.get("sharedSettings")
    if not isinstance(ss, dict) or "haToken" not in ss:
        return raw
    tok = (ss.pop("haToken") or "").strip()
    # Adopt the token/URLs ONLY as a one-time migration (when nothing is
    # configured server-side yet). After that, a stale client's state can no
    # longer clobber the server-managed token — we just strip and discard it.
    if tok and not get_config("ha_token"):
        set_config("ha_token", tok)
        if ss.get("haUrl"):
            set_config("ha_url", ss["haUrl"])
        if ss.get("haUrlExternal"):
            set_config("ha_url_external", ss["haUrlExternal"])
    return json.dumps(obj)


def migrate_ha_token():
    # One-time on boot: clean the token out of the currently-stored state.
    row = db_get_state()
    if not row:
        return
    cleaned = extract_ha_token(row[0])
    if cleaned is not row[0]:
        with db_connect() as conn:
            conn.execute("UPDATE state SET data = ?, bytes = ? WHERE id = 1",
                         (cleaned, len(cleaned)))


def ha_proxy_urls():
    return [u for u in (get_config("ha_url"), get_config("ha_url_external")) if u]


# Exactly the Home Assistant REST surface the MeadOS client actually uses. The
# /api/ha proxy rejects everything else — HA config/admin, templates, supervisor,
# service restarts, service domains other than `notify`, and any verb that isn't
# GET/POST — so a compromised or hostile client can't drive the whole HA API
# with our long-lived token. (allowed-methods, path-regex); query string ignored.
HA_ALLOW = (
    (("GET",),        re.compile(r"/api/?$")),                 # REST root ping
    (("GET",),        re.compile(r"/api/states/?$")),          # list states
    (("GET", "POST"), re.compile(r"/api/states/[^/]+$")),      # read / write one entity
    (("GET",),        re.compile(r"/api/history/period/[^/]*$")),  # sensor history
    (("POST",),       re.compile(r"/api/services/notify/[^/]+$")),  # push notifications only
)


def ha_path_allowed(method, path_no_query):
    return any(method in methods and rx.match(path_no_query)
               for methods, rx in HA_ALLOW)


def lan_requires_password():
    # When on, LAN devices must also log in (no automatic LAN bypass). Only
    # meaningful when an external password is set.
    return get_config("lan_requires_password") == "1"


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


# ---- login brute-force throttle (in-memory, per client IP) -------------------
# A self-host runs one process, so a lock-guarded dict is plenty: count failures
# per IP inside a rolling window and trip a timed lockout once they pile up.
# Cleared on a successful login and on restart.
# ponytail: dict is unbounded in theory; pruned opportunistically below, and a
# single box behind Cloudflare won't see enough distinct IPs to matter.
LOGIN_MAX_FAILS = 8
LOGIN_WINDOW = 300        # seconds to accumulate failures before the count resets
LOGIN_LOCKOUT = 900       # seconds locked out once the threshold trips
_login_fails = {}         # ip -> {"n": int, "first": epoch, "until": epoch}
_login_lock = threading.Lock()


def login_locked_for(ip):
    """Seconds left on a lockout for this IP, or 0 if it may attempt a login."""
    now = _now_epoch()
    with _login_lock:
        rec = _login_fails.get(ip)
        if rec and rec["until"] > now:
            return rec["until"] - now
    return 0


def login_note_failure(ip):
    """Record a failed attempt; return True if this one trips a fresh lockout."""
    now = _now_epoch()
    with _login_lock:
        if len(_login_fails) > 2048:  # prune expired entries before growing further
            for k in [k for k, v in _login_fails.items()
                      if v["until"] < now and now - v["first"] > LOGIN_WINDOW]:
                _login_fails.pop(k, None)
        rec = _login_fails.get(ip)
        if not rec or now - rec["first"] > LOGIN_WINDOW:
            rec = {"n": 0, "first": now, "until": 0}
        rec["n"] += 1
        tripped = rec["n"] >= LOGIN_MAX_FAILS
        if tripped:
            rec.update(n=0, first=now, until=now + LOGIN_LOCKOUT)
        _login_fails[ip] = rec
        return tripped


def login_note_success(ip):
    with _login_lock:
        _login_fails.pop(ip, None)


def audit(event, ip, **fields):
    """One structured security line to stderr (captured by launchd). Records
    auth and security-config events. Never logs passwords, tokens or cookies."""
    parts = ["AUDIT", event, "ip=" + str(ip)]
    parts += ["%s=%s" % (k, v) for k, v in fields.items()]
    sys.stderr.write("[%s] %s\n" % (
        datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), " ".join(parts)))
    sys.stderr.flush()


def login_logo_src():
    # Read the brand logo straight from the stored state — the SAME image MeadOS
    # renders everywhere — so the login page can never drift out of sync or get
    # wiped by a save. /labels/ assets are served publicly (see do_GET), so an
    # unauthenticated visitor can load it. Falls back to the default crest.
    row = db_get_state()
    if not row:
        return "/icon.svg"
    try:
        st = json.loads(row[0])
    except ValueError:
        return "/icon.svg"
    brand = ""
    # The blob stores brand identity under sharedSettings; tolerate a plain
    # `settings` block too in case an older/partial blob used that shape.
    for container in (st.get("sharedSettings"), st.get("settings")):
        if isinstance(container, dict) and container.get("brandLogo"):
            brand = container["brandLogo"]
            break
    if isinstance(brand, str) and brand:
        if brand.startswith("data:image/"):
            return brand  # self-contained, allowed by img-src 'self' data:
        if public_asset_ref(brand):
            return brand
    return "/icon.svg"


def app_icon_src():
    # Icon for PWA/favicon use. Prefer the purpose-built square dark-background
    # app icon (settings.appIcon, generated client-side) so the home-screen icon
    # isn't clipped; fall back to the raw brand logo, then the default crest.
    row = db_get_state()
    if row:
        try:
            st = json.loads(row[0])
            for container in (st.get("sharedSettings"), st.get("settings")):
                if isinstance(container, dict) and container.get("appIcon"):
                    ic = container["appIcon"]
                    if isinstance(ic, str) and ic:
                        if ic.startswith("data:image/"):
                            return ic
                        if public_asset_ref(ic):
                            return ic
                    break
        except ValueError:
            pass
    return login_logo_src()  # brand logo, or /icon.svg when nothing is set


def login_page_html():
    # Self-contained styled login page (matches the app's dark/gold theme).
    return ("""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>MeadOS · Sign in</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Crimson+Pro:ital@0;1&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0b;color:#e8e0d0;font-family:'Crimson Pro',serif;padding:24px}
.box{width:100%;max-width:360px;background:linear-gradient(180deg,#131317,#101013);border:1px solid #2a2a35;border-radius:16px;padding:32px 28px;box-shadow:0 6px 30px rgba(0,0,0,.5);position:relative}
.box::before{content:'';position:absolute;top:0;left:26px;right:26px;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.5),transparent)}
.crest{width:128px;height:128px;object-fit:contain;display:block;margin:0 auto 16px}
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
<div style="text-align:center;margin-top:20px;font-size:10px;color:#5e533f;letter-spacing:.5px;line-height:1.7">© 2026 icemanxbe · PolyForm Noncommercial 1.0.0</div>
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
        if isinstance(p, dict) and isinstance(p.get("url"), str)
        and (p["url"].startswith("/labels/") or p["url"].startswith("/assets/"))
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

    # The batch's bottle-label art, so the share page can show the label. Only a
    # public /labels/ asset or a self-contained data: URL is shippable (a guest
    # can't resolve a media-source:// ref); anything else is omitted.
    label_image = None
    custom_labels = ss.get("customLabels") if isinstance(ss.get("customLabels"), dict) else {}
    lref = custom_labels.get(rid) if rid else None
    if isinstance(lref, str) and (public_asset_ref(lref) or lref.startswith("data:image/")):
        label_image = lref

    # The recipe's Label-Maker overlay config (text positions/colours), so the
    # share page renders the label exactly as configured. Just layout data — no
    # secrets — and the client suppresses QR + drinking-window itself.
    recipe_overlays = None
    overlays_map = ss.get("recipeOverlays") if isinstance(ss.get("recipeOverlays"), dict) else {}
    if rid and isinstance(overlays_map.get(rid), dict):
        recipe_overlays = overlays_map.get(rid)

    # The recipe's Label Studio design — FRONT side only, since the share page
    # shows a single print-ready front label. Layout + embedded art, no secrets.
    label_studio = None
    studio_map = ss.get("labelStudio") if isinstance(ss.get("labelStudio"), dict) else {}
    if rid and isinstance(studio_map.get(rid), dict):
        dsn = studio_map.get(rid)
        front = dsn.get("front") if isinstance(dsn.get("front"), dict) else None
        if front:
            label_studio = {"w": dsn.get("w") or 340, "h": dsn.get("h") or 440, "front": front}

    return {
        "ok": True,
        "batch": _pick(batch, SHARE_BATCH_FIELDS),
        "logs": [_pick(l, SHARE_LOG_FIELDS) for l in logs if isinstance(l, dict)],
        "tastings": [_pick(t, SHARE_TASTING_FIELDS) for t in tastings if isinstance(t, dict)],
        "photos": photos,
        "bottling": _pick(bottling, SHARE_BOTTLING_FIELDS),
        "recipe": recipe,
        "meadery": meadery,
        "labelImage": label_image,
        "recipeOverlays": recipe_overlays,
        "labelStudio": label_studio,
        "labelLocale": ss.get("labelLocale") if isinstance(ss.get("labelLocale"), str) else "en",
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
    # A stale (SW-cached) client could still ship the HA token inside the state
    # blob — relocate it to config so it never lands in the DB or history.
    raw = extract_ha_token(raw)
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

    def version_string(self):
        # Default would append "Python/3.x.y" to the Server header — don't
        # advertise the interpreter version.
        return self.server_version

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

    def _origin_ok(self):
        """Reject cross-site state-changing requests. When the browser sends an
        Origin (or Referer) header its host must match the Host we were addressed
        by. Absent on same-origin programmatic clients (curl/Basic) → allowed;
        the session cookie is SameSite=Lax so browsers won't attach it
        cross-site anyway. This is the lightweight half of CSRF defence."""
        src = self.headers.get("Origin") or self.headers.get("Referer") or ""
        if not src:
            return True
        try:
            oh = urllib.parse.urlsplit(src).netloc.lower()
        except ValueError:
            return False
        host = (self.headers.get("Host") or "").lower()
        # Match on hostname, tolerating a port difference between the two.
        return bool(oh) and oh.split(":")[0] == host.split(":")[0]

    def _session_cookie(self):
        raw = self.headers.get("Cookie", "")
        for part in raw.split(";"):
            part = part.strip()
            if part.startswith("meados_session="):
                return part[len("meados_session="):]
        return ""

    def _auth_ok(self):
        """True when the request may proceed: no password set, a valid login
        cookie, valid HTTP Basic credentials (kept for programmatic clients), or
        a LAN client — unless 'require password on LAN' is enabled."""
        stored = get_config("external_password")
        if not stored:
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
        if self._is_lan() and not lan_requires_password():
            return True
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
        if path == "/manifest.webmanifest":
            # Dynamic so the install icon follows the configured brand logo. The
            # "any" icons point at /brand-icon (brand or default); the maskable
            # launcher icon stays the bundled one so a circular/transparent brand
            # logo doesn't get clipped by the OS square mask.
            # When a brand logo is set, use it for the home-screen (maskable)
            # icon too — the user opted into the brand logo everywhere, clipping
            # by the OS mask and all. With no brand logo, fall back to the
            # bundled maskable icon (which has the proper safe-zone padding).
            brand_set = app_icon_src() != "/icon.svg"
            mask_icon = ({"src": "/brand-icon", "sizes": "512x512", "purpose": "maskable"}
                         if brand_set else
                         {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"})
            man = {
                "name": "MeadOS · Mead Brewing Companion",
                "short_name": "MeadOS",
                "description": "Track mead batches, fermentation, the cellar, recipes and brewing tools.",
                "start_url": "/index.html", "scope": "/", "display": "standalone",
                "orientation": "any", "background_color": "#0a0a0b", "theme_color": "#0a0a0b",
                "icons": [
                    {"src": "/brand-icon", "sizes": "192x192", "purpose": "any"},
                    {"src": "/brand-icon", "sizes": "512x512", "purpose": "any"},
                    mask_icon,
                    {"src": "/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"},
                ],
            }
            self._send(200, json.dumps(man), "application/manifest+json; charset=utf-8")
            return
        if path == "/brand-icon":
            # The configured brand logo if one is set, else the bundled default
            # icon. Backs the PWA manifest icons and the browser-tab favicon.
            src = app_icon_src()  # squared app icon, brand logo, or /icon.svg
            data = None
            mime = "image/png"
            fp = find_user_asset(src.rsplit("/", 1)[-1]) if (src.startswith("/labels/") or src.startswith("/assets/")) else None
            if fp:
                ext = os.path.splitext(fp)[1].lower()
                mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                        ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif"}.get(ext, "image/png")
                try:
                    with open(fp, "rb") as f:
                        data = f.read()
                except OSError:
                    data = None
            elif src.startswith("data:image/"):
                try:
                    head, b64 = src.split(",", 1)
                    mime = head[5:].split(";")[0] or "image/png"
                    data = base64.b64decode(b64)
                except Exception:
                    data = None
            if data is None:  # no/unreadable brand logo → bundled default
                try:
                    with open(os.path.join(BASE_DIR, BUNDLED_ASSET_FILE["/icon-512.png"]), "rb") as f:
                        data = f.read()
                    mime = "image/png"
                except OSError:
                    self._send(404, {"ok": False, "error": "no icon"})
                    return
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-cache")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(data)
            return
        if path == "/test.html":
            # Zero-dependency dev unit page — LAN clients only, never exposed to
            # external visitors (it's a developer tool, not part of the app).
            if not self._is_lan():
                self._send(404, {"ok": False, "error": "not found"})
                return
            fpath = os.path.join(BASE_DIR, "test.html")
            if not os.path.isfile(fpath):
                self._send(404, {"ok": False, "error": "not found"})
                return
            with open(fpath, "rb") as f:
                self._send(200, f.read(), "text/html; charset=utf-8")
            return
        if path.startswith("/core/") and path.endswith(".js") and ".." not in path:
            # The app's modular JS (core/*.js + the split-out data files). Public,
            # like app.js was — no secrets in the client code. ETag-cached so each
            # module only re-transfers when it actually changes.
            fpath = os.path.join(BASE_DIR, path.lstrip("/"))
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
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)
            return
        if path in STATIC_ASSETS:
            # Public so share-page guests (who may be behind the external
            # password) can load the app shell's JS/CSS. These contain no
            # secrets — the client app is not sensitive, only the data is, and
            # data still requires auth or a share token. Served with an ETag so
            # the ~1.4 MB app.js transfers only when it actually changes; the
            # browser revalidates with a tiny conditional request otherwise.
            # Bundled icons/vendor libs live under assets/ now (BUNDLED_ASSET_FILE).
            fpath = os.path.join(BASE_DIR, BUNDLED_ASSET_FILE.get(path, path[1:]))
            if not os.path.isfile(fpath) and path in BUNDLED_ASSET_FILE:
                fpath = os.path.join(BASE_DIR, path[1:])  # fall back to legacy root location
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
        if path.startswith("/labels/") or path.startswith("/assets/"):
            # Public: uploaded images (label art, photos, brand) must render on
            # share pages for guests. Resolved by content-hash filename across the
            # asset dirs, so old /labels/<name> refs and new /assets/<sub>/<name>
            # refs both work. Long immutable caching (names never change content);
            # CSP sandbox neutralizes scripts inside uploaded SVGs.
            name = path.rsplit("/", 1)[-1]
            fpath = find_user_asset(name)
            if not fpath:
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
                "lanRequiresPassword": lan_requires_password(),
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
        elif path == "/api/ha-config":
            tok = get_config("ha_token")
            self._send(200, {"ok": True, "hasToken": bool(tok), "tokenExp": _jwt_exp(tok)})
        elif path == "/api/ha-token":
            # Hand the raw token to an authenticated client — needed ONLY for the
            # HA media-browser WebSocket, which can't traverse the HTTP proxy.
            # ponytail: the token is no longer in the synced state blob; this is
            # the one remaining client-side exposure, gated behind the login.
            self._send(200, {"ok": True, "token": get_config("ha_token") or ""})
        elif path == "/api/health":
            self._send(200, db_health())
        elif path == "/api/assets/orphans":
            orphans = scan_orphan_assets()
            self._send(200, {"ok": True, "orphans": orphans,
                             "totalBytes": sum(o["bytes"] for o in orphans)})
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
        # CSRF: every POST changes state or authenticates — block any that a
        # browser fires from another origin (the cookie is SameSite=Lax, this is
        # the belt to that suspenders). Same-origin and header-less programmatic
        # clients pass through.
        if not self._origin_ok():
            self.close_connection = True
            audit("csrf_block", self._client_ip(), path=path,
                  origin=self.headers.get("Origin") or self.headers.get("Referer") or "-")
            self._send(403, {"ok": False, "error": "cross-origin request blocked"})
            return
        if path == "/login":
            # Public: this IS the authentication step. Verify the password and,
            # on success, hand back a signed session cookie. Throttled per IP so
            # the password can't be brute-forced from the open internet.
            ip = self._client_ip()
            locked = login_locked_for(ip)
            if locked:
                self.close_connection = True  # body left unread
                audit("login_locked", ip, retry=locked)
                self._send(429, {"ok": False, "error": "too many attempts — wait a bit and try again"},
                           extra_headers={"Retry-After": str(locked)})
                return
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
                login_note_success(ip)
                audit("login_ok", ip)
                self._send(200, {"ok": True}, extra_headers={"Set-Cookie": self._set_cookie_header()})
            else:
                tripped = login_note_failure(ip)
                audit("login_fail", ip, locked=tripped)
                self._send(401, {"ok": False, "error": "Incorrect password"})
            return
        # /api/security is exempt from the auth gate (it has its own LAN-only
        # check) so enabling "require password on LAN" can never lock you out.
        if path != "/api/security" and not self._auth_ok():
            self._send_auth_required()
            return
        if path == "/api/security":
            # Security settings are LAN-only — otherwise anyone on the internet
            # could lock (or unlock) the server.
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
                    set_config("lan_requires_password", None)  # moot with no password
                # Rotate the session secret so any existing login cookies are
                # invalidated when the password changes (or is removed).
                set_config("session_secret", os.urandom(32).hex())
            if "lanRequiresPassword" in body:
                set_config("lan_requires_password", "1" if body.get("lanRequiresPassword") else None)
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
            audit("security_change", self._client_ip(),
                  fields="+".join(k for k in ("password", "lanRequiresPassword",
                                              "trustedNets", "trustCf") if k in body) or "none")
            self._send(200, {
                "ok": True,
                "protected": bool(get_config("external_password")),
                "lanRequiresPassword": lan_requires_password(),
                "trustedNets": [str(n) for n in trusted_networks() if n not in TRUSTED_NETS_CLI],
                "trustCf": trust_cf_header(),
            })
            return
        if path == "/api/ha-config":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
            except (ValueError, UnicodeDecodeError):
                self._send(400, {"ok": False, "error": "invalid body"})
                return
            if body.get("clearToken"):
                set_config("ha_token", None)
                audit("ha_token_change", self._client_ip(), action="clear")
            elif body.get("token"):
                set_config("ha_token", str(body["token"]).strip())
                audit("ha_token_change", self._client_ip(), action="set")
            if "url" in body:
                set_config("ha_url", (str(body["url"]).strip() or None))
            if "urlExternal" in body:
                set_config("ha_url_external", (str(body["urlExternal"]).strip() or None))
            tok = get_config("ha_token")
            self._send(200, {"ok": True, "hasToken": bool(tok), "tokenExp": _jwt_exp(tok)})
            return
        if path == "/api/ha":
            # Server-side proxy for Home Assistant REST calls. The browser sends
            # {path, method, body}; we attach the Bearer token (held in config)
            # and forward to the configured HA URL, trying internal then external.
            # HA's status + body are passed straight back through.
            try:
                length = int(self.headers.get("Content-Length", 0))
                req = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
            except (ValueError, UnicodeDecodeError):
                self._send(400, {"ok": False, "error": "invalid body"})
                return
            ha_path = str(req.get("path") or "")
            if not ha_path.startswith("/api/") or ".." in ha_path or "://" in ha_path:
                self._send(400, {"ok": False, "error": "bad HA path"})
                return
            method = str(req.get("method") or "GET").upper()
            # Allowlist: only the narrow HA surface the client uses. Blocks HA
            # config/admin, templates, supervisor, restarts, non-notify services
            # and any non GET/POST verb — our token can't drive the whole API.
            if not ha_path_allowed(method, ha_path.split("?", 1)[0]):
                audit("ha_denied", self._client_ip(), method=method,
                      ha_path=ha_path.split("?", 1)[0])
                self._send(403, {"ok": False, "error": "HA endpoint not permitted"})
                return
            token = get_config("ha_token")
            urls = ha_proxy_urls()
            if not token or not urls:
                self._send(502, {"ok": False, "error": "Home Assistant not configured"})
                return
            payload = req.get("body")
            data = payload.encode("utf-8") if isinstance(payload, str) and payload else None
            headers = {"Authorization": "Bearer " + token}
            if data:
                headers["Content-Type"] = "application/json"
            last_err = "unreachable"
            for base in urls:
                hreq = urllib.request.Request(
                    base.rstrip("/") + ha_path, data=data, method=method, headers=headers)
                try:
                    with urllib.request.urlopen(hreq, timeout=12) as resp:
                        out = resp.read()
                        ctype = resp.headers.get("Content-Type", "application/json")
                        self._send(resp.status, out, ctype)
                        return
                except urllib.error.HTTPError as e:
                    # HA answered (e.g. 401/404) — that's a real response, pass it on.
                    self._send(e.code, e.read() or b"",
                               e.headers.get("Content-Type", "application/json"))
                    return
                except (urllib.error.URLError, OSError) as e:  # unreachable — try next URL
                    last_err = str(getattr(e, "reason", e))
            self._send(502, {"ok": False, "error": "HA unreachable: " + last_err})
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
                url = store_label_asset(body.get("data") or "", body.get("kind") or "labels")
            except (ValueError, UnicodeDecodeError) as e:
                self._send(400, {"ok": False, "error": str(e)})
                return
            self._send(200, {"ok": True, "url": url})
            return
        if path == "/api/asset/delete":
            # Delete a stored asset file. The client calls this once it has
            # confirmed no other reference still points at the URL — assets are
            # content-addressed, so the same file can back many references. We
            # resolve the file across the asset dirs and unlink it. Idempotent.
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
            except (ValueError, UnicodeDecodeError):
                self._send(400, {"ok": False, "error": "invalid body"})
                return
            ref = str(body.get("url") or "")
            name = ref.rsplit("/", 1)[-1] if (ref.startswith("/labels/") or ref.startswith("/assets/")) else ""
            if not ASSET_NAME_RE.match(name):
                self._send(400, {"ok": False, "error": "not a deletable asset path"})
                return
            target = find_user_asset(name)
            removed = False
            if target:
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
        if path == "/api/assets/cleanup":
            # Delete orphaned uploads — files no current state or history snapshot
            # references. LAN-only (it deletes files) and re-verified server-side
            # against the live reference set so nothing in use is removed.
            if not self._is_lan():
                self.close_connection = True
                self._send(403, {"ok": False, "error": "asset cleanup is LAN-only"})
                return
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
            except (ValueError, UnicodeDecodeError):
                self._send(400, {"ok": False, "error": "invalid body"})
                return
            want = body.get("names")
            referenced = referenced_asset_names()
            deleted, freed = 0, 0
            targets = scan_orphan_assets()
            for o in targets:
                if want and o["name"] not in want:
                    continue
                if o["name"].lower() in referenced:
                    continue  # became referenced since the scan — skip
                fp = find_user_asset(o["name"])
                if fp:
                    try:
                        sz = os.path.getsize(fp)
                        os.remove(fp)
                        deleted += 1
                        freed += sz
                    except OSError:
                        pass
            self._send(200, {"ok": True, "deleted": deleted, "freedBytes": freed})
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
            audit("history_restore", self._client_ip(), snapshot=hid, bytes=len(data))
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
        # Fail OPEN when the client sends no rev (e.g. a reverse proxy stripped
        # the X-Data-Rev header, or an older client) — only reject when a client
        # actually presents a stale, conflicting rev. Better a missed conflict
        # check than silently dropping every save.
        if base_rev and base_rev != "*" and cur_rev and base_rev != cur_rev:
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
    migrate_ha_token()  # relocate any token still sitting in the stored state blob
    migrate_assets()    # tidy uploads + bundled assets into the assets/ tree
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print("MeadOS server running on http://%s:%d" % (args.host, args.port))
    print("Data: %s (SQLite, WAL mode, last %d saves kept in history)" % (DB_PATH, HISTORY_KEEP))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
