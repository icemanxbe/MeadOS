# MeadOS 🍯

**A self-hosted brewing companion for mead makers** — batch tracker, recipe compendium, cellar manager, inventory, brewing calculators, label designer and daily brew coach, all in a single page backed by a shared server-side SQLite database.

![Python 3.8+](https://img.shields.io/badge/python-3.8%2B-blue) ![Dependencies: none](https://img.shields.io/badge/dependencies-none-brightgreen) ![Storage: SQLite](https://img.shields.io/badge/storage-SQLite-lightgrey) ![Single file app](https://img.shields.io/badge/frontend-single%20HTML%20file-orange)

![Dashboard](docs/screenshots/dashboard.png)

---

## Highlights

- 🧪 **Batch tracking** — gravity logs on a combined gravity-and-projected-ABV chart (watch ABV rise as gravity falls, with a dashed finish projection), fermenter assignment, a status timeline that follows the brew-coach steps you actually complete (plus a "fermentation stopped" flag when readings go flat), stuck-fermentation diagnosis that reads your logged nutrient additions, and failure post-mortems
- 📜 **35 built-in recipes** — traditionals, melomels, cysers, metheglins, bochets, braggots, sack & port-style meads, plus 5 **sparkling / bottle-conditioned** meads (champagne-style, cyser, session hydromel, berry, ginger), each with day-by-day step schedules, plus your own custom recipes and reusable templates. Steps carry universal conventions automatically (top-up-to-the-mark water, rack-when-fermentation-is-done, stabilise with sorbate **and** metabisulfite before back-sweetening, "earliest bottling point" not a deadline), and tied recipes cross-link — e.g. the forest-fruits melomel comes in **fruit-in-primary** and **fruit-in-secondary** versions that link to each other and explain the trade-off
- ✦ **Recipe Designer wizard** — pick a style, volume, target ABV and sweetness; it back-solves the honey/OG/FG math, recommends a yeast that can finish the ABV, suggests a nutrient protocol, and assembles ingredients + a step schedule, then hands off to the editor to fine-tune and save
- 🗓 **Brew Planner** — queue planned batches (from the planner or straight off a recipe page, at your chosen scale) onto the Fermenter Schedule as ghost bars (with vessel-conflict warnings), roll them up into a single shopping list — netted against your supplies and topped up with anything below its restock threshold, surfaced at the top of the Supplies page — then "deploy" a plan straight into a real batch
- 📷 **Photo journal** — a per-batch photo diary (brew day → fermentation → racking → bottling → tasting) with captions, stage tags and a full-screen lightbox; images are stored as files server-side so they never bloat page loads
- 🍾 **Multi-cabinet cellar** — model any number of wine fridges, racks or shelves; place bottles and fermenters visually, track drinking windows (ready → peak → past max) per batch
- 📦 **Inventory** — honey, yeast, nutrient, chemicals and bottle stock with cost tracking, automatic deduction on brew day, a supplier rolodex tagged by the honey types each supplier stocks, and a **brew-with-what-you-have** panel that shows which recipes you can start *right now* from your stock (checking honey, yeast, nutrient and the chemicals each recipe calls for), scaled to any batch size and cross-checked against your planned batches
- 🧮 **Brewing tools** — ABV, honey-for-target-gravity, **TOSNA 2.0 scheduler** (YAN scaled by yeast nitrogen demand × honey darkness, with sugar-break explainer and nutrient-vs-protocol warnings), **SO₂/sulfite** (molecular-fraction model → free SO₂ + K-meta dose) and **acid/TA adjustment**, backsweetening + stabilization, **carbonation / priming sugar** (target CO₂ volumes → sugar dose with a per-bottle amount and a bottle-pressure safety warning), hydrometer temperature correction, SG↔Brix, yeast pitch, blending (incl. water dilution), sanitizer & cleaner dosing (Chemipro SAN or Star San)
- 🍷 **Tasting & BJCP scoring** — free-text notes, a 1–5 tasting wheel, and an optional formal BJCP scoresheet (aroma/appearance/flavor/mouthfeel/overall → weighted total + descriptor band) per tasting, with evolution charts across a batch's life
- 📐 **Metric / US / imperial** — toggle units (L·kg / gal·lb) in the batch flow and on the recipe scale slider; everything stored metric internally
- 🏷 **Labels & QR codes** — procedural bottle labels, printable A4 label sheets, storage-box labels, certificate / gift-card / permanent-record print-outs, and QR codes that deep-link back into the app
- 🔗 **Share links** — every batch gets a public read-only page with live age, gravity log and tasting notes, reached via an unguessable `/share/<token>` URL that exposes that one batch and nothing else
- 📅 **Calendar feed** — subscribe any phone/desktop calendar to a private `.ics` of your brewing schedule (nutrient doses, racking, bottling, ready/peak dates) — no Home Assistant required
- 📱 **Installable PWA** — add to your home screen (with your uploaded brand logo as the app icon); works offline (cached app shell), with iOS safe-area support
- 📚 **Libraries** — honey varieties with fermentation data (F:G ratio, fructose-stall risk, fructophilic-yeast warnings), 21 yeast strains (nitrogen demand, fructophilic flag, temp ranges), nutrients & protocols, plus a mead guide and troubleshooting compendium. Recipes cross-reference which honey/yeast/nutrient/adjunct combinations produce which outcomes.
- 📊 **Insights & comparison** — lifetime fun-facts (mead brewed, favourite honey/yeast, success rate, even "bee math"), a full grouped side-by-side batch comparison with difference highlighting, and an aging timeline that buckets batches into drink-now / maturing / past-peak
- ✦ **Daily coach** — due-today task list generated from each batch's recipe schedule, with overdue flags, anniversaries and milestone celebrations
- 🏠 **Optional Home Assistant integration** — live fermenter/cellar temperatures, hydrometer (iSpindel/Tilt/RAPT) readings, push notifications, dashboard summary card. Entirely optional; MeadOS runs fully standalone.

---

## Quick start

Requires only **Python 3.8+** — no pip installs, no build step, no Node.

```sh
git clone <your-repo-url>
cd meados
python3 server.py
```

Open **http://localhost:8080**. That's it.

Anyone on your network can open `http://<your-machine-ip>:8080` and works with the **same shared data** — no accounts, no per-device setup.

```sh
python3 server.py --port 9000            # different port
python3 server.py --db /path/meados.db   # different database location
python3 server.py --host 127.0.0.1       # local-only, don't expose on the LAN
```

---

## Screenshots

| Batch detail — journey & gravity log | The cellar — visual cabinets |
|---|---|
| ![Batch detail](docs/screenshots/batch-detail.png) | ![Cellar](docs/screenshots/cellar.png) |

| Recipe compendium | Recipe detail — scale, plan & step-by-step |
|---|---|
| ![Recipes](docs/screenshots/recipes.png) | ![Recipe detail](docs/screenshots/recipe-detail.png) |

| Fermenter schedule, brew plan & shopping list | Aging timeline |
|---|---|
| ![Fermenter schedule](docs/screenshots/fermenter-schedule.png) | ![Aging timeline](docs/screenshots/aging-timeline.png) |

| Brewing tools & calculators | Insights & lifetime fun-facts |
|---|---|
| ![Brewing tools](docs/screenshots/brewing-tools.png) | ![Insights](docs/screenshots/insights.png) |

| Honey library & usage forecast | Mead guide — beginner walkthrough |
|---|---|
| ![Honey library](docs/screenshots/honey-library.png) | ![Mead guide](docs/screenshots/mead-guide.png) |

| Supplies & shopping list | Public share page |
|---|---|
| ![Supplies](docs/screenshots/supplies.png) | ![Share view](docs/screenshots/share-view.png) |

---

## How it works

```
┌────────────┐     GET /api/data      ┌─────────────┐
│  Browser A │ ◄──────────────────────│             │
│  Browser B │ ──────────────────────►│  server.py  │──► meados.db (SQLite)
│  Phone     │     POST /api/data     │  (stdlib)   │      ├─ state    (current)
└────────────┘                        └─────────────┘      └─ history  (last 50 saves)
```

- **`index.html`** is a small shell that loads **`app.js`** (all the UI, logic, recipes and libraries) and **`app.css`** (styles). They're served as ETag-cached static assets, so the ~1.4 MB of app code only transfers when it actually changes.
- **`server.py`** (Python standard library only) serves the app and stores the full application state in SQLite. It also serves the PWA assets (`manifest.webmanifest`, `sw.js`, icons), the tokenised share page, and the calendar feed, and adds baseline security headers (CSP, X-Frame-Options, etc.) to every response.
- Every browser that opens the page reads and writes the **same shared data**. Saves are debounced and pushed automatically; edits made while the server is unreachable are cached in localStorage and re-synced when it comes back.
- Every save is also appended to a **history table** (last 50 kept), so an accidental overwrite is recoverable:

  ```sh
  sqlite3 meados.db "SELECT id, saved_at, length(data) FROM history ORDER BY id DESC LIMIT 10;"
  sqlite3 meados.db "SELECT data FROM history WHERE id = <n>;" > recovered.json
  # → restore via Settings → Data Backup → Import
  ```

### API

| Endpoint      | Method | Purpose                                    |
|---------------|--------|--------------------------------------------|
| `/`           | GET    | the app (`index.html`)                     |
| `/api/data`   | GET    | full state JSON (404 when nothing saved)   |
| `/api/data`   | POST   | replace stored state (validated as JSON)   |
| `/api/health` | GET    | storage metadata (size, updated, history)  |

---

## Feature tour

### Batches
Create a batch from any recipe (or scale a recipe to your target volume first). Log gravity readings — the combined gravity/ABV chart, attenuation and estimated ABV update live. Batches move through *fermenting → conditioning → aging → bottled* based on the brew-coach steps you actually complete (it won't skip ahead if you haven't racked) and the real gravity trend, and a guided bottling workflow walks you through pre-flight checks, the final gravity reading, a sanitizer contact timer, per-size bottle counts and label printing.

### Cellar
Define your real-world storage: any number of cabinets (a wine fridge in the living room, a rack in the basement…), each with named shelves. Place bottled batches and bulk-aging fermenters on shelves visually. Each batch shows its drinking window — when it's ready, when it peaks, when to drink it by — and the cellar view totals everything by style and value. Cabinets can optionally bind Home Assistant temperature/humidity sensors for a live wine-fridge-style LED readout and history charts.

### Recipes
35 built-in recipes (including 5 sparkling / bottle-conditioned meads, and forest-fruits in cross-linked fruit-in-primary / fruit-in-secondary versions) with full ingredient lists, day-by-day schedules, nutrient plans, and aging guidance. Add your own recipes, save variations as templates, scale any recipe to your vessel size (with a metric/US/imperial readout), brew it on the spot or plan a future batch at that scale, favorite the ones you love, and export to BeerXML or a print-ready PDF.

### Inventory, suppliers & costs
Track honey, yeast, nutrient, chemicals and miscellaneous supplies with quantities, prices, expiry dates and a per-item restock threshold. Starting a batch can auto-deduct what it uses, and anything that drops to or below its threshold is added to the shopping list at the top of the Supplies page (alongside what your planned batches need), copyable as a text list. The supplier rolodex stores your beekeepers and homebrew shops — tag each with the honey types they stock and they appear as sourcing hints in the Honey Library and on recipe pages.

### Tools & knowledge
A full set of calculators (see highlights above), plus deep reference libraries for honey varieties, yeast strains and nutrient protocols, a mead-making guide, and a troubleshooting section covering stuck ferments, off-flavors and more.

### Sharing
Each batch has a share link (`…/share/<token>`, where `<token>` is an unguessable per-batch secret) and QR code rendering a clean read-only page — your bottle label (rendered exactly as in the Label Maker, minus the QR and drinking-window boxes), live age, a fermentation curve with both gravity and ABV, a human-readable drinking window, the gravity log and tasting notes — for anyone who can reach your server. The token resolves server-side to that one batch only; revoke it any time to kill the link. The full app also supports deep links (`#batch=…`, `#recipe=…`, `#view=…`) you can bookmark or print on labels.

Running behind a reverse proxy? Set **Settings → Server Data → Public URL** (e.g. `https://mead.example.com`) and all share links and QR codes are built from that address instead of whatever URL you happen to be browsing on internally.

---

## Optional: Home Assistant

MeadOS never *requires* Home Assistant and never stores data in it. If you have an HA instance, connect it under **Settings → Home Assistant** to unlock:

- live temperature readings per fermenter and per cellar cabinet, with history charts pulled from the HA recorder
- hydrometer integrations (iSpindel, Tilt, RAPT) pre-filling gravity readings
- push notifications for due brewing tasks via the HA companion app
- picking label images from HA media storage
- an optional status summary entity (`sensor.meadows_data`) feeding a ready-made Lovelace dashboard card (Settings → HA Companion Card)

Setup — enter an *internal/LAN* HA URL, optionally an *external* one (Nabu Casa, reverse proxy), and a long-lived access token (HA → Profile → Security) under **Settings → Home Assistant**, then Save. That's it — no `configuration.yaml` / CORS changes and no mixed-content worries, because the **MeadOS server talks to HA on your behalf** (a server-side proxy), not the browser. It tries the internal URL first, then the external one.

The token is held **server-side only** and never rides the synced data blob, so it can't leak through a shared/exported state or be read by other devices. (It's still proxied to HA, so the MeadOS server and HA share one trust boundary — protect the MeadOS server with the external-access password if you expose it.)

