// Shared loader for the Node tools: builds the same curriculum / schemas /
// reference table / engine the browser gets from index.html's script tags.
// Keep CONTENT_FILES in the same order as the <script> tags in index.html.
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Course content, in load order. data.js declares `curriculum` and `schemas`;
// the add-on files extend them in place.
const CONTENT_FILES = ['data.js', 'data-warehouse.js', 'course-dialects.js', 'course-warehouse.js'];

function loadCourse() {
  const src = CONTENT_FILES.filter(f => fs.existsSync(path.join(ROOT, f))).map(read).join('\n;\n');
  const { curriculum, schemas } = new Function(src + ';\nreturn { curriculum, schemas };')();
  const LESSON_REFS = new Function(read('refs.js') + ';\nreturn LESSON_REFS;')();
  const SqlEngine = new Function('schemas', 'LESSON_REFS', 'module',
    read('engine.js') + ';\nreturn SqlEngine;')(schemas, LESSON_REFS, {});
  const opt = (file, name, args) => fs.existsSync(path.join(ROOT, file))
    ? new Function(...Object.keys(args), 'module', read(file) + `;\nreturn ${name};`)(...Object.values(args), {})
    : null;
  const SqlExplain = opt('explain.js', 'SqlExplain', { SqlEngine, schemas });
  const DialectCheck = opt('dialect.js', 'DialectCheck', {});
  const INTERVIEW_BANK = opt('interview-bank.js', 'INTERVIEW_BANK', {}) || [];
  return { ROOT, read, curriculum, schemas, LESSON_REFS, SqlEngine, SqlExplain, DialectCheck, INTERVIEW_BANK };
}

async function initSql() {
  const initSqlJs = require(path.join(ROOT, 'vendor', 'sql-wasm.js'));
  return initSqlJs({ locateFile: f => path.join(ROOT, 'vendor', f) });
}

module.exports = { loadCourse, initSql, ROOT, CONTENT_FILES };
