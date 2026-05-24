/* =============================================
   FORGE90 — JavaScript
   Full workout logic, UI, LocalStorage
   ============================================= */

// ── State ──────────────────────────────────────
let state = {
  units: 'metric',
  goal: null,
  location: null,
  heightCm: null,
  weightKg: null,
  age: null,
  sex: null,
  level: 'intermediate',
  completed: [],   // array of day numbers (1-90)
  currentWeek: 1,
  currentDay: null,
};

// Load saved progress from LocalStorage
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('forge90_state') || 'null');
    if (saved) state = { ...state, ...saved };
  } catch(e) {}
}

function saveState() {
  localStorage.setItem('forge90_state', JSON.stringify(state));
}

// ── Unit toggle ────────────────────────────────
function setUnits(u) {
  state.units = u;
  document.getElementById('btn-metric').classList.toggle('active', u === 'metric');
  document.getElementById('btn-imperial').classList.toggle('active', u === 'imperial');
  document.getElementById('height-metric').classList.toggle('hidden', u !== 'metric');
  document.getElementById('height-imperial').classList.toggle('hidden', u !== 'imperial');
  document.getElementById('weight-metric-wrap').classList.toggle('hidden', u !== 'metric');
  document.getElementById('weight-imperial-wrap').classList.toggle('hidden', u !== 'imperial');
}

// ── Step navigation ────────────────────────────
function goStep(n) {
  // Validate before advancing
  if (n === 2) {
    if (!validateStep1()) return;
  }
  if (n === 3) {
    if (!state.goal) { alert('Please select a goal to continue.'); return; }
  }

  [1,2,3].forEach(i => {
    document.getElementById(`step-${i}`).classList.toggle('active', i === n);
    const dot = document.getElementById(`step-dot-${i}`);
    dot.classList.toggle('active', i === n);
    dot.classList.toggle('done', i < n);
  });
  // Step lines
  document.querySelectorAll('.step-line').forEach((line, idx) => {
    line.classList.toggle('done', idx + 1 < n);
  });
}

function validateStep1() {
  let heightOk = false, weightOk = false;
  if (state.units === 'metric') {
    const hcm = parseFloat(document.getElementById('height-cm').value);
    const wkg  = parseFloat(document.getElementById('weight-kg').value);
    if (!hcm || hcm < 100 || hcm > 250) { alert('Please enter a valid height (100–250 cm).'); return false; }
    if (!wkg  || wkg  < 30  || wkg  > 300) { alert('Please enter a valid weight (30–300 kg).'); return false; }
    state.heightCm = hcm;
    state.weightKg = wkg;
  } else {
    const ft = parseFloat(document.getElementById('height-ft').value) || 0;
    const inches = parseFloat(document.getElementById('height-in').value) || 0;
    const lbs = parseFloat(document.getElementById('weight-lbs').value);
    const totalIn = ft * 12 + inches;
    if (totalIn < 36 || totalIn > 96) { alert('Please enter a valid height.'); return false; }
    if (!lbs || lbs < 66 || lbs > 660) { alert('Please enter a valid weight (66–660 lbs).'); return false; }
    state.heightCm = Math.round(totalIn * 2.54);
    state.weightKg = Math.round(lbs * 0.4536);
  }
  state.age = parseInt(document.getElementById('user-age').value) || null;
  state.sex = document.getElementById('user-sex').value;
  return true;
}

function selectGoal(el) {
  document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.goal = el.dataset.goal;
}

