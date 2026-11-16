// SQL Quest — structural checker for warehouse-dialect translations.
//
// The practice database is SQLite, so a Snowflake or BigQuery query can't be
// executed here. Dialect lessons are therefore graded in two steps:
//   1. the SQLite version is graded for real (result-set equivalence), then
//   2. the learner rewrites it for the warehouse dialect, and THIS module
//      checks the translation STRUCTURALLY: the dialect's constructs must be
//      present (`requires`) and the SQLite-only ones gone (`forbids`).
//
// It is a linter, not a parser — it proves the right constructs were used, not
// that the statement would run. The UI says so, and shows a model answer to
// compare against once the check passes.
//
// A translation target (lesson.translate[i]):
//   { dialect: 'snowflake' | 'bigquery' | 'warehouse' (valid in both),
//     label, prompt, starts?: 'merge|select',
//     requires: [{ re, msg }],     // regex source, tested on normalised SQL
//     forbids:  [{ re, msg }],
//     model: '…' }                 // shown after passing; must pass its own check

const DialectCheck = (function () {
  const LABELS = { snowflake: 'Snowflake', bigquery: 'BigQuery', warehouse: 'Snowflake & BigQuery' };

  // SQLite-isms that exist in neither warehouse. Checked on every translation.
  const SQLITE_ONLY = [
    { re: '\\bstrftime\\s*\\(', msg: '<code>strftime()</code> is SQLite-only. Snowflake: <code>TO_CHAR(d, \'YYYY-MM\')</code> / <code>DATE_TRUNC</code>. BigQuery: <code>FORMAT_DATE(\'%Y-%m\', d)</code> / <code>DATE_TRUNC</code>.' },
    { re: '\\bjulianday\\s*\\(', msg: '<code>julianday()</code> is SQLite-only. Snowflake: <code>DATEDIFF(\'day\', a, b)</code>. BigQuery: <code>DATE_DIFF(b, a, DAY)</code>.' },
    { re: '\\bgroup_concat\\s*\\(', msg: '<code>group_concat()</code> is SQLite/MySQL. Snowflake: <code>LISTAGG(x, \', \') WITHIN GROUP (ORDER BY x)</code>. BigQuery: <code>STRING_AGG(x, \', \' ORDER BY x)</code>.' },
    { re: '\\bjson_each\\s*\\(', msg: '<code>json_each()</code> is SQLite-only. Snowflake: <code>LATERAL FLATTEN(input =&gt; col)</code>. BigQuery: <code>UNNEST(col)</code>.' },
    { re: "\\bdate\\s*\\([^)]*'(start of|\\+|-)", msg: 'SQLite date modifiers (<code>date(d, \'start of month\')</code>, <code>\'+30 days\'</code>) don\'t exist in a warehouse — use <code>DATE_TRUNC</code> / <code>DATEADD</code> / <code>DATE_ADD</code>.' },
    { re: '\\binsert\\s+or\\s+(ignore|replace)\\b', msg: '<code>INSERT OR IGNORE / REPLACE</code> is SQLite-only — warehouses upsert with <code>MERGE</code>.' },
    { re: '\\bon\\s+conflict\\b', msg: '<code>ON CONFLICT</code> is SQLite/Postgres — warehouses upsert with <code>MERGE</code>.' },
    { re: '\\bsqlite_master\\b|\\bpragma\\b', msg: '<code>sqlite_master</code> / <code>PRAGMA</code> are SQLite internals — warehouses expose <code>INFORMATION_SCHEMA</code>.' }
  ];

  // Lower-case, strip comments and a trailing semicolon, collapse whitespace.
  function normalize(sql) {
    return String(sql || '')
      .replace(/--[^\n]*/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/;+\s*$/, '')
      .toLowerCase();
  }

  function balanced(s) {
    const bare = s.replace(/'(?:[^']|'')*'/g, "''");
    let depth = 0;
    for (const ch of bare) {
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth < 0) return false; }
    }
    return depth === 0 && (bare.match(/'/g) || []).length % 2 === 0;
  }

  const test = (re, s) => new RegExp(re, 'i').test(s);

  // → { ok, problems: [{ type: 'empty'|'syntax'|'missing'|'forbidden', msg }], label }
  function check(sql, tr) {
    const s = normalize(sql);
    const label = (tr && (tr.label || LABELS[tr.dialect])) || 'the warehouse dialect';
    const problems = [];
    if (!s) return { ok: false, label, problems: [{ type: 'empty', msg: `Write your ${label} version first.` }] };
    if (!balanced(s)) problems.push({ type: 'syntax', msg: 'Parentheses or quotes aren\'t balanced — check for a missing <code>)</code> or <code>\'</code>.' });
    if (tr.starts && !test('^(' + tr.starts + ')\\b', s)) {
      problems.push({ type: 'syntax', msg: `The statement should start with <code>${tr.starts.split('|')[0].toUpperCase()}</code>.` });
    }
    for (const r of tr.requires || []) {
      const res = Array.isArray(r.any) ? r.any : [r.re];
      if (!res.some(re => test(re, s))) problems.push({ type: 'missing', msg: r.msg });
    }
    for (const f of (tr.forbids || []).concat(SQLITE_ONLY)) {
      if (test(f.re, s)) problems.push({ type: 'forbidden', msg: f.msg });
    }
    return { ok: problems.length === 0, label, problems };
  }

  function labelFor(tr) { return (tr && (tr.label || LABELS[tr.dialect])) || 'Warehouse'; }

  return { check, normalize, labelFor, LABELS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = DialectCheck;
