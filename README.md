# SQL Quest — Zero to Data Engineer

A gamified, fully interactive SQL **and Python** course that runs entirely in your browser — **and entirely offline**. Open `index.html` and go from your first `SELECT` to building a warehouse, passing the interview, and writing the Python pipeline that loads it, over 48 days. No installs, no accounts, no backend, no network: queries run against a real in-browser SQLite database (sql.js/WASM), Python runs on a real CPython interpreter (Pyodide/WASM), both bundled locally.

## Quick Start

1. Clone or download this folder.
2. Open `index.html` in any modern browser (double-clicking the file works — the app is built to run from `file://`).
3. Read the lesson, write the query (or, from Day 40, the Python), hit **Run** (or `Ctrl/Cmd + Enter`).

Progress, XP, streaks, and achievements persist in `localStorage`.

## Two tracks: SQL and Python

The **SQL / Python** switch next to the logo chooses which course you are in. Everything else — the route in the sidebar, the course map, Today, the daily challenge, the progress counts — follows it.

| Track | What it is |
|-------|------------|
| **SQL** | The 48-day course described below. It ends with Python *for people who now know SQL* (Days 40–48). |
| **Python** | **Python from scratch** — 8 days, 31 lessons, 30 practice exercises. It assumes no SQL and no programming: the first lesson is `print()`, the last is a program that reads a messy file and prints a report. |

The Python track's days: first programs (print, variables, numbers, types) → text (f-strings, string methods, slicing) → decisions (`if` / `elif` / `else`, `and` / `or` / `not`) → loops (`for`, `while`, accumulators) → lists → dictionaries, sets and tuples → functions → errors, `import`, files and a final project.

Each track remembers the lesson you left it on, so you can switch back and forth freely. XP, level, streak and achievements are shared between them; the quiz and the mock interviews grade SQL, so they appear on the SQL track only. Lessons on both tracks run on the same real interpreter and are graded the same way (see *How Python answers are validated*).

## The Course

48 days, 177 lessons, 269 XP-earning practice exercises:

| Days | Track |
|------|-------|
| 1–2 | Core querying (SELECT, WHERE, ORDER BY) |
| 3, 13 | Aggregation & grouping |
| 4, 11, 12 | Joins, self-joins, set operations |
| 5, 15 | Subqueries, CTEs, recursion |
| 6, 14 | Window functions |
| 8–10, 16 | NULLs, strings, dates, data cleaning |
| 7, 17–21 | Pivots, cohorts, funnels, RFM, KPIs, analytics capstone |
| 22 | DDL, constraints, transactions & upserts |
| 23–24 | Views, dbt-style layered models, star schemas (facts & dims, grain, SCD) |
| 25 | Indexes, EXPLAIN QUERY PLAN, sargable predicates |
| 26–27 | Incremental loads, idempotent ELT, dbt-style data quality tests |
| 28 | The Interview Gauntlet — top-N per group, Nth-highest, group-average classics |
| **29–31** | **Warehouse dialects — the same query in SQLite, Snowflake and BigQuery** |
| **32–39** | **Capstone — build the plant-floor warehouse, raw → staging → marts** |
| **40–43** | **Python — values, control flow, lists / dicts / sets, functions, comprehensions** |
| **44–45** | **Python for data — exceptions & validation, dates, the standard library, CSV & JSON** |
| **46–47** | **Python + SQL — `sqlite3`, parameters, transactions, generators, an idempotent pipeline end to end** |
| **48** | **pandas — DataFrames mapped onto the SQL you already write** |

Days 1–21 cover what a junior SQL screen tests. Days 22–28 cover what the *job* is. Days 29–39 are the job itself, on realistic data. Days 40–48 add the other half of every data-engineering posting: Python.

### Warehouse dialects (Days 29–31)

The practice database is SQLite; production warehouses are Snowflake and BigQuery. Each lesson is a two-step:

1. **Solve it in SQLite** — graded for real, by result.
2. **Translate it** to Snowflake and/or BigQuery. A warehouse query can't run in a browser, so the translation is **checked structurally** (the dialect's constructs are present, the SQLite-only ones are gone) and then you compare against a model answer.

Covers `QUALIFY`, `DATE_TRUNC` / `DATEDIFF` (and their reversed argument orders), `COUNT_IF` / `COUNTIF` / `SAFE_DIVIDE`, `MERGE`, `LISTAGG` / `STRING_AGG`, `UNNEST` / `LATERAL FLATTEN`, `VARIANT` paths / `JSON_VALUE`, `PIVOT`, `ROLLUP`, and partitioning / clustering DDL.

