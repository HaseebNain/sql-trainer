// SQL Quest — Python track, part 1 (Days 40–42): the language itself.
//
// Loaded after the SQL course files; appends days to `curriculum`. A Python
// lesson is an ordinary lesson object with `lang: 'python'` (set by
// PyCourse.add), run and graded by python.js instead of engine.js:
//
//   starter   code placed in the editor
//   ref       reference solution (never shown)
//   out       true → printed output must equal the reference's
//   tests     Python run after the learner's code, in its namespace. Helpers:
//               var(name[, want])   fn(name)   eq(got, want, what)   check(cond, msg)
//               printed(text…)      uses(regex, msg)   avoids(regex, msg)
//               raises(Exc, f, *args)
//               given({var: want}, name=value…)  re-runs the script with other
//                   starting values, so lessons before `def` can still be
//                   checked on more than the starter's inputs
//               table(df, cols, what)            DataFrame → rows (pandas lessons)
//   files     { name: text } written to the working folder before every run
//   db        true → `shop.db`, a copy of the practice database, is there too
//   pkgs      ['pandas'] → loaded before the lesson runs
//
// Exercises take the same fields (`_ref` for the reference). `node
// tools/verify-python.js` checks every reference passes and every starter
// does not. Python source is written with the py`` tag below: String.raw
// (so \n stays \n) plus dedent. Don't write `${` or a backtick inside it.

const PyCourse = (() => {
  const dedent = s => {
    const lines = s.replace(/^\n/, '').replace(/[ \t]+$/, '').split('\n');
    const pad = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
    return lines.map(l => l.slice(pad)).join('\n');
  };
  const py = (strings, ...vals) => dedent(String.raw({ raw: strings.raw }, ...vals));
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // A code sample inside lesson theory.
  const code = src => `<pre class="theory-code">${esc(src.trimEnd())}</pre>`;
  // "The SQL you know → the Python for it" table.
  const vs = rows => `<table class="dialect-table py-vs"><thead><tr><th>SQL you know</th><th>Python</th></tr></thead><tbody>${
    rows.map(r => `<tr><td><code>${esc(r[0])}</code></td><td><code>${esc(r[1])}</code></td></tr>`).join('')}</tbody></table>`;
  const add = (...days) => {
    for (const d of days) for (const l of d.lessons) {
      l.lang = 'python';
      l.tables = l.tables || [];
      for (const ex of l.exercises || []) ex.lang = 'python';
    }
    curriculum.push(...days);
  };
  return { py, code, vs, add };
})();

