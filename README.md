<p align="center">
  <img src="assets/icons/icon.svg" width="108" alt="MeadOS">
</p>

<h1 align="center">MeadOS</h1>

<p align="center">
  <strong>The co-pilot for mead makers.</strong><br>
  Plan recipes · <em>guide</em> every fermentation · organise the cellar · keep every batch's story in one place.
</p>

<p align="center">
  <img alt="Python 3.8+" src="https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white">
  <img alt="No Python packages" src="https://img.shields.io/badge/dependencies-none-2E7D32">
  <img alt="SQLite" src="https://img.shields.io/badge/storage-SQLite-5B7083?logo=sqlite&logoColor=white">
  <img alt="Vanilla JS, no build step" src="https://img.shields.io/badge/frontend-vanilla%20JS-9C6B30">
  <img alt="English + Nederlands" src="https://img.shields.io/badge/i18n-EN%20%2B%20NL-8B5E3C">
  <img alt="Installable PWA" src="https://img.shields.io/badge/app-installable%20PWA-6F4E37">
  <img alt="Mead + Cider" src="https://img.shields.io/badge/brews-Mead%20%2B%20Cider-8ab030">
  <img alt="PolyForm Noncommercial 1.0.0" src="https://img.shields.io/badge/licence-PolyForm%20NC%201.0.0-8B5E3C">
</p>

<p align="center">
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-what-you-get">Features</a> ·
  <a href="https://github.com/icemanxbe/MeadOS/wiki">Documentation</a> ·
  <a href="#-faq">FAQ</a> ·
  <a href="#-licence">Licence</a>
</p>

![MeadOS dashboard](docs/screenshots/dashboard.png)

---

Most brewing apps are a logbook — *"here's what you did."* MeadOS goes a step further: it reads your batch's structured data and tells you **what's happening, why, and what to do next** — while still being a beautiful place to keep recipes, planned brews, fermentation readings, nutrient schedules, inventory, cellar locations, tasting notes, labels and aging milestones.

It runs on hardware **you** control and stores your shared brewing data locally — **no cloud account, no subscription, no package manager, no Node.js, no database server.** Open it from any computer, phone or tablet on your home network and every device works with the same collection — in **English or Nederlands**, end to end.

