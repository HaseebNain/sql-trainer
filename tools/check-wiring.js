// Static wiring check: every onclick/onkeydown handler referenced from markup
// (static index.html + template strings in app.js) must exist as a function in
// app.js, and every getElementById target must exist in index.html or be
// created dynamically. Run with: node tools/check-wiring.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// All files that build UI: handlers and ids may be defined in any of them.
const UI_FILES = ['app.js', 'ai.js', 'interview.js'];
const app = UI_FILES.filter(f => fs.existsSync(path.join(root, f))).map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const all = html + '\n' + app;

let errors = 0;

// 1. Handlers referenced in on* attributes anywhere.
const handlerRefs = new Set();
for (const m of all.matchAll(/on(?:click|keydown|change|input)="([a-zA-Z_$][\w$]*)\s*\(/g)) handlerRefs.add(m[1]);
for (const fn of handlerRefs) {
  const defined = new RegExp(`(function\\s+${fn}\\s*\\(|(?:const|let|var)\\s+${fn}\\s*=)`).test(app) || ['event', 'if'].includes(fn);
  if (!defined) { console.log(`ERROR: handler ${fn}() referenced but not defined in ${UI_FILES.join(' / ')}`); errors++; }
}

// 1b. Namespaced handlers — onclick="Interview.next()" — must be exported by
//     that module (listed in its `return { … }`).
for (const m of all.matchAll(/on(?:click|keydown|change|input)="[^"]*?\b(Interview|AI)\.([a-zA-Z_$][\w$]*)\s*\(/g)) {
  const exported = new RegExp(`return\\s*\\{[^}]*\\b${m[2]}\\b[^}]*\\}`).test(app);
  if (!exported) { console.log(`ERROR: ${m[1]}.${m[2]}() referenced in markup but not exported`); errors++; }
}

// 2. getElementById targets must exist as id="..." in static HTML or in a
//    template string in app.js.
const idsUsed = new Set();
for (const m of app.matchAll(/getElementById\('([\w-]+)'\)/g)) idsUsed.add(m[1]);
const idsDefined = new Set();
for (const m of all.matchAll(/id="([\w-]+)"/g)) idsDefined.add(m[1]);
for (const m of app.matchAll(/\.id\s*=\s*'([\w-]+)'/g)) idsDefined.add(m[1]);
for (const id of idsUsed) {
  if (!idsDefined.has(id)) { console.log(`ERROR: getElementById('${id}') has no matching id= anywhere`); errors++; }
}

// 3. Globals the scripts depend on, in load order.
for (const dep of ['CodeMirror', 'initSqlJs', 'curriculum', 'schemas']) {
  if (!app.includes(dep)) { console.log(`WARN: app.js never references ${dep}`); }
}

// 4. Script/link references in index.html must exist on disk.
for (const m of html.matchAll(/(?:src|href)="((?!http)[^"]+)"/g)) {
  if (!fs.existsSync(path.join(root, m[1]))) { console.log(`ERROR: index.html references missing file ${m[1]}`); errors++; }
}

console.log(errors ? `${errors} wiring errors` : 'wiring OK');
process.exit(errors ? 1 : 0);
