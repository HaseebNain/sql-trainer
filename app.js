// SQL Quest — application engine.

let db = null, currentLesson = null, currentDay = 0;
let xp = 0, completedLessons = new Set(), aiMessages = [], activeTab = 'results';
let lastResults = null;
let editor = null;
let currentExercise = null;
let completedExercises = new Set();
let queryHistory = [];

// Dialect lessons are two-step (SQLite for real, then a structural check of
// the Snowflake/BigQuery translation). Finished steps are remembered as
// "<lessonId>:sqlite" and "<lessonId>:<translateIndex>".
let translationsDone = new Set();
let translateMode = null;          // index into currentLesson.translate while translating, else null
let lastDiagnosis = '';            // plain-text summary of the latest wrong-answer explanation (AI tutor context)

// Python lessons (`lang: 'python'`, course-python-*.js) run on Pyodide via
// python.js instead of the SQL engine. Everything else — XP, streaks, the
// route, exercises, hints, the tutor — is shared.
function isPy(spec) { return !!spec && spec.lang === 'python'; }
let pyBusy = false;

// ── Gamification state ──
let streak = 0, lastActiveDate = null;
let queriesRun = 0, hintsUsed = 0, errorsMade = 0;
let combo = 0, bestCombo = 0;
let unlockedAchievements = new Set();
let dailyDoneDates = [];           // ISO dates on which the daily challenge was completed
let activeDates = [];              // ISO dates with any completed lesson/exercise (drives the week lamps)

