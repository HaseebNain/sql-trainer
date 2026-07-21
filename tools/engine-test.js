// Verifies the semantic engine accepts correct-but-differently-written queries
// that the old text matcher rejects, without accepting wrong answers.
// Run with: node tools/engine-test.js
const path = require('path');
const fs = require('fs');
const initSqlJs = require(path.join(__dirname, '..', 'vendor', 'sql-wasm.js'));

const dataSrc = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
const { curriculum, schemas } = new Function(dataSrc + ';\nreturn { curriculum, schemas };')();

// Load engine.js with `schemas` in scope (it references the global).
const engineSrc = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
const SqlEngine = new Function('schemas', 'module',
  engineSrc + ';\nreturn SqlEngine;')(schemas, {});

// Old text matcher (mirrors app.js checkSolution fast path).
function textMatches(sql, solutions) {
  const clean = sql.toLowerCase().replace(/\s+/g, ' ').replace(/;/g, '').trim();
  return solutions.some(s => clean.includes(s.toLowerCase().replace(/\s+/g, ' ')));
}

function lessonById(id) {
  for (const d of curriculum) for (const l of d.lessons) if (l.id === id) return l;
  throw new Error('no lesson ' + id);
}

(async () => {
  const SQL = await initSqlJs({ locateFile: f => path.join(__dirname, '..', 'vendor', f) });
  SqlEngine.init(SQL);

  let pass = 0, fail = 0;
  const check = (name, cond) => {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name); }
  };

  // Correct queries written differently from the solution key — old matcher
  // rejects them, the engine should accept them.
  const accept = [
    ['1.2', 'SELECT salary, first_name FROM employees'],            // reordered columns
    ['1.2', 'select   first_name ,\n  salary\nfrom EMPLOYEES;'],    // whitespace/case
    ['1.3', "SELECT * FROM employees WHERE department >= 'Engineering' AND department <= 'Engineering'"], // equiv predicate
    ['1.3', 'SELECT e.* FROM employees e WHERE e.department = \'Engineering\''], // table alias
    ['1.5', 'SELECT salary, first_name FROM employees ORDER BY salary DESC LIMIT 3'], // reordered cols, ordered path
    ['2.1', "SELECT first_name, department, salary FROM employees WHERE salary > 90000 AND department = 'Engineering'"], // reordered AND
    ['2.2', "SELECT first_name, department FROM employees WHERE department = 'Engineering' OR department = 'Marketing'"], // IN rewritten as OR
    ['2.4', 'SELECT first_name, salary FROM employees WHERE salary >= 70000 AND salary <= 90000'], // BETWEEN as >=/<=
  ];
  console.log('Should ACCEPT (correct, differently written):');
  for (const [id, sql] of accept) {
    const l = lessonById(id);
    const oldWouldReject = !textMatches(sql, l.solution);
    check(`${id}: ${sql.replace(/\s+/g, ' ').slice(0, 60)}`,
      SqlEngine.matchesLesson(sql, l) && oldWouldReject);
  }

  // Wrong answers must still be rejected by the engine.
  const reject = [
    ['1.2', 'SELECT first_name, department FROM employees'],   // wrong column
    ['1.3', "SELECT * FROM employees WHERE department = 'Finance'"], // wrong filter
    ['1.5', 'SELECT first_name, salary FROM employees ORDER BY salary ASC LIMIT 3'], // wrong direction (bottom 3)
    ['1.3', "SELECT first_name FROM employees WHERE department = 'Engineering'"], // right rows, wrong columns
  ];
  console.log('\nShould REJECT (wrong results):');
  for (const [id, sql] of reject) {
    const l = lessonById(id);
    check(`${id}: ${sql.replace(/\s+/g, ' ').slice(0, 60)}`, !SqlEngine.matchesLesson(sql, l));
  }

  // Every lesson's own starter must be accepted by the engine when it is a
  // SELECT (result-set self-consistency) — regression guard.
  console.log('\nStarters self-validate (where a SELECT reference exists):');
  let starterChecked = 0, starterOk = 0;
  for (const d of curriculum) for (const l of d.lessons) {
    if (!l.starter || !l.starter.trim()) continue;
    if (SqlEngine.referenceQueries(l).length === 0) continue;
    const cand = SqlEngine.runIsolated(l.starter);
    if (!cand || !cand.columns.length) continue; // DDL/DML starter
    starterChecked++;
    if (SqlEngine.matchesLesson(l.starter, l)) starterOk++;
    else { fail++; console.log('  FAIL starter ' + l.id + ' not self-accepted'); }
  }
  console.log(`  ${starterOk}/${starterChecked} SELECT starters self-accepted`);

  console.log(`\n${pass} checks passed, ${fail} failed.`);
  process.exit(fail ? 1 : 0);
})();
