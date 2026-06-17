<p align="center">
  <img src="assets/icons/icon.svg" width="112" alt="MeadOS icon">
</p>

<h1 align="center">MeadOS</h1>

<p align="center">
  <strong>A polished, self-hosted brewing workspace for mead makers.</strong><br>
  Plan recipes. Guide fermentation. Organise the cellar. Keep every batch story in one place.
</p>

<p align="center">
  <img alt="Python 3.8+" src="https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white">
  <img alt="No Python packages required" src="https://img.shields.io/badge/Python_dependencies-none-2E7D32">
  <img alt="SQLite storage" src="https://img.shields.io/badge/Storage-SQLite-5B7083?logo=sqlite&logoColor=white">
  <img alt="No build step" src="https://img.shields.io/badge/Frontend-Vanilla_JS-9C6B30">
  <img alt="Installable PWA" src="https://img.shields.io/badge/App-Installable_PWA-6F4E37">
  <img alt="PolyForm Noncommercial 1.0.0" src="https://img.shields.io/badge/Licence-PolyForm_Noncommercial_1.0.0-8B5E3C">
</p>

![MeadOS dashboard](docs/screenshots/dashboard.png)

---

## Mead making, properly organised

MeadOS brings the full brewing journey into one elegant browser-based application: recipes, planned brews, fermentation readings, nutrient schedules, inventory, cellar locations, tasting notes, labels, photographs and aging milestones.

It runs on hardware you control and stores your shared brewing data locally. There is no required cloud account, subscription, package manager, Node.js installation or database server.

Open MeadOS from a computer, phone or tablet on your home network and every device works with the same collection.

### At a glance

| | |
|---|---|
| **Runs on** | Windows, macOS, Linux, Raspberry Pi and suitable NAS or home-server systems |
| **Requires** | Python 3.8 or newer |
| **Python packages** | None — MeadOS uses the Python standard library |
| **Storage** | SQLite for brewing data, normal files for uploaded images |
| **Frontend** | HTML, CSS and vanilla JavaScript; no build step |
| **Units** | Metric, US customary and imperial display options |
| **Home Assistant** | Optional; MeadOS works fully on its own |
| **Licence** | PolyForm Noncommercial License 1.0.0 |

## Contents

