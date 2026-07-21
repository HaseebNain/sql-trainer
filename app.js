// SQL Quest — application engine.

let db = null, currentLesson = null, currentDay = 0;
let xp = 0, completedLessons = new Set(), aiMessages = [], activeTab = 'results';
let anthropicApiKey = localStorage.getItem('sql_bootcamp_api_key') || '';
let lastResults = null;
let editor = null;
let currentExercise = null;
let completedExercises = new Set();
let queryHistory = [];

// ── Gamification state ──
let streak = 0, lastActiveDate = null;
let queriesRun = 0, hintsUsed = 0, errorsMade = 0;
let combo = 0, bestCombo = 0;
let unlockedAchievements = new Set();
let dailyDoneDates = [];           // ISO dates on which the daily challenge was completed
let soundOn = localStorage.getItem('sql_bootcamp_sound') !== 'off';

const PROGRESS_KEY = 'sql_bootcamp_progress';
const QUERY_HISTORY_KEY = 'sql_bootcamp_query_history';

// ── Version & update check ──
// Bump APP_VERSION and version.json together on every release. The app is
// offline-first; the update check is a best-effort network call that fails
// silently when offline.
const APP_VERSION = '1.0.0';
const REPO_URL = 'https://github.com/HaseebNain/slq-trainer';
const UPDATE_CHECK_URL = 'https://raw.githubusercontent.com/HaseebNain/slq-trainer/master/version.json';

// ── Levels (calibrated to ~3,950 XP available, before combo/daily bonuses) ──
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
  { xp: 5500, title: "Principal Data Engineer" }
];

// ── Achievements ──
const ACHIEVEMENTS = [
  { id:"first-query",   icon:"👋", name:"Hello, Database",     desc:"Run your very first query.",                         when:() => queriesRun >= 1 },
  { id:"first-lesson",  icon:"🌱", name:"First Steps",         desc:"Complete your first lesson.",                        when:() => completedLessons.size >= 1 },
  { id:"day1",          icon:"📗", name:"Basics Locked In",    desc:"Complete every lesson in Day 1.",                    when:() => dayComplete(1) },
  { id:"join-master",   icon:"🔗", name:"JOIN Master",         desc:"Complete Day 4 and Day 11 — all things JOINs.",      when:() => dayComplete(4) && dayComplete(11) },
  { id:"window-wizard", icon:"🪟", name:"Window Wizard",       desc:"Complete Day 6 and Day 14 — window functions.",      when:() => dayComplete(6) && dayComplete(14) },
  { id:"ten-lessons",   icon:"📚", name:"Bookworm",            desc:"Complete 10 lessons.",                               when:() => completedLessons.size >= 10 },
  { id:"halfway",       icon:"⛰️", name:"Halfway There",       desc:"Complete 50% of all lessons.",                       when:() => completedLessons.size >= Math.ceil(totalLessonCount() / 2) },
  { id:"graduate",      icon:"🎓", name:"Graduate",            desc:"Complete every lesson in the course.",               when:() => completedLessons.size >= totalLessonCount() },
  { id:"first-ex",      icon:"💪", name:"Extra Credit",        desc:"Complete your first practice exercise.",             when:() => completedExercises.size >= 1 },
  { id:"25-ex",         icon:"🏋️", name:"Practice Makes Perfect", desc:"Complete 25 practice exercises.",                 when:() => completedExercises.size >= 25 },
  { id:"all-ex",        icon:"💯", name:"Completionist",       desc:"Complete every practice exercise in the course.",    when:() => completedExercises.size >= totalExerciseCount() },
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
  { name:"Interview Readiness",     icon:"⚔️", days:[28],           blurb:"Top-N per group, gaps & islands, dedup classics — the exact patterns interviewers ask." }
];

