// Checks the wrong-answer explainer (explain.js): each deliberately wrong query
// must be diagnosed as the right KIND of mistake, and its explanation must
// mention the telling detail. Run with: node tools/explain-test.js
const { loadCourse, initSql } = require('./load');
const { SqlEngine, SqlExplain } = loadCourse();

const L = (refs, extra) => Object.assign({ id: 'test', refs: [].concat(refs) }, extra || {});

// [name, pseudo-lesson, wrong query, expected kind, text the explanation must contain (regex)]
const CASES = [
  ['wrong sort direction',
    L('SELECT first_name, salary FROM employees ORDER BY salary DESC'),
    'SELECT first_name, salary FROM employees ORDER BY salary ASC', 'order', /order/i],
  ['INNER JOIN drops NULL-manager rows',
    L('SELECT e.first_name, m.first_name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id'),
    'SELECT e.first_name, m.first_name AS manager FROM employees e JOIN employees m ON e.manager_id = m.id', 'rows', /NULL in <code>manager<\/code>/],
  ['join fan-out duplicates',
    L('SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders)'),
    'SELECT c.name FROM customers c JOIN orders o ON o.customer_id = c.id', 'duplicates', /fan-out/],
  ['boundary: > instead of >=',
    L('SELECT first_name, salary FROM employees WHERE salary >= 88000'),
    'SELECT first_name, salary FROM employees WHERE salary > 88000', 'rows', /88000/],
  ['filter too loose (one status leaks through)',
    L("SELECT id, status, total FROM orders WHERE status = 'completed'"),
    "SELECT id, status, total FROM orders WHERE status <> 'cancelled'", 'rows', /status<\/code> = <code>'pending'/],
  ['no filter at all',
    L("SELECT id, status, total FROM orders WHERE status = 'completed'"),
    'SELECT id, status, total FROM orders', 'rows', /shouldn't be there/],
  ['missing ROUND',
    L('SELECT department, ROUND(AVG(salary), 0) AS avg_sal FROM employees GROUP BY department'),
    'SELECT department, AVG(salary) AS avg_sal FROM employees GROUP BY department', 'rounding', /ROUND/],
  ['integer division',
    L('SELECT department, 100.0 * COUNT(*) / 15 AS pct FROM employees GROUP BY department'),
    'SELECT department, 100 * COUNT(*) / 15 AS pct FROM employees GROUP BY department', 'integer-division', /integer division/],
  ['percent vs fraction',
    L('SELECT department, 1.0 * COUNT(*) / 15 AS share FROM employees GROUP BY department'),
    'SELECT department, 100.0 * COUNT(*) / 15 AS share FROM employees GROUP BY department', 'factor', /percentage/],
  ['SELECT * instead of named columns',
    L('SELECT first_name, salary FROM employees'),
    'SELECT * FROM employees', 'columns', /SELECT \*/],
  ['a column is missing',
    L('SELECT first_name, salary FROM employees'),
    'SELECT first_name FROM employees', 'columns', /salary/],
  ['case not normalised',
    L('SELECT id, UPPER(first_name) AS n FROM employees'),
    'SELECT id, first_name AS n FROM employees', 'case-whitespace', /capitalization/],
  ['NULL where COALESCE expected',
    L("SELECT name, COALESCE(email, 'none') AS email FROM customers"),
    'SELECT name, email FROM customers', 'null-vs-value', /COALESCE/],
  ['double counting after a join',
    L('SELECT c.id, COUNT(DISTINCT o.id) AS n FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id GROUP BY c.id'),
    'SELECT c.id, COUNT(*) AS n FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id GROUP BY c.id', 'too-high', /double counting/],
  ['state lesson: wrong object name',
    L('CREATE TABLE t1 AS SELECT id FROM employees', { setup: 'DROP TABLE IF EXISTS t1;', probe: 'SELECT * FROM t1' }),
    'CREATE TABLE t2 AS SELECT id FROM employees', 'state-missing', /t1/],
  ['state lesson: wrong contents',
    L("CREATE TABLE t1 AS SELECT id FROM employees WHERE department = 'HR'", { setup: 'DROP TABLE IF EXISTS t1;', probe: 'SELECT * FROM t1' }),
    'CREATE TABLE t1 AS SELECT id FROM employees', 'rows', /database state/],
  ['forgot GROUP BY',
    L('SELECT department, COUNT(*) AS n FROM employees GROUP BY department'),
    'SELECT department, 1 AS n FROM employees', null, /./],
  ['technique required',
    L('SELECT first_name FROM employees WHERE salary > (SELECT AVG(salary) FROM employees)', { requires: ['avg('] }),
    'SELECT first_name FROM employees WHERE salary > 93000', 'technique', /avg\(/]
];

(async () => {
  SqlEngine.init(await initSql());
  let pass = 0, fail = 0;
  const check = (name, ok, detail) => {
    if (ok) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name + (detail ? '\n         ' + detail : '')); }
  };

  for (const [name, lesson, sql, kind, re] of CASES) {
    const d = SqlExplain.diagnose(sql, lesson);
    const text = d && d.points ? d.headline + ' || ' + d.points.join(' || ') : '';
    check(name,
      d && d.verdict === 'fail' && (kind === null || d.kind === kind) && re.test(text) && d.points.length > 0,
      d ? `kind=${d.kind} :: ${text.slice(0, 300)}` : 'no diagnosis');
  }

  // A correct answer is never "explained".
  const ok = SqlExplain.diagnose('SELECT salary, first_name FROM employees', L('SELECT first_name, salary FROM employees'));
  check('correct answer → pass', ok && ok.verdict === 'pass');

  // Exercise rule explanations.
  const v = SqlExplain.explainValidate({ rowCount: 1, hasCol: 'total' }, ['n'], [[1], [2]]);
  check('validate: row count + missing column', v.length === 2 && /exactly 1 row/.test(v[0]) && /total/.test(v[1]), v.join(' | '));
  check('validate: passing result → no complaints', SqlExplain.explainValidate({ rowCount: 1 }, ['n'], [[1]]).length === 0);

  // The explainer must never leak a reference query verbatim.
  let leaks = 0;
  for (const [, lesson, sql] of CASES) {
    const d = SqlExplain.diagnose(sql, lesson);
    const text = d && d.points ? d.points.join(' ') : '';
    if (lesson.refs.some(r => text.includes(r))) leaks++;
  }
  check('no reference query leaked in any explanation', leaks === 0);

  console.log(`\n${pass} checks passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
})();
