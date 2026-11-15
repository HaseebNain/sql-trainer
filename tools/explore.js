// Scratch: inspect the seed DB and run ad-hoc queries while authoring lessons.
// Usage: node tools/explore.js ["SQL..."] [--lesson 36.1]
//   --lesson <id>  first run that lesson's `setup` (builds the capstone models
//                  it depends on), so you can query stg_/dim_/fact_ objects.
const { loadCourse, initSql } = require('./load');
const { curriculum, schemas } = loadCourse();

const args = process.argv.slice(2);
const li = args.indexOf('--lesson');
const lessonId = li >= 0 ? args.splice(li, 2)[1] : null;
const sql = args[0];

initSql().then(SQL => {
  const db = new SQL.Database();
  for (const t of Object.values(schemas)) { db.run(t.create); for (const i of t.insert) db.run(i); }
  if (lessonId) {
    const lesson = curriculum.flatMap(d => d.lessons).find(l => l.id === lessonId);
    if (!lesson) { console.error('no lesson ' + lessonId); process.exit(1); }
    if (lesson.setup) db.exec(lesson.setup);
  }
  if (sql) {
    const res = db.exec(sql);
    for (const r of res) {
      console.log(r.columns.join(' | '));
      for (const row of r.values) console.log(row.join(' | '));
      console.log('--- ' + r.values.length + ' rows');
    }
    if (!res.length) console.log('(no result sets)');
    return;
  }
  const tbls = db.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name")[0].values.flat();
  for (const t of tbls) {
    const n = db.exec(`SELECT COUNT(*) FROM ${t}`)[0].values[0][0];
    const cols = db.exec(`PRAGMA table_info(${t})`)[0].values.map(r => r[1] + ':' + r[2]).join(', ');
    console.log(`${t} (${n} rows): ${cols}`);
  }
  console.log('sqlite version:', db.exec('select sqlite_version()')[0].values[0][0]);
});