### Capstone: the plant-floor warehouse (Days 32–39)

One project on a deliberately messy manufacturing dataset — "Ridgeline Components", three plants, six lines, two weeks of production, defects, rework, deliveries and downtime in 11 `raw_*` tables. The problems are planted on purpose:

- three timestamp formats (one per plant, one with no time zone at all)
- re-sent duplicates, corrected rows and late-arriving rows
- pounds vs kilograms, with the unit spelled eight different ways
- orphaned foreign keys, unknown codes, untrimmed / mixed-case keys
- supplier history that only exists as weekly snapshots
- a night shift that crosses midnight

You profile it, build staging views, convert units, quarantine bad rows, model dimensions (including an SCD Type 2 built from snapshots) and facts, write an incremental upsert and an idempotent backfill, add data-quality tests, and finish with KPI marts and a week-over-week yield alert. Each lesson pre-builds the *official* version of every upstream model, so a mistake on Day 33 can't follow you to Day 36.

### Python (Days 40–48)

Written for someone who already knows SQL: every idea is introduced next to the SQL it replaces or drives (`if` ↔ `CASE WHEN`, a comprehension ↔ `SELECT … WHERE`, `Counter` ↔ `GROUP BY`, flattening JSON ↔ `LATERAL FLATTEN`, `merge` ↔ `JOIN`).

