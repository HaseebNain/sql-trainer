// SQL Quest — Python track, part 2 (Days 43–45): functions, failure, files.
// Lesson format: see the header of course-python-basics.js.

(function () {
  const { py, code, vs, add } = PyCourse;

  add(
  // ───────────────────────────────────────────────────────────── Day 43 ──
  {
    day: 43, title: "Python IV — Functions & Comprehensions", lessons: [
      { id:"43.1", title:"def & return", concept:"functions",
        theory:`<p>So far every script did one job on one set of values. A <strong>function</strong> names a piece of logic so you can run it on any input — the Python version of a view or a dbt macro, and the unit a pipeline is assembled from.</p>${code(py`
          def scrap_rate(scrapped, total):      # parameters
              rate = scrapped / total * 100
              return round(rate, 1)             # hand a value back to the caller

          scrap_rate(63, 1250)                  # 5.0
          worst = max(scrap_rate(63, 1250), scrap_rate(12, 900))
        `)}<p><strong><code>return</code> is not <code>print</code>.</strong> <code>print</code> shows text to a human and gives the program nothing; <code>return</code> gives the value back so other code can use it. A function without a <code>return</code> hands back <code>None</code> — the most common beginner bug, and the reason "None" keeps turning up where a number was expected.</p><p>From here on the checks <em>call your function</em> with several inputs, including awkward ones. Write for the general case, not the example.</p>`,
        chips:[{t:"def",c:"chip-blue"},{t:"return",c:"chip-green"},{t:"return ≠ print",c:"chip-amber"}],
        task:"Fix <code>yield_pct(good, total)</code> so it <em>returns</em> the yield as a percentage rounded to 1 decimal — and returns <code>0.0</code> instead of crashing when <code>total</code> is 0.",
        starter: py`
          def yield_pct(good, total):
              print(good / total * 100)


          # try it - this part is yours to play with
          print(yield_pct(1187, 1250))
        `,
        ref: py`
          def yield_pct(good, total):
              if total == 0:
                  return 0.0
              return round(good / total * 100, 1)

          print(yield_pct(1187, 1250))
        `,
        tests: py`
          fn("yield_pct")
          eq(yield_pct(1187, 1250), 95.0, "yield_pct(1187, 1250)")
          eq(yield_pct(50, 200), 25.0, "yield_pct(50, 200)")
          eq(yield_pct(1, 3), 33.3, "yield_pct(1, 3)")
          eq(yield_pct(0, 0), 0.0, "yield_pct(0, 0)")
        `,
        hint:"Start the body with <code>if total == 0: return 0.0</code>, then <code>return round(good / total * 100, 1)</code>. It has to <code>return</code> — printing isn't enough.", xp:30,
        exercises:[
          { id:"43.1.e1", prompt:"Write <code>c_to_f(c)</code> that returns a Celsius temperature in Fahrenheit (× 9 / 5, + 32).",
            tests: py`
              fn("c_to_f")
              eq(c_to_f(100), 212.0, "c_to_f(100)"); eq(c_to_f(0), 32.0, "c_to_f(0)"); eq(c_to_f(-40), -40.0, "c_to_f(-40)")
            `,
            _ref: py`
              def c_to_f(c):
                  return c * 9 / 5 + 32
            `,
            hint:"<code>def c_to_f(c):</code> then <code>return c * 9 / 5 + 32</code>.", xp:10 }
        ] },

      { id:"43.2", title:"Default & Keyword Arguments", concept:"parameters with defaults",
        theory:`<p>A parameter can have a <strong>default</strong>, which makes it optional. That is how one function serves both the common case and the special one without growing a second copy.</p>${code(py`
          def in_spec(torque, low=38.0, high=44.0):
              return low <= torque <= high          # chained comparison, like BETWEEN

          in_spec(41.0)                  # True   uses both defaults
          in_spec(41.0, 42.0)            # False  positional: low=42.0
          in_spec(45.0, high=46.0)       # True   keyword: skip low, set high
        `)}<p>Call with <strong>keyword arguments</strong> whenever the meaning isn't obvious from the value: <code>load(rows, batch_size=500, dry_run=True)</code> reads like a sentence, <code>load(rows, 500, True)</code> is a puzzle for the next reader — who is usually you.</p><p>Every serious library works this way: <code>pd.read_csv(path, sep=";", dtype=str)</code>, <code>sorted(xs, key=…, reverse=True)</code>. Parameters with defaults must come after those without.</p>`,
        chips:[{t:"defaults",c:"chip-blue"},{t:"keyword args",c:"chip-purple"},{t:"a <= x <= b",c:"chip-green"}],
        task:"Write <code>flag(value, low=0.0, high=100.0)</code>: return <code>\"low\"</code> when value is below <code>low</code>, <code>\"high\"</code> when above <code>high</code>, otherwise <code>\"ok\"</code>. The limits themselves count as ok.",
        starter: py`
          def flag(value, low, high):
              return "ok"


          print(flag(41.0, low=38.0, high=44.0))
        `,
        ref: py`
          def flag(value, low=0.0, high=100.0):
              if value < low:
                  return "low"
              if value > high:
                  return "high"
              return "ok"

          print(flag(41.0, low=38.0, high=44.0))
        `,
        tests: py`
          fn("flag")
          eq(flag(50), "ok", "flag(50)")
          eq(flag(-1), "low", "flag(-1)")
          eq(flag(101), "high", "flag(101)")
          eq(flag(100), "ok", "flag(100)")
          eq(flag(41.0, low=38.0, high=44.0), "ok", "flag(41.0, low=38.0, high=44.0)")
          eq(flag(45, high=44.0), "high", "flag(45, high=44.0)")
          eq(flag(37, 38.0, 44.0), "low", "flag(37, 38.0, 44.0)")
        `,
        hint:"Put the defaults in the def line: <code>def flag(value, low=0.0, high=100.0):</code>. Then <code>if value < low: return \"low\"</code>, <code>if value > high: return \"high\"</code>, and <code>return \"ok\"</code> last.", xp:30,
        exercises:[
          { id:"43.2.e1", prompt:"Write <code>make_key(plant, line, sep=\"-\")</code> that returns both parts stripped and upper-cased, joined by <code>sep</code>: <code>make_key(\" fremont \", \"l2\")</code> → <code>\"FREMONT-L2\"</code>.",
            tests: py`
              fn("make_key")
              eq(make_key(" fremont ", "l2"), "FREMONT-L2", 'make_key(" fremont ", "l2")')
              eq(make_key("austin", "l7", sep="/"), "AUSTIN/L7", 'make_key("austin", "l7", sep="/")')
            `,
            _ref: py`
              def make_key(plant, line, sep="-"):
                  return plant.strip().upper() + sep + line.strip().upper()
            `,
            hint:"<code>def make_key(plant, line, sep=\"-\"):</code> and return <code>f\"{plant.strip().upper()}{sep}{line.strip().upper()}\"</code>.", xp:10 }
        ] },

      { id:"43.3", title:"Comprehensions — SELECT in One Line", concept:"list & dict comprehensions",
        theory:`<p>The loop-and-append pattern from Day 42 is so common that Python has a one-line form for it. Read it as a query written inside brackets — it has the same three parts:</p>${vs([
          ['SELECT sku FROM parts WHERE stock < 10', '[p["sku"] for p in parts if p["stock"] < 10]'],
          ['SELECT UPPER(name) FROM t', '[n.upper() for n in names]'],
          ['SELECT sku, cost * stock FROM parts', '{p["sku"]: p["cost"] * p["stock"] for p in parts}']
        ])}<p>Order of the parts: <em>what to produce</em>, <code>for</code> <em>each item</em>, <code>if</code> <em>it qualifies</em>. Square brackets build a list; braces with <code>key: value</code> build a dict — the one-line way to make a lookup table.</p><p>This is the style you'll read in every Python data codebase. Use it for a simple transform or filter; go back to a full <code>for</code> loop when the body needs several steps, because a comprehension you can't read at a glance is worse than four plain lines.</p>`,
        chips:[{t:"[x for x in xs if …]",c:"chip-purple"},{t:"{k: v for …}",c:"chip-blue"},{t:"SELECT / WHERE",c:"chip-green"}],
        task:"Using comprehensions (no <code>for</code> statements), build <code>low_stock</code> — the skus of parts with stock under 10 — and <code>value_by_sku</code>: a dict of sku → cost × stock, rounded to 2 decimals.",
        starter: py`
          parts = [
              {"sku": "BRK-204", "cost": 4.5,  "stock": 120},
              {"sku": "NUT-010", "cost": 0.05, "stock": 4},
              {"sku": "HSG-771", "cost": 38.0, "stock": 9},
              {"sku": "BLT-033", "cost": 0.12, "stock": 2500},
          ]

          low_stock = []
          value_by_sku = {}

          print(low_stock)
          print(value_by_sku)
        `,
        ref: py`
          parts = [
              {"sku": "BRK-204", "cost": 4.5,  "stock": 120},
              {"sku": "NUT-010", "cost": 0.05, "stock": 4},
              {"sku": "HSG-771", "cost": 38.0, "stock": 9},
              {"sku": "BLT-033", "cost": 0.12, "stock": 2500},
          ]
          low_stock = [p["sku"] for p in parts if p["stock"] < 10]
          value_by_sku = {p["sku"]: round(p["cost"] * p["stock"], 2) for p in parts}
          print(low_stock)
          print(value_by_sku)
        `,
        tests: py`
          avoids(r"(?m)^\s*for\b", "Write these as comprehensions - the for goes inside the brackets, not on its own line.")
          var("low_stock", ["NUT-010", "HSG-771"])
          var("value_by_sku", {"BRK-204": 540.0, "NUT-010": 0.2, "HSG-771": 342.0, "BLT-033": 300.0})
          given({"low_stock": [], "value_by_sku": {"A": 20.0}}, parts=[{"sku": "A", "cost": 2.0, "stock": 10}])
        `,
        hint:"<code>low_stock = [p[\"sku\"] for p in parts if p[\"stock\"] < 10]</code> and <code>value_by_sku = {p[\"sku\"]: round(p[\"cost\"] * p[\"stock\"], 2) for p in parts}</code>.", xp:35,
        exercises:[
          { id:"43.3.e1", prompt:"With one comprehension, build <code>clean</code> from <code>raw</code>: each name stripped and lower-cased, leaving out the ones that are empty once stripped.",
            starter: py`
              raw = [" Weld ", "", "PAINT", "   ", "trim"]
            `,
            tests: py`
              avoids(r"(?m)^\s*for\b", "Use a comprehension - the for goes inside the brackets.")
              var("clean", ["weld", "paint", "trim"])
              given({"clean": ["a"]}, raw=["  ", "A "])
            `,
            _ref: py`
              raw = [" Weld ", "", "PAINT", "   ", "trim"]
              clean = [s.strip().lower() for s in raw if s.strip()]
            `,
            hint:"<code>clean = [s.strip().lower() for s in raw if s.strip()]</code> — an empty string is falsy, so <code>if s.strip()</code> drops the blanks.", xp:12 }
        ] },

      { id:"43.4", title:"sorted, key= and lambda", concept:"ordering & aggregating rows",
        theory:`<p><code>ORDER BY</code> on rows needs to know <em>what to sort by</em>. In Python you pass a small function as <code>key=</code>; <code>lambda</code> writes one inline.</p>${vs([
          ['ORDER BY total DESC', 'sorted(rows, key=lambda r: r["total"], reverse=True)'],
          ['ORDER BY status, total DESC', 'sorted(rows, key=lambda r: (r["status"], -r["total"]))'],
          ['… LIMIT 3', '…[:3]'],
          ['the row with MAX(total)', 'max(rows, key=lambda r: r["total"])'],
          ['SUM(total)', 'sum(r["total"] for r in rows)'],
          ['every row passes / any row passes', 'all(… for r in rows) / any(… for r in rows)']
        ])}<p><code>lambda r: r["total"]</code> means "given a row, here is its sort value". The same <code>key=</code> works for <code>min</code> and <code>max</code>, which return the whole winning row, not just the number.</p><p><code>sorted()</code> returns a new list and leaves the input alone — which matters, because a function that quietly reorders the list its caller passed in is a bug waiting for a victim.</p>`,
        chips:[{t:"sorted(key=…)",c:"chip-blue"},{t:"lambda",c:"chip-purple"},{t:"any() / all()",c:"chip-green"}],
        task:"Write two functions over order rows. <code>top_n(rows, n)</code> returns the <code>n</code> rows with the highest <code>total</code>, largest first, without changing the list it was given. <code>all_paid(rows)</code> returns <code>True</code> when every row's status is \"completed\".",
        starter: py`
          def top_n(rows, n):
              return rows[:n]


          def all_paid(rows):
              return False


          orders = [
              {"id": 1, "total": 50.0,  "status": "completed"},
              {"id": 2, "total": 300.0, "status": "completed"},
              {"id": 3, "total": 120.0, "status": "pending"},
          ]
          print(top_n(orders, 2))
          print(all_paid(orders))
        `,
        ref: py`
          def top_n(rows, n):
              return sorted(rows, key=lambda r: r["total"], reverse=True)[:n]

          def all_paid(rows):
              return all(r["status"] == "completed" for r in rows)

          orders = [
              {"id": 1, "total": 50.0,  "status": "completed"},
              {"id": 2, "total": 300.0, "status": "completed"},
              {"id": 3, "total": 120.0, "status": "pending"},
          ]
          print(top_n(orders, 2))
          print(all_paid(orders))
        `,
        tests: py`
          fn("top_n"); fn("all_paid")
          _rows = [{"id": 1, "total": 50.0, "status": "completed"}, {"id": 2, "total": 300.0, "status": "completed"},
                   {"id": 3, "total": 120.0, "status": "pending"}, {"id": 4, "total": 75.0, "status": "completed"}]
          eq([r["id"] for r in top_n(_rows, 2)], [2, 3], "The ids from top_n(rows, 2)")
          eq([r["id"] for r in top_n(_rows, 10)], [2, 3, 4, 1], "The ids from top_n(rows, 10)")
          eq([r["id"] for r in _rows], [1, 2, 3, 4], "The order of the list you were given, after top_n ran,")
          eq(all_paid(_rows), False, "all_paid(rows) with one pending order")
          eq(all_paid([_rows[0], _rows[1]]), True, "all_paid(rows) when every order is completed")
        `,
        hint:"<code>return sorted(rows, key=lambda r: r[\"total\"], reverse=True)[:n]</code> and <code>return all(r[\"status\"] == \"completed\" for r in rows)</code>.", xp:35,
        exercises:[
          { id:"43.4.e1", prompt:"Write <code>cheapest(parts)</code> that returns the <code>sku</code> of the part with the lowest <code>cost</code>. Each part is a dict with \"sku\" and \"cost\".",
            tests: py`
              fn("cheapest")
              eq(cheapest([{"sku": "A", "cost": 3.0}, {"sku": "B", "cost": 0.5}, {"sku": "C", "cost": 9.0}]), "B", "cheapest(parts)")
              eq(cheapest([{"sku": "Z", "cost": 1.0}]), "Z", "cheapest() with one part")
            `,
            _ref: py`
              def cheapest(parts):
                  return min(parts, key=lambda p: p["cost"])["sku"]
            `,
            hint:"<code>min(parts, key=lambda p: p[\"cost\"])</code> is the whole cheapest row — add <code>[\"sku\"]</code> to take its sku.", xp:12 }
        ] }
    ]
  },

  // ───────────────────────────────────────────────────────────── Day 44 ──
  {
    day: 44, title: "Python V — When Things Go Wrong", lessons: [
      { id:"44.1", title:"try / except", concept:"handling errors",
        theory:`<p>When Python can't do what a line asks, it <strong>raises an exception</strong> and the script stops. One bad cell in row 40,000 of a file would end the whole load — unless you catch it.</p>${code(py`
          try:
              torque = float(text)         # may fail
          except ValueError:               # ...only this kind of failure is handled
              torque = None                # what to do instead
        `)}<p>SQLite quietly turns <code>CAST('n/a' AS REAL)</code> into <code>0.0</code>, and a warehouse's <code>TRY_CAST</code> gives <code>NULL</code>. Python makes you choose — and <code>None</code> is almost always the honest choice, because a silent 0 is a wrong number that looks like a right one.</p><p><strong>Catch specific exceptions.</strong> <code>float("n/a")</code> raises <code>ValueError</code>; <code>float(None)</code> raises <code>TypeError</code>. Catch several with a tuple: <code>except (ValueError, TypeError):</code>. A bare <code>except:</code> also swallows typos in your own code and the user pressing stop, which turns a clear crash into a silent wrong answer.</p>`,
        chips:[{t:"try / except",c:"chip-blue"},{t:"ValueError",c:"chip-amber"},{t:"no bare except",c:"chip-red"}],
        task:"Fix <code>to_float(text)</code> so it returns the number as a float when the text can be converted, and <code>None</code> when it can't — for junk like \"n/a\", an empty string, and a missing value (<code>None</code>).",
        starter: py`
          def to_float(text):
              return float(text)


          for sample in ["3.5", " 7 ", "n/a", "", None]:
              print(repr(sample), "->", to_float(sample))
        `,
        ref: py`
          def to_float(text):
              try:
                  return float(text)
              except (ValueError, TypeError):
                  return None

          for sample in ["3.5", " 7 ", "n/a", "", None]:
              print(repr(sample), "->", to_float(sample))
        `,
        tests: py`
          fn("to_float")
          avoids(r"except\s*:", "Catch the specific exceptions - a bare except: also hides bugs in your own code. Use except (ValueError, TypeError):")
          eq(to_float("3.5"), 3.5, 'to_float("3.5")')
          eq(to_float(" 7 "), 7.0, 'to_float(" 7 ")')
          eq(to_float("n/a"), None, 'to_float("n/a")')
          eq(to_float(""), None, 'to_float("")')
          eq(to_float(None), None, "to_float(None)")
          eq(to_float("0"), 0.0, 'to_float("0")')
        `,
        hint:"Wrap it: <code>try:</code> <code>return float(text)</code> / <code>except (ValueError, TypeError):</code> <code>return None</code>. Junk text raises ValueError; <code>None</code> raises TypeError.", xp:30,
        exercises:[
          { id:"44.1.e1", prompt:"Write <code>safe_div(a, b)</code> that returns <code>a / b</code>, or <code>None</code> when b is zero — by catching <code>ZeroDivisionError</code>.",
            tests: py`
              fn("safe_div")
              uses(r"except\s+ZeroDivisionError", "Catch ZeroDivisionError with try / except for this one.")
              eq(safe_div(10, 4), 2.5, "safe_div(10, 4)"); eq(safe_div(1, 0), None, "safe_div(1, 0)"); eq(safe_div(0, 5), 0.0, "safe_div(0, 5)")
            `,
            _ref: py`
              def safe_div(a, b):
                  try:
                      return a / b
                  except ZeroDivisionError:
                      return None
            `,
            hint:"<code>try: return a / b</code> then <code>except ZeroDivisionError: return None</code>.", xp:10 }
        ] },

      { id:"44.2", title:"raise — Refusing Bad Data", concept:"raising & validating",
        theory:`<p>Catching errors is half of it. The other half is <strong>raising</strong> them yourself when data breaks a rule your pipeline depends on. This is a data-quality test (Day 27) that runs <em>before</em> the row gets anywhere near the warehouse.</p>${code(py`
          def validate(reading):
              if reading.get("torque") is None:
                  raise ValueError("torque is missing")      # stop: say why
              if not 0 < reading["torque"] < 200:
                  raise ValueError(f"torque out of range: {reading['torque']}")
              return reading
        `)}<p>Raising beats returning <code>False</code> or printing a warning: the caller cannot ignore it by accident, and the message says what was wrong. The caller then decides — stop the whole run, or catch it and set the row aside:</p>${code(py`
          good, bad = [], []
          for row in rows:
              try:
                  good.append(validate(row))
              except ValueError as e:
                  bad.append({"row": row, "error": str(e)})     # the quarantine table
        `)}<p>Use <code>.get()</code> to read fields that might be absent — a missing key should become <em>your</em> <code>ValueError</code>, not a stray <code>KeyError</code>.</p>`,
        chips:[{t:"raise ValueError(…)",c:"chip-red"},{t:"validate",c:"chip-blue"},{t:"quarantine",c:"chip-purple"}],
        task:"Write <code>validate(row)</code> for an order line. Raise <code>ValueError</code> when <code>\"sku\"</code> is missing or blank (spaces only counts as blank), or when <code>\"qty\"</code> is missing or not above 0. Otherwise return the row unchanged.",
        starter: py`
          def validate(row):
              return row


          print(validate({"sku": "BRK-204", "qty": 2}))
        `,
        ref: py`
          def validate(row):
              sku = row.get("sku")
              if sku is None or not sku.strip():
                  raise ValueError("sku is missing")
              qty = row.get("qty")
              if qty is None or qty <= 0:
                  raise ValueError(f"qty must be above 0, got {qty}")
              return row

          print(validate({"sku": "BRK-204", "qty": 2}))
        `,
        tests: py`
          fn("validate")
          _ok = {"sku": "BRK-204", "qty": 2}
          eq(validate(_ok), _ok, 'validate({"sku": "BRK-204", "qty": 2})')
          raises(ValueError, validate, {"sku": "", "qty": 1})
          raises(ValueError, validate, {"sku": "   ", "qty": 1})
          raises(ValueError, validate, {"sku": "A", "qty": 0})
          raises(ValueError, validate, {"sku": "A", "qty": -3})
          raises(ValueError, validate, {"qty": 3})
          raises(ValueError, validate, {"sku": "A"})
        `,
        hint:"Read with <code>.get()</code> so a missing key gives None instead of a KeyError. <code>sku = row.get(\"sku\")</code>; <code>if sku is None or not sku.strip(): raise ValueError(\"sku is missing\")</code>. Same shape for qty with <code>qty is None or qty <= 0</code>. End with <code>return row</code>.", xp:35,
        exercises:[
          { id:"44.2.e1", prompt:"Write <code>quarantine(rows)</code>: run the given <code>validate</code> on each row and return two lists, <code>(good, bad)</code> — rows that pass, and rows that raised <code>ValueError</code>. One bad row must not stop the rest.",
            starter: py`
              def validate(row):
                  if not row.get("sku"):
                      raise ValueError("sku is missing")
                  if row.get("qty", 0) <= 0:
                      raise ValueError("qty must be above 0")
                  return row


              def quarantine(rows):
                  good, bad = [], []
                  return good, bad
            `,
            tests: py`
              fn("quarantine")
              _rows = [{"sku": "A", "qty": 1}, {"sku": "", "qty": 5}, {"sku": "B", "qty": 0}, {"sku": "C", "qty": 9}]
              _res = quarantine(_rows)
              check(isinstance(_res, tuple) and len(_res) == 2, "quarantine(rows) should return two lists: return good, bad")
              eq([r["sku"] for r in _res[0]], ["A", "C"], "The skus of the good rows")
              eq(len(_res[1]), 2, "The number of quarantined rows")
              eq(quarantine([]), ([], []), "quarantine([])")
            `,
            _ref: py`
              def validate(row):
                  if not row.get("sku"):
                      raise ValueError("sku is missing")
                  if row.get("qty", 0) <= 0:
                      raise ValueError("qty must be above 0")
                  return row

              def quarantine(rows):
                  good, bad = [], []
                  for row in rows:
                      try:
                          good.append(validate(row))
                      except ValueError:
                          bad.append(row)
                  return good, bad
            `,
            hint:"Loop over rows; inside, <code>try: good.append(validate(row))</code> and <code>except ValueError: bad.append(row)</code>. The try goes <em>inside</em> the loop, so each row gets its own chance.", xp:15 }
        ] },

      { id:"44.3", title:"The Standard Library — Counter & defaultdict", concept:"import, collections",
        theory:`<p>Python ships with a large <strong>standard library</strong>; <code>import</code> brings a piece of it in. Before writing a helper, check whether it already exists — it usually does, tested and fast.</p><p>The <code>collections</code> module has the two tools that replace the hand-written GROUP BY from Day 42:</p>${vs([
          ['SELECT code, COUNT(*) FROM d\nGROUP BY code\nORDER BY 2 DESC LIMIT 3', 'from collections import Counter\nCounter(codes).most_common(3)\n# [("scratch", 3), ("dent", 2), …]'],
          ['GROUP BY line  (collect the values)', 'from collections import defaultdict\nby_line = defaultdict(list)\nfor line, torque in rows:\n    by_line[line].append(torque)']
        ])}<p><code>Counter</code> is a dict that counts. <code>defaultdict(list)</code> is a dict that creates an empty list the first time a key is used, which removes the "is this key there yet?" check from every grouping loop.</p><p>Others worth knowing by name, so you recognise them: <code>itertools</code> (batching, chaining), <code>pathlib</code> (file paths), <code>datetime</code>, <code>json</code>, <code>csv</code>, <code>re</code>, <code>logging</code>.</p>`,
        chips:[{t:"import",c:"chip-cyan"},{t:"Counter",c:"chip-blue"},{t:"defaultdict",c:"chip-purple"}],
        task:"Write <code>top_defects(codes, n)</code>: given a list of defect codes (one per defect found), return the <code>n</code> most common as a list of <code>(code, count)</code> tuples, most frequent first.",
        starter: py`
          from collections import Counter


          def top_defects(codes, n):
              return []


          found = ["scratch", "dent", "scratch", "misalign", "scratch", "dent"]
          print(top_defects(found, 2))
        `,
        ref: py`
          from collections import Counter

          def top_defects(codes, n):
              return Counter(codes).most_common(n)

          found = ["scratch", "dent", "scratch", "misalign", "scratch", "dent"]
          print(top_defects(found, 2))
        `,
        tests: py`
          fn("top_defects")
          _c = ["scratch", "dent", "scratch", "misalign", "scratch", "dent"]
          eq(top_defects(_c, 2), [("scratch", 3), ("dent", 2)], "top_defects(codes, 2)")
          eq(top_defects(_c, 1), [("scratch", 3)], "top_defects(codes, 1)")
          eq(top_defects(["a", "b", "b"], 5), [("b", 2), ("a", 1)], 'top_defects(["a", "b", "b"], 5)')
          eq(top_defects([], 3), [], "top_defects([], 3)")
        `,
        hint:"<code>return Counter(codes).most_common(n)</code> — it already returns a list of (item, count) tuples in descending order.", xp:30,
        exercises:[
          { id:"44.3.e1", prompt:"Write <code>group_by_line(rows)</code>: <code>rows</code> is a list of <code>(line, torque)</code> tuples; return a dict of line → list of its torques, in the order they appear.",
            tests: py`
              fn("group_by_line")
              eq(dict(group_by_line([("L1", 41.0), ("L2", 39.5), ("L1", 42.2)])), {"L1": [41.0, 42.2], "L2": [39.5]}, "group_by_line(rows)")
              eq(dict(group_by_line([])), {}, "group_by_line([])")
            `,
            _ref: py`
              from collections import defaultdict

              def group_by_line(rows):
                  out = defaultdict(list)
                  for line, torque in rows:
                      out[line].append(torque)
                  return out
            `,
            hint:"<code>out = defaultdict(list)</code>, then <code>for line, torque in rows: out[line].append(torque)</code>, and return it.", xp:12 }
        ] },

      { id:"44.4", title:"Dates & Times", concept:"datetime",
        theory:`<p>In SQLite a date is just text you hope is formatted correctly. Python has real date types in the <code>datetime</code> module, and three operations cover most pipeline needs: <strong>parse</strong> text into a datetime, do <strong>arithmetic</strong>, <strong>format</strong> it back.</p>${code(py`
          from datetime import datetime, date, timedelta

          start = datetime.strptime("2024-03-01 22:00", "%Y-%m-%d %H:%M")   # parse
          end = start + timedelta(hours=8, minutes=30)                      # arithmetic
          (end - start).total_seconds() / 3600                              # 8.5
          end.strftime("%Y-%m-%d")                                          # '2024-03-02'  format

          d = date.fromisoformat("2024-03-06")     # ISO text -> date, no format string
          d.weekday()                              # 2   Monday is 0
          d.isoformat()                            # '2024-03-06'
        `)}<p>Subtracting two datetimes gives a <code>timedelta</code> — a duration. The night shift that crosses midnight, which needed care in the capstone, is simply correct here: 22:00 to 06:30 the next day is 8.5 hours.</p><p>The format codes (<code>%Y %m %d %H %M %S</code>) are the same family as <code>strftime</code> in SQLite. One rule for real systems: store and compare timestamps in <strong>UTC</strong>, and convert to local time only for display.</p>`,
        chips:[{t:"strptime / strftime",c:"chip-blue"},{t:"timedelta",c:"chip-purple"},{t:"date.fromisoformat",c:"chip-green"}],
        task:"Write <code>hours_between(start, end)</code>: both are text like <code>\"2024-03-01 22:00\"</code>. Return the hours from start to end as a float — a shift from 22:00 to 06:30 the next day is 8.5.",
        starter: py`
          from datetime import datetime


          def hours_between(start, end):
              return 0


          print(hours_between("2024-03-01 22:00", "2024-03-02 06:30"))
        `,
        ref: py`
          from datetime import datetime

          def hours_between(start, end):
              fmt = "%Y-%m-%d %H:%M"
              delta = datetime.strptime(end, fmt) - datetime.strptime(start, fmt)
              return delta.total_seconds() / 3600

          print(hours_between("2024-03-01 22:00", "2024-03-02 06:30"))
        `,
        tests: py`
          fn("hours_between")
          eq(hours_between("2024-03-01 22:00", "2024-03-02 06:30"), 8.5, 'hours_between("2024-03-01 22:00", "2024-03-02 06:30")')
          eq(hours_between("2024-03-01 06:00", "2024-03-01 06:45"), 0.75, 'hours_between("2024-03-01 06:00", "2024-03-01 06:45")')
          eq(hours_between("2024-02-28 12:00", "2024-03-01 12:00"), 48.0, 'hours_between("2024-02-28 12:00", "2024-03-01 12:00") - 2024 is a leap year, so that is')
        `,
        hint:"Parse both with <code>datetime.strptime(text, \"%Y-%m-%d %H:%M\")</code>, subtract (end − start), then <code>.total_seconds() / 3600</code>.", xp:35,
        exercises:[
          { id:"44.4.e1", prompt:"Write <code>week_start(day)</code>: given an ISO date like <code>\"2024-03-06\"</code>, return the Monday of that week as ISO text (<code>\"2024-03-04\"</code>) — the bucket a weekly report groups by.",
            tests: py`
              fn("week_start")
              eq(week_start("2024-03-06"), "2024-03-04", 'week_start("2024-03-06")')
              eq(week_start("2024-03-04"), "2024-03-04", 'week_start("2024-03-04") - already a Monday, so')
              eq(week_start("2024-03-10"), "2024-03-04", 'week_start("2024-03-10") - a Sunday, so')
              eq(week_start("2024-01-02"), "2024-01-01", 'week_start("2024-01-02")')
            `,
            _ref: py`
              from datetime import date, timedelta

              def week_start(day):
                  d = date.fromisoformat(day)
                  return (d - timedelta(days=d.weekday())).isoformat()
            `,
            hint:"<code>d = date.fromisoformat(day)</code>; <code>d.weekday()</code> is 0 for Monday, so subtract that many days: <code>(d - timedelta(days=d.weekday())).isoformat()</code>.", xp:15 }
        ] }
    ]
  },

  // ───────────────────────────────────────────────────────────── Day 45 ──
  {
    day: 45, title: "Python VI — Files: Text, CSV & JSON", lessons: [
      { id:"45.1", title:"Reading a File", concept:"open, with",
        theory:`<p>Extraction starts with a file someone else wrote. Open it in a <code>with</code> block — the file is closed for you when the block ends, even if an error happens in the middle.</p>${code(py`
          with open("line_log.txt") as f:
              for line in f:               # one line at a time - works on a 50 GB file
                  line = line.strip()      # each line ends with "\n"
                  if not line:
                      continue             # skip blank lines
                  print(line)
        `)}<p>Looping over the file reads it <strong>lazily</strong>, a line at a time, so memory stays flat however large the file is. <code>f.read()</code> pulls everything in at once — fine for small files, a crash for big ones.</p><p>This lesson's files sit in the working folder; their names are the pills above the editor (click one to see its contents). Each run starts from fresh copies, so you can't damage them.</p>`,
        chips:[{t:"with open(…) as f",c:"chip-blue"},{t:"for line in f",c:"chip-green"},{t:".strip()",c:"chip-cyan"}],
        task:"Write <code>faults(path)</code>: open the log file at <code>path</code> and return a list of the lines that contain <code>\"FAULT\"</code>, each with its surrounding whitespace stripped.",
        files:{ "line_log.txt": "2024-03-01 06:00 L1 OK\n2024-03-01 06:05 L2 FAULT torque high\n2024-03-01 06:10 L1 OK\n\n2024-03-01 06:15 L3 FAULT sensor offline\n2024-03-01 06:20 L2 OK\n" },
        starter: py`
          def faults(path):
              found = []
              return found


          for line in faults("line_log.txt"):
              print(line)
        `,
        ref: py`
          def faults(path):
              found = []
              with open(path) as f:
                  for line in f:
                      if "FAULT" in line:
                          found.append(line.strip())
              return found

          for line in faults("line_log.txt"):
              print(line)
        `,
        tests: py`
          fn("faults")
          eq(faults("line_log.txt"), ["2024-03-01 06:05 L2 FAULT torque high", "2024-03-01 06:15 L3 FAULT sensor offline"], 'faults("line_log.txt")')
          with open("_other.txt", "w") as _f:
              _f.write("a OK\n  b FAULT x  \nc OK\n")
          eq(faults("_other.txt"), ["b FAULT x"], "faults() on a different log file")
        `,
        hint:"<code>with open(path) as f:</code>, then <code>for line in f:</code>, and inside <code>if \"FAULT\" in line: found.append(line.strip())</code>. Use the <code>path</code> parameter, not a fixed file name.", xp:30,
        exercises:[
          { id:"45.1.e1", prompt:"Write <code>count_lines(path)</code> that returns how many <em>non-blank</em> lines the file has. (<code>line_log.txt</code> has 5.)",
            tests: py`
              fn("count_lines")
              eq(count_lines("line_log.txt"), 5, 'count_lines("line_log.txt")')
              with open("_other.txt", "w") as _f:
                  _f.write("\n\nx\n   \n")
              eq(count_lines("_other.txt"), 1, "count_lines() on a file with one real line and three blank ones")
            `,
            _ref: py`
              def count_lines(path):
                  n = 0
                  with open(path) as f:
                      for line in f:
                          if line.strip():
                              n += 1
                  return n
            `,
            hint:"Loop over the file and count the lines where <code>line.strip()</code> is not empty.", xp:10 }
        ] },

      { id:"45.2", title:"CSV — Every Value Is Text", concept:"csv.DictReader",
        theory:`<p>CSV is the format you'll be handed most. Never split lines on commas yourself — a quoted field containing a comma breaks that. The <code>csv</code> module handles quoting properly, and <code>DictReader</code> gives each row as a dict keyed by the header:</p>${code(py`
          import csv

          with open("readings.csv", newline="") as f:
              for row in csv.DictReader(f):
                  print(row)     # {'station': 'W1', 'torque': '41.2', 'ts': '2024-03-01 06:00'}
        `)}<p>Look at <code>'41.2'</code>: <strong>a CSV has no types — every value arrives as a string</strong>, and a blank cell arrives as <code>''</code>, not <code>None</code>. Converting to real types and deciding what a blank means is the "T" of ETL, and it is your job, row by row:</p>${code(py`
          torque = float(row["torque"])       # '41.2' -> 41.2 ; raises ValueError on ''
        `)}<p>A database enforces a schema when data is written. A CSV enforces nothing, so the code that reads it is where the schema lives.</p>`,
        chips:[{t:"csv.DictReader",c:"chip-blue"},{t:"str → float",c:"chip-amber"},{t:"blank ≠ None",c:"chip-red"}],
        task:"Fix <code>load_readings(path)</code>. It should return a list of dicts with <code>station</code> (text), <code>torque</code> (a <strong>float</strong>) and <code>ts</code> (text) — and leave out rows whose torque cell is blank.",
        files:{ "readings.csv": "station,torque,ts\nW1,41.2,2024-03-01 06:00\nW2, 39.8 ,2024-03-01 06:00\nW1,,2024-03-01 06:05\nW3,44.1,2024-03-01 06:05\nW2,40.5,2024-03-01 06:10\n" },
        starter: py`
          import csv


          def load_readings(path):
              with open(path, newline="") as f:
                  rows = list(csv.DictReader(f))
              return rows


          for r in load_readings("readings.csv"):
              print(r)
        `,
        ref: py`
          import csv

          def load_readings(path):
              rows = []
              with open(path, newline="") as f:
                  for row in csv.DictReader(f):
                      if not row["torque"].strip():
                          continue
                      rows.append({"station": row["station"], "torque": float(row["torque"]), "ts": row["ts"]})
              return rows

          for r in load_readings("readings.csv"):
              print(r)
        `,
        tests: py`
          fn("load_readings")
          _got = load_readings("readings.csv")
          check(isinstance(_got, list), "load_readings() should return a list of dicts.")
          eq(len(_got), 4, "The number of rows from readings.csv (one has a blank torque and should be left out)")
          check(all(isinstance(r.get("torque"), float) for r in _got), "Every torque should be a float - at least one is still text. Convert it with float(...).")
          eq(_got, [{"station": "W1", "torque": 41.2, "ts": "2024-03-01 06:00"}, {"station": "W2", "torque": 39.8, "ts": "2024-03-01 06:00"},
                    {"station": "W3", "torque": 44.1, "ts": "2024-03-01 06:05"}, {"station": "W2", "torque": 40.5, "ts": "2024-03-01 06:10"}], 'load_readings("readings.csv")')
          with open("_other.csv", "w") as _f:
              _f.write("station,torque,ts\nX,,t1\nY,1.5,t2\n")
          eq(load_readings("_other.csv"), [{"station": "Y", "torque": 1.5, "ts": "t2"}], "load_readings() on a different file")
        `,
        hint:"Loop over <code>csv.DictReader(f)</code>. Skip the row when <code>row[\"torque\"].strip()</code> is empty; otherwise append <code>{\"station\": row[\"station\"], \"torque\": float(row[\"torque\"]), \"ts\": row[\"ts\"]}</code>.", xp:35,
        exercises:[
          { id:"45.2.e1", prompt:"Write <code>avg_torque(path)</code>: the average of the non-blank torque values in the CSV, rounded to 2 decimals. For <code>readings.csv</code> that is 41.4.",
            tests: py`
              fn("avg_torque")
              eq(avg_torque("readings.csv"), 41.4, 'avg_torque("readings.csv")')
              with open("_other.csv", "w") as _f:
                  _f.write("station,torque,ts\nX,,t1\nY,1.0,t2\nZ,2.5,t3\n")
              eq(avg_torque("_other.csv"), 1.75, "avg_torque() on a different file")
            `,
            _ref: py`
              import csv

              def avg_torque(path):
                  values = []
                  with open(path, newline="") as f:
                      for row in csv.DictReader(f):
                          if row["torque"].strip():
                              values.append(float(row["torque"]))
                  return round(sum(values) / len(values), 2)
            `,
            hint:"Collect <code>float(row[\"torque\"])</code> for rows where the cell isn't blank, then <code>round(sum(values) / len(values), 2)</code>.", xp:12 }
        ] },

      { id:"45.3", title:"JSON — Nested Data", concept:"json, flattening",
        theory:`<p>APIs and event streams speak JSON, and JSON maps directly onto what you already know: an object is a <strong>dict</strong>, an array is a <strong>list</strong>, <code>null</code> is <code>None</code>.</p>${code(py`
          import json

          with open("order.json") as f:
              order = json.load(f)                 # file -> dicts and lists
          order["customer"]["tier"]                # walk down by key
          order["items"][0]["sku"]                 # ...and by position

          json.loads('{"a": 1}')                   # same, from a string
          json.dumps(order, indent=2)              # dicts and lists -> JSON text
        `)}<p>Unlike CSV, JSON keeps types (numbers stay numbers) and it <strong>nests</strong>: one order holds a customer object and a list of items. A table can't hold that, so loading JSON means <em>flattening</em> — one output row per item, with the parent's fields copied onto each. It's the same operation as <code>LATERAL FLATTEN</code> and <code>UNNEST</code> from Day 31, written out as a loop:</p>${vs([
          ['SELECT o.order_id, i.value:sku\nFROM orders o,\nLATERAL FLATTEN(o.items) i', 'for item in order["items"]:\n    rows.append({"order_id": order["order_id"],\n                 "sku": item["sku"]})']
        ])}`,
        chips:[{t:"json.load / loads",c:"chip-blue"},{t:"nested dicts",c:"chip-purple"},{t:"flatten",c:"chip-green"}],
        task:"Write <code>flatten(path)</code>: read the order JSON and return one dict per item with exactly these keys — <code>order_id</code>, <code>customer</code> (the customer's name), <code>sku</code>, <code>qty</code> and <code>line_total</code> (qty × price, rounded to 2 decimals).",
        files:{ "order.json": '{\n  "order_id": 5001,\n  "customer": {"name": "Alice Chen", "tier": "Pro"},\n  "items": [\n    {"sku": "BRK-204", "qty": 2, "price": 4.5},\n    {"sku": "HSG-771", "qty": 1, "price": 38.0},\n    {"sku": "NUT-010", "qty": 100, "price": 0.05}\n  ]\n}\n' },
        starter: py`
          import json


          def flatten(path):
              with open(path) as f:
                  order = json.load(f)
              rows = []
              return rows


          for row in flatten("order.json"):
              print(row)
        `,
        ref: py`
          import json

          def flatten(path):
              with open(path) as f:
                  order = json.load(f)
              rows = []
              for item in order["items"]:
                  rows.append({
                      "order_id": order["order_id"],
                      "customer": order["customer"]["name"],
                      "sku": item["sku"],
                      "qty": item["qty"],
                      "line_total": round(item["qty"] * item["price"], 2),
                  })
              return rows

          for row in flatten("order.json"):
              print(row)
        `,
        tests: py`
          fn("flatten")
          eq(flatten("order.json"), [
              {"order_id": 5001, "customer": "Alice Chen", "sku": "BRK-204", "qty": 2, "line_total": 9.0},
              {"order_id": 5001, "customer": "Alice Chen", "sku": "HSG-771", "qty": 1, "line_total": 38.0},
              {"order_id": 5001, "customer": "Alice Chen", "sku": "NUT-010", "qty": 100, "line_total": 5.0}], 'flatten("order.json")')
          import json as _json
          with open("_other.json", "w") as _f:
              _json.dump({"order_id": 7, "customer": {"name": "Bo", "tier": "Free"}, "items": [{"sku": "Z", "qty": 3, "price": 1.5}]}, _f)
          eq(flatten("_other.json"), [{"order_id": 7, "customer": "Bo", "sku": "Z", "qty": 3, "line_total": 4.5}], "flatten() on a different order")
          with open("_empty.json", "w") as _f:
              _json.dump({"order_id": 8, "customer": {"name": "Cy", "tier": "Free"}, "items": []}, _f)
          eq(flatten("_empty.json"), [], "flatten() on an order with no items")
        `,
        hint:"<code>for item in order[\"items\"]:</code> append a dict with <code>\"order_id\": order[\"order_id\"]</code>, <code>\"customer\": order[\"customer\"][\"name\"]</code>, <code>\"sku\": item[\"sku\"]</code>, <code>\"qty\": item[\"qty\"]</code> and <code>\"line_total\": round(item[\"qty\"] * item[\"price\"], 2)</code>.", xp:35,
        exercises:[
          { id:"45.3.e1", prompt:"Write <code>total_qty(text)</code>: <code>text</code> is the JSON of one order, as a string. Return the sum of <code>qty</code> across its items.",
            tests: py`
              fn("total_qty")
              eq(total_qty('{"order_id": 1, "items": [{"sku": "A", "qty": 2}, {"sku": "B", "qty": 5}]}'), 7, "total_qty() for an order with quantities 2 and 5")
              eq(total_qty('{"order_id": 2, "items": []}'), 0, "total_qty() for an order with no items")
            `,
            _ref: py`
              import json

              def total_qty(text):
                  order = json.loads(text)
                  return sum(item["qty"] for item in order["items"])
            `,
            hint:"<code>json.loads(text)</code> (with an s — from a string), then <code>sum(item[\"qty\"] for item in order[\"items\"])</code>.", xp:12 }
        ] },

      { id:"45.4", title:"Writing Files", concept:"csv.DictWriter, write modes",
        theory:`<p>The last step of many jobs is writing a file for the next system. The mode you open with decides what happens to what was already there:</p>${code(py`
          open(path, "w")    # write  - creates the file, or ERASES it if it exists
          open(path, "a")    # append - adds to the end
          open(path)         # read   - the default ("r")
        `)}<p>For CSV, <code>DictWriter</code> is the mirror of <code>DictReader</code>: you name the columns, and it handles the quoting.</p>${code(py`
          import csv

          with open("out.csv", "w", newline="") as f:
              writer = csv.DictWriter(f, fieldnames=["sku", "qty"])
              writer.writeheader()
              writer.writerows(rows)        # rows: a list of dicts with those keys
        `)}<p><code>fieldnames</code> fixes the column order whatever order the dict keys happen to be in — the file's schema, stated once. Write rows in a deterministic order (sort them): a job that produces the same bytes from the same input can be re-run and compared, and one that doesn't can't. That property is <strong>idempotency</strong>, and you'll want it everywhere from here on.</p>`,
        chips:[{t:"\"w\" vs \"a\"",c:"chip-amber"},{t:"csv.DictWriter",c:"chip-blue"},{t:"deterministic output",c:"chip-green"}],
        task:"Write <code>write_report(rows, path)</code>: write the rows to a CSV at <code>path</code> with the header <code>sku,qty,line_total</code> (in that column order), one line per row, sorted by sku.",
        starter: py`
          import csv


          def write_report(rows, path):
              pass


          write_report([{"sku": "HSG-771", "qty": 1, "line_total": 38.0},
                        {"sku": "BRK-204", "qty": 2, "line_total": 9.0}], "report.csv")
          print(open("report.csv").read())
        `,
        ref: py`
          import csv

          def write_report(rows, path):
              with open(path, "w", newline="") as f:
                  writer = csv.DictWriter(f, fieldnames=["sku", "qty", "line_total"])
                  writer.writeheader()
                  writer.writerows(sorted(rows, key=lambda r: r["sku"]))

          write_report([{"sku": "HSG-771", "qty": 1, "line_total": 38.0},
                        {"sku": "BRK-204", "qty": 2, "line_total": 9.0}], "report.csv")
          print(open("report.csv").read())
        `,
        tests: py`
          fn("write_report")
          import csv as _csv, os as _os
          _rows = [{"qty": 1, "sku": "HSG-771", "line_total": 38.0}, {"line_total": 9.0, "sku": "BRK-204", "qty": 2}, {"sku": "NUT-010", "qty": 100, "line_total": 5.0}]
          write_report(_rows, "_check.csv")
          check(_os.path.exists("_check.csv"), 'write_report(rows, "_check.csv") did not create the file - open it with mode "w".')
          with open("_check.csv", newline="") as _f:
              _lines = [l for l in _csv.reader(_f) if l]
          check(len(_lines) > 0, "The file was created but it is empty.")
          eq(_lines[0], ["sku", "qty", "line_total"], "The header row of the file")
          eq(_lines[1:], [["BRK-204", "2", "9.0"], ["HSG-771", "1", "38.0"], ["NUT-010", "100", "5.0"]], "The data rows of the file (sorted by sku)")
          write_report([{"sku": "A", "qty": 1, "line_total": 1.0}], "_check.csv")
          with open("_check.csv", newline="") as _f:
              _lines = [l for l in _csv.reader(_f) if l]
          eq(len(_lines), 2, "The number of lines after writing a 1-row report to the same path again (it should replace the file, not add to it)")
        `,
        hint:"<code>with open(path, \"w\", newline=\"\") as f:</code>, then <code>writer = csv.DictWriter(f, fieldnames=[\"sku\", \"qty\", \"line_total\"])</code>, <code>writer.writeheader()</code>, <code>writer.writerows(sorted(rows, key=lambda r: r[\"sku\"]))</code>.", xp:35,
        exercises:[
          { id:"45.4.e1", prompt:"Write <code>append_line(path, text)</code> that adds <code>text</code> as a new line at the end of the file, keeping what's already there (and creating the file if it doesn't exist).",
            tests: py`
              fn("append_line")
              append_line("_log.txt", "first")
              append_line("_log.txt", "second")
              with open("_log.txt") as _f:
                  eq(_f.read(), "first\nsecond\n", "The file's contents after appending 'first' then 'second'")
            `,
            _ref: py`
              def append_line(path, text):
                  with open(path, "a") as f:
                      f.write(text + "\n")
            `,
            hint:"Open with mode <code>\"a\"</code> and <code>f.write(text + \"\\n\")</code> — write() doesn't add the newline for you.", xp:10 }
        ] }
    ]
  });
})();