// Interface icons (inline SVG, so the app stays offline and themeable).
const ICONS = (() => {
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  return {
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: svg('<path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z"/>'),
    sound: svg('<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
    mute: svg('<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
    keys: svg('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/>'),
    trophy: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    flame: svg('<path d="M12 21.5c3.9 0 6.5-2.7 6.5-6.3 0-2.6-1.5-4.4-2.6-6.2-.9 1.5-1.7 2.3-2.7 2.6.2-3-.9-5.8-3.7-8.6.1 3.6-4 5.6-4 11.6 0 4 2.6 6.9 6.5 6.9z"/>')
  };
})();
let soundOn = localStorage.getItem('sql_bootcamp_sound') !== 'off';

const PROGRESS_KEY = 'sql_bootcamp_progress';
const QUERY_HISTORY_KEY = 'sql_bootcamp_query_history';

// ── Version & update check ──
// Bump APP_VERSION and version.json together on every release. The app is
// offline-first; the update check is a best-effort network call that fails
// silently when offline.
const APP_VERSION = '1.3.0';
const REPO_URL = 'https://github.com/HaseebNain/sql-trainer';
const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/HaseebNain/sql-trainer/master/version.json';

// ── Levels (calibrated to ~8,700 XP available across all 48 days — ~7,000 in
// the SQL days, ~1,700 in the Python days — before combo / daily / interview
// bonuses) ──
const LEVELS = [
  { xp: 0,    title: "Row Rookie" },
  { xp: 60,   title: "SELECT Apprentice" },
  { xp: 150,  title: "Filter Fanatic" },
  { xp: 280,  title: "Aggregation Adept" },
  { xp: 450,  title: "JOIN Journeyman" },
  { xp: 670,  title: "Subquery Sorcerer" },
  { xp: 950,  title: "Window Wizard" },
  { xp: 1300, title: "CTE Commander" },
  { xp: 1700, title: "Pipeline Builder" },
  { xp: 2150, title: "Analytics Ace" },
  { xp: 2650, title: "Query Architect" },
  { xp: 3200, title: "Data Engineer" },
  { xp: 3900, title: "Staff Data Engineer" },
  { xp: 4700, title: "Analytics Engineer" },
  { xp: 5500, title: "Principal Data Engineer" },
  { xp: 6400, title: "Warehouse Architect" },
  { xp: 7400, title: "Distinguished Data Engineer" },
  { xp: 8500, title: "Two-Language Data Engineer" }
];

// ── Achievements ──
const ACHIEVEMENTS = [
  { id:"first-query",   icon:"👋", name:"Hello, Database",     desc:"Run your very first query.",                         when:() => queriesRun >= 1 },
  { id:"first-lesson",  icon:"🌱", name:"First Steps",         desc:"Complete your first lesson.",                        when:() => completedLessons.size >= 1 },
  { id:"day1",          icon:"📗", name:"Basics Locked In",    desc:"Complete every lesson in Day 1.",                    when:() => dayComplete(1) },
  { id:"join-master",   icon:"🔗", name:"JOIN Master",         desc:"Complete Day 4 and Day 11 — all things JOINs.",      when:() => dayComplete(4) && dayComplete(11) },
  { id:"window-wizard", icon:"🪟", name:"Window Wizard",       desc:"Complete Day 6 and Day 14 — window functions.",      when:() => dayComplete(6) && dayComplete(14) },
  { id:"ten-lessons",   icon:"📚", name:"Bookworm",            desc:"Complete 10 lessons.",                               when:() => completedLessons.size >= 10 },
  { id:"halfway",       icon:"⛰️", name:"Halfway There",       desc:"Complete 50% of the SQL track's lessons.",           when:() => { const p = trackLessonStats('sql'); return p.done >= Math.ceil(p.total / 2); } },
  { id:"graduate",      icon:"🎓", name:"Graduate",            desc:"Complete every lesson in the SQL track.",            when:() => trackComplete('sql') },
  { id:"first-ex",      icon:"💪", name:"Extra Credit",        desc:"Complete your first practice exercise.",             when:() => completedExercises.size >= 1 },
  { id:"25-ex",         icon:"🏋️", name:"Practice Makes Perfect", desc:"Complete 25 practice exercises.",                 when:() => completedExercises.size >= 25 },
  { id:"all-ex",        icon:"💯", name:"Completionist",       desc:"Complete every practice exercise in the SQL track.", when:() => { const p = trackExerciseStats('sql'); return p.done >= p.total; } },
  { id:"combo-5",       icon:"🔥", name:"On Fire",             desc:"Reach a 5× solve combo — no hints, no errors.",      when:() => bestCombo >= 5 },
  { id:"combo-10",      icon:"⚡", name:"Unstoppable",         desc:"Reach a 10× solve combo.",                           when:() => bestCombo >= 10 },
  { id:"streak-3",      icon:"📅", name:"Habit Forming",       desc:"Keep a 3-day learning streak.",                      when:() => streak >= 3 },
  { id:"streak-7",      icon:"🗓️", name:"Week Warrior",        desc:"Keep a 7-day learning streak.",                      when:() => streak >= 7 },
  { id:"queries-100",   icon:"💻", name:"Century Club",        desc:"Run 100 queries.",                                   when:() => queriesRun >= 100 },
  { id:"debugger",      icon:"🐛", name:"Debugger",            desc:"Hit 10 SQL errors. Breaking things is learning.",    when:() => errorsMade >= 10 },
  { id:"daily-1",       icon:"🎯", name:"Challenger",          desc:"Complete your first Daily Challenge.",               when:() => dailyDoneDates.length >= 1 },
  { id:"daily-5",       icon:"🏹", name:"Daily Devotee",       desc:"Complete 5 Daily Challenges.",                       when:() => dailyDoneDates.length >= 5 },
  { id:"night-owl",     icon:"🦉", name:"Night Owl",           desc:"Complete something between midnight and 5am.",       when:() => { const h = new Date().getHours(); return h >= 0 && h < 5 && (completedLessons.size + completedExercises.size) > 0; } },
  { id:"schema-sculptor", icon:"🏗️", name:"Schema Sculptor",   desc:"Complete Day 22 — DDL, transactions and upserts.",   when:() => dayComplete(22) },
  { id:"modeler",       icon:"⭐", name:"Dimensional Modeler",  desc:"Complete Days 23 and 24 — views and star schemas.",  when:() => dayComplete(23) && dayComplete(24) },
  { id:"tuner",         icon:"⚙️", name:"Query Tuner",          desc:"Complete Day 25 — indexes and query plans.",         when:() => dayComplete(25) },
  { id:"pipeline-pro",  icon:"🔄", name:"Pipeline Pro",         desc:"Complete Days 26 and 27 — incremental loads and data quality.", when:() => dayComplete(26) && dayComplete(27) },
  { id:"gauntlet",      icon:"⚔️", name:"Interview Slayer",     desc:"Complete Day 28 — the interview gauntlet.",          when:() => dayComplete(28) },
  { id:"architect",     icon:"🏛️", name:"Data Architect",       desc:"Complete the entire Data Engineer track (Days 22–28).", when:() => [22,23,24,25,26,27,28].every(dayComplete) },
  { id:"polyglot",      icon:"🗣️", name:"Polyglot",             desc:"Complete Days 29–31 — Snowflake and BigQuery dialects.", when:() => [29,30,31].every(dayComplete) },
  { id:"mess-tamer",    icon:"🧽", name:"Mess Tamer",           desc:"Complete Days 32–34 — profile, stage and quarantine the raw plant data.", when:() => [32,33,34].every(dayComplete) },
  { id:"wh-builder",    icon:"🏭", name:"Warehouse Builder",    desc:"Complete Days 35–37 — dimensions, facts and the incremental load.", when:() => [35,36,37].every(dayComplete) },
  { id:"shipped",       icon:"🚢", name:"Shipped It",           desc:"Finish the capstone — the whole plant-floor warehouse (Days 32–39).", when:() => [32,33,34,35,36,37,38,39].every(dayComplete) },
  { id:"py-hello",      icon:"🐍", name:"Hello, Python",        desc:"Complete your first Python lesson.",                  when:() => ALL_DAYS.some(d => d.lessons.some(l => isPy(l) && completedLessons.has(l.id))) },
  { id:"py-day1",       icon:"🖨️", name:"First Program",        desc:"Python track: complete Day 1 — print, variables, numbers and types.", when:() => dayComplete(101) },
  { id:"py-scratch-half", icon:"🧱", name:"Thinking in Steps",   desc:"Python track: complete Days 1–4 — values, text, decisions and loops.", when:() => [101,102,103,104].every(dayComplete) },
  { id:"py-collector",  icon:"🧺", name:"Collector",            desc:"Python track: complete Days 5 and 6 — lists, dictionaries, sets and tuples.", when:() => dayComplete(105) && dayComplete(106) },
  { id:"py-functions",  icon:"🧩", name:"Function Author",      desc:"Python track: complete Day 7 — functions of your own.", when:() => dayComplete(107) },
  { id:"py-scratch-done", icon:"🎒", name:"From Scratch",        desc:"Finish the whole Python track — from print() to a program that reads a file.", when:() => trackComplete('python') },
  { id:"pythonista",    icon:"🧪", name:"Pythonista",           desc:"Complete Days 40–43 — the Python language itself.",   when:() => [40,41,42,43].every(dayComplete) },
  { id:"file-wrangler", icon:"🗂️", name:"File Wrangler",        desc:"Complete Days 44–45 — errors, dates, CSV and JSON.",  when:() => [44,45].every(dayComplete) },
  { id:"py-pipeline",   icon:"🛠️", name:"Pipeline in Production", desc:"Complete Days 46–47 — Python driving SQL, and an idempotent pipeline end to end.", when:() => [46,47].every(dayComplete) },
  { id:"bilingual",     icon:"🌐", name:"Two Languages",        desc:"Finish the whole Python track (Days 40–48).",         when:() => [40,41,42,43,44,45,46,47,48].every(dayComplete) },
  { id:"interview-1",   icon:"🎤", name:"In the Hot Seat",      desc:"Finish your first mock interview.",                   when:() => typeof Interview !== 'undefined' && Interview.stats().count >= 1 },
  { id:"hire-signal",   icon:"🤝", name:"Strong Hire",          desc:"Score 85 or higher in a mock interview.",             when:() => typeof Interview !== 'undefined' && Interview.stats().best >= 85 },
];

// ── Career readiness: map curriculum days to data-engineer job skills ──
const SKILL_TRACKS = [
  { name:"Core Querying",           icon:"🔍", days:[1,2],          blurb:"SELECT, WHERE, ORDER BY, LIMIT — the bread and butter of every interview screen." },
  { name:"Aggregation & Grouping",  icon:"📊", days:[3,13],         blurb:"GROUP BY, HAVING, ROLLUP-style reporting. Asked in virtually every DE interview." },
  { name:"Joins & Set Operations",  icon:"🔗", days:[4,11,12],      blurb:"INNER/LEFT/self joins, anti-joins, UNION/EXCEPT. The #1 SQL interview topic." },
  { name:"Subqueries & CTEs",       icon:"🧩", days:[5,15],         blurb:"Correlated subqueries, WITH clauses, recursion. How production pipelines are structured." },
  { name:"Window Functions",        icon:"🪟", days:[6,14],         blurb:"ROW_NUMBER, LAG/LEAD, running totals. The senior-level differentiator." },
  { name:"Data Quality & Types",    icon:"🧹", days:[8,9,10,16],    blurb:"NULL handling, strings, dates, dedup & cleaning — 80% of a real DE's day." },
  { name:"Analytics Engineering",   icon:"📈", days:[7,17,18,19,20,21], blurb:"Pivots, cohorts, funnels, RFM, KPIs — the portfolio-grade work that gets you hired." },
  { name:"Modeling & DDL",          icon:"🏗️", days:[22,23,24],     blurb:"CREATE TABLE, views, star schemas, facts & dims — how warehouses are actually structured." },
  { name:"Performance Tuning",      icon:"⚙️", days:[25],           blurb:"Indexes, EXPLAIN QUERY PLAN, sargable predicates — why queries are slow and how to fix them." },
  { name:"ELT & Data Quality",      icon:"🔄", days:[26,27],        blurb:"Incremental loads, upserts, SCD2, dedup, and dbt-style data tests — the daily job of a DE." },
  { name:"Interview Readiness",     icon:"⚔️", days:[28],           blurb:"Top-N per group, gaps & islands, dedup classics — the exact patterns interviewers ask." },
  { name:"Warehouse Dialects",      icon:"🗣️", days:[29,30,31],     blurb:"QUALIFY, MERGE, UNNEST / FLATTEN, date functions — writing the same query for Snowflake and BigQuery." },
  { name:"Warehouse Build (Capstone)", icon:"🏭", days:[32,33,34,35,36,37,38,39], blurb:"Raw → staging → dims & facts → marts on messy plant-floor data, with an incremental load and data tests. The actual job." },
  { name:"Python Fundamentals",     icon:"🐍", days:[40,41,42,43],  blurb:"Variables, control flow, lists / dicts / sets, functions and comprehensions — the Python every DE posting lists next to SQL." },
  { name:"Python for Data",         icon:"🗂️", days:[44,45],        blurb:"Exceptions and validation, dates, the standard library, CSV and JSON — reading the messy files pipelines start from." },
  { name:"Python Pipelines & pandas", icon:"🛠️", days:[46,47,48],   blurb:"sqlite3 with parameters and transactions, generators, an idempotent extract-validate-load job, and pandas mapped onto SQL." },
  // The Python track (course-python-scratch.js). Only the active track's rows are shown.
  { name:"Values & Text",           icon:"🔤", days:[101,102],      blurb:"Variables, numbers, types, f-strings, string methods and slicing — the vocabulary every program is written in." },
  { name:"Logic & Loops",           icon:"🔁", days:[103,104],      blurb:"Comparisons, if / elif / else, for and while — how a program decides and repeats." },
  { name:"Collections",             icon:"🧺", days:[105,106],      blurb:"Lists, dictionaries, sets and tuples, and the list-of-dictionaries shape that real data comes in." },
  { name:"Functions & Programs",    icon:"🧩", days:[107,108],      blurb:"Writing your own functions, handling errors, importing modules, reading files — and a complete program at the end." }
];

// ── Tracks ──
// The app holds two courses and shows one at a time; the switch in the top bar
// picks which. A day belongs to the SQL track unless it says `track: 'python'`
// (course-python-scratch.js). `curriculum` always holds just the active
// track's days — applyTrack() refills it in place — so the route, the course
// map, Today, the daily challenge and the progress counts follow the switch
// without knowing about it. XP, level, streak and achievements are shared.
// ALL_DAYS is every day of both tracks, for the things that must not depend on
// which track is showing (achievements, finding a saved lesson).
const ALL_DAYS = curriculum.slice();
const TRACK_KEY = 'sql_bootcamp_track';
const TRACK_POS_KEY = 'sql_bootcamp_track_pos';
const TRACKS = {
  sql:    { label: 'SQL',    name: 'SQL Quest',    mark: 'SQL', sub: 'Zero to data engineer' },
  python: { label: 'Python', name: 'Python Quest', mark: 'PY',  sub: 'Python from scratch' }
};
let activeTrack = 'sql';
let trackPos = {};                 // track → id of the lesson last open on it
function trackOf(day) { return (day && day.track) || 'sql'; }
function trackDays(t) { return ALL_DAYS.filter(d => trackOf(d) === t); }
// The day number the learner sees: Python-track days are numbered from 1.
function dayNo(day) { return day.num || day.day; }
function applyTrack() { curriculum.length = 0; curriculum.push(...trackDays(activeTrack)); }
function trackComplete(t) { return trackDays(t).every(d => d.lessons.every(l => completedLessons.has(l.id))); }
function trackLessonStats(t) {
  const lessons = trackDays(t).flatMap(d => d.lessons);
  return { done: lessons.filter(l => completedLessons.has(l.id)).length, total: lessons.length };
}
function trackExerciseStats(t) {
  const exs = trackDays(t).flatMap(d => d.lessons).flatMap(l => l.exercises || []);
  return { done: exs.filter(e => completedExercises.has(e.id)).length, total: exs.length };
}

// Counts for the active track (what the progress bars and "n of m" lines show).
function totalLessonCount()  { return curriculum.reduce((n, d) => n + d.lessons.length, 0); }
function totalExerciseCount(){ return curriculum.reduce((n, d) => n + d.lessons.reduce((m, l) => m + (l.exercises ? l.exercises.length : 0), 0), 0); }
function doneLessonCount()   { return trackLessonStats(activeTrack).done; }
function doneExerciseCount() { return trackExerciseStats(activeTrack).done; }
function dayComplete(dayNum) {
  const day = ALL_DAYS.find(d => d.day === dayNum);
  return !!day && day.lessons.every(l => completedLessons.has(l.id));
}

function loadTrackState(savedLessonId) {
  try { trackPos = JSON.parse(localStorage.getItem(TRACK_POS_KEY) || '{}') || {}; } catch { trackPos = {}; }
  let t = null;
  try { t = localStorage.getItem(TRACK_KEY); } catch {}
  if (!TRACKS[t]) {
    // Saves from before tracks existed: stay on the track the open lesson is on.
    const day = savedLessonId && ALL_DAYS.find(d => d.lessons.some(l => l.id === savedLessonId));
    t = trackOf(day);
  }
  activeTrack = t;
  applyTrack();
}
function saveTrackState() {
  try {
    localStorage.setItem(TRACK_KEY, activeTrack);
    localStorage.setItem(TRACK_POS_KEY, JSON.stringify(trackPos));
  } catch {}
}
// Where to land on the active track: the lesson last open there, else the
// first unfinished one.
function startLessonForTrack(fallbackId) {
  const all = curriculum.flatMap(d => d.lessons);
  return all.find(l => l.id === trackPos[activeTrack]) || (fallbackId && all.find(l => l.id === fallbackId)) ||
    all.find(l => !completedLessons.has(l.id)) || all[0];
}
function updateTrackUI() {
  const t = TRACKS[activeTrack];
  document.body.dataset.track = activeTrack;
  for (const id of Object.keys(TRACKS)) {
    const btn = document.getElementById('track-' + id);
    if (!btn) continue;
    btn.classList.toggle('active', id === activeTrack);
    btn.setAttribute('aria-pressed', id === activeTrack ? 'true' : 'false');
  }
  document.getElementById('logo-mark').textContent = t.mark;
  document.getElementById('logo-name').textContent = t.name;
  document.getElementById('logo-sub').textContent = t.sub;
  document.title = activeTrack === 'python' ? 'Python Quest — Python from scratch' : 'SQL Quest — SQL & Python, Zero to Data Engineer';
}
function setTrack(t) {
  if (!TRACKS[t] || t === activeTrack || pyBusy) return;
  stashPyDraft();
  activeTrack = t;
  applyTrack();
  updateTrackUI();
  loadLesson(startLessonForTrack());   // also saves the track and the place on it
  updateDailyBtn();
  if (activeTrack === 'python' && trackLessonStats('python').done === 0) {
    showToast('🐍', 'Python track', 'Python from scratch', 'No SQL or programming needed. Your SQL progress is kept — switch back any time.');
  }
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

// ── Sound (tiny WebAudio synth, no assets) ──
let audioCtx = null;
function playSound(type) {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = {
      correct:     [[523.25, 0, 0.09], [659.25, 0.08, 0.09], [783.99, 0.16, 0.16]],
      exercise:    [[587.33, 0, 0.08], [880.00, 0.07, 0.14]],
      levelup:     [[523.25, 0, 0.12], [659.25, 0.1, 0.12], [783.99, 0.2, 0.12], [1046.5, 0.3, 0.3]],
      achievement: [[783.99, 0, 0.1], [987.77, 0.09, 0.2]],
      error:       [[196.00, 0, 0.15]]
    }[type] || [];
    for (const [freq, delay, dur] of notes) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type === 'error' ? 'sawtooth' : 'sine';
      o.frequency.value = freq;
      const t = audioCtx.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(type === 'error' ? 0.04 : 0.08, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    }
  } catch {}
}
function toggleSound() {
  soundOn = !soundOn;
  localStorage.setItem('sql_bootcamp_sound', soundOn ? 'on' : 'off');
  document.getElementById('sound-btn').innerHTML = soundOn ? ICONS.sound : ICONS.mute;
  if (soundOn) playSound('exercise');
}

// ── Confetti ──
let confettiParts = [], confettiRunning = false;
function burstConfetti(big) {
  const canvas = document.getElementById('confetti-canvas');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const colors = ['#5b7fff', '#9a69f5', '#2bd688', '#f0a832', '#35d0f5', '#ff5454'];
  const count = big ? 160 : 70;
  for (let i = 0; i < count; i++) {
    confettiParts.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: big ? canvas.height / 2 : 80,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 3,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      life: 1
    });
  }
  if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(confettiTick); }
}
function confettiTick() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiParts = confettiParts.filter(p => p.life > 0 && p.y < canvas.height + 20);
  for (const p of confettiParts) {
    p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.008;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  if (confettiParts.length) requestAnimationFrame(confettiTick);
  else { confettiRunning = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

// ── Toasts ──
function showToast(icon, kicker, title, desc) {
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div class="toast-icon">${icon}</div><div><div class="toast-kicker">${kicker}</div><div class="toast-title">${title}</div><div class="toast-desc">${desc}</div></div>`;
  stack.appendChild(el);
  setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 380); }, 4200);
}

// ── Levels & XP ──
function levelForXp(x) {
  let lvl = 0;
  for (let i = 0; i < LEVELS.length; i++) if (x >= LEVELS[i].xp) lvl = i;
  return lvl;
}
function updateXPDisplay() {
  const lvl = levelForXp(xp);
  document.getElementById('xp-display').textContent = `${xp.toLocaleString()} XP`;
  document.getElementById('level-badge').textContent = lvl + 1;
  document.getElementById('level-title').textContent = LEVELS[lvl].title;
  const cur = LEVELS[lvl].xp;
  const next = LEVELS[lvl + 1] ? LEVELS[lvl + 1].xp : null;
  const pct = next === null ? 100 : Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100));
  document.getElementById('level-bar-fill').style.width = pct + '%';
}
function comboMultiplier() {
  if (combo >= 10) return 2;
  if (combo >= 5)  return 1.5;
  if (combo >= 3)  return 1.25;
  return 1;
}
function updateComboDisplay() {
  const el = document.getElementById('combo-ind');
  if (combo >= 2) {
    const mult = comboMultiplier();
    el.className = 'combo-ind show' + (combo >= 5 ? ' blazing' : '');
    el.textContent = `🔥 ${combo}× combo` + (mult > 1 ? ` · ${mult}× XP` : '');
  } else {
    el.className = 'combo-ind';
  }
}
function breakCombo() {
  if (combo >= 3) showToast('💔', 'Combo lost', `${combo}× combo broken`, 'Solve without hints or errors to build it back up.');
  combo = 0;
  updateComboDisplay();
}
function floatXP(amount, mult) {
  const el = document.createElement('div');
  el.className = 'float-xp';
  el.innerHTML = `+${amount} XP` + (mult > 1 ? ` <span class="mult">${mult}× combo!</span>` : '');
  const btn = document.querySelector('.btn-primary');
  const r = btn ? btn.getBoundingClientRect() : { left: window.innerWidth / 2, top: 120 };
  el.style.left = (r.left - 20) + 'px';
  el.style.top = (r.top - 8) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
function awardXP(base) {
  const prevLevel = levelForXp(xp);
  combo++;
  if (combo > bestCombo) bestCombo = combo;
  const mult = comboMultiplier();
  const total = Math.round(base * mult);
  xp += total;
  updateXPDisplay();
  updateComboDisplay();
  floatXP(total, mult);
  bumpStreak();
  const newLevel = levelForXp(xp);
  if (newLevel > prevLevel) showLevelUp(newLevel);
  checkAchievements();
  saveProgress();
  return total;
}
function showLevelUp(lvl) {
  const overlay = document.getElementById('levelup-overlay');
  document.getElementById('levelup-card').innerHTML = `
    <div class="levelup-badge">${lvl + 1}</div>
    <div class="levelup-kicker">Level Up</div>
    <div class="levelup-name">${LEVELS[lvl].title}</div>
    <div style="font-size:13px;color:var(--text2)">${LEVELS[lvl + 1] ? `${(LEVELS[lvl + 1].xp - xp).toLocaleString()} XP to ${LEVELS[lvl + 1].title}` : 'Maximum level reached. Go get that job.'}</div>
    <div class="levelup-hint">Click anywhere to continue</div>`;
  overlay.classList.remove('hidden');
  overlay.onclick = () => overlay.classList.add('hidden');
  burstConfetti(true);
  playSound('levelup');
}

// ── Streak ──
function bumpStreak() {
  const today = todayStr();
  if (lastActiveDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  streak = (lastActiveDate === yesterday) ? streak + 1 : 1;
  lastActiveDate = today;
  if (!activeDates.includes(today)) activeDates = activeDates.concat(today).slice(-120);
  updateStreakDisplay();
  if (streak > 1) showToast('🔥', 'Streak', `${streak}-day streak!`, 'Come back tomorrow to keep it alive.');
}
function updateStreakDisplay() {
  // A streak only counts if it's still alive (active today or yesterday)
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const alive = lastActiveDate === today || lastActiveDate === yesterday;
  const shown = alive ? streak : 0;
  const el = document.getElementById('streak-pill');
  el.innerHTML = `${ICONS.flame}<span>${shown}</span>`;
  el.className = 'streak-pill' + (shown >= 2 ? ' hot' : '');
}

// ── Achievements ──
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (unlockedAchievements.has(a.id)) continue;
    let ok = false;
    try { ok = a.when(); } catch {}
    if (ok) {
      unlockedAchievements.add(a.id);
      showToast(a.icon, 'Achievement unlocked', a.name, a.desc);
      playSound('achievement');
      burstConfetti(false);
    }
  }
  saveProgress();
}
function openAchievements() {
  const unlocked = ACHIEVEMENTS.filter(a => unlockedAchievements.has(a.id));
  const html = `
    <div class="modal-header">
      <div class="modal-title">🏆 Achievements</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-sub">${unlocked.length} of ${ACHIEVEMENTS.length} unlocked</div>
    <div class="ach-grid">
      ${ACHIEVEMENTS.map(a => {
        const has = unlockedAchievements.has(a.id);
        return `<div class="ach-card ${has ? 'unlocked' : 'locked'}">
          <div class="ach-card-icon">${has ? a.icon : '🔒'}</div>
          <div><div class="ach-card-name">${a.name}</div><div class="ach-card-desc">${a.desc}</div></div>
        </div>`;
      }).join('')}
    </div>`;
  openModal(html);
}

// ── Career readiness ──
function trackProgress(track) {
  const lessons = curriculum.filter(d => track.days.includes(d.day)).flatMap(d => d.lessons);
  const done = lessons.filter(l => completedLessons.has(l.id)).length;
  return { done, total: lessons.length, pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}
function openCareerModal() {
  const total = totalLessonCount();
  const doneLessons = doneLessonCount();
  const readiness = Math.round((doneLessons / total) * 100);
  const lvl = levelForXp(xp);
  const circumference = 2 * Math.PI * 34;
  const pyTrack = activeTrack === 'python';
  const dayLabels = t => t.days.map(n => { const d = ALL_DAYS.find(x => x.day === n); return d ? dayNo(d) : n; }).join(', ');
  const verdict = pyTrack ? (
    readiness >= 100 ? "<strong>You can program.</strong> Variables, decisions, loops, collections, functions and files are the whole foundation — everything else in Python is built from them. Switch to the SQL track next: its Days 40–48 show Python driving a database." :
    readiness >= 60  ? "<strong>The hard part is behind you.</strong> You can already read most beginner Python. Functions and files turn what you know into real programs." :
    readiness >= 25  ? "<strong>It's starting to click.</strong> Loops and lists are where programming begins to feel powerful — keep going." :
                       "<strong>Early days.</strong> Everyone who writes code started with print(). A lesson a day is enough.") :
    readiness >= 100 ? "<strong>Interview-ready.</strong> You've covered everything a junior data engineer screen will throw at you — joins, windows, CTEs, and real analytics patterns. Start applying and rebuild these queries from memory as prep." :
    readiness >= 75  ? "<strong>Almost there.</strong> You can already pass most SQL screens. Close out the remaining analytics tracks — cohorts, funnels and KPIs are what separate you from other candidates." :
    readiness >= 40  ? "<strong>Solid foundation.</strong> Core querying is in place. Window functions and CTEs are the next big interview differentiators — keep pushing." :
                       "<strong>Early days.</strong> Every data engineer started exactly here. Consistency beats intensity — one day tab at a time, keep the streak alive.";
  const html = `
    <div class="modal-header">
      <div class="modal-title">📈 ${pyTrack ? 'Python Readiness' : 'Data Engineer Readiness'}</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="readiness-ring-wrap">
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="8"/>
        <circle cx="42" cy="42" r="34" fill="none" stroke="url(#readGrad)" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - readiness / 100)}"
          transform="rotate(-90 42 42)"/>
        <defs><linearGradient id="readGrad"><stop offset="0%" stop-color="#5b7fff"/><stop offset="100%" stop-color="#2bd688"/></linearGradient></defs>
        <text x="42" y="47" text-anchor="middle" class="readiness-num">${readiness}%</text>
      </svg>
      <div class="readiness-blurb">${verdict}</div>
    </div>
    <div class="career-stats">
      <div class="cstat"><div class="cstat-num">Lv ${lvl + 1}</div><div class="cstat-label">${LEVELS[lvl].title}</div></div>
      <div class="cstat"><div class="cstat-num">${doneLessons}/${total}</div><div class="cstat-label">Lessons</div></div>
      <div class="cstat"><div class="cstat-num">${doneExerciseCount()}/${totalExerciseCount()}</div><div class="cstat-label">Exercises</div></div>
      <div class="cstat"><div class="cstat-num">${queriesRun.toLocaleString()}</div><div class="cstat-label">Queries run</div></div>
    </div>
    ${SKILL_TRACKS.filter(t => curriculum.some(d => t.days.includes(d.day))).map(t => {
      const p = trackProgress(t);
      return `<div class="skill-row">
        <div class="skill-row-top"><span class="skill-name">${t.icon} ${t.name}</span><span class="skill-pct">${p.done}/${p.total} · ${p.pct}%</span></div>
        <div class="skill-bar"><div class="skill-bar-fill${p.pct === 100 ? ' maxed' : ''}" style="width:${p.pct}%"></div></div>
        <div class="skill-days">Days ${dayLabels(t)} — ${t.blurb}</div>
      </div>`;
    }).join('')}`;
  openModal(html);
}

function openModal(html, opts) {
  const box = document.getElementById('modal-box');
  box.className = 'modal' + (opts && opts.wide ? ' wide' : '');
  box.innerHTML = html;
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  overlay.onclick = e => { if (e.target === overlay) closeModal(); };
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Daily Challenge (date-seeded, double XP) ──
function getDailyChallenge() {
  const pool = [];
  curriculum.forEach(d => d.lessons.forEach(l => (l.exercises || []).forEach(ex => pool.push({ ex, lesson: l }))));
  if (!pool.length) return null;
  const s = todayStr();
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}
function isDailyDone() { return dailyDoneDates.includes(todayStr()); }
function updateDailyBtn() {
  const btn = document.getElementById('daily-btn');
  if (isDailyDone()) { btn.className = 'daily-btn done'; btn.textContent = 'Daily done'; }
  else { btn.className = 'daily-btn'; btn.textContent = 'Daily challenge'; }
}
function startDailyChallenge() {
  const dc = getDailyChallenge();
  if (!dc) return;
  if (isDailyDone()) { showToast('🎯', 'Daily Challenge', 'Already conquered today!', 'A new challenge unlocks at midnight.'); return; }
  const dayIdx = curriculum.findIndex(d => d.lessons.includes(dc.lesson));
  currentDay = dayIdx;
  loadLesson(dc.lesson);
  loadExercise(dc.ex);
  showToast('🎯', 'Daily Challenge', 'Double XP on the line', `From "${dc.lesson.title}". Solve it to keep your streak burning.`);
}
function handleDailyCompletion(ex) {
  const dc = getDailyChallenge();
  if (!dc || dc.ex.id !== ex.id || isDailyDone()) return 0;
  dailyDoneDates.push(todayStr());
  updateDailyBtn();
  const bonus = ex.xp; // doubles the exercise's XP
  const prevLevel = levelForXp(xp);
  xp += bonus;
  updateXPDisplay();
  if (levelForXp(xp) > prevLevel) showLevelUp(levelForXp(xp));
  showToast('🎯', 'Daily Challenge complete', `+${bonus} bonus XP`, 'Come back tomorrow for a fresh one.');
  burstConfetti(false);
  saveProgress();
  return bonus;
}

// ── Updates ──
let updateInfo = { checking: false, checked: false, available: false, latest: null, notes: '', error: null };

function compareVersions(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

// Best-effort check against version.json on GitHub. Silent mode is used on
// startup and never surfaces errors; the manual check re-renders the modal.
async function checkForUpdate(opts) {
  const silent = opts && opts.silent;
  if (updateInfo.checking) return;
  updateInfo.checking = true;
  updateInfo.error = null;
  if (!silent) renderUpdateModal();
  try {
    const resp = await fetch(UPDATE_CHECK_URL, { cache: 'no-store' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    updateInfo.latest = String(data.version || '').trim();
    updateInfo.notes = data.notes || '';
    updateInfo.available = !!updateInfo.latest && compareVersions(updateInfo.latest, APP_VERSION) > 0;
    updateInfo.checked = true;
    const btn = document.getElementById('ver-btn');
    const label = document.getElementById('ver-label');
    if (btn) btn.classList.toggle('has-update', updateInfo.available);
    if (label) label.textContent = updateInfo.available ? `Update to v${updateInfo.latest} ⬆` : `v${APP_VERSION}`;
    if (updateInfo.available && silent) {
      showToast('⬆', 'Update available', `Version ${updateInfo.latest} is out`, 'Open the version badge in the top bar to update.');
    }
  } catch (e) {
    updateInfo.error = (e && e.message) || 'network error';
  } finally {
    updateInfo.checking = false;
    // Only re-render if the modal is actually open (user didn't close it).
    if (!silent && !document.getElementById('modal-overlay').classList.contains('hidden')) renderUpdateModal();
  }
}

function renderUpdateModal() {
  let body;
  if (updateInfo.checking) {
    body = `<div class="feedback-box feedback-info"><div class="feedback-label">Checking…</div>Contacting GitHub for the latest version.</div>`;
  } else if (updateInfo.error) {
    body = `<div class="feedback-box feedback-info"><div class="feedback-label">Couldn't check for updates</div>Couldn't reach GitHub (${escapeHtml(updateInfo.error)}). This app runs fully offline — you only need to update when you're online.</div>`;
  } else if (updateInfo.available) {
    body = `<div class="feedback-box feedback-success"><div class="feedback-label">⬆ Version ${escapeHtml(updateInfo.latest)} is available</div>You're on v${APP_VERSION}.${updateInfo.notes ? ' ' + escapeHtml(updateInfo.notes) : ''}</div>
      <div class="update-how">
        <div class="update-how-title">How to update</div>
        <div><strong>Git:</strong> run <code>git pull</code> in the project folder.</div>
        <div><strong>Or download:</strong> grab the latest from GitHub and replace your files.</div>
        <div style="margin-top:6px;color:var(--text3)">Then hard-reload the page — <span class="kbd">Ctrl</span> <span class="kbd">Shift</span> <span class="kbd">R</span>. Your XP and progress are saved in this browser and are kept.</div>
      </div>`;
  } else if (updateInfo.checked) {
    body = `<div class="feedback-box feedback-success"><div class="feedback-label">✓ Up to date</div>You're running the latest version (v${APP_VERSION}).</div>`;
  } else {
    body = `<div class="feedback-box feedback-info"><div class="feedback-label">v${APP_VERSION}</div>Check GitHub to see whether a newer version is available.</div>`;
  }
  openModal(`
    <div class="modal-header"><div class="modal-title">⬆ Updates</div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-sub">SQL Quest · current version v${APP_VERSION}</div>
    ${body}
    <div class="quiz-actions" style="margin-top:14px">
      <a class="btn btn-primary" href="${REPO_URL}" target="_blank" rel="noopener">Open on GitHub ↗</a>
      <button class="btn btn-ghost" onclick="checkForUpdate({silent:false})" ${updateInfo.checking ? 'disabled' : ''}>${updateInfo.checking ? 'Checking…' : 'Check now'}</button>
    </div>`);
}