- [What MeadOS does](#what-meados-does)
- [Quick start](#quick-start)
- [Your first setup](#your-first-setup)
- [Screenshots](#screenshots)
- [Data, backups and recovery](#data-backups-and-recovery)
- [Updating MeadOS](#updating-meados)
- [Remote access and security](#remote-access-and-security)
- [Home Assistant integration](#home-assistant-integration)
- [Always-on installation](#always-on-installation)
- [Advanced server options](#advanced-server-options)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Licence](#licence)

---

## What MeadOS does

### Follow every batch from must to mature mead

Create a batch from a built-in recipe, scale one to your fermenter, use the Recipe Designer, or start from your own custom recipe.

For every batch, MeadOS can keep track of:

- ingredients, volume, starting gravity and target gravity
- yeast, nutrients and scheduled additions
- fermenter assignment and vessel availability
- gravity readings, attenuation and estimated alcohol percentage
- fermentation progress and completed brewing steps
- racking, stabilization, backsweetening and bottling
- bottle counts and storage locations
- photographs, tasting notes and aging milestones

The batch chart combines gravity and projected alcohol development. MeadOS can flag a flat gravity trend, help diagnose a possible stalled fermentation and preserve a failure post-mortem when a batch does not go to plan.

![Batch detail with gravity history](docs/screenshots/batch-detail.png)

### Start with 38 complete recipes

The built-in collection covers traditional meads, melomels, cysers, metheglins, bochets, braggots, sack and port-style meads, plus five sparkling or bottle-conditioned recipes.

Each recipe includes practical brewing information such as:

- ingredients and target measurements
- a day-by-day brewing schedule
- nutrient guidance
- expected fermentation and aging times
- honey, yeast and adjunct recommendations
- scaling for your preferred batch size

Aroma-sensitive forest-fruit, strawberry, raspberry and blueberry recipes include separate fruit-in-primary and fruit-in-secondary versions, linked together with an explanation of the trade-off.

You can also create custom recipes, save reusable variations, mark favourites, export to BeerXML and produce a printable version.

### Design a recipe without doing all the maths yourself

The Recipe Designer asks for the style, batch volume, target alcohol percentage and desired sweetness. It then works backwards to suggest:

- honey quantity
- original and final gravity targets
- a suitable yeast
- a nutrient strategy
- ingredients and a starting step schedule

The result remains editable before you save or brew it.

![Recipe detail with scaling and planning](docs/screenshots/recipe-detail.png)

### Plan future brews before occupying a fermenter

The Brew Planner lets you prepare a batch without starting it immediately.

Planned batches appear on the Fermenter Schedule as provisional bookings. MeadOS can warn about vessel conflicts, combine several plans into one shopping list, subtract supplies already in stock and include items that have reached their restock threshold.

When brew day arrives, deploy the plan into a live batch without entering everything again.

### Know what you can brew with the supplies you already own

The Supplies area tracks honey, yeast, nutrients, chemicals, bottles and other brewing materials with quantities, prices, expiry dates and restock thresholds.

The **Brew with what you have** view checks recipe requirements against your current inventory and planned batches. Starting a batch can automatically deduct the ingredients used.

A supplier directory keeps beekeepers and homebrew shops together, including the honey varieties each supplier normally carries.

![Supplies and shopping list](docs/screenshots/supplies.png)

### Recreate your real cellar digitally

Model wine fridges, cabinets, racks and shelves, then place bottled batches or bulk-aging fermenters where they are physically stored.

MeadOS shows drinking windows for each batch:

- still maturing
- ready to drink
- around its expected peak
- beyond its suggested maximum window

The cellar also provides collection totals, style breakdowns and value estimates. Optional Home Assistant sensors can add live cabinet temperature and humidity readings with history charts.

![Visual cellar cabinets](docs/screenshots/cellar.png)

### Use brewing calculators with context

The Brewing Tools collection includes:

- alcohol estimation
- honey required for a target gravity
- TOSNA 2.0 nutrient scheduling
- sugar-break guidance
- yeast pitching
- hydrometer temperature correction
- SG and Brix conversion
- stabilization and backsweetening
- free SO₂ and potassium metabisulfite dosing
- acid and titratable-acidity adjustment
- blending and water dilution
- priming sugar and carbonation
- sanitizer and cleaner dosing

The tools add explanations and warnings where a number needs context, particularly for nutrient protocols, stabilization and bottle conditioning.

### Build a useful reference library

MeadOS includes dedicated libraries for honey varieties, yeast strains and nutrient protocols, together with a beginner-friendly mead guide and troubleshooting knowledge base.

Recipe pages connect these libraries to practical choices by showing how a honey or yeast change is likely to affect that particular mead.

### Record how a mead develops

Add quick tasting notes or use the structured tasting tools with appearance, aroma, flavour, mouthfeel and overall scoring. Optional BJCP-style scoring produces a weighted total and descriptor.

Repeated tastings can be charted across the life of a batch, making it easier to see when a mead begins to open up or reaches its best drinking period.

### Create labels and share one batch cleanly

MeadOS can produce bottle labels, printable A4 sheets, storage-box labels, certificates, gift cards and permanent batch records.

Each batch can receive a difficult-to-guess share link and QR code. That link opens a clean, read-only page containing only the selected batch's public presentation data. It does not expose the full MeadOS dashboard, private notes, internal storage details or Home Assistant credentials.

Share links can be revoked at any time.

![Read-only batch share page](docs/screenshots/share-view.png)

### Put brewing dates on your normal calendar

A private iCalendar feed can provide nutrient additions, planned rackings, bottling dates and drinking-window milestones to compatible phone and desktop calendars. Home Assistant is not required for this feature.

### Install MeadOS like an app

MeadOS is an installable Progressive Web App. Supported browsers can add it to the home screen, Dock, Start menu or application launcher.

The application shell is cached for offline opening. Shared data and server-backed features still depend on reconnecting to the MeadOS server, and queued local changes are synchronised when the connection returns.

### See what needs attention today

The Daily Coach combines scheduled work across all active batches. It highlights due and overdue steps, nutrient additions, anniversaries and important aging milestones so you do not need to inspect every batch individually.

---

## Quick start

### Requirements

You need:

1. Python 3.8 or newer.
2. The MeadOS files.
3. A browser on the same computer or local network.

Check Python before continuing.

**Windows**

```powershell
py --version
```

If the `py` command is unavailable, try:

```powershell
python --version
```

**macOS or Linux**

```sh
python3 --version
```

A result such as `Python 3.12.4` is suitable.

### Option A — Download the ZIP

This is the simplest installation method when you do not use Git.

1. Select **Code** at the top of this repository.
2. Select **Download ZIP**.
3. Extract the ZIP file.
4. Open Terminal, PowerShell or Command Prompt inside the extracted `MeadOS-main` folder.
5. Start MeadOS.

**Windows**

```powershell
py server.py
```

**macOS or Linux**

```sh
python3 server.py
```

### Option B — Clone with Git

```sh
git clone https://github.com/icemanxbe/MeadOS.git
cd MeadOS
python3 server.py
```

On Windows, use `py server.py` instead of `python3 server.py` when appropriate.

### Open MeadOS

On the computer running MeadOS, open:

```text
http://localhost:8080
```

The server listens on the local network by default. A phone, tablet or another computer on the same network can open:

```text
http://YOUR-MEADOS-COMPUTER-IP:8080
```

For example:

```text
http://192.168.1.50:8080
```

`localhost` only works on the computer that is actually running MeadOS.

> Your operating system may ask whether Python is allowed to accept incoming network connections. Allow it on your private or home network when you want to use MeadOS from other devices.

---

## Your first setup

A practical first-run order is:

1. Open **Settings** and enter your brewer or meadery name.
2. Choose your unit system, currency and preferred sanitizer.
3. Add your fermenters and their usable volumes.
4. Add the honey, yeast, nutrients and chemicals you already own.
5. Create your real cellar cabinets or shelves when you are ready to track storage.
6. Choose a built-in recipe, use the Recipe Designer, or create a custom recipe.
7. Plan the batch first or start it immediately.
8. Log gravity readings and complete each brewing step as you work.

You do not need to configure the cellar, inventory, calendar or Home Assistant before brewing your first batch. Those areas can be introduced gradually.

---

## Screenshots

All image paths below match the files currently present in `docs/screenshots/`.

| Recipe collection | Recipe detail |
|---|---|
| ![Recipe collection](docs/screenshots/recipes.png) | ![Recipe detail](docs/screenshots/recipe-detail.png) |

| Fermenter schedule and brew planning | Aging timeline |
|---|---|
| ![Fermenter schedule](docs/screenshots/fermenter-schedule.png) | ![Aging timeline](docs/screenshots/aging-timeline.png) |

| Brewing calculators | Insights and lifetime statistics |
|---|---|
| ![Brewing tools](docs/screenshots/brewing-tools.png) | ![Insights](docs/screenshots/insights.png) |

| Honey library | Mead guide |
|---|---|
| ![Honey library](docs/screenshots/honey-library.png) | ![Mead guide](docs/screenshots/mead-guide.png) |

The dashboard, batch detail, cellar, supplies and public share screenshots are shown in the relevant sections above.

---

## Data, backups and recovery

### Where MeadOS stores data

MeadOS creates the following database in its application folder:

```text
meados.db
```

Uploaded images are stored separately as normal files:

```text
assets/labels/   bottle-label artwork
assets/photos/   batch photo-journal images
assets/brand/    brewer logo and custom app icon
```

The bundled files in `assets/icons/` and `assets/vendor/` are part of MeadOS itself, not personal uploads.

### Data export versus complete backup

The JSON export in **Settings → Data Backup** is useful for exporting and importing brewing data. Because uploaded images are stored as separate files, a JSON export alone is not a complete image backup.

For a complete installation backup:

1. Stop MeadOS for the simplest consistent file copy.
2. Copy `meados.db`.
3. Copy `assets/labels/`, `assets/photos/` and `assets/brand/` when they exist.
4. Store the backup somewhere outside the MeadOS folder.

SQLite may create `meados.db-wal` and `meados.db-shm` while the server is running. Stopping MeadOS before a manual file copy avoids ambiguity about uncheckpointed changes.

### Restore a full backup

1. Stop MeadOS.
2. Replace `meados.db` with the backed-up copy.
3. Restore the three user-upload folders into `assets/`.
4. Start MeadOS again.

### Built-in save history

The database retains the most recent 50 saved states in its history table. This can help recover an accidental overwrite, but it is not a replacement for an external backup.

Advanced recovery with the SQLite command-line tool:

```sh
sqlite3 meados.db "SELECT id, saved_at, updated_at, bytes FROM history ORDER BY id DESC LIMIT 10;"
```

Export one history entry:

```sh
sqlite3 meados.db "SELECT data FROM history WHERE id = HISTORY_ID;" > recovered.json
```

Import the resulting JSON through **Settings → Data Backup → Import** after checking that you selected the intended snapshot.

---

## Updating MeadOS

Back up your database and uploaded images before updating.

### Git installation

From the MeadOS folder:

```sh
git pull
```

Restart the server after the update.

Local changes to tracked MeadOS source files can prevent a clean pull. Keep personal data in `meados.db` and the runtime upload folders rather than editing bundled application files unless you intentionally maintain a custom fork.

### ZIP installation

1. Stop MeadOS.
2. Make a complete backup.
3. Download and extract the newest ZIP into a new folder.
4. Copy `meados.db` into the new folder.
5. Copy only your runtime upload folders into the new installation:
   - `assets/labels/`
   - `assets/photos/`
   - `assets/brand/`
6. Do not replace the new `assets/icons/` or `assets/vendor/` folders with older copies.
7. Start MeadOS from the new folder and check your data before deleting the old installation.

---

## Remote access and security

### Home-network use

MeadOS is designed to be convenient on a trusted home network. By default, devices on that network can open the dashboard without individual user accounts.

Anyone who can open the full dashboard should therefore be treated as a trusted user of the installation.

### Do not expose port 8080 directly

Avoid forwarding the MeadOS port straight to the public internet.

For remote use, prefer one of these approaches:

- a private VPN such as Tailscale or WireGuard
- a properly configured HTTPS reverse proxy such as Caddy or nginx
- an authenticated access gateway in front of MeadOS

### Optional external-access password

Under **Settings → Server Data**, MeadOS can protect connections it identifies as external while keeping normal LAN access convenient.

The password:

- is stored as a salted PBKDF2 hash
- can only be set or changed from a LAN or trusted-network connection
- uses a signed, HttpOnly browser session after successful login
- is rate-limited against repeated failed attempts
- still requires HTTPS when used over the internet

A password sent over ordinary HTTP is not encrypted in transit.

### Reverse proxies, trusted networks and Cloudflare

When a reverse proxy, VPN, NAT hairpin or CDN changes the apparent client address, configure the relevant trusted network in MeadOS or with `--trust CIDR`.

Only enable the **CF-Connecting-IP** option when the MeadOS domain actually runs through Cloudflare. Trusting that header on an unprotected direct connection would allow a client to spoof it.

### Public batch links

A batch share link is intentionally accessible without the main dashboard login. Anyone who has the unguessable link and can reach your server can view the public projection of that one batch.

Revoke a share token when the link should stop working. Set **Settings → Server Data → Public URL** when your external address differs from the internal address used in your browser.

### Built-in hardening

The server includes security headers, origin checks for state-changing requests, login throttling, a restricted Home Assistant proxy, secret-free security audit logging and a LAN-only development test page.

These protections reduce risk but do not replace correct network design, HTTPS, backups and normal server maintenance.

---

## Home Assistant integration

Home Assistant is optional. MeadOS remains fully usable without it.

Connecting Home Assistant can add:

- live fermenter temperatures
- cellar temperature and humidity readings with history
- iSpindel, Tilt or RAPT hydrometer readings
- push notifications for due brewing work
- access to suitable Home Assistant media for label artwork
- a MeadOS summary for a Lovelace dashboard

Open **Settings → Home Assistant** and provide:

1. the internal Home Assistant URL
2. an optional external fallback URL
3. a Home Assistant long-lived access token

MeadOS sends Home Assistant requests through a server-side, allowlisted proxy. The token is stored in the server configuration rather than in the shared MeadOS state, exported JSON or browser-synchronised data.

The MeadOS server and Home Assistant still share a trust boundary when integration is enabled. Protect remote MeadOS access accordingly and give the token only the access you are prepared for the integration to use.

---

## Always-on installation

Manual startup is ideal for trying MeadOS. For a permanent installation, use the service manager provided by your operating system.

<details>
<summary><strong>Linux — systemd</strong></summary>

First find the correct Python path:

```sh
which python3
```

Create `/etc/systemd/system/meados.service`:

```ini
[Unit]
Description=MeadOS server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/MeadOS
ExecStart=/usr/bin/python3 /home/youruser/MeadOS/server.py --port 8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Replace the username, application path and Python path with the correct values for your machine.

Enable and start the service:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now meados
```

View its status and logs:

```sh
systemctl status meados
journalctl -u meados -f
```

</details>

<details>
<summary><strong>macOS — launchd</strong></summary>

Find the Python path:

```sh
which python3
```

Create `~/Library/LaunchAgents/com.meados.server.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.meados.server</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/youruser/MeadOS/server.py</string>
        <string>--port</string>
        <string>8080</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/youruser/MeadOS</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/Users/youruser/Library/Logs/meados.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/youruser/Library/Logs/meados.log</string>
</dict>
</plist>
```

Replace the username, application path and Python path. Homebrew Python is commonly installed somewhere other than `/usr/bin/python3`.

Load the agent:

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.meados.server.plist
```

Unload it:

```sh
launchctl bootout gui/$(id -u)/com.meados.server
```

Follow its log:

```sh
tail -f ~/Library/Logs/meados.log
```

A LaunchAgent starts after that user logs in. A machine that must start MeadOS before login needs a correctly owned system LaunchDaemon instead.

</details>

---

## Advanced server options

Show every option supported by your installed version:

```sh
python3 server.py --help
```

Common examples:

```sh
# Use another port
python3 server.py --port 9000

# Keep the database at another location
python3 server.py --db /srv/meados/meados.db

# Accept connections only from the same computer
python3 server.py --host 127.0.0.1

# Treat an additional network as trusted
python3 server.py --trust 100.64.0.0/10
```

The default listener is `0.0.0.0:8080`, which makes MeadOS available to other devices on the local network when the firewall permits it.

---

## How it works

```text
┌───────────────┐        shared HTTP API        ┌────────────────┐
│ Desktop       │ ◄────────────────────────────► │                │
│ Phone         │                                │   server.py    │
│ Tablet        │                                │                │
└───────────────┘                                └───────┬────────┘
                                                        │
                                      ┌─────────────────┴─────────────────┐
                                      │                                   │
                               meados.db                           assets/*
                         current state + history              uploaded images
```

- `index.html` is the application shell.
- `app.js` contains the user interface, application logic, recipes and knowledge libraries.
- `app.css` contains the visual design.
- `server.py` serves the application, stores shared state in SQLite and handles integrations, sharing, calendar feeds, uploaded assets and security controls.
- `sw.js` provides the installable PWA and offline application shell.
- Chart.js and jsQR are bundled locally under `assets/vendor/`.
- The web-app manifest is generated dynamically so a custom brand icon can become the installed app icon.
- Static application files use ETag caching so unchanged files do not need to be downloaded again.

---

## Project structure

```text
MeadOS/
├── assets/
│   ├── icons/
│   │   ├── apple-touch-icon.png
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── icon-maskable-512.png
│   │   ├── icon-maskable.svg
│   │   └── icon.svg
│   ├── vendor/
│   │   ├── chart.umd.js
│   │   └── jsQR.min.js
│   ├── labels/                 # created at runtime; user uploads
│   ├── photos/                 # created at runtime; user uploads
│   └── brand/                  # created at runtime; user uploads
├── docs/
│   └── screenshots/
│       ├── aging-timeline.png
│       ├── batch-detail.png
│       ├── brewing-tools.png
│       ├── cellar.png
│       ├── dashboard.png
│       ├── fermenter-schedule.png
│       ├── honey-library.png
│       ├── insights.png
│       ├── mead-guide.png
│       ├── recipe-detail.png
│       ├── recipes.png
│       ├── share-view.png
│       └── supplies.png
├── .gitignore
├── LICENSE
├── README.md
├── app.css
├── app.js
├── index.html
├── server.py
├── sw.js
└── test.html                  # development checks; served only on the LAN
```

`meados.db` and its temporary SQLite files are created at runtime and excluded from Git. The user-upload directories are also excluded from Git.

---

## Troubleshooting

### `python`, `python3` or `py` is not recognised

Python is not installed or is not available on your command path.

Install Python 3.8 or newer. On Windows, enable **Add Python to PATH** during installation, then reopen PowerShell or Command Prompt.

### The browser cannot connect to `localhost:8080`

Check that:

- the terminal running MeadOS is still open
- the server started without an error
- you used `http://`, not `https://`
- another application is not already using port 8080

Try another port when necessary:

```sh
python3 server.py --port 9000
```

Then open `http://localhost:9000`.

### Another device cannot open MeadOS

Check that:

- both devices are on the same network
- you used the MeadOS computer's local IP address instead of `localhost`
- Python is allowed through the private-network firewall
- MeadOS was not started with `--host 127.0.0.1`
- guest Wi-Fi or client isolation is not blocking device-to-device traffic

### MeadOS works locally but not through a reverse proxy

Check the proxy's target host and port, WebSocket or HTTP settings where relevant, forwarded client-address headers, HTTPS configuration and MeadOS **Public URL** setting.

Do not enable Cloudflare header trust unless Cloudflare is genuinely in front of the domain.

### The interface looks older after an update

Confirm that the server is running from the updated folder, then perform a hard refresh. An installed PWA may also need to be closed and reopened after the service worker updates.

### Images are missing after moving MeadOS

Restore the appropriate user-upload folders in addition to `meados.db`:

```text
assets/labels/
assets/photos/
assets/brand/
```

### Charts or preferred fonts are unavailable without internet

Chart.js and jsQR are bundled with MeadOS. Google Fonts are the remaining external visual dependency; system fonts are used when they cannot be reached.

---

## Frequently asked questions

### Does MeadOS require Home Assistant?

No. Home Assistant support is entirely optional.

### Does MeadOS require an internet connection?

The MeadOS server and core brewing features do not require internet access. Devices still need a network connection to the MeadOS server. Google Fonts may fall back to system fonts when the internet is unavailable.

### Is my brewing data stored in an online MeadOS account?

No. Shared brewing data is stored in the local `meados.db` file on the machine running MeadOS.

### Can several devices use one MeadOS installation?

Yes. Devices connected to the same server work with the same shared data. MeadOS does not create separate per-user collections.

### Can MeadOS run on a Raspberry Pi or NAS?

Yes, provided the device can run Python 3.8 or newer and can keep the MeadOS folder and database writable.

### Can I use MeadOS commercially?

Not under the included PolyForm Noncommercial License 1.0.0. Read the full `LICENSE` file for the controlling terms.

---

## Support and useful bug reports

Use the repository's **Issues** section for reproducible bugs and focused feature requests.

A useful report includes:

- the operating system and Python version
- the browser and browser version
- the MeadOS commit or update date
- the steps that reproduce the problem
- the expected and actual result
- relevant server log messages with passwords, tokens and private addresses removed

Never post a Home Assistant token, external-access password, private share token or complete personal database in a public issue.

---

## Licence

MeadOS is source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE).

The licence grants rights to use, modify and distribute MeadOS for permitted noncommercial purposes. It does not grant commercial use. Distributions must include the licence terms or their URL and the required notice supplied with the software.

```text
Required Notice: Copyright © 2026 icemanxbe (https://github.com/icemanxbe/MeadOS)
```

The `LICENSE` file contains the complete legal terms and takes precedence over this summary.

---

<p align="center">
  <strong>Crafted with patience — like mead.</strong><br>
  Plan carefully. Brew confidently. Age beautifully.
</p>
