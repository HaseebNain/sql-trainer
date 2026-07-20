// Scratch: inspect the seed DB and run ad-hoc queries while authoring lessons.
// Usage: node tools/explore.js ["SQL..."]
const path = require('path');
const fs = require('fs');
const initSqlJs = require(path.join(__dirname, '..', 'vendor', 'sql-wasm.js'));
const src = fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8');
const { schemas } = new Function(src + ';return {curriculum,schemas};')();

initSqlJs({ locateFile: f => path.join(__dirname, '..', 'vendor', f) }).then(SQL => {
  const db = new SQL.Database();
  for (const t of Object.values(schemas)) { db.run(t.create); for (const i of t.insert) db.run(i); }
  const sql = process.argv[2];
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
  const tbls = db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0].values.flat();
  for (const t of tbls) {
    const n = db.exec(`SELECT COUNT(*) FROM ${t}`)[0].values[0][0];
    const cols = db.exec(`PRAGMA table_info(${t})`)[0].values.map(r => r[1] + ':' + r[2]).join(', ');
    console.log(`${t} (${n} rows): ${cols}`);
  }
  console.log('sqlite version:', db.exec('select sqlite_version()')[0].values[0][0]);
});