- **A real interpreter.** CPython 3.13 via [Pyodide](https://pyodide.org), with the standard library, `sqlite3` and `pandas`. It starts the first time you open a Python lesson (a few seconds, once per visit); pandas loads only on Day 48.
- **It checks what your code does, not how it's written.** A lesson passes when your output matches the reference's and/or your functions behave correctly on inputs you haven't seen — empty lists, a `0` that isn't missing, a name with a quote in it. A miss tells you which case failed and what it expected.
- **Errors are explained.** The failing line is highlighted, with a plain-language note on what that error usually means. A loop that never ends is stopped for you.
- **Files and a database to work on.** Lessons come with CSV / JSON / log files in a working folder (click a file pill to read it), and from Day 46 `shop.db` — the same practice database as the SQL days, as a SQLite file. Every run starts from fresh copies.
- **It ends with a job.** Day 47's capstone is a complete batch pipeline: read a messy plant-floor CSV, validate and reject bad rows, upsert the rest in one transaction, and survive being run twice.
- Your code is kept per lesson, so leaving and coming back doesn't lose it; **Reset** returns to the starter.

## The App

- **Fully offline** — CodeMirror, sql.js and Pyodide are vendored in `vendor/`; the SQLite WASM binary is embedded as base64 so it loads even from `file://`. The fonts (Bricolage Grotesque, IBM Plex Sans and Mono — SIL OFL) are bundled in `vendor/fonts/` too, so nothing is fetched from the network. Pyodide's binaries (interpreter, standard library, sqlite3, pandas — about 19 MB in `vendor/pyodide/`) are embedded the same way and loaded only when a Python lesson needs them.
- **Today** — the screen you come back to: a lamp for each of the last seven days, your streak, the next lesson, the daily challenge, and progress through the seven stages of the course. It opens once a day; click the logo to see it any time.
- **Your route** — the sidebar shows the course as stations on a line, grouped by stage; a station's ring fills as you finish its lessons.
- **It tells you *why* a query is wrong** — a wrong answer gets a diagnosis instead of a red X: "2 expected rows are missing — all with NULL in `manager`: an INNER JOIN drops them", a join fan-out, right rows in the wrong order, a missing `ROUND`, integer division, ×100, `SELECT *` instead of named columns. Deterministic, **no AI involved** (see below).
- **Mock interviews** 🎤 — timed problems from a graded bank (SQL screen, data engineering, or mixed), follow-up questions, and a scorecard with a review list. Run it **solo** (scripted follow-ups, model answers to rate yourself against) or with an **AI interviewer**.
- **AI Tutor & interviewer — on a local model if you like** — optional, and not tied to a subscription. Point it at any OpenAI-compatible local server (**Ollama**, **LM Studio**, llama.cpp, Jan) for a free, offline tutor, or at the Anthropic API with your own key. The AI is never asked whether your SQL is correct; the engine decides that.
- **Course Map** (`Ctrl+K`) — jump to any day; collapsible per-day sidebar with live progress.
- **Light & dark themes**, keyboard shortcuts (`Ctrl+/` for the list), CSV export of any result set, per-query timing, and a **↺ Reset data** button that rebuilds the practice database after your DDL/DML experiments.
- **Gamification** — XP with 18 levels (*Row Rookie* → *Two-Language Data Engineer*), daily streaks 🔥, combo multipliers, a date-seeded Daily Challenge worth double XP, and 39 achievements 🏆.
- **Data Engineer Readiness report** 📈 — click your level badge for per-skill progress mapped to real job requirements.
- **Update check** — the version badge in the top bar checks GitHub for a newer release and, when you're online, tells you how to update (`git pull` or re-download). It's best-effort and fails silently offline; your saved XP/progress survive updates.

### Using a local model

1. Install [Ollama](https://ollama.com) (or LM Studio) and get a chat model, e.g. `ollama pull llama3.2`.
2. In the app: **AI Tutor** tab → **Local model** → pick the preset → **Detect models** → **Save & test**.

A page opened in a browser needs the server's permission to call it (CORS). If the connection is blocked: for Ollama set the environment variable `OLLAMA_ORIGINS=*` and restart it (Windows: `setx OLLAMA_ORIGINS "*"`, then quit and reopen Ollama); in LM Studio enable CORS in the local-server settings.

## Project Structure

| Path | What it is |
|------|------------|
| `index.html` | App shell and markup |
| `styles.css` | Design system — tokens, light/dark themes, all components |
| `data.js` | Days 1–28 (lessons, exercises, validations) and the shop sample database |
| `data-warehouse.js` | The capstone's `raw_*` tables — **generated** by `tools/gen-warehouse.js` |
| `course-dialects.js` | Days 29–31, with inline references and translation targets |
| `course-warehouse.js` | Days 32–39, with inline references and the official model definitions |
| `course-python-basics.js` | Days 40–42 (and the lesson-format notes for the whole Python track) |
| `course-python-data.js` | Days 43–45 — functions, errors, files |
| `course-python-pipelines.js` | Days 46–48 — sqlite3, the pipeline capstone, pandas |
| `course-python-scratch.js` | The Python track — Python from scratch, Python Days 1–8 (`track: 'python'`) |
| `python.js` | Python runtime and grader — starts Pyodide, runs code in a clean namespace and folder, checks output and behaviour |
| `refs.js` | Authored reference answers for Days 1–28 |
| `engine.js` | Result-set validator — grades a query by the *results* it produces |
| `explain.js` | Wrong-answer explainer — diffs a result against the reference and names the mistake |
| `dialect.js` | Structural checker for Snowflake / BigQuery translations |
| `ai.js` | AI provider layer — local OpenAI-compatible server or the Anthropic API |
| `interview-bank.js` | Mock-interview problems, references and follow-up questions |
| `interview.js` | The interview room, scoring and scorecard |
| `app.js` | App engine — SQL runner, grading flow, gamification, navigation, AI tutor |
| `vendor/` | CodeMirror + sql.js, vendored for offline use |
| `vendor/pyodide/` | Pyodide 0.29.5 (CPython 3.13) with sqlite3 and pandas, embedded as base64 — **generated** by `tools/build-pyodide-vendor.js` |
| `tools/load.js` | Shared loader — gives the Node tools the same course the browser gets |
| `tools/verify.js` | Authoritative gate: starters run, every lesson, translation and interview problem self-validates |
| `tools/verify-python.js` | Gate for the Python track: every reference passes, every starter (and an empty editor) does not — on the real interpreter |
| `tools/py-load.js` | Starts the vendored Pyodide under Node for the tools |
| `tools/verify-refs.js` | Focused report of reference coverage / self-validation |
| `tools/engine-test.js` | Checks the validator accepts equivalents / rejects wrong answers |
| `tools/explain-test.js` | Checks each kind of mistake gets the right diagnosis |
| `tools/check-wiring.js` | Static check that markup handlers/ids match the code |
| `tools/gen-warehouse.js` | Seeded generator for `data-warehouse.js` |
| `tools/explore.js` | Scratch: inspect the database or run ad-hoc SQL (`--lesson 36.1` builds that lesson's models first) |

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

A lesson's reference lives either in `refs.js` as `LESSON_REFS[lessonId]`
(Days 1–28) or **inline on the lesson object** (the add-on course files):

- **`refs`** — one or more accepted reference queries; a submission passes if it
  matches **any** of them (open-ended lessons list several valid variants).
- **`setup`** / **`probe`** — for state-changing lessons (DDL, `INSERT`/`UPDATE`,
  upserts, indexes, SCD2). `setup` is an idempotent scaffold run first; `probe`
  is a `SELECT` (e.g. against `sqlite_master` for an index, or the mutated table)
  run **after** the learner's statements. The engine compares the *probe*
  results, so the answer is judged by the database state it produces.
- **`liveSetup: true`** (+ **`models`**) — capstone lessons: the app also runs
  `setup` on the live database when the lesson opens, so the upstream models
  exist while you work; `models` lists them for the schema pills.
- **`requires`** — a structural gate for lessons whose correct answer is
  legitimately empty (a data-quality check) or where the technique is the point,
  so a trivial query can't pass.
- **`accept`** — a structural pass-path for genuinely open-ended capstones whose
  exact result shape can't be pinned down; passes if the key constructs are used.
- **`ordered`** — force row order to matter (or not); otherwise inferred from a
  top-level `ORDER BY` in the reference.
- **`translate`** — dialect lessons: one or two targets, each with `requires` /
  `forbids` regexes and a `model` answer, checked by `dialect.js`.

Days 1–7 without a `refs.js` entry fall back to a derived reference (the
correctly-cased `starter` plus quote-free `solution` variants). `node
tools/verify.js` fails if any lesson lacks a self-validating reference.

### How Python answers are validated

Python lessons (`lang: 'python'`) are graded by `python.js` on the same principle — behaviour, not text:

- **`out: true`** — the printed output must equal what the lesson's `ref` prints (trailing whitespace ignored). A mismatch names the first differing line.
- **`tests`** — Python run after the learner's code, in its namespace, with small helpers: `eq(got, want, what)`, `var(name, want)`, `raises(Exc, f, *args)`, `check(cond, msg)`, and `given({...}, name=value)` which re-runs a script with different starting values so lessons before `def` are still checked on more than one input. The first failed check is the message the learner sees.
- **`files`** / **`db: true`** — a working folder rebuilt before every run, optionally with `shop.db`.
- A step limit stops runaway loops; `input()` and the network are unavailable.

The format is documented at the top of `course-python-basics.js`.

### How wrong answers are explained

`explain.js` re-runs the query and the closest reference, lines the two result
sets up (columns by name, then by the values they hold) and looks for the
patterns behind most wrong SQL: rows missing or extra *and what they have in
common*, duplicated rows from a fan-out, wrong order, missing/extra columns, and
value-level slips (rounding, integer division, a constant factor, NULL vs a
default, case/whitespace, double counting). It describes the **difference** and
never shows the reference query. Practice exercises are explained from their
`validate` rules. With an AI model connected, the same diagnosis is handed to
the tutor as context — but nothing depends on it.

## Contributing

Add lessons in the `curriculum` array in `data.js`, or — for anything new — in a
`course-*.js` file with the reference inline (copy a lesson from
`course-dialects.js`). Sample data lives in `schemas`; gamification config in
`LEVELS` / `ACHIEVEMENTS` / `SKILL_TRACKS` in `app.js`. Give each new exercise a
`_ref` field with a reference solution. A new content file must be added to the
`<script>` tags in `index.html` **and** to `CONTENT_FILES` in `tools/load.js`.
A day belongs to the SQL track unless it sets `track: 'python'`; Python-track days
also set `num` (the day number shown) and use a `day` of 101+ as a unique key —
see `course-python-scratch.js` and the "Tracks" section of `app.js`.
Then run:

```
node tools/verify.js        # authoritative gate — must be 0 errors
node tools/verify-python.js # the Python track's gate (starts Pyodide, ~30 s)
node tools/verify-refs.js   # reference coverage detail
node tools/engine-test.js   # equivalence accepted / wrong answers rejected
node tools/explain-test.js  # each mistake gets the right diagnosis
node tools/check-wiring.js  # markup handlers and ids resolve
```

The harness executes every starter and reference against the seeded database and fails if any lesson lacks a self-validating reference or any exercise validation doesn't hold — so grading can never silently drift from the data.

To change the capstone dataset, edit `tools/gen-warehouse.js` and re-run it
(`node tools/gen-warehouse.js`); it is seeded, so the output is reproducible.
Lesson references recompute from the data, but row counts quoted in lesson text
and exercise `validate` rules do not — `verify.js` will tell you which moved.

### Releasing a new version

The in-app update check compares a baked-in version to `version.json` on `master`. To publish an update, bump **both** in the same commit and push:

- `APP_VERSION` in `app.js`
- `version` (and optional `notes`) in `version.json`

Users on an older copy will then see the update prompt next time they open the app online.