function selectLocation(el) {
  document.querySelectorAll('.location-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.location = el.dataset.loc;
}

// ── Generate Plan ──────────────────────────────
function generatePlan() {
  if (!state.location) { alert('Please choose Home or Gym to continue.'); return; }
  state.level = document.getElementById('user-level').value;

  // Clear old progress only if new plan
  if (!state.goal || !state.location) return;

  saveState();
  renderDashboard();

  document.getElementById('screen-onboarding').classList.remove('active');
  document.getElementById('screen-dashboard').classList.add('active');
}

// ── Dashboard ──────────────────────────────────
function renderDashboard() {
  // Stats chips
  const goalLabels = { 'weight-loss':'Weight Loss 🔥', 'build-muscle':'Build Muscle 💪', 'get-fit':'Get Fit ⚡' };
  const locLabels  = { 'home':'🏠 Home', 'gym':'🏋️ Gym' };
  const lvlLabels  = { 'beginner':'Beginner', 'intermediate':'Intermediate', 'advanced':'Advanced' };

  const hDisplay = state.units === 'metric'
    ? `${state.heightCm} cm`
    : `${Math.floor(state.heightCm/30.48)}′${Math.round((state.heightCm/2.54)%12)}″`;
  const wDisplay = state.units === 'metric'
    ? `${state.weightKg} kg`
    : `${Math.round(state.weightKg*2.205)} lbs`;

  document.getElementById('chip-goal').innerHTML     = `Goal: <strong>${goalLabels[state.goal]}</strong>`;
  document.getElementById('chip-location').innerHTML = `Location: <strong>${locLabels[state.location]}</strong>`;
  document.getElementById('chip-height').innerHTML   = `Height: <strong>${hDisplay}</strong>`;
  document.getElementById('chip-weight').innerHTML   = `Weight: <strong>${wDisplay}</strong>`;
  document.getElementById('chip-level').innerHTML    = `Level: <strong>${lvlLabels[state.level]}</strong>`;

  buildWeekTabs();
  renderWeek(state.currentWeek);
  updateProgress();
}

// ── Week Tabs ──────────────────────────────────
function buildWeekTabs() {
  const container = document.getElementById('week-tabs');
  container.innerHTML = '';
  for (let w = 1; w <= 13; w++) {
    const startDay = (w - 1) * 7 + 1;
    const endDay   = Math.min(w * 7, 90);
    if (startDay > 90) break;

    // Check if any days in this week are completed
    const hasProgress = state.completed.some(d => d >= startDay && d <= endDay);

    const btn = document.createElement('button');
    btn.className = `week-tab${w === state.currentWeek ? ' active' : ''}${hasProgress ? ' has-progress' : ''}`;
    btn.innerHTML = `Wk ${w}<div class="week-dot"></div>`;
    btn.onclick = () => switchWeek(w, btn);
    container.appendChild(btn);
  }
}

function switchWeek(w, el) {
  state.currentWeek = w;
  document.querySelectorAll('.week-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderWeek(w);
}

// ── Day Grid ───────────────────────────────────
function renderWeek(week) {
  const grid = document.getElementById('day-grid');
  grid.innerHTML = '';

  const startDay = (week - 1) * 7 + 1;
  const endDay   = Math.min(week * 7, 90);

  for (let d = startDay; d <= endDay; d++) {
    const workout = getWorkout(d);
    const isDone  = state.completed.includes(d);

    const cell = document.createElement('div');
    cell.className = `day-cell${workout.type === 'rest' ? ' rest-day' : ''}${isDone ? ' done' : ''}`;
    cell.dataset.type = workout.type;
    cell.dataset.day  = d;
    cell.innerHTML = `
      <div class="cell-day-num">DAY ${d}</div>
      <div class="cell-icon">${workout.icon}</div>
      <div class="cell-label">${workout.shortName}</div>
    `;
    if (workout.type !== 'rest') {
      cell.onclick = () => openModal(d);
    }
    grid.appendChild(cell);
  }

  // Fill empty cells to keep grid shape
  const count = endDay - startDay + 1;
  for (let i = count; i < 7; i++) {
    const empty = document.createElement('div');
    empty.style.cssText = 'background:transparent;border-color:transparent;';
    empty.className = 'day-cell';
    grid.appendChild(empty);
  }
}

// ── Progress ───────────────────────────────────
function updateProgress() {
  const total = 90;
  const done  = state.completed.length;
  const pct   = (done / total) * 100;

  document.getElementById('nav-progress-text').textContent = `${done}/90 days`;
  document.getElementById('nav-pill-fill').style.width = pct + '%';

  // Phase fills
  [[1,30],[31,60],[61,90]].forEach(([s,e], idx) => {
    const phaseDays = e - s + 1;
    const phaseDone = state.completed.filter(d => d >= s && d <= e).length;
    document.getElementById(`phase-fill-${idx}`).style.width = ((phaseDone/phaseDays)*100) + '%';
  });

  // Refresh week tab dots
  buildWeekTabs();
  // Re-mark active week
  document.querySelectorAll('.week-tab').forEach((btn, i) => {
    if (i + 1 === state.currentWeek) btn.classList.add('active');
  });
}

// ── Modal ──────────────────────────────────────
function openModal(day) {
  state.currentDay = day;
  const workout = getWorkout(day);
  const isDone  = state.completed.includes(day);

  document.getElementById('modal-day-num').textContent = `DAY ${day} · WEEK ${Math.ceil(day/7)}`;
  document.getElementById('modal-title').textContent   = workout.name;

  // Tags
  const tagsEl = document.getElementById('modal-tags');
  tagsEl.innerHTML = workout.tags.map(t => `<span class="modal-tag tag-${t}">${t.toUpperCase()}</span>`).join('');

  // Exercises
  const bodyEl = document.getElementById('modal-body');
  let html = `<div class="modal-section-title">Today's Exercises</div>
  <ul class="exercise-list">`;
  workout.exercises.forEach(ex => {
    html += `<li class="exercise-item">
      <span class="ex-name">${ex.name}</span>
      <div class="ex-meta">
        <span class="ex-sets">${ex.sets}</span>
        ${ex.note ? `<span class="ex-note">${ex.note}</span>` : ''}
      </div>
    </li>`;
  });
  html += `</ul>`;

  if (workout.tip) {
    html += `<div class="modal-section-title" style="margin-top:4px">Coach's Tip</div>
    <div class="modal-tip"><strong>💡 Tip:</strong> ${workout.tip}</div>`;
  }
  bodyEl.innerHTML = html;

  // Complete button
  const btn = document.getElementById('btn-complete');
  btn.classList.toggle('completed', isDone);
  btn.textContent = isDone ? '✓ Completed — Click to Undo' : '✓ Mark as Complete';

  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
}

function toggleComplete() {
  const day = state.currentDay;
  const workout = getWorkout(day);
  if (workout.type === 'rest') return;

  if (state.completed.includes(day)) {
    state.completed = state.completed.filter(d => d !== day);
  } else {
    state.completed.push(day);
  }
  saveState();

  const isDone = state.completed.includes(day);
  const btn = document.getElementById('btn-complete');
  btn.classList.toggle('completed', isDone);
  btn.textContent = isDone ? '✓ Completed — Click to Undo' : '✓ Mark as Complete';

  // Update cell in grid
  const cell = document.querySelector(`.day-cell[data-day="${day}"]`);
  if (cell) cell.classList.toggle('done', isDone);

  updateProgress();
}

// ── Reset ──────────────────────────────────────
function resetAll() {
  if (!confirm('Reset everything and start over?')) return;
  localStorage.removeItem('forge90_state');
  state = { units:'metric', goal:null, location:null, heightCm:null, weightKg:null, age:null, sex:null, level:'intermediate', completed:[], currentWeek:1, currentDay:null };
  document.getElementById('screen-dashboard').classList.remove('active');
  document.getElementById('screen-onboarding').classList.add('active');
  // Clear form selections
  document.querySelectorAll('.goal-card, .location-card').forEach(c => c.classList.remove('selected'));
  goStep(1);
}

// ============================================================
//  WORKOUT DATA ENGINE
//  Returns a workout object for any day 1–90
//  Based on: location × goal × phase × day-of-week
// ============================================================

function getWorkout(day) {
  const phase     = day <= 30 ? 1 : day <= 60 ? 2 : 3;          // 1=Foundation, 2=Intensity, 3=Peak
  const dayOfWeek = ((day - 1) % 7) + 1;                         // 1=Mon … 7=Sun
  const isRestDay = dayOfWeek === 7;                              // Sunday always rest

  if (isRestDay) return restDay(day);

  const key = `${state.location}-${state.goal}`;
  const builders = {
    'home-weight-loss':  homeWeightLoss,
    'home-build-muscle': homeBuildMuscle,
    'home-get-fit':      homeGetFit,
    'gym-weight-loss':   gymWeightLoss,
    'gym-build-muscle':  gymBuildMuscle,
    'gym-get-fit':       gymGetFit,
  };

  const builder = builders[key] || homeGetFit;
  return builder(day, phase, dayOfWeek);
}

function restDay() {
  return {
    name: 'Rest & Recovery', shortName: 'Rest', icon: '😴', type: 'rest',
    tags: ['rest'],
    exercises: [
      { name: 'Full Rest', sets: '—' },
      { name: 'Stay Hydrated', sets: '3L water' },
      { name: 'Sleep', sets: '8+ hrs' },
    ],
    tip: 'Recovery is where growth happens. Eat well, hydrate, and sleep 7–9 hours.',
  };
}

// ── Progression multipliers ───────────────────
function reps(base, phase, lvl) {
  const phaseMult = [1, 1.15, 1.3][phase - 1];
  const lvlMult   = { beginner: 0.8, intermediate: 1, advanced: 1.2 }[lvl] || 1;
  return Math.round(base * phaseMult * lvlMult);
}
function sets(base, phase) {
  return Math.min(base + phase - 1, base + 2);
}

// ─────────────────────────────────────────────────────────────
//  HOME  +  WEIGHT LOSS
//  High-intensity bodyweight circuits, cardio, core
// ─────────────────────────────────────────────────────────────
function homeWeightLoss(day, phase, dow) {
  const schedules = [
    // Mon — Full Body Circuit
    {
      name: 'Full Body Fat Burner', shortName: 'Full Body', icon: '🔥', type: 'hiit',
      tags: ['hiit', 'cardio'],
      exercises: [
        { name: 'Burpees',            sets: `${sets(3,phase)}×${reps(10,phase,state.level)}`, note: '30s rest' },
        { name: 'Jump Squats',        sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Push-Ups',           sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Mountain Climbers',  sets: `${sets(3,phase)}×${reps(20,phase,state.level)} ea` },
        { name: 'High Knees',         sets: `${sets(3,phase)}×45s` },
      ],
      tip: `Circuit style — minimal rest (${phase===1?'60s':phase===2?'45s':'30s'}) between exercises to keep heart rate up.`,
    },
    // Tue — Core & Cardio
    {
      name: 'Core Shred + Cardio', shortName: 'Core', icon: '💥', type: 'core',
      tags: ['core', 'cardio'],
      exercises: [
        { name: 'Plank',              sets: `${sets(3,phase)}×${30+phase*10}s` },
        { name: 'Bicycle Crunches',   sets: `${sets(3,phase)}×${reps(20,phase,state.level)}` },
        { name: 'Leg Raises',         sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Jump Rope (sim)',     sets: `${sets(3,phase)}×60s` },
        { name: 'Russian Twists',     sets: `${sets(3,phase)}×${reps(20,phase,state.level)} ea` },
      ],
      tip: 'Focus on controlled breathing. Exhale on the crunch, inhale on the release.',
    },
    // Wed — Cardio Intervals
    {
      name: 'HIIT Cardio Blast', shortName: 'HIIT', icon: '⚡', type: 'hiit',
      tags: ['hiit'],
      exercises: [
        { name: `Tabata Sprints (20s on/10s off)`, sets: `8 rounds` },
        { name: 'Jumping Jacks', sets: `${sets(3,phase)}×45s` },
        { name: 'Lateral Shuffles', sets: `${sets(3,phase)}×30s` },
        { name: 'Box Steps (chair)', sets: `${sets(3,phase)}×${reps(12,phase,state.level)} ea` },
        { name: 'Active Stretch', sets: '5 min' },
      ],
      tip: phase === 1
        ? 'Modify to 15s on / 15s off if you\'re just starting out.'
        : 'Push hard during the work interval — hold nothing back!',
    },
    // Thu — Upper Body
    {
      name: 'Upper Body Ignite', shortName: 'Upper', icon: '💪', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Push-Ups',           sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Wide Push-Ups',      sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Tricep Dips (chair)',sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Pike Push-Ups',      sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Plank Hold',         sets: `${sets(3,phase)}×45s` },
      ],
      tip: 'Superset push-ups with dips for maximum upper body fatigue.',
    },
    // Fri — Lower Body
    {
      name: 'Lower Body Torch', shortName: 'Lower', icon: '🦵', type: 'strength',
      tags: ['strength', 'cardio'],
      exercises: [
        { name: 'Jump Squats',        sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Reverse Lunges',     sets: `${sets(3,phase)}×${reps(12,phase,state.level)} ea` },
        { name: 'Wall Sit',           sets: `${sets(3,phase)}×${30+phase*15}s` },
        { name: 'Glute Bridges',      sets: `${sets(3,phase)}×${reps(20,phase,state.level)}` },
        { name: 'Calf Raises',        sets: `${sets(3,phase)}×${reps(20,phase,state.level)}` },
      ],
      tip: 'Big muscles burn more calories. Go deep on squats and lunges.',
    },
    // Sat — Active Recovery
    {
      name: 'Active Recovery', shortName: 'Recovery', icon: '🧘', type: 'mobility',
      tags: ['mobility'],
      exercises: [
        { name: 'Brisk Walk / Light Jog', sets: '25–35 min' },
        { name: 'Hip Flexor Stretch',     sets: `2×60s ea` },
        { name: 'Hamstring Stretch',      sets: `2×45s ea` },
        { name: 'Thoracic Rotation',      sets: `2×10 ea` },
        { name: 'Deep Breathing',         sets: '5 min' },
      ],
      tip: 'Active recovery boosts blood flow and speeds up fat loss — don\'t skip it.',
    },
  ];

  return schedules[dow - 1] || restDay(day);
}

// ─────────────────────────────────────────────────────────────
//  HOME  +  BUILD MUSCLE
//  Progressive calisthenics, volume & tempo work
// ─────────────────────────────────────────────────────────────
function homeBuildMuscle(day, phase, dow) {
  const schedules = [
    {
      name: 'Push Day — Chest & Shoulders', shortName: 'Push', icon: '🏋️', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Push-Ups',          sets: `${sets(4,phase)}×${reps(12,phase,state.level)}`, note: '3-1-1 tempo' },
        { name: 'Wide Push-Ups',     sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Diamond Push-Ups',  sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Pike Push-Ups',     sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Tricep Dips',       sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
      ],
      tip: 'Use a 3-second descent to increase time under tension and boost hypertrophy.',
    },
    {
      name: 'Pull Day — Back & Biceps', shortName: 'Pull', icon: '🔄', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Doorframe Rows',    sets: `${sets(4,phase)}×${reps(10,phase,state.level)}`, note: 'or table rows' },
        { name: 'Towel Bicep Curl',  sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Superman Hold',     sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Reverse Snow Angel',sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Chin-Up (if bar)',  sets: `${sets(3,phase)}×max` },
      ],
      tip: 'If you have a pull-up bar, prioritise it. If not, table/door rows are highly effective.',
    },
    {
      name: 'Leg Day — Quads & Glutes', shortName: 'Legs', icon: '🦵', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Slow Squats',           sets: `${sets(4,phase)}×${reps(15,phase,state.level)}`, note: '4s descent' },
        { name: 'Bulgarian Split Squat', sets: `${sets(3,phase)}×${reps(10,phase,state.level)} ea` },
        { name: 'Hip Thrust',            sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Nordic Curl Negative',  sets: `${sets(3,phase)}×${reps(6,phase,state.level)}` },
        { name: 'Calf Raises',           sets: `${sets(3,phase)}×${reps(20,phase,state.level)}` },
      ],
      tip: 'Slow tempos on squats recruit more muscle fibres than fast reps.',
    },
    {
      name: 'Upper Hypertrophy', shortName: 'Upper', icon: '💪', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Decline Push-Ups',   sets: `${sets(4,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Archer Push-Ups',    sets: `${sets(3,phase)}×${reps(8,phase,state.level)} ea` },
        { name: 'Pike Press',         sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Plank to Push-Up',   sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Dips (parallel)',     sets: `${sets(3,phase)}×max` },
      ],
      tip: 'Archer push-ups are a killer chest unilateral movement — go slow.',
    },
    {
      name: 'Core & Posterior Chain', shortName: 'Core', icon: '🎯', type: 'core',
      tags: ['core', 'strength'],
      exercises: [
        { name: 'Hollow Body Hold',  sets: `${sets(3,phase)}×${30+phase*10}s` },
        { name: 'Leg Raises',        sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Ab Wheel Rollout',  sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Superman',          sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Side Plank',        sets: `${sets(3,phase)}×${30+phase*10}s ea` },
      ],
      tip: 'Core strength is the foundation for all calisthenics progressions.',
    },
    {
      name: 'Active Recovery & Mobility', shortName: 'Mobility', icon: '🧘', type: 'mobility',
      tags: ['mobility'],
      exercises: [
        { name: 'Light Walk',             sets: '20 min' },
        { name: 'Pigeon Pose',            sets: `2×90s ea` },
        { name: 'Shoulder Mobility Drills',sets: '10 min' },
        { name: 'Cat-Cow',                sets: `3×10` },
        { name: 'Foam Roll / Massage',    sets: '10 min' },
      ],
      tip: 'Mobility work directly improves range of motion, making your lifts more effective.',
    },
  ];
  return schedules[dow - 1] || restDay(day);
}

// ─────────────────────────────────────────────────────────────
//  HOME  +  GET FIT
//  Calisthenics, flexibility, moderate cardio
// ─────────────────────────────────────────────────────────────
function homeGetFit(day, phase, dow) {
  const schedules = [
    {
      name: 'Calisthenics Full Body', shortName: 'Calisthenics', icon: '🤸', type: 'strength',
      tags: ['strength', 'cardio'],
      exercises: [
        { name: 'Push-Ups',           sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Squats',             sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Pull-Ups/Rows',      sets: `${sets(3,phase)}×${reps(8,phase,state.level)}` },
        { name: 'Dips',               sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Plank',              sets: `${sets(3,phase)}×45s` },
      ],
      tip: 'Consistency beats intensity at this stage. Quality form over max reps.',
    },
    {
      name: 'Cardio & Endurance', shortName: 'Cardio', icon: '🏃', type: 'cardio',
      tags: ['cardio'],
      exercises: [
        { name: `${phase===1?'Brisk Walk/Jog':phase===2?'Jog':'Run'} — Zone 2`, sets: `${20+phase*5} min` },
        { name: 'High Knees',         sets: `${sets(3,phase)}×30s` },
        { name: 'Jumping Jacks',      sets: `${sets(3,phase)}×45s` },
        { name: 'Burpees',            sets: `${sets(2,phase)}×${reps(8,phase,state.level)}` },
        { name: 'Cool Down Walk',     sets: '5 min' },
      ],
      tip: 'Zone 2 cardio (can hold a conversation) is the foundation of aerobic fitness.',
    },
    {
      name: 'Yoga & Flexibility', shortName: 'Yoga', icon: '🧘', type: 'mobility',
      tags: ['mobility'],
      exercises: [
        { name: 'Sun Salutation Flow',    sets: `${sets(3,phase)} rounds` },
        { name: 'Warrior I & II',         sets: `60s ea side` },
        { name: 'Downward Dog to Cobra',  sets: `${sets(3,phase)}×8` },
        { name: 'Pigeon Pose',            sets: `90s ea side` },
        { name: 'Seated Forward Fold',    sets: `2×60s` },
      ],
      tip: 'Breathe into tight spots. Flexibility gains come from consistent, relaxed holds.',
    },
    {
      name: 'Circuit Training', shortName: 'Circuit', icon: '⚙️', type: 'hiit',
      tags: ['hiit', 'strength'],
      exercises: [
        { name: 'Squat to Press (books)', sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Push-Ups',              sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Reverse Lunges',        sets: `${sets(3,phase)}×${reps(10,phase,state.level)} ea` },
        { name: 'Mountain Climbers',     sets: `${sets(3,phase)}×30s` },
        { name: 'Plank',                 sets: `${sets(3,phase)}×45s` },
      ],
      tip: 'Move from exercise to exercise with minimal rest for a full fitness effect.',
    },
    {
      name: 'Core & Balance', shortName: 'Core', icon: '🎯', type: 'core',
      tags: ['core'],
      exercises: [
        { name: 'Dead Bug',          sets: `${sets(3,phase)}×${reps(10,phase,state.level)} ea` },
        { name: 'Bird Dog',          sets: `${sets(3,phase)}×${reps(10,phase,state.level)} ea` },
        { name: 'Glute Bridge',      sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Side Plank',        sets: `${sets(3,phase)}×40s ea` },
        { name: 'Hollow Body Hold',  sets: `${sets(3,phase)}×30s` },
      ],
      tip: 'Core stability exercises protect your spine and improve all-round athletic performance.',
    },
    {
      name: 'Light Activity & Stretch', shortName: 'Stretch', icon: '🌿', type: 'mobility',
      tags: ['mobility'],
      exercises: [
        { name: 'Nature Walk', sets: '30 min' },
        { name: 'Hip Flexor Stretch', sets: `2×60s ea` },
        { name: 'Chest Opener',       sets: `2×45s` },
        { name: 'Quad Stretch',       sets: `2×45s ea` },
        { name: 'Spinal Twist',       sets: `2×45s ea` },
      ],
      tip: 'Saturday is about recharging. Movement without stress keeps you consistent.',
    },
  ];
  return schedules[dow - 1] || restDay(day);
}

// ─────────────────────────────────────────────────────────────
//  GYM  +  WEIGHT LOSS
//  Treadmill/rower intervals + superset lifting
// ─────────────────────────────────────────────────────────────
function gymWeightLoss(day, phase, dow) {
  const schedules = [
    {
      name: 'Upper Body Supersets', shortName: 'Upper', icon: '💪', type: 'strength',
      tags: ['strength', 'cardio'],
      exercises: [
        { name: 'Bench Press + DB Row',     sets: `${sets(3,phase)}×${reps(12,phase,state.level)}`, note: 'superset' },
        { name: 'Incline Press + Face Pull', sets: `${sets(3,phase)}×${reps(12,phase,state.level)}`, note: 'superset' },
        { name: 'Cable Fly + Lat Pulldown',  sets: `${sets(3,phase)}×${reps(12,phase,state.level)}`, note: 'superset' },
        { name: 'Tricep Pushdown + Curl',    sets: `${sets(3,phase)}×${reps(15,phase,state.level)}`, note: 'superset' },
      ],
      tip: 'Supersets burn more calories by keeping rest short and heart rate elevated.',
    },
    {
      name: 'Treadmill HIIT', shortName: 'HIIT', icon: '🏃', type: 'cardio',
      tags: ['cardio', 'hiit'],
      exercises: [
        { name: 'Warm-Up Walk',              sets: '5 min @ 5 km/h' },
        { name: `Sprint (${phase===1?'8':phase===2?'10':'12'} km/h)`, sets: `${8+phase*2}×30s` },
        { name: `Active Recovery Walk (5 km/h)`, sets: `${8+phase*2}×60s` },
        { name: 'Cool-Down Walk',            sets: '5 min' },
        { name: 'Stretching',               sets: '5 min' },
      ],
      tip: 'HIIT on treadmill burns 25–30% more calories than steady state running.',
    },
    {
      name: 'Lower Body Supersets', shortName: 'Lower', icon: '🦵', type: 'strength',
      tags: ['strength', 'cardio'],
      exercises: [
        { name: 'Back Squat + Leg Curl',     sets: `${sets(3,phase)}×${reps(12,phase,state.level)}`, note: 'superset' },
        { name: 'Leg Press + RDL',           sets: `${sets(3,phase)}×${reps(12,phase,state.level)}`, note: 'superset' },
        { name: 'Walking Lunges',            sets: `${sets(3,phase)}×${reps(12,phase,state.level)} ea` },
        { name: 'Calf Raise + Hip Thrust',   sets: `${sets(3,phase)}×${reps(15,phase,state.level)}`, note: 'superset' },
      ],
      tip: 'Lower body muscles are the biggest in the body — training them torches calories.',
    },
    {
      name: 'Rowing Intervals + Core', shortName: 'Row+Core', icon: '🚣', type: 'cardio',
      tags: ['cardio', 'core'],
      exercises: [
        { name: 'Rower Warm-Up',        sets: `5 min easy` },
        { name: `Rower Sprints`,        sets: `${6+phase*2}×250m hard` },
        { name: 'Rest between efforts', sets: `60s` },
        { name: 'Cable Crunch',         sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Ab Wheel Rollout',     sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
      ],
      tip: 'Rowing is a full-body calorie furnace. Drive through your legs, not just arms.',
    },
    {
      name: 'Full Body Circuit', shortName: 'Circuit', icon: '⚡', type: 'hiit',
      tags: ['hiit', 'strength'],
      exercises: [
        { name: 'Kettlebell Swing',      sets: `${sets(4,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Box Jumps',             sets: `${sets(3,phase)}×${reps(8,phase,state.level)}` },
        { name: 'Battle Ropes',          sets: `${sets(3,phase)}×30s` },
        { name: 'Sled Push/Pull',        sets: `${sets(3,phase)}×20m` },
        { name: 'Burpee to Pull-Up',     sets: `${sets(3,phase)}×${reps(8,phase,state.level)}` },
      ],
      tip: 'Functional circuit training keeps you in a caloric burn for hours after.',
    },
    {
      name: 'Active Recovery', shortName: 'Recovery', icon: '🧘', type: 'mobility',
      tags: ['mobility'],
      exercises: [
        { name: 'Light Bike / Elliptical', sets: '20 min Zone 1' },
        { name: 'Foam Rolling — Full Body', sets: '10 min' },
        { name: 'Hip Flexor Stretch',       sets: `2×60s ea` },
        { name: 'Shoulder Mobility',        sets: '10 min' },
        { name: 'Deep Breathing',           sets: '5 min' },
      ],
      tip: 'Don\'t skip recovery days. They prevent injury and set up your next session.',
    },
  ];
  return schedules[dow - 1] || restDay(day);
}

// ─────────────────────────────────────────────────────────────
//  GYM  +  BUILD MUSCLE
//  Heavy Push/Pull/Legs progressive overload
// ─────────────────────────────────────────────────────────────
function gymBuildMuscle(day, phase, dow) {
  const repScheme = phase === 1 ? '10–12' : phase === 2 ? '6–8' : '3–5';
  const intensity = phase === 1 ? 'Moderate (RPE 7)' : phase === 2 ? 'Heavy (RPE 8–9)' : 'Max Effort (RPE 9–10)';

  const schedules = [
    {
      name: 'Push Day — Chest, Shoulders, Triceps', shortName: 'Push', icon: '🏋️', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Barbell Bench Press',    sets: `${sets(4,phase)}×${repScheme}`, note: intensity },
        { name: 'Incline DB Press',       sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Cable Fly',              sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Overhead Press',         sets: `${sets(3,phase)}×${repScheme}` },
        { name: 'Lateral Raises',         sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Skull Crushers',         sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
      ],
      tip: `Phase ${phase}: Aim to add weight every session. Progressive overload is king.`,
    },
    {
      name: 'Pull Day — Back & Biceps', shortName: 'Pull', icon: '🔄', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Barbell Row',        sets: `${sets(4,phase)}×${repScheme}`, note: intensity },
        { name: 'Weighted Pull-Ups',  sets: `${sets(4,phase)}×${reps(8,phase,state.level)}` },
        { name: 'Lat Pulldown',       sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Seated Cable Row',   sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Face Pulls',         sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Barbell Curl',       sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
      ],
      tip: 'Focus on a full scapular retraction on all row movements for better back activation.',
    },
    {
      name: 'Leg Day — Quads, Hamstrings, Glutes', shortName: 'Legs', icon: '🦵', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Back Squat',          sets: `${sets(4,phase)}×${repScheme}`, note: intensity },
        { name: 'Romanian Deadlift',   sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Leg Press',           sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Bulgarian Split Squat', sets: `${sets(3,phase)}×${reps(10,phase,state.level)} ea` },
        { name: 'Leg Curl',            sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Calf Raises',         sets: `${sets(4,phase)}×${reps(15,phase,state.level)}` },
      ],
      tip: 'Squat deep — full range of motion activates more glute and quad fibres.',
    },
    {
      name: 'Push Day B — Volume', shortName: 'Push B', icon: '🏋️', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Incline Bench Press',  sets: `${sets(4,phase)}×${repScheme}` },
        { name: 'Arnold Press',         sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Pec Deck',             sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Upright Row',          sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Cable Lateral',        sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Close-Grip Bench',     sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
      ],
      tip: 'Volume days build the mass. Keep rest to 60–90s for maximum pump.',
    },
    {
      name: 'Pull Day B + Deadlift', shortName: 'Pull B', icon: '🔄', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Deadlift',            sets: `${sets(4,phase)}×${repScheme}`, note: intensity },
        { name: 'Single-Arm DB Row',   sets: `${sets(3,phase)}×${reps(10,phase,state.level)} ea` },
        { name: 'T-Bar Row',           sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Hammer Curl',         sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Preacher Curl',       sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Shrugs',              sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
      ],
      tip: 'The deadlift is king. Brace your core and drive through the floor.',
    },
    {
      name: 'Active Recovery', shortName: 'Recovery', icon: '🧘', type: 'mobility',
      tags: ['mobility'],
      exercises: [
        { name: 'Bike / Elliptical',   sets: '20 min easy' },
        { name: 'Full Body Foam Roll', sets: '10 min' },
        { name: 'Hip Mobility Drills', sets: '10 min' },
        { name: 'Shoulder Circles',    sets: '5 min' },
        { name: 'Breathing Work',      sets: '5 min' },
      ],
      tip: 'Muscles grow during recovery. Protect your progress with quality rest.',
    },
  ];
  return schedules[dow - 1] || restDay(day);
}

// ─────────────────────────────────────────────────────────────
//  GYM  +  GET FIT
//  Mix of cardio, strength, and functional training
// ─────────────────────────────────────────────────────────────
function gymGetFit(day, phase, dow) {
  const schedules = [
    {
      name: 'Full Body Strength', shortName: 'Full Body', icon: '💪', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Goblet Squat',     sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'DB Bench Press',   sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Lat Pulldown',     sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Overhead Press',   sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Plank',            sets: `${sets(3,phase)}×45s` },
      ],
      tip: 'Full-body training maximises weekly frequency and accelerates fitness adaptation.',
    },
    {
      name: 'Cardio Machine Intervals', shortName: 'Cardio', icon: '🏃', type: 'cardio',
      tags: ['cardio'],
      exercises: [
        { name: `Treadmill / Bike (Zone 2)`, sets: `${20+phase*5} min` },
        { name: 'Stair Master',              sets: `${10+phase*5} min` },
        { name: 'Rowing Machine',            sets: `${5+phase*2} min` },
        { name: 'Stretching',               sets: '5 min' },
      ],
      tip: 'Mix your cardio machines to work different muscle groups and avoid boredom.',
    },
    {
      name: 'Functional Circuit', shortName: 'Circuit', icon: '⚙️', type: 'hiit',
      tags: ['hiit', 'strength'],
      exercises: [
        { name: 'Kettlebell Swing',   sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'TRX Row',            sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Box Step-Ups',       sets: `${sets(3,phase)}×${reps(12,phase,state.level)} ea` },
        { name: 'Medicine Ball Slam', sets: `${sets(3,phase)}×${reps(12,phase,state.level)}` },
        { name: 'Battle Ropes',       sets: `${sets(3,phase)}×30s` },
      ],
      tip: 'Functional training builds real-world strength and athletic capacity.',
    },
    {
      name: 'Upper Body Strength', shortName: 'Upper', icon: '🏋️', type: 'strength',
      tags: ['strength'],
      exercises: [
        { name: 'Bench Press',       sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Barbell Row',       sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Shoulder Press',    sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Pull-Ups',          sets: `${sets(3,phase)}×max` },
        { name: 'Dips',              sets: `${sets(3,phase)}×max` },
      ],
      tip: 'Compound movements first, isolation last. Always.',
    },
    {
      name: 'Lower Body + Core', shortName: 'Lower', icon: '🦵', type: 'strength',
      tags: ['strength', 'core'],
      exercises: [
        { name: 'Back Squat',        sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Romanian Deadlift', sets: `${sets(3,phase)}×${reps(10,phase,state.level)}` },
        { name: 'Walking Lunges',    sets: `${sets(3,phase)}×${reps(12,phase,state.level)} ea` },
        { name: 'Cable Crunch',      sets: `${sets(3,phase)}×${reps(15,phase,state.level)}` },
        { name: 'Plank Variations',  sets: `${sets(3,phase)}×40s` },
      ],
      tip: 'Train legs hard. It builds the most metabolic muscle and boosts hormones.',
    },
    {
      name: 'Yoga & Mobility', shortName: 'Mobility', icon: '🧘', type: 'mobility',
      tags: ['mobility'],
      exercises: [
        { name: 'Light Cardio',           sets: '15 min' },
        { name: 'Hip Flexor Stretch',     sets: `2×60s ea` },
        { name: 'T-Spine Rotation',       sets: `2×10 ea` },
        { name: 'Ankle Mobility Drills',  sets: '10 min' },
        { name: 'Foam Roll — Full Body',  sets: '10 min' },
      ],
      tip: 'Mobility is your long-game investment. Flexible athletes stay injury-free.',
    },
  ];
  return schedules[dow - 1] || restDay(day);
}

// ── Init ───────────────────────────────────────
loadState();

// If there's a saved complete plan, restore dashboard
if (state.goal && state.location) {
  renderDashboard();
  document.getElementById('screen-onboarding').classList.remove('active');
  document.getElementById('screen-dashboard').classList.add('active');
}
