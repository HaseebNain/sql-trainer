// SQL Quest — Python runtime and grader.
//
// Python lessons run on Pyodide (CPython compiled to WebAssembly), vendored in
// vendor/pyodide/ and started lazily the first time a Python lesson opens.
// Like the SQL side, nothing is fetched from the network, and it works from
// file://: Pyodide's binaries are embedded as base64 (see
// tools/build-pyodide-vendor.js) and its fetch() calls are answered from them.
//
// Grading mirrors engine.js in spirit: a submission is judged by what it DOES,
// never by matching its text.
//   - `out: true`  — its printed output must equal the reference solution's.
//   - `tests`      — Python run afterwards in the learner's namespace; the
//                    first failed check is the explanation shown to them.
// Every run starts from a clean namespace and a clean working directory holding
// the lesson's `files` (and `shop.db`, a copy of the practice database, when
// the lesson sets `db: true`).

const PyRunner = (() => {
  let py = null;          // the Pyodide instance
  let booting = null;     // promise while starting
  let run_ = null;        // Python-side entry point
  let dbProvider = null;  // () => Uint8Array of a freshly seeded SQLite file
  let dbWritten = false;
  const loadedBundles = new Set();
  const refOutCache = {};

  // ── The Python half of the harness ──
  const HARNESS = String.raw`
import sys, io, os, re, json, shutil, traceback, builtins

_FILE = 'main.py'
_STEP_LIMIT = 2_000_000
_OUT_LIMIT = 20_000

class _StepLimit(BaseException):
    pass

class CheckFail(Exception):
    pass

_TIPS = {
    'NameError': "Python doesn't know that name yet. Check the spelling (names are case-sensitive) and that it is assigned on an earlier line. Text needs quotes: \"hello\", not hello.",
    'IndentationError': "Indentation is syntax in Python. The lines inside an if / for / def block must be indented the same amount (4 spaces), and nothing else should be.",
    'TabError': "This file mixes tabs and spaces. Use 4 spaces per level.",
    'ZeroDivisionError': "Something was divided by zero. Guard the division with an if, or handle it with try / except.",
    'IndexError': "That position doesn't exist. A list of n items has indexes 0 to n-1.",
    'KeyError': "That key isn't in the dictionary. Use d.get(key) for an optional key, or check with 'key in d' first.",
    'AttributeError': "That kind of value has no such method or attribute. Check the value's type - a None where you expected something else is the usual cause.",
    'ModuleNotFoundError': "That module isn't available here. The standard library, sqlite3 and (in the pandas lessons) pandas are.",
    'FileNotFoundError': "No file with that name in the working folder. This lesson's files are listed above the editor.",
    'UnboundLocalError': "A function assigned to that name, which makes it a local variable - but it was read before being assigned inside the function.",
    'RecursionError': "A function kept calling itself without reaching a stopping case.",
}

def _tip(etype, msg):
    if etype == 'TypeError' and 'can only concatenate str' in msg:
        return "You can't glue text and a number together with +. Convert it with str(x), or use an f-string: f\"total {x}\"."
    if etype == 'TypeError' and 'unsupported operand' in msg:
        return "Those two values are different types and can't be combined with that operator. Check for a string that should be a number (int(...) / float(...)) or a None."
    if etype == 'TypeError' and ('positional argument' in msg or 'required' in msg):
        return "The function was called with the wrong number of arguments. Compare the call with the def line."
    if etype == 'ValueError' and 'invalid literal' in msg:
        return "That text can't be converted to a number as it is. Clean it first (strip spaces, remove symbols) or catch the ValueError."
    if etype == 'SyntaxError':
        return "Python couldn't read this line. Look for a missing colon after if / for / def, an unclosed bracket or quote, or = where == was meant."
    return _TIPS.get(etype)

def _input(*a, **k):
    raise RuntimeError("input() isn't available here - assign the value to a variable instead.")

def _fresh_dir(files, use_db):
    os.chdir('/')
    shutil.rmtree('/work', ignore_errors=True)
    os.makedirs('/work')
    os.chdir('/work')
    for name, content in files.items():
        with open(name, 'w', newline='') as f:
            f.write(content)
    if use_db:
        shutil.copyfile('/tmp/_shop.db', '/work/shop.db')

def _local_trace(frame, event, arg):
    if event == 'line':
        _local_trace.n += 1
        if _local_trace.n > _STEP_LIMIT:
            raise _StepLimit()
    return _local_trace
_local_trace.n = 0

def _trace(frame, event, arg):
    return _local_trace if frame.f_code.co_filename in (_FILE, 'tests.py') else None

def _traced_exec(code, ns):
    sys.settrace(_trace)
    try:
        exec(code, ns)
    finally:
        sys.settrace(None)

def _describe(exc, filename):
    """Error dict for an exception raised by code compiled as 'filename'."""
    etype = type(exc).__name__
    msg = str(exc)
    line = None
    if isinstance(exc, SyntaxError):
        line = exc.lineno
        msg = exc.msg or msg
    else:
        for fr in traceback.extract_tb(exc.__traceback__):
            if fr.filename == filename:
                line = fr.lineno
    return {'type': etype, 'msg': msg, 'line': line, 'tip': _tip(etype, msg)}

def _short(v, n=160):
    r = repr(v)
    return r if len(r) <= n else r[:n] + '...'

def _norm_lines(s):
    lines = [l.rstrip() for l in s.replace('\r\n', '\n').split('\n')]
    while lines and lines[-1] == '':
        lines.pop()
    return lines

def _compare_output(out, want):
    got, exp = _norm_lines(out), _norm_lines(want)
    if got == exp:
        return None
    if not got:
        return "Nothing was printed. Use print(...) to show the result."
    for i, (g, e) in enumerate(zip(got, exp)):
        if g != e:
            if g.strip().lower() == e.strip().lower():
                return f"Line {i + 1} of your output is {_code(g)} - close, but it should be exactly {_code(e)} (check capitals and spaces)."
            return f"Line {i + 1} of your output is {_code(g)} - it should be {_code(e)}."
    if len(got) < len(exp):
        return f"Your output stops after {len(got)} line{'s' if len(got) != 1 else ''} - the next line should be {_code(exp[len(got)])}."
    return f"Your output has {len(got) - len(exp)} more line{'s' if len(got) - len(exp) != 1 else ''} than expected - the first extra one is {_code(got[len(exp)])}. Remove any leftover print(...) calls."

def _code(s):
    return '\x60' + str(s) + '\x60'

def _run_tests(tests, ns, out, src):
    stripped = re.sub(r'#[^\n]*', '', src)

    def check(cond, msg):
        if not cond:
            raise CheckFail(msg)

    def eq(got, want, what):
        if isinstance(want, float) and isinstance(got, (int, float)) and not isinstance(got, bool):
            ok = abs(got - want) < 1e-6
        else:
            ok = got == want and isinstance(got, bool) == isinstance(want, bool)
        if not ok:
            hint = ''
            if isinstance(got, str) and not isinstance(want, str):
                hint = ' Yours is text - convert it to a number.'
            elif got is None and '(' in what:
                hint = ' None usually means the function is missing a return.'
            raise CheckFail(f"{what} should be {_code(_short(want))} - yours is {_code(_short(got))}.{hint}")

    _missing = object()
    def var(name, want=_missing):
        if name not in ns:
            raise CheckFail(f"Create a variable named {_code(name)}.")
        if want is not _missing:
            eq(ns[name], want, _code(name))
        return ns[name]

    def fn(name):
        if name not in ns or not callable(ns[name]):
            raise CheckFail(f"Define a function named {_code(name)} with def.")
        return ns[name]

    def printed(*parts):
        for p in parts:
            if str(p) not in out:
                raise CheckFail(f"Your output should include {_code(p)}." if out.strip() else f"Nothing was printed - the output should include {_code(p)}.")

    def uses(pattern, msg):
        if not re.search(pattern, stripped):
            raise CheckFail(msg)

    def avoids(pattern, msg):
        if re.search(pattern, stripped):
            raise CheckFail(msg)

    def raises(exc, f, *args, what=None):
        label = what or f"{getattr(f, '__name__', 'the function')}({', '.join(_short(a, 40) for a in args)})"
        try:
            f(*args)
        except exc:
            return
        except Exception as e:
            raise CheckFail(f"{_code(label)} should raise {exc.__name__} - it raised {type(e).__name__} instead.")
        raise CheckFail(f"{_code(label)} should raise {exc.__name__} - it didn't raise anything.")

    def rerun(**over):
        """Run the learner's code again with some top-level variables given
        different starting values - so a script (no functions yet) can still be
        checked on inputs other than the ones in the starter."""
        import ast
        tree = ast.parse(src)
        seen = set()
        for node in tree.body:
            if (isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name)
                    and node.targets[0].id in over and node.targets[0].id not in seen):
                name = node.targets[0].id
                node.value = ast.parse(repr(over[name]), mode='eval').body
                seen.add(name)
        for name in over:
            if name not in seen:
                raise CheckFail(f"Keep the line that assigns {_code(name)} near the top of your code - the check changes its value to try other inputs.")
        ast.fix_missing_locations(tree)
        ns2 = {'__name__': '__main__', '__builtins__': builtins}
        hold = sys.stdout
        sys.stdout = cap = io.StringIO()
        try:
            exec(compile(tree, _FILE, 'exec'), ns2)
        finally:
            sys.stdout = hold
        ns2['_out'] = cap.getvalue()
        return ns2

    def given(what, **over):
        """rerun(), then compare variables: given({'status': 'green'}, yield_pct=99)"""
        ns2 = rerun(**over)
        setup = ', '.join(f"{k} = {_short(v, 60)}" for k, v in over.items())
        for name, want in what.items():
            if name not in ns2:
                raise CheckFail(f"Create a variable named {_code(name)}.")
            eq(ns2[name], want, f"With {_code(setup)}, {_code(name)}")
        return ns2

    def table(df, cols, what):
        """A DataFrame's rows as plain dicts (floats rounded), after checking its shape."""
        import pandas as pd
        check(isinstance(df, pd.DataFrame), f"{what} should return a DataFrame - yours returned a {type(df).__name__}.")
        check(list(df.columns) == list(cols), f"{what} should have exactly the columns {_code(list(cols))} - yours has {_code(list(df.columns))}.")
        recs = []
        for rec in df.to_dict('records'):
            clean = {}
            for k, v in rec.items():
                if hasattr(v, 'item'):
                    v = v.item()
                if isinstance(v, float):
                    v = round(v, 2)
                clean[k] = v
            recs.append(clean)
        return recs

    env = dict(ns)
    env.update(_out=out, _src=src, check=check, eq=eq, var=var, fn=fn, printed=printed,
               uses=uses, avoids=avoids, raises=raises, lines=lambda: _norm_lines(out),
               rerun=rerun, given=given, table=table, CheckFail=CheckFail)
    try:
        code = compile(tests, 'tests.py', 'exec')
        _local_trace.n = 0
        _traced_exec(code, env)
    except CheckFail as e:
        return str(e)
    except _StepLimit:
        return "Your code ran for too long while it was being checked - is there a loop that never ends?"
    except NameError as e:
        name = getattr(e, 'name', None)
        if name and name not in ns:
            return f"The check looked for {_code(name)} and couldn't find it. Define it with exactly that name."
        return f"Your code raised NameError while being checked: {e}"
    except Exception as e:
        where = ''
        for fr in traceback.extract_tb(e.__traceback__):
            if fr.filename == 'tests.py' and 1 <= fr.lineno <= len(tests.splitlines()):
                where = tests.splitlines()[fr.lineno - 1].strip()
        user_line = None
        for fr in traceback.extract_tb(e.__traceback__):
            if fr.filename == _FILE:
                user_line = fr.lineno
        at = f" (line {user_line} of your code)" if user_line else ''
        return f"Your code raised {_code(type(e).__name__ + ': ' + str(e))}{at} when the check tried it with other inputs."
    return None

def _quest_run(src, files_json, use_db, tests, want_out):
    files = json.loads(files_json) if files_json else {}
    _fresh_dir(files, use_db)
    ns = {'__name__': '__main__', '__builtins__': builtins}
    buf = io.StringIO()
    old = (sys.stdout, sys.stderr, builtins.input)
    sys.stdout = sys.stderr = buf
    builtins.input = _input
    err = None
    fail = None
    try:
        try:
            code = compile(src, _FILE, 'exec')
            _local_trace.n = 0
            _traced_exec(code, ns)
        except _StepLimit:
            err = {'type': 'Stopped', 'msg': 'the code ran for millions of steps without finishing', 'line': None,
                   'tip': "That is almost always a loop that never ends: a while whose condition never becomes False. Make sure something inside the loop changes what the condition tests."}
        except SystemExit:
            pass
        except BaseException as e:
            err = _describe(e, _FILE)
        out = buf.getvalue()
        if err is None:
            if want_out is not None:
                fail = _compare_output(out, want_out)
            if fail is None and tests:
                sys.stdout = sys.stderr = io.StringIO()   # what the checks print is not the learner's output
                fail = _run_tests(tests, ns, out, src)
    finally:
        sys.stdout, sys.stderr, builtins.input = old
        sys.settrace(None)
    out = buf.getvalue()
    if len(out) > _OUT_LIMIT:
        out = out[:_OUT_LIMIT] + '\n... (output cut off)'
    os.chdir('/')
    return json.dumps({'out': out, 'error': err, 'fail': fail})
`;

  // ── Starting Pyodide in the browser ──
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  async function assetBytes(name) {
    const a = PYODIDE_ASSETS[name];
    const bin = atob(a.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (!a.gz) return bytes;
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  // Pyodide asks for its wasm, standard library and wheels with fetch(); from
  // file:// that is blocked, so those requests are served from PYODIDE_ASSETS.
  // Only requests for files we embed, under vendor/pyodide/, are touched.
  function installFetchShim() {
    if (window.__pyFetchShim) return;
    const realFetch = window.fetch.bind(window);
    window.__pyFetchShim = true;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input && input.url) || String(input);
      const name = url.split('?')[0].split('/').pop();
      if (url.includes('vendor/pyodide/') && typeof PYODIDE_ASSETS !== 'undefined' && PYODIDE_ASSETS[name]) {
        return new Response(await assetBytes(name), {
          status: 200,
          headers: { 'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' }
        });
      }
      return realFetch(input, init);
    };
  }

  const BUNDLE_FOR = { sqlite3: 'pyodide-sqlite3-b64.js', pandas: 'pyodide-pandas-b64.js' };

  function load(onStatus) {
    if (py) return Promise.resolve(py);
    if (booting) return booting;
    const say = m => { if (onStatus) onStatus(m); };
    booting = (async () => {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser is too old to run the Python lessons (it has no DecompressionStream). Update it, or use a current Chrome, Edge, Firefox or Safari.');
      say('Loading Python…');
      const base = 'vendor/pyodide/';
      await loadScript(base + 'pyodide-core-b64.js');
      await loadScript(base + 'pyodide-sqlite3-b64.js');
      await loadScript(base + 'pyodide.asm.js');
      await loadScript(base + 'pyodide.js');
      installFetchShim();
      say('Starting Python…');
      const indexURL = new URL(base, document.baseURI).href;
      const inst = await loadPyodide({ indexURL, packageBaseUrl: indexURL, lockFileContents: PYODIDE_LOCK });
      await inst.loadPackage('sqlite3', { messageCallback: () => {} });
      loadedBundles.add('sqlite3');
      attach(inst);
      return inst;
    })();
    booting.catch(() => { booting = null; });
    return booting;
  }

  // Make extra packages importable (browser). `pandas` pulls numpy with it.
  async function ensurePackages(pkgs, onStatus) {
    for (const p of pkgs || []) {
      if (loadedBundles.has(p)) continue;
      if (typeof document !== 'undefined' && BUNDLE_FOR[p]) {
        if (onStatus) onStatus(`Loading ${p} (one time, a few seconds)…`);
        await loadScript('vendor/pyodide/' + BUNDLE_FOR[p]);
      }
      await py.loadPackage(p, { messageCallback: () => {} });
      py.runPython(`import ${p}`);   // pay the import cost once, outside any graded run
      loadedBundles.add(p);
    }
  }

  // Install the harness into a Pyodide instance (the Node tools call this
  // directly with an instance they started themselves).
  function attach(inst) {
    py = inst;
    py.runPython(HARNESS);
    run_ = py.globals.get('_quest_run');
    dbWritten = false;
    return py;
  }

  function setDbProvider(fn) { dbProvider = fn; dbWritten = false; }

  function specFiles(spec, lesson) {
    return Object.assign({}, (lesson && lesson.files) || {}, (spec && spec.files) || {});
  }
  function needsDb(spec, lesson) { return !!((lesson && lesson.db) || (spec && spec.db)); }

  // Run code. `opts.tests` / `opts.wantOut` turn the run into a graded one.
  function run(code, lesson, opts) {
    if (!py) throw new Error('Python is not loaded yet');
    opts = opts || {};
    const spec = opts.spec || lesson;
    const useDb = needsDb(spec, lesson);
    if (useDb && !dbWritten) {
      if (!dbProvider) throw new Error('No practice database available');
      py.FS.writeFile('/tmp/_shop.db', dbProvider());
      dbWritten = true;
    }
    const json = run_(code, JSON.stringify(specFiles(spec, lesson)), useDb,
      opts.tests || undefined, opts.wantOut == null ? undefined : opts.wantOut);   // undefined → None (null would not be)
    return JSON.parse(json);
  }

  // What the reference solution prints (cached per lesson / exercise).
  function refOutput(spec, lesson) {
    if (refOutCache[spec.id] !== undefined) return refOutCache[spec.id];
    const r = run(specRef(spec), lesson, { spec });
    if (r.error) throw new Error(`reference for ${spec.id} failed: ${r.error.type}: ${r.error.msg}`);
    return (refOutCache[spec.id] = r.out);
  }
  function specRef(spec) { return spec.ref || spec._ref || ''; }

  // Grade `code` against a lesson or exercise spec.
  // → { verdict: 'pass' | 'fail' | 'error', out, error, why }
  function grade(code, spec, lesson) {
    const wantOut = spec.out ? refOutput(spec, lesson) : undefined;
    const r = run(code, lesson, { spec, tests: spec.tests || '', wantOut });
    const verdict = r.error ? 'error' : r.fail ? 'fail' : 'pass';
    return { verdict, out: r.out, error: r.error, why: r.fail || '' };
  }

  // A spec can be graded only if it checks something.
  function gradable(spec) { return !!(spec && (spec.out || spec.tests)); }

  return {
    load, attach, ensurePackages, setDbProvider, run, grade, gradable, refOutput, specRef,
    ready: () => !!py,
    version: () => (py ? py.version : null)
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PyRunner;
