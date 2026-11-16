// Generates data-warehouse.js — the "Ridgeline Components" plant-floor dataset
// used by the capstone track. Deterministic (seeded), so re-running produces a
// byte-identical file. Every data problem a real warehouse has is PLANTED here
// on purpose; the capstone lessons are about finding and fixing them.
//
//   node tools/gen-warehouse.js        # rewrites data-warehouse.js
//
// If you change anything here, re-run `node tools/verify.js` — lesson
// references are computed from the data, but exercise `validate` counts and
// the numbers quoted in lesson text are not.
const fs = require('fs');
const path = require('path');

// ── Seeded PRNG (mulberry32) ──
let seed = 20250106;
function rnd() {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const pad = (n, w = 2) => String(n).padStart(w, '0');

// ── Time helpers (all plants are on standard time for the whole window) ──
const utc = (y, m, d, hh = 0, mm = 0, ss = 0) => new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
const addMin = (dt, min) => new Date(dt.getTime() + min * 60000);
const addDays = (dt, n) => addMin(dt, n * 1440);
const ymd = dt => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
const hms = dt => `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}`;
const sqlTs = dt => `${ymd(dt)} ${hms(dt)}`;

// ── Reference data ──
const PLANTS = [
  // ts_format documents how each plant's MES writes event timestamps.
  { code: 'RNO', name: 'Reno Stamping & Weld', city: 'Reno, NV', offset: -8, fmt: 'iso_offset' },
  { code: 'BOI', name: 'Boise Casting & Machining', city: 'Boise, ID', offset: -7, fmt: 'iso_utc' },
  { code: 'AUS', name: 'Austin Assembly & Paint', city: 'Austin, TX', offset: -6, fmt: 'us_local' }
];
const LINES = [
  { code: 'RNO-L1', plant: 'RNO', name: 'Press Line 1', process: 'Stamping', rate: 900, scrap: 0.022, parts: ['BRK-1001', 'BRK-1002'], night: true },
  { code: 'RNO-L2', plant: 'RNO', name: 'Weld Cell 2', process: 'Welding', rate: 420, scrap: 0.031, parts: ['FRM-2001', 'FRM-2002'], night: false },
  { code: 'BOI-L1', plant: 'BOI', name: 'Die Cast 1', process: 'Casting', rate: 300, scrap: 0.042, parts: ['CST-3001', 'CST-3002'], night: true },
  { code: 'BOI-L2', plant: 'BOI', name: 'CNC Cell 2', process: 'Machining', rate: 380, scrap: 0.018, parts: ['MCH-4001', 'MCH-4002'], night: false },
  { code: 'AUS-L1', plant: 'AUS', name: 'Final Assembly 1', process: 'Assembly', rate: 160, scrap: 0.012, parts: ['ASM-5001', 'ASM-5002'], night: true },
  { code: 'AUS-L2', plant: 'AUS', name: 'Paint Booth 2', process: 'Paint', rate: 500, scrap: 0.035, parts: ['PNT-6001', 'PNT-6002'], night: false }
];
const SHIFTS = [
  { code: 'A', name: 'Day', start: 6, end: 14 },
  { code: 'B', name: 'Swing', start: 14, end: 22 },
  { code: 'C', name: 'Night', start: 22, end: 6 }
];
const PARTS = [
  ['BRK-1001', 'Brake bracket', 'finished', 4.10, 0.62],
  ['BRK-1002', 'Bracket reinforcement', 'finished', 2.85, 0.41],
  ['FRM-2001', 'Subframe rail', 'finished', 38.50, 9.80],
  ['FRM-2002', 'Crossmember', 'finished', 27.20, 6.40],
  ['CST-3001', 'Motor housing', 'finished', 61.00, 11.20],
  ['CST-3002', 'Gearbox case', 'finished', 48.75, 8.90],
  ['MCH-4001', 'Rotor shaft', 'finished', 33.40, 3.10],
  ['MCH-4002', 'Bearing carrier', 'finished', 19.90, 1.75],
  ['ASM-5001', 'Drive unit', 'finished', 412.00, 46.00],
  ['ASM-5002', 'Inverter module', 'finished', 288.00, 12.50],
  ['PNT-6001', 'Painted housing', 'finished', 66.50, 11.30],
  ['PNT-6002', 'Painted cover', 'finished', 14.20, 1.90],
  ['MAT-ALU-01', 'Aluminum ingot A380', 'material', 2.75, 1.0],
  ['MAT-STL-01', 'Steel coil HSLA', 'material', 1.10, 1.0],
  ['MAT-PNT-01', 'Powder coat, black', 'material', 9.40, 1.0],
  ['CMP-BRG-01', 'Sealed bearing 6205', 'component', 3.60, 0.13],
  ['CMP-FST-01', 'Fastener kit M8', 'component', 0.85, 0.05]
];
const DEFECT_CODES = [
  ['D-101', 'Porosity', 'Casting', 'major'],
  ['D-102', 'Cold shut', 'Casting', 'major'],
  ['D-201', 'Burr', 'Stamping', 'minor'],
  ['D-202', 'Out of tolerance', 'Machining', 'major'],
  ['D-301', 'Weld spatter', 'Welding', 'minor'],
  ['D-302', 'Incomplete weld', 'Welding', 'critical'],
  ['D-401', 'Paint run', 'Paint', 'minor'],
  ['D-402', 'Orange peel', 'Paint', 'minor'],
  ['D-501', 'Missing fastener', 'Assembly', 'major'],
  ['D-502', 'Torque fail', 'Assembly', 'critical']
];
const PROCESS_DEFECTS = {
  Stamping: ['D-201', 'D-202'], Welding: ['D-301', 'D-302'], Casting: ['D-101', 'D-102'],
  Machining: ['D-202', 'D-201'], Assembly: ['D-501', 'D-502'], Paint: ['D-401', 'D-402']
};
const REWORKABLE = new Set(['D-201', 'D-301', 'D-401', 'D-402', 'D-501', 'D-502', 'D-202']);

const START = utc(2025, 1, 6);          // Monday
const DAYS = 14;                        // 2025-01-06 .. 2025-01-19

// ── raw_production_events ──
// One row per line per shift. event_ts is when the run was closed out, in the
// plant's own format, 1–29 minutes before the end of the shift.
function fmtEventTs(dtUtc, plant) {
  const local = addMin(dtUtc, plant.offset * 60);
  if (plant.fmt === 'iso_utc') return `${ymd(dtUtc)}T${hms(dtUtc)}Z`;
  if (plant.fmt === 'iso_offset') return `${ymd(local)}T${hms(local)}-${pad(-plant.offset)}:00`;
  return `${pad(local.getUTCMonth() + 1)}/${pad(local.getUTCDate())}/${local.getUTCFullYear()} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

const events = [];     // canonical (true) events
for (let d = 0; d < DAYS; d++) {
  const day = addDays(START, d);
  const dow = day.getUTCDay();                 // 0 = Sunday
  const weekend = dow === 0 || dow === 6;
  for (const line of LINES) {
    const plant = PLANTS.find(p => p.code === line.plant);
    for (const sh of SHIFTS) {
      if (weekend && sh.code !== 'A') continue;
      if (weekend && !line.night) continue;     // only the 3 "night" lines run Saturdays/Sundays
      if (sh.code === 'C' && !line.night) continue;
      // shift end, local wall-clock → UTC
      const endLocalDay = sh.code === 'C' ? addDays(day, 1) : day;
      const endLocal = utc(endLocalDay.getUTCFullYear(), endLocalDay.getUTCMonth() + 1, endLocalDay.getUTCDate(), sh.end, 0, 0);
      const closeLocal = addMin(endLocal, -rint(1, 29));
      const closeUtc = addMin(closeLocal, -plant.offset * 60);
      const total = Math.round(line.rate * (weekend ? 0.6 : 1) * (0.92 + rnd() * 0.16));
      // The story in the data: Die Cast 1 scrap roughly triples in week 2.
      let rate = line.scrap * (0.7 + rnd() * 0.6);
      if (line.code === 'BOI-L1' && d >= 7) rate = 0.10 + rnd() * 0.035;
      const scrap = Math.round(total * rate);
      events.push({
        line, plant, shift: sh.code, prodDate: ymd(day), utc: closeUtc,
        part: line.parts[(d + (sh.code === 'B' ? 1 : 0)) % 2],
        good: total - scrap, scrap
      });
    }
  }
}
events.sort((a, b) => a.utc - b.utc);
events.forEach((e, i) => { e.id = `EV-${pad(1001 + i, 6)}`; });

// Nightly batch: everything from UTC day D lands at 08:00 UTC on D+1.
const batchLoad = dtUtc => addMin(addDays(utc(dtUtc.getUTCFullYear(), dtUtc.getUTCMonth() + 1, dtUtc.getUTCDate()), 1), 8 * 60);

const eventRows = [];   // what actually landed in the raw table
const chosen = new Set();
function pickEvents(n, filter) {
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 5000) {
    const e = pick(events);
    if (chosen.has(e.id) || (filter && !filter(e))) continue;
    chosen.add(e.id); out.push(e);
  }
  return out;
}
const lateEvents = new Set(pickEvents(7, e => e.prodDate <= '2025-01-14').map(e => e.id));
const resent = new Set(pickEvents(8).map(e => e.id));
const corrected = new Set(pickEvents(5, e => e.scrap > 3).map(e => e.id));
const messyPart = new Set(pickEvents(9).map(e => e.id));
const negative = new Set(pickEvents(2).map(e => e.id));

const messPart = p => pick([p.toLowerCase(), ` ${p}`, `${p} `, ` ${p.toLowerCase()} `]);
for (const e of events) {
  const base = {
    event_id: e.id, line_code: e.line.code,
    part_no: messyPart.has(e.id) ? messPart(e.part) : e.part,
    event_ts: fmtEventTs(e.utc, e.plant),
    qty_good: e.good, qty_scrap: e.scrap,
    loaded_at: batchLoad(e.utc)
  };
  if (lateEvents.has(e.id)) base.loaded_at = addDays(base.loaded_at, rint(3, 6));
  if (negative.has(e.id)) { base.qty_good = -base.qty_good; }
  if (corrected.has(e.id)) {
    // First version under-reported scrap; a corrected row arrives 2 days later.
    const first = { ...base, qty_scrap: Math.max(0, e.scrap - rint(2, 6)) };
    first.qty_good = e.good + (e.scrap - first.qty_scrap);
    eventRows.push(first);
    eventRows.push({ ...base, loaded_at: addDays(base.loaded_at, 2) });
    continue;
  }
  eventRows.push(base);
  if (resent.has(e.id)) eventRows.push({ ...base, loaded_at: addDays(base.loaded_at, 1) });
}
// Two test rows from a commissioning run — a part number that is in no master list.
for (const [i, lineCode] of [[0, 'RNO-L1'], [1, 'AUS-L1']]) {
  const line = LINES.find(l => l.code === lineCode), plant = PLANTS.find(p => p.code === line.plant);
  const t = addMin(addDays(START, 3 + i * 5), 10 * 60 + 17 - plant.offset * 60);
  eventRows.push({ event_id: `EV-${pad(900001 + i, 6)}`, line_code: lineCode, part_no: 'TST-9999', event_ts: fmtEventTs(t, plant), qty_good: 25, qty_scrap: 0, loaded_at: batchLoad(t) });
}
eventRows.sort((a, b) => a.loaded_at - b.loaded_at || (a.event_id < b.event_id ? -1 : 1));

// ── raw_defects / raw_rework ──
const defects = [], rework = [];
let dfSeq = 1, rwSeq = 1;
for (const e of events) {
  if (e.scrap <= 0) continue;
  const codes = PROCESS_DEFECTS[e.line.process];
  const classified = rnd() < 0.12 ? Math.max(1, e.scrap - rint(1, 3)) : e.scrap;   // some scrap is never classified
  const first = e.scrap >= 4 ? Math.max(1, Math.round(classified * (0.55 + rnd() * 0.3))) : classified;
  const split = [[codes[0], first]];
  if (classified - first > 0) split.push([codes[1], classified - first]);
  for (const [code, qty] of split) {
    const id = `DF-${pad(dfSeq++, 5)}`;
    const detected = addMin(e.utc, rint(5, 240));
    defects.push({ defect_id: id, event_id: e.id, defect_code: code, qty, detected_ts: detected });
    if (REWORKABLE.has(code) && rnd() < 0.42) {
      const started = addMin(detected, rint(30, 600));
      const open = rnd() < 0.06;
      const minutes = rint(12, 95);
      const fixed = rnd() < 0.74;
      rework.push({
        rework_id: `RW-${pad(rwSeq++, 4)}`, defect_id: id,
        started_at: started, finished_at: open ? null : addMin(started, minutes),
        outcome: open ? null : (fixed ? pick(['fixed', 'fixed', 'fixed', 'Fixed', 'FIXED ']) : pick(['scrapped', 'scrapped', 'Scrapped', 'scrap'])),
        labor_minutes: open ? null : minutes
      });
    }
  }
}
// Planted problems in defects: sloppy codes, an unknown code, orphaned events.
const dIdx = () => rint(0, defects.length - 1);
const touched = new Set();
const untouched = () => { let i; do { i = dIdx(); } while (touched.has(i)); touched.add(i); return defects[i]; };
for (let i = 0; i < 5; i++) { const d = untouched(); d.defect_code = pick([d.defect_code.toLowerCase(), ` ${d.defect_code}`, `${d.defect_code.toLowerCase()} `]); }
for (let i = 0; i < 2; i++) { untouched().defect_code = 'D-999'; }
for (let i = 0; i < 6; i++) {
  const t = addMin(addDays(START, rint(0, 12)), rint(0, 1439));
  defects.push({ defect_id: `DF-${pad(dfSeq++, 5)}`, event_id: `EV-${pad(rint(700000, 700999), 6)}`, defect_code: pick(DEFECT_CODES)[0], qty: rint(1, 9), detected_ts: t });
}
defects.sort((a, b) => a.detected_ts - b.detected_ts || (a.defect_id < b.defect_id ? -1 : 1));
// Orphaned rework (its defect row never arrived).
for (let i = 0; i < 3; i++) {
  const s = addMin(addDays(START, rint(2, 12)), rint(0, 1439));
  rework.push({ rework_id: `RW-${pad(rwSeq++, 4)}`, defect_id: `DF-${pad(90000 + i, 5)}`, started_at: s, finished_at: addMin(s, 40), outcome: 'fixed', labor_minutes: 40 });
}

// ── raw_suppliers (weekly snapshots → SCD2) ──
const SNAPSHOTS = ['2024-12-30', '2025-01-06', '2025-01-13', '2025-01-20'];
const SUPPLIER_BASE = [
  { code: 'SUP-001', name: 'Great Basin Metals', country: 'USA', rating: 'A', terms: 'NET30' },
  { code: 'SUP-002', name: 'Sierra Steel', country: 'USA', rating: 'A', terms: 'NET30' },
  { code: 'SUP-003', name: 'Cascade Alloys', country: 'Canada', rating: 'B', terms: 'NET30' },
  { code: 'SUP-004', name: 'Lone Star Coatings', country: 'USA', rating: 'B', terms: 'NET45' },
  { code: 'SUP-005', name: 'Monterrey Bearings', country: 'Mexico', rating: 'A', terms: 'NET30' },
  { code: 'SUP-006', name: 'Treasure Valley Fasteners', country: 'USA', rating: 'B', terms: 'NET30', from: '2025-01-06' }
];
const supplierRows = [];
for (const snap of SNAPSHOTS) {
  for (const s of SUPPLIER_BASE) {
    if (s.from && snap < s.from) continue;
    const row = { supplier_code: s.code, supplier_name: s.name, country: s.country, rating: s.rating, payment_terms: s.terms, snapshot_date: snap };
    if (s.code === 'SUP-003' && snap >= '2025-01-13') row.rating = 'C';                       // downgraded
    if (s.code === 'SUP-005' && snap >= '2025-01-06') row.payment_terms = 'NET45';            // renegotiated
    if (s.code === 'SUP-002' && snap >= '2025-01-20') row.supplier_name = 'Sierra Steel & Coil'; // renamed
    if (s.code === 'SUP-004' && snap === '2025-01-13') row.rating = 'A';                      // upgraded, then
    if (s.code === 'SUP-004' && snap === '2025-01-20') row.rating = 'B';                      // …back again
    supplierRows.push(row);
  }
}

// ── raw_deliveries (unit-of-measure mix-up lives here) ──
const SUPPLY = [
  { sup: 'SUP-001', part: 'MAT-ALU-01', uom: 'KG', cost: 2.75, qty: [1800, 2600] },
  { sup: 'SUP-003', part: 'MAT-ALU-01', uom: 'LB', cost: 1.21, qty: [4000, 5800] },   // ships & bills in pounds
  { sup: 'SUP-002', part: 'MAT-STL-01', uom: 'KG', cost: 1.10, qty: [5000, 9000] },
  { sup: 'SUP-004', part: 'MAT-PNT-01', uom: 'KG', cost: 9.40, qty: [120, 260] },
  { sup: 'SUP-005', part: 'CMP-BRG-01', uom: 'EA', cost: 3.60, qty: [800, 1600] },
  { sup: 'SUP-006', part: 'CMP-FST-01', uom: 'EA', cost: 0.85, qty: [2000, 5000] }
];
const deliveries = [];
let dlSeq = 1, po = 48110;
const DSTART = utc(2024, 12, 30);
for (let d = 0; d < 21; d++) {
  const day = addDays(DSTART, d);
  if (day.getUTCDay() === 0) continue;
  for (const s of SUPPLY) {
    if (s.sup === 'SUP-006' && ymd(day) < '2025-01-06') continue;
    if (rnd() > 0.36) continue;
    let uom = s.uom;
    if (rnd() < 0.18) uom = s.uom === 'KG' ? pick(['kg', 'Kg', 'KGS']) : s.uom === 'LB' ? pick(['lb', 'LBS', 'lbs']) : pick(['ea', 'EACH']);
    const whole = s.uom === 'EA';
    const qty = whole ? rint(s.qty[0], s.qty[1]) : Math.round((s.qty[0] + rnd() * (s.qty[1] - s.qty[0])) * 10) / 10;
    deliveries.push({
      delivery_id: `DL-${pad(dlSeq++, 4)}`, supplier_code: s.sup, part_no: s.part, qty, uom,
      unit_cost: Math.round(s.cost * (0.97 + rnd() * 0.06) * 100) / 100,
      delivered_at: ymd(day), po_number: `PO-${po++}`
    });
  }
}
// Deliveries booked against a supplier code that is in no snapshot.
for (const i of [7, 19, 33]) {
  if (deliveries[i]) deliveries[i].supplier_code = 'SUP-999';
}

// ── raw_downtime ──
const REASONS = ['changeover', 'changeover', 'breakdown', 'material shortage', 'planned maintenance'];
const downtime = [];
let dtSeq = 1;
for (const line of LINES) {
  const n = line.code === 'BOI-L1' ? 7 : rint(3, 5);
  for (let i = 0; i < n; i++) {
    // Die Cast 1 breaks down mostly in week 2 (same story as its scrap rate).
    const dayOff = line.code === 'BOI-L1' && i >= 2 ? rint(7, 13) : rint(0, 13);
    const s = addMin(addDays(START, dayOff), rint(13 * 60, 28 * 60));
    const mins = rint(18, 210);
    const reason = line.code === 'BOI-L1' && i >= 2 ? pick(['breakdown', 'breakdown', 'material shortage']) : pick(REASONS);
    downtime.push({ downtime_id: `DT-${pad(dtSeq++, 4)}`, line_code: line.code, started_at: s, ended_at: addMin(s, mins), reason });
  }
}
downtime.sort((a, b) => a.started_at - b.started_at);
downtime.forEach((d, i) => { d.downtime_id = `DT-${pad(i + 1, 4)}`; });
downtime[downtime.length - 1].ended_at = null;     // still down when the extract ran
downtime[downtime.length - 4].ended_at = null;

// ── raw_parts (with the mess a hand-maintained master list has) ──
const partRows = PARTS.map(([part_no, description, category, std_cost, unit_weight_kg]) => ({ part_no, description, category, std_cost, unit_weight_kg }));
partRows[2].category = 'Finished';
partRows[7].category = 'FINISHED';
partRows[13].category = 'Material';
partRows.push({ part_no: ' brk-1001', description: 'Brake bracket (old entry)', category: 'finished', std_cost: 3.95, unit_weight_kg: 0.62 });
partRows.push({ part_no: 'CST-3001 ', description: 'Motor housing', category: 'finished', std_cost: 61.00, unit_weight_kg: 11.20 });

// ── Emit ──
const q = v => v === null || v === undefined ? 'NULL'
  : typeof v === 'number' ? String(v)
  : v instanceof Date ? `'${sqlTs(v)}'`
  : `'${String(v).replace(/'/g, "''")}'`;