function openUpdateModal() {
  renderUpdateModal();
  if (!updateInfo.checking) checkForUpdate({ silent: false });
}

// ── Quiz — random self-check drawn from completed lessons/exercises ──
let quizItems = [], quizIndex = 0, quizScore = 0, quizSolved = false;
const QUIZ_SIZE = 5;

// Everything the learner has already finished becomes fair game to be quizzed on.
function buildQuizPool() {
  const pool = [];
  for (const day of curriculum) {
    for (const l of day.lessons) {
      // Python items are graded by python.js instead of the result-set engine.
      const py = isPy(l);
      if (completedLessons.has(l.id)) {
        pool.push({ kind: 'lesson', py, lesson: l, day: dayNo(day), prompt: l.task, tables: l.tables || [] });
      }
      for (const ex of (l.exercises || [])) {
        if (completedExercises.has(ex.id)) {
          pool.push({ kind: 'exercise', py, lesson: l, ex, day: dayNo(day), prompt: ex.prompt, tables: l.tables || [] });
        }
      }
    }
  }
  return pool;
}

function startQuiz() {
  const pool = buildQuizPool();
  if (!pool.length) {
    openModal(`
      <div class="modal-header"><div class="modal-title">🧠 Quiz</div><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-sub">A quick recall check from lessons you've already completed.</div>
      <div class="feedback-box feedback-info"><div class="feedback-label">Nothing to quiz on yet</div>Finish at least one lesson or practice exercise, then come back to test what stuck.</div>`);
    return;
  }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  quizItems = pool.slice(0, Math.min(QUIZ_SIZE, pool.length));
  quizIndex = 0; quizScore = 0;
  const firstPy = quizItems.find(q => q.py);
  if (firstPy) warmPython(firstPy.lesson);      // so the first check doesn't wait for the interpreter
  renderQuizQuestion();
}

// The quiz answer box is a plain textarea; for Python it needs to behave like
// an editor where it matters: Tab indents, Enter keeps the indentation.
function quizKey(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { checkQuizAnswer(); return; }
  const item = quizItems[quizIndex];
  if (!item || !item.py) return;
  const ta = event.target, a = ta.selectionStart, b = ta.selectionEnd;
  const put = text => { ta.setRangeText(text, a, b, 'end'); event.preventDefault(); };
  if (event.key === 'Tab' && !event.shiftKey) put('    ');
  else if (event.key === 'Enter') {
    const line = ta.value.slice(ta.value.lastIndexOf('\n', a - 1) + 1, a);
    put('\n' + line.match(/^ */)[0] + (/:\s*$/.test(line) ? '    ' : ''));
  }
}

function renderQuizQuestion() {
  quizSolved = false;
  const n = quizItems.length;
  const item = quizItems[quizIndex];
  const pct = Math.round((quizIndex / n) * 100);
  // Show the schema (columns) for each table in play so it's answerable without
  // leaving the quiz — the modal has no schema panel to click into. Capstone
  // lessons also list the pre-built models they query.
  const spec = item.ex || item.lesson;
  const files = item.py ? Object.assign({}, item.lesson.files || {}, spec.files || {}) : {};
  const fileList = Object.keys(files).map(n => `<details class="iv-file"><summary><span class="quiz-schema-name">${escapeHtml(n)}</span> <span class="quiz-file-note">in the working folder — click to view</span></summary><pre class="py-console file">${escapeHtml(files[n])}</pre></details>`).join('');
  const schema = item.py ? fileList : item.tables.concat(lessonModels(item.lesson)).map(t => {
    const s = schemas[t];
    const cols = (s ? s.cols.map(c => `<span class="quiz-col" title="${c.type}${c.pk ? ' · primary key' : ''}">${c.name}</span>`)
                    : modelColumns(item.lesson, t).map(c => `<span class="quiz-col">${c}</span>`)).join('');
    return cols ? `<div class="quiz-schema-row"><span class="quiz-schema-name">${t}</span><span class="quiz-schema-cols">${cols}</span></div>` : '';
  }).join('');
  openModal(`
    <div class="modal-header">
      <div class="modal-title">🧠 Quiz</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="quiz-meta"><span>Question ${quizIndex + 1} of ${n}</span><span>Score ${quizScore}/${quizIndex}</span></div>
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
    <div class="quiz-origin">${item.kind === 'lesson' ? 'Lesson' : 'Exercise'} · Day ${item.day} · ${escapeHtml(item.lesson.title)}</div>
    <div class="quiz-prompt">${item.prompt}</div>
    ${schema ? `<div class="quiz-schema">${schema}</div>` : ''}
    <textarea class="quiz-answer${item.py ? ' py' : ''}" id="quiz-answer" placeholder="${item.py ? 'Write your Python here…' : 'Write your SQL here…'}" spellcheck="false" onkeydown="quizKey(event)">${item.py ? escapeHtml(spec.starter || '') : ''}</textarea>
    <div id="quiz-feedback"></div>
    <div class="quiz-actions" id="quiz-actions">
      <button class="btn btn-primary" onclick="checkQuizAnswer()">Check answer</button>
      <button class="btn btn-ghost" onclick="revealQuizHint()">💡 Hint</button>
      <button class="btn btn-ghost" onclick="skipQuizQuestion()">Skip →</button>
    </div>`);
  setTimeout(() => { const a = document.getElementById('quiz-answer'); if (a) a.focus(); }, 50);
}

let quizChecking = false;
async function checkQuizAnswer() {
  if (quizSolved || quizChecking) return;
  const ta = document.getElementById('quiz-answer');
  const item = quizItems[quizIndex];
  const sql = ta ? (item.py ? ta.value.replace(/\s+$/, '') : ta.value.trim()) : '';
  if (!sql.trim()) return;
  let passed = false, errored = false, why = '', errLabel = 'SQL error', errText = 'That query didn’t run — check the syntax and try again.';
  if (item.py) {
    // Graded exactly like the lesson: same tests, same expected output.
    const at = quizIndex;
    quizChecking = true;
    try {
      if (!PyRunner.ready() || (item.lesson.pkgs || []).length) {
        const wait = document.getElementById('quiz-feedback');
        if (wait && !PyRunner.ready()) wait.innerHTML = `<div class="feedback-box feedback-info"><div class="feedback-label">Starting Python…</div>The interpreter loads once per visit — a few seconds.</div>`;
        await ensurePython(item.lesson);
      }
      const g = PyRunner.grade(sql, item.ex || item.lesson, item.lesson);
      passed = g.verdict === 'pass';
      if (g.verdict === 'error') {
        errored = true;
        errLabel = `${g.error.type}${g.error.line ? ` on line ${g.error.line}` : ''}`;
        errText = `${escapeHtml(g.error.msg)}${g.error.tip ? `<div class="py-error-tip">${escapeHtml(g.error.tip)}</div>` : ''}`;
      } else if (!passed) why = formatPyMessage(g.why);
    } catch (e) {
      errored = true; errLabel = 'Python could not run'; errText = escapeHtml(String(e && e.message || e));
    } finally { quizChecking = false; }
    if (quizItems[quizIndex] !== item || quizIndex !== at || !document.getElementById('quiz-answer')) return;   // moved on while it ran
  } else try {
    if (item.kind === 'lesson') {
      passed = SqlEngine.evaluate(sql, item.lesson) === 'pass';
      if (!passed) {
        const d = SqlExplain.diagnose(sql, item.lesson);
        if (d && d.verdict === 'fail') why = `<strong>${escapeHtml(d.headline)}.</strong> ${d.points[0] || ''}`;
      }
    } else {
      // Isolated — never mutates the live DB. Capstone exercises run against
      // the lesson's pre-built models, so replay its setup first.
      const pre = item.lesson.liveSetup ? item.lesson.setup : null;
      const res = SqlEngine.runOnFresh([pre, sql]);
      if (!res) errored = true;
      passed = exercisePasses(item.ex, sql, res ? res.columns : [], res ? res.values : []);
      if (!passed && res) why = SqlExplain.explainValidate(item.ex.validate, res.columns, res.values)[0] || '';
    }
  } catch { errored = true; }
  const fb = document.getElementById('quiz-feedback');
  const last = quizIndex + 1 >= quizItems.length;
  if (passed) {
    quizSolved = true; quizScore++;
    playSound('correct');
    fb.innerHTML = `<div class="feedback-box feedback-success"><div class="feedback-label">✓ Correct!</div>Nicely recalled.</div>`;
    document.getElementById('quiz-actions').innerHTML =
      `<button class="btn btn-primary" onclick="nextQuizQuestion()">${last ? 'See results →' : 'Next question →'}</button>`;
  } else {
    playSound('error');
    fb.innerHTML = `<div class="feedback-box feedback-error"><div class="feedback-label">${errored ? errLabel : 'Not quite'}</div>${errored ? errText : (why || 'That doesn’t produce the expected result.') + ' Try again, or take a 💡 hint.'}</div>`;
  }
}

function revealQuizHint() {
  const item = quizItems[quizIndex];
  const hint = item.kind === 'exercise' ? item.ex.hint : item.lesson.hint;
  const fb = document.getElementById('quiz-feedback');
  if (fb) fb.innerHTML = `<div class="feedback-box feedback-hint"><div class="feedback-label">💡 Hint</div>${hint || 'Reopen the lesson to refresh this one.'}</div>`;
}

function skipQuizQuestion() { nextQuizQuestion(); }

function nextQuizQuestion() {
  quizIndex++;
  if (quizIndex >= quizItems.length) finishQuiz();
  else renderQuizQuestion();
}

function finishQuiz() {
  const n = quizItems.length;
  const pct = Math.round((quizScore / n) * 100);
  const perfect = quizScore === n;
  const verdict =
    perfect  ? "Flawless recall — these concepts are locked in. 🔒" :
    pct >= 70 ? "Strong. Most of it stuck; review the ones you missed." :
    pct >= 40 ? "Getting there. Revisit the lessons behind the misses." :
                "Worth another pass — reopen those lessons and try again.";
  if (perfect) burstConfetti(true); else if (pct >= 70) burstConfetti(false);
  playSound(perfect ? 'levelup' : 'exercise');
  openModal(`
    <div class="modal-header"><div class="modal-title">🧠 Quiz Results</div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="quiz-score-wrap">
      <div class="quiz-score-num">${quizScore}<span>/${n}</span></div>
      <div class="quiz-score-pct">${pct}% correct</div>
    </div>
    <div class="feedback-box feedback-info"><div class="feedback-label">${perfect ? '🏆 Perfect score' : 'Result'}</div>${verdict}</div>
    <div class="quiz-actions">
      <button class="btn btn-primary" onclick="startQuiz()">New quiz</button>
      <button class="btn btn-ghost" onclick="closeModal()">Done</button>
    </div>`);
}

function loadQueryHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(QUERY_HISTORY_KEY) || 'null');
    queryHistory = Array.isArray(data) ? data : [];
  } catch {
    queryHistory = [];
  }
  renderQueryHistory();
}

function saveQueryHistory() {
  localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(queryHistory));
}

function getQueryContext() {
  if (currentExercise && currentLesson) {
    return {
      label: `Exercise — ${currentLesson.title}`,
      detail: currentExercise.prompt || `Exercise ${currentExercise.id}`
    };
  }
  if (currentLesson) {
    return {
      label: `Lesson — ${currentLesson.title}`,
      detail: currentLesson.task || `Lesson ${currentLesson.id}`
    };
  }
  return { label: 'General SQL', detail: '' };
}

function addQueryToHistory(sql) {
  const trimmed = sql.trim();
  if (!trimmed) return;
  const context = getQueryContext();
  queryHistory.unshift({
    sql: trimmed,
    timestamp: new Date().toISOString(),
    lessonId: currentLesson?.id || null,
    lessonTitle: currentLesson?.title || null,
    exerciseId: currentExercise?.id || null,
    exercisePrompt: currentExercise?.prompt || null,
    contextLabel: context.label,
    contextDetail: context.detail
  });
  queryHistory = queryHistory.slice(0, 50);
  saveQueryHistory();
  renderQueryHistory();
}

function renderQueryHistory() {
  const list = document.getElementById('saved-query-list');
  const count = document.getElementById('saved-query-count');
  if (!list || !count) return;
  list.innerHTML = '';
  count.textContent = `${queryHistory.length}`;
  if (queryHistory.length === 0) {
    list.innerHTML = '<div class="saved-query-empty">No saved queries yet. Run a query to save it here.</div>';
    return;
  }
  queryHistory.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'saved-query-item';
    item.onclick = () => {
      editor.setValue(entry.sql);
      editor.focus();
      showFeedback('info', 'Loaded Query', 'Query loaded into the editor.');
    };
    const date = new Date(entry.timestamp);
    const when = isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
    const contextLabel = entry.contextLabel || (entry.exercisePrompt ? 'Exercise Query' : 'Lesson Query');
    const contextDetail = entry.contextDetail || entry.exercisePrompt || entry.lessonTitle || '';
    item.innerHTML = `
      <div class="saved-query-context"><strong>${escapeHtml(contextLabel)}</strong>${contextDetail ? ` — ${escapeHtml(contextDetail)}` : ''}</div>
      <p>${escapeHtml(entry.sql)}</p>
      <time>${when}</time>
    `;
    list.appendChild(item);
  });
}

function toggleQueryHistory() {
  const panel = document.getElementById('saved-query-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
}

function clearQueryHistory() {
  if (!confirm('Clear all saved queries?')) return;
  queryHistory = [];
  saveQueryHistory();
  renderQueryHistory();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    completedLessons: [...completedLessons],
    completedExercises: [...completedExercises],
    xp,
    currentLessonId: currentLesson?.id,
    streak, lastActiveDate,
    queriesRun, hintsUsed, errorsMade, bestCombo,
    unlockedAchievements: [...unlockedAchievements],
    dailyDoneDates,
    activeDates,
    translationsDone: [...translationsDone]
  }));
}

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
    if (!data) return null;
    if (Array.isArray(data.completedLessons)) completedLessons = new Set(data.completedLessons);
    if (Array.isArray(data.completedExercises)) completedExercises = new Set(data.completedExercises);
    if (typeof data.xp === 'number') xp = data.xp;
    if (typeof data.streak === 'number') streak = data.streak;
    if (typeof data.lastActiveDate === 'string') lastActiveDate = data.lastActiveDate;
    if (typeof data.queriesRun === 'number') queriesRun = data.queriesRun;
    if (typeof data.hintsUsed === 'number') hintsUsed = data.hintsUsed;
    if (typeof data.errorsMade === 'number') errorsMade = data.errorsMade;
    if (typeof data.bestCombo === 'number') bestCombo = data.bestCombo;
    if (Array.isArray(data.unlockedAchievements)) unlockedAchievements = new Set(data.unlockedAchievements);
    if (Array.isArray(data.dailyDoneDates)) dailyDoneDates = data.dailyDoneDates;
    if (Array.isArray(data.translationsDone)) translationsDone = new Set(data.translationsDone);
    // Saves from before v1.2 have no day-by-day record: start from what's known.
    activeDates = Array.isArray(data.activeDates) ? data.activeDates
      : [...new Set(dailyDoneDates.concat(lastActiveDate ? [lastActiveDate] : []))].sort();
    return data.currentLessonId || null;
  } catch { return null; }
}

function resetProgress() {
  if (!confirm('Reset all progress on both tracks (SQL and Python)? This cannot be undone.')) return;
  localStorage.removeItem(PROGRESS_KEY);
  completedLessons = new Set();
  completedExercises = new Set();
  xp = 0;
  streak = 0; lastActiveDate = null;
  queriesRun = 0; hintsUsed = 0; errorsMade = 0;
  combo = 0; bestCombo = 0;
  unlockedAchievements = new Set();
  dailyDoneDates = [];
  activeDates = [];
  translationsDone = new Set();
  trackPos = {};
  if (typeof Interview !== 'undefined') Interview.reset();
  updateXPDisplay();
  updateStreakDisplay();
  updateComboDisplay();
  updateDailyBtn();
  loadLesson(curriculum[0].lessons[0]);
  buildSidebar();
}