---

## Configuration & customization

Everything lives in **Settings**:

- **Brewer name & logo** — appears on labels, exports and reports; upload your own logo to replace the default crest
- **Currency & honey price** — used for batch cost and cellar value tracking
- **Sanitizer** — Chemipro SAN (2 ml/L) or Star San (1.5 ml/L); calculators and checklists follow your choice
- **Backups** — export/import the full dataset as JSON, or just copy `meados.db`

---

## Running as a background service

For an always-on setup, run `server.py` under your OS's service manager so it starts at boot and restarts if it ever dies.

**Linux (systemd)** — `/etc/systemd/system/meados.service`:

```ini
[Unit]
Description=MeadOS server
After=network.target

[Service]
User=youruser
WorkingDirectory=/home/youruser/meados
ExecStart=/usr/bin/python3 /home/youruser/meados/server.py --port 8080
Restart=always

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now meados
journalctl -u meados -f        # logs
```

**macOS (launchd)** — `~/Library/LaunchAgents/com.meados.server.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.meados.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/youruser/meados/server.py</string>
        <string>--port</string><string>8080</string>
    </array>
    <key>WorkingDirectory</key><string>/Users/youruser/meados</string>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>/Users/youruser/Library/Logs/meados.log</string>
    <key>StandardErrorPath</key><string>/Users/youruser/Library/Logs/meados.log</string>
</dict>
</plist>
```

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.meados.server.plist   # start now + at every login
launchctl bootout  gui/$(id -u)/com.meados.server                                 # stop/remove
tail -f ~/Library/Logs/meados.log                                                  # logs
```

(A LaunchAgent starts at *login*; for a truly unattended Mac that boots without logging in, put the same plist in `/Library/LaunchDaemons/` instead, owned by root.)

**Quick & dirty (any OS):**

```sh
nohup python3 server.py >> meados.log 2>&1 &
```

## Deployment notes

- **External access password (optional).** Settings → Server Data → External Access Password. When enabled, any connection from outside your LAN gets a **styled login page**; after a correct password the browser keeps a signed, HttpOnly session cookie (30 days) so it isn't re-prompted. LAN devices are never prompted. Works behind a reverse proxy (the original client IP is taken from `X-Forwarded-For`), the password is stored as a salted PBKDF2 hash, and it can only be set or changed from inside the LAN. Combine with HTTPS on your proxy — a password over plain HTTP travels readably. (HTTP Basic credentials are still accepted for programmatic clients.)
- **Trusted networks.** The security card shows what IP each connection appears as. If legitimate requests show up with a public IP (NAT hairpin, CDN, VPN), add those ranges as *trusted networks* (UI or `--trust CIDR`) so they count as LAN. Behind Cloudflare, tick the *CF-Connecting-IP* option so real client IPs are used instead of Cloudflare edge addresses (only enable when the domain actually runs through Cloudflare — otherwise the header is client-spoofable).
- **On a trusted LAN with no port-forwarding you can skip the password entirely.** For serious internet exposure, a reverse proxy with its own auth (Caddy, nginx, Tailscale/VPN) is still the more battle-tested layer.
- The page loads two assets from CDNs (Google Fonts, Chart.js). Everything else is self-contained; without internet the app still works — fonts fall back and charts are skipped.
- **Uploaded label/logo images are stored as plain files in `labels/`** next to `index.html` (content-addressed, deduplicated, served with immutable caching). You can also drop images in there manually and reference them as `/labels/yourfile.png`. Include the folder in your backups.
- Backup = copy one file (`meados.db`). It's safe to do while the server runs (SQLite WAL mode).
- Runs fine on a Raspberry Pi, a NAS, or any box with Python 3.

## Project layout

```
meados/
├── index.html              # app shell (loads app.js + app.css)
├── app.js                  # all UI, logic, recipes & libraries
├── app.css                 # styles
├── server.py               # zero-dependency Python server + SQLite storage
├── sw.js                   # service worker (offline shell)
├── meados.db               # created on first save (gitignore this)
├── assets/
│   ├── icons/              # bundled PWA / home-screen icons
│   ├── vendor/             # self-hosted Chart.js + jsQR
│   ├── labels/             # uploaded bottle-label art   (gitignored)
│   ├── photos/             # uploaded photo-journal images (gitignored)
│   └── brand/              # uploaded brand logo + app icon (gitignored)
└── docs/
    └── screenshots/
```

The PWA manifest is generated dynamically (so the install/home-screen icon can
follow your uploaded brand logo). Uploaded images are stored as files, split by
purpose; **Settings → Unused Images** scans for and deletes any no longer
referenced by a batch, recipe, or version-history snapshot.

## License

[PolyForm Noncommercial License 1.0.0](LICENSE) — free to use, modify and share
for any **noncommercial** purpose (personal, hobby, research, nonprofit/education).
**Selling it or using it for commercial advantage is not permitted.**

---

*Crafted with patience — like mead.*
