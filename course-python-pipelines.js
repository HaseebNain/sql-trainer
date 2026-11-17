// SQL Quest — Python track, part 3 (Days 46–48): Python meets the database.
// Lesson format: see the header of course-python-basics.js.
//
// Lessons with `db: true` get `shop.db` in the working folder — a fresh copy of
// the practice database (the same tables the SQL lessons query) on every run,
// so nothing a learner writes to it can leak into the next attempt.

(function () {
  const { py, code, vs, add } = PyCourse;

  const SHIFT_CSV = "station,torque,ts,operator\n w1 ,41.2,2024-03-01 06:00,ana\nW2,n/a,2024-03-01 06:00,ben\nW1,41.9,2024-03-01 06:00,ana\nw3, 44.1,2024-03-01 06:05,cy\nW2,,2024-03-01 06:05,ben\nW2,40.5,2024-03-01 06:10,ben\n,39.9,2024-03-01 06:10,dee\nW3,250.0,2024-03-01 06:10,cy\nW1,40.8,2024-03-01 06:05,ana\n";
  const ORDERS_CSV = "id,customer_id,order_date,status,total\n1,1,2024-01-05,completed,398.00\n2,2,2024-01-17,completed,89.00\n3,1,2024-02-02,refunded,620.50\n4,3,2024-02-11,completed,310.00\n5,2,2024-02-20,pending,45.00\n6,4,2024-03-03,completed,\n7,3,2024-03-09,completed,129.50\n8,9,2024-03-15,completed,75.00\n";
  const CUSTOMERS_CSV = "id,name,tier\n1,Alice Chen,Pro\n2,Bob Diaz,Free\n3,Chen Wu,Pro\n4,Dee Park,Enterprise\n5,Eli Stone,Free\n";

  add(
  // ───────────────────────────────────────────────────────────── Day 46 ──
  {
    day: 46, title: "Python + SQL — Driving the Database", lessons: [
      { id:"46.1", title:"Connect, Execute, Fetch", concept:"sqlite3: the DB-API",
        theory:`<p>Here the two halves of the course meet. Python doesn't replace SQL — it <em>drives</em> it: open a connection, send a query, get rows back as tuples.</p>${code(py`
          import sqlite3

          conn = sqlite3.connect("shop.db")
          cur = conn.execute("SELECT name, tier FROM customers LIMIT 2")
          cur.fetchall()        # [('Alice Chen', 'Pro'), ('Bob Smith', 'Free')]
          conn.close()

          for name, tier in conn.execute("SELECT name, tier FROM customers"):
              ...               # or loop over the cursor - rows arrive one at a time
        `)}<p>This <strong>connect → execute → fetch</strong> shape is the Python DB-API, and every database driver follows it: <code>psycopg</code> for Postgres, <code>snowflake-connector-python</code>, <code>google-cloud-bigquery</code>. Learn it once on SQLite and only the <code>connect()</code> line changes.</p><p><strong>Do the set work in SQL.</strong> Filtering, joining and aggregating inside the database is faster and simpler than pulling every row into Python and looping. Python's job is what surrounds the query: deciding what to run, with which values, and what to do with the answer.</p><p><code>shop.db</code> here is a copy of the practice database from the SQL days — the Schema tab and the pills above the editor show its tables.</p>`,
        chips:[{t:"sqlite3.connect",c:"chip-blue"},{t:"execute / fetchall",c:"chip-green"},{t:"SQL does the set work",c:"chip-purple"}],
        task:"Write <code>top_customers(db_path, n)</code>: return the <code>n</code> customers with the most revenue from <strong>completed</strong> orders, as a list of <code>(name, revenue)</code> tuples, highest first. Let one SQL query do the joining, summing, ordering and limiting.",
        db:true, tables:["customers","orders"],
        starter: py`
          import sqlite3


          def top_customers(db_path, n):
              conn = sqlite3.connect(db_path)
              rows = conn.execute("SELECT name FROM customers LIMIT 3").fetchall()
              conn.close()
              return rows


          for row in top_customers("shop.db", 3):
              print(row)
        `,
        ref: py`
          import sqlite3

          def top_customers(db_path, n):
              conn = sqlite3.connect(db_path)
              rows = conn.execute("""
                  SELECT c.name, SUM(o.total) AS revenue
                  FROM orders o JOIN customers c ON c.id = o.customer_id
                  WHERE o.status = 'completed'
                  GROUP BY c.id, c.name
                  ORDER BY revenue DESC, c.name
                  LIMIT ?""", (n,)).fetchall()
              conn.close()
              return rows

          for row in top_customers("shop.db", 3):
              print(row)
        `,
        tests: py`
          fn("top_customers")
          import sqlite3 as _sq
          _c = _sq.connect("shop.db")
          _exp = _c.execute("SELECT c.name, SUM(o.total) r FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed' GROUP BY c.id, c.name ORDER BY r DESC, c.name").fetchall()
          _c.close()
          _got = top_customers("shop.db", 3)
          check(isinstance(_got, list), "top_customers() should return a list of rows - use .fetchall().")
          eq(len(_got), 3, 'The number of rows from top_customers("shop.db", 3)')
          check(all(len(r) == 2 for r in _got), "Each row should be a (name, revenue) pair - select exactly those two columns.")
          eq([(r[0], round(r[1], 2)) for r in _got], [(n_, round(r_, 2)) for n_, r_ in _exp[:3]], 'top_customers("shop.db", 3)')
          eq([r[0] for r in top_customers("shop.db", 1)], [_exp[0][0]], 'The name from top_customers("shop.db", 1)')
        `,
        hint:"SQL you already know: <code>SELECT c.name, SUM(o.total) AS revenue FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'completed' GROUP BY c.id, c.name ORDER BY revenue DESC LIMIT ?</code> — run it with <code>conn.execute(sql, (n,)).fetchall()</code>. The <code>?</code> is filled from the tuple; next lesson explains why that matters.", xp:40,
        exercises:[
          { id:"46.1.e1", prompt:"Write <code>dept_headcount(db_path)</code>: return a dict of department → number of employees, from the <code>employees</code> table.",
            tests: py`
              fn("dept_headcount")
              import sqlite3 as _sq
              _c = _sq.connect("shop.db")
              _exp = dict(_c.execute("SELECT department, COUNT(*) FROM employees GROUP BY department").fetchall())
              _c.close()
              eq(dept_headcount("shop.db"), _exp, 'dept_headcount("shop.db")')
            `,
            _ref: py`
              import sqlite3

              def dept_headcount(db_path):
                  conn = sqlite3.connect(db_path)
                  rows = conn.execute("SELECT department, COUNT(*) FROM employees GROUP BY department").fetchall()
                  conn.close()
                  return dict(rows)
            `,
            hint:"A <code>GROUP BY department</code> query returns (department, count) pairs — and <code>dict()</code> of a list of pairs is exactly the dict you want.", xp:12 }
        ] },

      { id:"46.2", title:"Parameters — Never Build SQL from Values", concept:"placeholders & SQL injection",
        theory:`<p>Sooner or later a value in your query comes from outside: a file, a form, an API. The obvious way to put it into the SQL is the wrong one:</p>${code(py`
          name = "x' OR '1'='1"
          conn.execute(f"SELECT * FROM customers WHERE name = '{name}'")
          # the database sees:  ... WHERE name = 'x' OR '1'='1'   -> every row
        `)}<p>That is <strong>SQL injection</strong>: text meant as a <em>value</em> became part of the <em>statement</em>. The same hole lets <code>'; DROP TABLE …</code> through, and even with honest data an ordinary surname like <code>O'Brien</code> breaks the query with a syntax error.</p><p>The fix is a <strong>placeholder</strong>. You send the SQL and the values separately and the driver keeps them apart — a value can never turn into SQL:</p>${code(py`
          conn.execute("SELECT * FROM customers WHERE name = ?", (name,))          # positional
          conn.execute("SELECT * FROM orders WHERE total > :min", {"min": 100})    # named
        `)}<p>Note <code>(name,)</code> — the trailing comma makes it a one-item tuple. Placeholders work for <em>values</em> only; table and column names can't be parameters, so those must come from your own code, never from input. This is one of the few rules in data engineering with no exceptions.</p>`,
        chips:[{t:"? placeholders",c:"chip-green"},{t:"SQL injection",c:"chip-red"},{t:"(value,)",c:"chip-amber"}],
        task:"<code>orders_for</code> works for ordinary names but builds its SQL with an f-string. Rewrite it with a placeholder so it returns the <code>(id, total)</code> of that customer's orders, ordered by id — and returns nothing, without crashing, for names like <code>O'Brien</code> or <code>x' OR '1'='1</code>.",
        db:true, tables:["customers","orders"],
        starter: py`
          import sqlite3


          def orders_for(db_path, customer_name):
              conn = sqlite3.connect(db_path)
              sql = f"""
                  SELECT o.id, o.total
                  FROM orders o JOIN customers c ON c.id = o.customer_id
                  WHERE c.name = '{customer_name}'
                  ORDER BY o.id"""
              rows = conn.execute(sql).fetchall()
              conn.close()
              return rows


          print(orders_for("shop.db", "Alice Chen"))
          print(len(orders_for("shop.db", "x' OR '1'='1")), "rows for a name nobody has")
        `,
        ref: py`
          import sqlite3

          def orders_for(db_path, customer_name):
              conn = sqlite3.connect(db_path)
              sql = """
                  SELECT o.id, o.total
                  FROM orders o JOIN customers c ON c.id = o.customer_id
                  WHERE c.name = ?
                  ORDER BY o.id"""
              rows = conn.execute(sql, (customer_name,)).fetchall()
              conn.close()
              return rows

          print(orders_for("shop.db", "Alice Chen"))
          print(len(orders_for("shop.db", "x' OR '1'='1")), "rows for a name nobody has")
        `,
        tests: py`
          fn("orders_for")
          eq([tuple(r) for r in orders_for("shop.db", "Alice Chen")], [(1, 398.0), (11, 499.0), (21, 299.0)], 'orders_for("shop.db", "Alice Chen")')
          _evil = "x' OR '1'='1"
          try:
              _r = orders_for("shop.db", _evil)
          except Exception as _e:
              raise CheckFail("orders_for() crashed with " + type(_e).__name__ + " on the name x' OR '1'='1 - the quote in the value became part of the SQL. Use a ? placeholder and pass the name separately.")
          check(len(_r) == 0, "orders_for() returned " + str(len(_r)) + " rows for the name x' OR '1'='1, which no customer has. The value was pasted into the SQL and changed the query - that is SQL injection. Use a ? placeholder and pass the name separately.")
          try:
              _r = orders_for("shop.db", "O'Brien")
          except Exception as _e:
              raise CheckFail("orders_for() crashed with " + type(_e).__name__ + " on the name O'Brien - a quote in a value must not break the query. Use a ? placeholder.")
          eq(len(_r), 0, "The number of orders for O'Brien")
        `,
        hint:"Drop the <code>f</code> and the quotes around the value: <code>WHERE c.name = ?</code>, then <code>conn.execute(sql, (customer_name,))</code>. Mind the comma in <code>(customer_name,)</code>.", xp:40,
        exercises:[
          { id:"46.2.e1", prompt:"Write <code>count_between(db_path, start, end)</code>: the number of orders with <code>order_date</code> from <code>start</code> to <code>end</code> inclusive (ISO dates), using two placeholders.",
            tests: py`
              fn("count_between")
              uses(r"\?|:\w+", "Pass start and end with placeholders (? or :name), not by building them into the SQL text.")
              import sqlite3 as _sq
              _c = _sq.connect("shop.db")
              _a = _c.execute("SELECT COUNT(*) FROM orders WHERE order_date BETWEEN '2023-01-01' AND '2023-12-31'").fetchone()[0]
              _b = _c.execute("SELECT COUNT(*) FROM orders WHERE order_date BETWEEN '2022-03-15' AND '2022-03-15'").fetchone()[0]
              _c.close()
              eq(count_between("shop.db", "2023-01-01", "2023-12-31"), _a, 'count_between("shop.db", "2023-01-01", "2023-12-31")')
              eq(count_between("shop.db", "2022-03-15", "2022-03-15"), _b, 'count_between("shop.db", "2022-03-15", "2022-03-15")')
              eq(count_between("shop.db", "1999-01-01", "1999-12-31"), 0, 'count_between("shop.db", "1999-01-01", "1999-12-31")')
            `,
            _ref: py`
              import sqlite3

              def count_between(db_path, start, end):
                  conn = sqlite3.connect(db_path)
                  n = conn.execute("SELECT COUNT(*) FROM orders WHERE order_date BETWEEN ? AND ?", (start, end)).fetchone()[0]
                  conn.close()
                  return n
            `,
            hint:"<code>conn.execute(\"SELECT COUNT(*) FROM orders WHERE order_date BETWEEN ? AND ?\", (start, end)).fetchone()[0]</code> — <code>fetchone()</code> gives the single row, <code>[0]</code> its only column.", xp:15 }
        ] },

      { id:"46.3", title:"Writing Rows — executemany & commit", concept:"loading data",
        theory:`<p>Loading is the "L" of ETL: rows that live in Python go into a table. <code>executemany</code> runs one parameterised statement for every row in a list — far faster than a loop of single inserts, and it keeps the values out of the SQL text.</p>${code(py`
          rows = [("W1", 41.2), ("W2", 39.8)]

          conn = sqlite3.connect("shop.db")
          conn.execute("CREATE TABLE IF NOT EXISTS readings (station TEXT, torque REAL)")
          conn.executemany("INSERT INTO readings VALUES (?, ?)", rows)
          conn.commit()          # <- nothing is saved until this line
          conn.close()
        `)}<p><strong>Writes are not saved until you commit.</strong> In the SQL days every statement saved itself. A Python connection opens a transaction on your first write and holds it: close without <code>commit()</code> and the rows vanish, with no error. "My job ran fine and the table is empty" is this bug nearly every time — which is why the check for this lesson looks at the table from a <em>new</em> connection.</p><p><code>CREATE TABLE IF NOT EXISTS</code> makes the setup safe to run on every execution: the first run creates the table, later runs leave it alone.</p>`,
        chips:[{t:"executemany",c:"chip-blue"},{t:"commit()",c:"chip-red"},{t:"IF NOT EXISTS",c:"chip-green"}],
        task:"Write <code>load_readings(db_path, rows)</code>. <code>rows</code> is a list of <code>(station, torque)</code> tuples. Create the table <code>readings (station TEXT, torque REAL)</code> if it isn't there, insert the rows, make sure they are saved, and return how many rows the table then holds.",
        db:true,
        starter: py`
          import sqlite3


          def load_readings(db_path, rows):
              conn = sqlite3.connect(db_path)
              conn.execute("CREATE TABLE IF NOT EXISTS readings (station TEXT, torque REAL)")
              conn.executemany("INSERT INTO readings VALUES (?, ?)", rows)
              n = conn.execute("SELECT COUNT(*) FROM readings").fetchone()[0]
              conn.close()
              return n


          print(load_readings("shop.db", [("W1", 41.2), ("W2", 39.8), ("W3", 44.1)]), "rows, says the function")
          fresh = sqlite3.connect("shop.db")
          print(fresh.execute("SELECT COUNT(*) FROM readings").fetchone()[0], "rows, says a new connection")
        `,
        ref: py`
          import sqlite3

          def load_readings(db_path, rows):
              conn = sqlite3.connect(db_path)
              conn.execute("CREATE TABLE IF NOT EXISTS readings (station TEXT, torque REAL)")
              conn.executemany("INSERT INTO readings VALUES (?, ?)", rows)
              conn.commit()
              n = conn.execute("SELECT COUNT(*) FROM readings").fetchone()[0]
              conn.close()
              return n

          print(load_readings("shop.db", [("W1", 41.2), ("W2", 39.8), ("W3", 44.1)]), "rows, says the function")
          fresh = sqlite3.connect("shop.db")
          print(fresh.execute("SELECT COUNT(*) FROM readings").fetchone()[0], "rows, says a new connection")
        `,
        tests: py`
          fn("load_readings")
          import sqlite3 as _sq
          _c = _sq.connect("shop.db"); _c.execute("DROP TABLE IF EXISTS readings"); _c.commit(); _c.close()
          eq(load_readings("shop.db", [("W1", 41.2), ("W2", 39.8), ("W3", 44.1)]), 3, "The count returned after loading 3 rows into an empty table")
          _c = _sq.connect("shop.db")
          try:
              _rows = _c.execute("SELECT station, torque FROM readings ORDER BY station").fetchall()
          except _sq.OperationalError:
              raise CheckFail("A new connection can't find the readings table - create it with CREATE TABLE IF NOT EXISTS, and commit.")
          finally:
              _c.close()
          check(len(_rows) > 0, "The function reported 3 rows, but a new connection sees an empty table: the inserts were never committed. Call conn.commit() before closing.")
          eq(_rows, [("W1", 41.2), ("W2", 39.8), ("W3", 44.1)], "The rows a new connection finds in readings")
          eq(load_readings("shop.db", [("W4", 40.0)]), 4, "The count returned after a second call that adds 1 more row")
        `,
        hint:"The starter does everything except save. Add <code>conn.commit()</code> after the <code>executemany</code> line.", xp:40,
        exercises:[
          { id:"46.3.e1", prompt:"Tuples make you remember column positions. Write <code>as_dicts(db_path, sql)</code>: run the query and return its rows as a list of dicts keyed by column name. (Set <code>conn.row_factory = sqlite3.Row</code>, then <code>dict(row)</code>.)",
            tests: py`
              fn("as_dicts")
              _d = as_dicts("shop.db", "SELECT id, dept_name FROM departments WHERE id <= 2 ORDER BY id")
              check(isinstance(_d, list) and all(isinstance(r, dict) for r in _d), "as_dicts() should return a list of plain dicts - convert each row with dict(row).")
              eq([sorted(r.keys()) for r in _d], [["dept_name", "id"], ["dept_name", "id"]], "The keys of each row")
              eq(_d[0], {"id": 1, "dept_name": "Engineering"}, "The first row")
              eq(as_dicts("shop.db", "SELECT 1 AS one WHERE 1 = 0"), [], "as_dicts() for a query with no rows")
            `,
            _ref: py`
              import sqlite3

              def as_dicts(db_path, sql):
                  conn = sqlite3.connect(db_path)
                  conn.row_factory = sqlite3.Row
                  rows = [dict(r) for r in conn.execute(sql)]
                  conn.close()
                  return rows
            `,
            hint:"After connecting: <code>conn.row_factory = sqlite3.Row</code>. Then <code>[dict(r) for r in conn.execute(sql)]</code>.", xp:12 }
        ] },

      { id:"46.4", title:"Transactions — All or Nothing", concept:"atomic batches, rollback",
        theory:`<p>A load that dies halfway is worse than one that never started: half the batch is in the table, and nobody knows which half. A <strong>transaction</strong> (Day 22) makes a batch atomic — every statement takes effect, or none does.</p><p>In Python the tidy way to get that is to use the connection as a context manager:</p>${code(py`
          try:
              with conn:                                   # BEGIN
                  conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", rows)
                                                           # COMMIT if the block finishes
          except sqlite3.IntegrityError:                   # ROLLBACK already happened
              return False
        `)}<p><code>with conn:</code> commits when the block ends normally and <strong>rolls back if anything inside raises</strong> — then lets the exception continue, so you still find out. (It does not close the connection; that's still your job.)</p><p><code>sqlite3.IntegrityError</code> is what a broken constraint raises: a duplicate primary key, a <code>NOT NULL</code> violation, a failed <code>CHECK</code>. Constraints plus transactions are how the database protects itself from a bad file — your code only has to decide what to do when it says no.</p>`,
        chips:[{t:"with conn:",c:"chip-blue"},{t:"rollback",c:"chip-amber"},{t:"IntegrityError",c:"chip-red"}],
        task:"Write <code>add_products(db_path, rows)</code>: insert a batch of <code>(id, name, category, price, stock)</code> rows into <code>products</code> as one transaction. Return <code>True</code> if the whole batch went in. If any row is rejected (say, an id that already exists), <strong>none</strong> of the batch may remain — return <code>False</code>.",
        db:true, tables:["products"],
        starter: py`
          import sqlite3


          def add_products(db_path, rows):
              conn = sqlite3.connect(db_path)
              for row in rows:
                  conn.execute("INSERT INTO products VALUES (?, ?, ?, ?, ?)", row)
                  conn.commit()
              conn.close()
              return True


          batch = [(103, "Torque Wrench", "Hardware", 89.0, 40),
                   (1, "Duplicate of product 1", "Hardware", 1.0, 1)]
          print(add_products("shop.db", batch))
        `,
        ref: py`
          import sqlite3

          def add_products(db_path, rows):
              conn = sqlite3.connect(db_path)
              try:
                  with conn:
                      conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", rows)
                  return True
              except sqlite3.IntegrityError:
                  return False
              finally:
                  conn.close()

          batch = [(103, "Torque Wrench", "Hardware", 89.0, 40),
                   (1, "Duplicate of product 1", "Hardware", 1.0, 1)]
          print(add_products("shop.db", batch))
        `,
        tests: py`
          fn("add_products")
          import sqlite3 as _sq
          def _ids():
              _c = _sq.connect("shop.db")
              try:
                  return [r[0] for r in _c.execute("SELECT id FROM products WHERE id > 100 ORDER BY id")]
              finally:
                  _c.close()
          _c = _sq.connect("shop.db"); _c.execute("DELETE FROM products WHERE id > 100"); _c.commit(); _c.close()
          eq(add_products("shop.db", [(101, "Gauge", "Hardware", 12.5, 10), (102, "Shim", "Hardware", 0.4, 900)]), True, "add_products() for a batch of two new products")
          eq(_ids(), [101, 102], "The new product ids a fresh connection can see after that batch")
          try:
              _res = add_products("shop.db", [(103, "Torque Wrench", "Hardware", 89.0, 40), (1, "Duplicate", "Hardware", 1.0, 1)])
          except _sq.IntegrityError:
              raise CheckFail("A batch containing an id that already exists raised IntegrityError out of add_products() - catch it and return False.")
          eq(_res, False, "add_products() for a batch whose second row reuses id 1")
          check(103 not in _ids(), "Product 103 is in the table even though its batch failed. The batch must be all-or-nothing: put all the inserts in one transaction (with conn:) and commit only once, at the end.")
          eq(_ids(), [101, 102], "The new product ids after the failed batch")
        `,
        hint:"One transaction for the whole batch: <code>try:</code> / <code>with conn:</code> / <code>conn.executemany(\"INSERT INTO products VALUES (?, ?, ?, ?, ?)\", rows)</code> / <code>return True</code>, then <code>except sqlite3.IntegrityError: return False</code>. The starter commits after <em>every</em> row, so the good rows before the bad one stay.", xp:45,
        exercises:[
          { id:"46.4.e1", prompt:"An idempotent load. Write <code>record_total(db_path, day, total)</code>: keep one row per day in <code>daily_totals (day TEXT PRIMARY KEY, total REAL)</code> — insert the day if it's new, overwrite its total if it's already there (an upsert, Day 22). Create the table if needed and commit.",
            tests: py`
              fn("record_total")
              import sqlite3 as _sq
              _c = _sq.connect("shop.db"); _c.execute("DROP TABLE IF EXISTS daily_totals"); _c.commit(); _c.close()
              record_total("shop.db", "2024-03-01", 100.0)
              record_total("shop.db", "2024-03-02", 50.0)
              try:
                  record_total("shop.db", "2024-03-01", 120.0)
              except _sq.IntegrityError:
                  raise CheckFail("Recording the same day twice raised IntegrityError - make the insert an upsert: INSERT ... ON CONFLICT(day) DO UPDATE SET total = excluded.total.")
              _c = _sq.connect("shop.db")
              try:
                  _rows = _c.execute("SELECT day, total FROM daily_totals ORDER BY day").fetchall()
              except _sq.OperationalError:
                  raise CheckFail("A new connection can't find daily_totals - create it with CREATE TABLE IF NOT EXISTS, and commit.")
              finally:
                  _c.close()
              eq(_rows, [("2024-03-01", 120.0), ("2024-03-02", 50.0)], "The rows in daily_totals after recording 03-01 (100), 03-02 (50) and 03-01 again (120)")
            `,
            _ref: py`
              import sqlite3

              def record_total(db_path, day, total):
                  conn = sqlite3.connect(db_path)
                  with conn:
                      conn.execute("CREATE TABLE IF NOT EXISTS daily_totals (day TEXT PRIMARY KEY, total REAL)")
                      conn.execute("INSERT INTO daily_totals (day, total) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET total = excluded.total", (day, total))
                  conn.close()
            `,
            hint:"<code>INSERT INTO daily_totals (day, total) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET total = excluded.total</code> inside <code>with conn:</code>, after a <code>CREATE TABLE IF NOT EXISTS</code>.", xp:18 }
        ] }
    ]
  },

  // ───────────────────────────────────────────────────────────── Day 47 ──
  {
    day: 47, title: "Python Pipelines — Extract, Transform, Load", lessons: [
      { id:"47.1", title:"Generators — Streaming Rows", concept:"yield",
        theory:`<p>A list holds every row in memory at once. Fine for a thousand rows; not for a 40 GB export. A <strong>generator</strong> produces rows <em>one at a time, on demand</em> — the same lazy idea as looping over a file.</p><p>Write a function with <code>yield</code> instead of <code>return</code>. Calling it runs nothing; it hands back a generator, and the body runs a little further each time the consumer asks for the next item:</p>${code(py`
          def numbers_from(rows):
              for row in rows:
                  if row["value"]:                 # filter
                      yield float(row["value"])    # hand over ONE item, pause here

          for x in numbers_from(reader):           # pulls rows through one at a time
              ...
        `)}<p>Generators chain: <code>load(clean(parse(read(path))))</code> pulls a single row through every stage before touching the next, so memory stays flat however large the input. That is the whole design of streaming tools — Spark, Beam and Kafka consumers are this idea made distributed.</p><p>Two things to remember: a generator can be consumed <strong>once</strong>, and <code>list(gen)</code> gives the laziness up by pulling everything in.</p>`,
        chips:[{t:"yield",c:"chip-purple"},{t:"lazy",c:"chip-blue"},{t:"constant memory",c:"chip-green"}],
        task:"Turn <code>good_rows(rows)</code> into a generator. For each incoming row (a dict of text values) whose <code>status</code> is \"OK\", yield <code>{\"station\": …, \"torque\": …}</code> with the torque converted to a float. It must work on a stream that never ends, so it can't build a list first.",
        starter: py`
          def good_rows(rows):
              out = []
              for row in rows:
                  if row["status"] == "OK":
                      out.append({"station": row["station"], "torque": float(row["torque"])})
              return out


          stream = [
              {"station": "W1", "torque": "41.2", "status": "OK"},
              {"station": "W2", "torque": "39.8", "status": "FAULT"},
              {"station": "W3", "torque": "44.1", "status": "OK"},
          ]
          for row in good_rows(stream):
              print(row)
        `,
        ref: py`
          def good_rows(rows):
              for row in rows:
                  if row["status"] == "OK":
                      yield {"station": row["station"], "torque": float(row["torque"])}

          stream = [
              {"station": "W1", "torque": "41.2", "status": "OK"},
              {"station": "W2", "torque": "39.8", "status": "FAULT"},
              {"station": "W3", "torque": "44.1", "status": "OK"},
          ]
          for row in good_rows(stream):
              print(row)
        `,
        tests: py`
          fn("good_rows")
          import inspect as _i, itertools as _it
          _g = good_rows([{"station": "W1", "torque": "41.2", "status": "OK"}, {"station": "W2", "torque": "39.8", "status": "FAULT"}, {"station": "W3", "torque": "44.1", "status": "OK"}])
          check(_i.isgenerator(_g), "good_rows() should be a generator: yield each row as you go instead of collecting them in a list and returning it.")
          eq(list(_g), [{"station": "W1", "torque": 41.2}, {"station": "W3", "torque": 44.1}], "The rows good_rows() yields")
          def _endless():
              _n = 0
              while True:
                  _n += 1
                  yield {"station": "S" + str(_n), "torque": "1.5", "status": "OK" if _n % 2 else "FAULT"}
          eq([r["station"] for r in _it.islice(good_rows(_endless()), 3)], ["S1", "S3", "S5"], "The first three stations from a stream that never ends")
        `,
        hint:"Delete the <code>out</code> list. Inside the <code>if</code>, write <code>yield {\"station\": row[\"station\"], \"torque\": float(row[\"torque\"])}</code> — and no <code>return</code> at the end.", xp:40,
        exercises:[
          { id:"47.1.e1", prompt:"Loads go to the database in batches. Write a generator <code>batched(items, size)</code> that yields lists of up to <code>size</code> items: <code>batched([1, 2, 3, 4, 5], 2)</code> gives <code>[1, 2]</code>, <code>[3, 4]</code>, <code>[5]</code>.",
            tests: py`
              fn("batched")
              import inspect as _i
              check(_i.isgenerator(batched([1], 1)), "batched() should be a generator - yield each batch.")
              eq(list(batched([1, 2, 3, 4, 5], 2)), [[1, 2], [3, 4], [5]], "list(batched([1, 2, 3, 4, 5], 2))")
              eq(list(batched(iter(range(4)), 3)), [[0, 1, 2], [3]], "list(batched(...)) when the input is itself a stream, not a list")
              eq(list(batched([], 3)), [], "list(batched([], 3))")
            `,
            _ref: py`
              def batched(items, size):
                  batch = []
                  for item in items:
                      batch.append(item)
                      if len(batch) == size:
                          yield batch
                          batch = []
                  if batch:
                      yield batch
            `,
            hint:"Collect items into a <code>batch</code> list; when <code>len(batch) == size</code>, <code>yield batch</code> and start a new one. After the loop, yield what's left if it isn't empty. Loop with <code>for item in items</code> rather than slicing — a stream has no length.", xp:18 }
        ] },

      { id:"47.2", title:"Dataclasses — Rows with a Shape", concept:"classes via @dataclass",
        theory:`<p>A dict row accepts any key, so <code>row["torqe"]</code> is a typo you meet at runtime, in production. When a record has a fixed shape, give it a <strong>class</strong>: a type with named fields and the functions that belong with it. <code>@dataclass</code> writes the boilerplate for you.</p>${code(py`
          from dataclasses import dataclass

          @dataclass
          class Part:
              sku: str                # field: type
              cost: float
              stock: int = 0          # with a default

              def value(self):        # a method - self is the instance it's called on
                  return self.cost * self.stock

          p = Part("BRK-204", 4.5, 120)
          p.cost            # 4.5          attribute access, not p["cost"]
          p.value()         # 540.0
          p                 # Part(sku='BRK-204', cost=4.5, stock=120)   readable, for free
          p == Part("BRK-204", 4.5, 120)     # True       compared by value, for free
        `)}<p>The field list is a schema you can read at a glance, your editor can autocomplete, and a misspelled attribute fails loudly. The type hints document intent — Python doesn't enforce them at runtime; libraries such as <em>pydantic</em> do, and you'll see those in most modern pipelines.</p><p>Rule of thumb: dicts at the messy edge where data arrives, dataclasses once it has been validated.</p>`,
        chips:[{t:"@dataclass",c:"chip-purple"},{t:"fields & types",c:"chip-blue"},{t:"methods / self",c:"chip-green"}],
        task:"Turn <code>Reading</code> into a dataclass with the fields <code>station: str</code>, <code>torque: float</code>, <code>ts: str</code> (in that order) and a method <code>in_spec(self, low=38.0, high=44.0)</code> that returns whether the torque is within the limits, limits included.",
        starter: py`
          from dataclasses import dataclass


          class Reading:
              def __init__(self, station, torque):
                  self.station = station
                  self.torque = torque


          r = Reading("W1", 41.0)
          print(r)
        `,
        ref: py`
          from dataclasses import dataclass

          @dataclass
          class Reading:
              station: str
              torque: float
              ts: str

              def in_spec(self, low=38.0, high=44.0):
                  return low <= self.torque <= high

          r = Reading("W1", 41.0, "2024-03-01 06:00")
          print(r, r.in_spec())
        `,
        tests: py`
          import dataclasses as _dc
          check(isinstance(globals().get("Reading"), type), "Define a class named \x60Reading\x60.")
          check(_dc.is_dataclass(Reading), "Put @dataclass on the line above \x60class Reading:\x60 and declare the fields as \x60name: type\x60 lines instead of writing __init__.")
          eq([f.name for f in _dc.fields(Reading)], ["station", "torque", "ts"], "The fields of Reading, in order,")
          _r = Reading("W1", 41.0, "2024-03-01 06:00")
          eq(_r.torque, 41.0, 'Reading("W1", 41.0, "2024-03-01 06:00").torque')
          check(_r == Reading("W1", 41.0, "2024-03-01 06:00"), "Two Readings with the same values should compare equal - @dataclass provides that.")
          check(hasattr(_r, "in_spec"), "Add the method \x60in_spec(self, low=38.0, high=44.0)\x60 inside the class (indented under it).")
          eq(_r.in_spec(), True, "in_spec() for a torque of 41.0")
          eq(Reading("W1", 45.0, "t").in_spec(), False, "in_spec() for a torque of 45.0")
          eq(Reading("W1", 45.0, "t").in_spec(high=46.0), True, "in_spec(high=46.0) for a torque of 45.0")
          eq(Reading("W1", 38.0, "t").in_spec(), True, "in_spec() for a torque of exactly 38.0 (the limits count as in spec)")
        `,
        hint:"<code>@dataclass</code> above the class; replace <code>__init__</code> with three lines — <code>station: str</code>, <code>torque: float</code>, <code>ts: str</code> — and add <code>def in_spec(self, low=38.0, high=44.0): return low <= self.torque <= high</code>.", xp:40,
        exercises:[
          { id:"47.2.e1", prompt:"Raw rows arrive as dicts of text. Add a <code>@classmethod</code> <code>from_row(cls, row)</code> to <code>Reading</code> that builds one from such a dict: station stripped and upper-cased, torque as a float, ts as is.",
            starter: py`
              from dataclasses import dataclass


              @dataclass
              class Reading:
                  station: str
                  torque: float
                  ts: str


              print(Reading.from_row({"station": " w1 ", "torque": "41.2", "ts": "2024-03-01 06:00"}))
            `,
            tests: py`
              check(isinstance(globals().get("Reading"), type) and hasattr(Reading, "from_row"), "Add a \x60from_row\x60 classmethod inside the Reading class.")
              eq(Reading.from_row({"station": " w1 ", "torque": "41.2", "ts": "2024-03-01 06:00"}), Reading("W1", 41.2, "2024-03-01 06:00"), 'Reading.from_row({"station": " w1 ", "torque": "41.2", ...})')
              eq(Reading.from_row({"station": "W9", "torque": "7", "ts": "t"}).torque, 7.0, "The torque from a row whose torque text is '7'")
            `,
            _ref: py`
              from dataclasses import dataclass

              @dataclass
              class Reading:
                  station: str
                  torque: float
                  ts: str

                  @classmethod
                  def from_row(cls, row):
                      return cls(row["station"].strip().upper(), float(row["torque"]), row["ts"])
            `,
            hint:"Inside the class: <code>@classmethod</code>, then <code>def from_row(cls, row):</code> returning <code>cls(row[\"station\"].strip().upper(), float(row[\"torque\"]), row[\"ts\"])</code>. <code>cls</code> is the class itself.", xp:15 }
        ] },

      { id:"47.3", title:"Transform — Pure Functions You Can Test", concept:"clean, dedupe, assert",
        theory:`<p>A pipeline that is one long script can only be tested by running all of it against real systems. Split it into three functions and the middle one becomes trivial to test:</p>${code(py`
          rows = extract("shift_readings.csv")     # touches a file
          clean = transform(rows)                  # touches NOTHING: rows in, rows out
          load("warehouse.db", clean)              # touches a database
        `)}<p><code>transform</code> is a <strong>pure function</strong>: same input, same output, no files, no database, no clock. All the business rules live there, and you can check each one with three lines and no setup:</p>${code(py`
          assert transform([{"station": " w1 ", "torque": "41.2", "ts": "t"}]) == \
                 [{"station": "W1", "torque": 41.2, "ts": "t"}]
          assert transform([{"station": "W1", "torque": "n/a", "ts": "t"}]) == []
        `)}<p><code>assert</code> raises <code>AssertionError</code> when its condition is false. A file of functions named <code>test_…</code> full of asserts is a <em>pytest</em> suite — the testing tool nearly every Python data team uses. Same idea as the dbt tests from Day 27, aimed at the code instead of the table.</p><p>Deduplication belongs here too. Sources re-send rows; the rule is usually <em>"same key → the latest one wins"</em>, and a dict keyed on the business key does it, because assigning to an existing key overwrites it.</p>`,
        chips:[{t:"pure functions",c:"chip-green"},{t:"assert",c:"chip-amber"},{t:"dedupe: last wins",c:"chip-purple"}],
        task:"Write <code>transform(rows)</code> for raw reading dicts (all text). Return cleaned dicts with <code>station</code> stripped and upper-cased, <code>torque</code> as a float and <code>ts</code> stripped. Drop rows whose torque isn't a number. When two rows share the same cleaned (station, ts), keep only the <strong>later</strong> one. Return the result sorted by station, then ts.",
        starter: py`
          def transform(rows):
              clean = []
              for row in rows:
                  clean.append(row)
              return clean


          raw = [
              {"station": " w1 ", "torque": "41.2",  "ts": "2024-03-01 06:00"},
              {"station": "W2",   "torque": "n/a",   "ts": "2024-03-01 06:00"},
              {"station": "W1",   "torque": "41.9",  "ts": "2024-03-01 06:00"},   # re-sent: replaces the first row
              {"station": "w3",   "torque": " 44.1", "ts": "2024-03-01 06:05 "},
              {"station": "W2",   "torque": "",      "ts": "2024-03-01 06:05"},
              {"station": "W2",   "torque": "40.5",  "ts": "2024-03-01 06:10"},
          ]
          for row in transform(raw):
              print(row)
        `,
        ref: py`
          def transform(rows):
              latest = {}
              for row in rows:
                  try:
                      torque = float(row["torque"])
                  except (ValueError, TypeError):
                      continue
                  station = row["station"].strip().upper()
                  ts = row["ts"].strip()
                  latest[(station, ts)] = {"station": station, "torque": torque, "ts": ts}
              return [latest[key] for key in sorted(latest)]

          raw = [
              {"station": " w1 ", "torque": "41.2",  "ts": "2024-03-01 06:00"},
              {"station": "W2",   "torque": "n/a",   "ts": "2024-03-01 06:00"},
              {"station": "W1",   "torque": "41.9",  "ts": "2024-03-01 06:00"},
              {"station": "w3",   "torque": " 44.1", "ts": "2024-03-01 06:05 "},
              {"station": "W2",   "torque": "",      "ts": "2024-03-01 06:05"},
              {"station": "W2",   "torque": "40.5",  "ts": "2024-03-01 06:10"},
          ]
          for row in transform(raw):
              print(row)
        `,
        tests: py`
          fn("transform")
          eq(transform([{"station": " w1 ", "torque": "41.2", "ts": " t1 "}]), [{"station": "W1", "torque": 41.2, "ts": "t1"}], "transform() of one row with padded, lower-case values")
          eq(transform([{"station": "W1", "torque": "n/a", "ts": "t"}, {"station": "W2", "torque": "", "ts": "t"}]), [], "transform() of two rows whose torque is not a number")
          eq(transform([{"station": "W1", "torque": "41.2", "ts": "t"}, {"station": " w1", "torque": "41.9", "ts": "t"}]), [{"station": "W1", "torque": 41.9, "ts": "t"}], "transform() of two rows with the same station and ts (the later one should win)")
          _raw = [{"station": " w1 ", "torque": "41.2", "ts": "2024-03-01 06:00"}, {"station": "W2", "torque": "n/a", "ts": "2024-03-01 06:00"},
                  {"station": "W1", "torque": "41.9", "ts": "2024-03-01 06:00"}, {"station": "w3", "torque": " 44.1", "ts": "2024-03-01 06:05 "},
                  {"station": "W2", "torque": "", "ts": "2024-03-01 06:05"}, {"station": "W2", "torque": "40.5", "ts": "2024-03-01 06:10"}]
          eq(transform(_raw), [{"station": "W1", "torque": 41.9, "ts": "2024-03-01 06:00"}, {"station": "W2", "torque": 40.5, "ts": "2024-03-01 06:10"},
                               {"station": "W3", "torque": 44.1, "ts": "2024-03-01 06:05"}], "transform() of the six sample rows")
          eq(transform([]), [], "transform([])")
        `,
        hint:"Keep a dict <code>latest</code> keyed by <code>(station, ts)</code>. Per row: <code>try: torque = float(row[\"torque\"])</code> / <code>except (ValueError, TypeError): continue</code>; clean station and ts; <code>latest[(station, ts)] = {…}</code> — a later row with the same key overwrites the earlier. Finish with <code>return [latest[k] for k in sorted(latest)]</code>.", xp:50,
        exercises:[
          { id:"47.3.e1", prompt:"A reusable version: write <code>dedupe(rows, key)</code> that keeps the <strong>last</strong> row for each value of <code>row[key]</code>, returned in the order each key value first appeared.",
            tests: py`
              fn("dedupe")
              eq(dedupe([{"id": 1, "v": "a"}, {"id": 2, "v": "b"}, {"id": 1, "v": "c"}], "id"), [{"id": 1, "v": "c"}, {"id": 2, "v": "b"}], 'dedupe(rows, "id") where id 1 appears twice')
              eq(dedupe([{"sku": "X"}, {"sku": "Y"}], "sku"), [{"sku": "X"}, {"sku": "Y"}], "dedupe() of rows that are already unique")
              eq(dedupe([], "id"), [], 'dedupe([], "id")')
            `,
            _ref: py`
              def dedupe(rows, key):
                  latest = {}
                  for row in rows:
                      latest[row[key]] = row
                  return list(latest.values())
            `,
            hint:"A dict remembers the order keys were <em>first</em> inserted, and assigning to an existing key replaces its value without moving it. So: <code>latest[row[key]] = row</code> for every row, then <code>return list(latest.values())</code>.", xp:15 }
        ] },

      { id:"47.4", title:"Capstone — A Pipeline, End to End", concept:"extract → validate → load, idempotent",
        theory:`<p>Everything from the last seven days in one job, the size of a real ticket: <em>"load the shift's torque file into the warehouse."</em> The file is what plant data looks like — padded and lower-case station ids, <code>n/a</code> and blanks, a row with no station, a sensor glitch reading 250, and a correction re-sent for a reading already in the file.</p><p>The job has four properties, and they are the ones a reviewer looks for:</p><ul><li><strong>It validates.</strong> A bad row is counted and set aside; it never reaches the table and never stops the run.</li><li><strong>It is atomic.</strong> The load is one transaction — all of the file's good rows, or none.</li><li><strong>It is idempotent.</strong> Running it twice on the same file leaves the table exactly as running it once. The table's primary key plus an upsert gives you that; a plain <code>INSERT</code> does not.</li><li><strong>It reports.</strong> It returns counts, so whoever runs it — a person or a scheduler such as Airflow — can tell a good run from an empty one.</li></ul>${code(py`
          INSERT INTO torque_readings (station, ts, torque) VALUES (?, ?, ?)
          ON CONFLICT(station, ts) DO UPDATE SET torque = excluded.torque
        `)}<p>Wrap <code>run_pipeline</code> in a scheduled task and this is, structurally, what a production batch job is. Only the sizes change.</p>`,
        chips:[{t:"validate",c:"chip-amber"},{t:"atomic",c:"chip-blue"},{t:"idempotent",c:"chip-green"},{t:"report",c:"chip-purple"}],
        task:"Write <code>run_pipeline(csv_path, db_path)</code>. Read the CSV; clean each row (station stripped and upper-cased, ts stripped, torque as a float). <strong>Reject</strong> rows with an empty station, a torque that isn't a number, or a torque outside 0–100 (0 excluded, 100 allowed). Upsert the good rows into <code>torque_readings (station TEXT, ts TEXT, torque REAL, PRIMARY KEY (station, ts))</code> — creating it if needed, later rows winning — in one committed transaction. Return <code>{\"rejected\": …, \"table_rows\": …}</code>: rows rejected from this file, and rows in the table afterwards.",
        db:true, files:{ "shift_readings.csv": SHIFT_CSV },
        starter: py`
          import csv
          import sqlite3


          def extract(csv_path):
              with open(csv_path, newline="") as f:
                  return list(csv.DictReader(f))


          def clean(row):
              """Return (station, ts, torque) for a good row, or raise ValueError."""
              raise ValueError("not written yet")


          def run_pipeline(csv_path, db_path):
              good, rejected = [], 0
              for row in extract(csv_path):
                  try:
                      good.append(clean(row))
                  except ValueError:
                      rejected += 1

              # TODO: create the table if needed, upsert the good rows in ONE transaction,
              #       then count the rows in the table.
              table_rows = 0
              return {"rejected": rejected, "table_rows": table_rows}


          print(run_pipeline("shift_readings.csv", "shop.db"))
          print(run_pipeline("shift_readings.csv", "shop.db"), "<- second run: should be identical")
        `,
        ref: py`
          import csv
          import sqlite3

          def extract(csv_path):
              with open(csv_path, newline="") as f:
                  return list(csv.DictReader(f))

          def clean(row):
              station = (row.get("station") or "").strip().upper()
              if not station:
                  raise ValueError("station is missing")
              torque = float((row.get("torque") or "").strip())   # ValueError if not a number
              if not 0 < torque <= 100:
                  raise ValueError("torque out of range")
              return (station, (row.get("ts") or "").strip(), torque)

          def run_pipeline(csv_path, db_path):
              good, rejected = [], 0
              for row in extract(csv_path):
                  try:
                      good.append(clean(row))
                  except ValueError:
                      rejected += 1
              conn = sqlite3.connect(db_path)
              try:
                  with conn:
                      conn.execute("CREATE TABLE IF NOT EXISTS torque_readings (station TEXT, ts TEXT, torque REAL, PRIMARY KEY (station, ts))")
                      conn.executemany("INSERT INTO torque_readings (station, ts, torque) VALUES (?, ?, ?) ON CONFLICT(station, ts) DO UPDATE SET torque = excluded.torque", good)
                  table_rows = conn.execute("SELECT COUNT(*) FROM torque_readings").fetchone()[0]
              finally:
                  conn.close()
              return {"rejected": rejected, "table_rows": table_rows}

          print(run_pipeline("shift_readings.csv", "shop.db"))
          print(run_pipeline("shift_readings.csv", "shop.db"), "<- second run: should be identical")
        `,
        tests: py`
          fn("run_pipeline")
          import sqlite3 as _sq
          def _table():
              _c = _sq.connect("shop.db")
              try:
                  return _c.execute("SELECT station, ts, torque FROM torque_readings ORDER BY station, ts").fetchall()
              except _sq.OperationalError:
                  raise CheckFail("A new connection can't find the torque_readings table - create it (CREATE TABLE IF NOT EXISTS ...) and commit.")
              finally:
                  _c.close()
          _c = _sq.connect("shop.db"); _c.execute("DROP TABLE IF EXISTS torque_readings"); _c.commit(); _c.close()
          _res = run_pipeline("shift_readings.csv", "shop.db")
          check(isinstance(_res, dict) and "rejected" in _res and "table_rows" in _res, 'run_pipeline() should return a dict with the keys "rejected" and "table_rows".')
          eq(_res["rejected"], 4, "The rejected count for shift_readings.csv (n/a, a blank torque, a missing station and the 250.0 reading)")
          _rows = _table()
          check(len(_rows) > 0, "run_pipeline() finished but a new connection sees no rows in torque_readings - the load was never committed.")
          check(all(r[0] == r[0].strip().upper() for r in _rows), "Station ids in the table should be stripped and upper-case - yours has " + repr(sorted(set(r[0] for r in _rows))) + ".")
          check(("W1", "2024-03-01 06:00", 41.2) not in _rows, "W1 at 06:00 was sent twice; the later value (41.9) should replace the earlier one (41.2) - use an upsert.")
          eq(_rows, [("W1", "2024-03-01 06:00", 41.9), ("W1", "2024-03-01 06:05", 40.8), ("W2", "2024-03-01 06:10", 40.5), ("W3", "2024-03-01 06:05", 44.1)], "The rows in torque_readings after one run")
          eq(_res["table_rows"], 4, 'The "table_rows" count after one run')
          try:
              _res2 = run_pipeline("shift_readings.csv", "shop.db")
          except _sq.IntegrityError:
              raise CheckFail("Running the pipeline a second time on the same file raised IntegrityError (duplicate keys). Make the insert an upsert so a re-run is harmless.")
          eq(len(_table()), 4, "The number of rows in torque_readings after running the same file a second time (the job must be idempotent)")
          eq(_res2, {"rejected": 4, "table_rows": 4}, "What the second run returns")
          with open("_next.csv", "w") as _f:
              _f.write("station,torque,ts,operator\nW9,10.0,t1,x\nw1,42.5,2024-03-01 06:00,ana\nW5,,t2,x\nW6,100.0,t3,x\nW7,0,t4,x\n")
          eq(run_pipeline("_next.csv", "shop.db"), {"rejected": 2, "table_rows": 6}, "What run_pipeline() returns for a second file (2 new stations, 1 correction, 2 bad rows)")
          eq([r[2] for r in _table() if r[0] == "W1" and r[1] == "2024-03-01 06:00"], [42.5], "The torque for W1 at 06:00 after the second file corrects it")
        `,
        hint:"<strong>clean:</strong> <code>station = row[\"station\"].strip().upper()</code>, raise ValueError if empty; <code>torque = float(row[\"torque\"])</code> (raises ValueError on its own for junk); raise ValueError unless <code>0 < torque <= 100</code>; return <code>(station, row[\"ts\"].strip(), torque)</code>. <strong>load:</strong> connect, then inside <code>with conn:</code> run the <code>CREATE TABLE IF NOT EXISTS</code> and <code>conn.executemany(\"INSERT INTO torque_readings (station, ts, torque) VALUES (?, ?, ?) ON CONFLICT(station, ts) DO UPDATE SET torque = excluded.torque\", good)</code>; then <code>SELECT COUNT(*)</code>.", xp:120,
        exercises:[
          { id:"47.4.e1", prompt:"The report on top. Write <code>station_summary(db_path)</code>: from <code>torque_readings</code>, return a list of <code>(station, readings, avg_torque)</code> — average rounded to 2 decimals — ordered by station. (The starter builds a small table to try it on.)",
            starter: py`
              import sqlite3

              # sample data to try your function on
              _setup = sqlite3.connect("shop.db")
              _setup.execute("CREATE TABLE IF NOT EXISTS torque_readings (station TEXT, ts TEXT, torque REAL, PRIMARY KEY (station, ts))")
              _setup.executemany("INSERT OR REPLACE INTO torque_readings VALUES (?, ?, ?)", [("W1", "t1", 41.0), ("W1", "t2", 42.0), ("W2", "t1", 40.25)])
              _setup.commit()
              _setup.close()
            `,
            tests: py`
              fn("station_summary")
              import sqlite3 as _sq
              _c = _sq.connect("shop.db")
              _c.execute("CREATE TABLE IF NOT EXISTS torque_readings (station TEXT, ts TEXT, torque REAL, PRIMARY KEY (station, ts))")
              _c.execute("DELETE FROM torque_readings")
              _c.executemany("INSERT INTO torque_readings VALUES (?, ?, ?)", [("W2", "t1", 40.25), ("W1", "t1", 41.0), ("W1", "t2", 42.0), ("W3", "t1", 39.333)])
              _c.commit(); _c.close()
              eq([tuple(r) for r in station_summary("shop.db")], [("W1", 2, 41.5), ("W2", 1, 40.25), ("W3", 1, 39.33)], "station_summary() for a table holding W1 (41.0, 42.0), W2 (40.25) and W3 (39.333)")
            `,
            _ref: py`
              import sqlite3

              def station_summary(db_path):
                  conn = sqlite3.connect(db_path)
                  rows = conn.execute("SELECT station, COUNT(*), ROUND(AVG(torque), 2) FROM torque_readings GROUP BY station ORDER BY station").fetchall()
                  conn.close()
                  return rows
            `,
            hint:"One query: <code>SELECT station, COUNT(*), ROUND(AVG(torque), 2) FROM torque_readings GROUP BY station ORDER BY station</code>, then <code>.fetchall()</code>.", xp:20 }
        ] }
    ]
  },

  // ───────────────────────────────────────────────────────────── Day 48 ──
  {
    day: 48, title: "pandas — SQL-Shaped Python", lessons: [
      { id:"48.1", title:"DataFrames — SELECT, WHERE, ORDER BY", concept:"read_csv, selecting, filtering",
        theory:`<p><strong>pandas</strong> is the library data people mean when they say "I did it in Python". Its <code>DataFrame</code> is a table held in memory, and nearly every operation maps onto SQL you already write. (pandas takes a few seconds to load the first time you run a lesson on this day.)</p>${code(py`
          import pandas as pd

          df = pd.read_csv("orders.csv")     # types inferred; blank cells become NaN
          df.head()                          # first 5 rows      df.dtypes -> column types
        `)}${vs([
          ['SELECT id, total FROM orders', 'df[["id", "total"]]'],
          ["WHERE status = 'completed'", 'df[df["status"] == "completed"]'],
          ['WHERE total > 100 AND status = …', 'df[(df["total"] > 100) & (df["status"] == "…")]'],
          ['ORDER BY total DESC', 'df.sort_values("total", ascending=False)'],
          ['LIMIT 5', '.head(5)'],
          ['total IS NULL', 'df["total"].isna()']
        ])}<p>Inside a filter the operators are <code>&amp;</code>, <code>|</code>, <code>~</code> — not <code>and</code> / <code>or</code> / <code>not</code> — and each condition needs its own parentheses. A missing value is <code>NaN</code>, and like <code>NULL</code> it fails every comparison, so <code>total >= 300</code> quietly leaves those rows out.</p><p>Each step returns a new DataFrame, so steps chain. Every row carries an <strong>index</strong> label; after filtering or sorting the old labels come along, and <code>.reset_index(drop=True)</code> renumbers from 0.</p>`,
        chips:[{t:"pd.read_csv",c:"chip-blue"},{t:"df[mask]",c:"chip-purple"},{t:"sort_values",c:"chip-green"}],
        task:"Write <code>big_orders(path, min_total)</code>: read the orders CSV and return a DataFrame with only the columns <code>id</code>, <code>status</code>, <code>total</code>, only the rows whose total is at least <code>min_total</code>, largest total first, with the index reset.",
        pkgs:["pandas"], files:{ "orders.csv": ORDERS_CSV },
        starter: py`
          import pandas as pd


          def big_orders(path, min_total):
              df = pd.read_csv(path)
              return df


          print(big_orders("orders.csv", 300))
        `,
        ref: py`
          import pandas as pd

          def big_orders(path, min_total):
              df = pd.read_csv(path)
              out = df[df["total"] >= min_total][["id", "status", "total"]]
              return out.sort_values("total", ascending=False).reset_index(drop=True)

          print(big_orders("orders.csv", 300))
        `,
        tests: py`
          fn("big_orders")
          eq(table(big_orders("orders.csv", 300), ["id", "status", "total"], 'big_orders("orders.csv", 300)'),
             [{"id": 3, "status": "refunded", "total": 620.5}, {"id": 1, "status": "completed", "total": 398.0}, {"id": 4, "status": "completed", "total": 310.0}], 'The rows of big_orders("orders.csv", 300)')
          eq([r["id"] for r in table(big_orders("orders.csv", 100), ["id", "status", "total"], 'big_orders("orders.csv", 100)')], [3, 1, 4, 7], 'The ids from big_orders("orders.csv", 100)')
          eq(list(big_orders("orders.csv", 300).index), [0, 1, 2], "The index of the result (reset it with .reset_index(drop=True))")
        `,
        hint:"<code>df[df[\"total\"] >= min_total][[\"id\", \"status\", \"total\"]].sort_values(\"total\", ascending=False).reset_index(drop=True)</code> — filter, pick columns, sort, renumber.", xp:40,
        exercises:[
          { id:"48.1.e1", prompt:"Write <code>n_missing(path)</code>: how many orders in the CSV have no <code>total</code>? (One, in <code>orders.csv</code>.)",
            tests: py`
              fn("n_missing")
              eq(int(n_missing("orders.csv")), 1, 'n_missing("orders.csv")')
              with open("_o.csv", "w") as _f:
                  _f.write("id,customer_id,order_date,status,total\n1,1,2024-01-01,completed,\n2,1,2024-01-02,completed,\n3,1,2024-01-03,completed,5.0\n")
              eq(int(n_missing("_o.csv")), 2, "n_missing() on a file where two totals are blank")
            `,
            _ref: py`
              import pandas as pd

              def n_missing(path):
                  return int(pd.read_csv(path)["total"].isna().sum())
            `,
            hint:"<code>pd.read_csv(path)[\"total\"].isna().sum()</code> — <code>isna()</code> gives True/False per row, and summing counts the Trues. Wrap it in <code>int(...)</code>.", xp:12 }
        ] },

      { id:"48.2", title:"groupby — GROUP BY", concept:"groupby & named aggregation",
        theory:`<p><code>groupby</code> is <code>GROUP BY</code>, and <strong>named aggregation</strong> lets you say, for each output column, which input column it comes from and which function to apply — the same information as a <code>SELECT</code> list.</p>${vs([
          ['SELECT status,\n       COUNT(id)  AS orders,\n       SUM(total) AS revenue\nFROM orders\nGROUP BY status', 'df.groupby("status", as_index=False).agg(\n    orders=("id", "count"),\n    revenue=("total", "sum"),\n)'],
          ['HAVING SUM(total) > 100', 'out[out["revenue"] > 100]'],
          ['COUNT(DISTINCT customer_id)', '("customer_id", "nunique")']
        ])}<p><code>as_index=False</code> keeps the grouping column as an ordinary column — without it, it becomes the index, which is the single most common source of pandas confusion for people arriving from SQL.</p><p>The aggregate functions skip <code>NaN</code>, as SQL's skip <code>NULL</code>: <code>"count"</code> counts non-missing values, <code>"size"</code> counts rows. There is no <code>HAVING</code> — the grouped result is just another DataFrame, so you filter it like one.</p>`,
        chips:[{t:"groupby",c:"chip-blue"},{t:".agg(name=(col, fn))",c:"chip-purple"},{t:"as_index=False",c:"chip-amber"}],
        task:"Write <code>revenue_by_status(path)</code>: return a DataFrame with one row per status and the columns <code>status</code>, <code>orders</code> (number of orders) and <code>revenue</code> (sum of total), highest revenue first, index reset.",
        pkgs:["pandas"], files:{ "orders.csv": ORDERS_CSV },
        starter: py`
          import pandas as pd


          def revenue_by_status(path):
              df = pd.read_csv(path)
              return df.groupby("status").sum()


          print(revenue_by_status("orders.csv"))
        `,
        ref: py`
          import pandas as pd

          def revenue_by_status(path):
              df = pd.read_csv(path)
              out = df.groupby("status", as_index=False).agg(orders=("id", "count"), revenue=("total", "sum"))
              return out.sort_values("revenue", ascending=False).reset_index(drop=True)

          print(revenue_by_status("orders.csv"))
        `,
        tests: py`
          fn("revenue_by_status")
          eq(table(revenue_by_status("orders.csv"), ["status", "orders", "revenue"], 'revenue_by_status("orders.csv")'),
             [{"status": "completed", "orders": 6, "revenue": 1001.5}, {"status": "refunded", "orders": 1, "revenue": 620.5}, {"status": "pending", "orders": 1, "revenue": 45.0}], 'The rows of revenue_by_status("orders.csv")')
          with open("_o.csv", "w") as _f:
              _f.write("id,customer_id,order_date,status,total\n1,1,2024-01-01,a,10\n2,1,2024-01-02,b,30\n3,1,2024-01-03,b,5\n")
          eq(table(revenue_by_status("_o.csv"), ["status", "orders", "revenue"], "revenue_by_status() on a different file"),
             [{"status": "b", "orders": 2, "revenue": 35.0}, {"status": "a", "orders": 1, "revenue": 10.0}], "The rows of revenue_by_status() on a different file")
        `,
        hint:"<code>df.groupby(\"status\", as_index=False).agg(orders=(\"id\", \"count\"), revenue=(\"total\", \"sum\"))</code>, then <code>.sort_values(\"revenue\", ascending=False).reset_index(drop=True)</code>.", xp:40,
        exercises:[
          { id:"48.2.e1", prompt:"Write <code>top_customer_id(path)</code>: the <code>customer_id</code> whose orders add up to the highest total (any status).",
            tests: py`
              fn("top_customer_id")
              eq(int(top_customer_id("orders.csv")), 1, 'top_customer_id("orders.csv")')
              with open("_o.csv", "w") as _f:
                  _f.write("id,customer_id,order_date,status,total\n1,5,2024-01-01,a,10\n2,7,2024-01-02,b,30\n3,5,2024-01-03,b,25\n")
              eq(int(top_customer_id("_o.csv")), 5, "top_customer_id() on a different file")
            `,
            _ref: py`
              import pandas as pd

              def top_customer_id(path):
                  df = pd.read_csv(path)
                  return int(df.groupby("customer_id")["total"].sum().idxmax())
            `,
            hint:"<code>df.groupby(\"customer_id\")[\"total\"].sum()</code> is a Series indexed by customer_id; <code>.idxmax()</code> returns the index label of its largest value.", xp:15 }
        ] },

      { id:"48.3", title:"merge — JOIN", concept:"merge, join types, anti-join",
        theory:`<p><code>merge</code> is <code>JOIN</code>. The join type is the <code>how</code> argument, and it has the same four values with the same meaning.</p>${vs([
          ['FROM orders o\nJOIN customers c ON c.id = o.customer_id', 'orders.merge(customers,\n    left_on="customer_id", right_on="id")'],
          ['LEFT JOIN', 'how="left"'],
          ['JOIN … USING (id)', 'a.merge(b, on="id")'],
          ['rows of a with no match in b\n(LEFT JOIN … WHERE b.id IS NULL)', 'a[~a["customer_id"].isin(b["id"])]']
        ])}<p>The default is an <strong>inner</strong> join, so rows without a match vanish silently — the fan-out and row-loss traps from Day 4 are all still here. Two habits catch them: compare <code>len()</code> before and after every merge, and pass <code>validate="many_to_one"</code>, which raises if the right-hand key isn't unique instead of quietly multiplying your rows.</p><p>When both frames have a column with the same name (here, <code>id</code>), pandas keeps both and renames them <code>id_x</code> and <code>id_y</code>. Select the columns you need afterwards.</p>`,
        chips:[{t:".merge()",c:"chip-blue"},{t:"how=",c:"chip-purple"},{t:"~ .isin() anti-join",c:"chip-amber"}],
        task:"Write <code>revenue_by_tier(orders_path, customers_path)</code>: join orders to customers (inner join), keep <strong>completed</strong> orders, and return a DataFrame with the columns <code>tier</code> and <code>revenue</code> (sum of total — an order with no total adds nothing), sorted by tier, index reset.",
        pkgs:["pandas"], files:{ "orders.csv": ORDERS_CSV, "customers.csv": CUSTOMERS_CSV },
        starter: py`
          import pandas as pd


          def revenue_by_tier(orders_path, customers_path):
              orders = pd.read_csv(orders_path)
              customers = pd.read_csv(customers_path)
              return orders


          print(revenue_by_tier("orders.csv", "customers.csv"))
        `,
        ref: py`
          import pandas as pd

          def revenue_by_tier(orders_path, customers_path):
              orders = pd.read_csv(orders_path)
              customers = pd.read_csv(customers_path)
              done = orders[orders["status"] == "completed"]
              joined = done.merge(customers, left_on="customer_id", right_on="id")
              out = joined.groupby("tier", as_index=False).agg(revenue=("total", "sum"))
              return out.sort_values("tier").reset_index(drop=True)

          print(revenue_by_tier("orders.csv", "customers.csv"))
        `,
        tests: py`
          fn("revenue_by_tier")
          eq(table(revenue_by_tier("orders.csv", "customers.csv"), ["tier", "revenue"], 'revenue_by_tier("orders.csv", "customers.csv")'),
             [{"tier": "Enterprise", "revenue": 0.0}, {"tier": "Free", "revenue": 89.0}, {"tier": "Pro", "revenue": 837.5}], 'The rows of revenue_by_tier("orders.csv", "customers.csv")')
          with open("_o.csv", "w") as _f:
              _f.write("id,customer_id,order_date,status,total\n1,1,2024-01-01,completed,10\n2,2,2024-01-02,completed,30\n3,2,2024-01-03,pending,500\n4,3,2024-01-04,completed,7\n")
          with open("_c.csv", "w") as _f:
              _f.write("id,name,tier\n1,A,Gold\n2,B,Silver\n")
          eq(table(revenue_by_tier("_o.csv", "_c.csv"), ["tier", "revenue"], "revenue_by_tier() on different files"),
             [{"tier": "Gold", "revenue": 10.0}, {"tier": "Silver", "revenue": 30.0}], "The rows of revenue_by_tier() on different files")
        `,
        hint:"Filter first: <code>done = orders[orders[\"status\"] == \"completed\"]</code>. Join: <code>done.merge(customers, left_on=\"customer_id\", right_on=\"id\")</code>. Then <code>.groupby(\"tier\", as_index=False).agg(revenue=(\"total\", \"sum\"))</code> and <code>.sort_values(\"tier\").reset_index(drop=True)</code>.", xp:45,
        exercises:[
          { id:"48.3.e1", prompt:"The data-quality check behind every join. Write <code>orphans(orders_path, customers_path)</code>: a sorted list of the ids of orders whose <code>customer_id</code> matches no customer.",
            tests: py`
              fn("orphans")
              eq([int(x) for x in orphans("orders.csv", "customers.csv")], [8], 'orphans("orders.csv", "customers.csv")')
              with open("_o.csv", "w") as _f:
                  _f.write("id,customer_id,order_date,status,total\n9,4,2024-01-01,completed,10\n3,2,2024-01-02,completed,30\n5,7,2024-01-03,pending,500\n")
              with open("_c.csv", "w") as _f:
                  _f.write("id,name,tier\n2,B,Silver\n")
              eq([int(x) for x in orphans("_o.csv", "_c.csv")], [5, 9], "orphans() on different files")
            `,
            _ref: py`
              import pandas as pd

              def orphans(orders_path, customers_path):
                  orders = pd.read_csv(orders_path)
                  customers = pd.read_csv(customers_path)
                  missing = orders[~orders["customer_id"].isin(customers["id"])]
                  return sorted(missing["id"].tolist())
            `,
            hint:"<code>orders[~orders[\"customer_id\"].isin(customers[\"id\"])]</code> keeps the orders with no matching customer; take <code>[\"id\"].tolist()</code> and sort it.", xp:15 }
        ] },

      { id:"48.4", title:"pandas ⇄ SQL — Choosing Where the Work Happens", concept:"read_sql_query, to_sql",
        theory:`<p>pandas reads from and writes to a database directly, which is how the two halves of your toolkit connect:</p>${code(py`
          import sqlite3
          import pandas as pd

          conn = sqlite3.connect("shop.db")
          df = pd.read_sql_query("SELECT * FROM orders WHERE status = ?", conn, params=("completed",))
          df.to_sql("order_summary", conn, if_exists="replace", index=False)    # DataFrame -> table
          conn.close()
        `)}<p><code>if_exists="replace"</code> drops and rebuilds the table, which makes the write idempotent; <code>"append"</code> adds rows, which is not. <code>index=False</code> stops pandas writing its row numbers as a column.</p><p>So which tool for which job? A working rule that will serve you well:</p><ul><li><strong>SQL</strong> when the data is already in the database. Filter, join and aggregate there and pull back only the result — the database is built for it and the data never has to cross the network or fit in memory.</li><li><strong>pandas</strong> when the data isn't in a database yet (files, API responses), or for the last step that SQL makes awkward: reshaping, a quick plot, a statistical test, a file hand-off.</li><li><strong>Plain Python</strong> for everything around them: control flow, validation, retries, calling services.</li></ul><p>The classic mistake is <code>SELECT *</code> on a large table into pandas, then a <code>groupby</code>. Push the <code>GROUP BY</code> down.</p>`,
        chips:[{t:"pd.read_sql_query",c:"chip-blue"},{t:".to_sql()",c:"chip-green"},{t:"push work down to SQL",c:"chip-purple"}],
        task:"Write <code>monthly_revenue(db_path)</code>: return a DataFrame with the columns <code>month</code> (text like \"2023-04\") and <code>revenue</code> — the sum of <code>total</code> for <strong>completed</strong> orders in that month — one row per month, oldest first. Let SQL do the aggregation.",
        pkgs:["pandas"], db:true, tables:["orders"],
        starter: py`
          import sqlite3
          import pandas as pd


          def monthly_revenue(db_path):
              conn = sqlite3.connect(db_path)
              df = pd.read_sql_query("SELECT order_date, status, total FROM orders", conn)
              conn.close()
              return df


          print(monthly_revenue("shop.db").head())
        `,
        ref: py`
          import sqlite3
          import pandas as pd

          def monthly_revenue(db_path):
              conn = sqlite3.connect(db_path)
              df = pd.read_sql_query("""
                  SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue
                  FROM orders
                  WHERE status = 'completed'
                  GROUP BY month
                  ORDER BY month""", conn)
              conn.close()
              return df

          print(monthly_revenue("shop.db").head())
        `,
        tests: py`
          fn("monthly_revenue")
          import sqlite3 as _sq
          _c = _sq.connect("shop.db")
          _exp = [{"month": m, "revenue": round(float(r), 2)} for m, r in _c.execute("SELECT substr(order_date, 1, 7) m, SUM(total) FROM orders WHERE status = 'completed' GROUP BY m ORDER BY m")]
          _c.close()
          _got = table(monthly_revenue("shop.db"), ["month", "revenue"], 'monthly_revenue("shop.db")')
          eq(len(_got), len(_exp), "The number of months in the result")
          eq(_got[0], _exp[0], "The first (oldest) row")
          eq(_got, _exp, 'The rows of monthly_revenue("shop.db")')
        `,
        hint:"One query does it: <code>SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue FROM orders WHERE status = 'completed' GROUP BY month ORDER BY month</code> — pass it to <code>pd.read_sql_query(sql, conn)</code> and return the DataFrame.", xp:45,
        exercises:[
          { id:"48.4.e1", prompt:"Now publish it. Write <code>save_summary(db_path)</code>: write the DataFrame from the given <code>monthly_revenue()</code> to a table named <code>monthly_revenue</code> — replacing it if it exists, without the index column — and return the number of rows written.",
            starter: py`
              import sqlite3
              import pandas as pd


              def monthly_revenue(db_path):
                  conn = sqlite3.connect(db_path)
                  df = pd.read_sql_query(
                      "SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue "
                      "FROM orders WHERE status = 'completed' GROUP BY month ORDER BY month", conn)
                  conn.close()
                  return df


              def save_summary(db_path):
                  df = monthly_revenue(db_path)
                  return 0
            `,
            tests: py`
              fn("save_summary")
              import sqlite3 as _sq
              _c = _sq.connect("shop.db")
              _n = _c.execute("SELECT COUNT(DISTINCT substr(order_date, 1, 7)) FROM orders WHERE status = 'completed'").fetchone()[0]
              _c.execute("DROP TABLE IF EXISTS monthly_revenue"); _c.commit(); _c.close()
              eq(int(save_summary("shop.db")), _n, 'The row count returned by save_summary("shop.db")')
              save_summary("shop.db")
              _c = _sq.connect("shop.db")
              try:
                  _cols = [r[1] for r in _c.execute("PRAGMA table_info(monthly_revenue)")]
                  _rows = _c.execute("SELECT COUNT(*) FROM monthly_revenue").fetchone()[0] if _cols else None
              finally:
                  _c.close()
              check(_cols, "A new connection can't find a table named monthly_revenue - write it with df.to_sql(\"monthly_revenue\", conn, ...).")
              eq(_cols, ["month", "revenue"], "The columns of the monthly_revenue table (pass index=False so the row numbers aren't written)")
              eq(_rows, _n, "The number of rows in the table after calling save_summary() twice (if_exists=\"replace\" keeps it from doubling)")
            `,
            _ref: py`
              import sqlite3
              import pandas as pd

              def monthly_revenue(db_path):
                  conn = sqlite3.connect(db_path)
                  df = pd.read_sql_query(
                      "SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue "
                      "FROM orders WHERE status = 'completed' GROUP BY month ORDER BY month", conn)
                  conn.close()
                  return df

              def save_summary(db_path):
                  df = monthly_revenue(db_path)
                  conn = sqlite3.connect(db_path)
                  df.to_sql("monthly_revenue", conn, if_exists="replace", index=False)
                  conn.commit()
                  conn.close()
                  return len(df)
            `,
            hint:"Open a connection, <code>df.to_sql(\"monthly_revenue\", conn, if_exists=\"replace\", index=False)</code>, commit, close, and <code>return len(df)</code>.", xp:18 }
        ] }
    ]
  });
})();