function loadExerciseByIndex(idx) {
  if (!currentLesson || !currentLesson.exercises) return;
  loadExercise(currentLesson.exercises[idx]);
}

function loadExercise(ex) {
  if (translateMode !== null) exitTranslation();
  stashPyDraft();
  currentExercise = ex;
  if (editor) editor.setValue(isPy(ex) ? pyDraftFor(ex) : '');
  showEmpty();
  const bar = document.getElementById('exercise-bar');
  bar.style.display = 'flex';
  document.getElementById('exercise-bar-text').innerHTML = ex.prompt;
  renderExercisesList();
}

function clearExercise() {
  stashPyDraft();
  currentExercise = null;
  document.getElementById('exercise-bar').style.display = 'none';
  if (editor) editor.setValue(isPy(currentLesson) ? pyDraftFor(currentLesson) : '');
  showEmpty();
  renderExercisesList();
}

// Pure pass/fail check for an exercise given a query and its result set.
// Shared by the lesson flow (gradeSubmission) and the Quiz.
function exercisePasses(ex, sql, columns, values) {
  if (ex.validate) {
    const v = ex.validate;
    const cols = (columns || []).map(c => c.toLowerCase());
    const rows = values || [];
    let passed = true;

    if (v.rowCount !== undefined && rows.length !== v.rowCount) passed = false;
    if (v.minRows  !== undefined && rows.length <  v.minRows)  passed = false;
    if (v.maxRows  !== undefined && rows.length >  v.maxRows)  passed = false;
    if (v.colCount !== undefined && cols.length !== v.colCount) passed = false;
    if (v.hasCol   && !cols.includes(v.hasCol.toLowerCase()))   passed = false;
    if (v.hasCols  && !v.hasCols.every(c => cols.includes(c.toLowerCase()))) passed = false;
    if (v.notCol   &&  cols.includes(v.notCol.toLowerCase()))   passed = false;

    if (v.allEq && passed) {
      const ci = cols.indexOf(v.allEq.col.toLowerCase());
      if (ci === -1) { passed = false; }
      else {
        const expected = String(v.allEq.val).toLowerCase();
        if (!rows.every(r => String(r[ci] ?? '').toLowerCase() === expected)) passed = false;
      }
    }
    if (v.allGt && passed) {
      const ci = cols.indexOf(v.allGt.col.toLowerCase());
      if (ci === -1) { passed = false; }
      else if (!rows.every(r => Number(r[ci]) > Number(v.allGt.val))) passed = false;
    }
    if (v.allLt && passed) {
      const ci = cols.indexOf(v.allLt.col.toLowerCase());
      if (ci === -1) { passed = false; }
      else if (!rows.every(r => Number(r[ci]) < Number(v.allLt.val))) passed = false;
    }
    if (v.firstVal !== undefined && passed) {
      if (!rows.length || String(rows[0][0]) !== String(v.firstVal)) passed = false;
    }
    if (v.hasValue !== undefined && passed) {
      const target = String(v.hasValue).toLowerCase();
      if (!rows.some(r => r.some(c => String(c ?? '').toLowerCase() === target))) passed = false;
    }
    return passed;
  }
  if (ex.solution) {
    const clean = sql.toLowerCase().replace(/\s+/g,' ').replace(/;/g,'').trim();
    let passed = ex.solution.some(s => clean.includes(s.toLowerCase().replace(/\s+/g,' ')));
    // Also accept a query that produces the same results as a full-SELECT key.
    if (!passed) {
      try { passed = SqlEngine.matchesLesson(sql, ex); } catch { passed = false; }
    }
    return passed;
  }
  return false;
}

// Credit a passed practice exercise: XP, completion, success feedback.
function creditExercise(ex) {
  const dailyBonus = handleDailyCompletion(ex);
  if (!completedExercises.has(ex.id)) {
    completedExercises.add(ex.id);
    const earned = awardXP(ex.xp);
    playSound('exercise');
    const comboNote = combo >= 3 ? ` <span style="color:var(--amber)">🔥 ${combo}× combo</span>` : '';
    const dailyNote = dailyBonus ? ` <span style="color:var(--purple)">🎯 +${dailyBonus} daily bonus</span>` : '';
    const existing = document.getElementById('output-content').innerHTML;
    document.getElementById('output-content').innerHTML =
      `<div class="feedback-box feedback-success"><div class="feedback-label">✓ Correct! +${earned} XP${comboNote}${dailyNote}</div>Nice work! Try the next exercise or continue to the next lesson.</div><hr class="divider">${existing}`;
    renderExercisesList();
  } else if (dailyBonus) {
    const existing = document.getElementById('output-content').innerHTML;
    document.getElementById('output-content').innerHTML =
      `<div class="feedback-box feedback-success"><div class="feedback-label">🎯 Daily Challenge! +${dailyBonus} XP</div>Solved again for the daily bonus. See you tomorrow.</div><hr class="divider">${existing}`;
  } else if (isPy(ex)) {
    prependOutput(`<div class="feedback-box feedback-success"><div class="feedback-label">✓ Passes</div>Still correct — you've already earned this exercise's XP.</div>`);
  }
}

function exerciseNotQuite(ex, columns, values) {
  // Say exactly which expectation the result misses (no AI involved).
  const why = ex ? SqlExplain.explainValidate(ex.validate, columns, values) : [];
  lastDiagnosis = why.map(stripTags).join(' ');
  const body = why.length
    ? `<ul class="explain-points">${why.map(w => `<li>${w}</li>`).join('')}</ul>`
    : `Your query ran, but the results don't match the goal. Re-read the prompt — or grab a 💡 hint (costs your combo).`;
  prependOutput(`<div class="feedback-box feedback-info"><div class="feedback-label">Not quite yet</div>${body}</div>`);
}

function prependOutput(html) {
  const box = document.getElementById('output-content');
  const existing = box.innerHTML;
  box.innerHTML = html + (existing.includes('empty-state') ? '' : '<hr class="divider">' + existing);
}
function stripTags(html) {
  return String(html).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

// Grade a run against BOTH the active practice exercise AND the lesson's main
// task, so solving the main task still counts while a practice exercise is
// selected. The exercise "not quite" nudge only shows if neither goal was met.
function gradeSubmission(sql, columns, values) {
  const ex = currentExercise;
  const exPassed = ex ? exercisePasses(ex, sql, columns, values) : false;
  if (exPassed) creditExercise(ex);
  // While an exercise is selected, a miss is explained in the exercise's own
  // terms; the lesson-level explainer stays quiet.
  const lessonPassed = checkSolution(sql, { explain: !ex });
  if (ex && !exPassed && !lessonPassed) exerciseNotQuite(ex, columns, values);
}

function renderExercisesList() {
  const el = document.getElementById('exercises-list');
  if (!el) return;
  if (!currentLesson || !currentLesson.exercises || !currentLesson.exercises.length) {
    el.innerHTML = ''; return;
  }
  const exs = currentLesson.exercises;
  const done = exs.filter(e => completedExercises.has(e.id)).length;
  let html = `<div class="exercises-section"><div class="exercises-header"><span class="exercises-label">Practice Exercises</span><span class="exercises-count">${done}/${exs.length} done</span></div>`;
  exs.forEach((ex, i) => {
    const isDone = completedExercises.has(ex.id);
    const isActive = currentExercise && currentExercise.id === ex.id;
    html += `<div class="exercise-item${isDone?' done-ex':''}${isActive?' active-ex':''}" onclick="loadExerciseByIndex(${i})">
      <div class="ex-num">${isDone ? '✓' : i+1}</div>
      <div class="ex-text">${ex.prompt}</div>
      <div class="ex-xp">+${ex.xp}xp</div>
    </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

// Tables relevant to a lesson: the ones it declares PLUS any table its
// exercises actually reference (many lessons declare only their main table but
// have exercises that query others — e.g. lesson 1.2 is "employees" but its
// exercises use `departments`). Matched as whole words, so the `departments`
// TABLE is picked up while the `department` employees COLUMN is not. Cached on
// the lesson since buildHintTables runs on every keystroke.
function relevantTables(lesson) {
  if (!lesson) return Object.keys(schemas);
  if (isPy(lesson)) return lesson.tables || [];     // prose like "orders" is not a table reference there
  if (lesson._relTables) return lesson._relTables;
  const set = new Set(lesson.tables || []);
  const parts = [lesson.task || ''];
  for (const ex of (lesson.exercises || [])) {
    parts.push(ex.prompt || '', ex.hint || '', (ex.solution || []).join(' '), ex._ref || '');
  }
  const text = parts.join(' ').toLowerCase();
  for (const name of Object.keys(schemas)) {
    if (!set.has(name) && new RegExp('\\b' + name + '\\b').test(text)) set.add(name);
  }
  lesson._relTables = [...set];
  return lesson._relTables;
}

// Pre-built models a lesson queries (stg_/dim_/fact_ objects its `setup`
// creates). They aren't in `schemas`, so their columns are read from SQLite.
function lessonModels(lesson) { return (lesson && lesson.models) || []; }
const modelColumnCache = {};
function modelColumns(lesson, name) {
  const key = (lesson ? lesson.id : '') + ':' + name;
  if (modelColumnCache[key]) return modelColumnCache[key];
  let cols = [];
  try {
    const r = SqlEngine.runOnFresh([lesson && lesson.setup, `SELECT name FROM pragma_table_info('${name}')`]);
    if (r) cols = r.values.map(v => v[0]);
  } catch {}
  if (cols.length) modelColumnCache[key] = cols;
  return cols;
}
// Column names of a table OR model, in the context of the current lesson.
function tableColumns(name) {
  if (schemas[name]) return schemas[name].cols.map(c => c.name);
  return modelColumns(currentLesson, name);
}
// Everything queryable in the current lesson, for autocomplete.
function hintTables() {
  const base = currentLesson ? relevantTables(currentLesson) : Object.keys(schemas);
  return base.concat(lessonModels(currentLesson));
}

// Run a capstone lesson's `setup` on the LIVE database so the models it
// builds on exist when the learner starts typing. Setup is idempotent
// (DROP IF EXISTS + CREATE). If the learner left an object of the wrong kind
// behind (say a TABLE where a VIEW is expected) the DROP fails — rebuild the
// practice data once and try again.
function prepareLesson(lesson) {
  if (!lesson || !lesson.liveSetup || !lesson.setup || !db) return true;
  try { db.exec(lesson.setup); return true; } catch {}
  try { seedDatabase(sqlModule); db.exec(lesson.setup); return true; }
  catch (e) { console.error('lesson setup failed', lesson.id, e); return false; }
}

// ── Context-aware SQL autocomplete ──
// Ranks suggestions by where you are in the statement so the highlighted
// (first) item fits the context: statement keywords at the start, tables after
// FROM/JOIN, columns after SELECT/WHERE/etc. — instead of the default hint's
// alphabetical mix that surfaces `salary` when you meant `SELECT`.
const SQL_STARTERS = ['SELECT', 'WITH', 'INSERT INTO', 'UPDATE', 'DELETE FROM',
  'CREATE TABLE', 'CREATE VIEW', 'CREATE INDEX', 'DROP TABLE', 'DROP VIEW'];
const SQL_KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING',
  'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'CROSS JOIN', 'ON', 'AS',
  'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'DISTINCT',
  'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'DESC', 'ASC', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'OVER', 'PARTITION BY', 'ON CONFLICT'];
const SQL_FUNCS = ['COUNT(', 'SUM(', 'AVG(', 'MIN(', 'MAX(', 'ROUND(', 'COALESCE(',
  'IFNULL(', 'NULLIF(', 'UPPER(', 'LOWER(', 'LENGTH(', 'SUBSTR(', 'REPLACE(', 'TRIM(',
  'INSTR(', 'STRFTIME(', 'DATE(', 'JULIANDAY(', 'ROW_NUMBER() OVER (', 'RANK() OVER (',
  'DENSE_RANK() OVER (', 'LAG(', 'LEAD(', 'FIRST_VALUE(', 'GROUP_CONCAT('];

// The clause governing the cursor position = the last clause keyword before it.
function currentClause(before) {
  const clauses = ['select', 'from', 'where', 'group by', 'order by', 'having',
    'join', 'on', 'set', 'values', 'into', 'update', 'delete'];
  let best = null, bestIdx = -1;
  for (const kw of clauses) {
    const re = new RegExp('\\b' + kw.replace(' ', '\\s+') + '\\b', 'g');
    let m, last = -1;
    while ((m = re.exec(before)) !== null) last = m.index;
    if (last > bestIdx) { bestIdx = last; best = kw; }
  }
  return best;
}

// Distinct column names across the tables in scope for this lesson.
function hintColumns() {
  const cols = [], seen = new Set();
  for (const t of hintTables()) {
    for (const c of tableColumns(t)) if (!seen.has(c)) { seen.add(c); cols.push(c); }
  }
  return cols;
}

// Resolve a `t.` prefix to a table — either a real table name or an alias
// introduced by `FROM/JOIN <table> [AS] <alias>`.
function resolveAlias(before, alias) {
  const names = Object.keys(schemas).concat(lessonModels(currentLesson));
  if (names.includes(alias)) return alias;
  const re = new RegExp('\\b(' + names.join('|') + ')\\s+(?:as\\s+)?' + alias + '\\b', 'i');
  const m = before.match(re);
  return m ? m[1].toLowerCase() : null;
}

// ── Python autocomplete ──
// The Python counterpart of sqlHint: keywords, built-ins and the names already
// in the editor; after a dot, the common methods of text, lists, dictionaries,
// sets and files (Python can't know the type without running, so all are offered).
const PY_KEYWORDS = ['and', 'as', 'break', 'class', 'continue', 'def', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield'];
const PY_BUILTINS = ['abs', 'all', 'any', 'bool', 'dict', 'enumerate', 'float', 'input', 'int', 'isinstance', 'len', 'list', 'map',
  'max', 'min', 'open', 'print', 'range', 'reversed', 'round', 'set', 'sorted', 'str', 'sum', 'tuple', 'type', 'zip',
  'ValueError', 'TypeError', 'KeyError', 'IndexError', 'ZeroDivisionError', 'FileNotFoundError', 'Exception'];
const PY_METHODS = ['append', 'extend', 'insert', 'remove', 'pop', 'sort', 'reverse', 'index', 'count', 'copy', 'clear',
  'get', 'items', 'keys', 'values', 'update', 'setdefault', 'add', 'discard',
  'strip', 'lstrip', 'rstrip', 'lower', 'upper', 'title', 'capitalize', 'replace', 'split', 'splitlines', 'join',
  'startswith', 'endswith', 'find', 'format', 'isdigit', 'isalpha', 'isalnum', 'zfill',
  'read', 'readlines', 'write', 'close'];
const PY_MODULE_NAMES = {
  math: ['sqrt', 'pi', 'ceil', 'floor', 'pow', 'fabs', 'gcd', 'inf'],
  random: ['random', 'randint', 'choice', 'shuffle', 'seed', 'sample'],
  statistics: ['mean', 'median', 'mode', 'stdev'],
  json: ['loads', 'dumps', 'load', 'dump'],
  csv: ['reader', 'DictReader', 'writer', 'DictWriter'],
  datetime: ['date', 'datetime', 'timedelta']
};
function pyHint(cm) {
  const cur = cm.getCursor();
  const line = cm.getLine(cur.line);
  const tok = cm.getTokenAt(cur);
  if (tok.type && /comment|string/.test(tok.type)) return null;
  let start = cur.ch;
  while (start > 0 && /\w/.test(line.charAt(start - 1))) start--;
  const prefix = line.slice(start, cur.ch);
  const lc = prefix.toLowerCase();
  let words;
  if (line.charAt(start - 1) === '.') {
    let o = start - 1;
    while (o > 0 && /\w/.test(line.charAt(o - 1))) o--;
    const owner = line.slice(o, start - 1);
    words = PY_MODULE_NAMES[owner] || PY_METHODS;
  } else {
    if (!prefix) return null;
    // Names the learner has written so far (variables, functions, parameters).
    const own = (cm.getValue().match(/[A-Za-z_]\w*/g) || []).filter(w => w.length > 1 && w !== prefix);
    words = [...new Set(own.concat(PY_KEYWORDS, PY_BUILTINS, Object.keys(PY_MODULE_NAMES)))];
  }
  const starts = words.filter(w => w.toLowerCase().startsWith(lc) && w !== prefix);
  const list = starts.slice(0, 12).map(w => ({ text: w, displayText: w }));
  return list.length ? { list, from: CodeMirror.Pos(cur.line, start), to: cur } : null;
}

function sqlHint(cm) {
  const cur = cm.getCursor();
  const line = cm.getLine(cur.line);
  let start = cur.ch;
  while (start > 0 && /[\w.]/.test(line.charAt(start - 1))) start--;
  const word = line.slice(start, cur.ch);
  const beforeLc = cm.getRange({ line: 0, ch: 0 }, { line: cur.line, ch: start }).toLowerCase();

  // `table.column` — complete that table's columns.
  const dot = word.lastIndexOf('.');
  if (dot >= 0) {
    const tbl = resolveAlias(beforeLc, word.slice(0, dot).toLowerCase());
    const prefix = word.slice(dot + 1).toLowerCase();
    const tblCols = tbl ? tableColumns(tbl) : [];
    const cols = tblCols.length ? tblCols : hintColumns();
    return { list: cols.filter(c => c.toLowerCase().startsWith(prefix)),
             from: { line: cur.line, ch: start + dot + 1 }, to: cur };
  }

  const cols = hintColumns();
  const tables = hintTables();
  const clause = currentClause(beforeLc);
  const beforeTrim = beforeLc.replace(/\s+$/, '');
  const atStart = beforeTrim === '' || beforeTrim.endsWith(';');

  // Ordered category buckets — the first bucket wins the highlight.
  let order;
  if (atStart) order = [SQL_STARTERS, SQL_KEYWORDS, cols, SQL_FUNCS, tables];
  else if (clause === 'from' || clause === 'join' || clause === 'into' || clause === 'update')
    order = [tables, cols, SQL_KEYWORDS];
  else if (clause === 'select')
    order = [cols, SQL_FUNCS, SQL_KEYWORDS, tables];   // aggregates common in SELECT
  else if (clause === 'where' || clause === 'having' || clause === 'on')
    order = [cols, SQL_KEYWORDS, SQL_FUNCS, tables];   // AND/OR/IN/GROUP BY common after a condition
  else if (clause === 'group by' || clause === 'order by' || clause === 'set')
    order = [cols, SQL_FUNCS, SQL_KEYWORDS];
  else
    order = [cols, SQL_KEYWORDS, SQL_FUNCS, tables, SQL_STARTERS];

  const prefix = word.toLowerCase();
  const list = [], seen = new Set();
  for (const bucket of order) {
    for (const item of bucket) {
      if (prefix && !item.toLowerCase().startsWith(prefix)) continue;
      const key = item.toLowerCase();
      if (!seen.has(key)) { seen.add(key); list.push(item); }
    }
  }
  return { list, from: { line: cur.line, ch: start }, to: cur };
}

function initResize() {
  const handle = document.getElementById('resize-handle');
  const panel  = document.getElementById('output-panel');

  const saved = localStorage.getItem('sql_bootcamp_panel_width');
  if (saved) panel.style.width = saved + 'px';

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panel.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(e) {
      const delta = startX - e.clientX;
      const newW = Math.max(200, Math.min(window.innerWidth * 0.75, startW + delta));
      panel.style.width = newW + 'px';
    }
    function onUp() {
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('sql_bootcamp_panel_width', panel.offsetWidth);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function initVerticalResize() {
  const handle = document.getElementById('vertical-resize-handle');
  const panel  = document.getElementById('lesson-panel');

  const savedHeight = localStorage.getItem('sql_bootcamp_lesson_height');
  if (savedHeight) panel.style.height = savedHeight + 'px';

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panel.offsetHeight;
    handle.classList.add('dragging');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    function onMove(e) {
      const delta = e.clientY - startY;
      const newH = Math.max(120, Math.min(window.innerHeight * 0.6, startH + delta));
      panel.style.height = newH + 'px';
    }
    function onUp() {
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('sql_bootcamp_lesson_height', panel.offsetHeight);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function initEditor() {
  editor = CodeMirror(document.getElementById('sql-editor-wrap'), {
    mode: 'text/x-sql',
    lineNumbers: true,
    autofocus: true,
    tabSize: 2,
    indentWithTabs: false,
    extraKeys: {
      'Ctrl-Enter': runQuery,
      'Cmd-Enter': runQuery,
      'Ctrl-Space': cm => CodeMirror.showHint(cm, isPy(currentLesson) ? pyHint : sqlHint, { completeSingle: false }),
      // Tab indents with spaces (a real tab character is a TabError waiting to happen in Python).
      'Tab': cm => cm.somethingSelected() ? cm.execCommand('indentMore') : cm.execCommand('insertSoftTab'),
      'Shift-Tab': cm => cm.execCommand('indentLess')
    }
  });
  editor.on('change', () => clearPyErrorLine());
  editor.on('inputRead', (cm, event) => {
    if (isPy(currentLesson)) {
      // Python: suggest once two characters of a name are typed, or after a dot.
      if (cm.state.completionActive || !event.text[0] || !/[\w.]/.test(event.text[0])) return;
      const cur = cm.getCursor(), before = cm.getLine(cur.line).slice(0, cur.ch);
      if (/\.$/.test(before) || /[A-Za-z_]\w+$/.test(before)) CodeMirror.showHint(cm, pyHint, { completeSingle: false });
      return;
    }
    // Auto-suggest as you type a word or after a dot; the ranking is handled by
    // sqlHint so the top item matches the current clause.
    if (!cm.state.completionActive && event.text[0] && /[\w.]/.test(event.text[0])) {
      CodeMirror.showHint(cm, sqlHint, { completeSingle: false });
    }
  });
}

function seedInto(d) {
  for (const tbl of Object.values(schemas)) {
    d.run(tbl.create);
    for (const ins of tbl.insert) d.run(ins);
  }
}
function seedDatabase(SQL) {
  if (db) db.close();
  db = new SQL.Database();
  seedInto(db);
}
// `shop.db` for Python lessons: the practice database as a SQLite file, always
// freshly seeded (never the live one, which the learner may have changed).
function shopDbBytes() {
  const d = new sqlModule.Database();
  seedInto(d);
  const bytes = d.export();
  d.close();
  return bytes;
}

let sqlModule = null;

function reseedDatabase() {
  if (!sqlModule) return;
  seedDatabase(sqlModule);
  prepareLesson(currentLesson);
  showToast('🗄️', 'Database', 'Practice data rebuilt', 'All tables restored to their original state. Your XP and progress are untouched.');
  if (lastResults) { lastResults = null; showEmpty(); }
}

async function initDB() {
  // The wasm binary is embedded as base64 (vendor/sql-wasm-b64.js) so the
  // engine loads even from file:// where browsers block fetching .wasm files.
  const config = {};
  if (typeof SQL_WASM_B64 !== 'undefined') {
    const bin = atob(SQL_WASM_B64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    config.wasmBinary = bytes.buffer;
  } else {
    config.locateFile = f => `vendor/${f}`;
  }
  const SQL = await initSqlJs(config);
  sqlModule = SQL;
  SqlEngine.init(SQL);
  seedDatabase(SQL);
  if (typeof PyRunner !== 'undefined') PyRunner.setDbProvider(shopDbBytes);
  window.addEventListener('beforeunload', stashPyDraft);
  const savedLessonId = loadProgress();
  loadTrackState(savedLessonId);
  updateTrackUI();
  initEditor();
  initResize();
  initVerticalResize();
  initKeyboardShortcuts();
  loadQueryHistory();
  buildUI();
  updateXPDisplay();
  updateStreakDisplay();
  updateComboDisplay();
  updateDailyBtn();
  document.getElementById('sound-btn').innerHTML = soundOn ? ICONS.sound : ICONS.mute;
  document.getElementById('ach-btn').innerHTML = ICONS.trophy;
  document.getElementById('keys-btn').innerHTML = ICONS.keys;
  updateThemeButton();
  const verLabel = document.getElementById('ver-label');
  if (verLabel) verLabel.textContent = `v${APP_VERSION}`;
  loadLesson(startLessonForTrack(savedLessonId));
  if (!savedLessonId && completedLessons.size === 0) showWelcome();
  else if (localStorage.getItem('sql_bootcamp_today_seen') !== todayStr()) openToday();
  // Best-effort update check (offline-safe, non-blocking).
  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    checkForUpdate({ silent: true }).catch(() => {});
  }
}

function buildUI() {
  buildSidebar();
  updateDayNav();
}

// ── Day navigation (course map + prev/next) ──
function updateDayNav() {
  const day = curriculum[currentDay];
  if (!day) return;
  const done = day.lessons.filter(l => completedLessons.has(l.id)).length;
  document.getElementById('map-btn-label').textContent = `Day ${dayNo(day)} · ${day.title}`;
  document.getElementById('map-btn-pct').textContent = `${done}/${day.lessons.length}`;
  document.getElementById('prev-day-btn').disabled = currentDay === 0;
  document.getElementById('next-day-btn').disabled = currentDay === curriculum.length - 1;
}

function stepDay(delta) {
  const idx = currentDay + delta;
  if (idx < 0 || idx >= curriculum.length) return;
  currentDay = idx;
  const day = curriculum[idx];
  const firstIncomplete = day.lessons.find(l => !completedLessons.has(l.id));
  loadLesson(firstIncomplete || day.lessons[0]);
}

function jumpToDay(idx) {
  closeModal();
  currentDay = idx;
  const day = curriculum[idx];
  const firstIncomplete = day.lessons.find(l => !completedLessons.has(l.id));
  loadLesson(firstIncomplete || day.lessons[0]);
}

const TRACK_SECTIONS = { sql: [
  { label: 'Foundations', short: 'Foundations', from: 1, to: 7 },
  { label: 'Working with real data', short: 'Real data', from: 8, to: 16 },
  { label: 'Analytics engineering', short: 'Analytics', from: 17, to: 21 },
  { label: 'Data engineering', short: 'Engineering', from: 22, to: 28 },
  { label: 'Snowflake and BigQuery dialects', short: 'Dialects', from: 29, to: 31 },
  { label: 'Capstone: the plant-floor warehouse', short: 'Capstone', from: 32, to: 39 },
  { label: 'Python for data engineers', short: 'Python', from: 40, to: 99 }
], python: [
  { label: 'First steps', short: 'First steps', from: 101, to: 102 },
  { label: 'Decisions and loops', short: 'Logic & loops', from: 103, to: 104 },
  { label: 'Collections', short: 'Collections', from: 105, to: 106 },
  { label: 'Functions, files and a project', short: 'Programs', from: 107, to: 108 }
] };
function courseSections() { return TRACK_SECTIONS[activeTrack] || TRACK_SECTIONS.sql; }

function openCourseMap() {
  let cards = '';
  for (const section of courseSections()) {
    const days = curriculum.filter(d => d.day >= section.from && d.day <= section.to);
    if (!days.length) continue;
    cards += `<div class="map-section-label">${section.label}</div>`;
    cards += days.map(day => {
      const idx = curriculum.indexOf(day);
      const done = day.lessons.filter(l => completedLessons.has(l.id)).length;
      const pct = Math.round((done / day.lessons.length) * 100);
      const complete = done === day.lessons.length;
      return `<div class="map-card${idx === currentDay ? ' current' : ''}${complete ? ' done' : ''}" onclick="jumpToDay(${idx})">
        <div class="map-card-top">
          <span class="map-card-num">DAY ${dayNo(day)}</span>
          ${complete ? '<span class="map-card-check">✓</span>' : ''}
        </div>
        <div class="map-card-title">${day.title}</div>
        <div class="map-card-bar"><div class="map-card-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  }
  const total = totalLessonCount();
  openModal(`
    <div class="modal-header">
      <div class="modal-title">🗺️ Course Map — ${TRACKS[activeTrack].label} track</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-sub">${doneLessonCount()} of ${total} lessons complete — click a day to jump in</div>
    <div class="map-grid">${cards}</div>`);
}

// ── Theme ──
function toggleTheme() {
  const light = document.documentElement.dataset.theme === 'light';
  if (light) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = 'light';
  localStorage.setItem('sql_bootcamp_theme', light ? 'dark' : 'light');
  updateThemeButton();
}
function updateThemeButton() {
  const btn = document.getElementById('theme-btn');
  if (btn) btn.innerHTML = document.documentElement.dataset.theme === 'light' ? ICONS.moon : ICONS.sun;
}

// ── Keyboard shortcuts ──
function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.altKey && e.key === 'ArrowLeft')  { e.preventDefault(); stepDay(-1); }
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); stepDay(1); }
    if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); openShortcuts(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openCourseMap(); }
  });
}

