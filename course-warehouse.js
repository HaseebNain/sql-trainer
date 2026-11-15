// SQL Quest — Capstone: the Plant-Floor Warehouse (Days 32–39).
//
// One project, eight days: take the deliberately messy raw_* tables in
// data-warehouse.js (the "Ridgeline Components" manufacturing dataset) and
// build what a data engineer actually ships — staging models, conformed
// dimensions, fact tables, an incremental load, data-quality tests and KPI
// marts.
//
// How these lessons are wired:
//   • References are INLINE (`refs`, `setup`, `probe`, `requires`, `ordered`),
//     same as course-dialects.js.
//   • Lessons build on each other. `setup` builds the OFFICIAL version of
//     every upstream model (from MODELS below) and drops the lesson's own
//     target, so a mistake on Day 33 can't poison Day 36. With
//     `liveSetup: true` the app runs that same setup on the live database
//     when the lesson opens; `models` lists the pre-built objects to show as
//     schema pills.
//   • State lessons (CREATE VIEW / TABLE, loads) are graded by `probe`.
//
// `node tools/verify.js` replays every setup, starter, reference and exercise.

(function () {
  // ── The official models ────────────────────────────────────────────────
  // Each entry is idempotent (DROP IF EXISTS + CREATE).
  const TYPED_EVENTS = filter => `
    SELECT e.event_id, e.line_code, UPPER(TRIM(e.part_no)) AS part_no,
           CASE p.ts_format
             WHEN 'us_local' THEN datetime(substr(e.event_ts, 7, 4) || '-' || substr(e.event_ts, 1, 2) || '-' || substr(e.event_ts, 4, 2) || ' ' || substr(e.event_ts, 12, 5), (-p.utc_offset_hours) || ' hours')
             ELSE datetime(e.event_ts)
           END AS event_ts_utc,
           e.qty_good, e.qty_scrap, e.loaded_at,
           ROW_NUMBER() OVER (PARTITION BY e.event_id ORDER BY e.loaded_at DESC) AS rn
    FROM raw_production_events e
    JOIN raw_lines l ON l.line_code = e.line_code
    JOIN raw_plants p ON p.plant_code = l.plant_code
    ${filter || ''}`;
  const STAGED_EVENTS = filter => `SELECT event_id, line_code, part_no, event_ts_utc, qty_good, qty_scrap, loaded_at FROM (${TYPED_EVENTS(filter)}) WHERE rn = 1`;
  // Staged events → fact grain (valid rows only, local shift + production date).
  const FACT_SELECT = source => `
    SELECT event_id, line_code, part_no,
           CASE WHEN CAST(strftime('%H', local_ts) AS INTEGER) < 6 THEN date(local_ts, '-1 day') ELSE date(local_ts) END AS production_date,
           CASE WHEN CAST(strftime('%H', local_ts) AS INTEGER) BETWEEN 6 AND 13 THEN 'A'
                WHEN CAST(strftime('%H', local_ts) AS INTEGER) BETWEEN 14 AND 21 THEN 'B'
                ELSE 'C' END AS shift_code,
           event_ts_utc, qty_good, qty_scrap, loaded_at
    FROM (SELECT s.*, datetime(s.event_ts_utc, d.utc_offset_hours || ' hours') AS local_ts
          FROM ${source} s
          JOIN dim_line d ON d.line_code = s.line_code
          WHERE s.qty_good >= 0 AND s.part_no IN (SELECT part_no FROM stg_parts))`;
  const FACT_DDL = `DROP TABLE IF EXISTS fact_production;
    CREATE TABLE fact_production (event_id TEXT PRIMARY KEY, line_code TEXT, part_no TEXT, production_date TEXT, shift_code TEXT, event_ts_utc TEXT, qty_good INTEGER, qty_scrap INTEGER, loaded_at TEXT);`;
  const CUTOFF = '2025-01-13 08:00:00';

  const MODELS = {
    stg_parts: `DROP VIEW IF EXISTS stg_parts;
      CREATE VIEW stg_parts AS
      SELECT UPPER(TRIM(part_no)) AS part_no, description, LOWER(category) AS category, std_cost, unit_weight_kg
      FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(part_no)) ORDER BY (part_no = UPPER(TRIM(part_no))) DESC) AS rn FROM raw_parts)
      WHERE rn = 1;`,
    stg_production_events: `DROP VIEW IF EXISTS stg_production_events;
      CREATE VIEW stg_production_events AS ${STAGED_EVENTS()};`,
    stg_deliveries: `DROP VIEW IF EXISTS stg_deliveries;
      CREATE VIEW stg_deliveries AS
      WITH u AS (
        SELECT *, CASE WHEN UPPER(TRIM(uom)) IN ('KG', 'KGS') THEN 'KG' WHEN UPPER(TRIM(uom)) IN ('LB', 'LBS') THEN 'LB' ELSE 'EA' END AS uom_std
        FROM raw_deliveries)
      SELECT delivery_id, supplier_code, part_no, delivered_at, uom_std AS uom,
             CASE uom_std WHEN 'LB' THEN ROUND(qty * 0.453592, 2) WHEN 'KG' THEN qty END AS qty_kg,
             CASE uom_std WHEN 'LB' THEN ROUND(unit_cost / 0.453592, 4) WHEN 'KG' THEN unit_cost END AS cost_per_kg,
             ROUND(qty * unit_cost, 2) AS total_cost
      FROM u;`,
    stg_defects: `DROP VIEW IF EXISTS stg_defects;
      CREATE VIEW stg_defects AS
      SELECT defect_id, event_id, UPPER(TRIM(defect_code)) AS defect_code, qty, detected_ts FROM raw_defects;`,
    stg_rework: `DROP VIEW IF EXISTS stg_rework;
      CREATE VIEW stg_rework AS
      SELECT rework_id, defect_id, started_at, finished_at,
             CASE WHEN outcome IS NULL THEN 'open' WHEN LOWER(TRIM(outcome)) LIKE 'fix%' THEN 'fixed' ELSE 'scrapped' END AS outcome,
             labor_minutes
      FROM raw_rework;`,
    dim_line: `DROP TABLE IF EXISTS dim_line;
      CREATE TABLE dim_line AS
      SELECT l.line_code, l.line_name, l.process, l.ideal_units_per_shift, p.plant_code, p.plant_name, p.city, p.utc_offset_hours
      FROM raw_lines l JOIN raw_plants p ON p.plant_code = l.plant_code;`,
    dim_date: `DROP TABLE IF EXISTS dim_date;
      CREATE TABLE dim_date AS
      WITH RECURSIVE d(date_key) AS (SELECT '2025-01-01' UNION ALL SELECT date(date_key, '+1 day') FROM d WHERE date_key < '2025-01-31')
      SELECT date_key, CAST(strftime('%w', date_key) AS INTEGER) AS day_of_week,
             CASE WHEN strftime('%w', date_key) IN ('0', '6') THEN 1 ELSE 0 END AS is_weekend,
             date(date_key, '-6 days', 'weekday 1') AS week_start
      FROM d;`,
    dim_supplier: `DROP TABLE IF EXISTS dim_supplier;
      CREATE TABLE dim_supplier AS
      WITH marked AS (
        SELECT *, LAG(supplier_name || '|' || country || '|' || rating || '|' || payment_terms) OVER (PARTITION BY supplier_code ORDER BY snapshot_date) AS prev_sig
        FROM raw_suppliers),
      versions AS (
        SELECT * FROM marked WHERE prev_sig IS NULL OR prev_sig <> supplier_name || '|' || country || '|' || rating || '|' || payment_terms)
      SELECT supplier_code, supplier_name, country, rating, payment_terms,
             snapshot_date AS valid_from,
             LEAD(snapshot_date) OVER (PARTITION BY supplier_code ORDER BY snapshot_date) AS valid_to,
             CASE WHEN LEAD(snapshot_date) OVER (PARTITION BY supplier_code ORDER BY snapshot_date) IS NULL THEN 1 ELSE 0 END AS is_current
      FROM versions;`,
    int_production: `DROP VIEW IF EXISTS int_production;
      CREATE VIEW int_production AS ${FACT_SELECT('stg_production_events')};`,
    fact_production: `${FACT_DDL}
      INSERT INTO fact_production SELECT * FROM int_production;`,
    fact_defects: `DROP TABLE IF EXISTS fact_defects;
      CREATE TABLE fact_defects AS
      SELECT d.defect_id, d.event_id, d.defect_code, d.qty, f.line_code, f.part_no, f.production_date
      FROM stg_defects d
      JOIN fact_production f ON f.event_id = d.event_id
      JOIN raw_defect_codes c ON c.defect_code = d.defect_code;`
  };
  const tidy = sql => sql.replace(/\s*\n\s*/g, ' ').trim();
  const build = (...names) => names.map(n => tidy(MODELS[n])).join(' ');
  const PROD = ['stg_parts', 'stg_production_events', 'dim_line', 'int_production', 'fact_production'];
  const ALL = ['stg_parts', 'stg_production_events', 'stg_deliveries', 'stg_defects', 'stg_rework', 'dim_line', 'dim_date', 'dim_supplier', 'int_production', 'fact_production', 'fact_defects'];

  // Day 37 scenarios.
  const FACT_AS_OF_CUTOFF = tidy(`${build('stg_parts', 'stg_production_events', 'dim_line', 'int_production')} ${FACT_DDL}
    INSERT INTO fact_production ${FACT_SELECT(`(${STAGED_EVENTS(`WHERE e.loaded_at <= '${CUTOFF}'`)})`)};`);
  const FACT_DAMAGED = tidy(`${build(...PROD)}
    UPDATE fact_production SET qty_scrap = 0 WHERE production_date >= '2025-01-13';
    DELETE FROM fact_production WHERE production_date IN ('2025-01-15', '2025-01-18') AND shift_code = 'A';`);

  // Reference SQL reused by more than one lesson.
  const SUPPLIER_SIG = `supplier_name || '|' || country || '|' || rating || '|' || payment_terms`;
  const LOCAL_SHIFT_SQL = `SELECT event_id, local_ts,
       CASE WHEN CAST(strftime('%H', local_ts) AS INTEGER) BETWEEN 6 AND 13 THEN 'A'
            WHEN CAST(strftime('%H', local_ts) AS INTEGER) BETWEEN 14 AND 21 THEN 'B' ELSE 'C' END AS shift_code,
       CASE WHEN CAST(strftime('%H', local_ts) AS INTEGER) < 6 THEN date(local_ts, '-1 day') ELSE date(local_ts) END AS production_date
FROM (SELECT s.event_id, datetime(s.event_ts_utc, d.utc_offset_hours || ' hours') AS local_ts
      FROM stg_production_events s JOIN dim_line d ON d.line_code = s.line_code)`;

  curriculum.push(
  // ═══════════════════════════════════════════════════════════════════════
  {
    day: 32, title: "Capstone I — Meet the Mess", lessons: [
      { id:"32.1", title:"The Brief", concept:"Profiling",
        theory:`<p><strong>Welcome to Ridgeline Components.</strong> Three plants — Reno (stamping &amp; weld), Boise (casting &amp; machining), Austin (assembly &amp; paint) — six production lines, two weeks of data. Each plant's MES dumps into <code>raw_*</code> tables every night at 08:00 UTC. Nobody has ever cleaned any of it.</p><p>The VP of Operations wants one thing: <em>"Which line is making scrap, and is it getting worse?"</em> Over the next eight days you'll build the warehouse that answers it, the way it's done on the job:</p><p><code>raw_*</code> → <strong>staging</strong> (clean, typed, de-duplicated) → <strong>dimensions &amp; facts</strong> (modeled) → <strong>marts</strong> (KPIs), with an incremental load and data-quality tests along the way.</p><p>Rule one of data engineering: <strong>never trust a source you haven't profiled.</strong> Every table here has something wrong with it — on purpose. Start with the basics: how much data is there?</p>`,
        chips:[{t:"raw → staging → marts",c:"chip-purple"},{t:"profiling",c:"chip-cyan"},{t:"UNION ALL",c:"chip-blue"}],
        task:"Build a one-query inventory of the four big raw tables: table_name and row_count for raw_production_events, raw_defects, raw_rework and raw_deliveries (4 rows).",
        starter:"-- One SELECT per table, stacked with UNION ALL\nSELECT 'raw_production_events' AS table_name, COUNT(*) AS row_count\nFROM raw_production_events;\n",
        hint:"… UNION ALL SELECT 'raw_defects', COUNT(*) FROM raw_defects UNION ALL SELECT 'raw_rework', COUNT(*) FROM raw_rework UNION ALL SELECT 'raw_deliveries', COUNT(*) FROM raw_deliveries;", xp:40,
        tables:["raw_production_events","raw_defects","raw_rework","raw_deliveries","raw_lines","raw_plants"],
        refs:["SELECT 'raw_production_events' AS table_name, COUNT(*) AS row_count FROM raw_production_events UNION ALL SELECT 'raw_defects', COUNT(*) FROM raw_defects UNION ALL SELECT 'raw_rework', COUNT(*) FROM raw_rework UNION ALL SELECT 'raw_deliveries', COUNT(*) FROM raw_deliveries"],
        exercises:[
          { id:"32.1.e1", prompt:"Profile raw_production_events in one row: total_rows, distinct_events (distinct event_id), first_load and last_load (min / max loaded_at).",
            validate:{ rowCount:1, hasCols:["total_rows","distinct_events"], hasValue:164 },
            _ref:"SELECT COUNT(*) AS total_rows, COUNT(DISTINCT event_id) AS distinct_events, MIN(loaded_at) AS first_load, MAX(loaded_at) AS last_load FROM raw_production_events;",
            hint:"COUNT(*), COUNT(DISTINCT event_id), MIN(loaded_at), MAX(loaded_at) — if the first two differ, there are duplicates", xp:12 }
        ] },

      { id:"32.2", title:"Grain Check — Find the Duplicates", concept:"Grain",
        theory:`<p>The <strong>grain</strong> of a table is what one row means. <code>raw_production_events</code> is supposed to be <em>one row per production run</em>, identified by <code>event_id</code>. You just saw 177 rows but only 164 distinct ids — the grain is broken.</p><p>The test for any claimed key is always the same shape:</p><pre class="theory-code">SELECT key, COUNT(*) FROM t GROUP BY key HAVING COUNT(*) &gt; 1;</pre><p>Zero rows means the key is unique. Here it isn't, and there are two different reasons hiding in the result — a plant <em>re-sending</em> the identical row a day later, and a plant sending a <em>correction</em> with different quantities. They need the same fix (keep the newest), but you should know which you have before you choose it.</p>`,
        chips:[{t:"grain",c:"chip-purple"},{t:"GROUP BY … HAVING",c:"chip-blue"},{t:"re-sends vs corrections",c:"chip-amber"}],
        task:"List every event_id that appears more than once in raw_production_events, with copies — how many times it appears (13 rows).",
        starter:"-- The uniqueness test: group by the claimed key, keep groups with more than one row\nSELECT event_id, COUNT(*) AS copies\nFROM raw_production_events\nGROUP BY event_id;\n",
        hint:"Add HAVING COUNT(*) > 1 after the GROUP BY.", xp:40, tables:["raw_production_events"],
        refs:["SELECT event_id, COUNT(*) AS copies FROM raw_production_events GROUP BY event_id HAVING COUNT(*) > 1"],
        exercises:[
          { id:"32.2.e1", prompt:"Split the duplicated ids by cause: kind ('correction' when the copies disagree on qty_scrap, otherwise 're-send') and events (how many ids of that kind).",
            validate:{ rowCount:2, hasCols:["kind","events"], hasValue:"correction" },
            _ref:"WITH d AS (SELECT event_id, COUNT(DISTINCT qty_scrap) AS versions FROM raw_production_events GROUP BY event_id HAVING COUNT(*) > 1) SELECT CASE WHEN versions > 1 THEN 'correction' ELSE 're-send' END AS kind, COUNT(*) AS events FROM d GROUP BY 1;",
            hint:"In a CTE keep the duplicated ids with COUNT(DISTINCT qty_scrap) AS versions; then CASE WHEN versions > 1 THEN 'correction' ELSE 're-send' END and count.", xp:15 }
        ] },

      { id:"32.3", title:"Three Plants, Three Clocks", concept:"Timestamp Formats",
        theory:`<p>Look at <code>event_ts</code> from each plant:</p><pre class="theory-code">RNO   2025-01-06T13:45:00-08:00    ISO-8601, local time with a UTC offset
BOI   2025-01-06T20:53:00Z         ISO-8601, already UTC
AUS   01/06/2025 13:42             US format, local time, no zone at all</pre><p>All three are "the same column". Compare them as strings and Austin's January sorts before everyone's; treat them all as UTC and Reno's day shift lands on the wrong shift. This is the most common silent bug in multi-site data.</p><p>Before writing a parser, <strong>profile the shapes</strong> with pattern matching — if a fourth format exists, you want to find it now, not in a dashboard. (<code>raw_plants.ts_format</code> documents what each plant <em>claims</em> to send; here you check what actually arrived.)</p>`,
        chips:[{t:"LIKE patterns",c:"chip-blue"},{t:"time zones",c:"chip-amber"},{t:"profile before parsing",c:"chip-cyan"}],
        task:"Classify every raw event's event_ts by shape and count per plant: plant_code, ts_shape and events. Use 'utc' for values ending in Z, 'us_local' for values containing a slash, and 'offset' for the rest (3 rows).",
        starter:"-- raw_lines tells you which plant a line belongs to\nSELECT l.plant_code, e.event_ts\nFROM raw_production_events e\nJOIN raw_lines l ON l.line_code = e.line_code\nLIMIT 12;\n",
        hint:"SELECT l.plant_code, CASE WHEN e.event_ts LIKE '%Z' THEN 'utc' WHEN e.event_ts LIKE '%/%' THEN 'us_local' ELSE 'offset' END AS ts_shape, COUNT(*) AS events FROM raw_production_events e JOIN raw_lines l ON l.line_code = e.line_code GROUP BY 1, 2;", xp:45,
        tables:["raw_production_events","raw_lines","raw_plants"],
        refs:["SELECT l.plant_code, CASE WHEN e.event_ts LIKE '%Z' THEN 'utc' WHEN e.event_ts LIKE '%/%' THEN 'us_local' ELSE 'offset' END AS ts_shape, COUNT(*) AS events FROM raw_production_events e JOIN raw_lines l ON l.line_code = e.line_code GROUP BY 1, 2"],
        exercises:[
          { id:"32.3.e1", prompt:"Same idea for keys: how many raw event rows carry a part_no that isn't already clean — different from UPPER(TRIM(part_no))? Return one number as dirty_rows.",
            validate:{ rowCount:1, hasCol:"dirty_rows", hasValue:9 },
            _ref:"SELECT COUNT(*) AS dirty_rows FROM raw_production_events WHERE part_no <> UPPER(TRIM(part_no));",
            hint:"WHERE part_no <> UPPER(TRIM(part_no))", xp:12 }
        ] },

      { id:"32.4", title:"Orphans — Integrity by Hand", concept:"Referential Integrity",
        theory:`<p>Snowflake and BigQuery let you <em>declare</em> foreign keys but don't <em>enforce</em> them. Nothing stops a defect from pointing at an event that never arrived. So the warehouse engineer checks referential integrity with a query — the <strong>anti-join</strong> you met on Day 11:</p><pre class="theory-code">SELECT child.*
FROM child
LEFT JOIN parent ON parent.key = child.key
WHERE parent.key IS NULL;</pre><p><code>NOT EXISTS</code> works equally well. Avoid <code>NOT IN (subquery)</code>: if the subquery returns a single NULL, it matches nothing and your test "passes" forever.</p><p>Orphans aren't always errors — the parent may simply be late. Either way they must not flow silently into a fact table, because an inner join downstream will drop them and your scrap totals will quietly stop adding up.</p>`,
        chips:[{t:"anti-join",c:"chip-purple"},{t:"NOT EXISTS",c:"chip-blue"},{t:"NOT IN + NULL trap",c:"chip-amber"}],
        task:"Find the defect rows whose event_id doesn't exist in raw_production_events: defect_id and event_id (6 rows).",
        starter:"-- Children without a parent\nSELECT d.defect_id, d.event_id\nFROM raw_defects d\nLIMIT 10;\n",
        hint:"SELECT d.defect_id, d.event_id FROM raw_defects d WHERE NOT EXISTS (SELECT 1 FROM raw_production_events e WHERE e.event_id = d.event_id);", xp:45,
        tables:["raw_defects","raw_production_events","raw_rework","raw_deliveries","raw_suppliers"],
        refs:["SELECT d.defect_id, d.event_id FROM raw_defects d WHERE NOT EXISTS (SELECT 1 FROM raw_production_events e WHERE e.event_id = d.event_id)"],
        exercises:[
          { id:"32.4.e1", prompt:"One level down: rework rows that point at a defect_id that doesn't exist in raw_defects — rework_id and defect_id.",
            validate:{ rowCount:3, hasCols:["rework_id","defect_id"] },
            _ref:"SELECT r.rework_id, r.defect_id FROM raw_rework r LEFT JOIN raw_defects d ON d.defect_id = r.defect_id WHERE d.defect_id IS NULL;",
            hint:"raw_rework LEFT JOIN raw_defects … WHERE d.defect_id IS NULL", xp:12 },
          { id:"32.4.e2", prompt:"And purchasing: deliveries booked to a supplier_code that appears in no raw_suppliers snapshot — delivery_id and supplier_code.",
            validate:{ rowCount:3, hasCols:["delivery_id","supplier_code"], hasValue:"SUP-999" },
            _ref:"SELECT delivery_id, supplier_code FROM raw_deliveries d WHERE NOT EXISTS (SELECT 1 FROM raw_suppliers s WHERE s.supplier_code = d.supplier_code);",
            hint:"NOT EXISTS (SELECT 1 FROM raw_suppliers s WHERE s.supplier_code = d.supplier_code)", xp:12 }
        ] }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    day: 33, title: "Capstone II — Staging: Clean & Conform", lessons: [
      { id:"33.1", title:"stg_parts — Conform the Keys", concept:"Staging Model",
        liveSetup:true, setup:"DROP VIEW IF EXISTS stg_parts;",
        probe:"SELECT part_no, description, category, std_cost, unit_weight_kg FROM stg_parts ORDER BY part_no",
        theory:`<p>A <strong>staging model</strong> is a 1-to-1 cleanup of one source table: rename, cast, trim, de-duplicate — and <em>nothing else</em>. No joins to other sources, no business logic. Everything downstream reads staging, never raw, so each mess is fixed exactly once.</p><p><code>raw_parts</code> is a hand-maintained master list. Its key has stray spaces and mixed case (<code>' brk-1001'</code>, <code>'CST-3001 '</code>), so the "same" part appears twice and won't join to anything. The fix has two halves:</p><p><strong>Conform the key</strong> — <code>UPPER(TRIM(part_no))</code> — then <strong>de-duplicate on the conformed key</strong>, choosing a winner deterministically. <code>ROW_NUMBER()</code> with an <code>ORDER BY</code> that states your preference is the standard tool: never rely on whichever row the engine happens to return first.</p><p>Staging models are usually <strong>views</strong>: always current, no storage, nothing to schedule.</p>`,
        chips:[{t:"CREATE VIEW stg_…",c:"chip-blue"},{t:"UPPER(TRIM(key))",c:"chip-cyan"},{t:"ROW_NUMBER() dedupe",c:"chip-purple"}],
        task:"Create the view stg_parts with one row per part: part_no (trimmed and upper-cased), description, category (lower-cased), std_cost, unit_weight_kg. Two parts appear twice in raw_parts — keep the entry whose raw part_no was already clean. 17 rows.",
        starter:"DROP VIEW IF EXISTS stg_parts;\n\n-- CREATE VIEW stg_parts AS\n-- SELECT UPPER(TRIM(part_no)) AS part_no, description, LOWER(category) AS category, std_cost, unit_weight_kg\n-- FROM (\n--   SELECT *, ROW_NUMBER() OVER (\n--            PARTITION BY UPPER(TRIM(part_no))\n--            ORDER BY (part_no = UPPER(TRIM(part_no))) DESC   -- already-clean entry first\n--          ) AS rn\n--   FROM raw_parts\n-- )\n-- WHERE rn = 1;\n\n-- Look at the mess first:\nSELECT part_no, UPPER(TRIM(part_no)) AS clean_key, description, category\nFROM raw_parts\nORDER BY clean_key;\n",
        hint:"Un-comment the CREATE VIEW block — it is the answer. The ORDER BY inside ROW_NUMBER() puts the already-clean entry first; WHERE rn = 1 keeps it.", xp:50, tables:["raw_parts"],
        refs:["CREATE VIEW stg_parts AS SELECT UPPER(TRIM(part_no)) AS part_no, description, LOWER(category) AS category, std_cost, unit_weight_kg FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(part_no)) ORDER BY (part_no = UPPER(TRIM(part_no))) DESC) AS rn FROM raw_parts) WHERE rn = 1"],
        exercises:[
          { id:"33.1.e1", prompt:"How inconsistent is category? List every distinct raw spelling in raw_parts with its row count (category, n).",
            validate:{ rowCount:6, hasCols:["category","n"] },
            _ref:"SELECT category, COUNT(*) AS n FROM raw_parts GROUP BY category;",
            hint:"GROUP BY category — SQLite's GROUP BY is case-sensitive, so each spelling is its own group", xp:10 }
        ] },

      { id:"33.2", title:"Normalizing Time — Everything to UTC", concept:"Timestamps",
        theory:`<p>The rule that saves you: <strong>store UTC, convert at the edge.</strong> Staging turns every timestamp into one canonical UTC value; reports convert to local time only when a human needs it.</p><p>SQLite's <code>datetime()</code> already understands ISO-8601 with a zone — <code>datetime('2025-01-06T13:45:00-08:00')</code> returns <code>2025-01-06 21:45:00</code>, and a trailing <code>Z</code> is taken as UTC. So Reno and Boise parse for free.</p><p>Austin sends <code>MM/DD/YYYY HH:MM</code> in local time with no zone. Two steps: rebuild an ISO string with <code>substr()</code>, then shift it to UTC using the plant's offset from <code>raw_plants</code>. Austin is UTC−6, so local → UTC means <em>adding</em> 6 hours:</p><pre class="theory-code">datetime('2025-01-06 13:42', '+6 hours')        -- → 2025-01-06 19:42:00
datetime(iso_string, (-utc_offset_hours) || ' hours')</pre><p>(A real pipeline would use the IANA zone, <code>America/Chicago</code>, because offsets change with daylight saving. This dataset sits entirely in winter, so a fixed offset is exact.)</p>`,
        chips:[{t:"store UTC",c:"chip-green"},{t:"datetime() + modifier",c:"chip-blue"},{t:"substr() rebuild",c:"chip-cyan"}],
        task:"Return event_id and event_ts_utc ('YYYY-MM-DD HH:MM:SS', UTC) for every row of raw_production_events (177 rows). Reno and Boise parse directly with datetime(); rebuild Austin's 'us_local' values with substr() and shift them by the plant's utc_offset_hours.",
        starter:"-- p.ts_format says how each plant writes time: 'iso_offset', 'iso_utc' or 'us_local'\nSELECT e.event_id, p.ts_format, e.event_ts,\n       datetime(e.event_ts) AS parsed            -- NULL for Austin: fix with a CASE\nFROM raw_production_events e\nJOIN raw_lines l  ON l.line_code  = e.line_code\nJOIN raw_plants p ON p.plant_code = l.plant_code;\n\n-- Austin 'MM/DD/YYYY HH:MM' → ISO:\n--   substr(ts, 7, 4) || '-' || substr(ts, 1, 2) || '-' || substr(ts, 4, 2) || ' ' || substr(ts, 12, 5)\n",
        hint:"SELECT e.event_id, CASE p.ts_format WHEN 'us_local' THEN datetime(substr(e.event_ts, 7, 4) || '-' || substr(e.event_ts, 1, 2) || '-' || substr(e.event_ts, 4, 2) || ' ' || substr(e.event_ts, 12, 5), (-p.utc_offset_hours) || ' hours') ELSE datetime(e.event_ts) END AS event_ts_utc FROM raw_production_events e JOIN raw_lines l ON l.line_code = e.line_code JOIN raw_plants p ON p.plant_code = l.plant_code;", xp:60,
        tables:["raw_production_events","raw_lines","raw_plants"],
        refs:["SELECT e.event_id, CASE p.ts_format WHEN 'us_local' THEN datetime(substr(e.event_ts, 7, 4) || '-' || substr(e.event_ts, 1, 2) || '-' || substr(e.event_ts, 4, 2) || ' ' || substr(e.event_ts, 12, 5), (-p.utc_offset_hours) || ' hours') ELSE datetime(e.event_ts) END AS event_ts_utc FROM raw_production_events e JOIN raw_lines l ON l.line_code = e.line_code JOIN raw_plants p ON p.plant_code = l.plant_code"],
        exercises:[
          { id:"33.2.e1", prompt:"Prove the offset matters: for Reno's line RNO-L1, how many raw rows fall on a different calendar date in UTC than in the local time they were written in? Return one number as shifted_rows.",
            validate:{ rowCount:1, hasCol:"shifted_rows" },
            _ref:"SELECT COUNT(*) AS shifted_rows FROM raw_production_events WHERE line_code = 'RNO-L1' AND date(event_ts) <> substr(event_ts, 1, 10);",
            hint:"date(event_ts) is the UTC date; substr(event_ts, 1, 10) is the local date as written. Count where they differ.", xp:15 }
        ] },

      { id:"33.3", title:"Dedupe — Latest Version Wins", concept:"Deduplication",
        liveSetup:true, setup:"DROP VIEW IF EXISTS stg_production_events;",
        probe:"SELECT event_id, line_code, part_no, event_ts_utc, qty_good, qty_scrap, loaded_at FROM stg_production_events ORDER BY event_id",
        theory:`<p>On Day 32 you found 13 event ids that arrive twice — identical re-sends and genuine corrections. One rule handles both: <strong>for each key, keep the row that was loaded last.</strong></p><pre class="theory-code">ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY loaded_at DESC) AS rn   …   WHERE rn = 1</pre><p>This is the single most-written pattern in analytics engineering (in a warehouse it's the <code>QUALIFY</code> one-liner from Day 29). Three details separate a correct version from a subtly wrong one:</p><p>• <code>DISTINCT</code> can't do it — a correction differs in its quantities, so both versions survive.<br>• <code>GROUP BY event_id</code> with <code>MAX(qty_scrap)</code> invents rows that never existed.<br>• The <code>ORDER BY</code> must be a <em>tiebreaker you trust</em> — the load timestamp, never "whatever comes first".</p><p>The starter already holds the cleanup from the last two lessons (clean part numbers, UTC timestamps). Add the dedupe and wrap it in a view.</p>`,
        chips:[{t:"PARTITION BY key",c:"chip-purple"},{t:"ORDER BY loaded_at DESC",c:"chip-blue"},{t:"rn = 1",c:"chip-green"}],
        task:"Create the view stg_production_events — one row per event_id (the most recently loaded version) with columns event_id, line_code, part_no (clean), event_ts_utc, qty_good, qty_scrap, loaded_at. 164 rows.",
        starter:"DROP VIEW IF EXISTS stg_production_events;\n\n-- 1. Add ROW_NUMBER() to `typed`, 2. keep rn = 1, 3. wrap it all in CREATE VIEW stg_production_events AS …\nWITH typed AS (\n  SELECT e.event_id, e.line_code, UPPER(TRIM(e.part_no)) AS part_no,\n         CASE p.ts_format\n           WHEN 'us_local' THEN datetime(substr(e.event_ts, 7, 4) || '-' || substr(e.event_ts, 1, 2) || '-' || substr(e.event_ts, 4, 2) || ' ' || substr(e.event_ts, 12, 5), (-p.utc_offset_hours) || ' hours')\n           ELSE datetime(e.event_ts)\n         END AS event_ts_utc,\n         e.qty_good, e.qty_scrap, e.loaded_at\n  FROM raw_production_events e\n  JOIN raw_lines l  ON l.line_code  = e.line_code\n  JOIN raw_plants p ON p.plant_code = l.plant_code\n)\nSELECT event_id, line_code, part_no, event_ts_utc, qty_good, qty_scrap, loaded_at\nFROM typed;      -- 177 rows today; should be 164\n",
        hint:"Inside typed add: ROW_NUMBER() OVER (PARTITION BY e.event_id ORDER BY e.loaded_at DESC) AS rn. Then … FROM typed WHERE rn = 1, with CREATE VIEW stg_production_events AS in front of the WITH.", xp:60,
        tables:["raw_production_events","raw_lines","raw_plants"],
        refs:[`CREATE VIEW stg_production_events AS ${tidy(STAGED_EVENTS())}`],
        exercises:[
          { id:"33.3.e1", prompt:"See a correction with your own eyes: both raw versions of event EV-001010 — loaded_at, qty_good, qty_scrap — oldest first.",
            validate:{ rowCount:2, hasCols:["loaded_at","qty_good","qty_scrap"], firstVal:"2025-01-08 08:00:00" },
            _ref:"SELECT loaded_at, qty_good, qty_scrap FROM raw_production_events WHERE event_id = 'EV-001010' ORDER BY loaded_at;",
            hint:"WHERE event_id = 'EV-001010' ORDER BY loaded_at — the plant first reported 9 scrapped, then corrected it", xp:10 }
        ] }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    day: 34, title: "Capstone III — Units, Codes & Quarantine", lessons: [
      { id:"34.1", title:"Spot the Unit Mix-Up", concept:"Unit of Measure",
        theory:`<p>Purchasing wants to know who sells aluminum ingot cheapest. Someone already ran <code>AVG(unit_cost)</code> by supplier and concluded Cascade Alloys is less than half the price of Great Basin Metals. A contract is about to be signed on that number.</p><p>Before you believe any average, look at what's being averaged. <code>unit_cost</code> is a price <em>per unit</em> — and <code>raw_deliveries</code> has a <code>uom</code> column that nobody grouped by.</p><p>Unit mix-ups are the classic catastrophic data bug precisely because nothing fails: the query runs, the numbers are plausible, the chart looks great. The defence is a habit — <strong>whenever a measure has a unit column next to it, group by the unit first.</strong></p>`,
        chips:[{t:"units of measure",c:"chip-amber"},{t:"GROUP BY the unit",c:"chip-blue"},{t:"profile before averaging",c:"chip-cyan"}],
        task:"For aluminum ingot (part_no 'MAT-ALU-01') show what's really being compared: supplier_code, uom (upper-cased), deliveries (count) and avg_unit_cost (rounded to 2 decimals), one row per supplier and upper-cased unit (4 rows).",
        starter:"-- The misleading version: one average per supplier, units ignored\nSELECT supplier_code, COUNT(*) AS deliveries, ROUND(AVG(unit_cost), 2) AS avg_unit_cost\nFROM raw_deliveries\nWHERE part_no = 'MAT-ALU-01'\nGROUP BY supplier_code;\n",
        hint:"Add UPPER(uom) AS uom to the SELECT and to the GROUP BY: GROUP BY supplier_code, UPPER(uom)", xp:45, tables:["raw_deliveries","raw_suppliers"],
        refs:["SELECT supplier_code, UPPER(uom) AS uom, COUNT(*) AS deliveries, ROUND(AVG(unit_cost), 2) AS avg_unit_cost FROM raw_deliveries WHERE part_no = 'MAT-ALU-01' GROUP BY supplier_code, UPPER(uom)"],
        exercises:[
          { id:"34.1.e1", prompt:"How many ways can you spell three units? List every distinct raw uom value in raw_deliveries with its row count (uom, n).",
            validate:{ rowCount:8, hasCols:["uom","n"] },
            _ref:"SELECT uom, COUNT(*) AS n FROM raw_deliveries GROUP BY uom;",
            hint:"GROUP BY uom — no UPPER this time, you want to see the mess", xp:10 }
        ] },

      { id:"34.2", title:"stg_deliveries — One Unit of Measure", concept:"Unit Conversion",
        liveSetup:true, setup:"DROP VIEW IF EXISTS stg_deliveries;",
        probe:"SELECT delivery_id, supplier_code, part_no, delivered_at, uom, qty_kg, cost_per_kg, total_cost FROM stg_deliveries ORDER BY delivery_id",
        theory:`<p>Cascade Alloys ships and bills in <strong>pounds</strong>; everyone else uses kilograms. A price per pound will always look ~2.2× cheaper than the same price per kilogram.</p><p>Staging is where units get conformed — once — so no analyst ever has to remember. Three steps:</p><p><strong>1. Standardize the label.</strong> <code>'kg'</code>, <code>'Kg'</code>, <code>'KGS'</code> are one unit. Map every spelling to a small fixed set.<br><strong>2. Convert the quantity</strong> to the canonical unit: 1 lb = 0.453592 kg.<br><strong>3. Convert the rate the other way.</strong> A <em>per-unit</em> price divides: $/lb ÷ 0.453592 = $/kg. Getting this direction wrong is the second-most-common unit bug.</p><p>Keep one number that's immune to all of it — <code>total_cost = qty × unit_cost</code> is the same in any unit, which makes it a built-in cross-check. Components counted in <code>EA</code> (each) have no weight: leave their kg columns <code>NULL</code> rather than inventing a number.</p>`,
        chips:[{t:"standardize labels",c:"chip-cyan"},{t:"lb × 0.453592",c:"chip-blue"},{t:"$/lb ÷ 0.453592",c:"chip-amber"}],
        task:"Create the view stg_deliveries: delivery_id, supplier_code, part_no, delivered_at, uom (standardized to 'KG', 'LB' or 'EA'), qty_kg (LB rows: ROUND(qty * 0.453592, 2); KG rows: qty; EA rows: NULL), cost_per_kg (LB rows: ROUND(unit_cost / 0.453592, 4); KG rows: unit_cost; EA rows: NULL) and total_cost (ROUND(qty * unit_cost, 2)). 54 rows.",
        starter:"DROP VIEW IF EXISTS stg_deliveries;\n\n-- Step 1 is done: uom_std maps every spelling to KG / LB / EA.\n-- Finish the SELECT, then wrap everything in CREATE VIEW stg_deliveries AS …\nWITH u AS (\n  SELECT *,\n         CASE WHEN UPPER(TRIM(uom)) IN ('KG', 'KGS') THEN 'KG'\n              WHEN UPPER(TRIM(uom)) IN ('LB', 'LBS') THEN 'LB'\n              ELSE 'EA' END AS uom_std\n  FROM raw_deliveries\n)\nSELECT delivery_id, supplier_code, part_no, delivered_at, uom_std AS uom,\n       qty, unit_cost            -- → qty_kg, cost_per_kg, total_cost\nFROM u;\n",
        hint:"qty_kg: CASE uom_std WHEN 'LB' THEN ROUND(qty * 0.453592, 2) WHEN 'KG' THEN qty END. cost_per_kg: CASE uom_std WHEN 'LB' THEN ROUND(unit_cost / 0.453592, 4) WHEN 'KG' THEN unit_cost END. total_cost: ROUND(qty * unit_cost, 2). A CASE with no ELSE returns NULL — exactly right for EA.", xp:65,
        tables:["raw_deliveries"],
        refs:["CREATE VIEW stg_deliveries AS WITH u AS (SELECT *, CASE WHEN UPPER(TRIM(uom)) IN ('KG', 'KGS') THEN 'KG' WHEN UPPER(TRIM(uom)) IN ('LB', 'LBS') THEN 'LB' ELSE 'EA' END AS uom_std FROM raw_deliveries) SELECT delivery_id, supplier_code, part_no, delivered_at, uom_std AS uom, CASE uom_std WHEN 'LB' THEN ROUND(qty * 0.453592, 2) WHEN 'KG' THEN qty END AS qty_kg, CASE uom_std WHEN 'LB' THEN ROUND(unit_cost / 0.453592, 4) WHEN 'KG' THEN unit_cost END AS cost_per_kg, ROUND(qty * unit_cost, 2) AS total_cost FROM u"],
        exercises:[
          { id:"34.2.e1", prompt:"The honest comparison, straight from raw: for SUP-001 and SUP-003, the true aluminum price in $/kg — total dollars ÷ total kilograms, rounded to 3 decimals — as supplier_code and cost_per_kg.",
            validate:{ rowCount:2, hasCols:["supplier_code","cost_per_kg"], allLt:{ col:"cost_per_kg", val:3 }, allGt:{ col:"cost_per_kg", val:2.5 } },
            _ref:"SELECT supplier_code, ROUND(SUM(qty * unit_cost) / SUM(CASE WHEN UPPER(TRIM(uom)) IN ('LB', 'LBS') THEN qty * 0.453592 ELSE qty END), 3) AS cost_per_kg FROM raw_deliveries WHERE part_no = 'MAT-ALU-01' AND supplier_code IN ('SUP-001', 'SUP-003') GROUP BY supplier_code;",
            hint:"SUM(qty * unit_cost) / SUM(CASE WHEN UPPER(TRIM(uom)) IN ('LB','LBS') THEN qty * 0.453592 ELSE qty END). The '2× cheaper' supplier turns out to be about 4% cheaper.", xp:18 }
        ] },

      { id:"34.3", title:"Quarantine — Don't Drop, Don't Pass", concept:"Quarantine Pattern",
        liveSetup:true, models:["stg_production_events","stg_defects"],
        setup:`${build('stg_production_events', 'stg_defects')} DROP TABLE IF EXISTS quarantine_defects;`,
        probe:"SELECT defect_id, event_id, defect_code, reason FROM quarantine_defects ORDER BY defect_id",
        theory:`<p>You know some defect rows are bad: six point at events that don't exist, two carry a defect code (<code>D-999</code>) that's in no code list. What should the pipeline <em>do</em> with them?</p><p><strong>Passing them through</strong> corrupts every downstream join. <strong>Dropping them silently</strong> is worse — the scrap numbers stop reconciling and nobody can say why. The professional answer is a third path: <strong>quarantine.</strong> Bad rows go to their own table with a <code>reason</code>; good rows continue. Then</p><pre class="theory-code">raw rows  =  rows that continue  +  rows in quarantine</pre><p>always holds, someone can review the quarantine each morning, and when the missing parent finally arrives the row can be released.</p><p>Pre-built for you: <code>stg_production_events</code> (yesterday's work) and <code>stg_defects</code> — <code>raw_defects</code> with <code>defect_code</code> trimmed and upper-cased, nothing removed.</p>`,
        chips:[{t:"quarantine table",c:"chip-amber"},{t:"reason column",c:"chip-purple"},{t:"reconcile counts",c:"chip-green"}],
        task:"Create the table quarantine_defects from stg_defects with defect_id, event_id, defect_code and reason — 'orphan_event' when the event_id isn't in stg_production_events, otherwise 'unknown_code' when the defect_code isn't in raw_defect_codes. Only the bad rows: 8 of them.",
        starter:"DROP TABLE IF EXISTS quarantine_defects;\n\n-- LEFT JOIN both parents; a NULL on either side is a reason to quarantine.\n-- CREATE TABLE quarantine_defects AS\nSELECT d.defect_id, d.event_id, d.defect_code,\n       e.event_id    AS matched_event,\n       c.defect_code AS matched_code\nFROM stg_defects d\nLEFT JOIN stg_production_events e ON e.event_id   = d.event_id\nLEFT JOIN raw_defect_codes c      ON c.defect_code = d.defect_code\nLIMIT 20;\n",
        hint:"CREATE TABLE quarantine_defects AS SELECT d.defect_id, d.event_id, d.defect_code, CASE WHEN e.event_id IS NULL THEN 'orphan_event' ELSE 'unknown_code' END AS reason FROM stg_defects d LEFT JOIN stg_production_events e ON e.event_id = d.event_id LEFT JOIN raw_defect_codes c ON c.defect_code = d.defect_code WHERE e.event_id IS NULL OR c.defect_code IS NULL;", xp:60,
        tables:["raw_defects","raw_defect_codes"],
        refs:["CREATE TABLE quarantine_defects AS SELECT d.defect_id, d.event_id, d.defect_code, CASE WHEN e.event_id IS NULL THEN 'orphan_event' ELSE 'unknown_code' END AS reason FROM stg_defects d LEFT JOIN stg_production_events e ON e.event_id = d.event_id LEFT JOIN raw_defect_codes c ON c.defect_code = d.defect_code WHERE e.event_id IS NULL OR c.defect_code IS NULL"],
        exercises:[
          { id:"34.3.e1", prompt:"Reconcile it: bucket every stg_defects row as 'ok', 'orphan_event' or 'unknown_code' and count them (bucket, defects). The three counts must add up to the 296 raw rows.",
            validate:{ rowCount:3, hasCols:["bucket","defects"], hasValue:288 },
            _ref:"SELECT CASE WHEN e.event_id IS NULL THEN 'orphan_event' WHEN c.defect_code IS NULL THEN 'unknown_code' ELSE 'ok' END AS bucket, COUNT(*) AS defects FROM stg_defects d LEFT JOIN stg_production_events e ON e.event_id = d.event_id LEFT JOIN raw_defect_codes c ON c.defect_code = d.defect_code GROUP BY 1;",
            hint:"Same two LEFT JOINs, no WHERE; CASE … ELSE 'ok' END AS bucket, then GROUP BY it", xp:15 }
        ] }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    day: 35, title: "Capstone IV — Dimensions", lessons: [
      { id:"35.1", title:"dim_line — Flatten the Hierarchy", concept:"Dimension Table",
        liveSetup:true, setup:"DROP TABLE IF EXISTS dim_line;",
        probe:"SELECT line_code, line_name, process, ideal_units_per_shift, plant_code, plant_name, city, utc_offset_hours FROM dim_line ORDER BY line_code",
        theory:`<p>Staging is done; now you <strong>model</strong>. Dimensions are the <em>nouns</em> of the business — lines, parts, suppliers, dates — and they're built <strong>wide and denormalized</strong> on purpose.</p><p>The source system keeps lines and plants in separate tables (normalized: good for writing). The warehouse flattens the hierarchy so every line row already carries its plant, city and time zone (denormalized: good for reading). An analyst slicing scrap by plant then needs one join, not two, and can't get the second one wrong.</p><p>This is the star schema from Day 24 at production scale: a fact in the middle, one join out to each dimension, no chains. The first dimension is a gentle one — the rest of today is not.</p>`,
        chips:[{t:"dimension",c:"chip-purple"},{t:"denormalize",c:"chip-cyan"},{t:"star schema",c:"chip-blue"}],
        task:"Create the table dim_line: one row per line with line_code, line_name, process, ideal_units_per_shift and its plant's plant_code, plant_name, city and utc_offset_hours (6 rows).",
        starter:"DROP TABLE IF EXISTS dim_line;\n\n-- CREATE TABLE dim_line AS\nSELECT l.*, p.*\nFROM raw_lines l\nJOIN raw_plants p ON p.plant_code = l.plant_code;\n",
        hint:"CREATE TABLE dim_line AS SELECT l.line_code, l.line_name, l.process, l.ideal_units_per_shift, p.plant_code, p.plant_name, p.city, p.utc_offset_hours FROM raw_lines l JOIN raw_plants p ON p.plant_code = l.plant_code;", xp:40,
        tables:["raw_lines","raw_plants"],
        refs:["CREATE TABLE dim_line AS SELECT l.line_code, l.line_name, l.process, l.ideal_units_per_shift, p.plant_code, p.plant_name, p.city, p.utc_offset_hours FROM raw_lines l JOIN raw_plants p ON p.plant_code = l.plant_code"],
        exercises:[
          { id:"35.1.e1", prompt:"What the flattening buys you — one join away: each plant's name, its number of lines and its total ideal capacity per shift (plant_name, line_count, capacity).",
            validate:{ rowCount:3, hasCols:["plant_name","line_count","capacity"], hasValue:1320 },
            _ref:"SELECT p.plant_name, COUNT(*) AS line_count, SUM(l.ideal_units_per_shift) AS capacity FROM raw_lines l JOIN raw_plants p ON p.plant_code = l.plant_code GROUP BY p.plant_name;",
            hint:"JOIN raw_lines to raw_plants, GROUP BY p.plant_name, SUM(ideal_units_per_shift)", xp:10 }
        ] },

      { id:"35.2", title:"dim_date — Generate a Calendar", concept:"Date Dimension",
        liveSetup:true, setup:"DROP TABLE IF EXISTS dim_date;",
        probe:"SELECT date_key, day_of_week, is_weekend, week_start FROM dim_date ORDER BY date_key",
        theory:`<p>Every warehouse has a date dimension: one row per calendar day, with everything you'd otherwise compute over and over — weekday, week start, weekend flag, fiscal period, holidays.</p><p>Why a table instead of date functions? <strong>Days with no data still exist in it.</strong> Join facts <em>to the calendar</em> and a line that produced nothing on Sunday shows up as a zero instead of vanishing from the chart. And "week" means one thing, defined once.</p><p>It has no source — you generate it. The recursive CTE from Day 15 makes a date spine:</p><pre class="theory-code">WITH RECURSIVE d(date_key) AS (
  SELECT '2025-01-01'
  UNION ALL
  SELECT date(date_key, '+1 day') FROM d WHERE date_key &lt; '2025-01-31'
)</pre><p>Useful SQLite pieces: <code>strftime('%w', d)</code> is the weekday as text, <code>'0'</code> = Sunday … <code>'6'</code> = Saturday. And <code>date(d, '-6 days', 'weekday 1')</code> is the Monday on or before <code>d</code> — step back six days, then forward to the next Monday.</p>`,
        chips:[{t:"WITH RECURSIVE",c:"chip-purple"},{t:"date spine",c:"chip-blue"},{t:"week_start",c:"chip-cyan"}],
        task:"Create the table dim_date for January 2025 (31 rows): date_key ('YYYY-MM-DD'), day_of_week (integer, 0 = Sunday … 6 = Saturday), is_weekend (1 for Saturday and Sunday, else 0) and week_start (the Monday on or before the date).",
        starter:"DROP TABLE IF EXISTS dim_date;\n\n-- CREATE TABLE dim_date AS\nWITH RECURSIVE d(date_key) AS (\n  SELECT '2025-01-01'\n  UNION ALL\n  SELECT date(date_key, '+1 day') FROM d WHERE date_key < '2025-01-31'\n)\nSELECT date_key,\n       strftime('%w', date_key) AS weekday_text      -- → day_of_week, is_weekend, week_start\nFROM d;\n",
        hint:"SELECT date_key, CAST(strftime('%w', date_key) AS INTEGER) AS day_of_week, CASE WHEN strftime('%w', date_key) IN ('0', '6') THEN 1 ELSE 0 END AS is_weekend, date(date_key, '-6 days', 'weekday 1') AS week_start FROM d — with CREATE TABLE dim_date AS in front of the WITH.", xp:55,
        tables:["raw_production_events"],
        refs:["CREATE TABLE dim_date AS WITH RECURSIVE d(date_key) AS (SELECT '2025-01-01' UNION ALL SELECT date(date_key, '+1 day') FROM d WHERE date_key < '2025-01-31') SELECT date_key, CAST(strftime('%w', date_key) AS INTEGER) AS day_of_week, CASE WHEN strftime('%w', date_key) IN ('0', '6') THEN 1 ELSE 0 END AS is_weekend, date(date_key, '-6 days', 'weekday 1') AS week_start FROM d"],
        exercises:[
          { id:"35.2.e1", prompt:"No table needed: generate the dates of every Monday in January 2025 with a recursive CTE (one column, monday).",
            validate:{ rowCount:4, hasCol:"monday", hasValue:"2025-01-27" },
            _ref:"WITH RECURSIVE m(monday) AS (SELECT '2025-01-06' UNION ALL SELECT date(monday, '+7 days') FROM m WHERE monday < '2025-01-27') SELECT monday FROM m;",
            hint:"Start at '2025-01-06' and step '+7 days' while monday < '2025-01-27' — or build all 31 days and filter on strftime('%w', …) = '1'", xp:12 }
        ] },

      { id:"35.3", title:"Snapshots → History, Part 1: Detect Changes", concept:"Change Detection",
        theory:`<p><code>raw_suppliers</code> isn't a list of suppliers — it's a weekly <strong>snapshot</strong>: every Monday the whole supplier master is copied in, changed or not. 23 rows, 6 suppliers.</p><p>Snapshots are how most history reaches a warehouse (it's what <code>dbt snapshot</code> automates). But they're bulky and awkward: "what was Cascade's rating on Jan 9th?" shouldn't require scanning weekly copies. The goal is an <strong>SCD Type 2</strong> dimension — one row per <em>version</em> of each supplier, with the dates it was valid.</p><p>Step one: collapse the snapshots down to the rows where <strong>something actually changed</strong>. Compare each row to the previous snapshot of the same supplier with <code>LAG()</code>. A trick keeps it readable — glue the tracked attributes into one signature string and compare that:</p><pre class="theory-code">LAG(name || '|' || country || '|' || rating || '|' || terms)
  OVER (PARTITION BY supplier_code ORDER BY snapshot_date) AS prev_sig</pre><p>A row is a new version when <code>prev_sig IS NULL</code> (the supplier's first appearance) or differs from its own signature. (Real pipelines hash the signature — <code>MD5(…)</code> — for the same purpose.)</p>`,
        chips:[{t:"LAG()",c:"chip-purple"},{t:"row signature",c:"chip-cyan"},{t:"snapshot → versions",c:"chip-blue"}],
        task:"From raw_suppliers keep only the rows that start a new version — the supplier's first snapshot, or a snapshot where supplier_name, country, rating or payment_terms differs from that supplier's previous snapshot. Return supplier_code, snapshot_date, supplier_name, rating, payment_terms (11 rows).",
        starter:"-- prev_sig is the previous snapshot's attributes for the same supplier\nWITH marked AS (\n  SELECT *,\n         LAG(supplier_name || '|' || country || '|' || rating || '|' || payment_terms)\n           OVER (PARTITION BY supplier_code ORDER BY snapshot_date) AS prev_sig\n  FROM raw_suppliers\n)\nSELECT supplier_code, snapshot_date, supplier_name, rating, payment_terms, prev_sig\nFROM marked\nORDER BY supplier_code, snapshot_date;\n",
        hint:"Keep the CTE; finish with: SELECT supplier_code, snapshot_date, supplier_name, rating, payment_terms FROM marked WHERE prev_sig IS NULL OR prev_sig <> supplier_name || '|' || country || '|' || rating || '|' || payment_terms;", xp:60,
        tables:["raw_suppliers"],
        refs:[`WITH marked AS (SELECT *, LAG(${SUPPLIER_SIG}) OVER (PARTITION BY supplier_code ORDER BY snapshot_date) AS prev_sig FROM raw_suppliers) SELECT supplier_code, snapshot_date, supplier_name, rating, payment_terms FROM marked WHERE prev_sig IS NULL OR prev_sig <> ${SUPPLIER_SIG}`],
        exercises:[
          { id:"35.3.e1", prompt:"Which suppliers never changed at all? Return the supplier_code of every supplier whose snapshots are all identical in name, country, rating and terms.",
            validate:{ rowCount:2, hasCol:"supplier_code", hasValue:"SUP-006" },
            _ref:"SELECT supplier_code FROM raw_suppliers GROUP BY supplier_code HAVING COUNT(DISTINCT supplier_name || '|' || country || '|' || rating || '|' || payment_terms) = 1;",
            hint:"GROUP BY supplier_code HAVING COUNT(DISTINCT <the signature>) = 1", xp:12 }
        ] },

      { id:"35.4", title:"Snapshots → History, Part 2: SCD Type 2", concept:"Slowly Changing Dimension",
        liveSetup:true, setup:"DROP TABLE IF EXISTS dim_supplier;",
        probe:"SELECT supplier_code, supplier_name, country, rating, payment_terms, valid_from, valid_to, is_current FROM dim_supplier ORDER BY supplier_code, valid_from",
        theory:`<p>You have the 11 version-starting rows. Each needs an end: a version is valid from its own snapshot date <strong>until the next version of the same supplier begins</strong>. That's <code>LEAD()</code>:</p><pre class="theory-code">snapshot_date                                         AS valid_from,
LEAD(snapshot_date) OVER (PARTITION BY supplier_code
                          ORDER BY snapshot_date)     AS valid_to     -- NULL = still current</pre><p>Ranges are <strong>half-open</strong> — <code>valid_from &lt;= d &lt; valid_to</code> — so versions tile the timeline with no gap and no overlap, and a date can never match two rows.</p><p><strong>Why not just <code>GROUP BY supplier, rating</code> with <code>MIN</code>/<code>MAX</code> dates?</strong> Look at Lone Star Coatings (SUP-004): rated B, upgraded to A, then back to B. Grouping on the attributes merges the two separate B periods into one range that swallows the A period — overlapping versions, double-counted joins. Change detection with <code>LAG</code> treats them as the two distinct <em>islands</em> they are. This is the gaps-and-islands problem, and it's why SCD2 is an interview favourite.</p>`,
        chips:[{t:"SCD Type 2",c:"chip-purple"},{t:"LEAD() → valid_to",c:"chip-blue"},{t:"half-open ranges",c:"chip-green"},{t:"gaps & islands",c:"chip-amber"}],
        task:"Create the table dim_supplier with one row per supplier version: supplier_code, supplier_name, country, rating, payment_terms, valid_from (the version's first snapshot_date), valid_to (the next version's valid_from, NULL for the latest) and is_current (1 when valid_to is NULL, else 0). 11 rows.",
        starter:"DROP TABLE IF EXISTS dim_supplier;\n\n-- `versions` is yesterday's answer. Add valid_to and is_current, then CREATE TABLE dim_supplier AS …\nWITH marked AS (\n  SELECT *,\n         LAG(supplier_name || '|' || country || '|' || rating || '|' || payment_terms)\n           OVER (PARTITION BY supplier_code ORDER BY snapshot_date) AS prev_sig\n  FROM raw_suppliers\n),\nversions AS (\n  SELECT * FROM marked\n  WHERE prev_sig IS NULL\n     OR prev_sig <> supplier_name || '|' || country || '|' || rating || '|' || payment_terms\n)\nSELECT supplier_code, supplier_name, country, rating, payment_terms,\n       snapshot_date AS valid_from\nFROM versions\nORDER BY supplier_code, valid_from;\n",
        hint:"Add: LEAD(snapshot_date) OVER (PARTITION BY supplier_code ORDER BY snapshot_date) AS valid_to, and CASE WHEN LEAD(snapshot_date) OVER (PARTITION BY supplier_code ORDER BY snapshot_date) IS NULL THEN 1 ELSE 0 END AS is_current. Put CREATE TABLE dim_supplier AS before the WITH and drop the ORDER BY.", xp:70,
        tables:["raw_suppliers"],
        refs:[`CREATE TABLE dim_supplier AS WITH marked AS (SELECT *, LAG(${SUPPLIER_SIG}) OVER (PARTITION BY supplier_code ORDER BY snapshot_date) AS prev_sig FROM raw_suppliers), versions AS (SELECT * FROM marked WHERE prev_sig IS NULL OR prev_sig <> ${SUPPLIER_SIG}) SELECT supplier_code, supplier_name, country, rating, payment_terms, snapshot_date AS valid_from, LEAD(snapshot_date) OVER (PARTITION BY supplier_code ORDER BY snapshot_date) AS valid_to, CASE WHEN LEAD(snapshot_date) OVER (PARTITION BY supplier_code ORDER BY snapshot_date) IS NULL THEN 1 ELSE 0 END AS is_current FROM versions`],
        exercises:[
          { id:"35.4.e1", prompt:"Reproduce the trap: for SUP-004, GROUP BY rating with MIN and MAX snapshot_date (rating, first_seen, last_seen). You get 2 rows — and the B range contains the entire A range.",
            validate:{ rowCount:2, hasCols:["rating","first_seen","last_seen"], hasValue:"2025-01-20" },
            _ref:"SELECT rating, MIN(snapshot_date) AS first_seen, MAX(snapshot_date) AS last_seen FROM raw_suppliers WHERE supplier_code = 'SUP-004' GROUP BY rating;",
            hint:"WHERE supplier_code = 'SUP-004' GROUP BY rating — B runs 2024-12-30 → 2025-01-20, A sits inside it on 2025-01-13", xp:12 }
        ] }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    day: 36, title: "Capstone V — Facts", lessons: [
      { id:"36.1", title:"Local Time, Shifts & the Production Date", concept:"Business Calendar Logic",
        liveSetup:true, models:["stg_production_events","dim_line"],
        setup:build('stg_production_events', 'dim_line'),
        theory:`<p>You stored UTC. But a plant manager doesn't think in UTC — "Tuesday's night shift" is a <em>local, business</em> concept, and it's where two classic bugs live.</p><p><strong>Bug 1 — the wrong day.</strong> Reno's swing shift closes at 21:45 local, which is 05:45 UTC <em>the next day</em>. Group by the UTC date and a third of Reno's output lands on the wrong day. Convert first: <code>datetime(event_ts_utc, utc_offset_hours || ' hours')</code> — offsets are negative, so this subtracts.</p><p><strong>Bug 2 — the shift that crosses midnight.</strong> Night shift C runs 22:00–06:00. A run closed at 05:40 on Wednesday was made by <em>Tuesday's</em> night shift. So the <strong>production date</strong> is the local date, minus one day when the local hour is before 06:00.</p><pre class="theory-code">shift A   06:00 – 13:59 local
shift B   14:00 – 21:59
shift C   22:00 – 05:59    → production_date = previous local date if hour &lt; 6</pre><p>Derive these once, in the fact, so no dashboard ever re-implements them differently.</p>`,
        chips:[{t:"UTC → local",c:"chip-blue"},{t:"shift crossing midnight",c:"chip-amber"},{t:"production_date",c:"chip-green"}],
        task:"For every row of stg_production_events return event_id, local_ts (event_ts_utc shifted into the plant's local time), shift_code ('A' for local hours 6–13, 'B' for 14–21, otherwise 'C') and production_date (the local date — but the previous day when the local hour is before 6). 164 rows.",
        starter:"-- dim_line carries each line's utc_offset_hours (-8, -7 or -6)\nSELECT s.event_id, s.event_ts_utc,\n       datetime(s.event_ts_utc, d.utc_offset_hours || ' hours') AS local_ts\nFROM stg_production_events s\nJOIN dim_line d ON d.line_code = s.line_code;\n\n-- local hour as a number:  CAST(strftime('%H', local_ts) AS INTEGER)\n",
        hint:"Put the starter in a subquery (FROM (…) ) so you can reuse local_ts, then: CASE WHEN CAST(strftime('%H', local_ts) AS INTEGER) BETWEEN 6 AND 13 THEN 'A' WHEN … BETWEEN 14 AND 21 THEN 'B' ELSE 'C' END AS shift_code, and CASE WHEN CAST(strftime('%H', local_ts) AS INTEGER) < 6 THEN date(local_ts, '-1 day') ELSE date(local_ts) END AS production_date.", xp:65,
        tables:["raw_shifts","raw_plants"],
        refs:[tidy(LOCAL_SHIFT_SQL)],
        exercises:[
          { id:"36.1.e1", prompt:"Size of bug 1: how many staged events have a production_date different from the plain UTC date of event_ts_utc? Return one number as misdated.",
            validate:{ rowCount:1, hasCol:"misdated" },
            _ref:`WITH x AS (${tidy(LOCAL_SHIFT_SQL)}) SELECT COUNT(*) AS misdated FROM x JOIN stg_production_events s ON s.event_id = x.event_id WHERE x.production_date <> date(s.event_ts_utc);`,
            hint:"Wrap your answer in a CTE, join back to stg_production_events on event_id and count rows where production_date <> date(event_ts_utc)", xp:18 }
        ] },

      { id:"36.2", title:"fact_production — Declare the Grain", concept:"Fact Table",
        liveSetup:true, models:["stg_production_events","stg_parts","dim_line"],
        setup:`${build('stg_parts', 'stg_production_events', 'dim_line')} DROP VIEW IF EXISTS int_production; DROP TABLE IF EXISTS fact_production;`,
        probe:"SELECT event_id, line_code, part_no, production_date, shift_code, event_ts_utc, qty_good, qty_scrap, loaded_at FROM fact_production ORDER BY event_id",
        theory:`<p>A fact table is defined by one sentence — its <strong>grain</strong>. Say it before you write any SQL:</p><p><em>"<code>fact_production</code> has one row per production run (one line, one shift, one part), identified by <code>event_id</code>."</em></p><p>Everything follows from that sentence: the columns are <strong>keys</strong> to dimensions (<code>line_code</code>, <code>part_no</code>, <code>production_date</code>, <code>shift_code</code>) plus <strong>additive measures</strong> (<code>qty_good</code>, <code>qty_scrap</code>) that can be summed along any dimension. A rate like yield is <em>not</em> stored — it isn't additive; you compute it from the sums.</p><p>A fact also has an <strong>entry rule</strong>. Rows that can't be trusted stay out (and get reported, like yesterday's quarantine): here, the two rows with negative <code>qty_good</code> from a sensor glitch, and the two commissioning rows for <code>TST-9999</code>, a part that's in no master list.</p><p>The starter has the shift logic from the previous lesson. Add the entry rule and materialize it.</p>`,
        chips:[{t:"grain statement",c:"chip-purple"},{t:"keys + additive measures",c:"chip-blue"},{t:"entry rule",c:"chip-amber"}],
        task:"Create the table fact_production — one row per valid staged event: event_id, line_code, part_no, production_date, shift_code, event_ts_utc, qty_good, qty_scrap, loaded_at. Leave out events with a negative qty_good and events whose part_no isn't in stg_parts. 160 rows.",
        starter:"DROP TABLE IF EXISTS fact_production;\n\n-- Add the entry rule to the inner query, then CREATE TABLE fact_production AS …\nSELECT event_id, line_code, part_no,\n       CASE WHEN CAST(strftime('%H', local_ts) AS INTEGER) < 6\n            THEN date(local_ts, '-1 day') ELSE date(local_ts) END AS production_date,\n       CASE WHEN CAST(strftime('%H', local_ts) AS INTEGER) BETWEEN 6 AND 13 THEN 'A'\n            WHEN CAST(strftime('%H', local_ts) AS INTEGER) BETWEEN 14 AND 21 THEN 'B'\n            ELSE 'C' END AS shift_code,\n       event_ts_utc, qty_good, qty_scrap, loaded_at\nFROM (\n  SELECT s.*, datetime(s.event_ts_utc, d.utc_offset_hours || ' hours') AS local_ts\n  FROM stg_production_events s\n  JOIN dim_line d ON d.line_code = s.line_code\n  -- WHERE …\n);\n",
        hint:"Inner query: WHERE s.qty_good >= 0 AND s.part_no IN (SELECT part_no FROM stg_parts). Then put CREATE TABLE fact_production AS in front of the outer SELECT.", xp:70,
        tables:["raw_production_events"],
        refs:[`CREATE TABLE fact_production AS ${tidy(FACT_SELECT('stg_production_events'))}`],
        exercises:[
          { id:"36.2.e1", prompt:"Report what the entry rule rejects: event_id and reason ('negative_qty' or 'unknown_part') for every staged event that must stay out of the fact.",
            validate:{ rowCount:4, hasCols:["event_id","reason"], hasValue:"unknown_part" },
            _ref:"SELECT event_id, CASE WHEN qty_good < 0 THEN 'negative_qty' ELSE 'unknown_part' END AS reason FROM stg_production_events WHERE qty_good < 0 OR part_no NOT IN (SELECT part_no FROM stg_parts);",
            hint:"WHERE qty_good < 0 OR part_no NOT IN (SELECT part_no FROM stg_parts), with a CASE for the reason", xp:15 }
        ] },

      { id:"36.3", title:"fact_defects — A Fact That Leans on a Fact", concept:"Conformed Keys",
        liveSetup:true, models:["stg_defects","fact_production"],
        setup:`${build(...PROD, 'stg_defects')} DROP TABLE IF EXISTS fact_defects;`,
        probe:"SELECT defect_id, event_id, defect_code, qty, line_code, part_no, production_date FROM fact_defects ORDER BY defect_id",
        theory:`<p>Second fact, finer grain: <em>"<code>fact_defects</code> has one row per defect finding — one defect code on one production run."</em> A run with two kinds of defect has two rows here and one row in <code>fact_production</code>.</p><p>A defect row only knows its <code>event_id</code>. To slice defects by line, part or date without always joining through the production fact, copy those keys down onto each defect row. They are <strong>conformed</strong>: the same <code>line_code</code> and <code>production_date</code> values, meaning the same thing, in both facts — which is what lets you put scrap and defects side by side in one report.</p><p>The entry rule comes for free from <strong>inner joins</strong>: a defect enters only if its event is in <code>fact_production</code> and its code is in <code>raw_defect_codes</code>. Normally an inner join silently dropping rows is the bug; here it's the rule, because you already quarantined those rows on Day 34 and can account for every one.</p>`,
        chips:[{t:"finer grain",c:"chip-purple"},{t:"conformed keys",c:"chip-cyan"},{t:"INNER JOIN as entry rule",c:"chip-amber"}],
        task:"Create the table fact_defects from stg_defects: defect_id, event_id, defect_code, qty, plus line_code, part_no and production_date copied from the matching fact_production row. Keep only defects whose event is in fact_production and whose defect_code exists in raw_defect_codes. 286 rows.",
        starter:"DROP TABLE IF EXISTS fact_defects;\n\n-- CREATE TABLE fact_defects AS\nSELECT d.defect_id, d.event_id, d.defect_code, d.qty\nFROM stg_defects d;      -- 296 rows: join the parents to copy keys down and enforce the entry rule\n",
        hint:"CREATE TABLE fact_defects AS SELECT d.defect_id, d.event_id, d.defect_code, d.qty, f.line_code, f.part_no, f.production_date FROM stg_defects d JOIN fact_production f ON f.event_id = d.event_id JOIN raw_defect_codes c ON c.defect_code = d.defect_code;", xp:60,
        tables:["raw_defects","raw_defect_codes"],
        refs:["CREATE TABLE fact_defects AS SELECT d.defect_id, d.event_id, d.defect_code, d.qty, f.line_code, f.part_no, f.production_date FROM stg_defects d JOIN fact_production f ON f.event_id = d.event_id JOIN raw_defect_codes c ON c.defect_code = d.defect_code"],
        exercises:[
          { id:"36.3.e1", prompt:"Do the two facts agree? List the production runs whose scrap isn't fully classified: event_id, qty_scrap and classified (the sum of that event's stg_defects qty, 0 if none) where the two differ.",
            validate:{ minRows:5, hasCols:["event_id","qty_scrap","classified"] },
            _ref:"SELECT f.event_id, f.qty_scrap, COALESCE(SUM(d.qty), 0) AS classified FROM fact_production f LEFT JOIN stg_defects d ON d.event_id = f.event_id GROUP BY f.event_id, f.qty_scrap HAVING COALESCE(SUM(d.qty), 0) <> f.qty_scrap;",
            hint:"fact_production LEFT JOIN stg_defects, GROUP BY the event, HAVING COALESCE(SUM(d.qty), 0) <> f.qty_scrap", xp:18 }
        ] },

      { id:"36.4", title:"Point-in-Time Joins", concept:"As-Of Join",
        liveSetup:true, models:["stg_deliveries","dim_supplier"],
        setup:build('stg_deliveries', 'dim_supplier'),
        theory:`<p>Now the payoff for building <code>dim_supplier</code> as SCD2. Question: <em>"What was each supplier's rating <strong>when the material was delivered</strong>?"</em></p><p>Join to the current row and every delivery from Cascade Alloys shows rating C — including the ones delivered while it was still a B. History gets rewritten every time a rating changes, last quarter's report no longer reproduces, and nobody can tell that quality slipped <em>after</em> the downgrade rather than before.</p><p>The <strong>point-in-time</strong> (as-of) join matches each fact row to the dimension version valid on the fact's own date — a range condition in the <code>ON</code> clause:</p><pre class="theory-code">JOIN dim_supplier s
  ON  s.supplier_code = d.supplier_code
  AND d.delivered_at &gt;= s.valid_from
  AND (s.valid_to IS NULL OR d.delivered_at &lt; s.valid_to)</pre><p>Because the ranges are half-open and tile the timeline, each delivery matches <strong>exactly one</strong> version. If a row count changes after this join, the dimension has a gap or an overlap — which makes the join its own test.</p>`,
        chips:[{t:"as-of join",c:"chip-purple"},{t:"valid_from ≤ d < valid_to",c:"chip-blue"},{t:"reproducible history",c:"chip-green"}],
        task:"For every delivery in stg_deliveries from a supplier that exists in dim_supplier, return delivery_id, supplier_code, delivered_at and rating_at_delivery — the rating of the supplier version in effect on the delivery date (51 rows).",
        starter:"-- The naive join: everything gets today's rating\nSELECT d.delivery_id, d.supplier_code, d.delivered_at, s.rating AS rating_at_delivery\nFROM stg_deliveries d\nJOIN dim_supplier s ON s.supplier_code = d.supplier_code AND s.is_current = 1;\n",
        hint:"Replace the is_current condition with the date range: AND d.delivered_at >= s.valid_from AND (s.valid_to IS NULL OR d.delivered_at < s.valid_to)", xp:65,
        tables:["raw_deliveries","raw_suppliers"],
        refs:["SELECT d.delivery_id, d.supplier_code, d.delivered_at, s.rating AS rating_at_delivery FROM stg_deliveries d JOIN dim_supplier s ON s.supplier_code = d.supplier_code AND d.delivered_at >= s.valid_from AND (s.valid_to IS NULL OR d.delivered_at < s.valid_to)"],
        requires:["valid_from"],
        exercises:[
          { id:"36.4.e1", prompt:"How much history would the naive join rewrite? Count the deliveries whose rating at delivery differs from the supplier's current rating — one number as rewritten.",
            validate:{ rowCount:1, hasCol:"rewritten" },
            _ref:"SELECT COUNT(*) AS rewritten FROM stg_deliveries d JOIN dim_supplier s ON s.supplier_code = d.supplier_code AND d.delivered_at >= s.valid_from AND (s.valid_to IS NULL OR d.delivered_at < s.valid_to) JOIN dim_supplier cur ON cur.supplier_code = d.supplier_code AND cur.is_current = 1 WHERE cur.rating <> s.rating;",
            hint:"Do the as-of join, then join dim_supplier a second time for the current row (is_current = 1) and count where the two ratings differ", xp:18 }
        ] }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    day: 37, title: "Capstone VI — Incremental & Idempotent", lessons: [
      { id:"37.1", title:"Late-Arriving Data", concept:"Event Time vs Load Time",
        liveSetup:true, models:["stg_production_events"],
        setup:build('stg_production_events'),
        theory:`<p>So far you rebuilt everything from scratch. At real volumes you load <strong>incrementally</strong> — only what's new since the last run (Day 26's high watermark). The question that decides whether your pipeline is correct: <em>new according to which clock?</em></p><p>Every row here has two timestamps. <code>event_ts_utc</code> is when it <strong>happened</strong>; <code>loaded_at</code> is when it <strong>arrived</strong>. They disagree more than you'd hope — a plant's uplink goes down, a supervisor keys in a correction two days later.</p><p>Watermark on <strong>event time</strong> ("give me events newer than the newest I have") and any row that arrives late — with an old event time — is behind the watermark forever. It is never loaded. No error, no warning; the totals are just quietly short.</p><p>Suppose the fact was last refreshed by the nightly batch of <strong>2025-01-13 08:00:00</strong>. Find the rows an event-time watermark would lose.</p>`,
        chips:[{t:"event time",c:"chip-cyan"},{t:"load time",c:"chip-blue"},{t:"late-arriving rows",c:"chip-amber"}],
        task:"Find the staged events an event-time watermark would silently miss: rows of stg_production_events with loaded_at after '2025-01-13 08:00:00' whose event_ts_utc is not after the newest event_ts_utc among rows loaded up to that time. Return event_id, event_ts_utc, loaded_at (4 rows).",
        starter:"-- The event-time watermark as of the 2025-01-13 08:00 batch:\nSELECT MAX(event_ts_utc) AS event_watermark\nFROM stg_production_events\nWHERE loaded_at <= '2025-01-13 08:00:00';\n\n-- Which rows arrived AFTER that batch but sit BEHIND that watermark?\n",
        hint:"SELECT event_id, event_ts_utc, loaded_at FROM stg_production_events WHERE loaded_at > '2025-01-13 08:00:00' AND event_ts_utc <= (SELECT MAX(event_ts_utc) FROM stg_production_events WHERE loaded_at <= '2025-01-13 08:00:00');", xp:60,
        tables:["raw_production_events"],
        refs:["SELECT event_id, event_ts_utc, loaded_at FROM stg_production_events WHERE loaded_at > '2025-01-13 08:00:00' AND event_ts_utc <= (SELECT MAX(event_ts_utc) FROM stg_production_events WHERE loaded_at <= '2025-01-13 08:00:00')"],
        exercises:[
          { id:"37.1.e1", prompt:"How late is late? Bucket every staged event by arrival delay — 'on time' when loaded within 36 hours of event_ts_utc, otherwise 'late' — and count them (arrival, events).",
            validate:{ rowCount:2, hasCols:["arrival","events"], hasValue:"late" },
            _ref:"SELECT CASE WHEN (julianday(loaded_at) - julianday(event_ts_utc)) * 24 <= 36 THEN 'on time' ELSE 'late' END AS arrival, COUNT(*) AS events FROM stg_production_events GROUP BY 1;",
            hint:"(julianday(loaded_at) - julianday(event_ts_utc)) * 24 is the delay in hours", xp:15 }
        ] },

      { id:"37.2", title:"The Incremental Load", concept:"Load-Time Watermark + Upsert",
        liveSetup:true, models:["int_production","fact_production"],
        setup:FACT_AS_OF_CUTOFF,
        probe:"SELECT event_id, line_code, part_no, production_date, shift_code, event_ts_utc, qty_good, qty_scrap, loaded_at FROM fact_production ORDER BY event_id",
        theory:`<p>The fix for late data: <strong>watermark on load time.</strong> "Give me everything that <em>arrived</em> since my last run" can't miss a row, however old its event time.</p><p>But a load-time increment contains two kinds of row: events the fact has never seen, and <strong>new versions of events it already holds</strong> (the corrections). A plain <code>INSERT</code> would crash on the primary key — or, in a warehouse with no enforced keys, create duplicates. So the write must be an <strong>upsert</strong>:</p><pre class="theory-code">INSERT INTO fact_production
SELECT * FROM int_production
WHERE loaded_at &gt; (SELECT MAX(loaded_at) FROM fact_production)
ON CONFLICT(event_id) DO UPDATE SET qty_good = excluded.qty_good, …;</pre><p>In Snowflake or BigQuery this is the <code>MERGE</code> from Day 30, and it is precisely what a dbt <em>incremental model</em> with a <code>unique_key</code> compiles to.</p><p>Set up for you: <code>fact_production</code> now has a real <code>PRIMARY KEY (event_id)</code> and holds only what had arrived by 2025-01-13 08:00. The view <code>int_production</code> is the transformation from Day 36 — the latest clean version of every valid event — so the load statement stays small.</p>`,
        chips:[{t:"MAX(loaded_at) watermark",c:"chip-blue"},{t:"upsert",c:"chip-purple"},{t:"dbt incremental",c:"chip-green"}],
        task:"Bring fact_production up to date incrementally: upsert from int_production every row whose loaded_at is greater than the fact's current MAX(loaded_at) — inserting new events and overwriting qty_good, qty_scrap and loaded_at on the ones that were corrected.",
        starter:"-- What's waiting? Rows that arrived since the last load:\nSELECT COUNT(*) AS pending\nFROM int_production\nWHERE loaded_at > (SELECT MAX(loaded_at) FROM fact_production);\n\n-- INSERT INTO fact_production\n-- SELECT * FROM int_production\n-- WHERE loaded_at > (SELECT MAX(loaded_at) FROM fact_production)\n-- ON CONFLICT(event_id) DO UPDATE SET ...;\n",
        hint:"INSERT INTO fact_production SELECT * FROM int_production WHERE loaded_at > (SELECT MAX(loaded_at) FROM fact_production) ON CONFLICT(event_id) DO UPDATE SET qty_good = excluded.qty_good, qty_scrap = excluded.qty_scrap, loaded_at = excluded.loaded_at;", xp:75,
        tables:["raw_production_events"],
        refs:[
          "INSERT INTO fact_production SELECT * FROM int_production WHERE loaded_at > (SELECT MAX(loaded_at) FROM fact_production) ON CONFLICT(event_id) DO UPDATE SET qty_good = excluded.qty_good, qty_scrap = excluded.qty_scrap, loaded_at = excluded.loaded_at",
          "INSERT OR REPLACE INTO fact_production SELECT * FROM int_production WHERE loaded_at > (SELECT MAX(loaded_at) FROM fact_production)"
        ],
        requires:["max(loaded_at)"],
        exercises:[
          { id:"37.2.e1", prompt:"Before loading, describe the increment in one row: new_events (not yet in the fact) and corrections (already in the fact) among the int_production rows past the watermark.",
            validate:{ rowCount:1, hasCols:["new_events","corrections"] },
            _ref:"SELECT SUM(f.event_id IS NULL) AS new_events, SUM(f.event_id IS NOT NULL) AS corrections FROM int_production i LEFT JOIN fact_production f ON f.event_id = i.event_id WHERE i.loaded_at > (SELECT MAX(loaded_at) FROM fact_production);",
            hint:"LEFT JOIN the increment to fact_production; SUM(f.event_id IS NULL) counts the new ones, SUM(f.event_id IS NOT NULL) the corrections", xp:18 }
        ] },

      { id:"37.3", title:"Idempotent Backfills", concept:"Delete + Insert by Partition",
        liveSetup:true, models:["int_production","fact_production"],
        setup:FACT_DAMAGED,
        probe:"SELECT event_id, line_code, part_no, production_date, shift_code, event_ts_utc, qty_good, qty_scrap, loaded_at FROM fact_production ORDER BY event_id",
        theory:`<p>It's 07:40. A bad deploy overnight zeroed <code>qty_scrap</code> for every production date from 2025-01-13 onward, and a failed job lost some rows outright. The dashboard shows a perfect-quality week. You need to repair one date range without touching the rest.</p><p>The workhorse pattern is <strong>delete + insert by partition</strong>: remove the slice, recompute the slice, in one transaction.</p><pre class="theory-code">BEGIN;
DELETE FROM fact_production WHERE production_date &gt;= '2025-01-13';
INSERT INTO fact_production SELECT * FROM int_production WHERE production_date &gt;= '2025-01-13';
COMMIT;</pre><p>What makes it professional is that it's <strong>idempotent</strong>: run it twice and you get the same table as running it once. Pipelines get retried, backfills get re-run by whoever's on call — a job that isn't safe to repeat is a job that will eventually double your numbers. (BigQuery's partition overwrite and dbt's <code>insert_overwrite</code> strategy are this exact idea.)</p><p>The transaction matters too: without it, a failure between the two statements leaves the dashboard with <em>no</em> data for the week.</p>`,
        chips:[{t:"idempotent",c:"chip-green"},{t:"DELETE + INSERT",c:"chip-blue"},{t:"BEGIN … COMMIT",c:"chip-purple"},{t:"backfill",c:"chip-amber"}],
        task:"Repair fact_production for production dates from 2025-01-13 onward: in one transaction, DELETE that date range from the fact and re-INSERT it from int_production. Safe to run twice.",
        starter:"-- Assess the damage first\nSELECT production_date, COUNT(*) AS fact_rows, SUM(qty_scrap) AS scrap\nFROM fact_production\nGROUP BY production_date\nORDER BY production_date;\n\n-- BEGIN;\n-- DELETE FROM fact_production WHERE ...;\n-- INSERT INTO fact_production SELECT * FROM int_production WHERE ...;\n-- COMMIT;\n",
        hint:"BEGIN; DELETE FROM fact_production WHERE production_date >= '2025-01-13'; INSERT INTO fact_production SELECT * FROM int_production WHERE production_date >= '2025-01-13'; COMMIT;", xp:70,
        tables:["raw_production_events"],
        refs:["BEGIN; DELETE FROM fact_production WHERE production_date >= '2025-01-13'; INSERT INTO fact_production SELECT * FROM int_production WHERE production_date >= '2025-01-13'; COMMIT;"],
        requires:["delete from fact_production", "insert into fact_production"],
        exercises:[
          { id:"37.3.e1", prompt:"Pinpoint the lost rows: production_date, fact_rows and expected_rows (from int_production) for every date where the fact has fewer rows than it should.",
            validate:{ rowCount:2, hasCols:["production_date","fact_rows","expected_rows"], hasValue:"2025-01-15" },
            _ref:"SELECT i.production_date, COUNT(f.event_id) AS fact_rows, COUNT(*) AS expected_rows FROM int_production i LEFT JOIN fact_production f ON f.event_id = i.event_id GROUP BY i.production_date HAVING COUNT(f.event_id) < COUNT(*);",
            hint:"int_production LEFT JOIN fact_production on event_id, GROUP BY production_date, HAVING COUNT(f.event_id) < COUNT(*)", xp:18 }
        ] }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    day: 38, title: "Capstone VII — Data Quality Tests", lessons: [
      { id:"38.1", title:"accepted_values — and the NULL Trap", concept:"Data Test",
        liveSetup:true, models:["stg_rework"],
        setup:build(...ALL),
        theory:`<p>You built it. Now prove it stays right. A <strong>data test</strong> is a query that returns the rows that violate a rule — <em>zero rows means pass</em> (Day 27). dbt ships four generic ones: <code>unique</code>, <code>not_null</code>, <code>accepted_values</code>, <code>relationships</code>. Today you write them by hand against the real warehouse.</p><p>Start with <code>accepted_values</code> on a column that deserves it: <code>raw_rework.outcome</code> should be exactly <code>'fixed'</code> or <code>'scrapped'</code>. The obvious test has a hole:</p><pre class="theory-code">WHERE outcome NOT IN ('fixed', 'scrapped')</pre><p>For a NULL outcome this evaluates to NULL — not true — so the row is <strong>not returned</strong>, and the test passes over data that plainly violates it. Any comparison with NULL is "unknown". A correct test says what it means: <code>outcome IS NULL OR outcome NOT IN (…)</code>.</p><p>All the official models are built for these lessons — including <code>stg_rework</code>, which already normalizes the outcome. Test the <em>raw</em> column to see why it had to.</p>`,
        chips:[{t:"accepted_values",c:"chip-blue"},{t:"NOT IN vs NULL",c:"chip-amber"},{t:"0 rows = pass",c:"chip-green"}],
        task:"Write the accepted_values test for raw_rework.outcome: return every distinct value that is not exactly 'fixed' or 'scrapped' — NULL included — with n, its row count (5 rows).",
        starter:"-- The test with the hole: NULL outcomes slip through\nSELECT outcome, COUNT(*) AS n\nFROM raw_rework\nWHERE outcome NOT IN ('fixed', 'scrapped')\nGROUP BY outcome;\n",
        hint:"WHERE outcome IS NULL OR outcome NOT IN ('fixed', 'scrapped')", xp:50,
        tables:["raw_rework"],
        refs:["SELECT outcome, COUNT(*) AS n FROM raw_rework WHERE outcome IS NULL OR outcome NOT IN ('fixed', 'scrapped') GROUP BY outcome"],
        exercises:[
          { id:"38.1.e1", prompt:"Now the same test on the staging model: distinct stg_rework.outcome values outside ('fixed', 'scrapped', 'open'), NULL included, with n. Staging did its job, so this must return 0 rows.",
            validate:{ rowCount:0, colCount:2 },
            _ref:"SELECT outcome, COUNT(*) AS n FROM stg_rework WHERE outcome IS NULL OR outcome NOT IN ('fixed', 'scrapped', 'open') GROUP BY outcome;",
            hint:"Same query against stg_rework with 'open' added to the list", xp:12 }
        ] },

      { id:"38.2", title:"unique & not_null — Guard the Grain", concept:"Key Tests",
        liveSetup:true, models:["stg_production_events","fact_production","fact_defects"],
        setup:build(...ALL),
        theory:`<p>The two tests every model gets on its key: <code>unique</code> and <code>not_null</code>. Together they <em>are</em> the grain statement, in executable form. If <code>fact_production</code> ever holds an <code>event_id</code> twice, every <code>SUM</code> downstream is wrong, and no chart will tell you.</p><p>On Day 32 this query returned 13 rows against raw. Run against staging it must return none — that's the proof the dedupe works, and the alarm that goes off the day someone "simplifies" it.</p><p>Tests like this are cheap to write and are what separates a pipeline from a pile of queries: they run after every load, and a failure <strong>stops the bad data before it reaches the dashboard</strong> rather than after someone in a meeting notices.</p><p>Because the correct result here is <em>empty</em>, this lesson also checks that your query is really a uniqueness test.</p>`,
        chips:[{t:"unique",c:"chip-blue"},{t:"not_null",c:"chip-cyan"},{t:"test the grain",c:"chip-purple"}],
        task:"Write the unique test for stg_production_events.event_id: return event_id and n for any event_id that appears more than once. It should return 0 rows.",
        starter:"-- Zero rows back = the key is unique = test passes\n",
        hint:"SELECT event_id, COUNT(*) AS n FROM stg_production_events GROUP BY event_id HAVING COUNT(*) > 1;", xp:45,
        tables:["raw_production_events"],
        refs:["SELECT event_id, COUNT(*) AS n FROM stg_production_events GROUP BY event_id HAVING COUNT(*) > 1"],
        requires:["stg_production_events", "group by", "having"],
        exercises:[
          { id:"38.2.e1", prompt:"A not_null test that fails: how many raw_rework rows have no finished_at? Return one number as failures.",
            validate:{ rowCount:1, hasCol:"failures", hasValue:7 },
            _ref:"SELECT COUNT(*) AS failures FROM raw_rework WHERE finished_at IS NULL;",
            hint:"WHERE finished_at IS NULL — these are the open reworks", xp:10 },
          { id:"38.2.e2", prompt:"A relationships test that passes: fact_defects rows whose event_id is missing from fact_production (defect_id, event_id). The entry rule guarantees 0 rows.",
            validate:{ rowCount:0, colCount:2 },
            _ref:"SELECT d.defect_id, d.event_id FROM fact_defects d LEFT JOIN fact_production f ON f.event_id = d.event_id WHERE f.event_id IS NULL;",
            hint:"Anti-join fact_defects to fact_production", xp:12 }
        ] },

      { id:"38.3", title:"Reconciliation — Nothing Lost Between Layers", concept:"Reconciliation Test",
        liveSetup:true, models:["stg_production_events","fact_production"],
        setup:build(...ALL),
        theory:`<p>Column tests check rows one at a time. They can't see what <em>isn't there</em>. If a join in the fact silently dropped forty events, <code>unique</code> and <code>not_null</code> would both pass.</p><p>A <strong>reconciliation test</strong> compares totals <em>across layers</em> and insists they tie out:</p><pre class="theory-code">distinct keys in raw   =  rows in staging
rows in staging        =  rows in the fact  +  rows rejected by the entry rule</pre><p>This is how finance has always audited books, and it's the test that catches the bugs people actually ship: a join that fans out or drops, a filter with the wrong boundary, a load that ran twice.</p><p>Scalar subqueries make it one tidy row — <code>SELECT (SELECT COUNT(*) FROM a) AS a, (SELECT COUNT(*) FROM b) AS b</code>. In production you'd add a final column that subtracts them and alert when it isn't zero.</p>`,
        chips:[{t:"reconciliation",c:"chip-green"},{t:"scalar subqueries",c:"chip-blue"},{t:"raw = staged = fact + rejected",c:"chip-purple"}],
        task:"Tie the production pipeline out in one row: raw_events (distinct event_id in raw_production_events), staged (rows in stg_production_events), fact (rows in fact_production) and rejected (staged minus fact).",
        starter:"SELECT (SELECT COUNT(DISTINCT event_id) FROM raw_production_events) AS raw_events;\n",
        hint:"SELECT (SELECT COUNT(DISTINCT event_id) FROM raw_production_events) AS raw_events, (SELECT COUNT(*) FROM stg_production_events) AS staged, (SELECT COUNT(*) FROM fact_production) AS fact, (SELECT COUNT(*) FROM stg_production_events) - (SELECT COUNT(*) FROM fact_production) AS rejected;", xp:50,
        tables:["raw_production_events"],
        refs:["SELECT (SELECT COUNT(DISTINCT event_id) FROM raw_production_events) AS raw_events, (SELECT COUNT(*) FROM stg_production_events) AS staged, (SELECT COUNT(*) FROM fact_production) AS fact, (SELECT COUNT(*) FROM stg_production_events) - (SELECT COUNT(*) FROM fact_production) AS rejected"],
        exercises:[
          { id:"38.3.e1", prompt:"Reconcile a measure, not just rows: total qty_scrap in fact_production vs total qty in fact_defects, and the gap between them (scrap_units, defect_units, unclassified).",
            validate:{ rowCount:1, hasCols:["scrap_units","defect_units","unclassified"], hasValue:2241 },
            _ref:"SELECT (SELECT SUM(qty_scrap) FROM fact_production) AS scrap_units, (SELECT SUM(qty) FROM fact_defects) AS defect_units, (SELECT SUM(qty_scrap) FROM fact_production) - (SELECT SUM(qty) FROM fact_defects) AS unclassified;",
            hint:"Three scalar subqueries; the third subtracts the first two", xp:15 },
          { id:"38.3.e2", prompt:"A freshness test: pretend it is now '2025-01-21 12:00:00'. How many hours old is the newest loaded_at in raw_production_events? One number as hours_stale.",
            validate:{ rowCount:1, hasCol:"hours_stale", hasValue:4 },
            _ref:"SELECT ROUND((julianday('2025-01-21 12:00:00') - julianday(MAX(loaded_at))) * 24, 1) AS hours_stale FROM raw_production_events;",
            hint:"(julianday('2025-01-21 12:00:00') - julianday(MAX(loaded_at))) * 24, rounded to 1 decimal", xp:12 }
        ] },

      { id:"38.4", title:"The Test Scoreboard", concept:"Test Suite",
        liveSetup:true, models:["stg_production_events","stg_defects","fact_production"],
        setup:build(...ALL),
        theory:`<p>One test is a query. A <strong>test suite</strong> is a table: one row per test, with the number of failing rows. That table is what gets a dashboard tile, a Slack alert and a row in the on-call runbook.</p><p>The shape is always the same — a <code>UNION ALL</code> of small queries that each return a name and a count:</p><pre class="theory-code">SELECT 'events_unique' AS test_name, COUNT(*) AS failures FROM ( …failing rows… )
UNION ALL
SELECT 'defects_have_event', COUNT(*) FROM …</pre><p>Two kinds of result will come back. Tests that return <strong>0</strong> are guarantees: staging de-duplicates, and this proves it still does. Tests that return a <strong>non-zero count on staging</strong> aren't bugs in your pipeline — they're known problems in the source that the fact's entry rule and the quarantine handle. Tracking the count is how you notice the day six orphans becomes six hundred.</p>`,
        chips:[{t:"test suite",c:"chip-purple"},{t:"UNION ALL",c:"chip-blue"},{t:"failures per test",c:"chip-amber"}],
        task:"Build the scoreboard — test_name and failures, 4 rows: 'events_unique' (event_ids appearing more than once in stg_production_events), 'events_qty_non_negative' (stg_production_events rows with qty_good < 0), 'defects_have_event' (stg_defects rows with no matching event in stg_production_events) and 'defects_code_known' (stg_defects rows whose defect_code isn't in raw_defect_codes).",
        starter:"SELECT 'events_unique' AS test_name, COUNT(*) AS failures\nFROM (SELECT event_id FROM stg_production_events GROUP BY event_id HAVING COUNT(*) > 1)\n\nUNION ALL\n\nSELECT 'events_qty_non_negative', COUNT(*)\nFROM stg_production_events\nWHERE qty_good < 0;\n",
        hint:"Add: UNION ALL SELECT 'defects_have_event', COUNT(*) FROM stg_defects d WHERE NOT EXISTS (SELECT 1 FROM stg_production_events e WHERE e.event_id = d.event_id) UNION ALL SELECT 'defects_code_known', COUNT(*) FROM stg_defects d WHERE NOT EXISTS (SELECT 1 FROM raw_defect_codes c WHERE c.defect_code = d.defect_code)", xp:70,
        tables:["raw_defect_codes"],
        refs:["SELECT 'events_unique' AS test_name, COUNT(*) AS failures FROM (SELECT event_id FROM stg_production_events GROUP BY event_id HAVING COUNT(*) > 1) UNION ALL SELECT 'events_qty_non_negative', COUNT(*) FROM stg_production_events WHERE qty_good < 0 UNION ALL SELECT 'defects_have_event', COUNT(*) FROM stg_defects d WHERE NOT EXISTS (SELECT 1 FROM stg_production_events e WHERE e.event_id = d.event_id) UNION ALL SELECT 'defects_code_known', COUNT(*) FROM stg_defects d WHERE NOT EXISTS (SELECT 1 FROM raw_defect_codes c WHERE c.defect_code = d.defect_code)"],
        exercises:[
          { id:"38.4.e1", prompt:"Turn counts into a verdict: from the same four tests return test_name, failures and status — 'pass' when failures is 0, otherwise 'warn'.",
            validate:{ rowCount:4, hasCols:["test_name","failures","status"], hasValue:"pass" },
            _ref:"WITH t AS (SELECT 'events_unique' AS test_name, COUNT(*) AS failures FROM (SELECT event_id FROM stg_production_events GROUP BY event_id HAVING COUNT(*) > 1) UNION ALL SELECT 'events_qty_non_negative', COUNT(*) FROM stg_production_events WHERE qty_good < 0 UNION ALL SELECT 'defects_have_event', COUNT(*) FROM stg_defects d WHERE NOT EXISTS (SELECT 1 FROM stg_production_events e WHERE e.event_id = d.event_id) UNION ALL SELECT 'defects_code_known', COUNT(*) FROM stg_defects d WHERE NOT EXISTS (SELECT 1 FROM raw_defect_codes c WHERE c.defect_code = d.defect_code)) SELECT test_name, failures, CASE WHEN failures = 0 THEN 'pass' ELSE 'warn' END AS status FROM t;",
            hint:"Wrap your scoreboard in a CTE and add CASE WHEN failures = 0 THEN 'pass' ELSE 'warn' END AS status", xp:15 }
        ] }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════
  {
    day: 39, title: "Capstone VIII — Marts & Ship It", lessons: [
      { id:"39.1", title:"mart_line_daily — First-Pass Yield", concept:"KPI Mart",
        liveSetup:true, models:["fact_production","dim_line","dim_date"],
        setup:`${build(...ALL)} DROP VIEW IF EXISTS mart_line_daily;`,
        probe:"SELECT production_date, line_code, units, scrap, fpy_pct FROM mart_line_daily ORDER BY production_date, line_code",
        theory:`<p>Everything so far was plumbing. A <strong>mart</strong> is the part the business sees: a small, purpose-built model that answers one family of questions, at the grain a dashboard needs, with the metric definitions baked in.</p><p>The metric here is <strong>first-pass yield</strong> — the share of units that came off the line good the first time:</p><pre class="theory-code">FPY = good units ÷ (good units + scrapped units)</pre><p>Two rules for rate metrics that you now have the tools to respect:</p><p><strong>Aggregate, then divide.</strong> <code>SUM(good) / SUM(total)</code> — never <code>AVG</code> of per-row rates, which would let a 40-unit weekend run count as much as a 900-unit weekday shift.</p><p><strong>Define it once.</strong> If FPY lives in this view, every chart agrees. If each analyst computes it, you get three numbers and a meeting.</p>`,
        chips:[{t:"mart",c:"chip-purple"},{t:"SUM / SUM",c:"chip-green"},{t:"first-pass yield",c:"chip-cyan"}],
        task:"Create the view mart_line_daily with one row per production_date and line_code: units (good + scrap), scrap (total qty_scrap) and fpy_pct — 100 × good ÷ units, rounded to 2 decimals.",
        starter:"DROP VIEW IF EXISTS mart_line_daily;\n\n-- CREATE VIEW mart_line_daily AS\nSELECT production_date, line_code,\n       SUM(qty_good + qty_scrap) AS units\nFROM fact_production\nGROUP BY production_date, line_code;\n",
        hint:"CREATE VIEW mart_line_daily AS SELECT production_date, line_code, SUM(qty_good + qty_scrap) AS units, SUM(qty_scrap) AS scrap, ROUND(100.0 * SUM(qty_good) / SUM(qty_good + qty_scrap), 2) AS fpy_pct FROM fact_production GROUP BY production_date, line_code;", xp:60,
        tables:["raw_production_events"],
        refs:["CREATE VIEW mart_line_daily AS SELECT production_date, line_code, SUM(qty_good + qty_scrap) AS units, SUM(qty_scrap) AS scrap, ROUND(100.0 * SUM(qty_good) / SUM(qty_good + qty_scrap), 2) AS fpy_pct FROM fact_production GROUP BY production_date, line_code"],
        exercises:[
          { id:"39.1.e1", prompt:"The first thing a plant manager asks: the five worst line-days by first-pass yield — production_date, line_code and fpy_pct (computed as in the mart), worst first.",
            validate:{ rowCount:5, hasCols:["production_date","line_code","fpy_pct"], allEq:{ col:"line_code", val:"BOI-L1" } },
            _ref:"SELECT production_date, line_code, ROUND(100.0 * SUM(qty_good) / SUM(qty_good + qty_scrap), 2) AS fpy_pct FROM fact_production GROUP BY production_date, line_code ORDER BY fpy_pct ASC LIMIT 5;",
            hint:"Same aggregation, ORDER BY fpy_pct ASC LIMIT 5 — one line owns the whole list", xp:15 }
        ] },

      { id:"39.2", title:"Defect Pareto — Where to Aim", concept:"Pareto Analysis",
        liveSetup:true, models:["fact_defects","fact_production"],
        setup:build(...ALL),
        ordered:true,
        theory:`<p>Quality engineers live by the <strong>Pareto chart</strong>: sort the causes from biggest to smallest and add a running share. A few causes almost always account for most of the loss — and the chart says which ones to fix first.</p><p>It's three window functions on one small aggregate:</p><pre class="theory-code">units                                             -- per defect
100.0 * units / SUM(units) OVER ()                -- share of the grand total
100.0 * SUM(units) OVER (ORDER BY units DESC)     -- running total …
      / SUM(units) OVER ()                        -- … as a share</pre><p><code>SUM(…) OVER ()</code> with empty parentheses is the grand total repeated on every row; add <code>ORDER BY</code> inside and it becomes a running total. Same function, two jobs — the Day 6 and Day 14 material doing real work.</p><p>Join to <code>raw_defect_codes</code> for a readable description. A report that says "D-101" instead of "Porosity" gets ignored.</p>`,
        chips:[{t:"Pareto",c:"chip-amber"},{t:"SUM() OVER ()",c:"chip-purple"},{t:"running %",c:"chip-blue"}],
        task:"Build the defect Pareto from fact_defects: description (from raw_defect_codes), units (total qty), pct_of_total and cumulative_pct — both as percentages rounded to 1 decimal — ordered from the most units to the fewest.",
        starter:"WITH d AS (\n  SELECT c.description, SUM(f.qty) AS units\n  FROM fact_defects f\n  JOIN raw_defect_codes c ON c.defect_code = f.defect_code\n  GROUP BY c.description\n)\nSELECT description, units\nFROM d\nORDER BY units DESC;\n",
        hint:"Add: ROUND(100.0 * units / SUM(units) OVER (), 1) AS pct_of_total, ROUND(100.0 * SUM(units) OVER (ORDER BY units DESC) / SUM(units) OVER (), 1) AS cumulative_pct", xp:65,
        tables:["raw_defect_codes"],
        refs:["WITH d AS (SELECT c.description, SUM(f.qty) AS units FROM fact_defects f JOIN raw_defect_codes c ON c.defect_code = f.defect_code GROUP BY c.description) SELECT description, units, ROUND(100.0 * units / SUM(units) OVER (), 1) AS pct_of_total, ROUND(100.0 * SUM(units) OVER (ORDER BY units DESC) / SUM(units) OVER (), 1) AS cumulative_pct FROM d ORDER BY units DESC"],
        exercises:[
          { id:"39.2.e1", prompt:"Zoom in on the problem line: for BOI-L1, defect units per week — week_start (from dim_date), description and units — for its biggest defect type only, 'Porosity'.",
            validate:{ rowCount:2, hasCols:["week_start","description","units"], hasValue:"2025-01-13" },
            _ref:"SELECT dd.week_start, c.description, SUM(f.qty) AS units FROM fact_defects f JOIN raw_defect_codes c ON c.defect_code = f.defect_code JOIN dim_date dd ON dd.date_key = f.production_date WHERE f.line_code = 'BOI-L1' AND c.description = 'Porosity' GROUP BY dd.week_start, c.description;",
            hint:"Join fact_defects to raw_defect_codes and to dim_date ON dd.date_key = f.production_date; filter the line and the description; GROUP BY dd.week_start", xp:18 }
        ] },

      { id:"39.3", title:"Supplier Scorecard — Apples to Apples", concept:"Conformed Measures",
        liveSetup:true, models:["stg_deliveries","dim_supplier"],
        setup:build(...ALL),
        theory:`<p>Back to the question from Day 34: who is the cheapest aluminum supplier? You can finally answer it honestly — and this lesson is short on purpose, because <strong>all the hard work already happened upstream.</strong> Units are conformed in <code>stg_deliveries</code>; supplier names and ratings live in <code>dim_supplier</code>. The mart is a join and a <code>GROUP BY</code>.</p><p>That's the whole argument for layered modeling. The mess is fixed once, low in the stack; everything above it is simple, and simple things are hard to get wrong.</p><p>Two details: weight-based price must again be <code>SUM(total_cost) / SUM(qty_kg)</code> — a weighted average, not an average of per-delivery prices. And a scorecard describes suppliers <em>as they are now</em>, so join to the current version (<code>is_current = 1</code>) — unlike the point-in-time join, which described them as they were.</p>`,
        chips:[{t:"weighted average",c:"chip-green"},{t:"is_current = 1",c:"chip-blue"},{t:"fix once, low in the stack",c:"chip-purple"}],
        task:"Score the bulk-material suppliers: for deliveries with a qty_kg, from suppliers in dim_supplier, return supplier_name and rating (current version), deliveries (count), total_kg (rounded to 1 decimal) and cost_per_kg — total_cost ÷ total kg, rounded to 3 decimals (4 rows).",
        starter:"SELECT s.supplier_name, s.rating, COUNT(*) AS deliveries\nFROM stg_deliveries d\nJOIN dim_supplier s ON s.supplier_code = d.supplier_code AND s.is_current = 1\nWHERE d.qty_kg IS NOT NULL\nGROUP BY s.supplier_name, s.rating;\n",
        hint:"Add ROUND(SUM(d.qty_kg), 1) AS total_kg and ROUND(SUM(d.total_cost) / SUM(d.qty_kg), 3) AS cost_per_kg", xp:55,
        tables:["raw_deliveries","raw_suppliers"],
        refs:["SELECT s.supplier_name, s.rating, COUNT(*) AS deliveries, ROUND(SUM(d.qty_kg), 1) AS total_kg, ROUND(SUM(d.total_cost) / SUM(d.qty_kg), 3) AS cost_per_kg FROM stg_deliveries d JOIN dim_supplier s ON s.supplier_code = d.supplier_code AND s.is_current = 1 WHERE d.qty_kg IS NOT NULL GROUP BY s.supplier_name, s.rating"],
        exercises:[
          { id:"39.3.e1", prompt:"Is rework worth it? From stg_rework, for finished jobs only (outcome 'fixed' or 'scrapped'): jobs, fix_rate_pct (share fixed, 1 decimal) and avg_minutes (average labor_minutes, 1 decimal) — one row.",
            validate:{ rowCount:1, hasCols:["jobs","fix_rate_pct","avg_minutes"], hasValue:84 },
            _ref:"SELECT COUNT(*) AS jobs, ROUND(100.0 * SUM(outcome = 'fixed') / COUNT(*), 1) AS fix_rate_pct, ROUND(AVG(labor_minutes), 1) AS avg_minutes FROM stg_rework WHERE outcome IN ('fixed', 'scrapped');",
            hint:"WHERE outcome IN ('fixed', 'scrapped'); ROUND(100.0 * SUM(outcome = 'fixed') / COUNT(*), 1)", xp:15 }
        ] },

      { id:"39.4", title:"Final Boss — The Yield Alert", concept:"Everything At Once",
        liveSetup:true, models:["fact_production","dim_date","dim_line"],
        setup:build(...ALL),
        theory:`<p>Friday. The VP's question again: <em>"Which line is making scrap, and is it getting worse?"</em></p><p>You have everything it takes. Three timestamp formats became one UTC column. Thirteen duplicates became 164 clean events. A night shift that crosses midnight lands on the right day. Rejected rows are counted, not lost. A calendar defines what a week is.</p><p>The answer is a <strong>week-over-week alert</strong>: yield per line per week, compared with the week before using <code>LAG()</code>, and a flag when it falls by two points or more. Build it the way you'd build it live in an interview — one CTE per idea, run each before adding the next:</p><p><strong>1.</strong> weekly FPY per line (fact → <code>dim_date</code> for <code>week_start</code>)<br><strong>2.</strong> <code>LAG()</code> the previous week's FPY within each line<br><strong>3.</strong> the change, the flag, and only the weeks that have a previous week</p><p>One row will say <code>ALERT</code>. That row is the reason warehouses exist.</p>`,
        chips:[{t:"CTE pipeline",c:"chip-blue"},{t:"LAG() week over week",c:"chip-purple"},{t:"alerting",c:"chip-amber"},{t:"the whole stack",c:"chip-green"}],
        task:"Per line and week: line_code, week_start, fpy_pct (100 × good ÷ units, 2 decimals), prev_fpy_pct (the same line's previous week), change_pts (fpy_pct − prev_fpy_pct, 2 decimals) and status — 'ALERT' when change_pts is −2 or lower, otherwise 'ok'. Only rows that have a previous week (6 rows).",
        starter:"-- Step 1: weekly first-pass yield per line\nWITH weekly AS (\n  SELECT f.line_code, dd.week_start,\n         ROUND(100.0 * SUM(f.qty_good) / SUM(f.qty_good + f.qty_scrap), 2) AS fpy_pct\n  FROM fact_production f\n  JOIN dim_date dd ON dd.date_key = f.production_date\n  GROUP BY f.line_code, dd.week_start\n)\nSELECT * FROM weekly\nORDER BY line_code, week_start;\n\n-- Step 2: LAG(fpy_pct) OVER (PARTITION BY line_code ORDER BY week_start)\n-- Step 3: change_pts, status, and keep only rows with a previous week\n",
        hint:"Add a second CTE: compared AS (SELECT *, LAG(fpy_pct) OVER (PARTITION BY line_code ORDER BY week_start) AS prev_fpy_pct FROM weekly). Then SELECT line_code, week_start, fpy_pct, prev_fpy_pct, ROUND(fpy_pct - prev_fpy_pct, 2) AS change_pts, CASE WHEN fpy_pct - prev_fpy_pct <= -2 THEN 'ALERT' ELSE 'ok' END AS status FROM compared WHERE prev_fpy_pct IS NOT NULL;", xp:120,
        tables:["raw_production_events"],
        refs:["WITH weekly AS (SELECT f.line_code, dd.week_start, ROUND(100.0 * SUM(f.qty_good) / SUM(f.qty_good + f.qty_scrap), 2) AS fpy_pct FROM fact_production f JOIN dim_date dd ON dd.date_key = f.production_date GROUP BY f.line_code, dd.week_start), compared AS (SELECT *, LAG(fpy_pct) OVER (PARTITION BY line_code ORDER BY week_start) AS prev_fpy_pct FROM weekly) SELECT line_code, week_start, fpy_pct, prev_fpy_pct, ROUND(fpy_pct - prev_fpy_pct, 2) AS change_pts, CASE WHEN fpy_pct - prev_fpy_pct <= -2 THEN 'ALERT' ELSE 'ok' END AS status FROM compared WHERE prev_fpy_pct IS NOT NULL"],
        exercises:[
          { id:"39.4.e1", prompt:"Close the loop for the VP — add the likely cause. For the alerting line BOI-L1, downtime per week from raw_downtime: week_start (the Monday of started_at's date), stops (count) and minutes (total minutes down, finished stops only, as a whole number).",
            validate:{ rowCount:2, hasCols:["week_start","stops","minutes"], hasValue:"2025-01-13" },
            _ref:"SELECT date(started_at, '-6 days', 'weekday 1') AS week_start, COUNT(*) AS stops, CAST(ROUND(SUM((julianday(ended_at) - julianday(started_at)) * 1440)) AS INTEGER) AS minutes FROM raw_downtime WHERE line_code = 'BOI-L1' AND ended_at IS NOT NULL GROUP BY 1;",
            hint:"date(started_at, '-6 days', 'weekday 1') AS week_start; minutes = (julianday(ended_at) - julianday(started_at)) * 1440; skip rows where ended_at IS NULL", xp:25 }
        ] }
    ]
  });
})();
