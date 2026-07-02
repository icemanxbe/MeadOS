# Contributing to MeadOS

Thanks for your interest in improving MeadOS! It's a self-hosted, single-user
mead-brewing companion, built deliberately simple. This guide covers how to run
it, how the code is organised, and what a good contribution looks like.

> **Licence note:** MeadOS is released under the
> [PolyForm Noncommercial License 1.0.0](LICENSE). By contributing, you agree
> your contributions are provided under the same licence (noncommercial use).

## Running it locally

No build step, no package manager, no Node — just Python 3.8+.

```bash
git clone https://github.com/icemanxbe/MeadOS.git
cd MeadOS
python3 server.py            # then open http://localhost:8123
```

`server.py` uses the **Python standard library only** and stores everything in a
local `meados.db` SQLite file (created on first save, gitignored).

## How the code is organised

The frontend is **plain JavaScript with no framework and no bundler**. It is
split into ordered plain `<script>` modules that share one global scope:

```
core/
├── data-libraries.js        # honey / yeast / nutrient reference data
├── data-recipes.js          # the built-in recipes + pairings
└── 01-state.js … 14-bootstrap.js   # logic, loaded in order (14 runs init())
```

`index.html` loads them **in order** — data first (so the logic sees
`BUILTIN_RECIPES`, `HONEY_PROFILES`, etc.), then `01-state.js` through
`14-bootstrap.js`, which calls `init()` last. `server.py` serves any
`core/*.js` automatically, so adding a module only means adding a `<script>`
tag in the right place in `index.html`.

Because the app relies on inline `onclick` handlers, **functions must stay
global** — don't wrap modules in IIFEs or convert them to ES modules.

## Architecture principles

A few rules the codebase already follows — keep following them:

- **Signals contain facts only.** `mwBatchSignals()` (`core/domain/03e-advisor.js`)
  never contains advice text or i18n strings — just derived numbers and booleans.
  Rules read signals and emit recommendations; the view layer (`12-advisor.js`)
  is the only place recommendation strings live.
- **Views never calculate.** If a number can be derived from a batch/recipe
  (honey kg, attenuation, sugar break, nutrient grams…), there should be exactly
  **one** function that derives it (`core/domain/03d-mead-model.js`), called from
  everywhere that needs it — not re-derived inline per call site. Two duplicate
  copies of the same formula is a bug waiting to happen the moment one gets fixed
  and the other doesn't.
- **The advisor stays deterministic.** No LLM calls in the reasoning path —
  brewers troubleshooting a stuck fermentation want repeatable answers. Use AI
  (if ever) for docs/help text, not for "is my fermentation stuck?".
  Every recommendation should carry `reasons` a view can render as "why" —
  don't ship a recommendation you can't explain.
- **Prefer functions over classes, explicit control flow over clever one-liners**
  — matches the ES5-flavoured style above; a `for` loop that's obviously correct
  beats a chained `reduce()` that isn't.

## Making a change

1. Edit the relevant `core/*.js`, `app.css`, `index.html`, or `server.py`.
2. **Match the surrounding code** — its naming, comment density and idioms.
   It's ES5-flavoured vanilla JS on purpose (broad browser support, no
   transpiler).
3. Verify in the browser: load the app, exercise the feature, and confirm the
   console has **no errors**. `test.html` is a zero-dependency smoke page.
4. Keep diffs focused. One logical change per pull request.

## Commit & PR style

- Write clear, descriptive commit messages explaining the *why*, not just the *what*.
- Reference any related issue.
- Fill in the pull-request template.
- Don't commit `meados.db` or anything under `assets/labels`, `assets/photos`,
  `assets/brand` (all gitignored — they're user data).

## Reporting bugs & ideas

Open an [issue](https://github.com/icemanxbe/MeadOS/issues) using the bug or
feature template. For anything security-related, please follow
[SECURITY.md](SECURITY.md) instead of opening a public issue.

The in-depth manual lives in the
[wiki](https://github.com/icemanxbe/MeadOS/wiki).
