// Verifies the result-set validation references.
// For every lesson it checks the engine has a usable reference and that each
// reference SELF-VALIDATES: feeding a reference query back through the engine
// must return 'pass'. Also reports which lessons still lack an executable
// reference (i.e. still depend on the legacy text matcher).
// Run with: node tools/verify-refs.js  [--all]
const path = require('path');
const fs = require('fs');
const initSqlJs = require(path.join(__dirname, '..', 'vendor', 'sql-wasm.js'));
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const { curriculum, schemas } = new Function(read('data.js') + ';\nreturn { curriculum, schemas };')();
const LESSON_REFS = new Function(read('refs.js') + ';\nreturn LESSON_REFS;')();
const SqlEngine = new Function('schemas', 'LESSON_REFS', 'module',
  read('engine.js') + ';\nreturn SqlEngine;')(schemas, LESSON_REFS, {});

const showAll = process.argv.includes('--all');

(async () => {
  const SQL = await initSqlJs({ locateFile: f => path.join(ROOT, 'vendor', f) });
  SqlEngine.init(SQL);

  let total = 0, covered = 0, uncovered = 0, badRef = 0, ambiguous = 0;
  const uncoveredIds = [];

  for (const day of curriculum) {
    for (const lesson of day.lessons) {
      total++;
      const refs = SqlEngine.referenceQueries(lesson);
      const probe = SqlEngine.lessonProbe(lesson);
      const setup = SqlEngine.lessonSetup(lesson);
      const seq = x => [setup, x, probe].filter(s => s != null);

      // Is there at least one reference that yields something comparable?
      let usable = false;
      for (const r of refs) {
        const res = SqlEngine.runOnFresh(seq(r));
        if (res && res.columns.length) { usable = true; break; }
      }
      if (!usable) { uncovered++; uncoveredIds.push(lesson.id); continue; }
      covered++;

      // Every reference must self-validate through the engine.
      for (const r of refs) {
        const res = SqlEngine.runOnFresh(seq(r));
        if (!res || !res.columns.length) continue; // alt ref not runnable here (e.g. FULL OUTER JOIN) — skip
        if (SqlEngine.evaluate(r, lesson) !== 'pass') {
          console.log(`BAD-REF ${lesson.id}: reference does not self-validate -> ${r.slice(0, 70)}`);
          badRef++;
        }
      }

      // Cross-check: an authored reference should be on-topic w.r.t. the legacy
      // solution fragments (warns if a ref shares no solution fragment).
      if (LESSON_REFS[lesson.id] && Array.isArray(lesson.solution)) {
        const ok = refs.some(r => {
          const clean = r.toLowerCase().replace(/\s+/g, ' ');
          return lesson.solution.some(s => clean.includes(s.toLowerCase().replace(/\s+/g, ' ')));
        });
        if (!ok && showAll) console.log(`  note ${lesson.id}: no ref contains a legacy solution fragment (check intent)`);
      }
    }
  }

  if (uncoveredIds.length) {
    console.log(`\nLessons still WITHOUT an executable reference (${uncoveredIds.length}):`);
    console.log('  ' + uncoveredIds.join(', '));
  }
  console.log(`\n${total} lessons: ${covered} covered, ${uncovered} uncovered, ${badRef} bad references.`);
  process.exit(badRef ? 1 : 0);
})();
