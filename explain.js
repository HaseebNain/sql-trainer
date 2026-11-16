// SQL Quest — wrong-answer explainer.
//
// engine.js answers "is this query right?". This module answers "WHY isn't
// it?" — with no AI involved. It re-runs the learner's query and the closest
// reference answer on pristine copies of the database, lines the two result
// sets up (columns are matched by name, then by the values they contain) and
// looks for the patterns behind most wrong SQL:
//
//   • rows missing / extra, and what those rows have in common
//     ("all 3 missing rows have NULL in dept_id — an INNER JOIN drops them")
//   • duplicated rows from a join fan-out
//   • right rows in the wrong order
//   • missing or extra columns
//   • value-level slips: rounding, integer division, ×100, NULL vs 0,
//     case / whitespace, double counting
//
// It describes the DIFFERENCE, never the reference query itself.
//
// Depends on the SqlEngine global (engine.js). Works in the browser and in
// Node (tools/explain-test.js).

const SqlExplain = (function () {
  const MAX_POINTS = 3;
  const KEY_SEP = '\u0001';

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const code = s => `<code>${esc(s)}</code>`;
  const norm = v => SqlEngine.normCell(v);
  const lit = v => v === null || v === undefined ? 'NULL' : typeof v === 'string' ? `'${v}'` : String(v);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const rowText = row => '(' + row.map(v => v === null || v === undefined ? 'NULL' : String(v)).join(', ') + ')';
  const num = v => typeof v === 'number' ? v
    : (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : null);
  const decimals = x => { const s = String(x); const i = s.indexOf('.'); return i < 0 || /e/i.test(s) ? 0 : s.length - i - 1; };
  const looksLikeDate = v => typeof v === 'string' && /^\d{4}-\d{2}/.test(v);

  // ── Column alignment ─────────────────────────────────────────────────────
  // Pair candidate columns with expected columns: same name is a strong
  // signal, otherwise the overlap (Jaccard) of the distinct values they hold.
  function mapColumns(C, X) {
    const sets = R => R.columns.map((_, i) => new Set(R.values.map(r => norm(r[i]))));
    const cs = sets(C), xs = sets(X);
    const pairs = [];
    for (let i = 0; i < cs.length; i++) for (let j = 0; j < xs.length; j++) {
      let inter = 0;
      for (const v of cs[i]) if (xs[j].has(v)) inter++;
      const union = cs[i].size + xs[j].size - inter;
      let sim = union ? inter / union : 1;
      const sameName = String(C.columns[i]).toLowerCase() === String(X.columns[j]).toLowerCase();
      if (sameName) sim += 0.6;
      if (i === j) sim += 0.02;
      pairs.push({ i, j, sim, sameName });
    }
    pairs.sort((a, b) => b.sim - a.sim);
    const c2x = new Array(cs.length).fill(-1), x2c = new Array(xs.length).fill(-1);
    for (const p of pairs) {
      if (p.sim < 0.5 || c2x[p.i] !== -1 || x2c[p.j] !== -1) continue;
      c2x[p.i] = p.j; x2c[p.j] = p.i;
    }
    return { c2x, x2c };
  }

  // ── Row alignment on the mapped columns (multiset difference) ───────────
  function diffRows(C, X, map) {
    const xCols = [], cCols = [];
    map.x2c.forEach((ci, xj) => { if (ci !== -1) { xCols.push(xj); cCols.push(ci); } });
    const keyOf = (row, cols) => cols.map(k => norm(row[k])).join(KEY_SEP);
    const bucket = (R, cols) => {
      const m = new Map();
      R.values.forEach((row, idx) => { const k = keyOf(row, cols); (m.get(k) || m.set(k, []).get(k)).push(idx); });
      return m;
    };
    const bx = bucket(X, xCols), bc = bucket(C, cCols);
    const missing = [], extra = [], keptX = [], keptC = [];
    let surplusCopies = 0;       // extra candidate rows whose key DOES exist in the expected result
    for (const [k, xi] of bx) {
      const ci = bc.get(k) || [];
      const m = Math.min(xi.length, ci.length);
      keptX.push(...xi.slice(0, m)); keptC.push(...ci.slice(0, m));
      missing.push(...xi.slice(m));
      extra.push(...ci.slice(m));
      if (ci.length > xi.length) surplusCopies += ci.length - xi.length;
    }
    for (const [k, ci] of bc) if (!bx.has(k)) extra.push(...ci);
    return { xCols, cCols, missing, extra, keptX, keptC, surplusCopies };
  }

  // What do the `bad` rows have in common that none of the `good` rows share?
  // Looks for (in order): a column that is NULL only in the bad rows, a single
  // value only the bad rows have, or a numeric/date range that separates them.
  // A lone bad row is "unique" in every column, so for a single row only a
  // NULL or a value that appears in the learner's own SQL counts as a finding.
  function discriminator(R, bad, good, sql) {
    if (!bad.length || !good.length) return null;
    const n = R.columns.length;
    const values = [], ranges = [];
    for (let k = 0; k < n; k++) {
      const badVals = bad.map(i => R.values[i][k]);
      const goodNorm = new Set(good.map(i => norm(R.values[i][k])));
      const uniq = new Set(badVals.map(norm));
      if (uniq.size === 1 && !goodNorm.has(norm(badVals[0]))) {
        if (badVals[0] === null) return { type: 'null', col: R.columns[k] };
        values.push({ type: 'value', col: R.columns[k], v: badVals[0] });
        continue;
      }
      const goodVals = good.map(i => R.values[i][k]);
      const all = badVals.concat(goodVals);
      let cmp = null;
      if (all.every(v => num(v) !== null)) cmp = (a, b) => num(a) - num(b);
      else if (all.every(looksLikeDate)) cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
      if (!cmp) continue;
      const max = arr => arr.reduce((m, v) => (cmp(v, m) > 0 ? v : m));
      const min = arr => arr.reduce((m, v) => (cmp(v, m) < 0 ? v : m));
      if (cmp(max(badVals), min(goodVals)) < 0) ranges.push({ type: 'below', col: R.columns[k], edge: max(badVals), other: min(goodVals) });
      else if (cmp(min(badVals), max(goodVals)) > 0) ranges.push({ type: 'above', col: R.columns[k], edge: min(badVals), other: max(goodVals) });
    }
    const several = bad.length > 1;
    return values.find(d => sqlMentions(sql, d.v))
      || ranges.find(d => sqlMentions(sql, d.edge))
      || (several ? values[0] : null)
      || (several ? ranges[0] : null)
      || null;
  }

  // Does the learner's SQL contain this value as a literal? (boundary hints)
  function sqlMentions(sql, v) {
    if (v === null || v === undefined) return false;
    const s = String(sql).toLowerCase();
    const t = String(v).toLowerCase();
    if (typeof v === 'number' || num(v) !== null) return new RegExp('(^|[^\\d.])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\d.])').test(s);
    return s.includes(`'${t}'`);
  }

  function samples(R, idxs, n) {
    return idxs.slice(0, n).map(i => code(rowText(R.values[i]))).join(', ') + (idxs.length > n ? ', …' : '');
  }

  // ── Value-level comparison of one expected column vs one candidate column ─
  // `pairs` = [[candidateValue, expectedValue], …] for rows already lined up.
  function valuePattern(pairs, cName, xName) {
    const diffs = pairs.filter(([a, b]) => norm(a) !== norm(b));
    if (!diffs.length) return null;
    const col = code(cName === xName ? xName : cName);
    const n = diffs.length, of = pairs.length;
    const where = n === of ? 'every row' : `${n} of ${plural(of, 'row')}`;
    const eg = `e.g. expected ${code(lit(diffs[0][1]))}, got ${code(lit(diffs[0][0]))}`;

    const nullA = diffs.filter(([a, b]) => a === null && b !== null);
    const nullB = diffs.filter(([a, b]) => b === null && a !== null);
    if (nullA.length === n) {
      const fill = new Set(nullA.map(([, b]) => norm(b)));
      return { kind: 'null-vs-value', text: `${col} is NULL on ${where} where a value is expected${fill.size === 1 ? ` (${code(lit(nullA[0][1]))})` : ''} — replace missing values with ${code('COALESCE(…, default)')}, or the LEFT JOIN side you aggregate over is empty for those rows.` };
    }
    if (nullB.length === n) {
      return { kind: 'value-vs-null', text: `${col} has a value (${code(lit(nullB[0][0]))}) on ${where} where NULL is expected — you may be defaulting NULLs (COALESCE / IFNULL) or counting rows that have no match.` };
    }

    if (diffs.every(([a, b]) => num(a) !== null && num(b) !== null)) {
      const d = diffs.map(([a, b]) => [num(a), num(b)]);
      for (let p = 0; p <= 4; p++) {
        const half = 0.5 * Math.pow(10, -p) * (1 + 1e-9) + 1e-12;
        if (d.every(([a, b]) => decimals(b) <= p && decimals(a) > p && Math.abs(a - b) <= half)) {
          return { kind: 'rounding', text: `${col} differs only by rounding — the expected values are rounded to ${p === 0 ? 'whole numbers' : plural(p, 'decimal place')} (${eg}). Wrap it in ${code(`ROUND(…, ${p})`)}.` };
        }
        if (d.every(([a, b]) => decimals(a) <= p && decimals(b) > p && Math.abs(a - b) <= half)) {
          return { kind: 'over-rounded', text: `${col} is rounded more than the task asks — you round to ${p === 0 ? 'whole numbers' : plural(p, 'decimal place')} but more precision is expected (${eg}).` };
        }
      }
      if (d.every(([a, b]) => Number.isInteger(a) && Math.trunc(b) === a) && d.some(([, b]) => !Number.isInteger(b))) {
        return { kind: 'integer-division', text: `${col} is being truncated to whole numbers (${eg}) — that's integer division. Make one side a decimal first: ${code('1.0 * a / b')} or ${code('100.0 * a / b')}.` };
      }
      if (d.every(([a, b]) => a === -b)) {
        return { kind: 'sign', text: `${col} has the opposite sign on ${where} (${eg}) — the subtraction is the wrong way round.` };
      }
      if (d.length === of && d.every(([, b]) => b !== 0)) {
        const r0 = d[0][0] / d[0][1];
        if (r0 !== 1 && d.every(([a, b]) => Math.abs(a / b - r0) <= Math.abs(r0) * 1e-6)) {
          const nice = [[100, 'a percentage where a fraction is expected (drop the × 100)'], [0.01, 'a fraction where a percentage is expected (multiply by 100.0)'],
            [1000, 'a unit conversion (×1000)'], [0.001, 'a unit conversion (÷1000)'], [60, 'minutes vs hours'], [1 / 60, 'hours vs minutes'],
            [24, 'hours vs days'], [1 / 24, 'days vs hours'], [2.2046226, 'pounds where kilograms are expected'], [0.45359237, 'kilograms where pounds are expected']];
          const hit = nice.find(([f]) => Math.abs(r0 - f) <= f * 2e-3);
          return { kind: 'factor', text: `Every value in ${col} is exactly ${code((Math.round(r0 * 1e4) / 1e4) + '×')} the expected one (${eg})${hit ? ` — looks like ${hit[1]}` : ' — a consistent scaling or unit mix-up'}.` };
        }
      }
      if (d.every(([a, b]) => a > b)) {
        return { kind: 'too-high', text: `${col} is too high on ${where} (${eg}) — a classic sign of double counting: a join multiplied the rows before you aggregated, or ${code('COUNT(*)')} is counting what ${code('COUNT(DISTINCT …)')} should.` };
      }
      if (d.every(([a, b]) => a < b)) {
        return { kind: 'too-low', text: `${col} is too low on ${where} (${eg}) — rows are being lost before you aggregate (a filter or INNER JOIN that is too strict), or ${code('COUNT(col)')} is skipping NULLs.` };
      }
    }

    if (diffs.every(([a, b]) => typeof a === 'string' && typeof b === 'string')) {
      if (diffs.every(([a, b]) => a.trim().toLowerCase() === b.trim().toLowerCase())) {
        const caseOnly = diffs.every(([a, b]) => a.trim() === a && b.trim() === b);
        return { kind: 'case-whitespace', text: `${col} differs only by ${caseOnly ? 'capitalization' : 'stray whitespace / capitalization'} (${eg}) — normalise it with ${code(caseOnly ? 'UPPER() / LOWER()' : 'TRIM()')}${caseOnly ? '' : ` and ${code('UPPER()')}`}.` };
      }
      if (diffs.every(([a, b]) => a.startsWith(b) || b.startsWith(a) || a.endsWith(b) || b.endsWith(a))) {
        return { kind: 'format', text: `${col} has the right content in a different format or precision (${eg}) — check the format string or how much of the value you keep.` };
      }
    }
    return { kind: 'values', text: `${col} has different values on ${where} (${eg}).` };
  }

  // Same shape (rows × columns) but some columns disagree: line the rows up on
  // the columns that DO agree exactly and compare the rest value by value.
  // Returns null when the rows can't be paired up unambiguously.
  function valueLevel(C, X, map) {
    const n = X.columns.length;
    const sig = (R, k) => R.values.map(r => norm(r[k])).sort().join(KEY_SEP);
    const x2c = map.x2c.slice();
    const free = C.columns.map((_, i) => i).filter(i => !x2c.includes(i));
    for (let j = 0; j < n; j++) {
      if (x2c[j] !== -1) continue;
      let at = free.findIndex(i => String(C.columns[i]).toLowerCase() === String(X.columns[j]).toLowerCase());
      if (at === -1) at = 0;
      x2c[j] = free.splice(at, 1)[0];
    }
    const exact = [], loose = [];
    for (let j = 0; j < n; j++) (sig(X, j) === sig(C, x2c[j]) ? exact : loose).push(j);
    if (!loose.length) return null;

    let pairsFor;
    if (exact.length) {
      const xKey = r => exact.map(j => norm(r[j])).join(KEY_SEP);
      const cKey = r => exact.map(j => norm(r[x2c[j]])).join(KEY_SEP);
      const cBy = new Map();
      for (const r of C.values) { const k = cKey(r); if (cBy.has(k)) return null; cBy.set(k, r); }
      const seen = new Set();
      for (const r of X.values) { const k = xKey(r); if (seen.has(k) || !cBy.has(k)) return null; seen.add(k); }
      pairsFor = j => X.values.map(r => [cBy.get(xKey(r))[x2c[j]], r[j]]);
    } else if (X.values.length === 1) {
      pairsFor = j => [[C.values[0][x2c[j]], X.values[0][j]]];
    } else if (n === 1) {
      const sorted = (R, k) => R.values.map(r => r[k]).sort((a, b) => (num(a) ?? 0) - (num(b) ?? 0) || String(a).localeCompare(String(b)));
      const cs = sorted(C, x2c[0]), xs = sorted(X, 0);
      pairsFor = () => xs.map((b, i) => [cs[i], b]);
    } else {
      return null;
    }
    const found = loose.map(j => valuePattern(pairsFor(j), C.columns[x2c[j]], X.columns[j])).filter(Boolean);
    if (!found.length) return null;
    return {
      kind: found[0].kind,
      headline: exact.length || X.values.length === 1 ? 'Right rows, wrong values' : 'Right shape, wrong values',
      points: found.map(p => p.text)
    };
  }

  // ── Structural hints taken from the SHAPE of the reference, not its text ──
  const has = (sql, re) => re.test(String(sql));
  function shapeHint(candSql, refSql, C, X) {
    if (C.values.length > X.values.length) {
      if (has(refSql, /\bgroup\s+by\b/i) && !has(candSql, /\bgroup\s+by\b/i)) return `The answer has one row per group — your query never groups. Think ${code('GROUP BY')}.`;
      if (has(refSql, /\bdistinct\b/i) && !has(candSql, /\bdistinct\b/i) && !has(candSql, /\bgroup\s+by\b/i)) return `The answer has each value once — you may need ${code('DISTINCT')}.`;
      if (has(refSql, /\blimit\b/i) && !has(candSql, /\blimit\b/i)) return `The task asks for only the top ${X.values.length} — add ${code('LIMIT')}.`;
      if (!has(candSql, /\bwhere\b|\bhaving\b|\bjoin\b/i)) return 'Your query has no filter at all — the task narrows the rows down.';
    }
    return null;
  }

  // Pick the reference whose result is closest to the candidate's.
  function closestReference(cand, expectedList) {
    let best = null, bestScore = -Infinity;
    for (const x of expectedList) {
      let score = 0;
      if (cand) {
        if (x.result.columns.length === cand.columns.length) score += 4;
        score -= Math.abs(x.result.values.length - cand.values.length) / Math.max(1, x.result.values.length);
        const map = mapColumns(cand, x.result);
        score += map.c2x.filter(j => j !== -1).length;
      }
      if (score > bestScore) { bestScore = score; best = x; }
    }
    return best;
  }

  // ── Main entry ───────────────────────────────────────────────────────────
  // Returns null when there is nothing useful to say (no reference, engine not
  // ready), { verdict:'pass' } for a correct answer, or
  //   { verdict:'fail', kind, headline, points:[html…], expected:{rows,cols}, got:{rows,cols}|null }
  function diagnose(candidateSql, lesson) {
    if (typeof SqlEngine === 'undefined' || !SqlEngine.ready() || !lesson) return null;
    const refs = SqlEngine.referenceQueries(lesson);
    if (!refs.length) return null;
    const verdict = SqlEngine.evaluate(candidateSql, lesson);
    if (verdict === 'pass') return { verdict: 'pass' };
    if (verdict !== 'fail') return null;

    const probe = SqlEngine.lessonProbe(lesson);
    const setup = SqlEngine.lessonSetup(lesson);
    const seq = x => [setup, x, probe].filter(s => s != null);

    const expectedList = [];
    for (const ref of refs) {
      const r = SqlEngine.runOnFresh(seq(ref));
      if (r && r.columns.length) expectedList.push({ ref, result: r });
    }
    if (!expectedList.length) return null;

    const run = SqlEngine.runDetailed(seq(candidateSql));
    const C = run.result;
    const best = closestReference(C, expectedList);
    const X = best.result;
    const expected = { rows: X.values.length, cols: X.columns.length };
    const fail = (kind, headline, points) => ({
      verdict: 'fail', kind, headline, points: points.slice(0, MAX_POINTS),
      expected, got: C ? { rows: C.values.length, cols: C.columns.length } : null, stateCheck: !!probe
    });

    // 1. The statements failed on a clean database.
    if (run.error) {
      const missingObj = /no such (table|column|view)[: ]+(\S+)/i.exec(run.error);
      if (probe && missingObj) {
        return fail('state-missing', `The check can't find ${missingObj[1]} ${missingObj[2]}`, [
          `This lesson is graded on the database state your statements leave behind. After they run, the grader executes ${code(probe)} — and that failed with ${code(run.error)}.`,
          `Create the object the task names (exact name and columns), in the same run as the rest of your statements.`
        ]);
      }
      return fail('replay-error', 'It ran here, but not on a clean copy of the data', [
        `Grading replays your statements on a pristine copy of the database, where they failed with ${code(run.error)}.`,
        `If the query depends on something you created or changed in an earlier run, include that step in the same run — or hit ↺ Reset data to see what the grader sees.`
      ]);
    }

    // 2. Nothing came back to compare.
    if (!C || !C.columns.length) {
      return fail('no-result', 'No result set to check', [
        `Your statements ran but returned no rows-and-columns result. The task expects ${plural(expected.rows, 'row')} × ${plural(expected.cols, 'column')} — finish with a ${code('SELECT')}.`
      ]);
    }

    const ordered = SqlEngine.orderedFor(lesson, probe || best.ref);
    const what = probe ? 'The resulting table' : 'Your result';

    // 3. Same rows — wrong order, or a required technique is missing.
    if (SqlEngine.equivalent(C, X, false)) {
      if (ordered && !SqlEngine.equivalent(C, X, true)) {
        const map = mapColumns(C, X);
        let at = 0;
        const xk = r => X.columns.map((_, j) => norm(r[j])).join(KEY_SEP);
        const ck = r => X.columns.map((_, j) => norm(r[map.x2c[j] === -1 ? j : map.x2c[j]])).join(KEY_SEP);
        while (at < X.values.length && xk(X.values[at]) === ck(C.values[at])) at++;
        const pts = [`You have exactly the right rows — only the order is off. The task asks for a specific sort: check the ${code('ORDER BY')} column(s) and ${code('ASC')} / ${code('DESC')}.`];
        if (at < X.values.length) pts.push(`First difference is at row ${at + 1}: expected ${code(rowText(X.values[at]))}, yours is ${code(rowText(C.values[at]))}.`);
        return fail('order', 'Right rows, wrong order', pts);
      }
      const missing = SqlEngine.requiresMissing(candidateSql, lesson);
      if (missing.length) {
        const names = missing.map(m => Array.isArray(m) ? m.map(code).join(' or ') : code(m)).join(', ');
        return fail('technique', 'Right result — but not with the technique this lesson is about', [
          `Your output matches, but this lesson checks that the query actually uses: ${names}.`
        ]);
      }
    }

    const points = [];
    let kind = 'mismatch', headline = '';
    const map = mapColumns(C, X);
    const mapped = map.x2c.filter(i => i !== -1).length;
    const unX = X.columns.filter((_, j) => map.x2c[j] === -1);
    const unC = C.columns.filter((_, i) => map.c2x[i] === -1);
    const dR = C.values.length - X.values.length;

    const stateNote = `This lesson is graded on database state: after your statements, the grader runs ${code(probe)} and compares what it finds.`;

    // 4. Same shape, different values → rounding, integer division, NULLs, …
    if (C.columns.length === X.columns.length && C.values.length === X.values.length && X.values.length) {
      const v = valueLevel(C, X, map);
      if (v) return fail(v.kind, v.headline, probe ? [stateNote].concat(v.points) : v.points);
    }

    // 5. Nothing lines up at all.
    if (!mapped) {
      points.push(`${what} doesn't share any column with the expected answer (${plural(expected.rows, 'row')} × ${plural(expected.cols, 'column')}). Expected columns look like: ${X.columns.map(code).join(', ')}.`);
      const sh = shapeHint(candidateSql, best.ref, C, X);
      if (sh) points.push(sh);
      return fail('shape', `Expected ${plural(expected.rows, 'row')} × ${plural(expected.cols, 'column')} — got ${C.values.length} × ${C.columns.length}`, probe ? [stateNote].concat(points) : points);
    }

    const diff = diffRows(C, X, map);

    // 5. Row-level problems (judged on the columns both results share).
    if (diff.missing.length || diff.extra.length) {
      kind = 'rows';
      // Surplus copies of correct rows only mean a fan-out if the query joins;
      // without a join it is a missing GROUP BY / DISTINCT (see shapeHint).
      const fanOut = !diff.missing.length && diff.extra.length && diff.surplusCopies === diff.extra.length && /\bjoin\b/i.test(candidateSql);
      if (fanOut) {
        kind = 'duplicates';
        headline = `${plural(diff.extra.length, 'duplicated row')} — a join is fanning out`;
        points.push(`${what} has ${plural(C.values.length, 'row')}; ${X.values.length} expected. The ${diff.extra.length} extra ${diff.extra.length === 1 ? 'row is a copy' : 'rows are copies'} of rows that should appear once, e.g. ${samples(C, diff.extra, 2)}.`);
        points.push(`That's a join <strong>fan-out</strong>: the table you joined to has several rows per key, so each match repeats the row. Join on the full key, aggregate the many-side first, or de-duplicate with ${code('DISTINCT')} / ${code('GROUP BY')}.`);
      } else {
        const bits = [];
        if (diff.missing.length) bits.push(`missing ${plural(diff.missing.length, 'row')}`);
        if (diff.extra.length) bits.push(`${plural(diff.extra.length, 'extra row')}`);
        headline = bits.join(' · ').replace(/^m/, 'M');
        if (diff.missing.length) {
          const disc = discriminator(X, diff.missing, diff.keptX, candidateSql);
          let t = `<strong>${plural(diff.missing.length, 'expected row')} ${diff.missing.length === 1 ? 'is' : 'are'} missing</strong>`;
          if (disc && disc.type === 'null') {
            t += ` — and ${diff.missing.length === 1 ? 'it has' : 'all of them have'} NULL in ${code(disc.col)}. Rows with no match are being dropped: an ${code('INNER JOIN')} (or a ${code('WHERE')} on the joined table, or a ${code('=')} / ${code('<>')} comparison against NULL) removes them. ${code('LEFT JOIN')} / ${code('IS NULL')} keeps them.`;
          } else if (disc && disc.type === 'value') {
            t += ` — ${diff.missing.length === 1 ? 'it has' : 'all of them have'} ${code(disc.col)} = ${code(lit(disc.v))}, and none of the rows you returned do. `;
            t += sqlMentions(candidateSql, disc.v)
              ? `That value is right in your filter: check the comparison — ${code('>')} vs ${code('>=')}, ${code('<>')} vs ${code('=')}, or an ${code('IN (…)')} list that should include it.`
              : 'Find the condition that excludes that value.';
          } else if (disc) {
            t += ` — ${diff.missing.length === 1 ? 'its' : 'all with'} ${code(disc.col)} ${disc.type === 'below' ? '≤' : '≥'} ${code(lit(disc.edge))}, while every row you returned is ${disc.type === 'below' ? 'above' : 'below'} that. `;
            t += sqlMentions(candidateSql, disc.edge)
              ? `${code(lit(disc.edge))} is the boundary in your own filter — it should be inclusive (${code(disc.type === 'below' ? '>=' : '<=')}, or ${code('BETWEEN')}).`
              : 'A range filter is cutting off too much.';
          } else {
            t += `, e.g. ${samples(X, diff.missing, 3)}.`;
          }
          points.push(t);
        }
        if (diff.extra.length) {
          const disc = discriminator(C, diff.extra, diff.keptC, candidateSql);
          let t = `<strong>${plural(diff.extra.length, 'row')} shouldn't be there</strong>`;
          if (disc && disc.type === 'null') {
            t += ` — ${diff.extra.length === 1 ? 'it has' : 'all with'} NULL in ${code(disc.col)}. Either filter them out (${code('IS NOT NULL')}) or the ${code('LEFT JOIN')} that produced them should be an ${code('INNER JOIN')}.`;
          } else if (disc && disc.type === 'value') {
            t += ` — ${diff.extra.length === 1 ? 'it has' : 'all with'} ${code(disc.col)} = ${code(lit(disc.v))}, which no correct row has. A filter on ${code(disc.col)} is missing or too loose.`;
          } else if (disc) {
            t += ` — ${diff.extra.length === 1 ? 'its' : 'all with'} ${code(disc.col)} ${disc.type === 'below' ? '≤' : '≥'} ${code(lit(disc.edge))}, outside the range of the correct rows. `;
            t += sqlMentions(candidateSql, disc.edge)
              ? `${code(lit(disc.edge))} is the boundary in your filter — it should be exclusive (${code(disc.type === 'below' ? '>' : '<')}).`
              : 'A range condition is missing or too wide.';
          } else {
            t += `, e.g. ${samples(C, diff.extra, 3)}.`;
          }
          points.push(t);
        }
        if (!diff.keptX.length) {
          points.length = 0;
          headline = 'None of the expected rows are in your result';
          points.push(`${what} has ${plural(C.values.length, 'row')} but none match the expected ${X.values.length}. An expected row looks like ${samples(X, diff.missing, 1)}; yours look like ${samples(C, diff.extra, 1)}.`);
        }
        const sh = shapeHint(candidateSql, best.ref, C, X);
        if (sh) points.push(sh);
      }
    }

    // 6. Column-level problems.
    if (unX.length && C.columns.length === X.columns.length && !diff.missing.length && !diff.extra.length) {
      // Same shape, rows agree on the shared columns → compare the rest value by value.
      const keyOf = (row, cols) => cols.map(k => norm(row[k])).join(KEY_SEP);
      const cByKey = new Map();
      let unique = true;
      C.values.forEach(r => { const k = keyOf(r, diff.cCols); if (cByKey.has(k)) unique = false; cByKey.set(k, r); });
      const xj = X.columns.map((_, j) => j).filter(j => map.x2c[j] === -1);
      const ci = C.columns.map((_, i) => i).filter(i => map.c2x[i] === -1);
      if (unique) {
        kind = 'values'; headline = 'Right rows, wrong values';
        xj.forEach((j, n) => {
          const sameName = ci.find(i => String(C.columns[i]).toLowerCase() === String(X.columns[j]).toLowerCase());
          const i = sameName !== undefined ? sameName : ci[n];
          const pairs = X.values.map(r => [cByKey.get(keyOf(r, diff.xCols))[i], r[j]]);
          const p = valuePattern(pairs, C.columns[i], X.columns[j]);
          if (p) { points.push(p.text); kind = p.kind; }
        });
      } else {
        kind = 'values'; headline = 'Right shape, wrong values';
        points.push(`Row count and the columns ${diff.xCols.map(j => code(X.columns[j])).join(', ')} match, but ${unX.map(code).join(', ')} ${unX.length === 1 ? 'does' : 'do'} not. An expected row: ${code(rowText(X.values[0]))}.`);
      }
    } else if (unX.length || unC.length) {
      if (!headline) { kind = 'columns'; headline = `Expected ${plural(expected.cols, 'column')}, got ${C.columns.length}`; }
      if (unX.length) {
        const j = X.columns.indexOf(unX[0]);
        const eg = X.values.slice(0, 3).map(r => lit(r[j])).join(', ');
        points.push(`${unX.length === 1 ? 'A column is' : `${unX.length} columns are`} missing or computed differently: ${unX.map(code).join(', ')}${eg ? ` (values like ${code(eg)})` : ''}.`);
      }
      if (unC.length && C.columns.length > X.columns.length) {
        points.push(has(candidateSql, /select\s+(\w+\.)?\*/i)
          ? `${code('SELECT *')} returns every column — the task wants only ${X.columns.length}: list them explicitly. Not needed: ${unC.slice(0, 5).map(code).join(', ')}${unC.length > 5 ? ', …' : ''}.`
          : `${plural(unC.length, 'extra column')} the task doesn't ask for: ${unC.slice(0, 5).map(code).join(', ')}${unC.length > 5 ? ', …' : ''}.`);
      }
    }

    if (!points.length) {
      headline = `Expected ${plural(expected.rows, 'row')} × ${plural(expected.cols, 'column')} — got ${C.values.length} × ${C.columns.length}`;
      points.push(`${what} doesn't match the expected answer${dR ? ` (${Math.abs(dR)} ${dR > 0 ? 'more' : 'fewer'} rows than expected)` : ''}. Re-read the task for the exact rows and columns it names.`);
    }
    if (probe) points.unshift(`This lesson is graded on database state: after your statements, the grader runs ${code(probe)} and compares what it finds.`);
    return fail(kind, headline, points);
  }

  // ── Practice exercises (rule-based `validate`) ───────────────────────────
  // Plain-language list of the rules a result set fails.
  function explainValidate(v, columns, values) {
    if (!v) return [];
    const cols = (columns || []).map(c => String(c).toLowerCase());
    const rows = values || [];
    const out = [];
    const shown = (columns || []).map(code).join(', ') || 'none';
    if (v.rowCount !== undefined && rows.length !== v.rowCount) out.push(`Expected exactly ${plural(v.rowCount, 'row')} — your query returned ${rows.length}.`);
    if (v.minRows !== undefined && rows.length < v.minRows) out.push(`Expected at least ${plural(v.minRows, 'row')} — you returned ${rows.length}. A filter or join is too strict.`);
    if (v.maxRows !== undefined && rows.length > v.maxRows) out.push(`Expected at most ${plural(v.maxRows, 'row')} — you returned ${rows.length}. Something isn't being filtered, grouped or limited.`);
    if (v.colCount !== undefined && cols.length !== v.colCount) out.push(`Expected ${plural(v.colCount, 'column')} — you returned ${cols.length} (${shown}).`);
    const needCols = [].concat(v.hasCol ? [v.hasCol] : [], v.hasCols || []);
    const lacking = needCols.filter(c => !cols.includes(String(c).toLowerCase()));
    if (lacking.length) out.push(`Expected ${lacking.length === 1 ? 'a column named' : 'columns named'} ${lacking.map(code).join(', ')} — name ${lacking.length === 1 ? 'it' : 'them'} with ${code('AS')}. Your columns: ${shown}.`);
    if (v.notCol && cols.includes(String(v.notCol).toLowerCase())) out.push(`The column ${code(v.notCol)} shouldn't be in the output.`);
    const colCheck = (rule, test, describe) => {
      if (!rule) return;
      const ci = cols.indexOf(String(rule.col).toLowerCase());
      if (ci === -1) { if (!lacking.includes(rule.col)) out.push(`Expected a column named ${code(rule.col)}. Your columns: ${shown}.`); return; }
      const bad = rows.filter(r => !test(r[ci]));
      if (bad.length) out.push(`${describe} — ${plural(bad.length, 'row')} ${bad.length === 1 ? "doesn't" : "don't"} (e.g. ${code(lit(bad[0][ci]))}).`);
    };
    colCheck(v.allEq, x => String(x ?? '').toLowerCase() === String(v.allEq && v.allEq.val).toLowerCase(), v.allEq ? `Every row should have ${code(v.allEq.col)} = ${code(lit(v.allEq.val))}` : '');
    colCheck(v.allGt, x => Number(x) > Number(v.allGt && v.allGt.val), v.allGt ? `Every row should have ${code(v.allGt.col)} above ${code(v.allGt.val)}` : '');
    colCheck(v.allLt, x => Number(x) < Number(v.allLt && v.allLt.val), v.allLt ? `Every row should have ${code(v.allLt.col)} below ${code(v.allLt.val)}` : '');
    if (v.firstVal !== undefined && (!rows.length || String(rows[0][0]) !== String(v.firstVal))) {
      out.push(`The first row's first column should be ${code(lit(v.firstVal))}${rows.length ? ` — yours is ${code(lit(rows[0][0]))}` : ''}. Check the ${code('ORDER BY')} and which column comes first.`);
    }
    if (v.hasValue !== undefined) {
      const target = String(v.hasValue).toLowerCase();
      if (!rows.some(r => r.some(c => String(c ?? '').toLowerCase() === target))) out.push(`The value ${code(lit(v.hasValue))} should appear somewhere in the result — it doesn't.`);
    }
    return out;
  }

  // One-line plain-text version (AI tutor context, interview room).
  function summarize(d) {
    if (!d || d.verdict !== 'fail') return '';
    const strip = s => String(s).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return `${d.headline}. ${d.points.map(strip).join(' ')}`;
  }

  return { diagnose, explainValidate, summarize, mapColumns, valuePattern };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SqlExplain;
