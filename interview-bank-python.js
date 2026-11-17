// SQL Quest — mock-interview problem bank for the Python track.
//
// The Python counterpart of interview-bank.js, used by interview.js when the
// track switch is on Python. Each problem asks for a function; a submission is
// graded by python.js exactly like a lesson — `tests` call the function with
// inputs of their own — so a verdict never depends on an AI's opinion.
// `node tools/verify-python.js` checks that every `ref` passes and that the
// `starter` (and an empty editor) does not.
//
//   track      'py'     — strings, loops and logic
//              'pydata' — lists, dictionaries, records and files
//   level      1 warm-up · 2 core · 3 senior
//   minutes    target time; finishing inside it earns the full speed score
//   starter    what the editor opens with: the signature to fill in
//   files      working-folder files the problem reads (shown above the editor)
//   followups  what an interviewer asks next (see interview-bank.js)
//   review     Python-track days to revisit, by their `day` key (101 = Day 1)
//
// Loaded after the course files (it uses PyCourse.py). Don't write `${` or a
// backtick inside py``.

const PY_INTERVIEW_BANK = (() => {
  const { py } = PyCourse;
  const bank = [
  // ── Python fundamentals ────────────────────────────────────────────────
  { id:"iv-p1", track:"py", level:1, minutes:5, title:"FizzBuzz",
    prompt:"Write <code>fizzbuzz(n)</code>. It returns a list with one entry for each number from 1 to <code>n</code>: <code>\"Fizz\"</code> for multiples of 3, <code>\"Buzz\"</code> for multiples of 5, <code>\"FizzBuzz\"</code> for multiples of both, and otherwise the number itself as text (<code>\"7\"</code>).",
    starter: py`
      def fizzbuzz(n):
          result = []
          return result


      print(fizzbuzz(15))
    `,
    ref: py`
      def fizzbuzz(n):
          result = []
          for i in range(1, n + 1):
              if i % 15 == 0:
                  result.append("FizzBuzz")
              elif i % 3 == 0:
                  result.append("Fizz")
              elif i % 5 == 0:
                  result.append("Buzz")
              else:
                  result.append(str(i))
          return result


      print(fizzbuzz(15))
    `,
    tests: py`
      fn("fizzbuzz")
      eq(fizzbuzz(5), ["1", "2", "Fizz", "4", "Buzz"], "fizzbuzz(5)")
      eq(fizzbuzz(15)[-1], "FizzBuzz", "The last entry of fizzbuzz(15)")
      eq(fizzbuzz(15)[8:12], ["Fizz", "Buzz", "11", "Fizz"], "Entries 9 to 12 of fizzbuzz(15)")
      eq(fizzbuzz(0), [], "fizzbuzz(0)")
      eq(len(fizzbuzz(30)), 30, "The length of fizzbuzz(30)")
    `,
    hint:"Loop over range(1, n + 1). Test the 'both' case first (i % 15 == 0), then 3, then 5, and append str(i) otherwise.",
    review:[103, 104, 105],
    followups:[
      { q:"Why does the order of your if / elif tests matter here? What goes wrong if you check for multiples of 3 first?",
        a:"An if / elif chain stops at the first true branch. 15 is a multiple of 3, so checking 3 first would return \"Fizz\" for it and the FizzBuzz branch would never run. The most specific condition has to come first — or build the string up: add \"Fizz\" if divisible by 3, add \"Buzz\" if divisible by 5, and fall back to the number if it is still empty." },
      { q:"The product owner now wants \"Bazz\" for multiples of 7 as well, combining with the others. How would you restructure this so each new rule is one line?",
        a:"Stop enumerating combinations. Keep the rules as data — a list of (divisor, word) pairs — loop over them appending each word whose divisor divides i, and use the number when nothing matched. Adding a rule is then adding a pair, and the combinations (FizzBazz, FizzBuzzBazz) come for free." }
    ] },

  { id:"iv-p2", track:"py", level:1, minutes:5, title:"Palindrome check",
    prompt:"Write <code>is_palindrome(text)</code>. It returns <code>True</code> when the text reads the same forwards and backwards, <strong>ignoring capitals and spaces</strong> — so <code>\"Never odd or even\"</code> is a palindrome.",
    starter: py`
      def is_palindrome(text):
          return False


      print(is_palindrome("Never odd or even"))
    `,
    ref: py`
      def is_palindrome(text):
          clean = text.lower().replace(" ", "")
          return clean == clean[::-1]


      print(is_palindrome("Never odd or even"))
    `,
    tests: py`
      fn("is_palindrome")
      eq(is_palindrome("level"), True, 'is_palindrome("level")')
      eq(is_palindrome("Never odd or even"), True, 'is_palindrome("Never odd or even")')
      eq(is_palindrome("python"), False, 'is_palindrome("python")')
      eq(is_palindrome("Ab"), False, 'is_palindrome("Ab")')
      eq(is_palindrome(""), True, 'is_palindrome("")')
      eq(is_palindrome("a"), True, 'is_palindrome("a")')
    `,
    hint:"Normalise first: lower-case it and remove the spaces. Then compare the cleaned text with its reverse — build the reverse with a loop, or with the slice clean[::-1].",
    review:[102, 104],
    followups:[
      { q:"How did you reverse the string, and what does that cost in time and memory for a very long input?",
        a:"A slice like text[::-1] (or a loop building a new string) makes a full reversed copy: O(n) time and O(n) extra memory. The alternative is two indexes walking in from both ends, comparing as they go — still O(n) time but no copy, and it can stop at the first mismatch." },
      { q:"Requirements change: punctuation should be ignored too, so \"A man, a plan, a canal: Panama\" counts. What changes?",
        a:"Only the normalising step: keep just the characters you care about, for example by looping and keeping ch when ch.isalnum(). The comparison stays the same. That is the reason to separate 'clean the input' from 'check the property' in the first place." }
    ] },

  { id:"iv-p3", track:"py", level:2, minutes:8, title:"Second-largest number",
    prompt:"Write <code>second_largest(numbers)</code>. It returns the second-largest <strong>distinct</strong> value in the list, or <code>None</code> when there is no such value. <code>[4, 9, 9, 2]</code> gives <code>4</code>.",
    starter: py`
      def second_largest(numbers):
          return None


      print(second_largest([4, 9, 9, 2]))
    `,
    ref: py`
      def second_largest(numbers):
          distinct = sorted(set(numbers))
          if len(distinct) < 2:
              return None
          return distinct[-2]


      print(second_largest([4, 9, 9, 2]))
    `,
    tests: py`
      fn("second_largest")
      eq(second_largest([4, 9, 9, 2]), 4, "second_largest([4, 9, 9, 2])")
      eq(second_largest([1, 2, 3]), 2, "second_largest([1, 2, 3])")
      eq(second_largest([-5, -1, -3]), -3, "second_largest([-5, -1, -3])")
      eq(second_largest([7, 7, 7]), None, "second_largest([7, 7, 7])")
      eq(second_largest([5]), None, "second_largest([5])")
      eq(second_largest([]), None, "second_largest([])")
      _xs = [3, 1, 2]
      second_largest(_xs)
      eq(_xs, [3, 1, 2], "The caller's list after second_largest() ran (it should not be changed)")
    `,
    hint:"Duplicates are the trap: remove them with set(), sort what is left, and take the item one from the end — after checking there are at least two.",
    review:[105, 106, 107],
    followups:[
      { q:"Your solution — does it sort? Could you find the answer in a single pass without sorting, and when would that matter?",
        a:"Sorting is O(n log n). One pass with two variables — largest and second — is O(n): for each number, if it beats largest, shift largest down to second; else if it is between them (and not equal to largest), it becomes second. It matters for very large or streaming inputs where you cannot hold or sort everything." },
      { q:"What should a function like this do with an empty list — return None, return 0, or raise an error? Defend your choice.",
        a:"Not 0: that is a legitimate answer and would hide the problem. None says 'no such value' and forces the caller to handle it; raising ValueError (like max([]) does) is the stricter choice and right when an empty input means a bug upstream. The important part is that the behaviour is deliberate, documented and tested." }
    ] },

  { id:"iv-p4", track:"py", level:2, minutes:8, title:"Anagrams",
    prompt:"Write <code>is_anagram(a, b)</code>. It returns <code>True</code> when the two texts use exactly the same letters the same number of times, <strong>ignoring capitals and spaces</strong>: <code>\"Dormitory\"</code> and <code>\"dirty room\"</code> are anagrams.",
    starter: py`
      def is_anagram(a, b):
          return False


      print(is_anagram("Dormitory", "dirty room"))
    `,
    ref: py`
      def is_anagram(a, b):
          def letters(text):
              return sorted(text.lower().replace(" ", ""))
          return letters(a) == letters(b)


      print(is_anagram("Dormitory", "dirty room"))
    `,
    tests: py`
      fn("is_anagram")
      eq(is_anagram("listen", "silent"), True, 'is_anagram("listen", "silent")')
      eq(is_anagram("Dormitory", "dirty room"), True, 'is_anagram("Dormitory", "dirty room")')
      eq(is_anagram("apple", "papel"), True, 'is_anagram("apple", "papel")')
      eq(is_anagram("aab", "abb"), False, 'is_anagram("aab", "abb")')
      eq(is_anagram("abc", "abcd"), False, 'is_anagram("abc", "abcd")')
      eq(is_anagram("", ""), True, 'is_anagram("", "")')
    `,
    hint:"Clean both texts the same way (lower-case, no spaces). Then either compare sorted(a) with sorted(b), or count the letters of each into a dictionary and compare the dictionaries.",
    review:[102, 105, 106],
    followups:[
      { q:"There are two classic approaches — sorting the letters, or counting them. Compare their costs.",
        a:"Sorting both strings is O(n log n). Counting letters into a dictionary is O(n): one pass per string, then compare the two dicts (or count up for one and down for the other and check everything is zero). For short words it makes no practical difference; counting wins on long inputs." },
      { q:"A set of the letters would be even simpler: set(a) == set(b). Why is that wrong?",
        a:"A set records which letters appear, not how many times. \"aab\" and \"abb\" have the same set {a, b} but are not anagrams. Whenever multiplicity matters you need counts (a dict) or the sorted sequence, not a set." }
    ] },

  { id:"iv-p5", track:"py", level:2, minutes:10, title:"Run-length encoding",
    prompt:"Write <code>compress(text)</code>. It replaces each run of the same character with the character followed by the length of the run: <code>\"aaabccdddd\"</code> becomes <code>\"a3b1c2d4\"</code>. An empty string stays empty.",
    starter: py`
      def compress(text):
          return ""


      print(compress("aaabccdddd"))
    `,
    ref: py`
      def compress(text):
          if text == "":
              return ""
          result = ""
          current = text[0]
          count = 1
          for ch in text[1:]:
              if ch == current:
                  count += 1
              else:
                  result += current + str(count)
                  current = ch
                  count = 1
          result += current + str(count)
          return result


      print(compress("aaabccdddd"))
    `,
    tests: py`
      fn("compress")
      eq(compress("aaabccdddd"), "a3b1c2d4", 'compress("aaabccdddd")')
      eq(compress("abc"), "a1b1c1", 'compress("abc")')
      eq(compress("zzzz"), "z4", 'compress("zzzz")')
      eq(compress("aabaa"), "a2b1a2", 'compress("aabaa")')
      eq(compress("x"), "x1", 'compress("x")')
      eq(compress(""), "", 'compress("")')
    `,
    hint:"Remember the current character and how many times you have seen it in a row. When the character changes, write out the pair and start a new count — and don't forget to write out the last run after the loop ends.",
    review:[104, 107],
    followups:[
      { q:"The most common bug in this problem is losing the last run. Why does that happen, and how did you guard against it?",
        a:"A run is only written out when the character changes — and nothing changes after the final character, so the last run is still 'pending' when the loop ends. You have to flush it after the loop. The same shape appears in any 'group consecutive items' loop, which is why it deserves its own test case." },
      { q:"You probably built the result with += on a string. Strings are immutable in Python — what does that mean for a very long input, and what is the usual alternative?",
        a:"Immutable means each += builds a new string, so in the worst case the loop copies the growing result again and again — quadratic time. The idiom is to append the pieces to a list and call \"\".join(pieces) once at the end, which is linear." }
    ] },

  { id:"iv-p6", track:"py", level:3, minutes:12, title:"Two sum",
    prompt:"Write <code>two_sum(numbers, target)</code>. It returns the positions <code>[i, j]</code> (with <code>i &lt; j</code>) of two <strong>different</strong> items in the list that add up to <code>target</code>, or <code>None</code> if no such pair exists. Each test has at most one valid pair. <code>two_sum([2, 7, 11, 15], 9)</code> is <code>[0, 1]</code>.",
    starter: py`
      def two_sum(numbers, target):
          return None


      print(two_sum([2, 7, 11, 15], 9))
    `,
    ref: py`
      def two_sum(numbers, target):
          seen = {}
          for j, n in enumerate(numbers):
              need = target - n
              if need in seen:
                  return [seen[need], j]
              seen[n] = j
          return None


      print(two_sum([2, 7, 11, 15], 9))
    `,
    tests: py`
      fn("two_sum")
      def _pair(numbers, target):
          r = two_sum(numbers, target)
          return None if r is None else sorted(list(r))
      eq(_pair([2, 7, 11, 15], 9), [0, 1], "two_sum([2, 7, 11, 15], 9)")
      eq(_pair([3, 2, 4], 6), [1, 2], "two_sum([3, 2, 4], 6) - an item cannot be paired with itself")
      eq(_pair([3, 3], 6), [0, 1], "two_sum([3, 3], 6)")
      eq(_pair([-4, 10, 1, 4], 0), [0, 3], "two_sum([-4, 10, 1, 4], 0)")
      eq(_pair([1, 2, 3], 100), None, "two_sum([1, 2, 3], 100)")
      eq(_pair([5], 10), None, "two_sum([5], 10)")
      eq(_pair([], 0), None, "two_sum([], 0)")
    `,
    hint:"The direct way is two nested loops over positions i < j. The faster way: walk the list once, and for each number ask whether target - number has been seen already — a dictionary of value → position answers that instantly.",
    review:[104, 106, 107],
    followups:[
      { q:"What is the time complexity of your solution? If it is the nested-loop version, how do you get it down to a single pass?",
        a:"Two nested loops compare every pair: O(n²). The single pass keeps a dictionary of value → index for everything seen so far; for each number you look up target - number in it. Dictionary lookups are O(1) on average, so the whole thing is O(n) time for O(n) extra memory — the classic time-for-space trade." },
      { q:"Why is looking something up in a dictionary so much faster than `x in some_list`?",
        a:"`in` on a list checks the items one by one — O(n). A dict (and a set) is a hash table: it computes the key's hash and jumps straight to where that key would be stored, so a lookup takes about the same time whether there are ten keys or ten million. That is also why keys must be hashable, i.e. immutable." }
    ] },

  // ── Working with data ──────────────────────────────────────────────────
  { id:"iv-d1", track:"pydata", level:1, minutes:5, title:"Word frequencies",
    prompt:"Write <code>word_counts(text)</code>. It returns a dictionary mapping each word to how many times it appears, treating capitals as the same word (<code>\"The\"</code> and <code>\"the\"</code>). Words are separated by spaces.",
    starter: py`
      def word_counts(text):
          counts = {}
          return counts


      print(word_counts("the cat and the hat"))
    `,
    ref: py`
      def word_counts(text):
          counts = {}
          for word in text.lower().split():
              counts[word] = counts.get(word, 0) + 1
          return counts


      print(word_counts("the cat and the hat"))
    `,
    tests: py`
      fn("word_counts")
      eq(word_counts("the cat and the hat"), {"the": 2, "cat": 1, "and": 1, "hat": 1}, 'word_counts("the cat and the hat")')
      eq(word_counts("The the THE"), {"the": 3}, 'word_counts("The the THE")')
      eq(word_counts("one"), {"one": 1}, 'word_counts("one")')
      eq(word_counts(""), {}, 'word_counts("")')
      eq(word_counts("  spaced   out  "), {"spaced": 1, "out": 1}, 'word_counts("  spaced   out  ")')
    `,
    hint:"Lower-case the text, split() it into words, and for each word do counts[word] = counts.get(word, 0) + 1.",
    review:[105, 106],
    followups:[
      { q:"What does counts.get(word, 0) do for you, and what would happen with counts[word] += 1 on its own?",
        a:"The first time a word is seen it has no entry, so counts[word] += 1 has to read a missing key and raises KeyError. .get(word, 0) reads the current count or 0 when there is none. The standard library also has collections.Counter and defaultdict(int), which exist for exactly this pattern." },
      { q:"Your function splits on spaces. What does it do with \"Hello, world. Hello!\" — and how would you fix it?",
        a:"It counts \"hello,\" and \"hello!\" as two different words because the punctuation stays attached. Strip punctuation from each word (word.strip(\".,!?;:\")), or remove everything that is not a letter before splitting. Real text always needs a cleaning step, and it should be its own, testable piece." }
    ] },

  { id:"iv-d2", track:"pydata", level:2, minutes:8, title:"Remove duplicates, keep the order",
    prompt:"Write <code>dedupe(items)</code>. It returns a new list with duplicates removed, keeping the <strong>first</strong> occurrence of each item in its original position: <code>[3, 1, 3, 2, 1]</code> becomes <code>[3, 1, 2]</code>. The list passed in must not be changed.",
    starter: py`
      def dedupe(items):
          return items


      print(dedupe([3, 1, 3, 2, 1]))
    `,
    ref: py`
      def dedupe(items):
          seen = set()
          result = []
          for item in items:
              if item not in seen:
                  seen.add(item)
                  result.append(item)
          return result


      print(dedupe([3, 1, 3, 2, 1]))
    `,
    tests: py`
      fn("dedupe")
      eq(dedupe([3, 1, 3, 2, 1]), [3, 1, 2], "dedupe([3, 1, 3, 2, 1])")
      eq(dedupe(["b", "a", "b", "c", "a"]), ["b", "a", "c"], 'dedupe(["b", "a", "b", "c", "a"])')
      eq(dedupe([5, 5, 5]), [5], "dedupe([5, 5, 5])")
      eq(dedupe([]), [], "dedupe([])")
      _orig = [2, 2, 1]
      _out = dedupe(_orig)
      eq(_orig, [2, 2, 1], "The caller's list after dedupe() ran (it should not be changed)")
      check(_out is not _orig, "dedupe() should return a new list, not the list it was given.")
    `,
    hint:"Walk the list once with a result list and a 'seen' collection. Append an item only if you have not seen it, then remember it. (list(set(items)) is not enough: a set forgets the order.)",
    review:[105, 106],
    followups:[
      { q:"list(set(items)) is one line and removes duplicates. Why is it not an answer to this question?",
        a:"A set has no order, so converting back to a list returns the items in an arbitrary order — the requirement to keep first occurrences in place is lost. (dict.fromkeys(items) does keep insertion order, which is why list(dict.fromkeys(items)) is the idiomatic one-liner.)" },
      { q:"If you tracked what you had seen in a list rather than a set, the function would still be correct. What changes?",
        a:"The speed. `item not in seen` on a list scans it — O(n) per check, O(n²) overall — while a set answers in O(1) on average, giving O(n) overall. On a few hundred items nobody notices; on a few million it is the difference between a second and an hour. The limit of a set is that the items must be hashable." }
    ] },

  { id:"iv-d3", track:"pydata", level:2, minutes:8, title:"Totals per customer",
    prompt:"Each order is a dictionary like <code>{\"customer\": \"ana\", \"amount\": 12.5}</code>. Write <code>totals_by_customer(orders)</code>, returning a dictionary of customer → total amount, each total rounded to 2 decimals.",
    starter: py`
      def totals_by_customer(orders):
          totals = {}
          return totals


      orders = [
          {"customer": "ana", "amount": 12.5},
          {"customer": "bo", "amount": 4.0},
          {"customer": "ana", "amount": 7.25},
      ]
      print(totals_by_customer(orders))
    `,
    ref: py`
      def totals_by_customer(orders):
          totals = {}
          for o in orders:
              totals[o["customer"]] = totals.get(o["customer"], 0) + o["amount"]
          for name in totals:
              totals[name] = round(totals[name], 2)
          return totals


      orders = [
          {"customer": "ana", "amount": 12.5},
          {"customer": "bo", "amount": 4.0},
          {"customer": "ana", "amount": 7.25},
      ]
      print(totals_by_customer(orders))
    `,
    tests: py`
      fn("totals_by_customer")
      eq(totals_by_customer([{"customer": "ana", "amount": 12.5}, {"customer": "bo", "amount": 4.0}, {"customer": "ana", "amount": 7.25}]),
         {"ana": 19.75, "bo": 4.0}, "totals_by_customer() on three orders")
      eq(totals_by_customer([{"customer": "x", "amount": 0.1}, {"customer": "x", "amount": 0.2}]), {"x": 0.3}, "totals_by_customer() on 0.1 + 0.2 (rounded to 2 decimals)")
      eq(totals_by_customer([{"customer": "solo", "amount": 5}]), {"solo": 5}, "totals_by_customer() on one order")
      eq(totals_by_customer([]), {}, "totals_by_customer([])")
    `,
    hint:"The grouping pattern: totals[key] = totals.get(key, 0) + amount for every order. Round each total once at the end, not while adding.",
    review:[106, 107],
    followups:[
      { q:"Why is 0.1 + 0.2 not exactly 0.3 in Python, and what would you use for real money?",
        a:"Floats are binary fractions, and 0.1 has no exact binary representation — the same way 1/3 has none in decimal — so tiny errors appear and accumulate. Rounding hides it for display. For money you keep integer cents, or use decimal.Decimal, so that totals are exact and reconcile." },
      { q:"This is a GROUP BY written by hand. If the list had ten million orders, what would you reach for instead?",
        a:"The loop itself is fine — one pass, O(n) — but ten million dicts may not fit comfortably in memory. Options: read and aggregate the source as a stream so only the running totals are held; push the aggregation into the database with SQL's GROUP BY; or use pandas (groupby).sum(), which stores columns compactly and runs the loop in compiled code." }
    ] },

  { id:"iv-d4", track:"pydata", level:2, minutes:10, title:"Top scorers",
    prompt:"<code>scores</code> is a dictionary of name → score. Write <code>top_scorers(scores, n)</code>, returning a list of the <code>n</code> names with the highest scores, best first. When two people have the same score, the name that comes first alphabetically goes first.",
    starter: py`
      def top_scorers(scores, n):
          return []


      print(top_scorers({"ana": 82, "bo": 91, "cy": 82, "di": 60}, 3))
    `,
    ref: py`
      def top_scorers(scores, n):
          ranked = sorted(scores, key=lambda name: (-scores[name], name))
          return ranked[:n]


      print(top_scorers({"ana": 82, "bo": 91, "cy": 82, "di": 60}, 3))
    `,
    tests: py`
      fn("top_scorers")
      _s = {"ana": 82, "bo": 91, "cy": 82, "di": 60}
      eq(top_scorers(_s, 3), ["bo", "ana", "cy"], "top_scorers(scores, 3)")
      eq(top_scorers(_s, 1), ["bo"], "top_scorers(scores, 1)")
      eq(top_scorers(_s, 10), ["bo", "ana", "cy", "di"], "top_scorers(scores, 10) - asking for more than there are")
      eq(top_scorers({"zed": 5, "amy": 5, "kim": 5}, 2), ["amy", "kim"], "top_scorers() with a three-way tie")
      eq(top_scorers({}, 3), [], "top_scorers({}, 3)")
      eq(_s, {"ana": 82, "bo": 91, "cy": 82, "di": 60}, "The caller's dictionary after top_scorers() ran (it should not be changed)")
    `,
    hint:"Sort the names by two things at once: score (highest first), then name. Either sorted(scores, key=lambda name: (-scores[name], name)), or sort alphabetically first and then by score — Python's sort keeps tied items in their existing order.",
    review:[105, 106, 107],
    followups:[
      { q:"How did you handle the tie-break? Python's sort is 'stable' — what does that mean and how can you use it here?",
        a:"Stable means items that compare equal keep their original relative order. So you can sort twice: first by name, then by score descending — the second sort leaves tied scores in the alphabetical order the first one produced. The one-pass alternative is a tuple key, (-score, name), because tuples compare element by element." },
      { q:"If there were millions of scores and you only needed the top 10, is sorting everything the best you can do?",
        a:"No — a full sort is O(n log n) and orders items you will throw away. Keeping a heap of the best k seen so far is O(n log k), which is what heapq.nlargest(k, …) does. In a database the same idea is ORDER BY … LIMIT 10 with a top-N plan." }
    ] },

  { id:"iv-d5", track:"pydata", level:3, minutes:12, title:"Summarise a log file",
    prompt:"Each line of <code>server.log</code> looks like <code>2024-05-01 10:02:11 ERROR payment: timeout</code> — a date, a time, a level, then a message. Write <code>count_levels(path)</code>, returning a dictionary of level → number of lines. Skip blank lines and lines with fewer than three parts.",
    files:{
      "server.log": "2024-05-01 10:00:01 INFO app: started\n2024-05-01 10:02:11 ERROR payment: timeout after 30s\n2024-05-01 10:02:12 WARN payment: retrying\n\n2024-05-01 10:02:15 INFO payment: ok\ngarbage\n2024-05-01 10:05:40 ERROR db: connection reset\n2024-05-01 10:06:00 INFO app: heartbeat\n"
    },
    starter: py`
      def count_levels(path):
          counts = {}
          return counts


      print(count_levels("server.log"))
    `,
    ref: py`
      def count_levels(path):
          counts = {}
          with open(path) as f:
              for line in f:
                  parts = line.split()
                  if len(parts) < 3:
                      continue
                  level = parts[2]
                  counts[level] = counts.get(level, 0) + 1
          return counts


      print(count_levels("server.log"))
    `,
    tests: py`
      fn("count_levels")
      eq(count_levels("server.log"), {"INFO": 3, "ERROR": 2, "WARN": 1}, 'count_levels("server.log")')
      with open("_other.log", "w") as _f:
          _f.write("\n2025-01-01 00:00:00 DEBUG x: y\nbad line\n2025-01-01 00:00:01 DEBUG x: z\n")
      eq(count_levels("_other.log"), {"DEBUG": 2}, "count_levels() on a different file")
      with open("_empty.log", "w") as _f:
          _f.write("")
      eq(count_levels("_empty.log"), {}, "count_levels() on an empty file")
    `,
    hint:"Open the file with `with open(path) as f:` and loop over its lines. line.split() with no argument splits on any whitespace and gives [] for a blank line; skip anything with fewer than 3 parts, and count parts[2].",
    review:[106, 108],
    followups:[
      { q:"Did you read the whole file into memory or go line by line? Why does it matter for a 20 GB log?",
        a:"f.read() or f.readlines() loads everything at once, which fails or thrashes on a file larger than memory. Looping `for line in f` streams it: only one line is held at a time, so memory use stays flat no matter how big the file is. Only the small dictionary of counts grows." },
      { q:"You skip malformed lines silently. In a production pipeline, is that the right thing to do?",
        a:"Skipping keeps the job alive, but silently is the problem: nobody finds out that 30% of the input was dropped. Count the rejects and report or log them, keep them somewhere for inspection (a quarantine file), and fail the run if the reject rate crosses a threshold. Tolerate bad rows, but never invisibly." }
    ] },

  { id:"iv-d6", track:"pydata", level:3, minutes:15, title:"Load and clean a contact list",
    prompt:"<code>people.csv</code> has a header line and then <code>name,email,age</code> rows. Write <code>load_people(path)</code>, returning a list of dictionaries with keys <code>\"name\"</code>, <code>\"email\"</code> and <code>\"age\"</code>. Clean as you load: strip spaces from every field, lower-case the email, convert <code>age</code> to an <code>int</code>, <strong>skip</strong> rows whose age is not a whole number, and keep only the <strong>first</strong> row for each email.",
    files:{
      "people.csv": "name,email,age\nAna Ruiz,ana@example.com,34\n Bo Chen , BO@Example.com ,41\nCy Odu,cy@example.com,unknown\nAna R.,ANA@example.com,35\nDi Park,di@example.com,29\n"
    },
    starter: py`
      def load_people(path):
          people = []
          return people


      for person in load_people("people.csv"):
          print(person)
    `,
    ref: py`
      def load_people(path):
          people = []
          seen = set()
          with open(path) as f:
              lines = f.read().splitlines()
          for line in lines[1:]:
              if not line.strip():
                  continue
              name, email, age = [part.strip() for part in line.split(",")]
              email = email.lower()
              try:
                  age = int(age)
              except ValueError:
                  continue
              if email in seen:
                  continue
              seen.add(email)
              people.append({"name": name, "email": email, "age": age})
          return people


      for person in load_people("people.csv"):
          print(person)
    `,
    tests: py`
      fn("load_people")
      _p = load_people("people.csv")
      check(isinstance(_p, list), "load_people() should return a list.")
      eq(len(_p), 3, 'The number of people loaded from "people.csv" (5 rows: 1 bad age, 1 repeated email)')
      eq(_p[0], {"name": "Ana Ruiz", "email": "ana@example.com", "age": 34}, "The first person")
      eq(_p[1], {"name": "Bo Chen", "email": "bo@example.com", "age": 41}, "The second person (spaces stripped, email lower-cased)")
      eq(_p[2], {"name": "Di Park", "email": "di@example.com", "age": 29}, "The third person")
      with open("_other.csv", "w") as _f:
          _f.write("name,email,age\nZ,z@z.io,x\nZ,z@z.io,7\n")
      eq(load_people("_other.csv"), [{"name": "Z", "email": "z@z.io", "age": 7}], "load_people() on a different file - a row skipped for a bad age must not block a later good row with the same email")
    `,
    hint:"Skip the header line. For each row: split on commas, strip every part, lower-case the email, convert the age inside try / except ValueError (continue on failure), then use a set of emails already seen to drop repeats — add to the set only when you actually keep the row.",
    review:[105, 106, 108],
    followups:[
      { q:"Order of operations: you check the age and you check for a duplicate email. Does it matter which comes first?",
        a:"Yes. If a row with a bad age is recorded as 'seen' before being rejected, a later valid row for the same email is wrongly dropped as a duplicate. Validate first, and only mark an email as seen when the row is actually kept. More generally: normalise, then validate, then deduplicate." },
      { q:"You split each line on commas. What input breaks that, and what should you use instead?",
        a:"Any field that contains a comma — \"Ruiz, Ana\" in quotes — or a quoted field with a line break in it. CSV has quoting and escaping rules, so hand-splitting is only safe for data you control. The standard library's csv module (csv.reader / csv.DictReader) implements the format properly and should be the default." }
    ] }
  ];
  for (const p of bank) p.lang = 'python';
  return bank;
})();