function totalLessonCount()  { return curriculum.reduce((n, d) => n + d.lessons.length, 0); }
function totalExerciseCount(){ return curriculum.reduce((n, d) => n + d.lessons.reduce((m, l) => m + (l.exercises ? l.exercises.length : 0), 0), 0); }
function dayComplete(dayNum) {
  const day = curriculum.find(d => d.day === dayNum);
  return !!day && day.lessons.every(l => completedLessons.has(l.id));
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
  document.getElementById('sound-btn').textContent = soundOn ? '🔊' : '🔇';
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
  document.getElementById('xp-display').textContent = `⚡ ${xp.toLocaleString()}`;
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
  el.textContent = `🔥 ${shown}`;
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
  const readiness = Math.round((completedLessons.size / total) * 100);
  const lvl = levelForXp(xp);
  const circumference = 2 * Math.PI * 34;
  const verdict =
    readiness >= 100 ? "<strong>Interview-ready.</strong> You've covered everything a junior data engineer screen will throw at you — joins, windows, CTEs, and real analytics patterns. Start applying and rebuild these queries from memory as prep." :
    readiness >= 75  ? "<strong>Almost there.</strong> You can already pass most SQL screens. Close out the remaining analytics tracks — cohorts, funnels and KPIs are what separate you from other candidates." :
    readiness >= 40  ? "<strong>Solid foundation.</strong> Core querying is in place. Window functions and CTEs are the next big interview differentiators — keep pushing." :
                       "<strong>Early days.</strong> Every data engineer started exactly here. Consistency beats intensity — one day tab at a time, keep the streak alive.";
  const html = `
    <div class="modal-header">
      <div class="modal-title">📈 Data Engineer Readiness</div>
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
      <div class="cstat"><div class="cstat-num">${completedLessons.size}/${total}</div><div class="cstat-label">Lessons</div></div>
      <div class="cstat"><div class="cstat-num">${completedExercises.size}/${totalExerciseCount()}</div><div class="cstat-label">Exercises</div></div>
      <div class="cstat"><div class="cstat-num">${queriesRun.toLocaleString()}</div><div class="cstat-label">Queries run</div></div>
    </div>
    ${SKILL_TRACKS.map(t => {
      const p = trackProgress(t);
      return `<div class="skill-row">
        <div class="skill-row-top"><span class="skill-name">${t.icon} ${t.name}</span><span class="skill-pct">${p.done}/${p.total} · ${p.pct}%</span></div>
        <div class="skill-bar"><div class="skill-bar-fill${p.pct === 100 ? ' maxed' : ''}" style="width:${p.pct}%"></div></div>
        <div class="skill-days">Days ${t.days.join(', ')} — ${t.blurb}</div>
      </div>`;
    }).join('')}`;
  openModal(html);
}

