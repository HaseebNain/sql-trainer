// SQL Quest — the Python track: Python from scratch (Python Days 1–8).
//
// A second, self-contained course, shown when the track switch in the top bar
// is set to Python. It assumes no SQL and no programming at all — the first
// lesson is print(). (Days 40–48 of the SQL track are the other Python course:
// the same language taught *to someone who already knows SQL*.)
//
// Same lesson format as the rest of the Python lessons — it is documented at
// the top of course-python-basics.js and graded by python.js. Two things are
// specific to this file:
//   track: 'python'   puts the day on the Python track (app.js, "Tracks")
//   num               the day number the learner sees (1–8); `day` stays a
//                     unique key (101–108) so it can't collide with SQL days
// Lesson ids are "p<num>.<n>". Don't write `${` or a backtick inside py``.

(function () {
  const { py, code, add } = PyCourse;

  const days = [
  // ──────────────────────────────────────────────────────── Python Day 1 ──
  {
    day: 101, num: 1, title: "Your First Programs", lessons: [
      { id:"p1.1", title:"Hello, Python", concept:"print()",
        theory:`<p>A program is a list of instructions. Python reads them <strong>top to bottom, one line at a time</strong>, and does exactly what each line says — nothing more.</p><p>The first instruction to learn is <code>print()</code>: it shows whatever you put between the parentheses. Text goes inside quotes so Python knows it is text and not an instruction.</p>${code(py`
          print("Hello!")
          print("Each print starts a new line.")
          # A line starting with # is a comment: a note for people. Python skips it.
        `)}<p>The editor is below. Press <strong>Run code</strong> (or Ctrl+Enter) to run what's in it. The very first run takes a few seconds while Python starts; after that it's instant. You cannot break anything — <strong>Reset</strong> brings the starting code back.</p>`,
        chips:[{t:"print()",c:"chip-blue"},{t:"\"text in quotes\"",c:"chip-green"},{t:"# comments",c:"chip-cyan"}],
        task:"Make the program print exactly two lines: first <code>Hello, Python!</code> and then <code>I am learning to code.</code>",
        starter: py`
          # Change the text, and add a second print on its own line.
          print("Hello")
        `,
        ref: py`
          print("Hello, Python!")
          print("I am learning to code.")
        `,
        out:true,
        hint:"Two lines of code: <code>print(\"Hello, Python!\")</code> and under it <code>print(\"I am learning to code.\")</code>. Spelling, capitals and punctuation all count.", xp:10,
        exercises:[
          { id:"p1.1.e1", prompt:"Print a countdown and a launch on four separate lines: <code>3</code>, then <code>2</code>, then <code>1</code>, then <code>Liftoff!</code>",
            out:true,
            _ref: py`
              print(3)
              print(2)
              print(1)
              print("Liftoff!")
            `,
            hint:"Four <code>print</code> lines. Numbers don't need quotes: <code>print(3)</code>.", xp:8 }
        ] },

      { id:"p1.2", title:"Variables — Naming Things", concept:"variables",
        theory:`<p>A <strong>variable</strong> is a name you give to a value so you can use it later. You create one with <code>=</code>, which means "store the value on the right under the name on the left".</p>${code(py`
          city = "Lisbon"     # text (called a string) goes in quotes
          days = 5            # a number does not
          print(city)         # no quotes: this prints the VALUE of city -> Lisbon
          print("city")       # quotes: this prints the word city
          print(days, "days in", city)   # commas print several things with spaces between
        `)}<p>Names can use letters, digits and underscores, can't start with a digit, and capitals matter (<code>City</code> and <code>city</code> are different). The convention is lowercase words joined by underscores: <code>first_name</code>.</p><p>A variable can be given a new value at any time — the old one is simply replaced.</p>`,
        chips:[{t:"name = value",c:"chip-blue"},{t:"strings",c:"chip-green"},{t:"snake_case",c:"chip-cyan"}],
        task:"Give <code>city</code> the value <code>\"Lisbon\"</code> and <code>days</code> the value <code>5</code>, so the program prints exactly: <code>5 days in Lisbon</code>",
        starter: py`
          city = "somewhere"
          days = 0
          print(days, "days in", city)
        `,
        ref: py`
          city = "Lisbon"
          days = 5
          print(days, "days in", city)
        `,
        out:true, tests: py`
          var("city", "Lisbon")
          var("days", 5)
        `,
        hint:"<code>city = \"Lisbon\"</code> (with quotes) and <code>days = 5</code> (without). Leave the print line as it is.", xp:10,
        exercises:[
          { id:"p1.2.e1", prompt:"Create a variable <code>first</code> holding <code>\"Grace\"</code> and a variable <code>last</code> holding <code>\"Hopper\"</code>, then use them to print exactly: <code>Grace Hopper</code>",
            out:true, tests: py`
              var("first", "Grace")
              var("last", "Hopper")
            `,
            _ref: py`
              first = "Grace"
              last = "Hopper"
              print(first, last)
            `,
            hint:"Two assignments, then <code>print(first, last)</code> — the comma puts one space between them.", xp:8 }
        ] },

      { id:"p1.3", title:"Numbers & Arithmetic", concept:"int, float, operators",
        theory:`<p>Python is a very good calculator. There are two kinds of number: whole numbers (<code>int</code>, like <code>20</code>) and decimals (<code>float</code>, like <code>4.5</code>).</p>${code(py`
          7 + 2      # 9
          7 - 2      # 5
          7 * 2      # 14
          7 / 2      # 3.5   division always gives a decimal
          7 // 2     # 3     whole-number division: how many times 2 fits
          7 % 2      # 1     remainder: what is left over
          2 ** 3     # 8     power
          round(3.14159, 2)   # 3.14
        `)}<p>The result of a calculation can be stored in a variable, and variables can be used in the next calculation: <code>total = price * quantity</code>. Python follows the usual order — multiplication before addition — and parentheses change it.</p><p><code>//</code> and <code>%</code> go together: sharing 20 sweets between 6 children gives <code>20 // 6</code> = 3 each, with <code>20 % 6</code> = 2 left over.</p>`,
        chips:[{t:"+ - * /",c:"chip-blue"},{t:"// and %",c:"chip-amber"},{t:"round()",c:"chip-green"}],
        task:"A pizza order has <code>slices</code> slices for <code>people</code> people and costs <code>cost</code>. Compute <code>each</code> (whole slices per person), <code>left</code> (slices left over) and <code>share</code> (cost per person, rounded to 2 decimals). Calculate from the variables — the check also tries other numbers.",
        starter: py`
          slices = 20
          people = 6
          cost = 27.0

          each = 0
          left = 0
          share = 0

          print(each, left, share)
        `,
        ref: py`
          slices = 20
          people = 6
          cost = 27.0

          each = slices // people
          left = slices % people
          share = round(cost / people, 2)

          print(each, left, share)
        `,
        tests: py`
          var("each", 3)
          var("left", 2)
          var("share", 4.5)
          given({"each": 4, "left": 0, "share": 3.33}, slices=12, people=3, cost=10.0)
        `,
        hint:"<code>each = slices // people</code>, <code>left = slices % people</code>, <code>share = round(cost / people, 2)</code>.", xp:15,
        exercises:[
          { id:"p1.3.e1", prompt:"Convert a temperature. Given <code>celsius = 25</code>, compute <code>fahrenheit</code> — multiply by 9, divide by 5, add 32. (25 °C is 77 °F.)",
            starter: py`
              celsius = 25
            `,
            tests: py`
              var("fahrenheit", 77.0)
              given({"fahrenheit": 32.0}, celsius=0)
              given({"fahrenheit": 212.0}, celsius=100)
            `,
            _ref: py`
              celsius = 25
              fahrenheit = celsius * 9 / 5 + 32
            `,
            hint:"<code>fahrenheit = celsius * 9 / 5 + 32</code> — use the variable, not the number 25.", xp:8 }
        ] },

      { id:"p1.4", title:"Types — Text Is Not a Number", concept:"str, int, float, converting",
        theory:`<p>Every value has a <strong>type</strong>. <code>"12"</code> in quotes is text (<code>str</code>); <code>12</code> is a number (<code>int</code>). They look alike and behave completely differently:</p>${code(py`
          12 + 30        # 42      numbers add
          "12" + "30"    # "1230"  text is glued together
          "12" + 30      # TypeError: Python refuses to guess what you meant
        `)}<p>Anything typed into a form or read from a file arrives as text, so converting is something you do constantly:</p>${code(py`
          int("12")      # 12      text -> whole number
          float("4.5")   # 4.5     text -> decimal
          str(42)        # "42"    number -> text
          type("12")     # <class 'str'>  ask Python what something is
        `)}<p>When something behaves strangely, <code>print(type(x))</code> is often the fastest way to find out why.</p>`,
        chips:[{t:"int()",c:"chip-blue"},{t:"float()",c:"chip-cyan"},{t:"str()",c:"chip-green"},{t:"type()",c:"chip-amber"}],
        task:"<code>a</code> and <code>b</code> arrived as text. Make <code>total</code> their sum as a <em>number</em> (42), and <code>label</code> the <em>text</em> <code>Total: 42</code>.",
        starter: py`
          a = "12"
          b = "30"

          total = a + b
          label = "Total: "

          print(total)
          print(label)
        `,
        ref: py`
          a = "12"
          b = "30"

          total = int(a) + int(b)
          label = "Total: " + str(total)

          print(total)
          print(label)
        `,
        tests: py`
          var("total", 42)
          var("label", "Total: 42")
          given({"total": 3, "label": "Total: 3"}, a="1", b="2")
        `,
        hint:"Convert before adding: <code>total = int(a) + int(b)</code>. To glue a number onto text, turn it back into text: <code>label = \"Total: \" + str(total)</code>.", xp:15,
        exercises:[
          { id:"p1.4.e1", prompt:"A price and a quantity arrived as text. Compute <code>cost</code> — price × quantity as a number, rounded to 2 decimals (59.97 here).",
            starter: py`
              price_text = "19.99"
              qty_text = "3"
            `,
            tests: py`
              var("cost", 59.97)
              given({"cost": 5.0}, price_text="2.5", qty_text="2")
            `,
            _ref: py`
              price_text = "19.99"
              qty_text = "3"
              cost = round(float(price_text) * int(qty_text), 2)
            `,
            hint:"<code>float(price_text)</code> for the decimal, <code>int(qty_text)</code> for the whole number, multiply, then <code>round(…, 2)</code>.", xp:8 }
        ] }
    ]
  },

  // ──────────────────────────────────────────────────────── Python Day 2 ──
  {
    day: 102, num: 2, title: "Working with Text", lessons: [
      { id:"p2.1", title:"f-strings — Building Sentences", concept:"f-strings",
        theory:`<p>Gluing text together with <code>+</code> and <code>str()</code> gets tiring fast. An <strong>f-string</strong> is text with an <code>f</code> in front of the opening quote; anything inside <code>{ }</code> is replaced by its value.</p>${code(py`
          name = "Sam"
          score = 87
          print(f"{name} scored {score} points")     # Sam scored 87 points
          print(f"Double that is {score * 2}")       # calculations work inside { }
        `)}<p>After a colon you can say how a number should look:</p>${code(py`
          price = 3.5
          f"{price:.2f}"     # "3.50"   always 2 decimals
          f"{0.256:.1%}"     # "25.6%"  as a percentage
          f"{1234567:,}"     # "1,234,567"
        `)}<p>Forgetting the <code>f</code> is the classic slip — then the braces are printed as they are.</p>`,
        chips:[{t:"f\"…{x}…\"",c:"chip-blue"},{t:"{x:.2f}",c:"chip-green"},{t:"{x:,}",c:"chip-cyan"}],
        task:"Build <code>line</code> with an f-string so it reads exactly <code>2 x coffee = 7.00</code> — quantity, item, and the total (price × quantity) with 2 decimals.",
        starter: py`
          item = "coffee"
          price = 3.5
          qty = 2

          line = ""
          print(line)
        `,
        ref: py`
          item = "coffee"
          price = 3.5
          qty = 2

          line = f"{qty} x {item} = {price * qty:.2f}"
          print(line)
        `,
        tests: py`
          var("line", "2 x coffee = 7.00")
          given({"line": "3 x tea = 6.75"}, item="tea", price=2.25, qty=3)
        `,
        hint:"<code>line = f\"{qty} x {item} = {price * qty:.2f}\"</code> — the <code>:.2f</code> is what turns 7.0 into 7.00.", xp:15,
        exercises:[
          { id:"p2.1.e1", prompt:"Using an f-string, build <code>bio</code> so it reads exactly: <code>Sam is 30 years old and will be 31 next year.</code>",
            starter: py`
              name = "Sam"
              age = 30
            `,
            tests: py`
              var("bio", "Sam is 30 years old and will be 31 next year.")
              given({"bio": "Li is 9 years old and will be 10 next year."}, name="Li", age=9)
            `,
            _ref: py`
              name = "Sam"
              age = 30
              bio = f"{name} is {age} years old and will be {age + 1} next year."
            `,
            hint:"Put the calculation inside the braces: <code>{age + 1}</code>.", xp:8 }
        ] },

      { id:"p2.2", title:"String Methods — Cleaning Text", concept:"strip, lower, upper, replace, len",
        theory:`<p>Text comes with built-in tools called <strong>methods</strong>. You call one by writing a dot after the text (or the variable holding it):</p>${code(py`
          raw = "  Hello World  "
          raw.strip()        # "Hello World"    spaces at both ends removed
          raw.lower()        # "  hello world  "
          raw.upper()        # "  HELLO WORLD  "
          "ada lovelace".title()        # "Ada Lovelace"   capital on every word
          "2024-03-01".replace("-", "/")   # "2024/03/01"
          len("Hello")       # 5    how many characters (len is a function, not a method)
        `)}<p>A method never changes the original text — it hands back a <strong>new</strong> string. To keep the result, store it: <code>name = name.strip()</code>.</p><p>Methods can be chained, each one working on the result of the one before: <code>raw.strip().lower()</code>.</p>`,
        chips:[{t:".strip()",c:"chip-blue"},{t:".lower() .upper() .title()",c:"chip-green"},{t:".replace()",c:"chip-cyan"},{t:"len()",c:"chip-amber"}],
        task:"Someone typed their name carelessly. From <code>raw</code>, make <code>clean</code> (no outer spaces, a capital on each word: <code>Ada Lovelace</code>), <code>shout</code> (the clean name in capitals) and <code>length</code> (how many characters the clean name has).",
        starter: py`
          raw = "  aDa LOVELACE  "

          clean = raw
          shout = raw
          length = 0

          print(clean, shout, length)
        `,
        ref: py`
          raw = "  aDa LOVELACE  "

          clean = raw.strip().title()
          shout = clean.upper()
          length = len(clean)

          print(clean, shout, length)
        `,
        tests: py`
          var("clean", "Ada Lovelace")
          var("shout", "ADA LOVELACE")
          var("length", 12)
          given({"clean": "Bo", "shout": "BO", "length": 2}, raw=" bo ")
        `,
        hint:"<code>clean = raw.strip().title()</code>, then <code>shout = clean.upper()</code> and <code>length = len(clean)</code>.", xp:15,
        exercises:[
          { id:"p2.2.e1", prompt:"Tidy an email address: from <code>email</code>, make <code>clean</code> with no surrounding spaces and all lowercase (<code>sam.lee@example.com</code>).",
            starter: py`
              email = "  Sam.Lee@Example.COM "
            `,
            tests: py`
              var("clean", "sam.lee@example.com")
              given({"clean": "a@b.c"}, email="A@B.C   ")
            `,
            _ref: py`
              email = "  Sam.Lee@Example.COM "
              clean = email.strip().lower()
            `,
            hint:"Chain two methods: <code>email.strip().lower()</code>.", xp:8 }
        ] },

      { id:"p2.3", title:"Indexing & Slicing — Parts of Text", concept:"[i], [a:b], in",
        theory:`<p>A string is a row of characters, and each has a position called an <strong>index</strong>. Counting starts at <strong>0</strong>, not 1.</p>${code(py`
          word = "python"
          #       012345
          word[0]      # "p"    the first character
          word[1]      # "y"
          word[-1]     # "n"    negative counts from the end
          word[0:3]    # "pyt"  a slice: from 0 up to BUT NOT INCLUDING 3
          word[2:]     # "thon" from 2 to the end
          word[:2]     # "py"   from the start up to 2
        `)}<p>The "up to but not including" rule feels odd at first, but it means <code>word[:3]</code> is always exactly 3 characters.</p><p>To ask whether one piece of text appears inside another, use <code>in</code> — the answer is <code>True</code> or <code>False</code>:</p>${code(py`
          "th" in "python"    # True
          "z" in "python"     # False
        `)}`,
        chips:[{t:"word[0]",c:"chip-blue"},{t:"word[-1]",c:"chip-cyan"},{t:"word[a:b]",c:"chip-green"},{t:"in",c:"chip-amber"}],
        task:"From <code>word</code>, take <code>first</code> (the first character), <code>last</code> (the last character), <code>first_three</code> (the first three characters) and <code>has_th</code> (<code>True</code> if \"th\" appears in the word).",
        starter: py`
          word = "python"

          first = ""
          last = ""
          first_three = ""
          has_th = None

          print(first, last, first_three, has_th)
        `,
        ref: py`
          word = "python"

          first = word[0]
          last = word[-1]
          first_three = word[:3]
          has_th = "th" in word

          print(first, last, first_three, has_th)
        `,
        tests: py`
          var("first", "p")
          var("last", "n")
          var("first_three", "pyt")
          var("has_th", True)
          given({"first": "b", "last": "a", "first_three": "ban", "has_th": False}, word="banana")
        `,
        hint:"<code>word[0]</code>, <code>word[-1]</code>, <code>word[:3]</code>, and <code>has_th = \"th\" in word</code>.", xp:15,
        exercises:[
          { id:"p2.3.e1", prompt:"An invoice code looks like <code>INV-2024-0042</code>. Slice out <code>year</code> as text (<code>\"2024\"</code>) and <code>number</code> as a whole number (<code>42</code>).",
            starter: py`
              code = "INV-2024-0042"
            `,
            tests: py`
              var("year", "2024")
              var("number", 42)
              given({"year": "2019", "number": 7}, code="INV-2019-0007")
            `,
            _ref: py`
              code = "INV-2024-0042"
              year = code[4:8]
              number = int(code[9:])
            `,
            hint:"Count positions from 0: the year is <code>code[4:8]</code>, the rest is <code>code[9:]</code> — and <code>int(\"0042\")</code> is 42.", xp:10 }
        ] }
    ]
  },

  // ──────────────────────────────────────────────────────── Python Day 3 ──
  {
    day: 103, num: 3, title: "Making Decisions", lessons: [
      { id:"p3.1", title:"True, False & Comparisons", concept:"booleans, comparison operators",
        theory:`<p>A comparison is a question Python answers with <code>True</code> or <code>False</code>. Those two values have their own type, <code>bool</code>, and every decision a program makes rests on them.</p>${code(py`
          5 > 3       # True
          5 < 3       # False
          5 >= 5      # True    greater than OR equal
          5 == 5      # True    is equal to
          5 != 5      # False   is NOT equal to
          "cat" == "Cat"     # False   capitals matter
          1 <= 5 <= 10       # True    ranges can be written the natural way
        `)}<p>The trap every beginner falls into once: <code>=</code> <em>stores</em> a value, <code>==</code> <em>compares</em> two values. <code>age = 18</code> sets age; <code>age == 18</code> asks a question.</p><p>The answer can be stored like any other value: <code>is_adult = age >= 18</code>.</p>`,
        chips:[{t:"== !=",c:"chip-blue"},{t:"< <= > >=",c:"chip-green"},{t:"True / False",c:"chip-amber"}],
        task:"Replace each <code>None</code> with a comparison: <code>is_adult</code> (age is 18 or more), <code>is_teen</code> (age is from 13 to 19 inclusive) and <code>long_enough</code> (the password has at least 8 characters).",
        starter: py`
          age = 17
          password = "hunter2"

          is_adult = None
          is_teen = None
          long_enough = None

          print(is_adult, is_teen, long_enough)
        `,
        ref: py`
          age = 17
          password = "hunter2"

          is_adult = age >= 18
          is_teen = 13 <= age <= 19
          long_enough = len(password) >= 8

          print(is_adult, is_teen, long_enough)
        `,
        tests: py`
          var("is_adult", False)
          var("is_teen", True)
          var("long_enough", False)
          given({"is_adult": True, "is_teen": True, "long_enough": True}, age=18, password="12345678")
          given({"is_adult": True, "is_teen": False, "long_enough": True}, age=40, password="correct horse")
          given({"is_adult": False, "is_teen": False}, age=12)
        `,
        hint:"<code>is_adult = age >= 18</code>, <code>is_teen = 13 <= age <= 19</code>, <code>long_enough = len(password) >= 8</code>.", xp:15,
        exercises:[
          { id:"p3.1.e1", prompt:"Given <code>a</code> and <code>b</code>, create <code>same</code> (True when they are equal) and <code>a_bigger</code> (True when a is greater than b).",
            starter: py`
              a = 7
              b = 7
            `,
            tests: py`
              var("same", True)
              var("a_bigger", False)
              given({"same": False, "a_bigger": True}, a=9, b=2)
              given({"same": False, "a_bigger": False}, a=1, b=2)
            `,
            _ref: py`
              a = 7
              b = 7
              same = a == b
              a_bigger = a > b
            `,
            hint:"<code>same = a == b</code> — one <code>=</code> to store, two to compare.", xp:8 }
        ] },

      { id:"p3.2", title:"if / else", concept:"conditionals, indentation",
        theory:`<p><code>if</code> runs a block of code only when a condition is <code>True</code>. <code>else</code> gives the block to run otherwise.</p>${code(py`
          temperature = 31

          if temperature > 28:
              print("It's hot.")          # runs only when the condition is True
              print("Drink some water.")  # still inside the if
          else:
              print("It's fine.")         # runs only when it is False

          print("Done.")                  # not indented: runs either way
        `)}<p>Two things are syntax here, not style:</p><ul><li>the <strong>colon</strong> at the end of the <code>if</code> and <code>else</code> lines;</li><li>the <strong>indentation</strong>. The indented lines <em>are</em> the block. Use 4 spaces (the Tab key does that here), and keep every line of a block lined up.</li></ul><p><code>else</code> is optional — an <code>if</code> on its own simply does nothing when the condition is false.</p>`,
        chips:[{t:"if …:",c:"chip-blue"},{t:"else:",c:"chip-green"},{t:"4-space indent",c:"chip-amber"}],
        task:"Set <code>advice</code> to <code>\"Stay cool\"</code> when <code>temperature</code> is above 28, and to <code>\"Enjoy the day\"</code> otherwise.",
        starter: py`
          temperature = 31

          advice = ""

          print(advice)
        `,
        ref: py`
          temperature = 31

          if temperature > 28:
              advice = "Stay cool"
          else:
              advice = "Enjoy the day"

          print(advice)
        `,
        tests: py`
          var("advice", "Stay cool")
          given({"advice": "Enjoy the day"}, temperature=20)
          given({"advice": "Enjoy the day"}, temperature=28)
          given({"advice": "Stay cool"}, temperature=29)
        `,
        hint:"<code>if temperature > 28:</code> then, indented, <code>advice = \"Stay cool\"</code>; then <code>else:</code> and, indented, the other assignment. Exactly 28 is not \"above 28\".", xp:15,
        exercises:[
          { id:"p3.2.e1", prompt:"Set <code>kind</code> to <code>\"even\"</code> or <code>\"odd\"</code> depending on <code>number</code>. (A number is even when the remainder after dividing by 2 is 0.)",
            starter: py`
              number = 7
            `,
            tests: py`
              var("kind", "odd")
              given({"kind": "even"}, number=10)
              given({"kind": "even"}, number=0)
              given({"kind": "odd"}, number=33)
            `,
            _ref: py`
              number = 7
              if number % 2 == 0:
                  kind = "even"
              else:
                  kind = "odd"
            `,
            hint:"The condition is <code>number % 2 == 0</code>.", xp:8 }
        ] },

      { id:"p3.3", title:"elif — More Than Two Choices", concept:"if / elif / else chains",
        theory:`<p>When there are more than two outcomes, add <code>elif</code> ("else if") branches between <code>if</code> and <code>else</code>.</p>${code(py`
          score = 84

          if score >= 90:
              grade = "A"
          elif score >= 80:
              grade = "B"       # only reached if the first test was False
          elif score >= 70:
              grade = "C"
          else:
              grade = "F"       # nothing above matched
        `)}<p>Python checks the conditions <strong>from the top and stops at the first one that is True</strong>. That is why the second branch doesn't need to say "and below 90" — if the score were 90 or more, Python would never have got that far.</p><p>It also means order matters: put <code>score >= 70</code> first and every score from 70 up would get a C.</p>`,
        chips:[{t:"elif",c:"chip-blue"},{t:"first match wins",c:"chip-amber"},{t:"else = everything else",c:"chip-green"}],
        task:"Set <code>grade</code> from <code>score</code>: 90 and up is <code>\"A\"</code>, 80–89 is <code>\"B\"</code>, 70–79 is <code>\"C\"</code>, anything lower is <code>\"F\"</code>.",
        starter: py`
          score = 84

          grade = ""

          print(grade)
        `,
        ref: py`
          score = 84

          if score >= 90:
              grade = "A"
          elif score >= 80:
              grade = "B"
          elif score >= 70:
              grade = "C"
          else:
              grade = "F"

          print(grade)
        `,
        tests: py`
          var("grade", "B")
          given({"grade": "A"}, score=90)
          given({"grade": "A"}, score=100)
          given({"grade": "B"}, score=80)
          given({"grade": "C"}, score=79)
          given({"grade": "C"}, score=70)
          given({"grade": "F"}, score=69)
          given({"grade": "F"}, score=0)
        `,
        hint:"Start with the highest: <code>if score >= 90:</code>, then <code>elif score >= 80:</code>, <code>elif score >= 70:</code>, and a final <code>else:</code>.", xp:20,
        exercises:[
          { id:"p3.3.e1", prompt:"Set <code>greeting</code> from <code>hour</code> (0–23): before 12 is <code>\"Good morning\"</code>, from 12 up to (not including) 18 is <code>\"Good afternoon\"</code>, otherwise <code>\"Good evening\"</code>.",
            starter: py`
              hour = 14
            `,
            tests: py`
              var("greeting", "Good afternoon")
              given({"greeting": "Good morning"}, hour=9)
              given({"greeting": "Good afternoon"}, hour=12)
              given({"greeting": "Good evening"}, hour=18)
              given({"greeting": "Good evening"}, hour=23)
            `,
            _ref: py`
              hour = 14
              if hour < 12:
                  greeting = "Good morning"
              elif hour < 18:
                  greeting = "Good afternoon"
              else:
                  greeting = "Good evening"
            `,
            hint:"<code>if hour < 12:</code> … <code>elif hour < 18:</code> … <code>else:</code>", xp:8 }
        ] },

      { id:"p3.4", title:"and, or, not", concept:"combining conditions",
        theory:`<p>Conditions combine with three plain-English words:</p>${code(py`
          age = 25
          has_ticket = True

          age >= 18 and has_ticket     # True only if BOTH are True
          age < 12 or age >= 65        # True if AT LEAST ONE is True
          not has_ticket               # flips True to False and back
        `)}<p>A variable that already holds <code>True</code> or <code>False</code> is a condition by itself — write <code>if has_ticket:</code>, not <code>if has_ticket == True:</code>.</p><p>When you mix <code>and</code> with <code>or</code>, use parentheses to say what you mean. <code>and</code> is worked out before <code>or</code>, which is rarely what a reader expects:</p>${code(py`
          (day == "Sat" or day == "Sun") and awake
        `)}`,
        chips:[{t:"and",c:"chip-blue"},{t:"or",c:"chip-green"},{t:"not",c:"chip-amber"}],
        task:"A cinema door. <code>can_enter</code> is True when the person is 18 or older, has a ticket, and is not banned. <code>discount</code> is True for anyone under 12 or 65 and over.",
        starter: py`
          age = 25
          has_ticket = True
          banned = False

          can_enter = None
          discount = None

          print(can_enter, discount)
        `,
        ref: py`
          age = 25
          has_ticket = True
          banned = False

          can_enter = age >= 18 and has_ticket and not banned
          discount = age < 12 or age >= 65

          print(can_enter, discount)
        `,
        tests: py`
          var("can_enter", True)
          var("discount", False)
          given({"can_enter": False, "discount": False}, age=17, has_ticket=True, banned=False)
          given({"can_enter": False}, age=30, has_ticket=False, banned=False)
          given({"can_enter": False}, age=30, has_ticket=True, banned=True)
          given({"can_enter": True, "discount": True}, age=65, has_ticket=True, banned=False)
          given({"discount": True}, age=8, has_ticket=True, banned=False)
        `,
        hint:"<code>can_enter = age >= 18 and has_ticket and not banned</code>; <code>discount = age < 12 or age >= 65</code>.", xp:20,
        exercises:[
          { id:"p3.4.e1", prompt:"Leap years: a year is a leap year if it divides by 4 but not by 100 — unless it also divides by 400. Set <code>is_leap</code> for <code>year</code>. (2024 yes, 1900 no, 2000 yes.)",
            starter: py`
              year = 2024
            `,
            tests: py`
              var("is_leap", True)
              given({"is_leap": False}, year=1900)
              given({"is_leap": True}, year=2000)
              given({"is_leap": False}, year=2023)
            `,
            _ref: py`
              year = 2024
              is_leap = (year % 4 == 0 and year % 100 != 0) or year % 400 == 0
            `,
            hint:"\"Divides by 4\" is <code>year % 4 == 0</code>. Put the first two tests in parentheses joined by <code>and</code>, then <code>or year % 400 == 0</code>.", xp:10 }
        ] }
    ]
  },

  // ──────────────────────────────────────────────────────── Python Day 4 ──
  {
    day: 104, num: 4, title: "Loops — Doing Things Many Times", lessons: [
      { id:"p4.1", title:"for & range", concept:"for loops",
        theory:`<p>A computer's real talent is repeating things without getting bored. A <code>for</code> loop runs its indented block once for each value it is given.</p>${code(py`
          for n in range(5):
              print(n)          # prints 0 1 2 3 4, one per line
        `)}<p><code>range</code> produces the numbers. Like slices, it stops <em>before</em> its end value:</p>${code(py`
          range(5)          # 0, 1, 2, 3, 4
          range(1, 6)       # 1, 2, 3, 4, 5
          range(0, 10, 2)   # 0, 2, 4, 6, 8     the third number is the step
          range(5, 0, -1)   # 5, 4, 3, 2, 1     a negative step counts down
        `)}<p>The name after <code>for</code> (<code>n</code> here) is a variable that holds the current value on each pass. Same rules as <code>if</code>: a colon, then an indented block.</p>`,
        chips:[{t:"for n in range(…):",c:"chip-blue"},{t:"range(start, stop, step)",c:"chip-green"},{t:"stops before stop",c:"chip-amber"}],
        task:"Print the 7 times table from 1 to 5 with a loop — five lines, the first being <code>7 x 1 = 7</code> and the last <code>7 x 5 = 35</code>.",
        starter: py`
          # One line is written out by hand. Replace it with a loop that prints all five.
          print("7 x 1 = 7")
        `,
        ref: py`
          for n in range(1, 6):
              print(f"7 x {n} = {7 * n}")
        `,
        out:true, tests: py`
          uses(r"\bfor\b", "Use a for loop rather than five separate prints.")
        `,
        hint:"<code>for n in range(1, 6):</code> and inside it <code>print(f\"7 x {n} = {7 * n}\")</code>.", xp:15,
        exercises:[
          { id:"p4.1.e1", prompt:"Use a loop to print a countdown from 5 to 1, one number per line, followed by a final line <code>Go!</code>",
            out:true, tests: py`
              uses(r"\bfor\b|\bwhile\b", "Use a loop for the countdown.")
            `,
            _ref: py`
              for n in range(5, 0, -1):
                  print(n)
              print("Go!")
            `,
            hint:"<code>range(5, 0, -1)</code> counts 5, 4, 3, 2, 1. The <code>print(\"Go!\")</code> goes after the loop, not indented.", xp:8 }
        ] },

      { id:"p4.2", title:"Adding Up — the Accumulator", concept:"running totals & counters",
        theory:`<p>The most useful loop pattern there is: start a variable at zero <em>before</em> the loop, and update it <em>inside</em>.</p>${code(py`
          total = 0
          for n in range(1, 5):
              total = total + n     # take the old total, add n, store it back
          print(total)              # 10   (1 + 2 + 3 + 4)
        `)}<p><code>total = total + n</code> is so common it has a short form: <code>total += n</code>. There is also <code>-=</code>, <code>*=</code> and <code>/=</code>.</p><p>Counting works the same way — add 1 only when a condition holds. Here an <code>if</code> sits inside a <code>for</code>, so it is indented twice:</p>${code(py`
          big = 0
          for n in range(1, 11):
              if n > 7:
                  big += 1
          print(big)                # 3   (8, 9, 10)
        `)}`,
        chips:[{t:"total = 0",c:"chip-blue"},{t:"total += n",c:"chip-green"},{t:"if inside for",c:"chip-amber"}],
        task:"Using a loop over the numbers 1 to <code>n</code>, compute <code>total</code> (their sum) and <code>evens</code> (how many of them are even). With <code>n = 10</code> that is 55 and 5.",
        starter: py`
          n = 10

          total = 0
          evens = 0

          print(total, evens)
        `,
        ref: py`
          n = 10

          total = 0
          evens = 0
          for i in range(1, n + 1):
              total += i
              if i % 2 == 0:
                  evens += 1

          print(total, evens)
        `,
        tests: py`
          var("total", 55)
          var("evens", 5)
          given({"total": 28, "evens": 3}, n=7)
          given({"total": 1, "evens": 0}, n=1)
        `,
        hint:"<code>for i in range(1, n + 1):</code> — the <code>+ 1</code> is needed because range stops before its end. Inside: <code>total += i</code>, and <code>if i % 2 == 0: evens += 1</code>.", xp:20,
        exercises:[
          { id:"p4.2.e1", prompt:"Compute <code>product</code>: all the whole numbers from 1 to <code>n</code> multiplied together (for <code>n = 5</code>: 1×2×3×4×5 = 120).",
            starter: py`
              n = 5
            `,
            tests: py`
              var("product", 120)
              given({"product": 1}, n=1)
              given({"product": 720}, n=6)
            `,
            _ref: py`
              n = 5
              product = 1
              for i in range(1, n + 1):
                  product *= i
            `,
            hint:"Start at <code>product = 1</code> (not 0 — anything times 0 is 0), then <code>product *= i</code> in the loop.", xp:10 }
        ] },

      { id:"p4.3", title:"Looping Over Text", concept:"for ch in text",
        theory:`<p><code>for</code> doesn't need <code>range</code>. Give it a string and it hands you the characters one at a time:</p>${code(py`
          for ch in "cat":
              print(ch)        # c, then a, then t
        `)}<p>Combine that with the accumulator pattern and you can count things in text, or build new text piece by piece — <code>+</code> glues strings together, so an accumulator can start as the empty string <code>""</code>:</p>${code(py`
          spaced = ""
          for ch in "cat":
              spaced = spaced + ch + " "
          print(spaced)        # "c a t "
        `)}<p><code>in</code> also checks membership in a string of allowed characters: <code>ch in "aeiou"</code> is True when <code>ch</code> is a vowel.</p>`,
        chips:[{t:"for ch in text",c:"chip-blue"},{t:"ch in \"aeiou\"",c:"chip-green"},{t:"result = \"\"",c:"chip-cyan"}],
        task:"Count the vowels (a, e, i, o, u) in <code>text</code> and store the count in <code>vowels</code>. The text is lowercase. \"programming is fun\" has 5.",
        starter: py`
          text = "programming is fun"

          vowels = 0

          print(vowels)
        `,
        ref: py`
          text = "programming is fun"

          vowels = 0
          for ch in text:
              if ch in "aeiou":
                  vowels += 1

          print(vowels)
        `,
        tests: py`
          var("vowels", 5)
          given({"vowels": 0}, text="sky")
          given({"vowels": 3}, text="banana")
        `,
        hint:"<code>for ch in text:</code>, and inside it <code>if ch in \"aeiou\": vowels += 1</code>.", xp:20,
        exercises:[
          { id:"p4.3.e1", prompt:"Build <code>backwards</code>: the characters of <code>word</code> in reverse order, made with a loop. (\"stressed\" becomes \"desserts\".)",
            starter: py`
              word = "stressed"
            `,
            tests: py`
              var("backwards", "desserts")
              given({"backwards": "cba"}, word="abc")
              given({"backwards": ""}, word="")
            `,
            _ref: py`
              word = "stressed"
              backwards = ""
              for ch in word:
                  backwards = ch + backwards
            `,
            hint:"Start with <code>backwards = \"\"</code> and put each new character at the <em>front</em>: <code>backwards = ch + backwards</code>.", xp:10 }
        ] },

      { id:"p4.4", title:"while — Loop Until Something Changes", concept:"while, break",
        theory:`<p>Use <code>for</code> when you know what to loop over. Use <code>while</code> when you only know <em>when to stop</em>. It repeats its block for as long as its condition stays <code>True</code>:</p>${code(py`
          battery = 100
          hours = 0
          while battery > 20:
              battery -= 15       # something inside MUST change what the condition tests
              hours += 1
          print(hours)            # 6
        `)}<p>If nothing in the block changes the condition, the loop never ends — an <strong>infinite loop</strong>. Here the course stops it for you and says so; you fix the code and run again.</p><p>Two words work inside any loop: <code>break</code> leaves the loop immediately, and <code>continue</code> skips straight to the next pass.</p>${code(py`
          for n in range(1, 100):
              if n * n > 50:
                  break           # stop at the first n whose square is over 50
          print(n)                # 8
        `)}`,
        chips:[{t:"while condition:",c:"chip-blue"},{t:"break",c:"chip-amber"},{t:"continue",c:"chip-cyan"}],
        task:"You save <code>weekly</code> each week, starting from <code>savings = 0</code>. Use a <code>while</code> loop to keep adding until <code>savings</code> reaches at least <code>goal</code>, counting the <code>weeks</code> it takes. (35 a week towards 200 takes 6 weeks and ends at 210.)",
        starter: py`
          weekly = 35
          goal = 200

          savings = 0
          weeks = 0

          print(weeks, savings)
        `,
        ref: py`
          weekly = 35
          goal = 200

          savings = 0
          weeks = 0
          while savings < goal:
              savings += weekly
              weeks += 1

          print(weeks, savings)
        `,
        tests: py`
          var("weeks", 6)
          var("savings", 210)
          given({"weeks": 4, "savings": 200}, weekly=50, goal=200)
          given({"weeks": 0, "savings": 0}, weekly=10, goal=0)
        `,
        hint:"<code>while savings < goal:</code> and inside it <code>savings += weekly</code> and <code>weeks += 1</code>.", xp:20,
        exercises:[
          { id:"p4.4.e1", prompt:"Starting from <code>n</code>, keep halving it with whole-number division (<code>n // 2</code>) until it reaches 1. Store how many halvings that took in <code>steps</code>. (100 → 50 → 25 → 12 → 6 → 3 → 1 is 6 steps.)",
            starter: py`
              n = 100
            `,
            tests: py`
              var("steps", 6)
              given({"steps": 0}, n=1)
              given({"steps": 3}, n=8)
            `,
            _ref: py`
              n = 100
              steps = 0
              while n > 1:
                  n = n // 2
                  steps += 1
            `,
            hint:"<code>steps = 0</code>, then <code>while n > 1:</code> with <code>n = n // 2</code> and <code>steps += 1</code> inside.", xp:10 }
        ] }
    ]
  },

  // ──────────────────────────────────────────────────────── Python Day 5 ──
  {
    day: 105, num: 5, title: "Lists — Many Values in One Place", lessons: [
      { id:"p5.1", title:"Making & Reading Lists", concept:"lists, indexing, len",
        theory:`<p>A <strong>list</strong> holds many values in order, under one name. Square brackets, commas between the items:</p>${code(py`
          fruits = ["apple", "banana", "cherry"]
          fruits[0]        # "apple"    positions start at 0, exactly like strings
          fruits[-1]       # "cherry"   and negatives count from the end
          len(fruits)      # 3
          fruits[1] = "kiwi"     # unlike a string, a list CAN be changed in place
          print(fruits)    # ['apple', 'kiwi', 'cherry']
        `)}<p>Everything you learned about indexing strings works here too, including slices: <code>fruits[:2]</code> is a new list with the first two items.</p><p>Asking for a position that doesn't exist — <code>fruits[10]</code> — stops the program with an <code>IndexError</code>. A list of 3 items has positions 0, 1 and 2.</p>`,
        chips:[{t:"[a, b, c]",c:"chip-blue"},{t:"list[0] / list[-1]",c:"chip-green"},{t:"len()",c:"chip-amber"},{t:"list[i] = x",c:"chip-cyan"}],
        task:"From <code>fruits</code>, store the <code>first</code> item, the <code>last</code> item and the <code>count</code> of items. Then change the <em>second</em> item in the list to <code>\"blueberry\"</code>.",
        starter: py`
          fruits = ["apple", "banana", "cherry", "date"]

          first = ""
          last = ""
          count = 0

          print(first, last, count)
          print(fruits)
        `,
        ref: py`
          fruits = ["apple", "banana", "cherry", "date"]

          first = fruits[0]
          last = fruits[-1]
          count = len(fruits)
          fruits[1] = "blueberry"

          print(first, last, count)
          print(fruits)
        `,
        tests: py`
          var("first", "apple")
          var("last", "date")
          var("count", 4)
          var("fruits", ["apple", "blueberry", "cherry", "date"])
          given({"first": "x", "last": "z", "count": 3, "fruits": ["x", "blueberry", "z"]}, fruits=["x", "y", "z"])
        `,
        hint:"<code>first = fruits[0]</code>, <code>last = fruits[-1]</code>, <code>count = len(fruits)</code>, and <code>fruits[1] = \"blueberry\"</code> — the second item is at position 1.", xp:15,
        exercises:[
          { id:"p5.1.e1", prompt:"From <code>scores</code>, make <code>last_two</code>: a list of just the final two scores (<code>[85, 90]</code> here).",
            starter: py`
              scores = [70, 62, 85, 90]
            `,
            tests: py`
              var("last_two", [85, 90])
              given({"last_two": [2, 3]}, scores=[1, 2, 3])
            `,
            _ref: py`
              scores = [70, 62, 85, 90]
              last_two = scores[-2:]
            `,
            hint:"A slice from two-before-the-end to the end: <code>scores[-2:]</code>.", xp:8 }
        ] },

      { id:"p5.2", title:"Changing Lists", concept:"append, remove, insert, in",
        theory:`<p>Lists grow and shrink. These methods change the list itself (they don't hand back a new one):</p>${code(py`
          cart = ["milk", "eggs"]
          cart.append("bread")       # add to the end   -> ['milk', 'eggs', 'bread']
          cart.insert(0, "tea")      # add at a position -> ['tea', 'milk', 'eggs', 'bread']
          cart.remove("eggs")        # remove by value   -> ['tea', 'milk', 'bread']
          last = cart.pop()          # remove the last item AND hand it back -> "bread"
        `)}<p><code>in</code> asks whether a value is in the list: <code>"milk" in cart</code> is <code>True</code>. It's worth checking before <code>remove</code>, which stops with a <code>ValueError</code> if the value isn't there.</p><p>The pattern you will use more than any other: start with an <strong>empty list</strong> <code>[]</code> and <code>append</code> to it inside a loop.</p>${code(py`
          doubled = []
          for n in range(1, 4):
              doubled.append(n * 2)
          print(doubled)             # [2, 4, 6]
        `)}`,
        chips:[{t:".append()",c:"chip-blue"},{t:".remove()",c:"chip-amber"},{t:"x in list",c:"chip-green"},{t:"[] + loop",c:"chip-cyan"}],
        task:"Update the shopping <code>cart</code>: add <code>\"bread\"</code> to the end, then remove <code>\"eggs\"</code>. Finally set <code>has_milk</code> to whether <code>\"milk\"</code> is in the cart.",
        starter: py`
          cart = ["milk", "eggs"]

          has_milk = None

          print(cart, has_milk)
        `,
        ref: py`
          cart = ["milk", "eggs"]

          cart.append("bread")
          cart.remove("eggs")
          has_milk = "milk" in cart

          print(cart, has_milk)
        `,
        tests: py`
          var("cart", ["milk", "bread"])
          var("has_milk", True)
          given({"cart": ["tea", "bread"], "has_milk": False}, cart=["eggs", "tea"])
        `,
        hint:"<code>cart.append(\"bread\")</code>, <code>cart.remove(\"eggs\")</code>, then <code>has_milk = \"milk\" in cart</code>.", xp:15,
        exercises:[
          { id:"p5.2.e1", prompt:"Start with an empty list called <code>squares</code> and use a loop to fill it with the squares of 1 to 5: <code>[1, 4, 9, 16, 25]</code>.",
            tests: py`
              var("squares", [1, 4, 9, 16, 25])
              uses(r"\bfor\b|\bwhile\b", "Fill the list with a loop rather than typing the numbers in.")
            `,
            _ref: py`
              squares = []
              for n in range(1, 6):
                  squares.append(n * n)
            `,
            hint:"<code>squares = []</code>, then <code>for n in range(1, 6):</code> with <code>squares.append(n * n)</code> inside.", xp:10 }
        ] },

      { id:"p5.3", title:"Looping Over a List", concept:"for item in list, sum / min / max",
        theory:`<p>A <code>for</code> loop over a list gives you each item in turn — no positions needed:</p>${code(py`
          temps = [18, 22, 25]
          for t in temps:
              print(t, "degrees")
        `)}<p>For the everyday questions about a list of numbers, Python has built-in answers:</p>${code(py`
          sum(temps)      # 65
          min(temps)      # 18
          max(temps)      # 25
          len(temps)      # 3
          sum(temps) / len(temps)   # the average: 21.666…
        `)}<p>Anything more specific — "how many are above 20?" — is the counter pattern from Day 4 with the list in place of <code>range</code>.</p>`,
        chips:[{t:"for x in items",c:"chip-blue"},{t:"sum() min() max()",c:"chip-green"},{t:"sum / len = average",c:"chip-amber"}],
        task:"From the list <code>temps</code>, compute <code>average</code> (rounded to 1 decimal), <code>hottest</code> (the highest value) and <code>warm_days</code> (how many values are above 20).",
        starter: py`
          temps = [18, 22, 25, 19, 30, 27]

          average = 0
          hottest = 0
          warm_days = 0

          print(average, hottest, warm_days)
        `,
        ref: py`
          temps = [18, 22, 25, 19, 30, 27]

          average = round(sum(temps) / len(temps), 1)
          hottest = max(temps)
          warm_days = 0
          for t in temps:
              if t > 20:
                  warm_days += 1

          print(average, hottest, warm_days)
        `,
        tests: py`
          var("average", 23.5)
          var("hottest", 30)
          var("warm_days", 4)
          given({"average": 15.5, "hottest": 21, "warm_days": 1}, temps=[10, 21])
          given({"average": 20.0, "hottest": 20, "warm_days": 0}, temps=[20, 20, 20])
        `,
        hint:"<code>average = round(sum(temps) / len(temps), 1)</code>, <code>hottest = max(temps)</code>, and a loop with <code>if t > 20: warm_days += 1</code>.", xp:20,
        exercises:[
          { id:"p5.3.e1", prompt:"Build <code>shouted</code>: a new list with every name from <code>names</code> in capitals (<code>[\"ANA\", \"LI\", \"OMAR\"]</code>).",
            starter: py`
              names = ["ana", "li", "omar"]
            `,
            tests: py`
              var("shouted", ["ANA", "LI", "OMAR"])
              given({"shouted": ["X"]}, names=["x"])
              given({"shouted": []}, names=[])
            `,
            _ref: py`
              names = ["ana", "li", "omar"]
              shouted = []
              for name in names:
                  shouted.append(name.upper())
            `,
            hint:"Empty list, loop, append: <code>shouted.append(name.upper())</code>.", xp:10 }
        ] },

      { id:"p5.4", title:"split, join & sorted", concept:"text ⇄ lists, ordering",
        theory:`<p>Text and lists convert into each other, and you'll do it all the time:</p>${code(py`
          "pear,apple,fig".split(",")     # ['pear', 'apple', 'fig']   text -> list, cut at each comma
          "the quick fox".split()         # ['the', 'quick', 'fox']    no argument: cut at spaces
          " | ".join(["a", "b", "c"])     # "a | b | c"                list -> text, glue goes first
        `)}<p><code>join</code> reads backwards the first time: the <em>glue</em> is the string you call it on, and the list goes in the parentheses.</p><p><code>sorted()</code> gives back a new list in order — alphabetical for text, smallest first for numbers — and leaves the original alone:</p>${code(py`
          sorted([3, 1, 2])                  # [1, 2, 3]
          sorted([3, 1, 2], reverse=True)    # [3, 2, 1]
          sorted(["pear", "apple"])          # ['apple', 'pear']
        `)}`,
        chips:[{t:".split()",c:"chip-blue"},{t:"\"glue\".join(list)",c:"chip-green"},{t:"sorted()",c:"chip-amber"}],
        task:"Turn <code>line</code> into a list called <code>items</code> (cut at the commas), make <code>ordered</code> (the items in alphabetical order), and <code>summary</code> (the ordered items joined with <code>\" | \"</code>): <code>apple | banana | fig | pear</code>.",
        starter: py`
          line = "pear,apple,fig,banana"

          items = []
          ordered = []
          summary = ""

          print(summary)
        `,
        ref: py`
          line = "pear,apple,fig,banana"

          items = line.split(",")
          ordered = sorted(items)
          summary = " | ".join(ordered)

          print(summary)
        `,
        tests: py`
          var("items", ["pear", "apple", "fig", "banana"])
          var("ordered", ["apple", "banana", "fig", "pear"])
          var("summary", "apple | banana | fig | pear")
          given({"items": ["b", "a"], "ordered": ["a", "b"], "summary": "a | b"}, line="b,a")
        `,
        hint:"<code>items = line.split(\",\")</code>, <code>ordered = sorted(items)</code>, <code>summary = \" | \".join(ordered)</code>.", xp:20,
        exercises:[
          { id:"p5.4.e1", prompt:"From <code>sentence</code>, compute <code>word_count</code> (how many words) and <code>last_word</code> (the final word).",
            starter: py`
              sentence = "the quick brown fox"
            `,
            tests: py`
              var("word_count", 4)
              var("last_word", "fox")
              given({"word_count": 1, "last_word": "hello"}, sentence="hello")
            `,
            _ref: py`
              sentence = "the quick brown fox"
              words = sentence.split()
              word_count = len(words)
              last_word = words[-1]
            `,
            hint:"<code>words = sentence.split()</code> gives a list; then <code>len(words)</code> and <code>words[-1]</code>.", xp:8 }
        ] }
    ]
  },

  // ──────────────────────────────────────────────────────── Python Day 6 ──
  {
    day: 106, num: 6, title: "Dictionaries — Looking Things Up", lessons: [
      { id:"p6.1", title:"Dictionaries", concept:"dict: key → value",
        theory:`<p>A list finds things by <em>position</em>. A <strong>dictionary</strong> (<code>dict</code>) finds things by <em>name</em>: each value is stored under a <strong>key</strong>. Curly braces, with <code>key: value</code> pairs:</p>${code(py`
          person = {"name": "Ada", "age": 36}
          person["name"]             # "Ada"     look up by key
          person["age"] = 37         # change a value
          person["city"] = "London"  # a new key simply adds a new pair
          len(person)                # 3
          "age" in person            # True      'in' checks the KEYS
        `)}<p>Looking up a key that isn't there — <code>person["email"]</code> — stops the program with a <code>KeyError</code>. When a key might be missing, <code>person.get("email")</code> gives <code>None</code> instead, and <code>person.get("email", "unknown")</code> gives a fallback of your choice.</p><p>Use a list when you have many of the same kind of thing; use a dict when you have named facts about one thing.</p>`,
        chips:[{t:"{key: value}",c:"chip-blue"},{t:"d[key]",c:"chip-green"},{t:"d[key] = v",c:"chip-cyan"},{t:".get()",c:"chip-amber"}],
        task:"Update <code>person</code>: add the key <code>\"city\"</code> with the value <code>\"London\"</code>, and increase their <code>\"age\"</code> by 1. Also store their name in a variable called <code>name</code>.",
        starter: py`
          person = {"name": "Ada", "age": 36}

          name = ""

          print(name, person)
        `,
        ref: py`
          person = {"name": "Ada", "age": 36}

          person["city"] = "London"
          person["age"] = person["age"] + 1
          name = person["name"]

          print(name, person)
        `,
        tests: py`
          var("name", "Ada")
          var("person", {"name": "Ada", "age": 37, "city": "London"})
          given({"name": "Bo", "person": {"name": "Bo", "age": 2, "city": "London"}}, person={"name": "Bo", "age": 1})
        `,
        hint:"<code>person[\"city\"] = \"London\"</code>, <code>person[\"age\"] += 1</code>, <code>name = person[\"name\"]</code>.", xp:15,
        exercises:[
          { id:"p6.1.e1", prompt:"A café menu. Store the price of tea in <code>tea_price</code>, add <code>\"juice\"</code> at <code>4.0</code> to <code>prices</code>, then store how many items are on the menu in <code>count</code>.",
            starter: py`
              prices = {"coffee": 3.5, "tea": 2.75}
            `,
            tests: py`
              var("tea_price", 2.75)
              var("prices", {"coffee": 3.5, "tea": 2.75, "juice": 4.0})
              var("count", 3)
            `,
            _ref: py`
              prices = {"coffee": 3.5, "tea": 2.75}
              tea_price = prices["tea"]
              prices["juice"] = 4.0
              count = len(prices)
            `,
            hint:"<code>prices[\"tea\"]</code> to read, <code>prices[\"juice\"] = 4.0</code> to add, <code>len(prices)</code> to count — in that order.", xp:8 }
        ] },

      { id:"p6.2", title:"Looping Over a Dictionary", concept:".items(), counting with a dict",
        theory:`<p>Looping over a dict gives you its keys. Usually you want the key <em>and</em> its value, which is what <code>.items()</code> is for — note the two loop variables:</p>${code(py`
          stock = {"apples": 5, "pears": 0}
          for fruit, amount in stock.items():
              print(fruit, amount)

          sum(stock.values())     # 5    .values() is just the values, .keys() just the keys
        `)}<p>Dicts are also how you <strong>count things</strong>. The key is the thing being counted, the value is the count so far. <code>.get(key, 0)</code> means "the count so far, or 0 if this is the first time":</p>${code(py`
          counts = {}
          for ch in "hello":
              counts[ch] = counts.get(ch, 0) + 1
          print(counts)           # {'h': 1, 'e': 1, 'l': 2, 'o': 1}
        `)}`,
        chips:[{t:"for k, v in d.items()",c:"chip-blue"},{t:".values()",c:"chip-green"},{t:"d.get(k, 0) + 1",c:"chip-amber"}],
        task:"From <code>stock</code>, compute <code>total</code> (all the amounts added up) and <code>out_of_stock</code> (a list of the names whose amount is 0).",
        starter: py`
          stock = {"apples": 5, "pears": 0, "kiwis": 12, "plums": 0}

          total = 0
          out_of_stock = []

          print(total, out_of_stock)
        `,
        ref: py`
          stock = {"apples": 5, "pears": 0, "kiwis": 12, "plums": 0}

          total = 0
          out_of_stock = []
          for name, amount in stock.items():
              total += amount
              if amount == 0:
                  out_of_stock.append(name)

          print(total, out_of_stock)
        `,
        tests: py`
          var("total", 17)
          var("out_of_stock", ["pears", "plums"])
          given({"total": 3, "out_of_stock": []}, stock={"a": 1, "b": 2})
          given({"total": 0, "out_of_stock": ["a"]}, stock={"a": 0})
        `,
        hint:"<code>for name, amount in stock.items():</code> then <code>total += amount</code> and <code>if amount == 0: out_of_stock.append(name)</code>.", xp:20,
        exercises:[
          { id:"p6.2.e1", prompt:"Count the letters. Build <code>counts</code>: a dict with each character of <code>letters</code> as a key and how many times it appears as the value.",
            starter: py`
              letters = "mississippi"
            `,
            tests: py`
              var("counts", {"m": 1, "i": 4, "s": 4, "p": 2})
              given({"counts": {"a": 2, "b": 1}}, letters="aab")
              given({"counts": {}}, letters="")
            `,
            _ref: py`
              letters = "mississippi"
              counts = {}
              for ch in letters:
                  counts[ch] = counts.get(ch, 0) + 1
            `,
            hint:"<code>counts = {}</code>, then for each character: <code>counts[ch] = counts.get(ch, 0) + 1</code>.", xp:10 }
        ] },

      { id:"p6.3", title:"Sets & Tuples", concept:"unique values, fixed groups",
        theory:`<p>Two smaller containers round out the set.</p><p>A <strong>set</strong> keeps each value only once and has no order. Its main job is removing duplicates and answering "which values do these share?":</p>${code(py`
          guests = ["ana", "bo", "ana"]
          set(guests)             # {'ana', 'bo'}    duplicates gone
          len(set(guests))        # 2                how many DIFFERENT guests
          sorted(set(guests))     # ['ana', 'bo']    back to an ordered list
          {1, 2, 3} & {2, 3, 4}   # {2, 3}           in both
          {1, 2, 3} | {2, 3, 4}   # {1, 2, 3, 4}     in either
        `)}<p>A <strong>tuple</strong> is a small fixed group of values in parentheses — like a list that can't be changed. Its best trick is <strong>unpacking</strong>: assigning each part to its own name in one line.</p>${code(py`
          point = (3, 9)
          x, y = point            # x is 3, y is 9
        `)}<p>That is exactly what happened in <code>for name, amount in stock.items()</code> — each item is a (key, value) tuple being unpacked.</p>`,
        chips:[{t:"set()",c:"chip-blue"},{t:"& and |",c:"chip-green"},{t:"(a, b)",c:"chip-cyan"},{t:"x, y = pair",c:"chip-amber"}],
        task:"From <code>guests</code>, compute <code>unique_count</code> (how many different names) and <code>names</code> (the different names as a sorted list). Then unpack <code>pair</code> into <code>low</code> and <code>high</code>, and set <code>span</code> to the difference between them.",
        starter: py`
          guests = ["ana", "bo", "ana", "cy", "bo"]
          pair = (3, 9)

          unique_count = 0
          names = []
          span = 0

          print(unique_count, names, span)
        `,
        ref: py`
          guests = ["ana", "bo", "ana", "cy", "bo"]
          pair = (3, 9)

          unique_count = len(set(guests))
          names = sorted(set(guests))
          low, high = pair
          span = high - low

          print(unique_count, names, span)
        `,
        tests: py`
          var("unique_count", 3)
          var("names", ["ana", "bo", "cy"])
          var("low", 3)
          var("high", 9)
          var("span", 6)
          given({"unique_count": 1, "names": ["z"], "low": 10, "high": 25, "span": 15}, guests=["z", "z"], pair=(10, 25))
        `,
        hint:"<code>unique_count = len(set(guests))</code>, <code>names = sorted(set(guests))</code>, <code>low, high = pair</code>, <code>span = high - low</code>.", xp:20,
        exercises:[
          { id:"p6.3.e1", prompt:"Build <code>both</code>: a sorted list of the numbers that appear in <em>both</em> <code>a</code> and <code>b</code> (<code>[3, 4]</code> here).",
            starter: py`
              a = [1, 2, 3, 4, 4]
              b = [4, 3, 5]
            `,
            tests: py`
              var("both", [3, 4])
              given({"both": []}, a=[1], b=[2])
              given({"both": [7]}, a=[7, 7], b=[7])
            `,
            _ref: py`
              a = [1, 2, 3, 4, 4]
              b = [4, 3, 5]
              both = sorted(set(a) & set(b))
            `,
            hint:"Turn each into a set, take what they share with <code>&</code>, and sort the result: <code>sorted(set(a) & set(b))</code>.", xp:10 }
        ] },

      { id:"p6.4", title:"A List of Dictionaries", concept:"records",
        theory:`<p>Put the two big containers together and you get the shape nearly all real data takes: a <strong>list of dictionaries</strong>. Each dict is one record — a person, an order, a row of a spreadsheet — and the list holds all of them.</p>${code(py`
          students = [
              {"name": "Ana", "score": 82},
              {"name": "Bo",  "score": 67},
          ]

          students[0]["name"]          # "Ana"   first record, then its name

          for s in students:           # s is one dict on each pass
              print(s["name"], s["score"])
        `)}<p>Every question you can ask of data is some mix of what you already know: loop over the records, test each with <code>if</code>, and collect into a list, a total or a "best so far".</p>${code(py`
          best = students[0]
          for s in students:
              if s["score"] > best["score"]:
                  best = s                 # remember the whole record
          print(best["name"])
        `)}`,
        chips:[{t:"[{…}, {…}]",c:"chip-blue"},{t:"rows[0][\"key\"]",c:"chip-green"},{t:"best so far",c:"chip-amber"}],
        task:"From <code>students</code>, build <code>passed</code> (a list of the names of everyone who scored 70 or more, in the same order) and <code>best</code> (the name of the highest scorer).",
        starter: py`
          students = [
              {"name": "Ana", "score": 82},
              {"name": "Bo", "score": 67},
              {"name": "Cy", "score": 91},
          ]

          passed = []
          best = ""

          print(passed, best)
        `,
        ref: py`
          students = [
              {"name": "Ana", "score": 82},
              {"name": "Bo", "score": 67},
              {"name": "Cy", "score": 91},
          ]

          passed = []
          top = students[0]
          for s in students:
              if s["score"] >= 70:
                  passed.append(s["name"])
              if s["score"] > top["score"]:
                  top = s
          best = top["name"]

          print(passed, best)
        `,
        tests: py`
          var("passed", ["Ana", "Cy"])
          var("best", "Cy")
          given({"passed": [], "best": "X"}, students=[{"name": "X", "score": 10}])
          given({"passed": ["P", "Q"], "best": "P"}, students=[{"name": "P", "score": 99}, {"name": "Q", "score": 70}, {"name": "R", "score": 69}])
        `,
        hint:"Loop with <code>for s in students:</code>. Append <code>s[\"name\"]</code> when <code>s[\"score\"] >= 70</code>. For the best, keep a \"top so far\" record and replace it whenever you meet a higher score.", xp:25,
        exercises:[
          { id:"p6.4.e1", prompt:"Compute <code>total</code>: for every order, quantity × price, all added together and rounded to 2 decimals (13.5 here).",
            starter: py`
              orders = [
                  {"item": "coffee", "qty": 2, "price": 3.5},
                  {"item": "cake", "qty": 1, "price": 4.0},
                  {"item": "tea", "qty": 1, "price": 2.5},
              ]
            `,
            tests: py`
              var("total", 13.5)
              given({"total": 0}, orders=[])
              given({"total": 6.0}, orders=[{"item": "x", "qty": 3, "price": 2.0}])
            `,
            _ref: py`
              orders = [
                  {"item": "coffee", "qty": 2, "price": 3.5},
                  {"item": "cake", "qty": 1, "price": 4.0},
                  {"item": "tea", "qty": 1, "price": 2.5},
              ]
              total = 0
              for o in orders:
                  total += o["qty"] * o["price"]
              total = round(total, 2)
            `,
            hint:"Accumulator: <code>total = 0</code>, then <code>total += o[\"qty\"] * o[\"price\"]</code> for each order.", xp:10 }
        ] }
    ]
  },

  // ──────────────────────────────────────────────────────── Python Day 7 ──
  {
    day: 107, num: 7, title: "Functions — Your Own Building Blocks", lessons: [
      { id:"p7.1", title:"def & return", concept:"defining functions",
        theory:`<p>You've been <em>using</em> functions since the first lesson — <code>print()</code>, <code>len()</code>, <code>round()</code>. Now you write your own. A function is a named block of code that takes some inputs and hands back a result.</p>${code(py`
          def area(width, height):        # def, a name, the inputs (parameters), a colon
              result = width * height     # the indented block is the function's body
              return result               # return hands the answer back

          print(area(3, 4))               # 12   calling it: the body runs with width=3, height=4
          room = area(5, 2.5)             # the returned value can be stored like any other
        `)}<p>Defining a function doesn't run it — the body only runs when the function is <strong>called</strong>. The reward is that you write the logic once, give it a good name, and use it as often as you like with different inputs.</p><p>From here on, the checks call your functions with inputs of their own, so make the function use its parameters rather than fixed numbers.</p>`,
        chips:[{t:"def name(params):",c:"chip-blue"},{t:"return",c:"chip-green"},{t:"calling: name(args)",c:"chip-cyan"}],
        task:"Finish two functions: <code>area(width, height)</code> returns the width times the height, and <code>greet(name)</code> returns the text <code>Hello, &lt;name&gt;!</code> — for example <code>Hello, Ada!</code>",
        starter: py`
          def area(width, height):
              return 0


          def greet(name):
              return ""


          print(area(3, 4))
          print(greet("Ada"))
        `,
        ref: py`
          def area(width, height):
              return width * height


          def greet(name):
              return f"Hello, {name}!"


          print(area(3, 4))
          print(greet("Ada"))
        `,
        tests: py`
          fn("area"); fn("greet")
          eq(area(3, 4), 12, "area(3, 4)")
          eq(area(10, 0.5), 5.0, "area(10, 0.5)")
          eq(greet("Ada"), "Hello, Ada!", 'greet("Ada")')
          eq(greet("Bo"), "Hello, Bo!", 'greet("Bo")')
        `,
        hint:"<code>return width * height</code> and <code>return f\"Hello, {name}!\"</code>.", xp:20,
        exercises:[
          { id:"p7.1.e1", prompt:"Write <code>is_even(n)</code> that returns <code>True</code> when <code>n</code> is even and <code>False</code> when it is odd.",
            tests: py`
              fn("is_even")
              eq(is_even(4), True, "is_even(4)")
              eq(is_even(7), False, "is_even(7)")
              eq(is_even(0), True, "is_even(0)")
            `,
            _ref: py`
              def is_even(n):
                  return n % 2 == 0
            `,
            hint:"A comparison already <em>is</em> True or False, so the body can be one line: <code>return n % 2 == 0</code>.", xp:10 }
        ] },

      { id:"p7.2", title:"return Is Not print", concept:"return vs print, None",
        theory:`<p>The most common confusion with functions: <code>print</code> <em>shows</em> a value on the screen; <code>return</code> <em>hands it back</em> to the code that called the function. They are not interchangeable.</p>${code(py`
          def double_print(n):
              print(n * 2)          # shows 10, hands back nothing

          def double(n):
              return n * 2          # shows nothing, hands back 10

          a = double(5)             # a is 10
          b = double_print(5)       # prints 10 ... but b is None
        `)}<p>A function with no <code>return</code> hands back <code>None</code> — Python's value for "nothing here". Try to do arithmetic with it and you get <code>TypeError: unsupported operand type(s) … 'NoneType'</code>. When you see <code>NoneType</code> in an error, look for a function that forgot to return.</p><p>Rule of thumb: functions <strong>return</strong>; the code that calls them decides whether to print. And <code>return</code> ends the function on the spot — nothing after it in the body runs.</p>`,
        chips:[{t:"return hands back",c:"chip-green"},{t:"print only shows",c:"chip-blue"},{t:"None",c:"chip-amber"}],
        task:"Run the starter first and read the error. Then fix <code>add_tax(price)</code> so it <em>returns</em> the price plus 20%, rounded to 2 decimals — and <code>total</code> works out to 18.0.",
        starter: py`
          def add_tax(price):
              print(price * 1.2)


          total = add_tax(10) + add_tax(5)
          print(total)
        `,
        ref: py`
          def add_tax(price):
              return round(price * 1.2, 2)


          total = add_tax(10) + add_tax(5)
          print(total)
        `,
        tests: py`
          fn("add_tax")
          eq(add_tax(10), 12.0, "add_tax(10)")
          eq(add_tax(0), 0.0, "add_tax(0)")
          eq(add_tax(19.99), 23.99, "add_tax(19.99)")
          var("total", 18.0)
        `,
        hint:"Replace the print with <code>return round(price * 1.2, 2)</code>.", xp:20,
        exercises:[
          { id:"p7.2.e1", prompt:"Write <code>biggest(a, b)</code> that returns whichever of the two numbers is larger (either one if they are equal).",
            tests: py`
              fn("biggest")
              eq(biggest(3, 9), 9, "biggest(3, 9)")
              eq(biggest(9, 3), 9, "biggest(9, 3)")
              eq(biggest(-5, -2), -2, "biggest(-5, -2)")
              eq(biggest(4, 4), 4, "biggest(4, 4)")
            `,
            _ref: py`
              def biggest(a, b):
                  if a > b:
                      return a
                  return b
            `,
            hint:"<code>if a > b: return a</code>, and after the if, <code>return b</code>. No <code>else</code> needed — return already left the function.", xp:10 }
        ] },

      { id:"p7.3", title:"Default & Keyword Arguments", concept:"parameters with defaults",
        theory:`<p>A parameter can have a <strong>default value</strong>, used when the caller doesn't supply one. That lets a function be simple to call in the usual case and adjustable when needed:</p>${code(py`
          def greet(name, greeting="Hello"):
              return f"{greeting}, {name}!"

          greet("Ada")                    # "Hello, Ada!"     default used
          greet("Ada", "Welcome")         # "Welcome, Ada!"   by position
          greet("Ada", greeting="Hi")     # "Hi, Ada!"        by name (a keyword argument)
        `)}<p>Naming the argument at the call makes code read better — <code>round_to(3.14159, places=2)</code> explains itself. You have already used this: <code>sorted(xs, reverse=True)</code>.</p><p>Parameters with defaults must come after the ones without.</p>`,
        chips:[{t:"def f(x, y=10)",c:"chip-blue"},{t:"f(1)",c:"chip-green"},{t:"f(1, y=5)",c:"chip-cyan"}],
        task:"Write <code>price_with_tip(amount, tip_pct=15)</code>: it returns the amount plus the tip percentage, rounded to 2 decimals. With no second argument the tip is 15%.",
        starter: py`
          def price_with_tip(amount):
              return amount


          print(price_with_tip(100))
        `,
        ref: py`
          def price_with_tip(amount, tip_pct=15):
              return round(amount * (1 + tip_pct / 100), 2)


          print(price_with_tip(100))
        `,
        tests: py`
          fn("price_with_tip")
          eq(price_with_tip(100), 115.0, "price_with_tip(100)")
          eq(price_with_tip(100, 20), 120.0, "price_with_tip(100, 20)")
          eq(price_with_tip(50, tip_pct=0), 50.0, "price_with_tip(50, tip_pct=0)")
          eq(price_with_tip(80), 92.0, "price_with_tip(80)")
        `,
        hint:"<code>def price_with_tip(amount, tip_pct=15):</code> and <code>return round(amount * (1 + tip_pct / 100), 2)</code>.", xp:20,
        exercises:[
          { id:"p7.3.e1", prompt:"Write <code>repeat(text, times=2)</code> that returns the text repeated that many times: <code>repeat(\"ha\")</code> is <code>\"haha\"</code>, <code>repeat(\"ab\", 3)</code> is <code>\"ababab\"</code>.",
            tests: py`
              fn("repeat")
              eq(repeat("ha"), "haha", 'repeat("ha")')
              eq(repeat("ab", 3), "ababab", 'repeat("ab", 3)')
              eq(repeat("x", times=0), "", 'repeat("x", times=0)')
            `,
            _ref: py`
              def repeat(text, times=2):
                  return text * times
            `,
            hint:"Text can be multiplied by a whole number: <code>\"ha\" * 2</code> is <code>\"haha\"</code>.", xp:10 }
        ] },

      { id:"p7.4", title:"Functions That Work on Lists", concept:"putting it together",
        theory:`<p>Everything from the earlier days fits inside a function. Give it a list, loop, decide, and return an answer:</p>${code(py`
          def count_long(words, min_length=5):
              count = 0
              for w in words:
                  if len(w) >= min_length:
                      count += 1
              return count              # after the loop - NOT inside it

          count_long(["tea", "coffee", "water"])     # 2
        `)}<p>Two things to get right:</p><ul><li><strong>Where the <code>return</code> sits.</strong> Indent it inside the loop and the function ends on the very first pass.</li><li><strong>The awkward inputs.</strong> What should happen with an empty list? Averaging nothing means dividing by zero, which stops the program — so check for it first and return something sensible.</li></ul><p>Variables created inside a function (<code>count</code> above) exist only while it runs. That's a feature: functions can't trip over each other's names.</p>`,
        chips:[{t:"loop inside def",c:"chip-blue"},{t:"return after the loop",c:"chip-amber"},{t:"empty input",c:"chip-green"}],
        task:"Write <code>average(numbers)</code>, returning the mean of a list of numbers — or <code>0</code> for an empty list — and <code>count_over(numbers, limit)</code>, returning how many of the numbers are greater than <code>limit</code>.",
        starter: py`
          def average(numbers):
              return 0


          def count_over(numbers, limit):
              return 0


          marks = [70, 85, 90, 55]
          print(average(marks), count_over(marks, 60))
        `,
        ref: py`
          def average(numbers):
              if len(numbers) == 0:
                  return 0
              return sum(numbers) / len(numbers)


          def count_over(numbers, limit):
              count = 0
              for n in numbers:
                  if n > limit:
                      count += 1
              return count


          marks = [70, 85, 90, 55]
          print(average(marks), count_over(marks, 60))
        `,
        tests: py`
          fn("average"); fn("count_over")
          eq(average([70, 85, 90, 55]), 75.0, "average([70, 85, 90, 55])")
          eq(average([1, 2]), 1.5, "average([1, 2])")
          try:
              _empty = average([])
          except ZeroDivisionError:
              check(False, "average([]) divides by zero - check for an empty list first and return 0.")
          eq(_empty, 0, "average([])")
          eq(count_over([70, 85, 90, 55], 60), 3, "count_over([70, 85, 90, 55], 60)")
          eq(count_over([1, 2, 3], 3), 0, "count_over([1, 2, 3], 3)")
          eq(count_over([], 0), 0, "count_over([], 0)")
        `,
        hint:"In <code>average</code>: <code>if len(numbers) == 0: return 0</code>, then <code>return sum(numbers) / len(numbers)</code>. In <code>count_over</code>: a counter, a loop with <code>if n > limit</code>, and the <code>return</code> after the loop.", xp:25,
        exercises:[
          { id:"p7.4.e1", prompt:"Write <code>initials(full_name)</code>: the first letter of each word, in capitals. <code>initials(\"ada lovelace\")</code> is <code>\"AL\"</code>; <code>initials(\"grace brewster hopper\")</code> is <code>\"GBH\"</code>.",
            tests: py`
              fn("initials")
              eq(initials("ada lovelace"), "AL", 'initials("ada lovelace")')
              eq(initials("grace brewster hopper"), "GBH", 'initials("grace brewster hopper")')
              eq(initials("Cher"), "C", 'initials("Cher")')
            `,
            _ref: py`
              def initials(full_name):
                  result = ""
                  for word in full_name.split():
                      result += word[0].upper()
                  return result
            `,
            hint:"<code>full_name.split()</code> gives the words; add <code>word[0].upper()</code> to a result string for each.", xp:10 }
        ] }
    ]
  },

  // ──────────────────────────────────────────────────────── Python Day 8 ──
  {
    day: 108, num: 8, title: "Errors, Files & a Final Project", lessons: [
      { id:"p8.1", title:"Errors Are Information", concept:"reading errors, try / except",
        theory:`<p>By now you've seen plenty of red. An error is Python telling you <strong>what</strong> went wrong and <strong>on which line</strong> — read the last line first. The ones you'll meet most:</p><ul><li><code>NameError</code> — a name Python doesn't know: usually a typo, or used before it was created.</li><li><code>TypeError</code> — the wrong kind of value: <code>"5" + 5</code>, or arithmetic on <code>None</code>.</li><li><code>ValueError</code> — right kind, impossible value: <code>int("abc")</code>.</li><li><code>IndexError</code> / <code>KeyError</code> — a list position or dict key that isn't there.</li><li><code>ZeroDivisionError</code> — dividing by zero.</li></ul><p>Some errors can't be prevented, only expected — a person types "abc" where a number belongs. <code>try</code> / <code>except</code> lets the program carry on:</p>${code(py`
          try:
              number = int(text)        # the risky line
          except ValueError:
              number = 0                # runs ONLY if that error happened
        `)}<p>Always name the error you expect. A bare <code>except:</code> hides every mistake, including your own typos.</p>`,
        chips:[{t:"read the last line",c:"chip-amber"},{t:"try:",c:"chip-blue"},{t:"except ValueError:",c:"chip-green"}],
        task:"Write <code>to_number(text)</code>: return the text converted to a whole number, or <code>None</code> if it isn't one. <code>to_number(\"42\")</code> is 42; <code>to_number(\"abc\")</code> is None.",
        starter: py`
          def to_number(text):
              return int(text)


          print(to_number("42"))
          print(to_number("abc"))
        `,
        ref: py`
          def to_number(text):
              try:
                  return int(text)
              except ValueError:
                  return None


          print(to_number("42"))
          print(to_number("abc"))
        `,
        tests: py`
          fn("to_number")
          eq(to_number("42"), 42, 'to_number("42")')
          eq(to_number(" 7 "), 7, 'to_number(" 7 ")')
          eq(to_number("-3"), -3, 'to_number("-3")')
          for _bad in ["abc", "", "4.5.6", "twelve"]:
              try:
                  _got = to_number(_bad)
              except ValueError:
                  check(False, "to_number(" + repr(_bad) + ") raised ValueError - catch it and return None.")
              eq(_got, None, "to_number(" + repr(_bad) + ")")
        `,
        hint:"<code>try:</code> with <code>return int(text)</code> inside, then <code>except ValueError:</code> with <code>return None</code>.", xp:20,
        exercises:[
          { id:"p8.1.e1", prompt:"Write <code>safe_divide(a, b)</code>: return <code>a / b</code>, or <code>0</code> when <code>b</code> is zero.",
            tests: py`
              fn("safe_divide")
              eq(safe_divide(10, 4), 2.5, "safe_divide(10, 4)")
              try:
                  _z = safe_divide(5, 0)
              except ZeroDivisionError:
                  check(False, "safe_divide(5, 0) raised ZeroDivisionError - it should return 0.")
              eq(_z, 0, "safe_divide(5, 0)")
            `,
            _ref: py`
              def safe_divide(a, b):
                  try:
                      return a / b
                  except ZeroDivisionError:
                      return 0
            `,
            hint:"Either <code>try</code> / <code>except ZeroDivisionError</code>, or simply <code>if b == 0: return 0</code> before dividing. Both are fine.", xp:10 }
        ] },

      { id:"p8.2", title:"import — Borrowing Tools", concept:"modules & the standard library",
        theory:`<p>Python ships with a large <strong>standard library</strong>: ready-made tools organised into <strong>modules</strong>. You bring one in with <code>import</code>, at the top of your code, and reach its contents with a dot.</p>${code(py`
          import math

          math.sqrt(16)       # 4.0
          math.pi             # 3.141592653589793
          math.ceil(2.1)      # 3    round UP to a whole number
          math.floor(2.9)     # 2    round DOWN
        `)}<p>You can also import just the names you want and use them directly:</p>${code(py`
          from statistics import mean, median

          mean([1, 2, 6])     # 3
          median([1, 2, 6])   # 2
        `)}<p>Others you'll reach for soon: <code>random</code> (dice and shuffles), <code>datetime</code> (dates and times), <code>csv</code> and <code>json</code> (data files). You don't memorise them — you learn that they exist and look up the details when you need them.</p>`,
        chips:[{t:"import math",c:"chip-blue"},{t:"math.ceil()",c:"chip-green"},{t:"from x import y",c:"chip-cyan"}],
        task:"Using the <code>math</code> module, write <code>circle_area(radius)</code> — π × radius², rounded to 2 decimals — and <code>boxes_needed(items, per_box)</code> — how many boxes it takes to hold all the items (10 items, 4 per box → 3 boxes).",
        starter: py`
          def circle_area(radius):
              return 0


          def boxes_needed(items, per_box):
              return 0


          print(circle_area(1), boxes_needed(10, 4))
        `,
        ref: py`
          import math


          def circle_area(radius):
              return round(math.pi * radius ** 2, 2)


          def boxes_needed(items, per_box):
              return math.ceil(items / per_box)


          print(circle_area(1), boxes_needed(10, 4))
        `,
        tests: py`
          fn("circle_area"); fn("boxes_needed")
          eq(circle_area(1), 3.14, "circle_area(1)")
          eq(circle_area(2), 12.57, "circle_area(2)")
          eq(circle_area(0), 0.0, "circle_area(0)")
          eq(boxes_needed(10, 4), 3, "boxes_needed(10, 4)")
          eq(boxes_needed(8, 4), 2, "boxes_needed(8, 4)")
          eq(boxes_needed(1, 12), 1, "boxes_needed(1, 12)")
          eq(boxes_needed(0, 4), 0, "boxes_needed(0, 4)")
        `,
        hint:"<code>import math</code> on the first line. Then <code>round(math.pi * radius ** 2, 2)</code> and <code>math.ceil(items / per_box)</code>.", xp:20,
        exercises:[
          { id:"p8.2.e1", prompt:"Write <code>middle(numbers)</code> that returns the median of a list — the middle value once sorted. The <code>statistics</code> module has exactly the tool.",
            tests: py`
              fn("middle")
              eq(middle([3, 1, 2]), 2, "middle([3, 1, 2])")
              eq(middle([1, 2, 3, 4]), 2.5, "middle([1, 2, 3, 4])")
              eq(middle([9]), 9, "middle([9])")
            `,
            _ref: py`
              from statistics import median


              def middle(numbers):
                  return median(numbers)
            `,
            hint:"<code>from statistics import median</code>, then <code>return median(numbers)</code>.", xp:10 }
        ] },

      { id:"p8.3", title:"Reading a File", concept:"open, with, line by line",
        theory:`<p>So far every value has been typed into the code. Real programs read their data from <strong>files</strong>. This lesson has two, listed as pills above the editor — click one to see what's in it.</p>${code(py`
          with open("shopping.txt") as f:      # open the file; f is your handle on it
              for line in f:                   # one line at a time
                  line = line.strip()          # every line ends with an invisible newline - strip removes it
                  if line == "":
                      continue                 # skip blank lines
                  print(line)
        `)}<p>The <code>with</code> block closes the file for you when the block ends. Inside it, the file behaves like a list of lines you can loop over.</p><p>Everything read from a file is <strong>text</strong>. A line like <code>Ana,82</code> has to be taken apart with <code>.split(",")</code>, and the <code>"82"</code> converted with <code>int()</code>, before you can do arithmetic with it — which is everything from Days 1, 2 and 5 working together.</p>`,
        chips:[{t:"with open(…) as f:",c:"chip-blue"},{t:"for line in f",c:"chip-green"},{t:".strip()",c:"chip-cyan"},{t:"files are text",c:"chip-amber"}],
        task:"Read <code>shopping.txt</code> and build <code>items</code>: a list of its lines with the surrounding whitespace removed, leaving out blank lines. Then set <code>count</code> to how many items there are.",
        files:{
          "shopping.txt": "milk\neggs\n  bread\n\napples\n",
          "scores.txt": "Ana,82\nBo,67\nCy,91\n"
        },
        starter: py`
          items = []

          count = 0

          print(count, items)
        `,
        ref: py`
          items = []
          with open("shopping.txt") as f:
              for line in f:
                  line = line.strip()
                  if line:
                      items.append(line)

          count = len(items)

          print(count, items)
        `,
        tests: py`
          var("items", ["milk", "eggs", "bread", "apples"])
          var("count", 4)
          uses(r"open\s*\(", "Read the items from the file with open() rather than typing them in.")
        `,
        hint:"<code>with open(\"shopping.txt\") as f:</code>, then <code>for line in f:</code>, strip each line, and append it only if it isn't empty. <code>count = len(items)</code> after the loop.", xp:25,
        exercises:[
          { id:"p8.3.e1", prompt:"<code>scores.txt</code> has one <code>name,score</code> pair per line. Write <code>total_score(path)</code> that opens the file at <code>path</code> and returns all the scores added together (240 for <code>scores.txt</code>).",
            tests: py`
              fn("total_score")
              eq(total_score("scores.txt"), 240, 'total_score("scores.txt")')
              with open("_other.txt", "w") as _f:
                  _f.write("A,1\nB,2\n")
              eq(total_score("_other.txt"), 3, "total_score() on a different file")
            `,
            _ref: py`
              def total_score(path):
                  total = 0
                  with open(path) as f:
                      for line in f:
                          name, score = line.strip().split(",")
                          total += int(score)
                  return total
            `,
            hint:"For each line: <code>name, score = line.strip().split(\",\")</code>, then <code>total += int(score)</code>. Open <code>path</code>, not a fixed file name.", xp:10 }
        ] },

      { id:"p8.4", title:"Final Project — An Expense Report", concept:"files → records → totals → report",
        theory:`<p>Time to use everything at once. <code>expenses.txt</code> (click its pill) is the kind of file real life produces: one expense per line as <code>date,item,amount</code> — with a blank line and one row where the amount is not a number.</p><p>You'll build a small program in three parts, which is how most programs are shaped:</p><ol><li><strong>Load</strong> — read the file into a list of dictionaries, skipping what can't be used.</li><li><strong>Calculate</strong> — add up the amounts for each item in a dictionary.</li><li><strong>Report</strong> — print the result in a tidy, sorted form.</li></ol>${code(py`
          # A line becomes a record like this:
          {"date": "2024-03-01", "item": "coffee", "amount": 3.5}

          # sorted() on a dict gives its keys in order - handy for the report:
          for item in sorted(totals):
              print(f"{item}: {totals[item]:.2f}")
        `)}<p>Work on one function at a time and run often. When the checks pass, you have written a complete, useful program from an empty page — eight days ago <code>print("Hello")</code> was new.</p>`,
        chips:[{t:"load → calculate → report",c:"chip-blue"},{t:"list of dicts",c:"chip-green"},{t:"try / except",c:"chip-amber"},{t:"f-strings",c:"chip-cyan"}],
        task:"Finish the two functions. <code>load_expenses(path)</code> returns a list of dicts with keys <code>\"date\"</code>, <code>\"item\"</code> and <code>\"amount\"</code> (a float), skipping blank lines and lines whose amount isn't a number. <code>total_by_item(expenses)</code> returns a dict of item → total amount, each rounded to 2 decimals. The report at the bottom then prints one <code>item: total</code> line per item, in alphabetical order.",
        files:{
          "expenses.txt": "2024-03-01,coffee,3.50\n2024-03-01,lunch,12.00\n2024-03-02,coffee,3.50\n\n2024-03-02,bus,2.75\n2024-03-03,lunch,abc\n2024-03-03,bus,2.75\n2024-03-04,lunch,9.40\n"
        },
        starter: py`
          def load_expenses(path):
              expenses = []
              # open the file, loop over its lines, build one dict per good line
              return expenses


          def total_by_item(expenses):
              totals = {}
              # add each expense's amount to the total for its item
              return totals


          # The report - this part is done for you.
          totals = total_by_item(load_expenses("expenses.txt"))
          for item in sorted(totals):
              print(f"{item}: {totals[item]:.2f}")
        `,
        ref: py`
          def load_expenses(path):
              expenses = []
              with open(path) as f:
                  for line in f:
                      line = line.strip()
                      if not line:
                          continue
                      date, item, amount = line.split(",")
                      try:
                          amount = float(amount)
                      except ValueError:
                          continue
                      expenses.append({"date": date, "item": item, "amount": amount})
              return expenses


          def total_by_item(expenses):
              totals = {}
              for e in expenses:
                  totals[e["item"]] = totals.get(e["item"], 0) + e["amount"]
              for item in totals:
                  totals[item] = round(totals[item], 2)
              return totals


          totals = total_by_item(load_expenses("expenses.txt"))
          for item in sorted(totals):
              print(f"{item}: {totals[item]:.2f}")
        `,
        out:true, tests: py`
          fn("load_expenses"); fn("total_by_item")
          _rows = load_expenses("expenses.txt")
          check(isinstance(_rows, list), "load_expenses() should return a list.")
          eq(len(_rows), 6, 'The number of expenses loaded from "expenses.txt" (8 lines, 1 blank, 1 with a bad amount)')
          eq(_rows[0], {"date": "2024-03-01", "item": "coffee", "amount": 3.5}, "The first expense")
          eq(_rows[-1], {"date": "2024-03-04", "item": "lunch", "amount": 9.4}, "The last expense")
          with open("_other.txt", "w") as _f:
              _f.write("\n2025-01-01,tea,2.00\n2025-01-02,tea,x\n")
          eq(load_expenses("_other.txt"), [{"date": "2025-01-01", "item": "tea", "amount": 2.0}], "load_expenses() on a different file")
          eq(total_by_item([{"date": "d", "item": "a", "amount": 0.1}, {"date": "d", "item": "a", "amount": 0.2}, {"date": "d", "item": "b", "amount": 5.0}]),
             {"a": 0.3, "b": 5.0}, "total_by_item() on three expenses")
          eq(total_by_item([]), {}, "total_by_item([])")
        `,
        hint:"<code>load_expenses</code>: strip each line, <code>continue</code> if it's empty, <code>date, item, amount = line.split(\",\")</code>, convert with <code>float(amount)</code> inside <code>try</code> and <code>continue</code> on <code>ValueError</code>, then append the dict. <code>total_by_item</code>: <code>totals[item] = totals.get(item, 0) + amount</code> for each expense, then round each total to 2 decimals.", xp:40 }
    ]
  }
  ];

  for (const d of days) d.track = 'python';
  add(...days);
})();
