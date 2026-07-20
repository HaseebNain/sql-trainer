// Curriculum verification harness.
// Seeds the same SQLite database the app uses, then checks every lesson and
// exercise: starters must run cleanly, lesson starters must satisfy their own
// solution matcher, and any exercise that carries a `_ref` query must pass its
// own `validate` rules. Run with: node tools/verify.js
const path = require('path');
const fs = require('fs');
const initSqlJs = require(path.join(__dirname, '..', 'vendor', 'sql-wasm.js'));

const dataSrc = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
const { curriculum, schemas } = new Function(dataSrc + ';\nreturn { curriculum, schemas };')();

function freshDb(SQL) {
  const db = new SQL.Database();
  for (const tbl of Object.values(schemas)) {
    db.run(tbl.create);
    for (const ins of tbl.insert) db.run(ins);
  }
  return db;
}

// Mirrors app.js runQuery: last result set wins.
function runSql(db, sql) {
  const results = db.exec(sql);
  return results.length ? results[results.length - 1] : null;
}

// Mirrors app.js checkSolution string matching.
function solutionMatches(sql, solutions) {
  const clean = sql.toLowerCase().replace(/\s+/g, ' ').replace(/;/g, '').trim();
  return solutions.some(s => clean.includes(s.toLowerCase().replace(/\s+/g, ' ')));
}

// Mirrors app.js checkExercise validate rules.
function validatePasses(v, columns, values) {
  const cols = (columns || []).map(c => c.toLowerCase());
  const rows = values || [];
  if (v.rowCount !== undefined && rows.length !== v.rowCount) return `rowCount ${rows.length} != ${v.rowCount}`;
  if (v.minRows !== undefined && rows.length < v.minRows) return `minRows ${rows.length} < ${v.minRows}`;
  if (v.maxRows !== undefined && rows.length > v.maxRows) return `maxRows ${rows.length} > ${v.maxRows}`;
  if (v.colCount !== undefined && cols.length !== v.colCount) return `colCount ${cols.length} != ${v.colCount}`;
  if (v.hasCol && !cols.includes(v.hasCol.toLowerCase())) return `missing col ${v.hasCol} (got ${cols.join(',')})`;
  if (v.hasCols && !v.hasCols.every(c => cols.includes(c.toLowerCase()))) return `missing cols ${v.hasCols}`;
  if (v.notCol && cols.includes(v.notCol.toLowerCase())) return `forbidden col ${v.notCol}`;
  if (v.allEq) {
    const ci = cols.indexOf(v.allEq.col.toLowerCase());
    if (ci === -1) return `allEq col ${v.allEq.col} missing`;
    const expected = String(v.allEq.val).toLowerCase();
    if (!rows.every(r => String(r[ci] ?? '').toLowerCase() === expected)) return `allEq ${v.allEq.col} != ${v.allEq.val}`;
  }
  if (v.allGt) {
    const ci = cols.indexOf(v.allGt.col.toLowerCase());
    if (ci === -1) return `allGt col missing`;
    if (!rows.every(r => Number(r[ci]) > Number(v.allGt.val))) return `allGt ${v.allGt.col} failed`;
  }
  if (v.allLt) {
    const ci = cols.indexOf(v.allLt.col.toLowerCase());
    if (ci === -1) return `allLt col missing`;
    if (!rows.every(r => Number(r[ci]) < Number(v.allLt.val))) return `allLt ${v.allLt.col} failed`;
  }
  if (v.firstVal !== undefined && (!rows.length || String(rows[0][0]) !== String(v.firstVal))) {
    return `firstVal ${rows.length ? rows[0][0] : '(no rows)'} != ${v.firstVal}`;
  }
  if (v.hasValue !== undefined) {
    const target = String(v.hasValue).toLowerCase();
    if (!rows.some(r => r.some(c => String(c ?? '').toLowerCase() === target))) return `hasValue ${v.hasValue} not found`;
  }
  return null;
}

(async () => {
  const SQL = await initSqlJs({ locateFile: f => path.join(__dirname, '..', 'vendor', f) });
  let errors = 0, warnings = 0, lessons = 0, exercises = 0, refChecked = 0;

  for (const day of curriculum) {
    for (const lesson of day.lessons) {
      lessons++;
      // Every lesson gets a fresh DB — mirrors a user reloading the page.
      let db = freshDb(SQL);

      for (const t of lesson.tables || []) {
        if (!schemas[t]) { console.log(`ERROR ${lesson.id}: references unknown table '${t}'`); errors++; }
      }
      try {
        const res = runSql(db, lesson.starter);
        if (!solutionMatches(lesson.starter, lesson.solution)) {
          console.log(`WARN  ${lesson.id} (${lesson.title}): starter does not satisfy its own solution matcher`);
          warnings++;
        }
        if (lesson.expect) {
          const err = validatePasses(lesson.expect, res ? res.columns : [], res ? res.values : []);
          if (err) { console.log(`ERROR ${lesson.id}: starter expect failed — ${err}`); errors++; }
        }
      } catch (e) {
        console.log(`ERROR ${lesson.id} (${lesson.title}): starter throws — ${e.message}`);
        errors++;
      }

      for (const ex of lesson.exercises || []) {
        exercises++;
        if (!ex.validate && !ex.solution) { console.log(`WARN  ${ex.id}: no validate and no solution`); warnings++; }
        if (ex._ref) {
          refChecked++;
          db = freshDb(SQL);
          try {
            const res = runSql(db, ex._ref);
            if (ex.validate) {
              const err = validatePasses(ex.validate, res ? res.columns : [], res ? res.values : []);
              if (err) { console.log(`ERROR ${ex.id}: _ref fails validate — ${err}`); errors++; }
            } else if (ex.solution && !solutionMatches(ex._ref, ex.solution)) {
              console.log(`ERROR ${ex.id}: _ref does not match solution patterns`); errors++;
            }
          } catch (e) {
            console.log(`ERROR ${ex.id}: _ref throws — ${e.message}`);
            errors++;
          }
        }
      }
      db.close();
    }
  }
  console.log(`\n${lessons} lessons, ${exercises} exercises (${refChecked} with _ref checks): ${errors} errors, ${warnings} warnings`);
  process.exit(errors ? 1 : 0);
})();