function openShortcuts() {
  const rows = [
    ['Run query', ['Ctrl', 'Enter']],
    ['Autocomplete', ['Ctrl', 'Space']],
    ['Course map', ['Ctrl', 'K']],
    ['Previous / next day', ['Alt', '← / →']],
    ['This help', ['Ctrl', '/']],
    ['Close dialogs', ['Esc']]
  ];
  openModal(`
    <div class="modal-header">
      <div class="modal-title">⌨ Keyboard Shortcuts</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-sub">On macOS, use Cmd instead of Ctrl.</div>
    ${rows.map(([label, keys]) => `<div class="shortcut-row"><span>${label}</span><span class="shortcut-keys">${keys.map(k => `<span class="kbd">${k}</span>`).join('')}</span></div>`).join('')}`);
}

// ── Today: the screen you come back to ──
// Streak lamps for this week, the next lesson, the daily challenge, level and
// stage progress. Opens once a day on load, and any time from the logo.
// The last seven days, oldest first, ending today — so a streak is always
// visible as a run of lamps leading up to today's.
function weekDates() {
  const t = new Date(todayStr() + 'T00:00:00Z').getTime();
  return Array.from({ length: 7 }, (_, i) => new Date(t - (6 - i) * 86400000).toISOString().slice(0, 10));
}
function nextLessonToDo() {
  const all = curriculum.flatMap(d => d.lessons);
  if (currentLesson && !completedLessons.has(currentLesson.id)) return currentLesson;
  const from = currentLesson ? all.indexOf(currentLesson) : -1;
  return all.slice(from + 1).find(l => !completedLessons.has(l.id)) || all.find(l => !completedLessons.has(l.id)) || null;
}
function continueLesson(id) {
  const l = curriculum.flatMap(d => d.lessons).find(x => x.id === id);
  closeModal();
  if (l) loadLesson(l);
  if (editor) editor.focus();
}
function jumpToSection(i) {
  const s = courseSections()[i];
  const days = curriculum.filter(d => d.day >= s.from && d.day <= s.to);
  const target = days.find(d => d.lessons.some(l => !completedLessons.has(l.id))) || days[0];
  if (target) jumpToDay(curriculum.indexOf(target));
}