(function () {
  const { py, code, vs, add } = PyCourse;

  add(
  // ───────────────────────────────────────────────────────────── Day 40 ──
  {
    day: 40, title: "Python I — Values, Variables & Text", lessons: [
      { id:"40.1", title:"Your First Script", concept:"print & variables",
        theory:`<p>SQL is <em>declarative</em>: you describe the result and the database works out the steps. Python is <em>imperative</em>: you write the steps, and they run top to bottom, one line at a time. That is why pipelines are written in it — "read this file, clean it, load it, then alert someone" is a list of steps.</p><p>A <strong>variable</strong> is a name for a value. <code>=</code> assigns; it does not compare. <code>print()</code> shows values — the script's only visible output.</p>${code(py`
          plant = "Fremont"      # text (a string) goes in quotes
          units = 1250           # a number does not
          print(plant, "built", units, "units")   # commas add the spaces
        `)}<p>Names are case-sensitive, use <code>snake_case</code>, and <code>#</code> starts a comment. Press <strong>Run code</strong> (Ctrl+Enter) — the first run takes a few seconds while Python starts.</p>`,
        chips:[{t:"print()",c:"chip-blue"},{t:"variables",c:"chip-green"},{t:"# comments",c:"chip-cyan"}],
        task:"The starter prints the wrong number. Make <code>units</code> hold 1250 so the script prints exactly: <code>Fremont built 1250 units</code>",
        starter: py`
          # A script runs top to bottom. Fix the value, then Run.
          plant = "Fremont"
          units = 0
          print(plant, "built", units, "units")
        `,
        ref: py`
          plant = "Fremont"
          units = 1250
          print(plant, "built", units, "units")
        `,
        out:true, tests: py`
          var("plant", "Fremont")
          var("units", 1250)
        `,
        hint:"Change the second line to <code>units = 1250</code> — no quotes, it's a number.", xp:15,
        exercises:[
          { id:"40.1.e1", prompt:"Create <code>line</code> holding \"L2\" and <code>shift</code> holding \"night\", then print exactly: <code>L2 / night</code>",
            out:true, tests: py`
              var("line", "L2")
              var("shift", "night")
            `,
            _ref: py`
              line = "L2"
              shift = "night"
              print(line, "/", shift)
            `,
            hint:"Two assignments, then <code>print(line, \"/\", shift)</code> — print puts one space between its arguments.", xp:8 }
        ] },

      { id:"40.2", title:"Numbers & Arithmetic", concept:"int, float, operators",
        theory:`<p>Python has whole numbers (<code>int</code>) and decimals (<code>float</code>). The operators are the ones you know, with two additions that matter for data work:</p>${code(py`
          7 / 2      # 3.5   true division - ALWAYS gives a float
          7 // 2     # 3     floor division - how many whole times
          7 % 2      # 1     modulo - what's left over
          2 ** 10    # 1024  power
          round(94.957, 1)   # 95.0
        `)}<p>This is a trap coming from SQL: in SQLite <code>7 / 2</code> is <code>3</code>, which is why you kept writing <code>* 1.0</code>. In Python <code>/</code> never truncates — you ask for that explicitly with <code>//</code>.</p><p><code>//</code> and <code>%</code> together split a quantity into "full groups and remainder": boxes and loose parts, hours and minutes, pages and offset.</p>`,
        chips:[{t:"/ vs //",c:"chip-amber"},{t:"%",c:"chip-blue"},{t:"round()",c:"chip-green"}],
        task:"A shift made 1250 parts, 1187 good. Compute <code>scrap</code> (parts that weren't good), <code>yield_pct</code> (good ÷ total × 100, rounded to 1 decimal), <code>full_boxes</code> (good parts pack 24 to a box) and <code>leftover</code> (good parts that don't fill a box).",
        starter: py`
          good = 1187
          total = 1250

          scrap = 0
          yield_pct = 0
          full_boxes = 0
          leftover = 0

          print(scrap, yield_pct, full_boxes, leftover)
        `,
        ref: py`
          good = 1187
          total = 1250
          scrap = total - good
          yield_pct = round(good / total * 100, 1)
          full_boxes = good // 24
          leftover = good % 24
          print(scrap, yield_pct, full_boxes, leftover)
        `,
        tests: py`
          var("scrap", 63)
          var("yield_pct", 95.0)
          var("full_boxes", 49)
          var("leftover", 11)
          given({"scrap": 100, "yield_pct": 90.0, "full_boxes": 37, "leftover": 12}, good=900, total=1000)
        `,
        hint:"<code>scrap = total - good</code>, <code>yield_pct = round(good / total * 100, 1)</code>, <code>full_boxes = good // 24</code>, <code>leftover = good % 24</code>. Compute from the variables — the check also tries other numbers.", xp:20,
        exercises:[
          { id:"40.2.e1", prompt:"A machine ran for <code>seconds = 7384</code>. Split that into <code>hours</code>, <code>minutes</code> and <code>secs</code> (whole numbers — 7384 s is 2 h 3 min 4 s).",
            starter: py`
              seconds = 7384
            `,
            tests: py`
              var("hours", 2); var("minutes", 3); var("secs", 4)
              given({"hours": 1, "minutes": 2, "secs": 5}, seconds=3725)
            `,
            _ref: py`
              seconds = 7384
              hours = seconds // 3600
              minutes = seconds % 3600 // 60
              secs = seconds % 60
            `,
            hint:"<code>hours = seconds // 3600</code>. The seconds left after whole hours are <code>seconds % 3600</code> — floor-divide those by 60 for minutes. <code>secs = seconds % 60</code>.", xp:10 }
        ] },

      { id:"40.3", title:"Strings — Cleaning Text", concept:"string methods",
        theory:`<p>Most data-engineering Python is string cleaning: values arrive padded, mixed-case and glued together. Strings come with methods for exactly that — the same jobs as <code>TRIM</code>, <code>LOWER</code>, <code>REPLACE</code> and <code>SUBSTR</code>.</p>${vs([
          ['TRIM(s)', 's.strip()'],
          ['LOWER(s) / UPPER(s)', 's.lower() / s.upper() / s.title()'],
          ["REPLACE(s, '-', '')", 's.replace("-", "")'],
          ['SUBSTR(s, 1, 3)', 's[0:3]      # positions start at 0'],
          ['(no easy equivalent)', 's.split(";")   # → a list of pieces']
        ])}${code(py`
          raw = "  weld-07 ;OK "
          left, right = raw.strip().split(";")   # "weld-07 " and "OK"
          station = left.strip().upper()         # "WELD-07"
          int("07")                              # 7   text -> number
        `)}<p>Strings are <strong>immutable</strong>: a method returns a new string and leaves the original alone, so <code>raw.strip()</code> on its own line does nothing — assign the result.</p>`,
        chips:[{t:".strip()",c:"chip-blue"},{t:".split()",c:"chip-purple"},{t:".lower() / .title()",c:"chip-green"}],
        task:"A scanner sends <code>raw</code> as \"plant-line ;SHIFT\" with stray spaces. Pull out <code>plant</code> (\"Fremont\"), <code>line</code> (\"L2\") and <code>shift</code> (\"night\") — plant capitalised, shift lower-case, no spaces left on any of them.",
        starter: py`
          raw = "  fremont-L2 ;NIGHT "

          # 1. strip the outside spaces, 2. split on ";", 3. split the left part on "-"
          plant = ""
          line = ""
          shift = ""

          print(plant, line, shift)
        `,
        ref: py`
          raw = "  fremont-L2 ;NIGHT "
          left, right = raw.strip().split(";")
          plant = left.split("-")[0].strip().title()
          line = left.split("-")[1].strip()
          shift = right.strip().lower()
          print(plant, line, shift)
        `,
        tests: py`
          var("plant", "Fremont"); var("line", "L2"); var("shift", "night")
          given({"plant": "Austin", "line": "L7", "shift": "day"}, raw=" austin-L7;DAY  ")
        `,
        hint:"<code>left, right = raw.strip().split(\";\")</code> gives the two halves. Then <code>plant = left.split(\"-\")[0].strip().title()</code>, <code>line = left.split(\"-\")[1].strip()</code>, <code>shift = right.strip().lower()</code>.", xp:25,
        exercises:[
          { id:"40.3.e1", prompt:"<code>serial = \"sn-00417-b\"</code>. Make <code>serial_clean</code> the upper-case version (\"SN-00417-B\") and <code>number</code> the middle part as a real number (417, not \"00417\").",
            starter: py`
              serial = "sn-00417-b"
            `,
            tests: py`
              var("serial_clean", "SN-00417-B"); var("number", 417)
              given({"serial_clean": "SN-00090-X", "number": 90}, serial="sn-00090-x")
            `,
            _ref: py`
              serial = "sn-00417-b"
              serial_clean = serial.upper()
              number = int(serial.split("-")[1])
            `,
            hint:"<code>serial.upper()</code> for the first. For the second, <code>serial.split(\"-\")[1]</code> is the text \"00417\" — wrap it in <code>int(...)</code>.", xp:10 }
        ] },

      { id:"40.4", title:"f-strings — Formatting Output", concept:"f-strings",
        theory:`<p>Log lines, alert messages, file names, SQL you generate — all built from values. An <strong>f-string</strong> (note the <code>f</code> before the quote) drops any expression into text inside <code>{ }</code>, and a <em>format spec</em> after a colon controls how a number is shown.</p>${code(py`
          good, total = 1187, 1250
          f"{good} of {total}"            # '1187 of 1250'
          f"{good:,}"                     # '1,187'     thousands separator
          f"{good / total:.2f}"           # '0.95'      2 decimals
          f"{good / total:.1%}"           # '95.0%'     as a percentage
          f"{7:03d}"                      # '007'       zero-padded
          f"run_{'2024-03-01'}.csv"       # 'run_2024-03-01.csv'
        `)}<p>This is what replaces <code>||</code> and <code>printf()</code> from SQL. One rule to carry forward: f-strings are for <em>messages and file names</em>, never for putting values into SQL — Day 46 shows why.</p>`,
        chips:[{t:"f\"...{x}...\"",c:"chip-purple"},{t:":,",c:"chip-blue"},{t:":.2f",c:"chip-green"}],
        task:"Print one summary line built from the variables, exactly: <code>Fremont: 1,187 of 1,250 good (94.96%)</code> — thousands separators on both counts, the percentage to 2 decimals.",
        starter: py`
          plant = "Fremont"
          good = 1187
          total = 1250

          print(plant, good, total)
        `,
        ref: py`
          plant = "Fremont"
          good = 1187
          total = 1250
          print(f"{plant}: {good:,} of {total:,} good ({good / total * 100:.2f}%)")
        `,
        out:true, tests: py`
          r = rerun(plant="Austin", good=20500, total=21000)
          check(r["_out"].strip() == "Austin: 20,500 of 21,000 good (97.62%)",
                "That prints the right line for these numbers, but with plant = \"Austin\", good = 20500, total = 21000 it should print " + "\x60Austin: 20,500 of 21,000 good (97.62%)\x60" + " - build the line from the variables.")
        `,
        hint:"<code>print(f\"{plant}: {good:,} of {total:,} good ({good / total * 100:.2f}%)\")</code> — the <code>%</code> at the end is just a character.", xp:25,
        exercises:[
          { id:"40.4.e1", prompt:"With <code>part = \"bracket\"</code>, <code>cost = 4.5</code>, <code>qty = 12</code>, print exactly: <code>bracket x12 = 54.00</code>",
            starter: py`
              part = "bracket"
              cost = 4.5
              qty = 12
            `,
            out:true, tests: py`
              r = rerun(part="bolt", cost=0.125, qty=1000)
              check(r["_out"].strip() == "bolt x1000 = 125.00", "Build the line from the variables - with part = \"bolt\", cost = 0.125, qty = 1000 it should print " + "\x60bolt x1000 = 125.00\x60" + ".")
            `,
            _ref: py`
              part = "bracket"
              cost = 4.5
              qty = 12
              print(f"{part} x{qty} = {cost * qty:.2f}")
            `,
            hint:"<code>print(f\"{part} x{qty} = {cost * qty:.2f}\")</code>", xp:10 }
        ] }
    ]
  },

  // ───────────────────────────────────────────────────────────── Day 41 ──
  {
    day: 41, title: "Python II — Decisions & Loops", lessons: [
      { id:"41.1", title:"if / elif / else", concept:"conditionals",
        theory:`<p><code>if</code> is Python's <code>CASE WHEN</code> — except it chooses which <em>lines run</em>, not just which value comes back.</p>${vs([
          ["CASE WHEN x >= 98 THEN 'green'", 'if x >= 98:\n    status = "green"'],
          ["     WHEN x >= 95 THEN 'amber'", 'elif x >= 95:\n    status = "amber"'],
          ["     ELSE 'red' END", 'else:\n    status = "red"']
        ])}<p>Two things are different from SQL and both are syntax errors if you miss them: each branch line ends with a <strong>colon</strong>, and the lines inside it are <strong>indented</strong> (4 spaces). Indentation isn't style in Python — it <em>is</em> the block.</p><p>Comparison is <code>==</code> (a single <code>=</code> assigns), not-equal is <code>!=</code>, and conditions combine with the words <code>and</code>, <code>or</code>, <code>not</code>. As with <code>CASE</code>, the first true branch wins, so order the tests from most to least specific.</p>`,
        chips:[{t:"if / elif / else",c:"chip-blue"},{t:"==  !=",c:"chip-amber"},{t:"and / or / not",c:"chip-green"}],
        task:"Set <code>status</code> from <code>yield_pct</code>: <code>\"green\"</code> at 98 or above, <code>\"amber\"</code> from 95 up to 98, otherwise <code>\"red\"</code>.",
        starter: py`
          yield_pct = 93.4

          status = "green"

          print(yield_pct, status)
        `,
        ref: py`
          yield_pct = 93.4
          if yield_pct >= 98:
              status = "green"
          elif yield_pct >= 95:
              status = "amber"
          else:
              status = "red"
          print(yield_pct, status)
        `,
        tests: py`
          var("status", "red")
          given({"status": "green"}, yield_pct=99.2)
          given({"status": "green"}, yield_pct=98)
          given({"status": "amber"}, yield_pct=95)
          given({"status": "amber"}, yield_pct=97.9)
          given({"status": "red"}, yield_pct=94.9)
        `,
        hint:"<code>if yield_pct >= 98:</code> … <code>elif yield_pct >= 95:</code> … <code>else:</code> — each followed by an indented <code>status = \"…\"</code> line. Use <code>>=</code> so exactly 98 and exactly 95 land in the higher band.", xp:25,
        exercises:[
          { id:"41.1.e1", prompt:"Set <code>alarm</code> to <code>True</code> when <code>temp_c</code> is above 85 or below 5, otherwise <code>False</code>.",
            starter: py`
              temp_c = 71
            `,
            tests: py`
              var("alarm", False)
              given({"alarm": True}, temp_c=90)
              given({"alarm": True}, temp_c=0)
              given({"alarm": False}, temp_c=85)
              given({"alarm": False}, temp_c=5)
            `,
            _ref: py`
              temp_c = 71
              alarm = temp_c > 85 or temp_c < 5
            `,
            hint:"A comparison already <em>is</em> True or False, so no if is needed: <code>alarm = temp_c > 85 or temp_c < 5</code>.", xp:10 }
        ] },

      { id:"41.2", title:"for Loops", concept:"for, range, accumulating",
        theory:`<p>SQL processes a whole set at once. Python visits items <strong>one at a time</strong> with <code>for</code> — the loop variable takes each value in turn and the indented body runs once per item.</p>${code(py`
          counts = [212, 198, 240]
          total = 0                 # start an accumulator...
          for c in counts:
              total = total + c     # ...and update it each time round
          print(total)              # 650 - this line is outside the loop
        `)}<p>That "start at zero, update in the loop" shape is what <code>SUM</code>, <code>COUNT</code>, <code>MAX</code> do inside the database. Add an <code>if</code> in the body and you have <code>SUM(CASE WHEN …)</code>.</p><p><code>range(n)</code> produces 0, 1, …, n-1 when you need to repeat something or count: <code>for i in range(3):</code> runs with <code>i</code> = 0, 1, 2. <code>range(1, 4)</code> gives 1, 2, 3 — the end is never included.</p>`,
        chips:[{t:"for x in list",c:"chip-blue"},{t:"accumulator",c:"chip-green"},{t:"range()",c:"chip-purple"}],
        task:"<code>counts</code> holds units built per hour. Loop over it to compute <code>total</code> (all units) and <code>over_200</code> (how many hours built more than 200).",
        starter: py`
          counts = [212, 198, 240, 205, 187]

          total = 0
          over_200 = 0
          # for each count: add it to total, and bump over_200 if it is above 200

          print(total, over_200)
        `,
        ref: py`
          counts = [212, 198, 240, 205, 187]
          total = 0
          over_200 = 0
          for c in counts:
              total += c
              if c > 200:
                  over_200 += 1
          print(total, over_200)
        `,
        tests: py`
          var("total", 1042); var("over_200", 3)
          given({"total": 510, "over_200": 1}, counts=[10, 300, 200])
          given({"total": 0, "over_200": 0}, counts=[])
        `,
        hint:"<code>for c in counts:</code> then, indented, <code>total += c</code> and <code>if c > 200:</code> with <code>over_200 += 1</code> indented once more. <code>x += 1</code> is short for <code>x = x + 1</code>.", xp:25,
        exercises:[
          { id:"41.2.e1", prompt:"Build <code>squares</code>: a list of the squares of 1 up to and including <code>n</code>. For n = 5 that is [1, 4, 9, 16, 25].",
            starter: py`
              n = 5
              squares = []
            `,
            tests: py`
              var("squares", [1, 4, 9, 16, 25])
              given({"squares": [1, 4, 9]}, n=3)
              given({"squares": []}, n=0)
            `,
            _ref: py`
              n = 5
              squares = []
              for i in range(1, n + 1):
                  squares.append(i * i)
            `,
            hint:"<code>for i in range(1, n + 1):</code> — the end of a range is not included, hence the + 1 — then <code>squares.append(i * i)</code>.", xp:10 }
        ] },

      { id:"41.3", title:"while Loops — and Stopping Them", concept:"while, break",
        theory:`<p>Use <code>for</code> when you know what you are looping over. Use <code>while</code> when you only know <em>when to stop</em>: retry until it works, read until the file ends, page through an API until there are no more pages.</p>${code(py`
          attempts = 0
          while attempts < 3:        # checked before every pass
              attempts += 1          # something in the body MUST change the condition
          print(attempts)            # 3
        `)}<p>If nothing in the body moves the condition toward <code>False</code>, the loop never ends — the classic way a pipeline hangs at 3 a.m. Here a runaway loop is stopped for you after a couple of seconds; in production nothing does that.</p><p><code>break</code> leaves a loop immediately (either kind), and <code>continue</code> skips to the next pass:</p>${code(py`
          for r in readings:
              if r > 3.0:
                  break              # found one - stop looking
        `)}`,
        chips:[{t:"while",c:"chip-blue"},{t:"break",c:"chip-amber"},{t:"infinite loops",c:"chip-red"}],
        task:"A line uses <code>per_hour</code> parts each hour from <code>stock</code>. Count the full <code>hours</code> it can run, leaving what remains in <code>stock</code>. Run the starter first: it has the classic bug.",
        starter: py`
          stock = 500
          per_hour = 64
          hours = 0

          while stock >= per_hour:
              hours += 1

          print(hours, "hours,", stock, "parts left")
        `,
        ref: py`
          stock = 500
          per_hour = 64
          hours = 0
          while stock >= per_hour:
              stock -= per_hour
              hours += 1
          print(hours, "hours,", stock, "parts left")
        `,
        tests: py`
          uses(r"\bwhile\b", "Use a while loop for this one - it's the tool this lesson is about.")
          var("hours", 7); var("stock", 52)
          given({"hours": 2, "stock": 0}, stock=128, per_hour=64)
          given({"hours": 0, "stock": 10}, stock=10, per_hour=64)
        `,
        hint:"The loop never changes <code>stock</code>, so <code>stock >= per_hour</code> stays true forever. Add <code>stock -= per_hour</code> inside the loop.", xp:25,
        exercises:[
          { id:"41.3.e1", prompt:"Find <code>first_bad</code>: the position (index) of the first reading above 3.0, or -1 if there isn't one. Stop looking once you've found it.",
            starter: py`
              readings = [0.8, 1.1, 0.9, 3.7, 1.0]
              first_bad = -1
            `,
            tests: py`
              var("first_bad", 3)
              given({"first_bad": -1}, readings=[1.0, 2.0])
              given({"first_bad": 0}, readings=[5.0, 9.9])
              given({"first_bad": -1}, readings=[])
            `,
            _ref: py`
              readings = [0.8, 1.1, 0.9, 3.7, 1.0]
              first_bad = -1
              for i in range(len(readings)):
                  if readings[i] > 3.0:
                      first_bad = i
                      break
            `,
            hint:"<code>for i in range(len(readings)):</code>, and inside: <code>if readings[i] > 3.0:</code> set <code>first_bad = i</code> then <code>break</code>. Without the break you'd end up with the <em>last</em> bad one.", xp:12 }
        ] },

      { id:"41.4", title:"None — Python's NULL", concept:"None & truthiness",
        theory:`<p><code>None</code> is Python's "no value". It plays the role of <code>NULL</code> but behaves differently, and the difference causes real bugs:</p>${vs([
          ['x IS NULL', 'x is None'],
          ['x IS NOT NULL', 'x is not None'],
          ['COALESCE(x, 0)', 'x if x is not None else 0'],
          ['NULL + 1  →  NULL (quietly)', 'None + 1  →  TypeError (loudly)']
        ])}<p>SQL lets <code>NULL</code> flow through a calculation; Python stops with an error. So you decide what a missing value means <em>before</em> you compute with it.</p><p>Also new: every value is "truthy" or "falsy" in an <code>if</code>. The falsy ones are <code>None</code>, <code>0</code>, <code>0.0</code>, <code>""</code> and empty collections. That makes <code>x or default</code> a tempting <code>COALESCE</code> — and a wrong one, because it also replaces a perfectly real <code>0</code>:</p>${code(py`
          reading = 0
          reading or -1                              # -1   wrong: 0 was a real reading
          reading if reading is not None else -1     # 0    right
        `)}`,
        chips:[{t:"None",c:"chip-purple"},{t:"is None",c:"chip-blue"},{t:"truthy / falsy",c:"chip-amber"}],
        task:"Set <code>value</code> to <code>reading</code>, unless the reading is missing (<code>None</code>) — then use <code>default</code>. A reading of 0 is a real reading and must be kept.",
        starter: py`
          reading = None
          default = -1.0

          value = reading

          print(value)
        `,
        ref: py`
          reading = None
          default = -1.0
          value = reading if reading is not None else default
          print(value)
        `,
        tests: py`
          var("value", -1.0)
          given({"value": 2.5}, reading=2.5)
          given({"value": 0}, reading=0)
        `,
        _wrong:[ py`
          reading = None
          default = -1.0
          value = reading or default
        ` ],
        hint:"<code>value = reading if reading is not None else default</code>. Don't use <code>reading or default</code> — it throws away a reading of 0.", xp:25,
        exercises:[
          { id:"41.4.e1", prompt:"Set <code>label</code> to <code>name</code> with the outside spaces removed — or to <code>\"unknown\"</code> if nothing is left.",
            starter: py`
              name = "   "
            `,
            tests: py`
              var("label", "unknown")
              given({"label": "L2"}, name=" L2 ")
              given({"label": "unknown"}, name="")
            `,
            _ref: py`
              name = "   "
              label = name.strip() or "unknown"
            `,
            hint:"Here falsiness helps: an empty string is falsy, so <code>label = name.strip() or \"unknown\"</code> works.", xp:10 }
        ] }
    ]
  },

  // ───────────────────────────────────────────────────────────── Day 42 ──
  {
    day: 42, title: "Python III — Lists, Dicts & Sets", lessons: [
      { id:"42.1", title:"Lists", concept:"lists, indexing, slicing",
        theory:`<p>A <strong>list</strong> is an ordered, changeable sequence — a column of values, or the rows of a result. Unlike a SQL table it <em>has</em> an order and you address items by position, starting at <strong>0</strong>.</p>${code(py`
          t = [41.2, 39.8, 44.1]
          t[0]          # 41.2   first
          t[-1]         # 44.1   last  (negative counts from the end)
          t[0:2]        # [41.2, 39.8]   a slice: start included, end not
          len(t)        # 3      COUNT(*)
          t.append(40.5)        # add to the end - changes t itself
          sorted(t)             # a NEW sorted list; t keeps its order
          sorted(t, reverse=True)[:3]    # top 3  (ORDER BY ... DESC LIMIT 3)
          sum(t), min(t), max(t)
        `)}<p>Watch the difference between <code>sorted(t)</code>, which returns a new list, and <code>t.sort()</code>, which reorders <code>t</code> in place and returns <code>None</code>. Writing <code>t = t.sort()</code> is a classic way to lose your data.</p>`,
        chips:[{t:"[0] and [-1]",c:"chip-blue"},{t:"slices",c:"chip-purple"},{t:"sorted()",c:"chip-green"}],
        task:"A new torque reading of 42.0 arrives: append it to <code>torques</code>. Then set <code>first</code> and <code>last</code> to the first and last readings, and <code>top3</code> to the three highest, largest first. Leave <code>torques</code> in arrival order.",
        starter: py`
          torques = [41.2, 39.8, 44.1, 40.5, 38.9]

          first = None
          last = None
          top3 = []

          print(first, last, top3)
        `,
        ref: py`
          torques = [41.2, 39.8, 44.1, 40.5, 38.9]
          torques.append(42.0)
          first = torques[0]
          last = torques[-1]
          top3 = sorted(torques, reverse=True)[:3]
          print(first, last, top3)
        `,
        tests: py`
          var("torques", [41.2, 39.8, 44.1, 40.5, 38.9, 42.0])
          var("first", 41.2); var("last", 42.0); var("top3", [44.1, 42.0, 41.2])
          given({"first": 1.0, "last": 42.0, "top3": [42.0, 5.0, 1.0], "torques": [1.0, 5.0, 42.0]}, torques=[1.0, 5.0])
        `,
        hint:"<code>torques.append(42.0)</code>, <code>first = torques[0]</code>, <code>last = torques[-1]</code>, <code>top3 = sorted(torques, reverse=True)[:3]</code>. Use <code>sorted()</code>, not <code>.sort()</code>, so the original order survives.", xp:25,
        exercises:[
          { id:"42.1.e1", prompt:"From <code>stations</code>, set <code>middle</code> to the 2nd and 3rd stations (a slice) and <code>reversed_stations</code> to all of them in reverse order.",
            starter: py`
              stations = ["weld", "paint", "trim", "final"]
            `,
            tests: py`
              var("middle", ["paint", "trim"]); var("reversed_stations", ["final", "trim", "paint", "weld"])
              given({"middle": ["b", "c"], "reversed_stations": ["e", "d", "c", "b", "a"]}, stations=["a", "b", "c", "d", "e"])
            `,
            _ref: py`
              stations = ["weld", "paint", "trim", "final"]
              middle = stations[1:3]
              reversed_stations = stations[::-1]
            `,
            hint:"<code>stations[1:3]</code> is positions 1 and 2. A slice with a step of -1 walks backwards: <code>stations[::-1]</code>.", xp:10 }
        ] },

      { id:"42.2", title:"Dictionaries", concept:"dict: key → value",
        theory:`<p>A <strong>dict</strong> maps keys to values. You will use it for two things constantly: as <em>one row</em> (column name → value) and as a <em>lookup table</em> (id → thing) — the job a <code>JOIN</code> does in SQL.</p>${code(py`
          part = {"sku": "BRK-204", "cost": 4.5}
          part["cost"]                 # 4.5       read
          part["stock"] = 120          # add or overwrite
          part["bin"]                  # KeyError - no such key
          part.get("bin")              # None      safe read
          part.get("bin", "n/a")       # 'n/a'     safe read with a default
          "bin" in part                # False     does the key exist?
          for key, value in part.items():
              print(key, value)
        `)}<p>Reading a missing key with <code>[ ]</code> raises <code>KeyError</code>; <code>.get()</code> returns a default instead. Choose deliberately: <code>[ ]</code> when a missing key is a bug you want to hear about, <code>.get()</code> when the field is genuinely optional — real JSON payloads are full of those.</p>`,
        chips:[{t:"d[key]",c:"chip-blue"},{t:".get(key, default)",c:"chip-green"},{t:".items()",c:"chip-purple"}],
        task:"Update the <code>part</code> row: set its stock to 95 and add a <code>\"supplier\"</code> of \"Acme\". Then compute <code>value</code> (cost × stock) and read its <code>bin</code> — which may not be there, in which case use <code>\"unassigned\"</code>.",
        starter: py`
          part = {"sku": "BRK-204", "cost": 4.5, "stock": 120}

          value = 0
          bin = ""

          print(part, value, bin)
        `,
        ref: py`
          part = {"sku": "BRK-204", "cost": 4.5, "stock": 120}
          part["stock"] = 95
          part["supplier"] = "Acme"
          value = part["cost"] * part["stock"]
          bin = part.get("bin", "unassigned")
          print(part, value, bin)
        `,
        tests: py`
          var("part", {"sku": "BRK-204", "cost": 4.5, "stock": 95, "supplier": "Acme"})
          var("value", 427.5); var("bin", "unassigned")
          given({"value": 190.0, "bin": "A7"}, part={"sku": "X", "cost": 2.0, "stock": 1, "bin": "A7"})
        `,
        hint:"<code>part[\"stock\"] = 95</code>, <code>part[\"supplier\"] = \"Acme\"</code>, <code>value = part[\"cost\"] * part[\"stock\"]</code>, <code>bin = part.get(\"bin\", \"unassigned\")</code>.", xp:25,
        exercises:[
          { id:"42.2.e1", prompt:"<code>prices</code> maps part name → unit price. Set <code>cheapest</code> to the <em>name</em> of the lowest-priced part.",
            starter: py`
              prices = {"bolt": 0.12, "nut": 0.05, "washer": 0.03}
            `,
            tests: py`
              var("cheapest", "washer")
              given({"cheapest": "b"}, prices={"a": 3, "b": 1, "c": 2})
            `,
            _ref: py`
              prices = {"bolt": 0.12, "nut": 0.05, "washer": 0.03}
              cheapest = None
              for name, price in prices.items():
                  if cheapest is None or price < prices[cheapest]:
                      cheapest = name
            `,
            hint:"Loop with <code>for name, price in prices.items():</code> and remember the name with the lowest price so far. (Shortcut you'll meet on Day 43: <code>min(prices, key=prices.get)</code>.)", xp:12 }
        ] },

      { id:"42.3", title:"Sets & Tuples", concept:"set operations, unpacking",
        theory:`<p>A <strong>set</strong> is an unordered collection with no duplicates — <code>SELECT DISTINCT</code> as a data type. Its operators are the set operations you already know:</p>${vs([
          ['SELECT DISTINCT x', 'set(items)'],
          ['a UNION b', 'a | b'],
          ['a INTERSECT b', 'a & b'],
          ['a EXCEPT b', 'a - b'],
          ['x IN (subquery)', 'x in s      # instant, however big s is']
        ])}<p>"Which expected ids never arrived?" is <code>expected - received</code>. That one line is most of a reconciliation check, and membership tests against a set stay fast at millions of items where a list would crawl.</p><p>A <strong>tuple</strong> is a fixed-size, unchangeable group — <code>(station, torque)</code>. It's what a database driver hands you for each row, and you <em>unpack</em> it into names:</p>${code(py`
          row = ("L2", "2024-03-01", 41.7)
          line, day, torque = row         # three names, one assignment
        `)}`,
        chips:[{t:"set()",c:"chip-blue"},{t:"|  &  -",c:"chip-purple"},{t:"tuple unpacking",c:"chip-green"}],
        task:"<code>scanned</code> lists pallet ids as they were scanned (with repeats); <code>expected</code> is what should have arrived. Compute <code>unique</code> (the set of ids scanned), <code>missing</code> (expected but never scanned) and <code>n_dupes</code> (how many scans were repeats).",
        starter: py`
          scanned = ["A1", "B4", "A1", "C2", "B4", "A1"]
          expected = {"A1", "B4", "C2", "D9"}

          unique = set()
          missing = set()
          n_dupes = 0

          print(unique, missing, n_dupes)
        `,
        ref: py`
          scanned = ["A1", "B4", "A1", "C2", "B4", "A1"]
          expected = {"A1", "B4", "C2", "D9"}
          unique = set(scanned)
          missing = expected - unique
          n_dupes = len(scanned) - len(unique)
          print(unique, missing, n_dupes)
        `,
        tests: py`
          var("unique", {"A1", "B4", "C2"}); var("missing", {"D9"}); var("n_dupes", 3)
          given({"unique": {"D9"}, "missing": {"A1"}, "n_dupes": 1}, scanned=["D9", "D9"], expected={"A1", "D9"})
        `,
        hint:"<code>unique = set(scanned)</code>, <code>missing = expected - unique</code>, <code>n_dupes = len(scanned) - len(unique)</code>.", xp:25,
        exercises:[
          { id:"42.3.e1", prompt:"Unpack the <code>reading</code> tuple into <code>line</code>, <code>day</code> and <code>torque</code>, then build <code>pair</code>: a tuple of just the line and the torque.",
            starter: py`
              reading = ("L2", "2024-03-01", 41.7)
            `,
            tests: py`
              var("line", "L2"); var("day", "2024-03-01"); var("torque", 41.7); var("pair", ("L2", 41.7))
              given({"pair": ("L9", 1.5), "day": "2024-01-01"}, reading=("L9", "2024-01-01", 1.5))
            `,
            _ref: py`
              reading = ("L2", "2024-03-01", 41.7)
              line, day, torque = reading
              pair = (line, torque)
            `,
            hint:"<code>line, day, torque = reading</code> does all three at once. Then <code>pair = (line, torque)</code>.", xp:10 }
        ] },

      { id:"42.4", title:"Rows as a List of Dicts", concept:"list of dicts = a table",
        theory:`<p>Put the last three lessons together and you get the shape nearly all data takes in Python before it reaches a database: a <strong>list of dicts</strong>. Each dict is a row, each key a column. A CSV reader gives you this; so does a JSON API; so does a query result.</p>${code(py`
          orders = [
              {"id": 101, "total": 398.0, "status": "completed"},
              {"id": 102, "total": 89.0,  "status": "refunded"},
          ]
          orders[0]["total"]        # 398.0 - row 0, column "total"
        `)}<p>And a loop with an <code>if</code> over it is a query you write by hand:</p>${vs([
          ["SELECT SUM(total) FROM orders\nWHERE status = 'completed'", 'total = 0\nfor o in orders:\n    if o["status"] == "completed":\n        total += o["total"]'],
          ['SELECT id FROM orders\nWHERE total > 300', 'ids = []\nfor o in orders:\n    if o["total"] > 300:\n        ids.append(o["id"])']
        ])}<p>When the data is already in a database, let SQL do this. You reach for Python when it isn't yet — files, APIs, messages on a queue — which is exactly where pipelines start.</p>`,
        chips:[{t:"list of dicts",c:"chip-purple"},{t:"row[\"col\"]",c:"chip-blue"},{t:"filter + aggregate",c:"chip-green"}],
        task:"From the <code>orders</code> rows compute <code>completed_total</code> — the sum of <code>total</code> for orders whose status is \"completed\" — and <code>big</code>: the list of ids of orders over 300, in the order they appear (any status).",
        starter: py`
          orders = [
              {"id": 101, "customer": "Alice", "total": 398.0, "status": "completed"},
              {"id": 102, "customer": "Bob",   "total": 89.0,  "status": "completed"},
              {"id": 103, "customer": "Chen",  "total": 620.5, "status": "refunded"},
              {"id": 104, "customer": "Dee",   "total": 310.0, "status": "completed"},
              {"id": 105, "customer": "Eli",   "total": 45.0,  "status": "pending"},
          ]

          completed_total = 0
          big = []

          print(completed_total, big)
        `,
        ref: py`
          orders = [
              {"id": 101, "customer": "Alice", "total": 398.0, "status": "completed"},
              {"id": 102, "customer": "Bob",   "total": 89.0,  "status": "completed"},
              {"id": 103, "customer": "Chen",  "total": 620.5, "status": "refunded"},
              {"id": 104, "customer": "Dee",   "total": 310.0, "status": "completed"},
              {"id": 105, "customer": "Eli",   "total": 45.0,  "status": "pending"},
          ]
          completed_total = 0
          big = []
          for o in orders:
              if o["status"] == "completed":
                  completed_total += o["total"]
              if o["total"] > 300:
                  big.append(o["id"])
          print(completed_total, big)
        `,
        tests: py`
          var("completed_total", 797.0); var("big", [101, 103, 104])
          given({"completed_total": 0.0, "big": [1]}, orders=[{"id": 1, "customer": "Z", "total": 1000.0, "status": "pending"}])
          given({"completed_total": 300.0, "big": []}, orders=[{"id": 7, "customer": "Y", "total": 300.0, "status": "completed"}])
        `,
        hint:"One loop, two independent ifs: <code>if o[\"status\"] == \"completed\": completed_total += o[\"total\"]</code> and <code>if o[\"total\"] > 300: big.append(o[\"id\"])</code>.", xp:30,
        exercises:[
          { id:"42.4.e1", prompt:"GROUP BY by hand: build <code>by_status</code>, a dict mapping each status to how many orders have it — <code>{\"completed\": 3, \"refunded\": 1, \"pending\": 1}</code> for these rows.",
            starter: py`
              orders = [
                  {"id": 101, "total": 398.0, "status": "completed"},
                  {"id": 102, "total": 89.0,  "status": "completed"},
                  {"id": 103, "total": 620.5, "status": "refunded"},
                  {"id": 104, "total": 310.0, "status": "completed"},
                  {"id": 105, "total": 45.0,  "status": "pending"},
              ]
              by_status = {}
            `,
            tests: py`
              var("by_status", {"completed": 3, "refunded": 1, "pending": 1})
              given({"by_status": {}}, orders=[])
              given({"by_status": {"x": 2}}, orders=[{"id": 1, "total": 1.0, "status": "x"}, {"id": 2, "total": 1.0, "status": "x"}])
            `,
            _ref: py`
              orders = [
                  {"id": 101, "total": 398.0, "status": "completed"},
                  {"id": 102, "total": 89.0,  "status": "completed"},
                  {"id": 103, "total": 620.5, "status": "refunded"},
                  {"id": 104, "total": 310.0, "status": "completed"},
                  {"id": 105, "total": 45.0,  "status": "pending"},
              ]
              by_status = {}
              for o in orders:
                  by_status[o["status"]] = by_status.get(o["status"], 0) + 1
            `,
            hint:"For each order: <code>by_status[o[\"status\"]] = by_status.get(o[\"status\"], 0) + 1</code> — <code>.get(…, 0)</code> supplies the 0 the first time a status is seen.", xp:15 }
        ] }
    ]
  });
})();
