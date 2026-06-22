<p align="center">
  <img src="assets/icons/icon.svg" width="108" alt="MeadOS">
</p>

<h1 align="center">MeadOS</h1>

<p align="center">
  <strong>A polished, self-hosted workspace for mead makers.</strong><br>
  Plan recipes · guide fermentation · organise the cellar · keep every batch's story in one place.
</p>

<p align="center">
  <img alt="Python 3.8+" src="https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white">
  <img alt="No Python packages" src="https://img.shields.io/badge/dependencies-none-2E7D32">
  <img alt="SQLite" src="https://img.shields.io/badge/storage-SQLite-5B7083?logo=sqlite&logoColor=white">
  <img alt="Vanilla JS, no build step" src="https://img.shields.io/badge/frontend-vanilla%20JS-9C6B30">
  <img alt="Installable PWA" src="https://img.shields.io/badge/app-installable%20PWA-6F4E37">
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

MeadOS brings the whole brewing journey into one elegant, browser-based application: recipes, planned brews, fermentation readings, nutrient schedules, inventory, cellar locations, tasting notes, labels and aging milestones.

It runs on hardware **you** control and stores your shared brewing data locally — **no cloud account, no subscription, no package manager, no Node.js, no database server.** Open it from any computer, phone or tablet on your home network and every device works with the same collection.