function openToday() {
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const activeToday = lastActiveDate === today;
  const alive = activeToday || lastActiveDate === yesterday;
  const shown = alive ? streak : 0;
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const lamps = weekDates().map(d =>
    `<div class="lamp${activeDates.includes(d) ? ' on' : ''}${d === today ? ' today' : ''}"><div class="lamp-light"></div><div class="lamp-day">${d === today ? 'Today' : names[new Date(d + 'T00:00:00Z').getUTCDay()]}</div></div>`).join('');

  const title = activeToday ? "You've put in work today." : shown ? `Day ${shown + 1} starts with one ${activeTrack === 'python' ? 'script' : 'query'}.` : 'Pick up where you left off.';
  const sub = activeToday ? 'Stopping here is fine. One more lesson is better.'
    : shown ? `Finish anything today to keep your ${shown}-day streak.`
    : 'Finish one lesson today and the first lamp goes on.';

  const next = nextLessonToDo();
  let nextCard;
  if (next) {
    const day = curriculum.find(d => d.lessons.includes(next));
    nextCard = `<div class="today-card today-next">
      <div class="today-card-kicker"><span>Next up — ${activeTrack === 'python' ? 'Python ' : ''}day ${dayNo(day)}, ${escapeHtml(day.title)}</span><span>${next.xp} XP</span></div>
      <div class="today-next-title">${next.title}</div>
      <div class="today-next-task">${stripTags(next.task)}</div>
      <button class="btn btn-primary" onclick="continueLesson('${next.id}')">${doneLessonCount() ? 'Continue' : 'Start'} this lesson</button>
      <div class="today-day">
        <span>Day ${dayNo(day)}: ${day.lessons.filter(l => completedLessons.has(l.id)).length} of ${day.lessons.length} lessons done</span>
        <div class="today-day-dots">${day.lessons.map(l => `<i class="${completedLessons.has(l.id) ? 'done' : l === next ? 'cur' : ''}" title="${escapeHtml(l.title)}"></i>`).join('')}</div>
      </div>
    </div>`;
  } else if (activeTrack === 'python') {
    nextCard = `<div class="today-card today-next">
      <div class="today-card-kicker"><span>Python track complete</span><span>${totalLessonCount()} lessons</span></div>
      <div class="today-next-title">You can program. Now point it at data.</div>
      <div class="today-next-task">The SQL track teaches the language databases speak — and its Days 40–48 come back to Python to drive a database, build a pipeline and use pandas.</div>
      <button class="btn btn-primary" onclick="closeModal(); setTrack('sql')">Switch to the SQL track</button>
    </div>`;
  } else {
    nextCard = `<div class="today-card today-next">
      <div class="today-card-kicker"><span>Course complete</span><span>${totalLessonCount()} lessons</span></div>
      <div class="today-next-title">Every lesson is done. Now make it automatic.</div>
      <div class="today-next-task">Interviews reward speed and explanation, not just correctness. A timed mock interview is the best practice left.</div>
      <button class="btn btn-primary" onclick="closeModal(); openInterview()">Start a mock interview</button>
    </div>`;
  }

  const dc = getDailyChallenge();
  const dailyCard = dc ? `<div class="today-card">
      <div class="today-card-kicker"><span>Daily challenge</span><span>${isDailyDone() ? 'done' : 'double XP'}</span></div>
      <div class="today-card-text">${stripTags(dc.ex.prompt)}</div>
      ${isDailyDone() ? '' : `<button class="btn btn-ghost" onclick="closeModal(); startDailyChallenge()">Take today's challenge</button>`}
    </div>` : '';

  const lvl = levelForXp(xp);
  const nextLvl = LEVELS[lvl + 1];
  const lvlPct = nextLvl ? Math.round(100 * (xp - LEVELS[lvl].xp) / (nextLvl.xp - LEVELS[lvl].xp)) : 100;
  const levelCard = `<div class="today-card">
      <div class="today-card-kicker"><span>Level ${lvl + 1}</span><span>${xp.toLocaleString()} XP</span></div>
      <div class="today-card-title">${LEVELS[lvl].title}</div>
      <div class="today-level-bar"><div style="width:${lvlPct}%"></div></div>
      <div class="today-card-text">${nextLvl ? `${(nextLvl.xp - xp).toLocaleString()} XP to ${nextLvl.title}` : 'Top level reached.'}</div>
    </div>`;

  const iv = typeof Interview !== 'undefined' ? Interview.stats() : { count: 0, best: 0 };
  const interviewCard = `<div class="today-card">
      <div class="today-card-kicker"><span>Mock interview</span><span>${iv.count ? `best ${iv.best}/100` : 'not tried yet'}</span></div>
      <div class="today-card-text">${iv.count ? `${iv.count} done. Fifteen minutes is enough for two problems and their follow-ups.` : 'Two timed problems, follow-up questions and a scorecard in fifteen minutes.'}</div>
      <button class="btn btn-ghost" onclick="closeModal(); openInterview()">Start an interview</button>
    </div>`;

  const currentDayNum = curriculum[currentDay] ? curriculum[currentDay].day : 1;
  const pipeline = courseSections().map((s, i) => {
    const lessons = curriculum.filter(d => d.day >= s.from && d.day <= s.to).flatMap(d => d.lessons);
    if (!lessons.length) return '';
    const done = lessons.filter(l => completedLessons.has(l.id)).length;
    const cur = currentDayNum >= s.from && currentDayNum <= s.to;
    return `<button class="pipe-stage${cur ? ' current' : ''}" onclick="jumpToSection(${i})" title="${escapeHtml(s.label)}">
      <div class="pipe-bar"><div style="width:${Math.round(100 * done / lessons.length)}%"></div></div>
      <div class="pipe-name">${s.short}</div><div class="pipe-count">${done}/${lessons.length}</div></button>`;
  }).join('');

  try { localStorage.setItem('sql_bootcamp_today_seen', today); } catch {}
  openModal(`
    <div class="today-head">
      <div><div class="today-title">${title}</div><div class="today-sub">${sub}</div></div>
      <button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    </div>
    <div class="andon${shown ? ' alive' : ''}">
      <div class="andon-count"><div class="andon-num">${shown}</div><div class="andon-label">day streak</div></div>
      <div class="andon-lamps">${lamps}</div>
    </div>
    <div class="today-grid">
      ${nextCard}
      <div class="today-side">${dailyCard}${levelCard}${interviewCard}</div>
    </div>
    <div class="pipeline">${pipeline}</div>`, { wide: true });
}

// ── First-run welcome ──
function showWelcome() {
  openModal(`
    <div class="welcome-hero">
      <div class="welcome-logo">SQL</div>
      <div class="welcome-title">Welcome to SQL Quest</div>
      <div class="welcome-sub">Go from your first <code style="font-family:var(--mono)">SELECT</code> to job-ready Analytics / Data Engineer skills — SQL first, then the Python that drives it. Everything runs in your browser, against a real SQLite database and a real Python interpreter — fully offline, nothing to install.</div>
    </div>
    <div class="welcome-feats">
      <div class="welcome-feat"><span class="welcome-feat-icon">📚</span><div><div class="welcome-feat-name">${curriculum.length}-day curriculum</div><div class="welcome-feat-desc">Querying → joins → windows → modeling &amp; ELT → Snowflake / BigQuery dialects → a full warehouse capstone → Python, pipelines and pandas.</div></div></div>
      <div class="welcome-feat"><span class="welcome-feat-icon">▶</span><div><div class="welcome-feat-name">Real SQL, instantly</div><div class="welcome-feat-desc">Write a query, press Ctrl+Enter, see real results. Break things freely — reset data anytime.</div></div></div>
      <div class="welcome-feat"><span class="welcome-feat-icon">⚡</span><div><div class="welcome-feat-name">XP, streaks &amp; combos</div><div class="welcome-feat-desc">Level from Row Rookie to Principal Data Engineer. Progress saves automatically.</div></div></div>
      <div class="welcome-feat"><span class="welcome-feat-icon">📈</span><div><div class="welcome-feat-name">Readiness report</div><div class="welcome-feat-desc">Click your level badge to see per-skill progress mapped to real job requirements.</div></div></div>
      <div class="welcome-feat"><span class="welcome-feat-icon">🔎</span><div><div class="welcome-feat-name">It tells you why</div><div class="welcome-feat-desc">A wrong answer gets a diagnosis — missing rows, a join fan-out, a rounding slip — not just a red X. No AI required.</div></div></div>
      <div class="welcome-feat"><span class="welcome-feat-icon">🎤</span><div><div class="welcome-feat-name">Mock interviews</div><div class="welcome-feat-desc">Timed problems with follow-ups and a scorecard — solo, or with an AI interviewer running on your own machine.</div></div></div>
    </div>
    <button class="welcome-cta" onclick="closeModal()">Start SQL — day 1</button>
    <button class="welcome-cta welcome-cta-alt" onclick="closeModal(); setTrack('python')">New to code? Start Python from scratch — ${trackDays('python').length} days, no SQL needed</button>
    <div class="welcome-note">The SQL / Python switch in the top bar changes course any time. Each keeps its own place.</div>`);
}

// The sidebar is a route: days are stations on a line, grouped by stage.
// A station's ring fills as its lessons are finished; the current one is amber.
function buildSidebar() {
  const sb = document.getElementById('sidebar');
  const scrollTop = sb.scrollTop;
  sb.innerHTML = '';
  let lastSection = null;
  curriculum.forEach((day, di) => {
    const section = courseSections().find(s => day.day >= s.from && day.day <= s.to) || null;
    const peers = section ? curriculum.filter(d => d.day >= section.from && d.day <= section.to) : [day];
    if (section && section !== lastSection) {
      lastSection = section;
      const lessons = peers.flatMap(d => d.lessons);
      const done = lessons.filter(l => completedLessons.has(l.id)).length;
      const head = document.createElement('div');
      head.className = 'rail-section' + (done === lessons.length ? ' complete' : '');
      head.innerHTML = `<span>${section.label}</span><span class="rail-section-count">${done}/${lessons.length}</span>`;
      sb.appendChild(head);
    }

    const doneCount = day.lessons.filter(l => completedLessons.has(l.id)).length;
    const allDone = doneCount === day.lessons.length;
    const isOpen = di === currentDay;

    const group = document.createElement('div');
    group.className = 'day-group' + (isOpen ? ' open' : '') + (allDone ? ' complete' : '') +
      (peers[0] === day ? ' first-in-section' : '') + (peers[peers.length - 1] === day ? ' last-in-section' : '');

    const header = document.createElement('div');
    header.className = 'day-group-header';
    header.title = `Day ${dayNo(day)} — ${day.title}`;
    header.innerHTML = `
      <span class="rail-node${allDone ? ' done' : ''}${isOpen ? ' current' : ''}" style="--p:${Math.round(100 * doneCount / day.lessons.length)}">${allDone ? '✓' : dayNo(day)}</span>
      <span class="day-group-name">${day.title}</span>
      <span class="day-group-count">${allDone ? '' : `${doneCount}/${day.lessons.length}`}</span>`;
    header.onclick = () => group.classList.toggle('open');
    group.appendChild(header);

    const list = document.createElement('div');
    list.className = 'day-group-lessons';
    day.lessons.forEach(lesson => {
      const item = document.createElement('div');
      const done = completedLessons.has(lesson.id);
      const active = currentLesson && currentLesson.id === lesson.id;
      item.className = 'lesson-item' + (active ? ' active' : '');
      item.innerHTML = `
        <div class="lesson-dot ${done ? 'done' : active ? 'active' : ''}"></div>
        <div class="lesson-title-text">${lesson.title}</div>`;
      item.onclick = () => { currentDay = di; loadLesson(lesson); };
      list.appendChild(item);
    });
    group.appendChild(list);
    sb.appendChild(group);
  });
  // Keep the reader's place; bring the current day into view if it isn't.
  sb.scrollTop = scrollTop;
  const open = sb.querySelector('.day-group.open');
  if (open) {
    const top = open.offsetTop - sb.offsetTop, bottom = top + open.offsetHeight;
    if (top < sb.scrollTop || bottom > sb.scrollTop + sb.clientHeight) sb.scrollTop = Math.max(0, top - 60);
  }
  updateSidebarProgress();
}

function updateSidebarProgress() {
  const total = totalLessonCount();
  const done = doneLessonCount();
  const pct = Math.round((done / total) * 100);
  const fill = document.getElementById('sidebar-progress-fill');
  const count = document.getElementById('sidebar-progress-count');
  if (fill) fill.style.width = pct + '%';
  if (count) count.textContent = `${done} of ${total} lessons`;
}

function loadLesson(lesson) {
  stashPyDraft();
  currentLesson = lesson;
  currentDay = curriculum.findIndex(d => d.lessons.includes(lesson));
  trackPos[activeTrack] = lesson.id;
  saveTrackState();
  updateDayNav();
  const py = isPy(lesson);
  setEditorLanguage(py);

  translateMode = null;
  lastDiagnosis = '';
  const prepared = prepareLesson(lesson);

  const schemaPills = document.getElementById('schema-pills');
  schemaPills.innerHTML = relevantTables(lesson).map(t => `<span class="schema-pill" onclick="showSchema('${t}')">${t}</span>`).join('') +
    lessonModels(lesson).map(t => `<span class="schema-pill model" onclick="showSchema('${t}')" title="Pre-built for this lesson">◆ ${t}</span>`).join('') +
    Object.keys(lesson.files || {}).map(f => `<span class="schema-pill file" onclick="showLessonFile('${f}')" title="A file in this lesson's working folder — click to view it">${f}</span>`).join('') +
    (py && lesson.db ? `<span class="schema-pill file" onclick="showLessonFile('shop.db')" title="A fresh copy of the practice database, in the working folder">shop.db</span>` : '');
  const reseed = document.querySelector('.reseed-btn');
  if (reseed) reseed.style.display = py ? 'none' : '';

  const dayData = curriculum.find(d => d.lessons.includes(lesson));
  const total = curriculum.flatMap(d => d.lessons).length;
  const pct = Math.round((doneLessonCount() / total) * 100);

  currentExercise = null;
  document.getElementById('exercise-bar').style.display = 'none';

  document.getElementById('lesson-panel').innerHTML = `
    <div class="lesson-meta">
      <span class="lesson-meta-day">Day ${dayNo(dayData)}</span>
      ${py ? '<span class="lang-tag">Python</span>' : ''}
      <span>${dayData.title}</span>
      <span>Lesson ${dayData.lessons.indexOf(lesson) + 1} of ${dayData.lessons.length}</span>
      <span class="lesson-meta-xp${completedLessons.has(lesson.id) ? ' earned' : ''}">${completedLessons.has(lesson.id) ? '✓ ' : ''}${lesson.xp} XP</span>
    </div>
    <div class="lesson-heading">${lesson.title}</div>
    <div class="lesson-body">${lesson.theory}</div>
    <div class="concept-chips">${lesson.chips.map(c => `<span class="chip ${c.c}">${c.t}</span>`).join('')}</div>
    <div class="task-box">
      <div class="task-label">${lesson.translate ? 'Step 1: solve it in SQLite' : 'Your task'}</div>
      <div class="task-text">${lesson.task}</div>
    </div>
    ${lesson.liveSetup ? `<div class="prebuilt-note${prepared ? '' : ' failed'}">${prepared
      ? (lessonModels(lesson).length ? `◆ Pre-built for this lesson: ${lessonModels(lesson).map(m => `<code>${m}</code>`).join(', ')} — the official versions of earlier models, so a slip on a previous day can't follow you here. ` : '') + `This lesson's own target is dropped each time you open it; <strong>↺ Reset data</strong> restores this state.`
      : `Couldn't prepare this lesson's models — press <strong>↺ Reset data</strong> and reopen the lesson.`}</div>` : ''}
    <div id="translate-panel"></div>
    <div id="exercises-list"></div>
  `;

  if (editor) { editor.setValue(py ? pyDraftFor(lesson) : ''); editor.clearHistory(); }
  lastResults = null;
  showEmpty();
  buildSidebar();
  renderExercisesList();
  renderTranslatePanel();
  saveProgress();
  if (py) warmPython(lesson);
}

function showEmpty() {
  const py = isPy(currentLesson);
  document.getElementById('output-content').innerHTML = `<div class="empty-state"><div class="empty-icon">▶</div><div>${py ? 'Run your code to see what it prints' : 'Run your query to see results'}</div><div style="margin-top:4px"><span class="kbd">Ctrl</span> <span class="kbd">Enter</span></div>${py ? '<div class="py-status" id="py-status"></div>' : ''}</div>`;
  document.getElementById('row-count').style.display = 'none';
  if (py) setPyStatus(pyStatusText);
}

let lastExecMs = null;

// Column names of the last row-returning statement in `sql`, or null if no
// statement returns rows (i.e. it's purely DDL/DML). Used to detect a SELECT
// that ran fine but matched zero rows, which db.exec() reports the same as a
// data change. Compiling statements here does not re-run them (no step()), so
// side effects from the preceding db.exec() are not duplicated.
function resultColumnsFor(sql) {
  try {
    if (typeof db.iterateStatements !== 'function') return null;
    let cols = null;
    for (const stmt of db.iterateStatements(sql)) {
      const c = stmt.getColumnNames();
      if (c && c.length) cols = c;
      stmt.free();
    }
    return cols;
  } catch { return null; }
}

function runQuery() {
  if (!db || !currentLesson) return;
  if (isPy(currentLesson)) { runPython(); return; }
  if (translateMode !== null) { checkTranslation(); return; }
  const sql = editor ? editor.getValue().trim() : '';
  if (!sql) return;
  try {
    const t0 = performance.now();
    const results = db.exec(sql);
    lastExecMs = performance.now() - t0;
    queriesRun++;
    addQueryToHistory(sql);
    if (results.length === 0) {
      // db.exec() returns [] for BOTH a real DDL/DML statement AND a SELECT
      // that simply matched zero rows. Tell them apart so a legitimately empty
      // SELECT is shown as "0 rows" and still validated — not mislabelled as a
      // data change.
      const emptyCols = resultColumnsFor(sql);
      if (emptyCols) {
        renderTable(emptyCols, []);
        gradeSubmission(sql, emptyCols, []);
        checkAchievements();
        return;
      }
      showFeedback('info', 'Statement executed', 'No rows returned — a data change or DDL statement ran successfully. Add a SELECT at the end to inspect the result.');
      document.getElementById('row-count').style.display = 'none';
      gradeSubmission(sql, [], []);
      checkAchievements();
      return;
    }
    // Multiple statements can run at once; show the last result set so
    // "CREATE ...; INSERT ...; SELECT ..." flows display the final SELECT.
    const { columns, values } = results[results.length - 1];
    renderTable(columns, values);
    gradeSubmission(sql, columns, values);
    checkAchievements();
  } catch (e) {
    errorsMade++;
    breakCombo();
    playSound('error');
    showFeedback('error', 'SQL Error', escapeHtml(e.message));
    document.getElementById('row-count').style.display = 'none';
    checkAchievements();
  }
}

function renderTable(columns, values) {
  lastResults = { columns, values };
  activeTab = 'results';
  document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.output-tab')[0].classList.add('active');
  let html = `<table class="result-table"><thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
  values.forEach(row => {
    html += `<tr>${row.map(v => {
      if (v === null) return `<td class="null">NULL</td>`;
      if (typeof v === 'number') return `<td class="num">${v.toLocaleString()}</td>`;
      return `<td class="str">${escapeHtml(String(v))}</td>`;
    }).join('')}</tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('output-content').innerHTML = html;
  const rc = document.getElementById('row-count');
  rc.style.display = 'flex';
  const timing = lastExecMs !== null ? ` · ${lastExecMs < 1 ? '<1' : Math.round(lastExecMs)} ms` : '';
  document.getElementById('row-count-text').textContent =
    `${values.length} row${values.length !== 1 ? 's' : ''} · ${columns.length} column${columns.length !== 1 ? 's' : ''}${timing}`;
}

function exportCSV() {
  if (!lastResults) return;
  const esc = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [lastResults.columns.map(esc).join(',')];
  for (const row of lastResults.values) lines.push(row.map(esc).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'query-results.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function checkSolution(sql, opts) {
  if (!currentLesson) return false;
  // Correctness is decided purely by RESULT-SET EQUIVALENCE (engine.js): a query
  // is correct iff it produces the same results as a reference answer — however
  // it's written. Every lesson has authored references, so there is no text
  // matching. State-changing lessons are judged by a state probe; open-ended
  // capstones by a structural accept path.
  const lesson = currentLesson;
  let verdict = 'unknown';
  try { verdict = SqlEngine.evaluate(sql, lesson); } catch { verdict = 'unknown'; }
  const matches = verdict === 'pass';
  const done = completedLessons.has(lesson.id);

  if (matches && !done) {
    lastDiagnosis = '';
    if (lesson.translate && lesson.translate.length) {
      // Dialect lesson: the SQLite answer is step 1 of 2+.
      const first = !translationsDone.has(lesson.id + ':sqlite');
      translationsDone.add(lesson.id + ':sqlite');
      saveProgress();
      renderTranslatePanel();
      const pending = nextTranslation(lesson);
      if (pending === -1) {
        completeLesson(lesson);
      } else if (first) {
        playSound('exercise');
        prependOutput(`<div class="feedback-box feedback-success"><div class="feedback-label">✓ SQLite version correct</div>That's the right result. Now the part this lesson is really about: write the same query for <strong>${DialectCheck.labelFor(lesson.translate[pending])}</strong>.</div>
          <button class="next-btn" onclick="startTranslation(${pending})">Translate to ${DialectCheck.labelFor(lesson.translate[pending])} →</button>`);
      }
    } else {
      completeLesson(lesson);
    }
  } else if (verdict === 'fail' && !done && (!opts || opts.explain !== false) && !translationsDone.has(lesson.id + ':sqlite')) {
    showExplanation(sql, lesson);
  }
  return matches;
}

// Mark a lesson complete: XP, success banner, next-lesson button.
function completeLesson(lesson) {
  if (completedLessons.has(lesson.id)) return;
  completedLessons.add(lesson.id);
  const earned = awardXP(lesson.xp);
  playSound('correct');
  const next = getNextLesson();
  const comboNote = combo >= 3 ? ` <span style="color:var(--amber)">🔥 ${combo}× combo</span>` : '';
  let html = `<div class="feedback-box feedback-success"><div class="feedback-label">✓ Correct! +${earned} XP${comboNote}</div>${lesson.translate ? 'Both versions done — you can write this one in any warehouse.' : isPy(lesson) ? 'Well done — it does exactly what was asked, on every input the check tried.' : 'Well done! Your query works perfectly.'}</div>`;
  if (next) {
    html += `<button class="next-btn" onclick="loadLesson(getNextLesson())">Next Lesson →</button>`;
  } else {
    html += `<div class="feedback-box feedback-info" style="margin-top:8px"><div class="feedback-label">🏆 Course Complete!</div>You've finished SQL Quest with ${xp.toLocaleString()} XP. Open your <a href="#" onclick="openCareerModal();return false" style="color:var(--accent)">Data Engineer Readiness report</a> — then prove it in a <a href="#" onclick="openInterview();return false" style="color:var(--accent)">mock interview</a>.</div>`;
    burstConfetti(true);
  }
  prependOutput(html);
  buildSidebar();
}

// ── Wrong-answer explainer (explain.js) ──
// Shown as a collapsed line above the results, so exploratory queries aren't
// buried in feedback; it remembers whether you like it open.
function showExplanation(sql, lesson) {
  let d = null;
  try { d = SqlExplain.diagnose(sql, lesson); } catch { d = null; }
  if (!d || d.verdict !== 'fail') { lastDiagnosis = ''; return; }
  lastDiagnosis = SqlExplain.summarize(d);
  const open = localStorage.getItem('sql_bootcamp_explain_open') === '1';
  const shape = d.got
    ? `Expected ${d.expected.rows} row${d.expected.rows === 1 ? '' : 's'} × ${d.expected.cols} column${d.expected.cols === 1 ? '' : 's'} · yours: ${d.got.rows} × ${d.got.cols}`
    : `Expected ${d.expected.rows} row${d.expected.rows === 1 ? '' : 's'} × ${d.expected.cols} column${d.expected.cols === 1 ? '' : 's'}`;
  const ask = AI.ready() ? ` · <a href="#" onclick="askTutorWhy();return false">Ask the AI tutor</a>` : '';
  prependOutput(`<details class="explain-box"${open ? ' open' : ''} ontoggle="localStorage.setItem('sql_bootcamp_explain_open', this.open ? '1' : '0')">
    <summary><span class="explain-kicker">Not the answer yet</span><span class="explain-headline">${escapeHtml(d.headline)}</span></summary>
    <ul class="explain-points">${d.points.map(pt => `<li>${pt}</li>`).join('')}</ul>
    <div class="explain-foot">${d.stateCheck ? 'Compared on the resulting database state · ' : ''}${shape}${ask}</div>
  </details>`);
}

// ── Dialect lessons: step 2, the structural translation check ──
function nextTranslation(lesson) {
  if (!lesson || !lesson.translate) return -1;
  return lesson.translate.findIndex((_, i) => !translationsDone.has(lesson.id + ':' + i));
}

function renderTranslatePanel() {
  const el = document.getElementById('translate-panel');
  if (!el) return;
  const lesson = currentLesson;
  if (!lesson || !lesson.translate || !lesson.translate.length) { el.innerHTML = ''; updateRunButton(); return; }
  const all = completedLessons.has(lesson.id);
  const sqliteDone = all || translationsDone.has(lesson.id + ':sqlite');
  const steps = lesson.translate.map((tr, i) => {
    const done = all || translationsDone.has(lesson.id + ':' + i);
    const active = translateMode === i;
    const locked = !sqliteDone;
    return `<div class="tr-step${done ? ' done' : ''}${active ? ' active' : ''}${locked ? ' locked' : ''}" ${locked ? '' : `onclick="startTranslation(${i})"`}>
      <span class="tr-num">${done ? '✓' : i + 2}</span>
      <span class="tr-body"><span class="tr-title">Step ${i + 2} · ${DialectCheck.labelFor(tr)} — checked structurally</span>
        <span class="tr-prompt">${tr.prompt}</span></span>
      ${locked ? '<span class="tr-state">🔒 solve step 1 first</span>' : active ? '<span class="tr-state">in the editor now</span>' : done ? '' : '<span class="tr-state go">Start →</span>'}
    </div>`;
  }).join('');
  el.innerHTML = `<div class="translate-panel">
      <div class="tr-step${sqliteDone ? ' done' : ''}${translateMode === null && !sqliteDone ? ' active' : ''}" onclick="exitTranslation()">
        <span class="tr-num">${sqliteDone ? '✓' : 1}</span>
        <span class="tr-body"><span class="tr-title">Step 1 · SQLite — runs here, graded on its results</span></span>
        ${translateMode !== null ? '<span class="tr-state go">Back to SQLite</span>' : ''}
      </div>
      ${steps}
      <div class="tr-note">A Snowflake or BigQuery query can't run in the browser, so steps 2+ are checked for the right constructs — then you compare against a model answer.</div>
    </div>`;
  updateRunButton();
}

function updateRunButton() {
  const btn = document.querySelector('.editor-buttons .btn-primary');
  if (!btn) return;
  const tr = translateMode !== null && currentLesson && currentLesson.translate ? currentLesson.translate[translateMode] : null;
  btn.textContent = pyBusy ? 'Running…' : tr ? `Check ${DialectCheck.labelFor(tr)}` : isPy(currentLesson) ? 'Run code' : 'Run query';
  btn.disabled = pyBusy;
  btn.classList.toggle('checking', !!tr);
  const wrap = document.getElementById('sql-editor-wrap');
  if (wrap) wrap.classList.toggle('translating', !!tr);
}

function startTranslation(i) {
  const lesson = currentLesson;
  if (!lesson || !lesson.translate || !lesson.translate[i]) return;
  if (!completedLessons.has(lesson.id) && !translationsDone.has(lesson.id + ':sqlite')) return;
  if (currentExercise) clearExercise();
  translateMode = i;
  const tr = lesson.translate[i];
  renderTranslatePanel();
  showFeedback('info', `Translate to ${DialectCheck.labelFor(tr)}`,
    `${tr.prompt}<div class="tr-howto">Edit the query in the editor into ${DialectCheck.labelFor(tr)} syntax, then press <strong>Check</strong> (or Ctrl+Enter). It won't be executed — the check looks for the right constructs.</div>`);
  document.getElementById('row-count').style.display = 'none';
  if (editor) editor.focus();
}

function exitTranslation() {
  if (translateMode === null) return;
  translateMode = null;
  renderTranslatePanel();
  showEmpty();
}

function checkTranslation() {
  const lesson = currentLesson;
  const i = translateMode;
  const tr = lesson && lesson.translate && lesson.translate[i];
  if (!tr) return;
  const sql = editor ? editor.getValue().trim() : '';
  if (!sql) return;
  const label = DialectCheck.labelFor(tr);
  document.getElementById('row-count').style.display = 'none';
  const res = DialectCheck.check(sql, tr);
  if (!res.ok) {
    playSound('error');
    lastDiagnosis = `${label} translation check: ` + res.problems.map(pr => stripTags(pr.msg)).join(' ');
    showFeedback('error', `Not ${label} yet`,
      `<ul class="explain-points">${res.problems.map(pr => `<li>${pr.msg}</li>`).join('')}</ul><div class="explain-foot">Structural check — the query is not executed.</div>`);
    return;
  }
  lastDiagnosis = '';
  const key = lesson.id + ':' + i;
  const fresh = !translationsDone.has(key) && !completedLessons.has(lesson.id);
  translationsDone.add(key);
  saveProgress();
  const model = `<div class="section-mini-title">Model answer — compare with yours</div><pre class="model-sql">${escapeHtml(tr.model)}</pre>`;
  const pending = nextTranslation(lesson);
  showFeedback('success', `✓ ${label}: structure checks out`,
    `Every construct the check looks for is there, and the SQLite-only syntax is gone. It can't be run here, so read it against the model answer once.`);
  document.getElementById('output-content').insertAdjacentHTML('beforeend', model);
  if (pending !== -1) {
    playSound('exercise');
    translateMode = null;
    renderTranslatePanel();
    document.getElementById('output-content').insertAdjacentHTML('beforeend',
      `<button class="next-btn" onclick="startTranslation(${pending})">Next: ${DialectCheck.labelFor(lesson.translate[pending])} →</button>`);
  } else {
    translateMode = null;
    if (fresh || !completedLessons.has(lesson.id)) completeLesson(lesson);
    renderTranslatePanel();
  }
}

function getNextLesson() {
  const all = curriculum.flatMap(d => d.lessons);
  const idx = all.findIndex(l => l.id === currentLesson.id);
  return idx < all.length - 1 ? all[idx + 1] : null;
}

function showFeedback(type, label, msg) {
  document.getElementById('output-content').innerHTML = `<div class="feedback-box feedback-${type}"><div class="feedback-label">${label}</div>${msg}</div>`;
}

function showHint() {
  if (!currentLesson) return;
  hintsUsed++;
  const hadCombo = combo >= 2;
  breakCombo();
  saveProgress();
  let hintText = currentExercise ? currentExercise.hint : currentLesson.hint;
  if (translateMode !== null && currentLesson.translate && currentLesson.translate[translateMode]) {
    // In translation mode the hint is the first thing the check still wants.
    const tr = currentLesson.translate[translateMode];
    const res = DialectCheck.check(editor ? editor.getValue() : '', tr);
    const gap = res.problems.find(pr => pr.type !== 'empty');
    hintText = gap ? gap.msg : (tr.requires[0] ? tr.requires[0].msg : tr.prompt);
  }
  const comboNote = hadCombo ? `<div style="font-size:10.5px;color:var(--text3);margin-top:6px">💔 Combo reset — hints are free, but they cost your streak of clean solves.</div>` : '';
  const existing = document.getElementById('output-content').innerHTML;
  const hint = `<div class="feedback-box feedback-hint"><div class="feedback-label">💡 Hint</div>${escapeHint(hintText)}${comboNote}</div>`;
  document.getElementById('output-content').innerHTML = hint + (existing.includes('empty-state') ? '' : '<hr class="divider">' + existing);
}

// Hints are authored as HTML (they use <code>), but capstone hints quote SQL
// with comparison operators — escape a bare < or > that isn't part of a tag.
function escapeHint(h) {
  return String(h || '').replace(/<(?!\/?(code|strong|em|br|pre)\b)/g, '&lt;');
}

function resetQuery() {
  if (!currentLesson || !editor) return;
  if (isPy(currentLesson)) {
    // Back to the starter for whatever is in the editor (lesson or exercise), dropping the saved draft.
    const spec = currentExercise || currentLesson;
    delete pyDrafts[spec.id];
    savePyDrafts();
    editor.setValue(spec.starter || '');
  } else {
    editor.setValue(currentLesson.starter);
  }
  showEmpty();
}

function showSchema(tableName) {
  activeTab = 'schema';
  document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.output-tab')[1].classList.add('active');
  document.getElementById('row-count').style.display = 'none';
  let tbl = schemas[tableName];
  if (!tbl) {
    // A pre-built model (view/table created by the lesson's setup): describe it
    // from the live database.
    let info = null;
    try { info = db.exec(`SELECT name, type, pk FROM pragma_table_info('${tableName}')`); } catch (e) {}
    if (!info || !info[0]) {
      document.getElementById('output-content').innerHTML = `<div class="feedback-box feedback-info"><div class="feedback-label">${tableName}</div>This model doesn't exist in the practice database right now — press <strong>↺ Reset data</strong> to rebuild it.</div>`;
      return;
    }
    tbl = { cols: info[0].values.map(r => ({ name: r[0], type: r[1] || 'computed', pk: !!r[2] })) };
  }
  let result;
  try { result = db.exec(`SELECT * FROM ${tableName} LIMIT 3`); } catch(e) {}
  let html = `<div class="schema-table-view">
    <div class="schema-table-name">${schemas[tableName] ? '📋' : '◆'} ${tableName}</div>
    ${tbl.cols.map(c => `<div class="schema-col">
      <span class="schema-col-name">${c.name}</span>
      <span class="schema-col-type">${c.type}</span>
      ${c.pk ? '<span class="schema-pk">PK</span>' : ''}
    </div>`).join('')}
  </div>`;
  if (result && result[0]) {
    html += `<div class="section-mini-title">Sample Data</div>`;
    html += `<table class="result-table" style="font-size:11px"><thead><tr>${result[0].columns.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    result[0].values.forEach(row => { html += `<tr>${row.map(v=>`<td>${v === null ? 'NULL' : escapeHtml(String(v))}</td>`).join('')}</tr>`; });
    html += `</tbody></table>`;
  }
  document.getElementById('output-content').innerHTML = html;
}

function switchTab(name, el) {
  activeTab = name;
  document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  if (name === 'ai') renderAITab();
  else if (name === 'schema' && currentLesson) {
    if (currentLesson.tables && currentLesson.tables.length) showSchema(currentLesson.tables[0]);
    else showLessonFile(Object.keys(currentLesson.files || {})[0]);
  }
  else if (name === 'results') {
    if (lastResults) renderTable(lastResults.columns, lastResults.values);
    else showEmpty();
  }
}

// ── Python lessons ──
// Drafts: Python answers run to many lines, so what's in the editor is kept per
// lesson / exercise (localStorage) and restored when you come back. "Reset"
// returns to the starter.
const PY_DRAFTS_KEY = 'sql_bootcamp_py_drafts';
let pyDrafts = {};
try { pyDrafts = JSON.parse(localStorage.getItem(PY_DRAFTS_KEY) || '{}') || {}; } catch { pyDrafts = {}; }
function savePyDrafts() { try { localStorage.setItem(PY_DRAFTS_KEY, JSON.stringify(pyDrafts)); } catch {} }
function pyDraftFor(spec) { return pyDrafts[spec.id] !== undefined ? pyDrafts[spec.id] : (spec.starter || ''); }
function stashPyDraft() {
  if (!editor || !isPy(currentLesson)) return;
  const spec = currentExercise || currentLesson;
  const code = editor.getValue();
  if (code === (spec.starter || '')) delete pyDrafts[spec.id]; else pyDrafts[spec.id] = code;
  savePyDrafts();
}

function setEditorLanguage(py) {
  if (!editor) return;
  editor.setOption('mode', py ? 'python' : 'text/x-sql');
  editor.setOption('indentUnit', py ? 4 : 2);
  editor.setOption('tabSize', py ? 4 : 2);
  const wrap = document.getElementById('sql-editor-wrap');
  if (wrap) wrap.classList.toggle('py-mode', py);
  updateRunButton();
}

// Start the interpreter in the background as soon as a Python lesson opens, so
// the first Run doesn't pay for it.
let pyStatusText = '';
function setPyStatus(text) {
  pyStatusText = text || '';
  const el = document.getElementById('py-status');
  if (el) el.textContent = pyStatusText;
}
async function ensurePython(lesson) {
  if (typeof PyRunner === 'undefined') throw new Error('python.js is not loaded');
  if (!PyRunner.ready()) setPyStatus('Starting Python — a few seconds, once per visit…');
  await PyRunner.load(setPyStatus);
  await PyRunner.ensurePackages(lesson.pkgs, setPyStatus);
  setPyStatus('Python is ready.');
}
function warmPython(lesson) {
  ensurePython(lesson).catch(e => setPyStatus('Python could not start: ' + e.message));
}

let pyErrorLine = null;
function clearPyErrorLine() {
  if (pyErrorLine !== null && editor) { editor.removeLineClass(pyErrorLine, 'background', 'py-error-line'); }
  pyErrorLine = null;
}
function markPyErrorLine(line) {
  clearPyErrorLine();
  if (!editor || !line || line < 1 || line > editor.lineCount()) return;
  pyErrorLine = editor.addLineClass(line - 1, 'background', 'py-error-line');
}

// `code` in a check message → <code>, everything else escaped.
function formatPyMessage(msg) {
  return escapeHtml(msg || '').replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderPyOutput(g, ms) {
  activeTab = 'results';
  document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.output-tab')[0].classList.add('active');
  document.getElementById('row-count').style.display = 'none';
  lastResults = null;
  const timing = ms != null ? ` · ${ms < 1 ? '<1' : Math.round(ms)} ms` : '';
  const out = g.out
    ? `<pre class="py-console">${escapeHtml(g.out)}</pre>`
    : `<div class="py-console empty">${g.error ? 'Nothing was printed before the error.' : 'Nothing was printed. Use print(...) to see a value.'}</div>`;
  let html = '';
  if (g.error) {
    const e = g.error;
    const where = e.line ? ` on line ${e.line}` : '';
    html += `<div class="feedback-box feedback-error"><div class="feedback-label">${escapeHtml(e.type)}${where}</div><div class="py-error-msg">${escapeHtml(e.msg)}</div>${e.tip ? `<div class="py-error-tip">${escapeHtml(e.tip)}</div>` : ''}</div>`;
  }
  html += `<div class="py-out-label">Output${timing}</div>${out}`;
  document.getElementById('output-content').innerHTML = html;
}

async function runPython() {
  if (pyBusy || !currentLesson) return;
  const lesson = currentLesson, ex = currentExercise;
  const spec = ex || lesson;
  const code = editor ? editor.getValue() : '';
  if (!code.trim()) return;
  stashPyDraft();
  clearPyErrorLine();
  pyBusy = true;
  updateRunButton();
  try {
    if (!PyRunner.ready() || (lesson.pkgs || []).length) {
      if (!PyRunner.ready()) showFeedback('info', 'Starting Python…', 'The interpreter loads once per visit — a few seconds. After that, runs are instant.');
      await ensurePython(lesson);
    }
    await new Promise(r => setTimeout(r, 0));          // let "Running…" paint
    const t0 = performance.now();
    const g = PyRunner.grade(code, spec, lesson);
    const ms = performance.now() - t0;
    if (currentLesson !== lesson || currentExercise !== ex) return;   // moved on while it ran
    queriesRun++;
    addQueryToHistory(code);
    renderPyOutput(g, ms);
    if (g.verdict === 'error') {
      errorsMade++;
      breakCombo();
      playSound('error');
      markPyErrorLine(g.error.line);
      lastDiagnosis = `Python stopped with ${g.error.type}: ${g.error.msg}${g.error.line ? ` (line ${g.error.line})` : ''}`;
    } else if (g.verdict === 'pass') {
      lastDiagnosis = '';
      if (ex) creditExercise(ex);
      else if (!completedLessons.has(lesson.id)) completeLesson(lesson);
      else prependOutput(`<div class="feedback-box feedback-success"><div class="feedback-label">✓ Passes</div>Still correct — this lesson is already complete.${getNextLesson() ? ' <a href="#" onclick="loadLesson(getNextLesson());return false" style="color:var(--accent)">Next lesson →</a>' : ''}</div>`);
    } else {
      lastDiagnosis = stripTags(g.why);
      const ask = AI.ready() ? `<div class="explain-foot"><a href="#" onclick="askTutorWhy();return false">Ask the AI tutor</a></div>` : '';
      prependOutput(`<div class="feedback-box feedback-info py-not-yet"><div class="feedback-label">It runs — not the answer yet</div>${formatPyMessage(g.why)}${ask}</div>`);
    }
    saveProgress();
    checkAchievements();
  } catch (e) {
    showFeedback('error', 'Python could not run', escapeHtml(String(e && e.message || e)) + '<div class="py-error-tip">Reload the page and try again. If it keeps happening, your browser may be too old for the Python lessons — the SQL lessons are unaffected.</div>');
  } finally {
    pyBusy = false;
    updateRunButton();
  }
}

// A lesson's working-folder files, shown in the Schema tab.
function showLessonFile(name) {
  activeTab = 'schema';
  document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.output-tab')[1].classList.add('active');
  document.getElementById('row-count').style.display = 'none';
  const box = document.getElementById('output-content');
  const files = (currentLesson && currentLesson.files) || {};
  if (name === 'shop.db') {
    const tables = (currentLesson.tables && currentLesson.tables.length ? currentLesson.tables : Object.keys(schemas).filter(t => !t.startsWith('raw_')));
    box.innerHTML = `<div class="feedback-box feedback-info"><div class="feedback-label">shop.db</div>A SQLite file holding the practice database from the SQL days. Open it with <code>sqlite3.connect("shop.db")</code>. Every run starts from a fresh copy, so nothing you write to it carries over.</div>
      <div class="section-mini-title">Tables</div><div class="schema-pills" style="margin:6px 0 0">${tables.map(t => `<span class="schema-pill" onclick="showSchema('${t}')">${t}</span>`).join('')}</div>`;
    return;
  }
  if (!name || files[name] === undefined) {
    box.innerHTML = `<div class="feedback-box feedback-info"><div class="feedback-label">No tables or files</div>This lesson works on values written in the code itself.</div>`;
    return;
  }
  const lines = files[name].replace(/\n$/, '').split('\n').length;
  box.innerHTML = `<div class="schema-table-view"><div class="schema-table-name">${escapeHtml(name)}</div></div>
    <div class="py-out-label">${lines} line${lines === 1 ? '' : 's'} · in the working folder · restored before every run</div>
    <pre class="py-console file">${escapeHtml(files[name])}</pre>`;
}

// ── AI Tutor ──
// Optional, and not tied to a paid API: ai.js talks to a local model (Ollama,
// LM Studio, llama.cpp, …) or to the Anthropic API. Grading, hints and the
// wrong-answer explainer never need it.
let aiSettingsOpen = false;
let aiLocalModels = [];
let aiStatus = null;               // { type: 'ok' | 'err' | 'info', msg }

// Model output is untrusted text: escape it, then allow a little formatting.
function formatAI(text) {
  let h = escapeHtml(String(text || '').trim());
  h = h.replace(/```[a-z]*\n?([\s\S]*?)```/g, (_, code) => `<pre class="model-sql">${code.replace(/\n+$/, '')}</pre>`);
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  return h.replace(/\n/g, '<br>').replace(/<\/pre><br>/g, '</pre>');
}

function readAIForm() {
  const patch = {};
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : null; };
  if (v('ai-local-url') !== null) patch.localUrl = v('ai-local-url');
  if (v('ai-local-model') !== null) patch.localModel = v('ai-local-model');
  if (v('ai-anthropic-key') !== null) patch.anthropicKey = v('ai-anthropic-key');
  if (v('ai-anthropic-model') !== null && v('ai-anthropic-model')) patch.anthropicModel = v('ai-anthropic-model');
  return patch;
}
function toggleAISettings() { AI.save(readAIForm()); aiSettingsOpen = !aiSettingsOpen; aiStatus = null; renderAITab(); }
function setAIProvider(provider) { AI.save(Object.assign(readAIForm(), { provider })); aiStatus = null; renderAITab(); }
function setAIPreset(id) {
  const preset = AI.LOCAL_PRESETS.find(x => x.id === id);
  if (!preset) return;
  AI.save(Object.assign(readAIForm(), { localUrl: preset.url }));
  aiLocalModels = [];
  detectLocalModels(true);
}
// `keepSaved`: the caller just saved new settings — don't re-read the (stale) form.
async function detectLocalModels(keepSaved) {
  if (keepSaved !== true) AI.save(readAIForm());
  aiStatus = { type: 'info', msg: 'Looking for models…' };
  renderAITab();
  try {
    aiLocalModels = await AI.listLocalModels();
    if (!aiLocalModels.length) {
      aiStatus = { type: 'err', msg: 'The server answered, but it has no models yet. Pull or load one first (see “How do I get a local model?” below).' };
    } else {
      if (!aiLocalModels.includes(AI.config().localModel)) AI.save({ localModel: aiLocalModels[0] });
      aiStatus = { type: 'ok', msg: `Found ${aiLocalModels.length} model${aiLocalModels.length === 1 ? '' : 's'}. Pick one and press Save & test.` };
    }
  } catch (e) {
    aiLocalModels = [];
    aiStatus = { type: 'err', msg: e.message };
  }
  renderAITab();
}
async function saveAISettings() {
  AI.save(readAIForm());
  if (!AI.ready()) {
    aiStatus = { type: 'err', msg: AI.config().provider === 'anthropic' ? 'That key doesn’t look right — Anthropic API keys start with sk-ant-.' : 'Enter the server URL and a model name (or press Detect models).' };
    renderAITab();
    return;
  }
  aiStatus = { type: 'info', msg: 'Testing…' };
  renderAITab();
  try {
    await AI.chat({ system: 'Reply with the single word: ready', messages: [{ role: 'user', content: 'Are you there?' }], maxTokens: 20 });
    aiStatus = { type: 'ok', msg: `Connected — ${AI.label()} is answering.` };
    aiSettingsOpen = false;
  } catch (e) {
    aiStatus = { type: 'err', msg: e.message };
  }
  renderAITab();
}

function aiSettingsHtml() {
  const c = AI.config();
  const local = c.provider !== 'anthropic';
  const status = aiStatus ? `<div class="ai-key-status ${aiStatus.type === 'ok' ? 'ok' : aiStatus.type === 'err' ? 'missing' : 'info'}">${aiStatus.type === 'ok' ? '✓ ' : aiStatus.type === 'err' ? '⚠ ' : ''}${escapeHtml(aiStatus.msg)}</div>` : '';
  const models = aiLocalModels.length ? aiLocalModels : (c.localModel ? [c.localModel] : []);
  const body = local ? `
      <div class="ai-presets">${AI.LOCAL_PRESETS.map(pr => `<button class="schema-pill${c.localUrl === pr.url ? ' on' : ''}" onclick="setAIPreset('${pr.id}')">${pr.name}</button>`).join('')}</div>
      <label class="ai-field"><span>Server URL</span><input class="ai-key-input" id="ai-local-url" value="${escapeHtml(c.localUrl)}" placeholder="http://localhost:11434/v1" spellcheck="false"></label>
      <label class="ai-field"><span>Model</span>
        ${aiLocalModels.length
          ? `<select class="ai-key-input" id="ai-local-model">${models.map(m => `<option${m === c.localModel ? ' selected' : ''}>${escapeHtml(m)}</option>`).join('')}</select>`
          : `<input class="ai-key-input" id="ai-local-model" value="${escapeHtml(c.localModel)}" placeholder="e.g. llama3.2" spellcheck="false">`}
      </label>
      <div class="ai-key-row">
        <button class="btn btn-ghost" onclick="detectLocalModels()">Detect models</button>
        <button class="btn btn-primary" onclick="saveAISettings()">Save &amp; test</button>
      </div>
      ${status}
      <details class="ai-help"><summary>How do I get a local model?</summary>
        <ol>
          <li>Install <strong>Ollama</strong> (ollama.com) or <strong>LM Studio</strong> (lmstudio.ai). Both are free and run entirely on your machine.</li>
          <li>Get a chat model. Ollama: <code>ollama pull llama3.2</code> — a coding-tuned model such as <code>qwen2.5-coder</code> gives sharper SQL help if your machine can run it. LM Studio: download a model, then start the local server from its Developer tab.</li>
          <li>Pick the matching preset above and press <strong>Detect models</strong>.</li>
        </ol>
        <p><strong>Blocked?</strong> A browser page needs the server's permission to call it (CORS). Ollama: set the environment variable <code>OLLAMA_ORIGINS=*</code> and restart Ollama (Windows: <code>setx OLLAMA_ORIGINS "*"</code>, then quit and reopen it). LM Studio: switch on <em>Enable CORS</em> in the server settings.</p>
        <p>Small models are fine for hints and follow-up questions. They are never asked whether your SQL is correct — the built-in engine decides that.</p>
      </details>` : `
      <label class="ai-field"><span>API key</span><input class="ai-key-input" type="password" id="ai-anthropic-key" placeholder="sk-ant-..." value="${escapeHtml(c.anthropicKey)}"></label>
      <label class="ai-field"><span>Model</span><input class="ai-key-input" id="ai-anthropic-model" value="${escapeHtml(c.anthropicModel)}" spellcheck="false"></label>
      <div class="ai-key-row"><button class="btn btn-primary" onclick="saveAISettings()">Save &amp; test</button></div>
      ${status}
      <p class="ai-note">Uses your own Anthropic API key (console.anthropic.com), billed per use — separate from a Claude.ai subscription. The key is stored only in this browser and sent only to Anthropic.</p>`;
  return `
    <div class="ai-key-setup">
      <strong>Choose where the tutor runs.</strong> It's optional — grading, hints and the “why isn't this passing?” explainer work with no AI at all.
      <div class="ai-provider-tabs">
        <button class="ai-provider${local ? ' on' : ''}" onclick="setAIProvider('local')">🖥 Local model<small>free · offline · no account</small></button>
        <button class="ai-provider${local ? '' : ' on'}" onclick="setAIProvider('anthropic')">☁ Anthropic API<small>your own API key</small></button>
      </div>
      ${body}
    </div>`;
}

function renderAITab() {
  if (aiMessages.length === 0) {
    aiMessages.push({role:'assistant', content:"Hi! I'm your SQL tutor. Ask me anything about the current lesson or SQL concepts. I'll give hints rather than spoilers! 🎓"});
  }
  const ok = AI.ready();
  // Once the setup panel is showing, keep it up until a successful Save & test
  // (detecting models makes the config "ready" before the user has confirmed).
  if (!ok) aiSettingsOpen = true;
  const showSettings = aiSettingsOpen;
  document.getElementById('row-count').style.display = 'none';
  document.getElementById('output-content').innerHTML = `
    <div class="ai-chat">
      <div class="ai-bar">
        <span class="ai-bar-status ${ok ? 'ok' : 'off'}">${ok ? '● ' + escapeHtml(AI.label()) : '○ No model connected'}</span>
        ${ok ? `<button class="btn btn-ghost" onclick="toggleAISettings()">${aiSettingsOpen ? 'Close' : '⚙ Model'}</button>` : ''}
      </div>
      ${showSettings ? aiSettingsHtml() : ''}
      <div class="ai-messages" id="ai-messages">${aiMessages.map(m => `<div class="ai-msg ${m.role}">${m.role === 'assistant' ? formatAI(m.content) : escapeHtml(m.content)}</div>`).join('')}</div>
      ${ok && lastDiagnosis ? `<div class="ai-quick"><button class="schema-pill" onclick="askTutorWhy()">Why isn't my last query passing?</button></div>` : ''}
      <div class="ai-input-row">
        <input class="ai-input" type="text" id="ai-input" placeholder="${ok ? 'Ask a question...' : 'Connect a model above to chat with the tutor'}" ${ok ? '' : 'disabled'} onkeydown="if(event.key==='Enter')sendAI()">
        <button class="ai-send" onclick="sendAI()" ${ok ? '' : 'disabled'}>↑</button>
      </div>
    </div>
  `;
  aiScrollToEnd();
}
// Settings and messages share one scroll area (.ai-chat); keep the newest
// message in view.
function aiScrollToEnd() {
  const chat = document.querySelector('.ai-chat');
  if (chat) chat.scrollTop = chat.scrollHeight;
}

// What the tutor is told about the learner's situation.
function tutorSystemPrompt() {
  const l = currentLesson;
  let ctx = '';
  if (l) {
    const tables = relevantTables(l).concat(lessonModels(l));
    ctx += `\nCurrent lesson: "${l.title}" (${l.concept}). Task: ${stripTags(l.task)}`;
    ctx += `\nTables: ${tables.map(t => `${t}(${tableColumns(t).join(', ')})`).join('; ')}`;
    if (currentExercise) ctx += `\nThe learner is on this practice exercise: ${stripTags(currentExercise.prompt)}`;
    if (translateMode !== null && l.translate && l.translate[translateMode]) {
      const tr = l.translate[translateMode];
      ctx += `\nThey already solved it in SQLite and are now rewriting it for ${DialectCheck.labelFor(tr)}: ${stripTags(tr.prompt)}`;
    }
  }
  const sql = editor ? editor.getValue().trim() : '';
  if (isPy(l)) {
    const files = Object.keys(l.files || {});
    let pctx = `\nCurrent lesson: "${l.title}" (${l.concept}). Task: ${stripTags(l.task)}`;
    if (currentExercise) pctx += `\nThe learner is on this practice exercise: ${stripTags(currentExercise.prompt)}`;
    if (files.length) pctx += `\nFiles in the working folder: ${files.join(', ')}`;
    if (l.db) pctx += `\nThe working folder has shop.db, a SQLite copy of the course's practice database${(l.tables || []).length ? ` (tables used: ${l.tables.map(t => `${t}(${tableColumns(t).join(', ')})`).join('; ')})` : ''}.`;
    if (sql) pctx += `\nTheir current code:\n${sql.slice(0, 2500)}`;
    if (lastDiagnosis) pctx += `\nThe app's automatic check of their latest attempt says: ${lastDiagnosis.slice(0, 900)}`;
    const who = activeTrack === 'python'
      ? 'You are a friendly, patient Python tutor inside an interactive course that teaches Python from scratch. The learner is a complete beginner: assume no programming and no SQL knowledge, use plain language, and only use ideas the course has reached by this lesson.'
      : 'You are a friendly, concise Python tutor inside an interactive course that takes learners from SQL to data engineering. The learner already knows SQL well, so relate Python ideas to SQL where it helps.';
    return `${who} Code runs on Python 3.13 in the browser (standard library, sqlite3, pandas); there is no input() and no network.${pctx}
Keep answers short (2-5 sentences). Use backticks for code. Explain the concept and give a nudge; do not write the full solution to the current task.`;
  }
  if (sql) ctx += `\nTheir current query:\n${sql.slice(0, 1500)}`;
  if (lastDiagnosis) ctx += `\nThe app's automatic check of their latest attempt says: ${lastDiagnosis.slice(0, 900)}`;
  return `You are a friendly, concise SQL tutor inside an interactive SQL course that takes learners from beginner to data engineer. The practice database is SQLite.${ctx}
Keep answers short (2-5 sentences). Use backticks for SQL. Explain the concept and give a nudge; do not write the full solution to the current task.`;
}

function askTutorWhy() {
  activeTab = 'ai';
  document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelectorAll('.output-tab')[2];
  if (tab) tab.classList.add('active');
  document.getElementById('row-count').style.display = 'none';
  renderAITab();
  if (!AI.ready()) return;
  const input = document.getElementById('ai-input');
  if (input) { input.value = `My ${isPy(currentLesson) ? 'code' : 'query'} isn't passing — can you help me understand why, without giving me the answer?`; sendAI(); }
}

async function sendAI() {
  if (!AI.ready()) return;
  const input = document.getElementById('ai-input');
  if (!input || !input.value.trim()) return;
  const userMsg = input.value.trim();
  input.value = '';
  aiMessages.push({role:'user', content: userMsg});
  const msgs = document.getElementById('ai-messages');
  if (msgs) {
    const userEl = document.createElement('div');
    userEl.className = 'ai-msg user';
    userEl.textContent = userMsg;
    msgs.appendChild(userEl);
    const typingEl = document.createElement('div');
    typingEl.className = 'ai-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    typingEl.id = 'typing';
    msgs.appendChild(typingEl);
    aiScrollToEnd();
  }
  // The conversation sent to the model must open with a user turn.
  const recent = aiMessages.slice(-8);
  while (recent.length && recent[0].role !== 'user') recent.shift();
  let reply, failed = false;
  try {
    reply = await AI.chat({ system: tutorSystemPrompt(), messages: recent.map(m => ({role: m.role, content: m.content})), maxTokens: 400 });
    aiMessages.push({role:'assistant', content: reply});
  } catch (e) {
    failed = true;
    reply = `Couldn't get a reply: ${e.message}`;
    aiMessages.pop();                         // let them resend the question
  }
  document.getElementById('typing')?.remove();
  const aEl = document.createElement('div');
  aEl.className = 'ai-msg assistant' + (failed ? ' failed' : '');
  if (failed) aEl.textContent = reply; else aEl.innerHTML = formatAI(reply);
  const msgsEl = document.getElementById('ai-messages');
  if (msgsEl) { msgsEl.appendChild(aEl); aiScrollToEnd(); }
}

// ── Mock interview hooks (interview.js) ──
function openInterview() {
  if (typeof Interview !== 'undefined') Interview.open();
}
// XP earned outside the lesson flow (no combo multiplier, no combo bump).
function awardBonusXP(amount, reason) {
  if (!(amount > 0)) return;
  const prevLevel = levelForXp(xp);
  xp += amount;
  updateXPDisplay();
  bumpStreak();
  showToast('⚡', reason || 'Bonus', `+${amount} XP`, '');
  if (levelForXp(xp) > prevLevel) showLevelUp(levelForXp(xp));
  saveProgress();
}

initDB().catch(console.error);
