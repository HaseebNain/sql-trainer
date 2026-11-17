// Gate for the Python track: every lesson and exercise must be gradable, its
// reference solution must pass, and the code a learner starts from must NOT.
// Runs the real grader (python.js) on the vendored Pyodide.
//
//   node tools/verify-python.js            all Python lessons
//   node tools/verify-python.js 44.2       one lesson, with details
const { loadCourse } = require('./load.js');
const { initPython } = require('./py-load.js');

(async () => {
  const course = loadCourse();
  const only = process.argv[2];
  const lessons = course.curriculum.flatMap(d => d.lessons.map(l => ({ l, day: d.day })))
    .filter(x => x.l.lang === 'python' && (!only || x.l.id === only));
  if (!lessons.length) { console.log('no Python lessons found'); process.exit(1); }

  const Py = await initPython({ course });
  let errors = 0, nLessons = 0, nEx = 0;
  const bad = (id, msg) => { console.log(`ERROR ${id}: ${msg}`); errors++; };
  const ids = new Set();

  const checkSpec = (spec, lesson, label) => {
    if (ids.has(spec.id)) bad(spec.id, 'duplicate id');
    ids.add(spec.id);
    if (!Py.gradable(spec)) return bad(spec.id, 'nothing to grade — needs `out: true` and/or `tests`');
    const ref = Py.specRef(spec);
    if (!ref) return bad(spec.id, 'no reference solution');
    let g;
    try { g = Py.grade(ref, spec, lesson); } catch (e) { return bad(spec.id, 'reference crashed the grader: ' + String(e.message).slice(0, 300)); }
    if (g.verdict !== 'pass') bad(spec.id, `${label} reference does not pass → ${g.verdict}: ${g.error ? `${g.error.type}: ${g.error.msg} (line ${g.error.line})` : g.why}`);
    if (only) console.log(`  ${spec.id} reference: ${g.verdict}${g.out ? '\n    | ' + g.out.trimEnd().split('\n').join('\n    | ') : ''}`);

    // Things that must not pass: an empty editor, the starter, and any `_wrong` samples.
    const mustFail = [['an empty editor', '']];
    if (spec.starter !== undefined) mustFail.push(['the starter', spec.starter]);
    (spec._wrong || []).forEach((w, i) => mustFail.push([`_wrong[${i}]`, w]));
    for (const [what, code] of mustFail) {
      let r;
      try { r = Py.grade(code, spec, lesson); } catch (e) { bad(spec.id, `${what} crashed the grader: ${String(e.message).slice(0, 300)}`); continue; }
      if (r.verdict === 'pass') bad(spec.id, `${what} already passes`);
      else if (only) console.log(`  ${spec.id} ${what}: ${r.verdict} — ${r.error ? `${r.error.type}: ${r.error.msg}` : r.why}`);
    }
  };

  for (const { l } of lessons) {
    nLessons++;
    for (const f of ['title', 'theory', 'task', 'hint', 'starter']) if (!l[f]) bad(l.id, `missing ${f}`);
    if (!l.xp) bad(l.id, 'missing xp');
    if (!Array.isArray(l.chips)) bad(l.id, 'missing chips');
    checkSpec(l, l, 'lesson');
    for (const ex of l.exercises || []) {
      nEx++;
      for (const f of ['prompt', 'hint']) if (!ex[f]) bad(ex.id, `missing ${f}`);
      if (!ex.xp) bad(ex.id, 'missing xp');
      checkSpec(ex, l, 'exercise');
    }
  }
  console.log(`Python track: ${nLessons} lessons, ${nEx} exercises on Pyodide ${Py.version()}: ${errors} errors`);
  process.exit(errors ? 1 : 0);
})().catch(e => { console.error('verify-python failed:', String(e && e.message).slice(0, 800)); process.exit(1); });
