# SQL Quest — Zero to Data Engineer

A gamified, fully interactive SQL course that runs entirely in your browser — **and entirely offline**. Open `index.html` and go from your first `SELECT` to interview-ready Analytics/Data Engineer skills over 28 days. No installs, no accounts, no backend, no network: queries run against a real in-browser SQLite database (sql.js/WASM, bundled locally).

## Quick Start

1. Clone or download this folder.
2. Open `index.html` in any modern browser (double-clicking the file works — the app is built to run from `file://`).
3. Read the lesson, write the query, hit **Run** (or `Ctrl/Cmd + Enter`).

Progress, XP, streaks, and achievements persist in `localStorage`.

## The Course

28 days, 100 lessons, 180+ XP-earning practice exercises:

| Days | Track |
|------|-------|
| 1–2 | Core querying (SELECT, WHERE, ORDER BY) |
| 3, 13 | Aggregation & grouping |
| 4, 11, 12 | Joins, self-joins, set operations |
| 5, 15 | Subqueries, CTEs, recursion |
| 6, 14 | Window functions |
| 8–10, 16 | NULLs, strings, dates, data cleaning |
| 7, 17–21 | Pivots, cohorts, funnels, RFM, KPIs, analytics capstone |
| **22** | **DDL, constraints, transactions & upserts** |
| **23–24** | **Views, dbt-style layered models, star schemas (facts & dims, grain, SCD)** |
| **25** | **Indexes, EXPLAIN QUERY PLAN, sargable predicates** |
| **26–27** | **Incremental loads, idempotent ELT, dbt-style data quality tests** |
| **28** | **The Interview Gauntlet — top-N per group, Nth-highest, group-average classics** |

Days 1–21 cover what a junior SQL screen tests. The Data Engineer track (days 22–28) covers what the *job* actually is: modeling, pipelines, performance, and testing.

## The App

- **Fully offline** — CodeMirror and sql.js are vendored in `vendor/`; the SQLite WASM binary is embedded as base64 so it loads even from `file://`. The Google Fonts link is a progressive enhancement only.
- **Course Map** (`Ctrl+K`) — jump to any day; collapsible per-day sidebar with live progress.
- **Light & dark themes**, keyboard shortcuts (`Ctrl+/` for the list), CSV export of any result set, per-query timing, and a **↺ Reset data** button that rebuilds the practice database after your DDL/DML experiments.
- **Gamification** — XP with 15 levels (*Row Rookie* → *Principal Data Engineer*), daily streaks 🔥, combo multipliers, a date-seeded Daily Challenge worth double XP, and 26 achievements 🏆.
- **Data Engineer Readiness report** 📈 — click your level badge for per-skill progress mapped to real job requirements.
- **AI Tutor** (optional) — paste an Anthropic API key in the AI Tutor tab for a lesson-aware tutor. The key stays in your browser.

## Project Structure

| Path | What it is |
|------|------------|
| `index.html` | App shell and markup |
| `styles.css` | Design system — tokens, light/dark themes, all components |
| `data.js` | The curriculum (lessons, exercises, validations) and sample database |
| `app.js` | Engine — SQL runner, validation, gamification, navigation |
| `vendor/` | CodeMirror + sql.js, vendored for offline use |
| `tools/verify.js` | Node harness that seeds the DB and validates every lesson & exercise |
| `tools/check-wiring.js` | Static check that markup handlers/ids match the engine |

## Contributing

Add lessons in the `curriculum` array in `data.js` (sample data lives in `schemas` in the same file; gamification config in `LEVELS` / `ACHIEVEMENTS` / `SKILL_TRACKS` in `app.js`). Give each new exercise a `_ref` field containing a reference solution, then run:

```
node tools/verify.js
```

The harness executes every starter and reference solution against the seeded database and fails if any validation doesn't hold — so exercise row counts can never drift from the data.
