// SQL Quest — mock-interview problem bank.
//
// Pure data, loaded before interview.js. Every problem is graded by the same
// result-set engine as the lessons (`refs`, optional `ordered`), so a verdict
// never depends on an AI's opinion. `node tools/verify.js` checks that every
// reference runs and self-validates.
//
//   track      'sql' — classic screen on the shop tables
//              'de'  — data-engineering problems on the plant-floor warehouse
//   level      1 warm-up · 2 core · 3 senior
//   minutes    target time; finishing inside it earns the full speed score
//   setupFrom  id of a capstone lesson whose `setup` builds the models this
//              problem queries (stg_/dim_/fact_ objects)
//   followups  what a real interviewer asks next. In AI mode the interviewer
//              asks them in its own words and judges the answer; in solo mode
//              the model answer `a` is revealed and you rate yourself.
//   review     curriculum days to revisit if this one goes badly

const INTERVIEW_BANK = [
  // ── SQL screen ─────────────────────────────────────────────────────────
  { id:"iv-s1", track:"sql", level:1, minutes:5, title:"Customers who never ordered",
    prompt:"Return the <code>id</code> and <code>name</code> of every customer who has never placed an order.",
    tables:["customers","orders"],
    refs:["SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL"],
    hint:"An anti-join: LEFT JOIN orders and keep the rows where the order side is NULL — or NOT EXISTS.",
    review:[4, 11],
    followups:[
      { q:"Many people write this with NOT IN (SELECT customer_id FROM orders). When does that silently return nothing?",
        a:"When the subquery returns even one NULL customer_id: x NOT IN (…, NULL) is never true, so every row is filtered out. NOT EXISTS and LEFT JOIN … IS NULL don't have that problem." },
      { q:"On a table with a billion orders, what would you want in place so this anti-join is cheap?",
        a:"An index (or clustering key) on orders.customer_id so the engine can probe for existence instead of scanning; NOT EXISTS lets it stop at the first match. In a warehouse you'd also want to scan only the customer_id column — which columnar storage gives you for free." }
    ] },

  { id:"iv-s2", track:"sql", level:1, minutes:6, title:"Revenue by customer tier",
    prompt:"For <strong>completed</strong> orders, return each customer <code>tier</code> with its number of <code>orders</code> and total <code>revenue</code>, highest revenue first.",
    tables:["orders","customers"], ordered:true,
    refs:["SELECT c.tier, COUNT(*) AS orders, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed' GROUP BY c.tier ORDER BY revenue DESC"],
    hint:"JOIN orders to customers, filter status = 'completed', GROUP BY tier, ORDER BY revenue DESC.",
    review:[3, 4],
    followups:[
      { q:"Suppose a tier had customers but no completed orders and you still wanted it listed with zero revenue. What changes — and where does the status filter have to go?",
        a:"Start FROM customers and LEFT JOIN orders, and move status = 'completed' into the ON clause. Left in WHERE, it would discard the NULL-extended rows and turn the LEFT JOIN back into an inner join. Use COUNT(o.id) and COALESCE(SUM(o.total), 0)." },
      { q:"Add each tier's share of total revenue without a second query. How?",
        a:"A window over the grouped result: 100.0 * SUM(o.total) / SUM(SUM(o.total)) OVER (). Window functions run after GROUP BY, so they can aggregate the aggregates." }
    ] },

  { id:"iv-s3", track:"sql", level:2, minutes:8, title:"Second-highest salary per department",
    prompt:"For each department return the employee(s) with the <strong>second-highest salary</strong>: <code>department</code>, <code>first_name</code>, <code>salary</code>.",
    tables:["employees"],
    refs:["WITH r AS (SELECT department, first_name, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rk FROM employees) SELECT department, first_name, salary FROM r WHERE rk = 2"],
    hint:"DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) in a CTE, then keep rank 2.",
    review:[6, 14, 28],
    followups:[
      { q:"You had three ranking functions to choose from. If two people tie for the top salary, what does each one return for 'second-highest'?",
        a:"ROW_NUMBER arbitrarily calls one of the tied top earners #2. RANK gives both 1 and skips to 3, so rank 2 returns nobody. DENSE_RANK gives both 1 and the next distinct salary 2 — the usual meaning of 'second-highest salary'." },
      { q:"What does your query return for a department with only one employee, and is that the right behaviour?",
        a:"No row for that department — there is no second-highest. If the report needs every department, LEFT JOIN the result to the department list so it appears with NULLs rather than vanishing." }
    ] },

  { id:"iv-s4", track:"sql", level:2, minutes:10, title:"Month-over-month growth",
    prompt:"For 2023, using completed orders: <code>month</code> (YYYY-MM), <code>revenue</code>, <code>prev_revenue</code> (the previous row's revenue) and <code>growth_pct</code> — the percentage change, rounded to 1 decimal. Order by month.",
    tables:["orders"], ordered:true,
    refs:["WITH m AS (SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue FROM orders WHERE status = 'completed' AND order_date >= '2023-01-01' AND order_date < '2024-01-01' GROUP BY 1) SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS prev_revenue, ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month), 1) AS growth_pct FROM m ORDER BY month"],
    hint:"Monthly revenue in a CTE, then LAG(revenue) OVER (ORDER BY month); growth = 100.0 * (revenue - prev) / prev.",
    review:[6, 10, 20],
    followups:[
      { q:"Look at your output: March 2023 is missing, so April is being compared with February. How would you make every month appear, with zero revenue where there were no orders?",
        a:"Generate a month spine (recursive CTE or a date dimension) and LEFT JOIN the monthly revenue to it with COALESCE(revenue, 0). Then LAG compares true neighbours — and you need NULLIF on the divisor, because the previous month can now be 0." },
      { q:"Why 100.0 rather than 100 in the growth formula?",
        a:"In SQLite (and Postgres) integer ÷ integer truncates, so the percentage would be floored to a whole number or to 0. Making one operand a decimal forces real division. Snowflake and BigQuery return a decimal from / anyway, but writing it explicitly is portable." }
    ] },

  { id:"iv-s5", track:"sql", level:2, minutes:8, title:"Time to first order",
    prompt:"For each customer who has ordered: <code>name</code>, <code>first_order</code> (their earliest order date) and <code>days_to_first</code> — whole days from signup to that first order.",
    tables:["customers","orders"],
    refs:["SELECT c.name, MIN(o.order_date) AS first_order, CAST(julianday(MIN(o.order_date)) - julianday(c.signup_date) AS INTEGER) AS days_to_first FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name, c.signup_date"],
    hint:"JOIN, GROUP BY the customer, MIN(order_date); days = julianday(first) - julianday(signup_date).",
    review:[3, 10],
    followups:[
      { q:"There's no MEDIAN function here. How would you compute the median days_to_first in plain SQL?",
        a:"Number the rows by days_to_first with ROW_NUMBER() and count them with COUNT(*) OVER (); the median is the middle row — or the average of the two middle rows — i.e. rows where rn IN ((n + 1) / 2, (n + 2) / 2). Warehouses have PERCENTILE_CONT(0.5) / MEDIAN / APPROX_QUANTILES." },
      { q:"The join is on customer and you GROUP BY c.id, c.name, c.signup_date. Why group by more than the id?",
        a:"Standard SQL requires every non-aggregated SELECT column to be in the GROUP BY (or functionally dependent on it). SQLite would let you get away with just the id and pick arbitrary values; Snowflake and BigQuery will reject the query." }
    ] },

  { id:"iv-s6", track:"sql", level:3, minutes:12, title:"Repeat buyers and their rhythm",
    prompt:"Among customers with <strong>at least two completed orders</strong>: <code>customer_id</code>, <code>orders</code> (how many completed orders) and <code>avg_gap_days</code> — the average number of days between consecutive completed orders, rounded to 1 decimal.",
    tables:["orders"],
    refs:["WITH o AS (SELECT customer_id, order_date, LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_date FROM orders WHERE status = 'completed') SELECT customer_id, COUNT(*) + 1 AS orders, ROUND(AVG(julianday(order_date) - julianday(prev_date)), 1) AS avg_gap_days FROM o WHERE prev_date IS NOT NULL GROUP BY customer_id"],
    hint:"LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) gives the previous order; average the gaps where it isn't NULL. N gaps means N + 1 orders.",
    review:[6, 14, 19],
    followups:[
      { q:"You could have found the 'previous order' with a self-join instead of LAG. Why is the window version the better answer?",
        a:"The self-join needs a correlated MAX (the latest earlier order) or a non-equi join, which is roughly quadratic per customer and easy to get wrong on ties. LAG does one sort per partition and reads the neighbour directly — clearer and far cheaper." },
      { q:"This runs nightly on a billion-row orders table in a warehouse. How do you keep it from re-reading everything every night?",
        a:"Make it incremental: only customers who ordered since the last run can have changed, so recompute just those customer_ids and MERGE them into the result table. Clustering/partitioning the orders by date keeps the 'what's new' scan small; clustering by customer_id helps the per-customer recompute." }
    ] },

  { id:"iv-s7", track:"sql", level:3, minutes:12, title:"Best sellers per category — with ties",
    prompt:"By units sold (sum of <code>order_items.quantity</code>), return the products ranked <strong>1st or 2nd in their category</strong>: <code>category</code>, <code>name</code>, <code>units</code>. Products that tie share a rank, so a category can return more than two rows.",
    tables:["order_items","products"],
    refs:["WITH s AS (SELECT p.category, p.name, SUM(i.quantity) AS units FROM order_items i JOIN products p ON p.id = i.product_id GROUP BY p.category, p.name), r AS (SELECT *, RANK() OVER (PARTITION BY category ORDER BY units DESC) AS rk FROM s) SELECT category, name, units FROM r WHERE rk <= 2"],
    hint:"Aggregate units per product first, then RANK() OVER (PARTITION BY category ORDER BY units DESC) and keep rk <= 2.",
    review:[4, 6, 28],
    followups:[
      { q:"Software returned three rows. Walk me through why — and what ROW_NUMBER would have done instead.",
        a:"Two Software products tie on units for second place; RANK gives both rank 2, so both pass rk <= 2. ROW_NUMBER would number them 2 and 3 in an arbitrary order and silently drop one — a nondeterministic result that can change between runs." },
      { q:"A product that has never been sold doesn't appear at all. If the business wanted it listed with 0 units, what would you change?",
        a:"Start FROM products and LEFT JOIN order_items, with COALESCE(SUM(i.quantity), 0) AS units. The inner join only produces products that have at least one order line." }
    ] },

  // ── Data-engineering track ─────────────────────────────────────────────
  { id:"iv-d1", track:"de", level:2, minutes:8, title:"Deduplicate a raw feed",
    prompt:"<code>raw_production_events</code> receives re-sent and corrected rows. For every <code>event_id</code> that appears <strong>more than once</strong>, return only its most recently loaded version: <code>event_id</code>, <code>qty_good</code>, <code>qty_scrap</code>, <code>loaded_at</code>.",
    tables:["raw_production_events"],
    refs:["WITH r AS (SELECT event_id, qty_good, qty_scrap, loaded_at, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY loaded_at DESC) AS rn, COUNT(*) OVER (PARTITION BY event_id) AS copies FROM raw_production_events) SELECT event_id, qty_good, qty_scrap, loaded_at FROM r WHERE rn = 1 AND copies > 1"],
    hint:"ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY loaded_at DESC) for 'latest', plus COUNT(*) OVER (PARTITION BY event_id) to keep only ids with duplicates.",
    review:[16, 32, 33],
    followups:[
      { q:"Why doesn't SELECT DISTINCT solve this?",
        a:"DISTINCT only collapses rows that are identical in every column. A correction has different quantities (and every re-send has a different loaded_at), so both versions survive. You need 'one row per key, chosen by a rule' — which is ROW_NUMBER with an explicit ORDER BY." },
      { q:"How would you write the same thing in Snowflake or BigQuery, and how would the production pipeline keep the table deduplicated as new batches arrive?",
        a:"QUALIFY ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY loaded_at DESC) = 1 — no subquery. Incrementally: dedupe the new batch the same way, then MERGE into the target on event_id (update when matched, insert when not), which is what a dbt incremental model with a unique_key does." }
    ] },

  { id:"iv-d2", track:"de", level:2, minutes:8, title:"Referential-integrity report",
    prompt:"Some rows in <code>raw_defects</code> reference an <code>event_id</code> that doesn't exist in <code>raw_production_events</code>. Report them by defect code: <code>defect_code</code> and <code>orphans</code> (how many).",
    tables:["raw_defects","raw_production_events"],
    refs:["SELECT d.defect_code, COUNT(*) AS orphans FROM raw_defects d WHERE NOT EXISTS (SELECT 1 FROM raw_production_events e WHERE e.event_id = d.event_id) GROUP BY d.defect_code"],
    hint:"Anti-join raw_defects to raw_production_events (NOT EXISTS), then GROUP BY defect_code.",
    review:[11, 27, 32, 34],
    followups:[
      { q:"You've found orphans. What should the pipeline actually do with them?",
        a:"Neither pass them on nor drop them silently. Route them to a quarantine table with a reason, load the valid rows, and alert on the count — so raw = loaded + quarantined always reconciles and someone can review or release them." },
      { q:"Often the parent isn't missing, just late. How does that change your design?",
        a:"Quarantine becomes a waiting room: re-check quarantined rows on every run and release them once the parent arrives (or load the fact with an 'unknown' placeholder dimension key and repair it later). You also set a time limit after which a still-orphaned row is escalated as a real data error." }
    ] },

  { id:"iv-d3", track:"de", level:3, minutes:15, title:"Gaps and islands — runs of bad days",
    prompt:"Using <code>fact_production</code>: for line <strong>BOI-L1</strong>, find every run of <strong>consecutive production dates</strong> on which the daily first-pass yield (good ÷ (good + scrap)) was below <strong>88.5%</strong>. Return <code>start_date</code>, <code>end_date</code> and <code>days</code> for each run.",
    tables:["raw_lines"], models:["fact_production"], setupFrom:"39.4",
    refs:["WITH daily AS (SELECT production_date, 100.0 * SUM(qty_good) / SUM(qty_good + qty_scrap) AS fpy FROM fact_production WHERE line_code = 'BOI-L1' GROUP BY production_date), low AS (SELECT production_date, julianday(production_date) - ROW_NUMBER() OVER (ORDER BY production_date) AS grp FROM daily WHERE fpy < 88.5) SELECT MIN(production_date) AS start_date, MAX(production_date) AS end_date, COUNT(*) AS days FROM low GROUP BY grp"],
    hint:"Daily FPY in a CTE; keep the bad days; then julianday(date) - ROW_NUMBER() OVER (ORDER BY date) is constant within a run of consecutive dates — GROUP BY it.",
    review:[14, 28, 39],
    followups:[
      { q:"Explain why subtracting a row number from the date identifies a run.",
        a:"Within a run of consecutive dates, the date and the row number both increase by exactly 1 per row, so their difference is constant. When a day is skipped the date jumps but the row number doesn't, so the difference changes — each distinct difference is one island." },
      { q:"The line doesn't run every day. If you wanted Friday and the following Monday to count as consecutive, what would you change?",
        a:"Number the line's production days instead of calendar days: give every date the line produced a ROW_NUMBER (a working-day sequence), and use that sequence minus the row number among bad days. Consecutive then means 'next day the line ran'." }
    ] },

  { id:"iv-d4", track:"de", level:2, minutes:8, title:"As-of lookup on an SCD2 dimension",
    prompt:"<code>dim_supplier</code> is a Type-2 dimension (<code>valid_from</code>, <code>valid_to</code>, <code>is_current</code>; an open version has <code>valid_to</code> NULL). Return every supplier's <code>supplier_code</code> and the <code>rating</code> that was in effect on <strong>2025-01-10</strong>.",
    tables:["raw_suppliers"], models:["dim_supplier"], setupFrom:"36.4",
    refs:["SELECT supplier_code, rating FROM dim_supplier WHERE valid_from <= '2025-01-10' AND (valid_to IS NULL OR valid_to > '2025-01-10')"],
    hint:"WHERE valid_from <= '2025-01-10' AND (valid_to IS NULL OR valid_to > '2025-01-10')",
    review:[24, 26, 35, 36],
    followups:[
      { q:"Your filter treats valid_to as exclusive. Why are the ranges half-open rather than BETWEEN valid_from AND valid_to?",
        a:"With inclusive ends, the day a version changes belongs to both the old and the new row, so an as-of join returns two rows and doubles the fact. Half-open ranges (from ≤ d < to) tile the timeline with no gap and no overlap, so every date matches exactly one version." },
      { q:"How would you write a test that proves this dimension has no overlapping versions?",
        a:"Self-join the dimension on supplier_code where the rows differ and the ranges intersect (a.valid_from < COALESCE(b.valid_to, '9999-12-31') AND b.valid_from < COALESCE(a.valid_to, '9999-12-31')) — it must return zero rows. Or with LEAD: next valid_from must equal this row's valid_to. Plus: exactly one is_current row per supplier." }
    ] },

  { id:"iv-d5", track:"de", level:3, minutes:15, title:"Zero-filled daily series",
    prompt:"Using <code>fact_production</code>, <code>dim_line</code> and <code>dim_date</code>: total <code>units</code> (good + scrap) per plant per day for <strong>2025-01-17 through 2025-01-19</strong> — with a row for <em>every</em> plant on <em>every</em> day, showing 0 when a plant produced nothing. Return <code>date_key</code>, <code>plant_code</code>, <code>units</code> (9 rows).",
    tables:["raw_plants"], models:["fact_production","dim_line","dim_date"], setupFrom:"39.4",
    refs:["SELECT dd.date_key, p.plant_code, COALESCE(SUM(f.qty_good + f.qty_scrap), 0) AS units FROM dim_date dd CROSS JOIN (SELECT DISTINCT plant_code FROM dim_line) p LEFT JOIN dim_line l ON l.plant_code = p.plant_code LEFT JOIN fact_production f ON f.line_code = l.line_code AND f.production_date = dd.date_key WHERE dd.date_key BETWEEN '2025-01-17' AND '2025-01-19' GROUP BY dd.date_key, p.plant_code"],
    hint:"Build the full grid first — dim_date CROSS JOIN the distinct plants — then LEFT JOIN the facts onto it and COALESCE the sum to 0.",
    review:[11, 15, 35, 39],
    followups:[
      { q:"Why does the CROSS JOIN have to come before the LEFT JOIN to the fact?",
        a:"A fact table only has rows for things that happened. To show what didn't happen you must first create every (day, plant) combination — the 'spine' — and then attach facts to it. Starting from the fact, the missing combinations simply don't exist to be shown." },
      { q:"If you needed only shift A's units, where would that condition go — WHERE or ON — and what happens if you pick the wrong one?",
        a:"In the ON clause of the LEFT JOIN to the fact. In WHERE, the NULL-extended rows for zero-production days fail the test (NULL = 'A' isn't true) and are removed, turning the LEFT JOIN into an inner join and losing the zero rows." }
    ] },

  { id:"iv-d6", track:"de", level:2, minutes:8, title:"One unit of measure",
    prompt:"<code>raw_deliveries.qty</code> is in kilograms for some rows and pounds for others — and <code>uom</code> is spelled inconsistently (<code>KG</code>, <code>kg</code>, <code>LB</code>, <code>LBS</code>…). For aluminum ingot (<code>part_no = 'MAT-ALU-01'</code>) return each <code>supplier_code</code> and <code>total_kg</code> delivered, converting pounds at <strong>0.453592</strong> kg/lb and rounding to 1 decimal.",
    tables:["raw_deliveries"],
    refs:["SELECT supplier_code, ROUND(SUM(CASE WHEN UPPER(TRIM(uom)) IN ('LB', 'LBS') THEN qty * 0.453592 ELSE qty END), 1) AS total_kg FROM raw_deliveries WHERE part_no = 'MAT-ALU-01' GROUP BY supplier_code"],
    hint:"SUM(CASE WHEN UPPER(TRIM(uom)) IN ('LB','LBS') THEN qty * 0.453592 ELSE qty END), grouped by supplier.",
    review:[16, 34],
    followups:[
      { q:"Where in a layered warehouse should this conversion live, and why not just in this report?",
        a:"In the staging model for deliveries — once. If each report converts units itself, one of them eventually forgets, or uses a different factor. Fixing it at the bottom of the stack means everything above reads a single conformed qty_kg column." },
      { q:"How would you make sure nobody reintroduces mixed units next quarter?",
        a:"A data test on the staging model: accepted_values on the standardized uom column, plus a sanity range on cost_per_kg per material (a price per pound sneaking in shows up as a ~2.2× outlier). A new, unmapped unit label should fail the build rather than default silently." }
    ] }
];

if (typeof module !== 'undefined' && module.exports) module.exports = INTERVIEW_BANK;