function table(name, cols, rows, chunk = 40) {
  const names = cols.map(c => c.name);
  const create = `CREATE TABLE ${name} (${cols.map(c => `${c.name} ${c.type}${c.pk ? ' PRIMARY KEY' : ''}`).join(', ')});`;
  const inserts = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const vals = rows.slice(i, i + chunk).map(r => `(${names.map(n => q(r[n])).join(',')})`).join(',\n        ');
    inserts.push(`INSERT INTO ${name} VALUES\n        ${vals};`);
  }
  const colsJs = cols.map(c => `{name:"${c.name}",type:"${c.type}"${c.pk ? ',pk:true' : ''}}`).join(',');
  const esc = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return `  ${name}: {\n    cols:[${colsJs}],\n    create:\`${esc(create)}\`,\n    insert:[\n${inserts.map(s => `      \`${esc(s)}\``).join(',\n')}\n    ]\n  }`;
}
const T = 'TEXT', I = 'INTEGER', R = 'REAL';
const c = (name, type, pk) => ({ name, type, pk: !!pk });

const out = [
  table('raw_plants', [c('plant_code', T, 1), c('plant_name', T), c('city', T), c('utc_offset_hours', I), c('ts_format', T)],
    PLANTS.map(p => ({ plant_code: p.code, plant_name: p.name, city: p.city, utc_offset_hours: p.offset, ts_format: p.fmt }))),
  table('raw_lines', [c('line_code', T, 1), c('plant_code', T), c('line_name', T), c('process', T), c('ideal_units_per_shift', I)],
    LINES.map(l => ({ line_code: l.code, plant_code: l.plant, line_name: l.name, process: l.process, ideal_units_per_shift: l.rate }))),
  table('raw_shifts', [c('shift_code', T, 1), c('shift_name', T), c('start_hour', I), c('end_hour', I)],
    SHIFTS.map(s => ({ shift_code: s.code, shift_name: s.name, start_hour: s.start, end_hour: s.end }))),
  table('raw_parts', [c('part_no', T), c('description', T), c('category', T), c('std_cost', R), c('unit_weight_kg', R)], partRows),
  table('raw_suppliers', [c('supplier_code', T), c('supplier_name', T), c('country', T), c('rating', T), c('payment_terms', T), c('snapshot_date', T)], supplierRows),
  table('raw_deliveries', [c('delivery_id', T, 1), c('supplier_code', T), c('part_no', T), c('qty', R), c('uom', T), c('unit_cost', R), c('delivered_at', T), c('po_number', T)], deliveries),
  table('raw_production_events', [c('event_id', T), c('line_code', T), c('part_no', T), c('event_ts', T), c('qty_good', I), c('qty_scrap', I), c('loaded_at', T)], eventRows),
  table('raw_defect_codes', [c('defect_code', T, 1), c('description', T), c('process', T), c('severity', T)],
    DEFECT_CODES.map(([defect_code, description, process, severity]) => ({ defect_code, description, process, severity }))),
  table('raw_defects', [c('defect_id', T, 1), c('event_id', T), c('defect_code', T), c('qty', I), c('detected_ts', T)], defects),
  table('raw_rework', [c('rework_id', T, 1), c('defect_id', T), c('started_at', T), c('finished_at', T), c('outcome', T), c('labor_minutes', I)], rework),
  table('raw_downtime', [c('downtime_id', T, 1), c('line_code', T), c('started_at', T), c('ended_at', T), c('reason', T)], downtime)
];

const header = `// SQL Quest — "Ridgeline Components" plant-floor warehouse (capstone dataset).
//
// GENERATED by tools/gen-warehouse.js — do not edit by hand; change the
// generator and re-run it. Loaded after data.js; adds the raw_* tables to the
// same \`schemas\` object the rest of the app seeds from.
//
// The mess is deliberate. Planted problems, by table:
//   raw_production_events  3 timestamp formats (one per plant), re-sent
//                          duplicates, corrected rows, late-arriving rows,
//                          sloppy part numbers, test rows, negative counts
//   raw_parts              duplicate / untrimmed / mixed-case keys & categories
//   raw_deliveries         KG vs LB (and sloppy unit labels), unknown suppliers
//   raw_suppliers          weekly snapshots — history must be rebuilt (SCD2)
//   raw_defects            orphaned event ids, sloppy and unknown defect codes
//   raw_rework             orphaned defect ids, inconsistent outcomes, open rows
//   raw_downtime           open-ended (NULL) intervals
`;
const file = `${header}\nObject.assign(schemas, {\n${out.join(',\n')}\n});\n`;
fs.writeFileSync(path.join(__dirname, '..', 'data-warehouse.js'), file);

console.log(`data-warehouse.js written (${(file.length / 1024).toFixed(1)} KB)`);
console.log(`events: ${events.length} true, ${eventRows.length} raw rows | defects ${defects.length} | rework ${rework.length} | deliveries ${deliveries.length} | suppliers ${supplierRows.length} | downtime ${downtime.length} | parts ${partRows.length}`);