> 📖 **This README is the tour. The full handbook lives in the [Wiki](https://github.com/icemanxbe/MeadOS/wiki).**

---

## ✨ What you get

**🧭 A Brewing Advisor that reasons, not just a log**
Every batch gets an **Advisor** that turns your readings into guidance — and it reads the *shape* of your history, not just the latest number. A **timeline analyzer** spots a real plateau and knows whether it started before or after the sugar break (an abnormal early stall vs. a normal end-of-ferment tail-off); a **weighted multi-cause diagnosis** ranks *several* possible reasons for a stall at once instead of guessing one; and it predicts *when* you'll likely cross the sugar break, not just whether you have. A weighted **health score** (with a day-over-day trend), a **readiness** gauge that answers *"can I drink it yet?"* in brewer language — Improving → Drink now → Peak window → Past peak — and a **progress band** showing whether elapsed fermentation days are ahead, on-track, or behind the expected range for this recipe/yeast, as a position, never a fake-precise curve. The tab opens with a one-line summary — *"2 to watch · 1 insight"* — then groups recommendations into **Actions / Watch / Insights**, each with a plain-language reason, an **evidence level** (Strong / Moderate / Limited — never a made-up percentage), and for the ones that matter a **"why this matters"** line, occasionally paired with a **"consider waiting if…"** note where a genuine trade-off exists. Each card also states what was actually **observed** (the real numbers, not just the conclusion) and, where there's a genuinely distinct action, a separate **next step**; a stalled fermentation's own likely causes are grouped as related sub-cards instead of scattered separately, a matching guide entry gets linked directly where one's a close fit, and an action that actually resolves a recommendation gets a brief on-screen acknowledgment. A **batch story** stitches your real logged events — start, sugar-break crossing, nutrient additions, rackings, tastings, competition entries, a plateau, bottling, even a failure — into one timeline, and a **"what if?"** simulator re-runs the same real rules with one thing hypothetically fixed ("what if nutrients were complete?") to show what would change. It compares this batch to **your own past batches** — same recipe, then same yeast+honey combination, then same yeast, excluding any that failed — not generic lore, and surfaces honey×yeast pairing notes pulled from data already in the libraries. The temperature it reasons from prefers a **live sensor bound to wherever the batch actually is** — its fermenter while active, the specific cellar cabinet once bottled — but only while that sensor is actually still reporting; a live reading that's gone quiet for a while falls back to the last hand-logged one instead of trusting a possibly-dead sensor forever. And when there simply isn't enough data to say much of anything, it says so — naming what's missing rather than letting silence read as a clean bill of health. Pick **beginner / experienced / pro** explanation density in Settings — beginner adds a short jargon glossary and leaves Insights expanded, pro drops the prose entirely and ranks each section by evidence strength. Deterministic throughout: a transparent rule engine over your data, no LLM in the loop, no guesswork.

**🧪 Batches tracked by reality, not the calendar**
Log gravity and temperature onto a combined **gravity-&-ABV** chart and a unified **Fermentation Analysis** overlay (SG · temperature · drop-rate on one timeline, so you can *see* a warm spell speed things up). Batches move through *fermenting → conditioning → aging → bottled* based on the steps you actually complete, with a **Target-vs-Actual** read-out on every batch. Edit a batch's **step schedule** (and save reusable templates), record **competition entries & awards**, and let a guided bottling workflow handle pre-flight checks, the final reading, a sanitiser timer, bottle counts and labels.

**📜 38 built-in recipes you can configure before you brew**
Traditionals, melomels, cysers, pyments, metheglins, bochets, braggots, sack & port-style meads, plus five sparkling / bottle-conditioned recipes. Open any recipe and **pick your honey, yeast, nutrient and schedule** — the ingredients **and** the targets (FG / ABV / nutrient grams) recompute live as you drag the scale slider, and it **warns you before you brew** if the yeast can't reach the recipe's target. A melomel or cyser's **fruit and juice sugar counts toward the gravity math**, so the Designer doesn't quietly call for more honey than the batch needs; nutrient dosing scales with **your yeast's own nitrogen demand**, not a flat number regardless of strain. Every recipe also rates **every honey in the library** for *that* mead — a hand-curated great / good / workable / clash verdict with a note on what each swap does. "Brew This Recipe" carries your exact configuration straight into the new-batch form.

**✦ Design without doing the maths**
The Recipe Designer back-solves honey, OG/FG, a suitable yeast and a nutrient plan from a style, volume, target ABV and sweetness — then hands you an editable recipe. CiderOS mode gets its own path through the same wizard: since juice supplies its own sugar, it reports the target OG your juice/blend needs instead of a weighed addition, with cider styles and yeasts throughout.

**🧮 Calculators with context**
ABV, honey-for-target-gravity, **TOSNA 2.0** scheduling, sulfite (molecular SO₂), acid/TA, backsweetening & stabilisation, a **bench trial scaler** (dose a stock solution precisely, then scale the winning trial to the full batch), **carbonation / priming** with a bottle-pressure safety warning, temperature correction, SG↔Brix, sanitiser dosing, and **blending** — combine two finished batches in any ratio and turn the result into a new batch with weighted OG/ABV and lineage back to its sources.

**🍾 Inventory & a cellar that mirror real life**
Track honey, yeast, nutrients, chemicals and bottles with prices, expiry and restock thresholds; auto-deduct on brew day; see which recipes you can **brew with what you have**; and place finished bottles on real shelves with live drinking windows.

**📊 Analytics & records that compound**
Insights mines your whole history: **ingredient performance** (which yeast and honey score best for *you*, with their stall/fail rates), year-over-year trends, and a **trophy shelf** of competition results. Export a print-ready **brew logbook** for any batch and a **production & cost report** across the whole operation.

**⚡ Built to scale**
Stays fast with hundreds of batches and thousands of readings: windowed batch & cellar lists with sort and filter, downsampled charts, an indexed global search, **gzip-compressed** sync and history, and **delta saves** that upload only what changed.

**🎨 Label Studio — design real bottle labels**
A from-scratch **front & back** bottle-label designer. Start from a premium template or **upload your own art**, then drop live batch data onto it — ABV, net contents, batch №, vintage, a Dry→Sweet meter, ingredients, allergens, and a tasting note drawn from the *honey you actually used*. Pick shapes, fonts and honeycomb theming; **save element layouts** to reuse; design **per-bottle-size variants**; flip the whole label — and the share page — into **English or Nederlands**; and print a sheet that can **match your exact bottle counts per size**, front-only or front + back.

**🌍 Fully bilingual — English & Nederlands**
Not just labels: the **entire app** — every view, dropdown, popup, recipe, the honey/yeast/nutrient libraries and the Advisor — switches between English and Dutch from one setting.

**🔗 Sharing, calendar & PWA**
An unguessable per-batch **share page** (EN/NL, with the Studio label front-and-centre), procedural QR codes, a private `.ics` calendar feed, full metric / US / imperial units, and an installable offline-capable app.

**🏠 Optional Home Assistant**
Live fermenter/cellar temperatures, hydrometer (iSpindel/Tilt/RAPT) readings and push notifications — proxied safely server-side. Entirely optional; MeadOS runs fully standalone.

**🍎 Optional: CiderOS mode**
Flip on cider/perry tracking in Settings and a **Mead / Cider** switch appears in the top bar. It's a pure view filter — every batch and recipe always lives in the same database — but the app re-brands itself completely: **CIDEROS** wordmark and a green apple crest, a 13-recipe Cider Compendium, a 41-variety **Apple & Pear Library** classified by the industry-standard LARS tannin/acid system, cider-appropriate yeast strains, and a genuinely separate Cider Guide, Troubleshoot and Advisor content — not a mead page with the words swapped. See **[CiderOS Mode](https://github.com/icemanxbe/MeadOS/wiki/Cider-Mode)** in the wiki.

---

## 📸 A look around

| 🧭 Brewing Advisor — health, readiness & next actions | Recipe detail — configure, scale, targets & ratings |
|---|---|
| ![Advisor](docs/screenshots/advisor.png) | ![Recipe detail](docs/screenshots/recipe-detail.png) |

| Batch overview — Target vs Actual | Fermentation Analysis — SG · temp · rate |
|---|---|
| ![Batch detail](docs/screenshots/batch-detail.png) | ![Fermentation analysis](docs/screenshots/fermentation-analysis.png) |

| Label Studio — front & back designer | The same label, in Nederlands |
|---|---|
| ![Label Studio](docs/screenshots/label-studio.png) | ![Dutch label](docs/screenshots/label-studio-nl.png) |

| 🍎 CiderOS — same app, fully re-branded | Cider recipe — apple-fit, yeast & nutrient cards |
|---|---|
| ![CiderOS dashboard](docs/screenshots/cider-dashboard.png) | ![Cider recipe detail](docs/screenshots/cider-recipe-detail.png) |

<details>
<summary>More screenshots</summary>

| The visual cellar | Brewing tools & calculators |
|---|---|
| ![Cellar](docs/screenshots/cellar.png) | ![Brewing tools](docs/screenshots/brewing-tools.png) |

| Honey library & ratings | Supplies & shopping list |
|---|---|
| ![Honey library](docs/screenshots/honey-library.png) | ![Supplies](docs/screenshots/supplies.png) |

| Recipe compendium | Fermenter schedule & brew plan |
|---|---|
| ![Recipes](docs/screenshots/recipes.png) | ![Fermenter schedule](docs/screenshots/fermenter-schedule.png) |

| Aging timeline | Insights & lifetime stats |
|---|---|
| ![Aging timeline](docs/screenshots/aging-timeline.png) | ![Insights](docs/screenshots/insights.png) |

| Mead guide | Public share page (EN/NL) |
|---|---|
| ![Mead guide](docs/screenshots/mead-guide.png) | ![Share view](docs/screenshots/share-view.png) |

| Yeast library | The whole app in Dutch |
|---|---|
| ![Yeast library](docs/screenshots/yeast-library.png) | ![Dutch dashboard](docs/screenshots/dashboard-nl.png) |

| Apple & Pear Library — 41 varieties, LARS classified | Cider Guide |
|---|---|
| ![Apple & Pear Library](docs/screenshots/cider-apple-library.png) | ![Cider Guide](docs/screenshots/cider-guide.png) |

| Cider yeast library — only cider-appropriate strains | Cider Troubleshoot |
|---|---|
| ![Cider yeast library](docs/screenshots/cider-yeast-library.png) | ![Cider troubleshoot](docs/screenshots/cider-troubleshoot.png) |

| A bottled cider batch — juice, yeast, full journey | CiderOS Advisor |
|---|---|
| ![Cider batch detail](docs/screenshots/cider-batch-detail.png) | ![Cider advisor](docs/screenshots/cider-advisor.png) |

| CiderOS in Dutch |
|---|
| ![Dutch cider dashboard](docs/screenshots/cider-dashboard-nl.png) |

</details>

---

## 🚀 Quick start

You need only **Python 3.8+** — no pip installs, no build step, no Node.

```sh
git clone https://github.com/icemanxbe/MeadOS.git
cd MeadOS
python3 server.py
```

Open **http://localhost:8080** — that's the whole setup. Anyone on your network can open `http://<your-machine-ip>:8080` and works with the **same shared data**.

```sh
python3 server.py --port 9000            # a different port
python3 server.py --db /path/meados.db   # a different database location
python3 server.py --host 127.0.0.1       # local-only; don't expose on the LAN
```

**Want it running in the background, starting on login and restarting itself if it ever crashes?** Use the install script for your OS — no extra dependencies either way:

```sh
./install.sh install     # macOS (launchd) / Linux (systemd --user)
```
```powershell
.\install.ps1 install    # Windows (Task Scheduler)
```

Both take `install | update | start | stop | restart | status | uninstall | run`, with `update` doing a `git pull` and restarting for you. See **[Installation](https://github.com/icemanxbe/MeadOS/wiki/Installation)** for the full command reference.

➡️ Full install options, always-on service setup, and your first batch: **[Installation](https://github.com/icemanxbe/MeadOS/wiki/Installation)** · **[Getting Started](https://github.com/icemanxbe/MeadOS/wiki/Getting-Started)**.

---

## 📖 Documentation

The complete handbook is in the **[Wiki](https://github.com/icemanxbe/MeadOS/wiki)**:

| | |
|---|---|
| 🛠 [Installation & Running](https://github.com/icemanxbe/MeadOS/wiki/Installation) | 🌱 [Getting Started](https://github.com/icemanxbe/MeadOS/wiki/Getting-Started) |
| 📜 [Recipes & Designer](https://github.com/icemanxbe/MeadOS/wiki/Recipes-and-Designer) | ⚗️ [Batches & Fermentation](https://github.com/icemanxbe/MeadOS/wiki/Batches-and-Fermentation) |
| 🧭 [The Brewing Advisor](https://github.com/icemanxbe/MeadOS/wiki/Brewing-Advisor) | 🧮 [Brewing Tools](https://github.com/icemanxbe/MeadOS/wiki/Brewing-Tools) |
| 📚 [Libraries](https://github.com/icemanxbe/MeadOS/wiki/Libraries) | 🍾 [Cellar & Inventory](https://github.com/icemanxbe/MeadOS/wiki/Cellar-and-Inventory) |
| 🏷 [Labels, Sharing & Calendar](https://github.com/icemanxbe/MeadOS/wiki/Labels-Sharing-and-Calendar) | 🌍 [Language & Units](https://github.com/icemanxbe/MeadOS/wiki/Language-and-Units) |
| 🏠 [Home Assistant](https://github.com/icemanxbe/MeadOS/wiki/Home-Assistant) | 🔒 [Security & Deployment](https://github.com/icemanxbe/MeadOS/wiki/Security-and-Deployment) |
| 💾 [Backups & Data](https://github.com/icemanxbe/MeadOS/wiki/Backups-and-Data) | 🛟 [Troubleshooting](https://github.com/icemanxbe/MeadOS/wiki/Troubleshooting) |
| 🍎 [CiderOS Mode](https://github.com/icemanxbe/MeadOS/wiki/Cider-Mode) | |

---

## 🏗 How it works

```
┌────────────┐   GET /api/data (gzip)   ┌─────────────┐
│  Browser A │ ◄────────────────────────│             │
│  Browser B │ ────────────────────────►│  server.py  │──► meados.db (SQLite)
│  Phone     │  POST /api/data[/patch]  │  (stdlib)   │      ├─ state    (current)
└────────────┘   full save · or delta   └─────────────┘      └─ history  (gzip, last 200)
```

`index.html` is a small shell that loads `app.css` and the app's JavaScript — split into ordered plain `<script>` modules organised into concern folders under `core/` (`data`, `state`, `domain`, `sync`, `views`, `tools`, `features`, `labels`, `share`, `boot`) that share one global scope, with **no build step, no bundler and no Node** — each served as an ETag-cached static asset. The intelligence layer is pure, DOM-free domain code: a mead **model** and an **advisor** (facts → rule engine → health / readiness) that every view reads from, so guidance is consistent everywhere and unit-tested in `test.html`.

`server.py` — **Python standard library only** — serves the app, stores the full state in SQLite, serves the PWA assets, the tokenised share page and the calendar feed, and adds security headers plus request hardening (login throttling, origin/CSRF checks, an audit log) to every response. Every browser reads and writes the **same shared data**; saves are debounced, offline edits re-sync, and every save is appended to a deep history table so an accidental overwrite is recoverable.

**It stays light at scale.** Responses are **gzip-compressed**, history snapshots are stored **compressed**, and a save can be a **delta** — a merge-patch of only what changed (`POST /api/data/patch`) that the client verifies reconstructs the exact state before sending, with a full save as the always-available fallback. On the front end, long batch/cellar lists are windowed and gravity charts are downsampled, so hundreds of batches and thousands of readings stay responsive.

➡️ More: **[The Brewing Advisor](https://github.com/icemanxbe/MeadOS/wiki/Brewing-Advisor)** · **[Backups & Data](https://github.com/icemanxbe/MeadOS/wiki/Backups-and-Data)** · **[Security & Deployment](https://github.com/icemanxbe/MeadOS/wiki/Security-and-Deployment)**.

---

## ❓ FAQ

**Is it free? Can I sell it?**
Free to use, modify and share for any **noncommercial** purpose. Selling it or using it for commercial advantage is not permitted — see the [licence](#-licence).

**What do I need to install?**
Just Python 3.8+. No packages, no Node, no build step, no separate database.

**Is the Advisor "AI"?**
No — it's a transparent, deterministic rule engine over your batch data, so every recommendation comes with its reasoning and an evidence level you can trust. (It's designed so an optional AI *explainer* could be added later, but it never makes the safety-critical calls.)

**Where's my data, and how do I back it up?**
Everything is in one file, `meados.db` (plus uploaded images under `assets/`). Copy it — safe even while running. The last 200 saves are kept for recovery. → [Backups & Data](https://github.com/icemanxbe/MeadOS/wiki/Backups-and-Data).

**Will updating wipe my batches?**
No. `git pull` updates app files only; `meados.db` is untouched.

**Do I need a password or Home Assistant?**
Neither, on a trusted LAN. Add an [external-access password](https://github.com/icemanxbe/MeadOS/wiki/Security-and-Deployment) if you expose it to the internet; Home Assistant is entirely optional.

**Can I add my own recipes and switch language/units?**
Yes — create, fork, template, import/export BeerXML or PDF, switch the whole app between English and Nederlands, and toggle metric / US / imperial anywhere.

➡️ The full **[FAQ](https://github.com/icemanxbe/MeadOS/wiki/FAQ)** and **[Troubleshooting](https://github.com/icemanxbe/MeadOS/wiki/Troubleshooting)** are in the wiki.

---

## 🗂 Project layout

```
MeadOS/
├── index.html              # app shell (loads app.css + core/*.js, in order)
├── app.css                 # styles
├── core/                   # the app's JavaScript: ordered plain scripts in concern folders (no build step)
│   ├── data/               # honey/yeast/nutrient data, the 38 recipes + Dutch (NL) data maps
│   ├── state/              # state model, i18n layer, navigation & rendering
│   ├── domain/             # honey & brew logic, the mead model, batch Advisor (signals → rules → scores) + cross-batch analytics & blend math
│   ├── sync/               # SQLite sync + Home Assistant integration
│   ├── views/              # page renderers (batches, advisor, cellar, recipes, library, insights…)
│   ├── tools/              # calculators, mead guide, scanner, search, PDF, BeerXML
│   ├── features/           # alerts, schedules, planner, designer, tasting, gift, bottling…
│   ├── labels/             # Label Studio + legacy designer, image upload, print, exports
│   ├── share/              # public share view + HA media
│   └── boot/               # schema, storage budget, modal handlers, init (loads last)
├── server.py               # zero-dependency Python server + SQLite storage
├── install.sh              # background-service install/update/run — macOS (launchd) + Linux (systemd --user)
├── install.ps1             # same, for Windows (Task Scheduler)
├── test.html               # zero-dependency unit checks (model, advisor, calculators)
├── sw.js                   # service worker (offline shell)
├── meados.db               # created on first save (gitignored)
├── assets/
│   ├── icons/              # bundled PWA / home-screen icons
│   ├── vendor/             # self-hosted Chart.js + jsQR
│   ├── labels/             # uploaded label art      (gitignored)
│   ├── photos/             # uploaded photo journal   (gitignored)
│   └── brand/              # uploaded brand logo/icon (gitignored)
└── docs/screenshots/
```

---

## 📜 Licence

[**PolyForm Noncommercial License 1.0.0**](LICENSE) — free to use, modify and share for any **noncommercial** purpose (personal, hobby, research, nonprofit/education). **Selling it or using it for commercial advantage is not permitted.**

<p align="center"><sub>Crafted with patience — like mead. 🍯</sub></p>
