// Starts the vendored Pyodide under Node for the tools, using the SAME embedded
// base64 payloads the browser uses (so a broken vendor file fails here too),
// and attaches python.js's harness to it.
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { ROOT, loadCourse, initSql } = require('./load.js');

async function initPython(opts) {
  opts = opts || {};
  const vend = path.join(ROOT, 'vendor', 'pyodide');
  const g = {};
  for (const f of ['pyodide-core-b64.js', 'pyodide-sqlite3-b64.js', 'pyodide-pandas-b64.js']) {
    new Function('globalThis', 'window', fs.readFileSync(path.join(vend, f), 'utf8'))(g, undefined);
  }
  // Unpack to a scratch folder: Pyodide under Node reads its files from disk.
  const dir = path.join(os.tmpdir(), 'sql-quest-pyodide-' + g.PYODIDE_VERSION);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, a] of Object.entries(g.PYODIDE_ASSETS)) {
    const buf = Buffer.from(a.b64, 'base64');
    fs.writeFileSync(path.join(dir, name), a.gz ? zlib.gunzipSync(buf) : buf);
  }
  fs.copyFileSync(path.join(vend, 'pyodide.asm.js'), path.join(dir, 'pyodide.asm.js'));
  fs.copyFileSync(path.join(vend, 'pyodide.js'), path.join(dir, 'pyodide.js'));
  const { loadPyodide } = require(path.join(dir, 'pyodide.js'));
  const py = await loadPyodide({ indexURL: dir + path.sep, packageBaseUrl: dir + path.sep, lockFileContents: g.PYODIDE_LOCK });
  const quiet = { messageCallback: () => {} };
  await py.loadPackage('sqlite3', quiet);
  if (opts.pandas !== false) { await py.loadPackage('pandas', quiet); py.runPython('import pandas'); }

  const PyRunner = require(path.join(ROOT, 'python.js'));
  PyRunner.attach(py);

  // shop.db: the practice database exactly as the app seeds it.
  const { schemas } = opts.course || loadCourse();
  const SQL = await initSql();
  PyRunner.setDbProvider(() => {
    const d = new SQL.Database();
    for (const tbl of Object.values(schemas)) { d.run(tbl.create); for (const ins of tbl.insert) d.run(ins); }
    const bytes = d.export();
    d.close();
    return bytes;
  });
  return PyRunner;
}

module.exports = { initPython };
