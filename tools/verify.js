// Curriculum verification harness.
// Seeds the same SQLite database the app uses, then checks every lesson and
// exercise: starters must run cleanly, every lesson must have a self-validating
// result-set REFERENCE (refs.js) so the engine can grade it, and any exercise
// that carries a `_ref` query must pass its own `validate` rules.
// Run with: node tools/verify.js
const { loadCourse, initSql } = require('./load');
const { sqlCurriculum: curriculum, schemas, SqlEngine, DialectCheck, INTERVIEW_BANK } = loadCourse();

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
  if (results.length) return results[results.length - 1];
  // A SELECT that matched zero rows: db.exec() reports nothing, but the app
  // still shows (and grades) its columns — see resultColumnsFor in app.js.
  let cols = null;
  try {
    for (const stmt of db.iterateStatements(sql)) {
      const c = stmt.getColumnNames();
      if (c && c.length) cols = c;
      stmt.free();
    }
  } catch { cols = null; }
  return cols ? { columns: cols, values: [] } : null;
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
  const SQL = await initSql();
  SqlEngine.init(SQL);
  let errors = 0, warnings = 0, lessons = 0, exercises = 0, refChecked = 0, uncovered = 0, translations = 0;
  const seenLessonIds = new Set(), seenExerciseIds = new Set();
  // Capstone lessons (`liveSetup`) build on models from earlier lessons; the
  // app runs their `setup` on the live database when the lesson opens, so the
  // starter and exercise references are checked against that same state.
  const prepared = lesson => {
    const d = freshDb(SQL);
    if (lesson.liveSetup && lesson.setup) d.exec(lesson.setup);
    return d;
  };

  for (const day of curriculum) {
    for (const lesson of day.lessons) {
      lessons++;
      // Every lesson gets a fresh DB — mirrors a user reloading the page.
      let db;
      try { db = prepared(lesson); }
      catch (e) { console.log(`ERROR ${lesson.id}: liveSetup throws — ${e.message}`); errors++; db = freshDb(SQL); }
      if (seenLessonIds.has(lesson.id)) { console.log(`ERROR ${lesson.id}: duplicate lesson id`); errors++; }
      seenLessonIds.add(lesson.id);
      for (const f of ['title', 'theory', 'task', 'hint', 'chips', 'xp', 'tables']) {
        if (lesson[f] === undefined) { console.log(`ERROR ${lesson.id}: missing field '${f}'`); errors++; }
      }
      if (typeof lesson.starter !== 'string') { console.log(`ERROR ${lesson.id}: missing starter`); errors++; }

      for (const t of lesson.tables || []) {
        if (!schemas[t]) { console.log(`ERROR ${lesson.id}: references unknown table '${t}'`); errors++; }
      }
      if (lesson.starter && lesson.starter.trim()) {
        try {
          const res = runSql(db, lesson.starter);
          if (lesson.expect) {
            const err = validatePasses(lesson.expect, res ? res.columns : [], res ? res.values : []);
            if (err) { console.log(`ERROR ${lesson.id}: starter expect failed — ${err}`); errors++; }
          }
        } catch (e) {
          console.log(`ERROR ${lesson.id} (${lesson.title}): starter throws — ${e.message}`);
          errors++;
        }
      }

      // Engine coverage: every lesson must have a self-validating reference so
      // the app can grade it by result-set equivalence (no legacy text match).
      const refs = SqlEngine.referenceQueries(lesson);
      const probe = SqlEngine.lessonProbe(lesson);
      const setup = SqlEngine.lessonSetup(lesson);
      const seq = x => [setup, x, probe].filter(s => s != null);
      const runnable = refs.filter(r => { const res = SqlEngine.runOnFresh(seq(r)); return res && res.columns.length; });
      if (!runnable.length) {
        console.log(`ERROR ${lesson.id} (${lesson.title}): no self-validating reference (add one in refs.js)`);
        errors++; uncovered++;
      } else {
        for (const r of runnable) {
          if (SqlEngine.evaluate(r, lesson) !== 'pass') {
            console.log(`ERROR ${lesson.id}: reference does not self-validate — ${r.slice(0, 60)}`);
            errors++;
          }
        }
      }

      // Dialect lessons: the model translation must pass its own structural
      // check, and the SQLite answer must NOT pass as a translation.
      for (const tr of lesson.translate || []) {
        translations++;
        if (!DialectCheck) { console.log(`ERROR ${lesson.id}: translate present but dialect.js missing`); errors++; continue; }
        const own = DialectCheck.check(tr.model, tr);
        if (!own.ok) { console.log(`ERROR ${lesson.id} [${tr.dialect}]: model translation fails its own check — ${own.problems.map(p => p.msg).join(' | ')}`); errors++; }
        for (const r of refs) {
          if (DialectCheck.check(r, tr).ok) { console.log(`ERROR ${lesson.id} [${tr.dialect}]: the SQLite reference passes as a translation (check is too weak)`); errors++; }
        }
      }

      for (const ex of lesson.exercises || []) {
        exercises++;
        if (seenExerciseIds.has(ex.id)) { console.log(`ERROR ${ex.id}: duplicate exercise id`); errors++; }
        seenExerciseIds.add(ex.id);
        if (!ex.validate && !ex.solution) { console.log(`WARN  ${ex.id}: no validate and no solution`); warnings++; }
        if (ex._ref) {
          refChecked++;
          db.close();
          db = prepared(lesson);
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
  // Mock-interview bank: every problem is graded by the engine, so its
  // references must run and self-validate exactly like a lesson's.
  const lessonById = id => curriculum.flatMap(d => d.lessons).find(l => l.id === id);
  const seenProblems = new Set();
  for (const p of INTERVIEW_BANK) {
    if (seenProblems.has(p.id)) { console.log(`ERROR ${p.id}: duplicate interview problem id`); errors++; }
    seenProblems.add(p.id);
    for (const t of p.tables || []) if (!schemas[t]) { console.log(`ERROR ${p.id}: unknown table '${t}'`); errors++; }
    if (!p.followups || p.followups.length < 1) { console.log(`ERROR ${p.id}: no follow-up questions`); errors++; }
    for (const d of p.review || []) if (!curriculum.some(x => x.day === d)) { console.log(`ERROR ${p.id}: review day ${d} does not exist`); errors++; }
    let setup = null;
    if (p.setupFrom) {
      const src = lessonById(p.setupFrom);
      if (!src || !src.setup) { console.log(`ERROR ${p.id}: setupFrom '${p.setupFrom}' has no setup`); errors++; continue; }
      setup = src.setup;
    }
    const pseudo = { id: p.id, refs: p.refs, setup };
    if (typeof p.ordered === 'boolean') pseudo.ordered = p.ordered;
    for (const r of p.refs || []) {
      const res = SqlEngine.runOnFresh([setup, r]);
      if (!res || !res.values.length) { console.log(`ERROR ${p.id}: reference returns nothing`); errors++; continue; }
      if (SqlEngine.evaluate(r, pseudo) !== 'pass') { console.log(`ERROR ${p.id}: reference does not self-validate`); errors++; }
    }
    for (const m of p.models || []) {
      const res = SqlEngine.runOnFresh([setup, `SELECT COUNT(*) FROM ${m}`]);
      if (!res) { console.log(`ERROR ${p.id}: model '${m}' is not built by setupFrom`); errors++; }
    }
  }

  console.log(`\n${lessons} lessons (${uncovered} without a reference), ${exercises} exercises (${refChecked} with _ref checks), ${translations} dialect translations, ${INTERVIEW_BANK.length} interview problems: ${errors} errors, ${warnings} warnings`);
  process.exit(errors ? 1 : 0);
})();
