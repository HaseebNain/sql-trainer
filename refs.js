// SQL Quest — authoritative reference answers for result-set validation.
//
// Each entry maps a lesson id to one or more executable, correctly-cased
// reference queries. A learner's query is CORRECT when its results match ANY
// `refs` entry (see engine.js). Open-ended lessons list several accepted
// variants. `probe` (state-changing lessons) is a SELECT run AFTER the
// learner's statements to inspect the resulting database state.
//
// Convention: "find/show all X who ..." tasks that don't name output columns
// use `SELECT *` (matching the course's own starter convention in Days 1–3).
// Verified by tools/verify-refs.js — every ref must self-validate.

const LESSON_REFS = {
  // ── Days 1–7 mostly rely on derived references (the correctly-cased starter
  // plus quote-free solution variants). These few "find" lessons also accept a
  // natural SELECT * alongside the starter's specific columns. ──
  "2.1": { refs: [
    "SELECT first_name, department, salary FROM employees WHERE department='Engineering' AND salary>90000",
    "SELECT * FROM employees WHERE department='Engineering' AND salary>90000"
  ] },
  "2.2": { refs: [
    "SELECT first_name, department FROM employees WHERE department IN ('Engineering','Marketing')",
    "SELECT * FROM employees WHERE department IN ('Engineering','Marketing')"
  ] },
  "2.3": { refs: [
    "SELECT first_name, department FROM employees WHERE first_name LIKE 'J%'",
    "SELECT * FROM employees WHERE first_name LIKE 'J%'"
  ] },
  "5.1": { refs: [
    "SELECT first_name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees)",
    "SELECT * FROM employees WHERE salary > (SELECT AVG(salary) FROM employees)"
  ] },

  // ── Day 8 — NULLs ──
  "8.1": { refs: ["SELECT * FROM customers WHERE email IS NULL"] },
  "8.2": { refs: ["SELECT name, COALESCE(email, 'no email on file') AS email FROM customers"] },
  "8.3": { refs: ["SELECT AVG(NULLIF(salary, 0)) FROM employees"] },
  "8.4": { refs: ["SELECT COUNT(*) AS total, COUNT(email) AS with_email FROM customers"] },

  // ── Day 9 — Strings ──
  "9.1": { refs: ["SELECT UPPER(first_name), LENGTH(first_name) FROM employees"] },
  "9.2": { refs: [
    "SELECT SUBSTR(hire_date, 1, 4) FROM employees",
    "SELECT first_name, SUBSTR(hire_date, 1, 4) FROM employees"
  ] },
  "9.3": { refs: ["SELECT name, REPLACE(email, '.com', '.org') AS email FROM customers"] },
  "9.4": { refs: [
    "SELECT first_name || ' (' || department || ')' AS contact FROM employees",
    "SELECT first_name, first_name || ' (' || department || ')' AS contact FROM employees"
  ] },
  "9.5": { refs: ["SELECT * FROM customers WHERE INSTR(email, 'gmail') > 0"] },

  // ── Day 10 — Dates ──
  "10.1": { refs: ["SELECT * FROM employees WHERE hire_date LIKE '2020%'"] },
  "10.2": { refs: [
    "SELECT strftime('%Y', hire_date) AS year, COUNT(*) FROM employees GROUP BY year",
    "SELECT strftime('%y', hire_date) AS year, COUNT(*) FROM employees GROUP BY year"
  ] },
  "10.3": { refs: ["SELECT * FROM employees WHERE hire_date < date('now', '-5 years')"] },
  "10.4": { refs: [
    "SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue, COUNT(*) AS orders FROM orders GROUP BY month ORDER BY month",
    "SELECT strftime('%y-%m', order_date) AS month, SUM(total) AS revenue, COUNT(*) AS orders FROM orders GROUP BY month ORDER BY month"
  ] },

  // ── Day 11 — Joins ──
  "11.1": { refs: ["SELECT e.first_name, d.dept_name FROM employees e CROSS JOIN departments d"] },
  "11.2": { refs: ["SELECT e.first_name, m.first_name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id"] },
  "11.3": { refs: [
    "SELECT e.first_name, d.dept_name FROM employees e LEFT JOIN departments d ON e.department = d.dept_name " +
      "UNION SELECT e.first_name, d.dept_name FROM departments d LEFT JOIN employees e ON e.department = d.dept_name",
    "SELECT e.first_name, d.dept_name FROM employees e FULL OUTER JOIN departments d ON e.department = d.dept_name"
  ] },
  "11.4": { refs: [
    "SELECT * FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)",
    "SELECT name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)"
  ] },

  // ── Day 12 — Set operations ──
  "12.1": { refs: ["SELECT city FROM customers WHERE city IS NOT NULL UNION SELECT location FROM departments"] },
  "12.2": { refs: ["SELECT dept_name FROM departments INTERSECT SELECT department FROM employees"] },
  "12.3": { refs: ["SELECT dept_name FROM departments EXCEPT SELECT department FROM employees"] },
  "12.4": { refs: ["SELECT city FROM customers WHERE city IS NOT NULL UNION SELECT location FROM departments ORDER BY 1 LIMIT 8"] },

  // ── Day 13 — Advanced aggregation ──
  "13.1": { refs: ["SELECT department, GROUP_CONCAT(first_name) FROM employees GROUP BY department"] },
  "13.2": { refs: ["SELECT department, SUM(CASE WHEN salary > 90000 THEN 1 ELSE 0 END) AS high_earners, SUM(CASE WHEN salary <= 90000 THEN 1 ELSE 0 END) AS others FROM employees GROUP BY department"] },
  "13.3": { refs: ["SELECT COUNT(*) AS total_orders, COUNT(DISTINCT customer_id) AS unique_customers FROM orders"] },
  "13.4": { refs: [
    "SELECT department, strftime('%Y', hire_date) AS year, COUNT(*) FROM employees GROUP BY department, year",
    "SELECT department, strftime('%y', hire_date) AS year, COUNT(*) FROM employees GROUP BY department, year"
  ] },

  // ── Day 14 — Window functions ──
  "14.1": { refs: ["SELECT first_name, salary, RANK() OVER (ORDER BY salary DESC) AS rnk, DENSE_RANK() OVER (ORDER BY salary DESC) AS dense FROM employees"] },
  "14.2": { refs: ["SELECT first_name, salary, NTILE(4) OVER (ORDER BY salary DESC) AS quartile FROM employees"] },
  "14.3": { refs: ["SELECT first_name, salary, FIRST_VALUE(salary) OVER (PARTITION BY department ORDER BY salary DESC) AS dept_max FROM employees"] },
  "14.4": { refs: ["SELECT first_name, salary, AVG(salary) OVER (ORDER BY salary ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg FROM employees"] },

  // ── Day 15 — Recursive CTEs ──
  "15.1": { refs: ["WITH RECURSIVE nums(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM nums WHERE n < 10) SELECT n FROM nums"] },
  "15.2": { refs: ["WITH RECURSIVE dates(d) AS (SELECT '2024-01-01' UNION ALL SELECT date(d,'+1 day') FROM dates WHERE d < '2024-01-31') SELECT d FROM dates"] },
  "15.3": { refs: [
    "WITH RECURSIVE org(id, first_name, level) AS (SELECT id, first_name, 1 FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.id, e.first_name, org.level+1 FROM employees e JOIN org ON e.manager_id = org.id) SELECT first_name, level FROM org",
    "WITH RECURSIVE org(id, first_name, level) AS (SELECT id, first_name, 1 FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.id, e.first_name, org.level+1 FROM employees e JOIN org ON e.manager_id = org.id) SELECT id, first_name, level FROM org"
  ] },

  // ── Day 16 — Dedup & data quality ──
  // 16.1 / 16.3 have a legitimately EMPTY correct answer, so result comparison
  // is weak — a `requires` gate ensures the right construct was actually used.
  "16.1": { requires: ["group by", "having"], refs: [
    "SELECT first_name FROM employees GROUP BY first_name HAVING COUNT(*) > 1",
    "SELECT first_name, COUNT(*) FROM employees GROUP BY first_name HAVING COUNT(*) > 1"
  ] },
  "16.2": { refs: [
    "WITH ranked AS (SELECT id, first_name, department, salary, hire_date, manager_id, ROW_NUMBER() OVER (PARTITION BY department ORDER BY hire_date) AS rn FROM employees) SELECT id, first_name, department, salary, hire_date, manager_id FROM ranked WHERE rn = 1",
    "WITH ranked AS (SELECT first_name, department, hire_date, ROW_NUMBER() OVER (PARTITION BY department ORDER BY hire_date) AS rn FROM employees) SELECT first_name, department, hire_date FROM ranked WHERE rn = 1"
  ] },
  "16.3": { requires: [["left join", "not in", "not exists"]], refs: [
    "SELECT o.* FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE c.id IS NULL",
    "SELECT id FROM orders WHERE customer_id NOT IN (SELECT id FROM customers)"
  ] },
  "16.4": { refs: ["SELECT name, COALESCE(city, (SELECT c2.city FROM customers c2 WHERE c2.country = c.country AND c2.city IS NOT NULL GROUP BY c2.city ORDER BY COUNT(*) DESC LIMIT 1)) AS city FROM customers c"] },

  // ── Day 17 — Pivots ──
  "17.1": { refs: ["SELECT SUM(CASE WHEN department='Engineering' THEN salary ELSE 0 END) AS engineering, SUM(CASE WHEN department='Marketing' THEN salary ELSE 0 END) AS marketing, SUM(CASE WHEN department='Finance' THEN salary ELSE 0 END) AS finance, SUM(CASE WHEN department='HR' THEN salary ELSE 0 END) AS hr FROM employees"] },
  "17.2": { refs: [
    "SELECT SUM(CASE WHEN strftime('%Y',order_date)='2022' THEN total ELSE 0 END) AS rev_2022, SUM(CASE WHEN strftime('%Y',order_date)='2023' THEN total ELSE 0 END) AS rev_2023, SUM(CASE WHEN strftime('%Y',order_date)='2024' THEN total ELSE 0 END) AS rev_2024 FROM orders",
    "SELECT SUM(CASE WHEN strftime('%y',order_date)='22' THEN total ELSE 0 END) AS rev_2022, SUM(CASE WHEN strftime('%y',order_date)='23' THEN total ELSE 0 END) AS rev_2023, SUM(CASE WHEN strftime('%y',order_date)='24' THEN total ELSE 0 END) AS rev_2024 FROM orders"
  ] },
  "17.3": { refs: ["SELECT dept_name, 'budget' AS metric, budget AS value FROM departments UNION ALL SELECT d.dept_name, 'headcount' AS metric, COUNT(e.id) AS value FROM departments d LEFT JOIN employees e ON e.department=d.dept_name GROUP BY d.dept_name"] },

  // ── Day 18 — Cohorts ──
  "18.1": { refs: [
    "SELECT strftime('%Y-%m',signup_date) AS cohort, COUNT(*) FROM customers GROUP BY cohort ORDER BY cohort",
    "SELECT strftime('%y-%m',signup_date) AS cohort, COUNT(*) FROM customers GROUP BY cohort ORDER BY cohort"
  ] },
  "18.2": { refs: [
    "SELECT c.name, strftime('%Y-%m',c.signup_date) AS cohort, MIN(o.order_date) AS first_order FROM customers c LEFT JOIN orders o ON c.id=o.customer_id GROUP BY c.id",
    "SELECT c.name, strftime('%y-%m',c.signup_date) AS cohort, MIN(o.order_date) AS first_order FROM customers c LEFT JOIN orders o ON c.id=o.customer_id GROUP BY c.id"
  ] },
  "18.3": {
    accept: [["strftime('%y-%m'", "strftime('%Y-%m'"], ["count(o.id) >= 2", "count(*) >= 2", "count(distinct o.customer_id)", ">= 2", ">=2"]],
    refs: ["WITH co AS (SELECT strftime('%Y-%m',c.signup_date) AS cohort, c.id, COUNT(o.id) AS n FROM customers c LEFT JOIN orders o ON c.id=o.customer_id GROUP BY c.id) SELECT cohort, COUNT(*) AS total_customers, SUM(CASE WHEN n>=2 THEN 1 ELSE 0 END) AS retained, ROUND(SUM(CASE WHEN n>=2 THEN 1.0 ELSE 0 END)/COUNT(*)*100,1) AS retention_rate FROM co GROUP BY cohort"]
  },

  // ── Day 19 — Funnels & rates ──
  "19.1": {
    accept: [["completed"], ["100"]],
    refs: ["SELECT COUNT(*) AS total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed, ROUND(SUM(CASE WHEN status='completed' THEN 1.0 ELSE 0 END)/COUNT(*)*100,1) AS completion_pct FROM orders"]
  },
  "19.2": {
    accept: [["having count(*) > 1", "having count(*)>1"], ["100", "distinct customer_id"]],
    refs: ["SELECT ROUND((SELECT COUNT(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*)>1))*100.0/(SELECT COUNT(DISTINCT customer_id) FROM orders),1) AS repeat_pct"]
  },
  "19.3": {
    accept: [["row_number() over", "rn=1", "rn = 2"], ["julianday"]],
    refs: ["WITH r AS (SELECT customer_id, order_date, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS rn FROM orders) SELECT f.customer_id, julianday(s.order_date)-julianday(f.order_date) AS days_between FROM r f JOIN r s ON f.customer_id=s.customer_id AND f.rn=1 AND s.rn=2"]
  },

  // ── Day 20 — KPIs, CLV, growth, RFM ──
  "20.1": { refs: ["SELECT SUM(total) AS revenue, COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS customers, SUM(total)/COUNT(*) AS aov FROM orders WHERE status='completed'"] },
  "20.2": { ordered: false, refs: ["SELECT c.name, c.tier, SUM(o.total) AS clv, RANK() OVER (ORDER BY SUM(o.total) DESC) AS rnk FROM orders o JOIN customers c ON o.customer_id=c.id GROUP BY o.customer_id"] },
  "20.3": {
    accept: [["lag("], ["strftime('%y-%m'", "strftime('%Y-%m'"]],
    refs: [
      "WITH m AS (SELECT strftime('%Y-%m',order_date) AS month, SUM(total) AS revenue FROM orders GROUP BY month) SELECT month, revenue, ROUND((revenue-LAG(revenue) OVER (ORDER BY month))/LAG(revenue) OVER (ORDER BY month)*100,1) AS growth FROM m ORDER BY month",
      "WITH m AS (SELECT strftime('%y-%m',order_date) AS month, SUM(total) AS revenue FROM orders GROUP BY month) SELECT month, revenue, ROUND((revenue-LAG(revenue) OVER (ORDER BY month))/LAG(revenue) OVER (ORDER BY month)*100,1) AS growth FROM m ORDER BY month"
    ]
  },
  "20.4": { refs: ["SELECT customer_id, julianday('now')-julianday(MAX(order_date)) AS recency, COUNT(*) AS frequency, SUM(total) AS monetary FROM orders GROUP BY customer_id"] },

  // ── Day 21 — Capstones (open-ended: result ref + structural accept) ──
  "21.1": {
    accept: [["status = 'completed'", "status='completed'"], ["distinct customer_id"], ["strftime('%y'", "strftime('%Y'"]],
    refs: ["SELECT SUM(total) AS revenue, COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS customers, SUM(total)/COUNT(*) AS aov, SUM(CASE WHEN strftime('%Y',order_date)='2023' THEN total ELSE 0 END) AS rev_2023, SUM(CASE WHEN strftime('%Y',order_date)='2024' THEN total ELSE 0 END) AS rev_2024 FROM orders WHERE status='completed'"]
  },
  "21.2": {
    accept: [["join products", "join products p", "from products"], ["rank() over (partition by"], ["sum(quantity"]],
    refs: ["SELECT p.name, SUM(oi.quantity) AS qty, SUM(oi.quantity*oi.unit_price) AS revenue, AVG(oi.unit_price) AS avg_price, RANK() OVER (PARTITION BY p.category ORDER BY SUM(oi.quantity*oi.unit_price) DESC) AS rnk FROM order_items oi JOIN products p ON oi.product_id=p.id GROUP BY p.id"]
  },
  "21.3": {
    accept: [["with"], ["case when"], ["champions"], ["loyal"], ["at risk"]],
    refs: ["WITH co AS (SELECT c.id, c.name, COUNT(o.id) AS orders, COALESCE(SUM(o.total),0) AS spend FROM customers c LEFT JOIN orders o ON c.id=o.customer_id GROUP BY c.id) SELECT name, CASE WHEN orders>=3 AND spend>=1000 THEN 'Champions' WHEN orders>=2 THEN 'Loyal' WHEN orders=1 THEN 'At Risk' ELSE 'New' END AS segment FROM co"]
  },
  "21.4": {
    accept: [["with"], ["strftime('%y-%m'", "strftime('%Y-%m'"], ["rank() over (partition by"], ["case when"], ["join departments", "join employees"]],
    refs: ["WITH monthly AS (SELECT o.employee_id, strftime('%Y-%m',o.order_date) AS month, SUM(o.total) AS revenue FROM orders o GROUP BY o.employee_id, month), wd AS (SELECT m.employee_id, e.first_name, e.department, m.month, m.revenue FROM monthly m JOIN employees e ON m.employee_id=e.id), r AS (SELECT wd.*, RANK() OVER (PARTITION BY department, month ORDER BY revenue DESC) AS rnk FROM wd) SELECT first_name, department, month, revenue, rnk, CASE WHEN rnk<=2 THEN 'Top Performer' ELSE '' END AS flag FROM r"]
  },

  // ── Day 22 — DDL / transactions / upserts (validated by a state probe) ──
  "22.2": {
    setup: "DROP TABLE IF EXISTS staff; CREATE TABLE staff AS SELECT * FROM employees;",
    probe: "SELECT first_name, salary FROM staff WHERE department = 'Engineering' ORDER BY first_name",
    refs: ["UPDATE staff SET salary = salary * 1.1 WHERE department = 'Engineering'"]
  },
  "22.3": {
    setup: "DROP TABLE IF EXISTS inventory; CREATE TABLE inventory (product_id INTEGER PRIMARY KEY, stock INTEGER); INSERT INTO inventory VALUES (1, 10);",
    probe: "SELECT product_id, stock FROM inventory",
    refs: [
      "INSERT INTO inventory VALUES (1, 25) ON CONFLICT(product_id) DO UPDATE SET stock = excluded.stock",
      "INSERT OR REPLACE INTO inventory VALUES (1, 25)"
    ]
  },

  // ── Day 23 — Views & layered models ──
  "23.1": {
    setup: "DROP VIEW IF EXISTS v_active_customers;",
    probe: "SELECT * FROM v_active_customers",
    refs: ["CREATE VIEW v_active_customers AS SELECT * FROM customers WHERE id IN (SELECT customer_id FROM orders)"]
  },
  "23.2": {
    setup: "DROP VIEW IF EXISTS mart_customer_revenue; DROP VIEW IF EXISTS stg_orders;",
    probe: "SELECT * FROM mart_customer_revenue",
    refs: ["CREATE VIEW stg_orders AS SELECT id, customer_id, order_date, total FROM orders WHERE status='completed'; CREATE VIEW mart_customer_revenue AS SELECT customer_id, SUM(total) AS revenue FROM stg_orders GROUP BY customer_id"]
  },
  "23.3": {
    setup: "DROP TABLE IF EXISTS monthly_revenue;",
    probe: "SELECT * FROM monthly_revenue ORDER BY month",
    refs: [
      "CREATE TABLE monthly_revenue AS SELECT strftime('%Y-%m',order_date) AS month, SUM(total) AS revenue, COUNT(*) AS orders FROM orders WHERE status='completed' GROUP BY month",
      "CREATE TABLE monthly_revenue AS SELECT strftime('%y-%m',order_date) AS month, SUM(total) AS revenue, COUNT(*) AS orders FROM orders WHERE status='completed' GROUP BY month"
    ]
  },

  // ── Day 24 — Star schema (facts & dims) ──
  "24.1": {
    setup: "DROP TABLE IF EXISTS dim_customer;",
    probe: "SELECT * FROM dim_customer",
    refs: ["CREATE TABLE dim_customer AS SELECT id AS customer_key, name, tier, country FROM customers"]
  },
  "24.2": {
    setup: "DROP TABLE IF EXISTS fact_orders;",
    probe: "SELECT * FROM fact_orders",
    refs: ["CREATE TABLE fact_orders AS SELECT id, customer_id AS customer_key, employee_id, order_date, status, total FROM orders"]
  },
  "24.3": {
    setup: "DROP TABLE IF EXISTS dim_customer; CREATE TABLE dim_customer AS SELECT id AS customer_key, name, tier, country FROM customers; DROP TABLE IF EXISTS fact_orders; CREATE TABLE fact_orders AS SELECT id, customer_id AS customer_key, employee_id, order_date, status, total FROM orders;",
    refs: ["SELECT d.tier, SUM(f.total) AS revenue FROM fact_orders f JOIN dim_customer d ON f.customer_key = d.customer_key WHERE f.status='completed' GROUP BY d.tier"]
  },

  // ── Day 25 — Indexes (validated via sqlite_master) ──
  "25.2": {
    probe: "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name='orders' AND sql LIKE '%customer_id%'",
    refs: ["CREATE INDEX idx_orders_customer ON orders(customer_id)"]
  },

  // ── Day 26 — Incremental loads, idempotency, SCD2 ──
  "26.1": {
    setup: "DROP TABLE IF EXISTS orders_dw; CREATE TABLE orders_dw AS SELECT * FROM orders WHERE order_date <= '2023-12-31';",
    probe: "SELECT COUNT(*) FROM orders_dw",
    refs: ["INSERT INTO orders_dw SELECT * FROM orders WHERE order_date > (SELECT MAX(order_date) FROM orders_dw)"]
  },
  "26.2": {
    setup: "DROP TABLE IF EXISTS orders_dw; CREATE TABLE orders_dw (id INTEGER PRIMARY KEY, total REAL);",
    probe: "SELECT COUNT(*) FROM orders_dw",
    refs: ["INSERT OR IGNORE INTO orders_dw SELECT id, total FROM orders; INSERT OR IGNORE INTO orders_dw SELECT id, total FROM orders"]
  },
  "26.3": {
    setup: "DROP TABLE IF EXISTS dim_customer_scd; CREATE TABLE dim_customer_scd AS SELECT id AS customer_key, name, tier, signup_date AS valid_from, NULL AS valid_to, 1 AS is_current FROM customers;",
    probe: "SELECT * FROM dim_customer_scd WHERE customer_key = 2 ORDER BY valid_from",
    refs: ["UPDATE dim_customer_scd SET valid_to='2024-06-01', is_current=0 WHERE customer_key=2; INSERT INTO dim_customer_scd VALUES (2, 'Bob Smith', 'Pro', '2024-06-01', NULL, 1)"]
  },

  // ── Day 28 — Interview gauntlet (pure SELECT) ──
  "28.1": { refs: [
    "WITH ranked AS (SELECT first_name, department, salary, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn FROM employees) SELECT first_name, department, salary FROM ranked WHERE rn=1",
    "SELECT first_name, department, salary FROM employees e WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department = e.department)"
  ] },
  "28.2": { refs: [
    "SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1",
    "SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)"
  ] },
  "28.3": { refs: [
    "WITH x AS (SELECT first_name, department, salary, AVG(salary) OVER (PARTITION BY department) AS dept_avg FROM employees) SELECT first_name, department, salary FROM x WHERE salary > dept_avg",
    "SELECT first_name, department, salary FROM employees e WHERE salary > (SELECT AVG(salary) FROM employees e2 WHERE e2.department = e.department)"
  ] },
  "28.4": { refs: [
    "WITH monthly AS (SELECT strftime('%Y-%m',order_date) AS month, SUM(total) AS revenue, COUNT(*) AS orders FROM orders WHERE status='completed' AND order_date>='2023-01-01' AND order_date<'2024-01-01' GROUP BY month) SELECT month, revenue, orders, SUM(revenue) OVER (ORDER BY month) AS ytd FROM monthly ORDER BY month",
    "WITH monthly AS (SELECT strftime('%y-%m',order_date) AS month, SUM(total) AS revenue, COUNT(*) AS orders FROM orders WHERE status='completed' AND order_date>='2023-01-01' AND order_date<'2024-01-01' GROUP BY month) SELECT month, revenue, orders, SUM(revenue) OVER (ORDER BY month) AS ytd FROM monthly ORDER BY month"
  ] }
};

if (typeof module !== 'undefined' && module.exports) module.exports = LESSON_REFS;