> 📖 **This README is the tour. The full handbook lives in the [Wiki](https://github.com/icemanxbe/MeadOS/wiki).**

---

## ✨ What you get

**🧪 Batches, tracked by reality, not the calendar**
Log gravity readings onto a combined gravity-and-projected-ABV chart, assign fermenters, and watch each batch move through *fermenting → conditioning → aging → bottled* based on the brew-coach steps you actually complete. MeadOS flags a flat gravity trend, diagnoses a likely stall from your *logged* nutrient data, and a guided bottling workflow handles pre-flight checks, the final reading, a sanitiser timer, bottle counts and labels.

**📜 38 built-in recipes that know their stuff**
Traditionals, melomels, cysers, pyments, metheglins, bochets, braggots, sack & port-style meads, plus five sparkling / bottle-conditioned recipes. Every recipe rates **every honey in the library** for *that* mead — a hand-curated great / good / workable / clash verdict with a note on what each swap does to it — alongside recommended yeast strains, a nutrient strategy, a live scale slider, and a step schedule. Aroma-sensitive melomels come in cross-linked *fruit-in-primary* and *fruit-in-secondary* versions.

**✦ Design without doing the maths**
The Recipe Designer back-solves honey, OG/FG, a suitable yeast and a nutrient plan from a style, volume, target ABV and sweetness — then hands you an editable recipe.

**🧮 Calculators with context**
ABV, honey-for-target-gravity, **TOSNA 2.0** scheduling, sulfite (molecular SO₂), acid/TA, backsweetening & stabilisation, **carbonation / priming** with a bottle-pressure safety warning, temperature correction, SG↔Brix, blending and sanitiser dosing.

**🍾 Inventory & a cellar that mirror real life**
Track honey, yeast, nutrients, chemicals and bottles with prices, expiry and restock thresholds; auto-deduct on brew day; see which recipes you can **brew with what you have**; and place finished bottles on real shelves with live drinking windows.

**🎨 Label Studio — design real bottle labels**
A from-scratch **front & back** bottle-label designer. Start from a premium template or **upload your own art**, then drop live batch data onto it — ABV, net contents, batch №, vintage, a Dry→Sweet meter, ingredients, allergens, and a tasting note drawn from the *honey you actually used*. Pick shapes, fonts and honeycomb theming; **save element layouts** to reuse across labels. Design **per-bottle-size variants** (a 375 ml and a 750 ml version of the same label), flip the whole label — and the share page — into **English or Nederlands**, and print a sheet that can **match your exact bottle counts per size**, front-only or front + back.

**🔗 Sharing, calendar & PWA**
An unguessable per-batch **share page** (now in English or Dutch, with the Studio label front-and-centre), procedural QR codes, a private `.ics` calendar feed, full metric / US / imperial units, and an installable offline-capable app.

**🏠 Optional Home Assistant**
Live fermenter/cellar temperatures, hydrometer (iSpindel/Tilt/RAPT) readings and push notifications — proxied safely server-side. Entirely optional; MeadOS runs fully standalone.

---

## 📸 A look around

| Label Studio — front & back designer | The same label, in Nederlands |
|---|---|
| ![Label Studio](docs/screenshots/label-studio.jpg) | ![Dutch label](docs/screenshots/label-studio-nl.jpg) |

| Batch detail & gravity log | Recipe detail — scale, ratings & steps |
|---|---|
| ![Batch detail](docs/screenshots/batch-detail.png) | ![Recipe detail](docs/screenshots/recipe-detail.png) |

| The visual cellar | Brewing tools & calculators |
|---|---|
| ![Cellar](docs/screenshots/cellar.png) | ![Brewing tools](docs/screenshots/brewing-tools.png) |

| Honey library & ratings | Supplies & shopping list |
|---|---|
| ![Honey library](docs/screenshots/honey-library.png) | ![Supplies](docs/screenshots/supplies.png) |

<details>
<summary>More screenshots</summary>

| Recipe compendium | Fermenter schedule & brew plan |
|---|---|
| ![Recipes](docs/screenshots/recipes.png) | ![Fermenter schedule](docs/screenshots/fermenter-schedule.png) |

| Aging timeline | Insights & lifetime stats |
|---|---|
| ![Aging timeline](docs/screenshots/aging-timeline.png) | ![Insights](docs/screenshots/insights.png) |

| Mead guide | Public share page |
|---|---|
| ![Mead guide](docs/screenshots/mead-guide.png) | ![Share view](docs/screenshots/share-view.png) |

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

➡️ Full install options, always-on service setup, and your first batch: **[Installation](https://github.com/icemanxbe/MeadOS/wiki/Installation)** · **[Getting Started](https://github.com/icemanxbe/MeadOS/wiki/Getting-Started)**.

---

## 📖 Documentation

The complete handbook is in the **[Wiki](https://github.com/icemanxbe/MeadOS/wiki)**:

| | |
|---|---|
| 🛠 [Installation & Running](https://github.com/icemanxbe/MeadOS/wiki/Installation) | 🌱 [Getting Started](https://github.com/icemanxbe/MeadOS/wiki/Getting-Started) |
| 📜 [Recipes & Designer](https://github.com/icemanxbe/MeadOS/wiki/Recipes-and-Designer) | ⚗️ [Batches & Fermentation](https://github.com/icemanxbe/MeadOS/wiki/Batches-and-Fermentation) |
| 🧮 [Brewing Tools](https://github.com/icemanxbe/MeadOS/wiki/Brewing-Tools) | 📚 [Libraries](https://github.com/icemanxbe/MeadOS/wiki/Libraries) |
| 🍾 [Cellar & Inventory](https://github.com/icemanxbe/MeadOS/wiki/Cellar-and-Inventory) | 🏷 [Labels, Sharing & Calendar](https://github.com/icemanxbe/MeadOS/wiki/Labels-Sharing-and-Calendar) |
| 🏠 [Home Assistant](https://github.com/icemanxbe/MeadOS/wiki/Home-Assistant) | 🔒 [Security & Deployment](https://github.com/icemanxbe/MeadOS/wiki/Security-and-Deployment) |
| 💾 [Backups & Data](https://github.com/icemanxbe/MeadOS/wiki/Backups-and-Data) | 🛟 [Troubleshooting](https://github.com/icemanxbe/MeadOS/wiki/Troubleshooting) |

---

## 🏗 How it works

```
┌────────────┐     GET /api/data      ┌─────────────┐
│  Browser A │ ◄──────────────────────│             │
│  Browser B │ ──────────────────────►│  server.py  │──► meados.db (SQLite)
│  Phone     │     POST /api/data     │  (stdlib)   │      ├─ state    (current)
└────────────┘                        └─────────────┘      └─ history  (last 50 saves)
```

`index.html` is a small shell that loads `app.css` and the app's JavaScript — split into ordered plain `<script>` modules organised into concern folders under `core/` (`data`, `state`, `domain`, `sync`, `views`, `tools`, `features`, `labels`, `share`, `boot`) that share one global scope, with **no build step, no bundler and no Node** — each served as an ETag-cached static asset. `server.py` — **Python standard library only** — serves the app, stores the full state in SQLite, serves the PWA assets, the tokenised share page and the calendar feed, and adds security headers plus request hardening (login throttling, origin/CSRF checks, an audit log) to every response. Every browser reads and writes the **same shared data**; saves are debounced, offline edits re-sync, and every save is appended to a 200-deep history table so an accidental overwrite is recoverable.

➡️ More: **[Backups & Data](https://github.com/icemanxbe/MeadOS/wiki/Backups-and-Data)** · **[Security & Deployment](https://github.com/icemanxbe/MeadOS/wiki/Security-and-Deployment)**.

---

## ❓ FAQ

**Is it free? Can I sell it?**
Free to use, modify and share for any **noncommercial** purpose. Selling it or using it for commercial advantage is not permitted — see the [licence](#-licence).

**What do I need to install?**
Just Python 3.8+. No packages, no Node, no build step, no separate database.

**Where's my data, and how do I back it up?**
Everything is in one file, `meados.db` (plus uploaded images under `assets/`). Copy it — safe even while running. The last 50 saves are kept for recovery. → [Backups & Data](https://github.com/icemanxbe/MeadOS/wiki/Backups-and-Data).

**Will updating wipe my batches?**
No. `git pull` updates app files only; `meados.db` is untouched.

**Do I need a password or Home Assistant?**
Neither, on a trusted LAN. Add an [external-access password](https://github.com/icemanxbe/MeadOS/wiki/Security-and-Deployment) if you expose it to the internet; Home Assistant is entirely optional.

**Can I add my own recipes and switch units?**
Yes — create, fork, template, import/export BeerXML or PDF, and toggle metric / US / imperial anywhere.

➡️ The full **[FAQ](https://github.com/icemanxbe/MeadOS/wiki/FAQ)** and **[Troubleshooting](https://github.com/icemanxbe/MeadOS/wiki/Troubleshooting)** are in the wiki.

---

## 🗂 Project layout

```
MeadOS/
├── index.html              # app shell (loads app.css + core/*.js, in order)
├── app.css                 # styles
├── core/                   # the app's JavaScript: ordered plain scripts in concern folders (no build step)
│   ├── data/               # honey/yeast/nutrient data + the 38 built-in recipes
│   ├── state/              # state model, navigation & rendering
│   ├── domain/             # honey & brew domain logic, bottle-count helpers
│   ├── sync/               # SQLite sync + Home Assistant integration
│   ├── views/              # page renderers (batches, cellar, recipes, library, insights…)
│   ├── tools/              # calculators, mead guide, scanner, search, PDF, BeerXML
│   ├── features/           # alerts, schedules, planner, designer, tasting, gift, bottling…
│   ├── labels/             # Label Studio + legacy designer, image upload, print, exports
│   ├── share/              # public share view + HA media
│   └── boot/               # schema, storage budget, modal handlers, init (loads last)
├── server.py               # zero-dependency Python server + SQLite storage
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
