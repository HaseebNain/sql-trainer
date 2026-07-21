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
- **Update check** — the version badge in the top bar checks GitHub for a newer release and, when you're online, tells you how to update (`git pull` or re-download). It's best-effort and fails silently offline; your saved XP/progress survive updates.

## Project Structure

| Path | What it is |
|------|------------|
| `index.html` | App shell and markup |
| `styles.css` | Design system — tokens, light/dark themes, all components |
| `data.js` | The curriculum (lessons, exercises, validations) and sample database |
| `app.js` | App engine — SQL runner, grading, gamification, navigation |
| `engine.js` | Result-set validator — grades a query by the *results* it produces |
| `refs.js` | Authored reference answers per lesson (the grading source of truth) |
| `vendor/` | CodeMirror + sql.js, vendored for offline use |
| `tools/verify.js` | Authoritative gate: starters run, and every lesson has a self-validating reference |
| `tools/verify-refs.js` | Focused report of reference coverage / self-validation |
| `tools/engine-test.js` | Checks the validator accepts equivalents / rejects wrong answers |
| `tools/check-wiring.js` | Static check that markup handlers/ids match the engine |

### How answers are validated

Lessons are graded purely by **result-set equivalence** — *not* by matching the
query text. `engine.js` runs a faithful reference answer and the learner's query
against clean, identical copies of the practice database and compares the
results. Any query that produces the same answer passes, however it's written:
reordered columns, different casing/whitespace, an equivalent predicate
(`>= 70000 AND <= 90000` for a `BETWEEN`), table aliases, an alias vs no alias,
an extra `ORDER BY`, or a different-but-equivalent approach. Column **names** are
ignored (columns are matched by their values). Wrong answers are rejected even
when they happen to contain a keyword the old text matcher looked for.

Reference answers live in `refs.js` as `LESSON_REFS[lessonId]`:

- **`refs`** — one or more accepted reference queries; a submission passes if it
  matches **any** of them (open-ended lessons list several valid variants).
- **`setup`** / **`probe`** — for state-changing lessons (DDL, `INSERT`/`UPDATE`,
  upserts, indexes, SCD2). `setup` is an idempotent scaffold run first; `probe`
  is a `SELECT` (e.g. against `sqlite_master` for an index, or the mutated table)
  run **after** the learner's statements. The engine compares the *probe*
  results, so the answer is judged by the database state it produces.
- **`requires`** — a structural gate for lessons whose correct answer is
  legitimately empty (a data-quality check), so a trivial 0-row query can't pass.
- **`accept`** — a structural pass-path for genuinely open-ended capstones whose
  exact result shape can't be pinned down; passes if the key constructs are used.

Days 1–7 without a `refs.js` entry fall back to a derived reference (the
correctly-cased `starter` plus quote-free `solution` variants). `node
tools/verify.js` fails if any lesson lacks a self-validating reference.

## Contributing

Add lessons in the `curriculum` array in `data.js` (sample data lives in `schemas` in the same file; gamification config in `LEVELS` / `ACHIEVEMENTS` / `SKILL_TRACKS` in `app.js`). For each new lesson, add a reference to `LESSON_REFS` in `refs.js` (see "How answers are validated" above) so the engine can grade it; give each new exercise a `_ref` field with a reference solution. Then run:

```
node tools/verify.js       # authoritative gate — must be 0 errors
node tools/verify-refs.js  # reference coverage detail
node tools/engine-test.js  # equivalence accepted / wrong answers rejected
```

The harness executes every starter and reference against the seeded database and fails if any lesson lacks a self-validating reference or any exercise validation doesn't hold — so grading can never silently drift from the data.

### Releasing a new version

The in-app update check compares a baked-in version to `version.json` on `master`. To publish an update, bump **both** in the same commit and push:

- `APP_VERSION` in `app.js`
- `version` (and optional `notes`) in `version.json`

Users on an older copy will then see the update prompt next time they open the app online.
