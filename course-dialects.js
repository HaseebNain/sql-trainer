// SQL Quest — Warehouse Dialects track (Days 29–31).
//
// Loaded after data.js; appends three days to `curriculum`. Everything so far
// ran on SQLite — production warehouses are Snowflake and BigQuery, and the
// differences are exactly what trips people up in their first week on the job
// (and in interviews). Each lesson here is a two-step:
//
//   1. Solve it in SQLite — graded for real by result-set equivalence. The
//      reference is INLINE on the lesson (`refs`, plus `setup`/`probe` for
//      state lessons), not in refs.js.
//   2. Translate it — `translate` lists one or two warehouse targets. A
//      translation can't be executed here, so dialect.js checks it
//      structurally (required constructs present, SQLite-isms gone) and then
//      shows the `model` answer.
//
// `node tools/verify.js` checks that every model translation passes its own
// check and that the SQLite reference does NOT pass as a translation.

(function () {
  const R = String.raw;

  // Side-by-side syntax table used in lesson theory.
  const compare = rows => `<table class="dialect-table"><thead><tr><th></th><th>SQLite (here)</th><th>Snowflake</th><th>BigQuery</th></tr></thead><tbody>${
    rows.map(r => `<tr><th>${r[0]}</th>${r.slice(1).map(c => `<td><code>${c}</code></td>`).join('')}</tr>`).join('')}</tbody></table>`;

  curriculum.push(
  {
    day: 29, title: "Dialects I — Windows, Dates & NULL Math", lessons: [
      { id:"29.1", title:"QUALIFY — Filter on a Window", concept:"QUALIFY",
        theory:`<p>You can't put a window function in <code>WHERE</code> — it runs before windows are computed. So in SQLite (and Postgres, MySQL) "latest row per group" needs a CTE or subquery just to filter on <code>ROW_NUMBER()</code>.</p><p>Snowflake and BigQuery add <strong><code>QUALIFY</code></strong>: a filter that runs <em>after</em> window functions, the way <code>HAVING</code> runs after <code>GROUP BY</code>. It turns the most common warehouse pattern — dedupe / latest-per-key — into one statement. You will see it in every dbt project.</p>${compare([
          ['Filter on a window', 'WITH r AS (… ROW_NUMBER() … AS rn)<br>SELECT … FROM r WHERE rn = 1', 'SELECT … FROM t<br>QUALIFY ROW_NUMBER() OVER (…) = 1', 'same as Snowflake']
        ])}<p>Clause order to memorise: <code>WHERE → GROUP BY → HAVING → QUALIFY → ORDER BY</code>.</p>`,
        chips:[{t:"QUALIFY",c:"chip-purple"},{t:"ROW_NUMBER()",c:"chip-blue"},{t:"latest per key",c:"chip-green"}],
        task:"SQLite first: for each customer return their most recent order — customer_id, order_date, total. One row per customer (break ties on the higher order id).",
        starter:"-- Step 1 (SQLite): rank each customer's orders newest-first, keep rank 1\nWITH ranked AS (\n  SELECT customer_id, order_date, total,\n         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn\n  FROM orders\n)\nSELECT * FROM ranked;   -- keep only each customer's newest order\n",
        hint:"Finish with: SELECT customer_id, order_date, total FROM ranked WHERE rn = 1;", xp:45, tables:["orders"],
        refs:[
          "WITH ranked AS (SELECT customer_id, order_date, total, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn FROM orders) SELECT customer_id, order_date, total FROM ranked WHERE rn = 1"
        ],
        translate:[
          { dialect:"warehouse", prompt:"Rewrite it for Snowflake / BigQuery as ONE statement — no CTE, no subquery. Filter on the window directly with QUALIFY.",
            starts:"select",
            requires:[
              { re:R`\bqualify\b`, msg:"Filter the window with <code>QUALIFY</code> — that's the clause this lesson is about." },
              { re:R`row_number\s*\(\s*\)\s*over\s*\(`, msg:"Keep the <code>ROW_NUMBER() OVER (PARTITION BY … ORDER BY …)</code> — it just moves into the QUALIFY." },
              { re:R`partition\s+by\s+(\w+\.)?customer_id`, msg:"The window still needs <code>PARTITION BY customer_id</code> — one winner per customer." }
            ],
            forbids:[
              { re:R`^\s*with\b|\bfrom\s*\(`, msg:"No CTE or subquery needed any more — that's the whole point of <code>QUALIFY</code>. Select straight from <code>orders</code>." }
            ],
            model:"SELECT customer_id, order_date, total\nFROM orders\nQUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) = 1;" }
        ],
        exercises:[
          { id:"29.1.e1", prompt:"Same pattern, SQLite: the two highest-paid employees in each department — first_name, department, salary.",
            validate:{ rowCount:8, hasCols:["first_name","department","salary"] },
            _ref:"WITH r AS (SELECT first_name, department, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn FROM employees) SELECT first_name, department, salary FROM r WHERE rn <= 2;",
            hint:"ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) in a CTE, then WHERE rn <= 2. In a warehouse: QUALIFY … <= 2.", xp:12 }
        ] },

      { id:"29.2", title:"DATE_TRUNC — Bucketing by Month", concept:"Date Truncation",
        theory:`<p>Every time-series report starts by snapping dates to the start of a period. The idea is identical everywhere; the spelling is not — and the argument order is <em>reversed</em> between the two big warehouses, which bites everyone once.</p>${compare([
          ['First day of month', "date(d, 'start of month')", "DATE_TRUNC('month', d)", 'DATE_TRUNC(d, MONTH)'],
          ['Format as text', "strftime('%Y-%m', d)", "TO_CHAR(d, 'YYYY-MM')", "FORMAT_DATE('%Y-%m', d)"],
          ['Year number', "CAST(strftime('%Y', d) AS INT)", 'YEAR(d)', 'EXTRACT(YEAR FROM d)']
        ])}<p>Prefer truncating to a real <strong>date</strong> over formatting to text: the result still sorts, joins to a date dimension, and works in date math. Snowflake takes the part as a string first; BigQuery takes the column first and the part as a bare keyword.</p>`,
        chips:[{t:"DATE_TRUNC",c:"chip-blue"},{t:"start of month",c:"chip-cyan"},{t:"argument order",c:"chip-amber"}],
        task:"SQLite first: revenue from completed orders for each month of 2023 — month_start (the first day of the month, e.g. 2023-03-01) and revenue.",
        starter:"-- Step 1 (SQLite): date(order_date, 'start of month') snaps a date to the 1st\nSELECT date(order_date, 'start of month') AS month_start\nFROM orders\nWHERE status = 'completed';\n",
        hint:"SELECT date(order_date, 'start of month') AS month_start, SUM(total) AS revenue FROM orders WHERE status = 'completed' AND order_date >= '2023-01-01' AND order_date < '2024-01-01' GROUP BY month_start;", xp:45, tables:["orders"],
        refs:[
          "SELECT date(order_date, 'start of month') AS month_start, SUM(total) AS revenue FROM orders WHERE status = 'completed' AND order_date >= '2023-01-01' AND order_date < '2024-01-01' GROUP BY 1"
        ],
        translate:[
          { dialect:"snowflake", prompt:"Now Snowflake: same result, bucketing with DATE_TRUNC (part first, as a string).",
            starts:"select",
            requires:[
              { re:R`date_trunc\s*\(\s*'month'\s*,`, msg:"Snowflake: <code>DATE_TRUNC('month', order_date)</code> — the part comes first, as a string." },
              { re:R`sum\s*\(`, msg:"Still aggregate the revenue with <code>SUM(total)</code>." },
              { re:R`group\s+by`, msg:"Still one row per month — keep the <code>GROUP BY</code>." }
            ],
            forbids:[
              { re:R`date_trunc\s*\(\s*(\w+\.)?order_date\s*,`, msg:"That's BigQuery's argument order. Snowflake wants the part first: <code>DATE_TRUNC('month', order_date)</code>." }
            ],
            model:"SELECT DATE_TRUNC('month', order_date) AS month_start, SUM(total) AS revenue\nFROM orders\nWHERE status = 'completed'\n  AND order_date >= '2023-01-01' AND order_date < '2024-01-01'\nGROUP BY 1;" },
          { dialect:"bigquery", prompt:"And BigQuery: column first, then the part as a bare keyword.",
            starts:"select",
            requires:[
              { re:R`date_trunc\s*\(\s*(\w+\.)?order_date\s*,\s*month\s*\)`, msg:"BigQuery: <code>DATE_TRUNC(order_date, MONTH)</code> — column first, and <code>MONTH</code> is a keyword, not a string." },
              { re:R`sum\s*\(`, msg:"Still aggregate the revenue with <code>SUM(total)</code>." },
              { re:R`group\s+by`, msg:"Still one row per month — keep the <code>GROUP BY</code>." }
            ],
            forbids:[
              { re:R`date_trunc\s*\(\s*'`, msg:"That's Snowflake's form. BigQuery: <code>DATE_TRUNC(order_date, MONTH)</code> — no quotes around the part, and it goes second." }
            ],
            model:"SELECT DATE_TRUNC(order_date, MONTH) AS month_start, SUM(total) AS revenue\nFROM orders\nWHERE status = 'completed'\n  AND order_date >= '2023-01-01' AND order_date < '2024-01-01'\nGROUP BY 1;" }
        ],
        exercises:[
          { id:"29.2.e1", prompt:"SQLite: how many customers signed up in each quarter-opening month? Return month_start and signups for signup months 01, 04, 07 and 10 only.",
            validate:{ rowCount:6, hasCols:["month_start","signups"] },
            _ref:"SELECT date(signup_date, 'start of month') AS month_start, COUNT(*) AS signups FROM customers WHERE strftime('%m', signup_date) IN ('01','04','07','10') GROUP BY 1;",
            hint:"date(signup_date, 'start of month') AS month_start … WHERE strftime('%m', signup_date) IN ('01','04','07','10') GROUP BY 1", xp:12 }
        ] },

      { id:"29.3", title:"DATEDIFF — Elapsed Time", concept:"Date Arithmetic",
        theory:`<p>"How many days between two dates?" is in almost every pipeline — tenure, time-to-ship, days-since-last-order. SQLite has no date type, so you subtract Julian day numbers. Warehouses have a real function — but again with different names and <strong>different argument order</strong>.</p>${compare([
          ['Days between', 'julianday(b) - julianday(a)', "DATEDIFF('day', a, b)", 'DATE_DIFF(b, a, DAY)'],
          ['Add 30 days', "date(d, '+30 days')", "DATEADD('day', 30, d)", 'DATE_ADD(d, INTERVAL 30 DAY)'],
          ['Today', "date('now')", 'CURRENT_DATE', 'CURRENT_DATE()']
        ])}<p>Snowflake: <code>DATEDIFF(part, start, end)</code>. BigQuery: <code>DATE_DIFF(end, start, part)</code> — underscore, <em>end date first</em>. Swap them and every number goes negative; nothing errors. One more trap: both count <em>boundaries crossed</em>, so <code>DATEDIFF('year', '2023-12-31', '2024-01-01')</code> is 1.</p>`,
        chips:[{t:"DATEDIFF",c:"chip-blue"},{t:"DATE_DIFF",c:"chip-cyan"},{t:"end − start",c:"chip-amber"}],
        task:"SQLite first: each employee's tenure in whole days as of 2024-01-01 — first_name and days_employed.",
        starter:"-- Step 1 (SQLite): subtract Julian day numbers\nSELECT first_name,\n       julianday('2024-01-01') AS as_of_day\nFROM employees;\n",
        hint:"SELECT first_name, CAST(julianday('2024-01-01') - julianday(hire_date) AS INTEGER) AS days_employed FROM employees;", xp:45, tables:["employees"],
        refs:[
          "SELECT first_name, CAST(julianday('2024-01-01') - julianday(hire_date) AS INTEGER) AS days_employed FROM employees"
        ],
        translate:[
          { dialect:"snowflake", prompt:"Snowflake: DATEDIFF(part, start, end).",
            starts:"select",
            requires:[
              { re:R`datediff\s*\(\s*'?day'?\s*,\s*(\w+\.)?hire_date\s*,`, msg:"Snowflake: <code>DATEDIFF('day', hire_date, '2024-01-01')</code> — part, then <em>start</em>, then end." }
            ],
            forbids:[
              { re:R`date_diff\s*\(`, msg:"<code>DATE_DIFF</code> (with an underscore) is BigQuery. Snowflake spells it <code>DATEDIFF</code>." },
              { re:R`datediff\s*\(\s*'?day'?\s*,\s*(date\s*)?'2024`, msg:"Start and end are swapped — that gives negative tenures. Snowflake order is <code>DATEDIFF('day', start, end)</code>." }
            ],
            model:"SELECT first_name, DATEDIFF('day', hire_date, '2024-01-01') AS days_employed\nFROM employees;" },
          { dialect:"bigquery", prompt:"BigQuery: DATE_DIFF(end, start, part) — note what comes first.",
            starts:"select",
            requires:[
              { re:R`date_diff\s*\(\s*(date\s*)?'2024-01-01'\s*,\s*(\w+\.)?hire_date\s*,\s*day\s*\)`, msg:"BigQuery: <code>DATE_DIFF(DATE '2024-01-01', hire_date, DAY)</code> — <em>end</em> date first, then start, then the part as a keyword." }
            ],
            forbids:[
              { re:R`\bdatediff\s*\(`, msg:"<code>DATEDIFF</code> is Snowflake. BigQuery spells it <code>DATE_DIFF</code>, with the end date first." }
            ],
            model:"SELECT first_name, DATE_DIFF(DATE '2024-01-01', hire_date, DAY) AS days_employed\nFROM employees;" }
        ],
        exercises:[
          { id:"29.3.e1", prompt:"SQLite: for each order placed within 90 days of the customer's signup, return the order id and days_after_signup.",
            validate:{ rowCount:10, hasCol:"days_after_signup" },
            _ref:"SELECT o.id, CAST(julianday(o.order_date) - julianday(c.signup_date) AS INTEGER) AS days_after_signup FROM orders o JOIN customers c ON c.id = o.customer_id WHERE julianday(o.order_date) - julianday(c.signup_date) BETWEEN 0 AND 90;",
            hint:"JOIN customers, then WHERE julianday(o.order_date) - julianday(c.signup_date) BETWEEN 0 AND 90", xp:12 }
        ] },

      { id:"29.4", title:"Conditional Counts & Safe Division", concept:"COUNT_IF · SAFE_DIVIDE",
        theory:`<p>Rates — cancel rate, defect rate, conversion — are a conditional count divided by a count. Two things go wrong: <strong>integer division</strong> and <strong>divide-by-zero</strong>.</p><p>In SQLite <code>3 / 4</code> is <code>0</code> (integers truncate), so you write <code>1.0 * a / b</code>, and you guard the divisor with <code>NULLIF(b, 0)</code>. Snowflake and BigQuery both return a decimal from <code>/</code>, but dividing by zero is an <em>error</em> that kills the whole query — hence their safe-division helpers.</p>${compare([
          ['Conditional count', "SUM(CASE WHEN c THEN 1 ELSE 0 END)<br>COUNT(*) FILTER (WHERE c)", 'COUNT_IF(c)', 'COUNTIF(c)'],
          ['Inline if', 'IIF(c, a, b)', 'IFF(c, a, b)', 'IF(c, a, b)'],
          ['Divide, NULL on ÷0', 'a / NULLIF(b, 0)', 'a / NULLIF(b, 0)<br>(DIV0 returns 0)', 'SAFE_DIVIDE(a, b)']
        ])}<p>One underscore of difference: <code>COUNT_IF</code> (Snowflake) vs <code>COUNTIF</code> (BigQuery).</p>`,
        chips:[{t:"COUNT_IF / COUNTIF",c:"chip-blue"},{t:"SAFE_DIVIDE",c:"chip-green"},{t:"NULLIF(x, 0)",c:"chip-amber"}],
        task:"SQLite first: for every sales employee id that appears on an order — employee_id, orders (count), cancelled (count of cancelled orders) and cancel_rate (cancelled ÷ orders, as a decimal).",
        starter:"-- Step 1 (SQLite): mind integer division — 1 / 4 is 0 here\nSELECT employee_id,\n       COUNT(*) AS orders\nFROM orders\nGROUP BY employee_id;\n",
        hint:"SELECT employee_id, COUNT(*) AS orders, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, 1.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) AS cancel_rate FROM orders GROUP BY employee_id;", xp:50, tables:["orders"],
        refs:[
          "SELECT employee_id, COUNT(*) AS orders, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, 1.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) AS cancel_rate FROM orders GROUP BY employee_id"
        ],
        translate:[
          { dialect:"snowflake", prompt:"Snowflake: replace the CASE with COUNT_IF. Keep the divide-by-zero guard.",
            starts:"select",
            requires:[
              { re:R`count_if\s*\(`, msg:"Snowflake's conditional count is <code>COUNT_IF(status = 'cancelled')</code>." },
              { any:[R`nullif\s*\(`, R`div0(null)?\s*\(`], msg:"Guard the division: <code>… / NULLIF(COUNT(*), 0)</code> (or <code>DIV0</code> if 0 is the answer you want)." }
            ],
            forbids:[
              { re:R`\bcountif\s*\(`, msg:"<code>COUNTIF</code> (no underscore) is BigQuery. Snowflake: <code>COUNT_IF</code>." },
              { re:R`case\s+when`, msg:"Drop the <code>CASE WHEN</code> — <code>COUNT_IF(condition)</code> does it in one call." },
              { re:R`safe_divide\s*\(`, msg:"<code>SAFE_DIVIDE</code> is BigQuery. In Snowflake guard with <code>NULLIF(divisor, 0)</code>." }
            ],
            model:"SELECT employee_id,\n       COUNT(*) AS orders,\n       COUNT_IF(status = 'cancelled') AS cancelled,\n       COUNT_IF(status = 'cancelled') / NULLIF(COUNT(*), 0) AS cancel_rate\nFROM orders\nGROUP BY employee_id;" },
          { dialect:"bigquery", prompt:"BigQuery: COUNTIF for the count, SAFE_DIVIDE for the rate.",
            starts:"select",
            requires:[
              { re:R`countif\s*\(`, msg:"BigQuery's conditional count is <code>COUNTIF(status = 'cancelled')</code> — no underscore." },
              { re:R`safe_divide\s*\(`, msg:"Use <code>SAFE_DIVIDE(numerator, denominator)</code> — it returns NULL instead of erroring on ÷0." }
            ],
            forbids:[
              { re:R`count_if\s*\(`, msg:"<code>COUNT_IF</code> (with an underscore) is Snowflake. BigQuery: <code>COUNTIF</code>." },
              { re:R`case\s+when`, msg:"Drop the <code>CASE WHEN</code> — <code>COUNTIF(condition)</code> does it in one call." }
            ],
            model:"SELECT employee_id,\n       COUNT(*) AS orders,\n       COUNTIF(status = 'cancelled') AS cancelled,\n       SAFE_DIVIDE(COUNTIF(status = 'cancelled'), COUNT(*)) AS cancel_rate\nFROM orders\nGROUP BY employee_id;" }
        ],
        exercises:[
          { id:"29.4.e1", prompt:"SQLite: for each product category — products (count) and pct_in_stock: the percentage of its products with stock below 999, rounded to 1 decimal.",
            validate:{ rowCount:3, hasCols:["products","pct_in_stock"] },
            _ref:"SELECT category, COUNT(*) AS products, ROUND(100.0 * SUM(CASE WHEN stock < 999 THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_in_stock FROM products GROUP BY category;",
            hint:"ROUND(100.0 * SUM(CASE WHEN stock < 999 THEN 1 ELSE 0 END) / COUNT(*), 1)", xp:12 }
        ] }
    ]
  },
  {
    day: 30, title: "Dialects II — MERGE, Arrays & JSON", lessons: [
      { id:"30.1", title:"MERGE — The Warehouse Upsert", concept:"MERGE",
        liveSetup:true, models:["dim_product"],
        setup:"DROP TABLE IF EXISTS dim_product; CREATE TABLE dim_product (id INTEGER PRIMARY KEY, name TEXT, price REAL); INSERT INTO dim_product SELECT id, name, price FROM products WHERE id <= 7; UPDATE dim_product SET price = price - 50 WHERE id IN (2, 4);",
        probe:"SELECT id, name, price FROM dim_product ORDER BY id",
        theory:`<p>On Day 22 you upserted with <code>INSERT … ON CONFLICT DO UPDATE</code>. That syntax needs a declared primary key — and warehouses don't enforce keys at all. Their upsert is the ANSI <strong><code>MERGE</code></strong>: join a <em>source</em> to a <em>target</em>, then say what to do for matched and unmatched rows.</p><pre class="theory-code">MERGE INTO target t
USING source s
   ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET name = s.name, price = s.price
WHEN NOT MATCHED THEN
  INSERT (id, name, price) VALUES (s.id, s.name, s.price);</pre><p>The same statement works in Snowflake and BigQuery, and it's what dbt generates for an incremental model. The classic failure: a source with <em>duplicate keys</em> — Snowflake raises a nondeterministic-merge error (BigQuery too), so dedupe the source first.</p><p>A stale copy of the product dimension, <code>dim_product</code>, has been built for you: 7 of the 10 products, two with outdated prices.</p>`,
        chips:[{t:"MERGE INTO … USING",c:"chip-blue"},{t:"WHEN MATCHED",c:"chip-purple"},{t:"WHEN NOT MATCHED",c:"chip-green"}],
        task:"SQLite first: bring dim_product in line with products — insert the 3 missing products and overwrite name and price for the ones that exist. Use an upsert, not DELETE + INSERT.",
        starter:"-- Step 1 (SQLite): dim_product(id PRIMARY KEY, name, price) is stale.\n-- SQLite needs 'WHERE true' between a SELECT source and ON CONFLICT:\n--\n--   INSERT INTO dim_product (id, name, price)\n--   SELECT id, name, price FROM products WHERE true\n--   ON CONFLICT(id) DO UPDATE SET ...;\n\nSELECT * FROM dim_product ORDER BY id;\n",
        hint:"INSERT INTO dim_product (id, name, price) SELECT id, name, price FROM products WHERE true ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price;", xp:55, tables:["products"],
        refs:[
          "INSERT INTO dim_product (id, name, price) SELECT id, name, price FROM products WHERE true ON CONFLICT(id) DO UPDATE SET name = excluded.name, price = excluded.price",
          "INSERT OR REPLACE INTO dim_product (id, name, price) SELECT id, name, price FROM products"
        ],
        translate:[
          { dialect:"warehouse", prompt:"Now write the same upsert as a MERGE — target dim_product, source products. This exact statement runs on both Snowflake and BigQuery.",
            starts:"merge",
            requires:[
              { re:R`^merge\s+(into\s+)?dim_product\b`, msg:"Start with <code>MERGE INTO dim_product</code> — the table being changed is the target." },
              { re:R`\busing\s+products\b`, msg:"Name the source: <code>USING products s</code>." },
              { re:R`\bon\s+\(?\s*\w+\.id\s*=\s*\w+\.id`, msg:"Join source to target on the key: <code>ON t.id = s.id</code>." },
              { re:R`when\s+matched\s+then\s+update\s+set`, msg:"Existing rows: <code>WHEN MATCHED THEN UPDATE SET name = s.name, price = s.price</code>." },
              { re:R`when\s+not\s+matched\s+then\s+insert`, msg:"New rows: <code>WHEN NOT MATCHED THEN INSERT (id, name, price) VALUES (s.id, s.name, s.price)</code>." }
            ],
            forbids:[],
            model:"MERGE INTO dim_product t\nUSING products s\n   ON t.id = s.id\nWHEN MATCHED THEN\n  UPDATE SET name = s.name, price = s.price\nWHEN NOT MATCHED THEN\n  INSERT (id, name, price) VALUES (s.id, s.name, s.price);" }
        ],
        exercises:[
          { id:"30.1.e1", prompt:"Before merging, measure the drift: which products are missing from dim_product? Return their id and name.",
            validate:{ rowCount:3, hasCols:["id","name"] },
            _ref:"SELECT p.id, p.name FROM products p LEFT JOIN dim_product d ON d.id = p.id WHERE d.id IS NULL;",
            hint:"Anti-join: products LEFT JOIN dim_product … WHERE d.id IS NULL", xp:12 },
          { id:"30.1.e2", prompt:"And which rows exist in both but with a different price? Return id, the dim price as old_price and the product price as new_price.",
            validate:{ rowCount:2, hasCols:["old_price","new_price"] },
            _ref:"SELECT p.id, d.price AS old_price, p.price AS new_price FROM products p JOIN dim_product d ON d.id = p.id WHERE d.price <> p.price;",
            hint:"JOIN on id, WHERE d.price <> p.price", xp:12 }
        ] },

      { id:"30.2", title:"LISTAGG & STRING_AGG — Rolling Rows Up", concept:"String Aggregation",
        theory:`<p>Collapsing many rows into one delimited string — "all the SKUs on this order", "every tag on this ticket" — is the same idea everywhere with three different names.</p>${compare([
          ['Rows → string', "group_concat(x, ', ' ORDER BY x)", "LISTAGG(x, ', ')<br>WITHIN GROUP (ORDER BY x)", "STRING_AGG(x, ', ' ORDER BY x)"],
          ['Rows → array', 'json_group_array(x)', 'ARRAY_AGG(x)<br>WITHIN GROUP (ORDER BY x)', 'ARRAY_AGG(x ORDER BY x)']
        ])}<p>Always give it an order — without one the result is nondeterministic, and a "random" change in a string column will fail your data-diff tests. Snowflake puts the order in a separate <code>WITHIN GROUP</code> clause; BigQuery puts it inside the parentheses.</p><p>In a real warehouse prefer <code>ARRAY_AGG</code> over a delimited string: arrays keep their types and can be un-nested again (next lesson).</p>`,
        chips:[{t:"LISTAGG",c:"chip-blue"},{t:"STRING_AGG",c:"chip-cyan"},{t:"WITHIN GROUP",c:"chip-purple"}],
        task:"SQLite first: one row per department with team — its employees' first names in alphabetical order, separated by a comma and a space.",
        starter:"-- Step 1 (SQLite): group_concat accepts ORDER BY inside the call\nSELECT department\nFROM employees\nGROUP BY department;\n",
        hint:"SELECT department, group_concat(first_name, ', ' ORDER BY first_name) AS team FROM employees GROUP BY department;", xp:45, tables:["employees"],
        refs:[
          "SELECT department, group_concat(first_name, ', ' ORDER BY first_name) AS team FROM employees GROUP BY department"
        ],
        translate:[
          { dialect:"snowflake", prompt:"Snowflake: LISTAGG, with the ordering in WITHIN GROUP.",
            starts:"select",
            requires:[
              { re:R`listagg\s*\(`, msg:"Snowflake: <code>LISTAGG(first_name, ', ')</code>." },
              { re:R`within\s+group\s*\(\s*order\s+by`, msg:"Give it a deterministic order: <code>WITHIN GROUP (ORDER BY first_name)</code>." },
              { re:R`group\s+by`, msg:"Still one row per department — keep the <code>GROUP BY</code>." }
            ],
            forbids:[
              { re:R`string_agg\s*\(`, msg:"<code>STRING_AGG</code> is BigQuery (and Postgres). Snowflake: <code>LISTAGG</code>." }
            ],
            model:"SELECT department,\n       LISTAGG(first_name, ', ') WITHIN GROUP (ORDER BY first_name) AS team\nFROM employees\nGROUP BY department;" },
          { dialect:"bigquery", prompt:"BigQuery: STRING_AGG, with ORDER BY inside the parentheses.",
            starts:"select",
            requires:[
              { re:R`string_agg\s*\([^)]*order\s+by`, msg:"BigQuery: <code>STRING_AGG(first_name, ', ' ORDER BY first_name)</code> — the ORDER BY goes inside the call." },
              { re:R`group\s+by`, msg:"Still one row per department — keep the <code>GROUP BY</code>." }
            ],
            forbids:[
              { re:R`listagg\s*\(|within\s+group`, msg:"<code>LISTAGG … WITHIN GROUP</code> is Snowflake. BigQuery: <code>STRING_AGG(x, ', ' ORDER BY x)</code>." }
            ],
            model:"SELECT department,\n       STRING_AGG(first_name, ', ' ORDER BY first_name) AS team\nFROM employees\nGROUP BY department;" }
        ],
        exercises:[
          { id:"30.2.e1", prompt:"SQLite: for each product category, list its product names from most to least expensive in one string called lineup (separated by ' | ').",
            validate:{ rowCount:3, hasCol:"lineup" },
            _ref:"SELECT category, group_concat(name, ' | ' ORDER BY price DESC) AS lineup FROM products GROUP BY category;",
            hint:"group_concat(name, ' | ' ORDER BY price DESC)", xp:12 }
        ] },

      { id:"30.3", title:"UNNEST & FLATTEN — Exploding Arrays", concept:"Arrays → Rows",
        liveSetup:true, models:["product_tags"],
        setup:"DROP TABLE IF EXISTS product_tags; CREATE TABLE product_tags AS SELECT id AS product_id, name, CASE category WHEN 'Software' THEN '[\"saas\",\"license\"]' WHEN 'Hardware' THEN '[\"physical\",\"ships\",\"warranty\"]' ELSE '[\"people\"]' END AS tags FROM products;",
        theory:`<p>Warehouses store nested data natively: an order row holding an <em>array</em> of line items, an event with an array of tags. To aggregate over the elements you first turn each element into its own row. This is the single most-asked BigQuery interview topic, because GA4 and most event exports are nested.</p>${compare([
          ['Array → rows', 'FROM t, json_each(t.arr) j<br>→ j.value', 'FROM t,<br>LATERAL FLATTEN(input =&gt; t.arr) f<br>→ f.value', 'FROM t<br>CROSS JOIN UNNEST(t.arr) AS x<br>→ x']
        ])}<p>All three are a <strong>correlated cross join</strong>: each row is joined to the elements of <em>its own</em> array. Rows whose array is empty disappear — use <code>LEFT JOIN UNNEST(…)</code> (BigQuery) or <code>FLATTEN(…, OUTER =&gt; TRUE)</code> (Snowflake) to keep them. And remember the fan-out: after exploding, <code>COUNT(*)</code> counts elements, not parent rows.</p><p><code>product_tags</code> has been built for you: one row per product with a JSON array in <code>tags</code>.</p>`,
        chips:[{t:"UNNEST",c:"chip-cyan"},{t:"LATERAL FLATTEN",c:"chip-blue"},{t:"json_each",c:"chip-purple"}],
        task:"SQLite first: explode product_tags into one row per product per tag — name and tag (20 rows).",
        starter:"-- Step 1 (SQLite): json_each() is a table-valued function; join each row to its own array\nSELECT p.name, p.tags\nFROM product_tags p;\n",
        hint:"SELECT p.name, j.value AS tag FROM product_tags p, json_each(p.tags) j;", xp:50, tables:["products"],
        refs:[
          "SELECT p.name, j.value AS tag FROM product_tags p, json_each(p.tags) j"
        ],
        translate:[
          { dialect:"snowflake", prompt:"Snowflake (tags is a VARIANT array): LATERAL FLATTEN, and cast the element with ::string.",
            starts:"select",
            requires:[
              { re:R`lateral\s+flatten\s*\(\s*input\s*=>`, msg:"Snowflake: <code>, LATERAL FLATTEN(input =&gt; p.tags) f</code>." },
              { re:R`\.value\b`, msg:"Each element is in the <code>value</code> column of the flatten: <code>f.value::string AS tag</code>." }
            ],
            forbids:[
              { re:R`\bunnest\s*\(`, msg:"<code>UNNEST</code> is BigQuery. Snowflake: <code>LATERAL FLATTEN(input =&gt; …)</code>." }
            ],
            model:"SELECT p.name, f.value::string AS tag\nFROM product_tags p,\n     LATERAL FLATTEN(input => p.tags) f;" },
          { dialect:"bigquery", prompt:"BigQuery (tags is ARRAY<STRING>): CROSS JOIN UNNEST.",
            starts:"select",
            requires:[
              { re:R`unnest\s*\(\s*(\w+\.)?tags\s*\)`, msg:"BigQuery: <code>CROSS JOIN UNNEST(p.tags) AS tag</code> (a comma works in place of CROSS JOIN)." }
            ],
            forbids:[
              { re:R`\bflatten\s*\(`, msg:"<code>FLATTEN</code> is Snowflake. BigQuery: <code>UNNEST(array)</code>." }
            ],
            model:"SELECT p.name, tag\nFROM product_tags p\nCROSS JOIN UNNEST(p.tags) AS tag;" }
        ],
        exercises:[
          { id:"30.3.e1", prompt:"SQLite: how many products carry each tag? Return tag and products.",
            validate:{ rowCount:6, hasCols:["tag","products"], hasValue:"warranty" },
            _ref:"SELECT j.value AS tag, COUNT(*) AS products FROM product_tags p, json_each(p.tags) j GROUP BY j.value ORDER BY products DESC, tag DESC;",
            hint:"Explode with json_each, then GROUP BY j.value. Software has the most products.", xp:14 }
        ] },

      { id:"30.4", title:"VARIANT, STRUCT & JSON Paths", concept:"Semi-Structured Data",
        liveSetup:true, models:["order_events"],
        setup:"DROP TABLE IF EXISTS order_events; CREATE TABLE order_events AS SELECT id AS order_id, json_object('status', status, 'customer', json_object('id', customer_id), 'total', total) AS payload FROM orders;",
        theory:`<p>Raw events land as JSON. The ELT way is to load them untouched into one column and pull fields out in the staging model — so reading a JSON path is day-one work.</p>${compare([
          ['Read a field', "json_extract(p, '$.status')<br>p -&gt;&gt; '$.status'", 'p:status::string', "JSON_VALUE(p, '$.status')"],
          ['Nested field', "json_extract(p, '$.customer.id')", 'p:customer.id::int', "CAST(JSON_VALUE(p, '$.customer.id') AS INT64)"],
          ['Build an object', "json_object('k', v)", "OBJECT_CONSTRUCT('k', v)", 'STRUCT(v AS k)']
        ])}<p>Snowflake's <code>VARIANT</code> uses a colon to enter the document and dots after that, and you <strong>must cast</strong> (<code>::string</code>, <code>::int</code>) — an uncast variant string keeps its quotes and won't equal <code>'completed'</code>. BigQuery's <code>JSON_VALUE</code> always returns a <code>STRING</code>, so numbers need a <code>CAST</code>.</p><p><code>order_events</code> has been built for you: order_id plus a JSON <code>payload</code> like <code>{"status":"completed","customer":{"id":3},"total":2299.0}</code>.</p>`,
        chips:[{t:"VARIANT  p:a.b::int",c:"chip-blue"},{t:"JSON_VALUE",c:"chip-cyan"},{t:"cast everything",c:"chip-amber"}],
        task:"SQLite first: from order_events, return order_id, status, customer_id and total for orders whose total is above 1000 — all three pulled out of the JSON payload.",
        starter:"-- Step 1 (SQLite): json_extract(payload, '$.path')\nSELECT order_id, payload\nFROM order_events\nLIMIT 5;\n",
        hint:"SELECT order_id, json_extract(payload, '$.status') AS status, json_extract(payload, '$.customer.id') AS customer_id, json_extract(payload, '$.total') AS total FROM order_events WHERE json_extract(payload, '$.total') > 1000;", xp:50, tables:["orders"],
        refs:[
          "SELECT order_id, json_extract(payload, '$.status') AS status, json_extract(payload, '$.customer.id') AS customer_id, json_extract(payload, '$.total') AS total FROM order_events WHERE json_extract(payload, '$.total') > 1000"
        ],
        translate:[
          { dialect:"snowflake", prompt:"Snowflake (payload is VARIANT): colon-and-dot paths, each one cast.",
            starts:"select",
            requires:[
              { re:R`payload:status\s*::\s*(string|varchar|text)`, msg:"Snowflake: <code>payload:status::string</code> — colon into the document, then cast." },
              { re:R`payload:customer\.id\s*::`, msg:"Nested field: <code>payload:customer.id::int</code> — a colon first, dots after." },
              { re:R`payload:total\s*::\s*(float|number|numeric|decimal|double|int)`, msg:"Cast the total before comparing it: <code>payload:total::float &gt; 1000</code>." }
            ],
            forbids:[
              { re:R`json_extract\s*\(|json_value\s*\(|->>`, msg:"No JSON functions needed in Snowflake — use the path syntax <code>payload:field::type</code>." }
            ],
            model:"SELECT order_id,\n       payload:status::string  AS status,\n       payload:customer.id::int AS customer_id,\n       payload:total::float     AS total\nFROM order_events\nWHERE payload:total::float > 1000;" },
          { dialect:"bigquery", prompt:"BigQuery (payload is JSON): JSON_VALUE with a '$.path', casting the numbers.",
            starts:"select",
            requires:[
              { re:R`json_value\s*\(\s*(\w+\.)?payload\s*,\s*'\$\.status'\s*\)`, msg:"BigQuery: <code>JSON_VALUE(payload, '$.status')</code>." },
              { re:R`json_value\s*\(\s*(\w+\.)?payload\s*,\s*'\$\.customer\.id'\s*\)`, msg:"Nested field: <code>JSON_VALUE(payload, '$.customer.id')</code>." },
              { re:R`cast\s*\(\s*json_value\s*\(\s*(\w+\.)?payload\s*,\s*'\$\.total'\s*\)\s*as\s*(float64|numeric|bignumeric|int64)\s*\)`, msg:"<code>JSON_VALUE</code> returns a STRING — cast the total: <code>CAST(JSON_VALUE(payload, '$.total') AS FLOAT64)</code>." }
            ],
            forbids:[
              { re:R`payload\s*:`, msg:"The colon path is Snowflake. BigQuery: <code>JSON_VALUE(payload, '$.field')</code>." },
              { re:R`json_extract\s*\(`, msg:"<code>JSON_EXTRACT</code> is the legacy function and returns JSON, quotes included. For scalars use <code>JSON_VALUE</code>." }
            ],
            model:"SELECT order_id,\n       JSON_VALUE(payload, '$.status') AS status,\n       CAST(JSON_VALUE(payload, '$.customer.id') AS INT64) AS customer_id,\n       CAST(JSON_VALUE(payload, '$.total') AS FLOAT64) AS total\nFROM order_events\nWHERE CAST(JSON_VALUE(payload, '$.total') AS FLOAT64) > 1000;" }
        ],
        exercises:[
          { id:"30.4.e1", prompt:"SQLite: total revenue per status, reading both fields from the payload. Return status and revenue.",
            validate:{ rowCount:3, hasCols:["status","revenue"], hasValue:23922 },
            _ref:"SELECT json_extract(payload, '$.status') AS status, SUM(json_extract(payload, '$.total')) AS revenue FROM order_events GROUP BY 1;",
            hint:"GROUP BY json_extract(payload, '$.status') and SUM the extracted total", xp:14 }
        ] }
    ]
  },
  {
    day: 31, title: "Dialects III — Warehouse-Only Power Tools", lessons: [
      { id:"31.1", title:"PIVOT — Rows to Columns", concept:"PIVOT",
        theory:`<p>On Day 17 you pivoted by hand with conditional aggregation — one <code>SUM(CASE …)</code> per output column. Snowflake and BigQuery both have a <code>PIVOT</code> operator that does the same thing declaratively.</p><pre class="theory-code">SELECT *
FROM (SELECT year, status, id FROM …)      -- only the columns you need
PIVOT (COUNT(id) FOR status IN ('completed', 'cancelled', 'pending'));</pre><p>Three things to know: (1) every column of the input that isn't the aggregate or the pivot column becomes a <em>group key</em> — so select only what you need in the subquery; (2) the value list must be literal (dynamic pivots need scripting or <code>ANY</code> in Snowflake); (3) under the hood it's still conditional aggregation — which is why the manual version remains the portable answer.</p>`,
        chips:[{t:"PIVOT",c:"chip-purple"},{t:"FOR … IN (…)",c:"chip-blue"},{t:"conditional aggregation",c:"chip-cyan"}],
        task:"SQLite first: order counts by status per year — year, completed, cancelled, pending (one row per year).",
        starter:"-- Step 1 (SQLite): one conditional aggregate per output column\nSELECT strftime('%Y', order_date) AS year,\n       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed\nFROM orders\nGROUP BY year;\n",
        hint:"Add SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled and the same for 'pending'.", xp:45, tables:["orders"],
        refs:[
          "SELECT strftime('%Y', order_date) AS year, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending FROM orders GROUP BY 1"
        ],
        translate:[
          { dialect:"warehouse", prompt:"Rewrite it with the PIVOT operator (the same statement works in Snowflake and BigQuery). Use EXTRACT(YEAR FROM order_date) for the year.",
            starts:"select",
            requires:[
              { re:R`\bpivot\s*\(\s*count\s*\(`, msg:"Use the operator: <code>PIVOT (COUNT(id) FOR status IN (…))</code>." },
              { re:R`for\s+status\s+in\s*\(\s*'`, msg:"Name the pivot column and its values: <code>FOR status IN ('completed', 'cancelled', 'pending')</code>." },
              { re:R`from\s*\(\s*select`, msg:"Feed PIVOT a subquery with only the columns you need — year, status, id — or every other column becomes a group key." },
              { any:[R`extract\s*\(\s*year\s+from`, R`\byear\s*\(`], msg:"Derive the year with <code>EXTRACT(YEAR FROM order_date)</code>." }
            ],
            forbids:[
              { re:R`case\s+when`, msg:"No <code>CASE WHEN</code> — <code>PIVOT</code> replaces the conditional aggregates." }
            ],
            model:"SELECT *\nFROM (\n  SELECT EXTRACT(YEAR FROM order_date) AS year, status, id\n  FROM orders\n)\nPIVOT (COUNT(id) FOR status IN ('completed', 'cancelled', 'pending'));" }
        ],
        exercises:[
          { id:"31.1.e1", prompt:"SQLite: pivot revenue instead of counts — for each customer tier, revenue from completed orders in 2022 as y2022 and in 2023 as y2023.",
            validate:{ rowCount:3, hasCols:["y2022","y2023"] },
            _ref:"SELECT c.tier, SUM(CASE WHEN o.order_date LIKE '2022%' THEN o.total ELSE 0 END) AS y2022, SUM(CASE WHEN o.order_date LIKE '2023%' THEN o.total ELSE 0 END) AS y2023 FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed' GROUP BY c.tier;",
            hint:"JOIN customers, then SUM(CASE WHEN order_date LIKE '2022%' THEN total ELSE 0 END) AS y2022 …", xp:14 }
        ] },

      { id:"31.2", title:"ROLLUP — Subtotals in One Pass", concept:"ROLLUP · GROUPING SETS",
        theory:`<p>Finance wants the per-department numbers <em>and</em> the grand total in the same result. SQLite has no way to group at two levels at once, so you glue two queries together with <code>UNION ALL</code> — scanning the table twice.</p><p>Warehouses do it in one scan with grouping extensions:</p>${compare([
          ['Detail + grand total', '… GROUP BY d<br>UNION ALL<br>SELECT \'ALL\', …', 'GROUP BY ROLLUP (d)', 'GROUP BY ROLLUP (d)'],
          ['Arbitrary levels', 'more UNION ALLs', 'GROUP BY GROUPING SETS ((a, b), (a), ())', 'same']
        ])}<p>In the subtotal rows the rolled-up column is <code>NULL</code>. Label it with <code>COALESCE(d, 'ALL')</code> — or, when the column can be NULL for real, use <code>GROUPING(d) = 1</code> to tell a subtotal row from a genuine NULL. <code>ROLLUP (a, b)</code> gives (a, b), (a) and () — hierarchical; <code>CUBE</code> gives every combination.</p>`,
        chips:[{t:"ROLLUP",c:"chip-purple"},{t:"GROUPING SETS",c:"chip-blue"},{t:"UNION ALL",c:"chip-cyan"}],
        task:"SQLite first: payroll (total salary) per department, plus one extra row labelled 'ALL' with the company total — department and payroll, 5 rows.",
        starter:"-- Step 1 (SQLite): the detail query and the total query, stacked\nSELECT department, SUM(salary) AS payroll\nFROM employees\nGROUP BY department;\n",
        hint:"… GROUP BY department UNION ALL SELECT 'ALL', SUM(salary) FROM employees;", xp:45, tables:["employees"],
        refs:[
          "SELECT department, SUM(salary) AS payroll FROM employees GROUP BY department UNION ALL SELECT 'ALL', SUM(salary) FROM employees"
        ],
        translate:[
          { dialect:"warehouse", prompt:"One scan this time: GROUP BY ROLLUP, labelling the total row with COALESCE (works in Snowflake and BigQuery).",
            starts:"select",
            requires:[
              { re:R`group\s+by\s+rollup\s*\(\s*(\w+\.)?department\s*\)`, msg:"Group at both levels at once: <code>GROUP BY ROLLUP (department)</code>." },
              { any:[R`coalesce\s*\(\s*(\w+\.)?department\s*,\s*'all'\s*\)`, R`ifnull\s*\(\s*(\w+\.)?department\s*,\s*'all'\s*\)`, R`grouping\s*\(`], msg:"The total row's department is NULL — label it: <code>COALESCE(department, 'ALL')</code>." }
            ],
            forbids:[
              { re:R`\bunion\b`, msg:"No <code>UNION</code> — <code>ROLLUP</code> produces the total row in the same pass." }
            ],
            model:"SELECT COALESCE(department, 'ALL') AS department, SUM(salary) AS payroll\nFROM employees\nGROUP BY ROLLUP (department);" }
        ],
        exercises:[
          { id:"31.2.e1", prompt:"SQLite: completed-order revenue per customer country, plus a 'TOTAL' row. Return country and revenue.",
            validate:{ hasCols:["country","revenue"], hasValue:"TOTAL", minRows:5 },
            _ref:"SELECT c.country, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed' GROUP BY c.country UNION ALL SELECT 'TOTAL', SUM(total) FROM orders WHERE status = 'completed';",
            hint:"The per-country query UNION ALL SELECT 'TOTAL', SUM(total) FROM orders WHERE status = 'completed'", xp:14 }
        ] },

      { id:"31.3", title:"Partitions, Clustering & Pruning", concept:"Cost-Aware SQL",
        theory:`<p>A warehouse bills you for the data a query <em>scans</em>. Big tables are split by date — BigQuery <strong>partitions</strong>, Snowflake <strong>micro-partitions</strong> (automatic, optionally steered with a clustering key) — and the engine skips the pieces a filter rules out. That's <strong>pruning</strong>, and it's the difference between scanning one day and scanning five years.</p><p>Pruning only works if the filter compares the <strong>bare column</strong> to a constant. It's the sargability rule from Day 25, now with a price tag:</p><pre class="theory-code">WHERE order_date &gt;= '2023-01-01' AND order_date &lt; '2023-04-01'   -- prunes
WHERE EXTRACT(YEAR FROM order_date) = 2023                        -- scans everything
WHERE CAST(order_ts AS DATE) = '2023-03-01'                       -- scans everything</pre>${compare([
          ['Physical layout', 'CREATE INDEX …', 'CLUSTER BY (order_date)', 'PARTITION BY order_date<br>CLUSTER BY customer_id']
        ])}<p>Half-open ranges (<code>&gt;= start AND &lt; next_start</code>) are the habit to build: they prune, and they're correct for timestamps where <code>BETWEEN … AND '2023-03-31'</code> silently drops the last day.</p>`,
        chips:[{t:"partition pruning",c:"chip-green"},{t:"CLUSTER BY",c:"chip-blue"},{t:"half-open range",c:"chip-amber"}],
        task:"SQLite first: completed orders from Q1 2023 — id, order_date, total — written so the date filter could prune: compare the bare order_date column to a half-open range, with no function wrapped around it.",
        starter:"-- Step 1 (SQLite): correct, but un-prunable — fix the date filter\nSELECT id, order_date, total\nFROM orders\nWHERE status = 'completed'\n  AND strftime('%Y', order_date) = '2023'\n  AND CAST(strftime('%m', order_date) AS INTEGER) <= 3;\n",
        hint:"WHERE status = 'completed' AND order_date >= '2023-01-01' AND order_date < '2023-04-01'", xp:50, tables:["orders"],
        refs:[
          "SELECT id, order_date, total FROM orders WHERE status = 'completed' AND order_date >= '2023-01-01' AND order_date < '2023-04-01'"
        ],
        requires:[["order_date >=", "order_date between", "order_date >"]],
        translate:[
          { dialect:"bigquery", prompt:"BigQuery DDL: create analytics.orders_p from orders, partitioned by order_date and clustered by customer_id.",
            starts:"create",
            requires:[
              { re:R`^create\s+(or\s+replace\s+)?table\s+\S*orders_p\b`, msg:"Start with <code>CREATE TABLE analytics.orders_p</code>." },
              { re:R`partition\s+by\s+(date\s*\(\s*)?(\w+\.)?order_date`, msg:"Split the table by day: <code>PARTITION BY order_date</code>." },
              { re:R`cluster\s+by\s+\(?\s*(\w+\.)?customer_id`, msg:"Sort within each partition: <code>CLUSTER BY customer_id</code>." },
              { re:R`\bas\s+select\b`, msg:"Populate it in the same statement: <code>AS SELECT * FROM orders</code>." }
            ],
            forbids:[
              { re:R`cluster\s+by.*partition\s+by`, msg:"Order matters in BigQuery DDL: <code>PARTITION BY</code> comes before <code>CLUSTER BY</code>." }
            ],
            model:"CREATE TABLE analytics.orders_p\nPARTITION BY order_date\nCLUSTER BY customer_id\nAS SELECT * FROM orders;" },
          { dialect:"snowflake", prompt:"Snowflake DDL: there are no user-defined partitions — create orders_c from orders with a clustering key on order_date.",
            starts:"create",
            requires:[
              { re:R`^create\s+(or\s+replace\s+)?table\s+\S*orders_c\b`, msg:"Start with <code>CREATE TABLE orders_c</code>." },
              { re:R`cluster\s+by\s*\(\s*(\w+\.)?order_date`, msg:"Steer the micro-partitions: <code>CLUSTER BY (order_date)</code> — parentheses required." },
              { re:R`\bas\s+select\b`, msg:"Populate it in the same statement: <code>AS SELECT * FROM orders</code>." }
            ],
            forbids:[
              { re:R`partition\s+by`, msg:"Snowflake has no <code>PARTITION BY</code> in DDL — micro-partitions are automatic. You only choose a clustering key." }
            ],
            model:"CREATE TABLE orders_c\nCLUSTER BY (order_date)\nAS SELECT * FROM orders;" }
        ],
        exercises:[
          { id:"31.3.e1", prompt:"SQLite: the same habit on a month — every order placed in December 2023 (any status), using a half-open range. Return id and order_date.",
            validate:{ rowCount:1, hasCols:["id","order_date"] },
            _ref:"SELECT id, order_date FROM orders WHERE order_date >= '2023-12-01' AND order_date < '2024-01-01';",
            hint:"WHERE order_date >= '2023-12-01' AND order_date < '2024-01-01'", xp:12 }
        ] },

      { id:"31.4", title:"Translation Gauntlet", concept:"Putting It Together",
        theory:`<p>The real skill isn't memorising three function catalogues — it's reading a query in one dialect and knowing which <em>pieces</em> won't survive the move. This one has three of them at once: a date format, an aggregate feeding a window, and a filter on that window.</p><p>Work it the way you'd port a real model: get it right where you can run it, then translate piece by piece.</p>${compare([
          ['Month label', "strftime('%Y-%m', d)", "TO_CHAR(d, 'YYYY-MM')", "FORMAT_DATE('%Y-%m', d)"],
          ['Keep rank 1', 'CTE + WHERE rn = 1', 'QUALIFY … = 1', 'QUALIFY … = 1']
        ])}<p>A window function may be computed over an aggregate — <code>ROW_NUMBER() OVER (… ORDER BY SUM(total) DESC)</code> — because windows run after <code>GROUP BY</code>. Combined with <code>QUALIFY</code>, a three-CTE SQLite query collapses into a single <code>SELECT</code>.</p>`,
        chips:[{t:"TO_CHAR / FORMAT_DATE",c:"chip-cyan"},{t:"window over aggregate",c:"chip-purple"},{t:"QUALIFY",c:"chip-blue"}],
        task:"SQLite first: the top customer of each month in 2023 by completed-order revenue — month (YYYY-MM), name, revenue. One row per month; break ties alphabetically by name.",
        starter:"-- Step 1 (SQLite): monthly revenue per customer → rank within month → keep rank 1\nWITH monthly AS (\n  SELECT strftime('%Y-%m', o.order_date) AS month, c.name, SUM(o.total) AS revenue\n  FROM orders o\n  JOIN customers c ON c.id = o.customer_id\n  WHERE o.status = 'completed'\n    AND o.order_date >= '2023-01-01' AND o.order_date < '2024-01-01'\n  GROUP BY 1, 2\n)\nSELECT * FROM monthly;\n",
        hint:"Add a second CTE: SELECT *, ROW_NUMBER() OVER (PARTITION BY month ORDER BY revenue DESC, name) AS rn FROM monthly — then SELECT month, name, revenue … WHERE rn = 1.", xp:70, tables:["orders","customers"],
        refs:[
          "WITH monthly AS (SELECT strftime('%Y-%m', o.order_date) AS month, c.name, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed' AND o.order_date >= '2023-01-01' AND o.order_date < '2024-01-01' GROUP BY 1, 2), ranked AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY month ORDER BY revenue DESC, name) AS rn FROM monthly) SELECT month, name, revenue FROM ranked WHERE rn = 1"
        ],
        translate:[
          { dialect:"snowflake", prompt:"Snowflake, as ONE SELECT: TO_CHAR for the month, and QUALIFY with ROW_NUMBER() ordered by SUM(o.total).",
            starts:"select",
            requires:[
              { re:R`to_char\s*\(\s*(\w+\.)?order_date\s*,\s*'yyyy-mm'\s*\)`, msg:"Snowflake month label: <code>TO_CHAR(o.order_date, 'YYYY-MM')</code>." },
              { re:R`\bqualify\s+row_number\s*\(\s*\)\s*over\s*\(`, msg:"Keep the top row per month with <code>QUALIFY ROW_NUMBER() OVER (PARTITION BY … ORDER BY SUM(o.total) DESC, c.name) = 1</code>." },
              { re:R`group\s+by`, msg:"Still aggregate per month and customer — keep the <code>GROUP BY</code>." },
              { re:R`order\s+by\s+(sum\s*\(|revenue)`, msg:"Rank by revenue inside the window: <code>ORDER BY SUM(o.total) DESC</code>." }
            ],
            forbids:[
              { re:R`^\s*with\b`, msg:"No CTEs — a window can sit on top of an aggregate, and <code>QUALIFY</code> filters it." },
              { re:R`format_date\s*\(`, msg:"<code>FORMAT_DATE</code> is BigQuery. Snowflake: <code>TO_CHAR(d, 'YYYY-MM')</code>." }
            ],
            model:"SELECT TO_CHAR(o.order_date, 'YYYY-MM') AS month, c.name, SUM(o.total) AS revenue\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'completed'\n  AND o.order_date >= '2023-01-01' AND o.order_date < '2024-01-01'\nGROUP BY 1, 2\nQUALIFY ROW_NUMBER() OVER (\n  PARTITION BY TO_CHAR(o.order_date, 'YYYY-MM')\n  ORDER BY SUM(o.total) DESC, c.name) = 1;" },
          { dialect:"bigquery", prompt:"BigQuery, same shape: FORMAT_DATE for the month, QUALIFY for the filter.",
            starts:"select",
            requires:[
              { re:R`format_date\s*\(\s*'%y-%m'\s*,\s*(\w+\.)?order_date\s*\)`, msg:"BigQuery month label: <code>FORMAT_DATE('%Y-%m', o.order_date)</code> — format string first." },
              { re:R`\bqualify\s+row_number\s*\(\s*\)\s*over\s*\(`, msg:"Keep the top row per month with <code>QUALIFY ROW_NUMBER() OVER (PARTITION BY … ORDER BY SUM(o.total) DESC, c.name) = 1</code>." },
              { re:R`group\s+by`, msg:"Still aggregate per month and customer — keep the <code>GROUP BY</code>." },
              { re:R`order\s+by\s+(sum\s*\(|revenue)`, msg:"Rank by revenue inside the window: <code>ORDER BY SUM(o.total) DESC</code>." }
            ],
            forbids:[
              { re:R`^\s*with\b`, msg:"No CTEs — a window can sit on top of an aggregate, and <code>QUALIFY</code> filters it." },
              { re:R`to_char\s*\(`, msg:"<code>TO_CHAR</code> is Snowflake. BigQuery: <code>FORMAT_DATE('%Y-%m', d)</code>." }
            ],
            model:"SELECT FORMAT_DATE('%Y-%m', o.order_date) AS month, c.name, SUM(o.total) AS revenue\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.status = 'completed'\n  AND o.order_date >= '2023-01-01' AND o.order_date < '2024-01-01'\nGROUP BY 1, 2\nQUALIFY ROW_NUMBER() OVER (\n  PARTITION BY FORMAT_DATE('%Y-%m', o.order_date)\n  ORDER BY SUM(o.total) DESC, c.name) = 1;" }
        ],
        exercises:[
          { id:"31.4.e1", prompt:"SQLite: flip it — the single best month for each customer tier in 2023 (completed revenue). Return tier, month and revenue.",
            validate:{ rowCount:3, hasCols:["tier","month","revenue"] },
            _ref:"WITH m AS (SELECT c.tier, strftime('%Y-%m', o.order_date) AS month, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed' AND o.order_date >= '2023-01-01' AND o.order_date < '2024-01-01' GROUP BY 1, 2), r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY tier ORDER BY revenue DESC, month) AS rn FROM m) SELECT tier, month, revenue FROM r WHERE rn = 1;",
            hint:"Same three steps, but PARTITION BY tier and rank the months", xp:18 }
        ] }
    ]
  });
})();