function openModal(html) {
  document.getElementById('modal-box').innerHTML = html;
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
  if (isDailyDone()) { btn.className = 'daily-btn done'; btn.textContent = '✓ Daily done'; }
  else { btn.className = 'daily-btn'; btn.textContent = '🎯 Daily ×2'; }
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
    if (btn) {
      btn.classList.toggle('has-update', updateInfo.available);
      btn.textContent = updateInfo.available ? `Update to v${updateInfo.latest} ⬆` : `v${APP_VERSION}`;
    }
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
      if (completedLessons.has(l.id)) {
        pool.push({ kind: 'lesson', lesson: l, day: day.day, prompt: l.task, tables: l.tables || [] });
      }
      for (const ex of (l.exercises || [])) {
        if (completedExercises.has(ex.id)) {
          pool.push({ kind: 'exercise', lesson: l, ex, day: day.day, prompt: ex.prompt, tables: l.tables || [] });
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
  renderQuizQuestion();
}

function renderQuizQuestion() {
  quizSolved = false;
  const n = quizItems.length;
  const item = quizItems[quizIndex];
  const pct = Math.round((quizIndex / n) * 100);
  // Show the schema (columns) for each table in play so it's answerable without
  // leaving the quiz — the modal has no schema panel to click into.
  const schema = item.tables.map(t => {
    const s = schemas[t];
    if (!s) return '';
    const cols = s.cols.map(c => `<span class="quiz-col" title="${c.type}${c.pk ? ' · primary key' : ''}">${c.name}</span>`).join('');
    return `<div class="quiz-schema-row"><span class="quiz-schema-name">${t}</span><span class="quiz-schema-cols">${cols}</span></div>`;
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
    <textarea class="quiz-answer" id="quiz-answer" placeholder="Write your SQL here…" spellcheck="false" onkeydown="if((event.ctrlKey||event.metaKey)&&event.key==='Enter')checkQuizAnswer()"></textarea>
    <div id="quiz-feedback"></div>
    <div class="quiz-actions" id="quiz-actions">
      <button class="btn btn-primary" onclick="checkQuizAnswer()">Check answer</button>
      <button class="btn btn-ghost" onclick="revealQuizHint()">💡 Hint</button>
      <button class="btn btn-ghost" onclick="skipQuizQuestion()">Skip →</button>
    </div>`);
  setTimeout(() => { const a = document.getElementById('quiz-answer'); if (a) a.focus(); }, 50);
}

function checkQuizAnswer() {
  if (quizSolved) return;
  const ta = document.getElementById('quiz-answer');
  const sql = ta ? ta.value.trim() : '';
  if (!sql) return;
  const item = quizItems[quizIndex];
  let passed = false, errored = false;
  try {
    if (item.kind === 'lesson') {
      passed = SqlEngine.evaluate(sql, item.lesson) === 'pass';
    } else {
      const res = SqlEngine.runOnFresh([sql]);   // isolated — never mutates the live DB
      if (!res) errored = true;
      passed = exercisePasses(item.ex, sql, res ? res.columns : [], res ? res.values : []);
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
    fb.innerHTML = `<div class="feedback-box feedback-error"><div class="feedback-label">${errored ? 'SQL error' : 'Not quite'}</div>${errored ? 'That query didn’t run — check the syntax and try again.' : 'That doesn’t produce the expected result. Try again, or take a 💡 hint.'}</div>`;
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
    dailyDoneDates
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
    return data.currentLessonId || null;
  } catch { return null; }
}

function resetProgress() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  localStorage.removeItem(PROGRESS_KEY);
  completedLessons = new Set();
  completedExercises = new Set();
  xp = 0;
  streak = 0; lastActiveDate = null;
  queriesRun = 0; hintsUsed = 0; errorsMade = 0;
  combo = 0; bestCombo = 0;
  unlockedAchievements = new Set();
  dailyDoneDates = [];
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
  currentExercise = ex;
  if (editor) editor.setValue('');
  showEmpty();
  const bar = document.getElementById('exercise-bar');
  bar.style.display = 'flex';
  document.getElementById('exercise-bar-text').textContent = ex.prompt;
  renderExercisesList();
}

function clearExercise() {
  currentExercise = null;
  document.getElementById('exercise-bar').style.display = 'none';
  if (editor) editor.setValue('');
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
  }
}

function exerciseNotQuite() {
  const existing = document.getElementById('output-content').innerHTML;
  document.getElementById('output-content').innerHTML =
    `<div class="feedback-box feedback-info"><div class="feedback-label">Not quite yet</div>Your query ran, but the results don't match the goal. Re-read the prompt — or grab a 💡 hint (costs your combo).</div><hr class="divider">${existing}`;
}

// Grade a run against BOTH the active practice exercise AND the lesson's main
// task, so solving the main task still counts while a practice exercise is
// selected. The exercise "not quite" nudge only shows if neither goal was met.
function gradeSubmission(sql, columns, values) {
  const ex = currentExercise;
  const exPassed = ex ? exercisePasses(ex, sql, columns, values) : false;
  if (exPassed) creditExercise(ex);
  const lessonPassed = checkSolution(sql);
  if (ex && !exPassed && !lessonPassed) exerciseNotQuite();
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

function saveApiKey() {
  const input = document.getElementById('api-key-input');
  if (!input) return;
  anthropicApiKey = input.value.trim();
  localStorage.setItem('sql_bootcamp_api_key', anthropicApiKey);
  renderAITab();
}

function apiKeyStatusHtml() {
  if (anthropicApiKey && anthropicApiKey.startsWith('sk-ant-')) {
    return '<div class="ai-key-status ok">✓ API key saved — AI Tutor is live</div>';
  }
  if (anthropicApiKey) {
    return '<div class="ai-key-status missing">⚠ Key format looks wrong (should start with sk-ant-)</div>';
  }
  return '';
}

// Tables relevant to a lesson: the ones it declares PLUS any table its
// exercises actually reference (many lessons declare only their main table but
// have exercises that query others — e.g. lesson 1.2 is "employees" but its
// exercises use `departments`). Matched as whole words, so the `departments`
// TABLE is picked up while the `department` employees COLUMN is not. Cached on
// the lesson since buildHintTables runs on every keystroke.
function relevantTables(lesson) {
  if (!lesson) return Object.keys(schemas);
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
  const tables = currentLesson ? relevantTables(currentLesson) : Object.keys(schemas);
  const cols = [], seen = new Set();
  for (const t of tables) {
    if (!schemas[t]) continue;
    for (const c of schemas[t].cols) if (!seen.has(c.name)) { seen.add(c.name); cols.push(c.name); }
  }
  return cols;
}

// Resolve a `t.` prefix to a table — either a real table name or an alias
// introduced by `FROM/JOIN <table> [AS] <alias>`.
function resolveAlias(before, alias) {
  if (schemas[alias]) return alias;
  const re = new RegExp('\\b(' + Object.keys(schemas).join('|') + ')\\s+(?:as\\s+)?' + alias + '\\b', 'i');
  const m = before.match(re);
  return m ? m[1].toLowerCase() : null;
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
    const cols = (tbl && schemas[tbl]) ? schemas[tbl].cols.map(c => c.name) : hintColumns();
    return { list: cols.filter(c => c.toLowerCase().startsWith(prefix)),
             from: { line: cur.line, ch: start + dot + 1 }, to: cur };
  }

  const cols = hintColumns();
  const tables = currentLesson ? relevantTables(currentLesson) : Object.keys(schemas);
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
      'Ctrl-Space': cm => CodeMirror.showHint(cm, sqlHint, { completeSingle: false })
    }
  });
  editor.on('inputRead', (cm, event) => {
    // Auto-suggest as you type a word or after a dot; the ranking is handled by
    // sqlHint so the top item matches the current clause.
    if (!cm.state.completionActive && event.text[0] && /[\w.]/.test(event.text[0])) {
      CodeMirror.showHint(cm, sqlHint, { completeSingle: false });
    }
  });
}

function seedDatabase(SQL) {
  if (db) db.close();
  db = new SQL.Database();
  for (const tbl of Object.values(schemas)) {
    db.run(tbl.create);
    for (const ins of tbl.insert) db.run(ins);
  }
}

let sqlModule = null;

function reseedDatabase() {
  if (!sqlModule) return;
  seedDatabase(sqlModule);
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
  const savedLessonId = loadProgress();
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
  document.getElementById('sound-btn').textContent = soundOn ? '🔊' : '🔇';
  updateThemeButton();
  const verBtn = document.getElementById('ver-btn');
  if (verBtn) verBtn.textContent = `v${APP_VERSION}`;
  const allLessons = curriculum.flatMap(d => d.lessons);
  const startLesson = (savedLessonId && allLessons.find(l => l.id === savedLessonId)) || allLessons[0];
  loadLesson(startLesson);
  if (!savedLessonId && completedLessons.size === 0) showWelcome();
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
  document.getElementById('map-btn-label').textContent = `Day ${day.day} · ${day.title}`;
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

const COURSE_SECTIONS = [
  { label: 'Foundations', from: 1, to: 7 },
  { label: 'Working with Real Data', from: 8, to: 16 },
  { label: 'Analytics Engineering', from: 17, to: 21 },
  { label: 'Data Engineer Track', from: 22, to: 99 }
];

function openCourseMap() {
  let cards = '';
  for (const section of COURSE_SECTIONS) {
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
          <span class="map-card-num">DAY ${day.day}</span>
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
      <div class="modal-title">🗺️ Course Map</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-sub">${completedLessons.size} of ${total} lessons complete — click a day to jump in</div>
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
  if (btn) btn.textContent = document.documentElement.dataset.theme === 'light' ? '🌙' : '☀️';
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

// ── First-run welcome ──
function showWelcome() {
  openModal(`
    <div class="welcome-hero">
      <div class="welcome-logo">SQL</div>
      <div class="welcome-title">Welcome to SQL Quest</div>
      <div class="welcome-sub">Go from your first <code style="font-family:var(--mono)">SELECT</code> to job-ready Analytics / Data Engineer skills. Everything runs in your browser against a real SQLite database — fully offline, nothing to install.</div>
    </div>
    <div class="welcome-feats">
      <div class="welcome-feat"><span class="welcome-feat-icon">📚</span><div><div class="welcome-feat-name">28-day curriculum</div><div class="welcome-feat-desc">Querying → joins → windows → modeling, performance, ELT &amp; interview prep.</div></div></div>
      <div class="welcome-feat"><span class="welcome-feat-icon">▶</span><div><div class="welcome-feat-name">Real SQL, instantly</div><div class="welcome-feat-desc">Write a query, press Ctrl+Enter, see real results. Break things freely — reset data anytime.</div></div></div>
      <div class="welcome-feat"><span class="welcome-feat-icon">⚡</span><div><div class="welcome-feat-name">XP, streaks &amp; combos</div><div class="welcome-feat-desc">Level from Row Rookie to Principal Data Engineer. Progress saves automatically.</div></div></div>
      <div class="welcome-feat"><span class="welcome-feat-icon">📈</span><div><div class="welcome-feat-name">Readiness report</div><div class="welcome-feat-desc">Click your level badge to see per-skill progress mapped to real job requirements.</div></div></div>
    </div>
    <button class="welcome-cta" onclick="closeModal()">Start Day 1 →</button>`);
}

function buildSidebar() {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = '';
  curriculum.forEach((day, di) => {
    const doneCount = day.lessons.filter(l => completedLessons.has(l.id)).length;
    const allDone = doneCount === day.lessons.length;
    const isOpen = di === currentDay;

    const group = document.createElement('div');
    group.className = 'day-group' + (isOpen ? ' open' : '');

    const header = document.createElement('div');
    header.className = 'day-group-header';
    header.innerHTML = `
      <span class="day-group-caret">▶</span>
      <span class="day-group-name">Day ${day.day} · ${day.title}</span>
      <span class="day-group-count${allDone ? ' done' : ''}">${allDone ? '✓' : `${doneCount}/${day.lessons.length}`}</span>`;
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
        <div class="lesson-dot ${done ? 'done' : active ? 'active' : ''}">${done ? '✓' : lesson.id}</div>
        <div class="lesson-title-text">${lesson.title}</div>`;
      item.onclick = () => { currentDay = di; loadLesson(lesson); };
      list.appendChild(item);
    });
    group.appendChild(list);
    sb.appendChild(group);
  });
  updateSidebarProgress();
}

function updateSidebarProgress() {
  const total = totalLessonCount();
  const pct = Math.round((completedLessons.size / total) * 100);
  const fill = document.getElementById('sidebar-progress-fill');
  const count = document.getElementById('sidebar-progress-count');
  if (fill) fill.style.width = pct + '%';
  if (count) count.textContent = `${completedLessons.size}/${total} · ${pct}%`;
}

function loadLesson(lesson) {
  currentLesson = lesson;
  currentDay = curriculum.findIndex(d => d.lessons.includes(lesson));
  updateDayNav();

  const schemaPills = document.getElementById('schema-pills');
  schemaPills.innerHTML = relevantTables(lesson).map(t => `<span class="schema-pill" onclick="showSchema('${t}')">${t}</span>`).join('');

  const dayData = curriculum.find(d => d.lessons.includes(lesson));
  const total = curriculum.flatMap(d => d.lessons).length;
  const pct = Math.round((completedLessons.size / total) * 100);

  currentExercise = null;
  document.getElementById('exercise-bar').style.display = 'none';

  document.getElementById('lesson-panel').innerHTML = `
    <div class="lesson-breadcrumb">Day ${dayData.day}: ${dayData.title} › Lesson ${lesson.id}</div>
    <div class="lesson-heading">${lesson.title}</div>
    <div class="lesson-body">${lesson.theory}</div>
    <div class="concept-chips">${lesson.chips.map(c => `<span class="chip ${c.c}">${c.t}</span>`).join('')}</div>
    <div class="task-box">
      <div class="task-label">Your Task</div>
      <div class="task-text">${lesson.task}</div>
    </div>
    <div class="progress-note">${completedLessons.size}/${total} lessons complete · ${pct}% to Data Engineer</div>
    <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    ${!isDailyDone() ? `<div class="daily-banner">🎯<span><strong>Daily Challenge</strong> waiting — double XP and it keeps your 🔥 streak alive. <a href="#" onclick="startDailyChallenge();return false" style="color:var(--purple)">Take it on →</a></span></div>` : ''}
    <div id="exercises-list"></div>
  `;

  if (editor) editor.setValue('');
  showEmpty();
  buildSidebar();
  renderExercisesList();
  saveProgress();
}

function showEmpty() {
  document.getElementById('output-content').innerHTML = `<div class="empty-state"><div class="empty-icon">▶</div><div>Run your query to see results</div><div style="margin-top:4px"><span class="kbd">Ctrl</span> <span class="kbd">Enter</span></div></div>`;
  document.getElementById('row-count').style.display = 'none';
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

function checkSolution(sql) {
  if (!currentLesson) return false;
  // Correctness is decided purely by RESULT-SET EQUIVALENCE (engine.js): a query
  // is correct iff it produces the same results as a reference answer — however
  // it's written. Every lesson has authored references (refs.js), so the old
  // brittle text/substring matching is gone. State-changing lessons are judged
  // by a state probe; open-ended capstones by a structural accept path.
  let verdict = 'unknown';
  try { verdict = SqlEngine.evaluate(sql, currentLesson); } catch { verdict = 'unknown'; }
  const matches = verdict === 'pass';
  if (matches && !completedLessons.has(currentLesson.id)) {
    completedLessons.add(currentLesson.id);
    const earned = awardXP(currentLesson.xp);
    playSound('correct');
    const next = getNextLesson();
    const comboNote = combo >= 3 ? ` <span style="color:var(--amber)">🔥 ${combo}× combo</span>` : '';
    let html = `<div class="feedback-box feedback-success"><div class="feedback-label">✓ Correct! +${earned} XP${comboNote}</div>Well done! Your query works perfectly.</div>`;
    if (next) {
      html += `<button class="next-btn" onclick="loadLesson(getNextLesson())">Next Lesson →</button>`;
    } else {
      html += `<div class="feedback-box feedback-info" style="margin-top:8px"><div class="feedback-label">🏆 Course Complete!</div>You've finished SQL Quest with ${xp.toLocaleString()} XP. Open your <a href="#" onclick="openCareerModal();return false" style="color:var(--accent)">Data Engineer Readiness report</a> — you're ready to interview.</div>`;
      burstConfetti(true);
    }
    const existing = document.getElementById('output-content').innerHTML;
    document.getElementById('output-content').innerHTML = html + '<hr class="divider">' + existing;
    buildSidebar();
  }
  return matches;
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
  const hintText = currentExercise ? currentExercise.hint : currentLesson.hint;
  const comboNote = hadCombo ? `<div style="font-size:10.5px;color:var(--text3);margin-top:6px">💔 Combo reset — hints are free, but they cost your streak of clean solves.</div>` : '';
  const existing = document.getElementById('output-content').innerHTML;
  const hint = `<div class="feedback-box feedback-hint"><div class="feedback-label">💡 Hint</div>${hintText}${comboNote}</div>`;
  document.getElementById('output-content').innerHTML = hint + (existing.includes('empty-state') ? '' : '<hr class="divider">' + existing);
}

function resetQuery() {
  if (currentLesson && editor) { editor.setValue(currentLesson.starter); showEmpty(); }
}

function showSchema(tableName) {
  activeTab = 'schema';
  document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.output-tab')[1].classList.add('active');
  document.getElementById('row-count').style.display = 'none';
  const tbl = schemas[tableName];
  if (!tbl) return;
  let result;
  try { result = db.exec(`SELECT * FROM ${tableName} LIMIT 3`); } catch(e) {}
  let html = `<div class="schema-table-view">
    <div class="schema-table-name">📋 ${tableName}</div>
    ${tbl.cols.map(c => `<div class="schema-col">
      <span class="schema-col-name">${c.name}</span>
      <span class="schema-col-type">${c.type}</span>
      ${c.pk ? '<span class="schema-pk">PK</span>' : ''}
    </div>`).join('')}
  </div>`;
  if (result && result[0]) {
    html += `<div class="section-mini-title">Sample Data</div>`;
    html += `<table class="result-table" style="font-size:11px"><thead><tr>${result[0].columns.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    result[0].values.forEach(row => { html += `<tr>${row.map(v=>`<td>${v??'NULL'}</td>`).join('')}</tr>`; });
    html += `</tbody></table>`;
  }
  document.getElementById('output-content').innerHTML = html;
}

function switchTab(name, el) {
  activeTab = name;
  document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  if (name === 'ai') renderAITab();
  else if (name === 'schema' && currentLesson) showSchema(currentLesson.tables[0]);
  else if (name === 'results') {
    if (lastResults) renderTable(lastResults.columns, lastResults.values);
    else showEmpty();
  }
}

function renderAITab() {
  if (aiMessages.length === 0) {
    aiMessages.push({role:'assistant', content:"Hi! I'm your SQL tutor. Ask me anything about the current lesson or SQL concepts. I'll give hints rather than spoilers! 🎓"});
  }
  const keyOk = anthropicApiKey && anthropicApiKey.startsWith('sk-ant-');
  const setup = keyOk ? '' : `
    <div class="ai-key-setup">
      <strong>Optional: enable the AI Tutor.</strong> Paste an Anthropic API key to chat with a tutor that knows your current lesson. The key is stored only in this browser and sent only to Anthropic.
      <div class="ai-key-row">
        <input class="ai-key-input" type="password" id="api-key-input" placeholder="sk-ant-..." value="${escapeHtml(anthropicApiKey)}">
        <button class="btn btn-primary" onclick="saveApiKey()">Save</button>
      </div>
      ${apiKeyStatusHtml()}
    </div>`;
  document.getElementById('output-content').innerHTML = `
    <div class="ai-chat">
      ${setup}
      <div class="ai-messages" id="ai-messages">${aiMessages.map(m=>`<div class="ai-msg ${m.role}">${m.content}</div>`).join('')}</div>
      <div class="ai-input-row">
        <input class="ai-input" type="text" id="ai-input" placeholder="${keyOk ? 'Ask a question...' : 'Add an API key above to enable the AI Tutor'}" ${keyOk ? '' : 'disabled'} onkeydown="if(event.key==='Enter')sendAI()">
        <button class="ai-send" onclick="sendAI()" ${keyOk ? '' : 'disabled'}>↑</button>
      </div>
    </div>
  `;
  const msgs = document.getElementById('ai-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

async function sendAI() {
  if (!anthropicApiKey) return;
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
    msgs.scrollTop = msgs.scrollHeight;
  }
  const lessonCtx = currentLesson ? `Current lesson: "${currentLesson.title}" (${currentLesson.concept}). Task: ${currentLesson.task}. Tables: ${currentLesson.tables.join(', ')}.` : '';
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicApiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 300,
        system: `You are a friendly, concise SQL tutor inside an interactive SQL course that takes learners from beginner to Analytics/Data Engineer over 28 days. The dialect is SQLite. ${lessonCtx} Keep answers short (2-4 sentences). Use backticks for SQL keywords. Give hints, not full answers.`,
        messages: aiMessages.slice(-8).map(m => ({role: m.role, content: m.content}))
      })
    });
    const data = await resp.json();
    const reply = data.content?.[0]?.text || "Sorry, couldn't respond. Try again!";
    aiMessages.push({role:'assistant', content: reply});
    document.getElementById('typing')?.remove();
    const aEl = document.createElement('div');
    aEl.className = 'ai-msg assistant';
    aEl.innerHTML = reply.replace(/`([^`]+)`/g, '<code>$1</code>');
    const msgsEl = document.getElementById('ai-messages');
    if (msgsEl) { msgsEl.appendChild(aEl); msgsEl.scrollTop = msgsEl.scrollHeight; }
  } catch (e) {
    document.getElementById('typing')?.remove();
    const aEl = document.createElement('div');
    aEl.className = 'ai-msg assistant';
    aEl.textContent = "Couldn't connect. Check your API key and try again.";
    document.getElementById('ai-messages')?.appendChild(aEl);
  }
}


initDB().catch(console.error);
