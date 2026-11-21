// missions.js — the 10 story jobs, the briefing dialogue box, and the
// two street side-hustles: checkpoint races (T) and taxi fares (Y).
// Packages live in side.js and the fence lives in fence.js — this file
// touches neither, so nothing pays twice.
const JOBS = [
  {
    id: 'm1', title: 'First Job', pay: 200, target: { x: 60, z: 60 },
    briefing: [
      { name: 'LENA CRUZ', text: 'Vic wants a package moved across town. No questions, no stops. You drive, I watch the mirrors.' },
      { name: 'MARCO SOLIS', text: 'The car is yours if you bring it back in one piece. Do not make me regret this, kid.' },
    ],
  },
  {
    id: 'm2', title: 'Harbor Run', pay: 250, target: { x: 120, z: 120 },
    briefing: [
      { name: 'VIC TORRES', text: 'Crates at the harbor, papers in the glovebox. The dock crew is paid to look the other way.' },
      { name: 'LENA CRUZ', text: 'Keep it under the speed the cameras like. I will ride shotgun.' },
    ],
  },
  {
    id: 'm3', title: 'Beach Drop', pay: 300, target: { x: 0, z: 165 },
    briefing: [
      { name: 'VIC TORRES', text: 'A buyer waits on the beach. Sunset crowd, nobody watches the sand.' },
      { name: 'MARCO SOLIS', text: 'If the buyer talks too much, you walk. Money first, always.' },
    ],
  },
  {
    id: 'm4', title: 'Uptown Pickup', pay: 350, target: { x: 120, z: -90 },
    briefing: [
      { name: 'LENA CRUZ', text: 'Uptown means cameras on every corner. In and out, no joyriding.' },
      { name: 'VIC TORRES', text: 'The client pays double if we are early. Be early.' },
    ],
  },
  {
    id: 'm5', title: 'Crew Job', pay: 500, target: { x: -60, z: -60 },
    briefing: [
      { name: 'LENA CRUZ', text: 'This one is ours, together. I drive the getaway, you handle the door. We walk out rich or not at all.' },
      { name: 'VIC TORRES', text: 'Lena vouched for you. That is worth more than the cut — do not waste it.' },
    ],
  },
  {
    id: 'm6', title: 'Strip Hustle', pay: 400, target: { x: 0, z: 135 },
    briefing: [
      { name: 'VIC TORRES', text: 'The Strip never sleeps and neither do the patrols. Blend in.' },
      { name: 'LENA CRUZ', text: 'Neon hides a lot of sins. Use it.' },
    ],
  },
  {
    id: 'm7', title: 'Night Shift', pay: 450, target: { x: -120, z: -120 },
    briefing: [
      { name: 'MARCO SOLIS', text: 'Night work pays night money. Watch the rooftops.' },
      { name: 'VIC TORRES', text: 'Bring it home and the next job is yours to name.' },
    ],
  },
  {
    id: 'm8', title: 'Bay Bridge', pay: 550, target: { x: 60, z: -60 },
    briefing: [
      { name: 'LENA CRUZ', text: 'The bridge is the only way across. One lane, no exits — so do not stop.' },
      { name: 'VIC TORRES', text: 'Fast is safe. Slow is a story for the police report.' },
    ],
  },
  {
    id: 'm9', title: 'The Big Score', pay: 800, target: { x: 120, z: 60 },
    briefing: [
      { name: 'VIC TORRES', text: 'This is the one we have been building toward. Everything rides on tonight.' },
      { name: 'LENA CRUZ', text: 'Stick to the plan and we are legends by morning.' },
    ],
  },
  {
    id: 'm10', title: 'Bay Legend', pay: 1000, target: { x: 0, z: 0 },
    briefing: [
      { name: 'VIC TORRES', text: 'Downtown, high noon of our little empire. Finish this and the bay is yours.' },
      { name: 'LENA CRUZ', text: 'Nobody to legend, kid. Let us go make it true.' },
    ],
  },
];

const RACE_GATES = [
  { x: 60, z: -60 },
  { x: 60, z: 60 },
  { x: -60, z: 60 },
  { x: -60, z: -60 },
];
const RACE_PAD = { x: -60, z: -60 };
const RACE_PRIZE = 300;
const TAXI_STAND = { x: 68, z: 60 };
const TAXI_DEST = { x: -120, z: -120 };
const TAXI_FARE = 120;
const GARAGE_SPOT = { x: -90, z: -66 };

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  let dlgLines = [];
  let dlgIndex = 0;

  function el(id) {
    return dom[id] || document.getElementById(id);
  }
  function toast(msg) {
    const t = el('toast');
    if (t) t.textContent = msg;
  }
  function setObjective(text) {
    const o = el('objective');
    if (o) o.textContent = text;
  }

  // --- dialogue box -------------------------------------------------
  function showLines(lines) {
    dlgLines = lines || [];
    dlgIndex = 0;
    renderLine();
  }
  function renderLine() {
    const box = el('dialogue');
    const nameEl = el('dlg-name');
    const textEl = el('dlg-text');
    if (!box) return;
    if (dlgIndex >= dlgLines.length) {
      box.classList.add('hidden');
      dlgLines = [];
      return;
    }
    const line = dlgLines[dlgIndex];
    if (nameEl) nameEl.textContent = line.name;
    if (textEl) textEl.textContent = line.text;
    box.classList.remove('hidden');
  }
  function advanceDialogue() {
    if (dlgLines.length === 0) return;
    dlgIndex += 1;
    renderLine();
  }
  const dlgBox = el('dialogue');
  if (dlgBox) dlgBox.addEventListener('click', advanceDialogue);

  // --- missions ------------------------------------------------------
  function resolveJob(id) {
    if (typeof id === 'number') return JOBS[id] || null;
    if (typeof id === 'string') {
      const n = parseInt(id.replace(/^m/i, ''), 10);
      if (!Number.isNaN(n) && n >= 1 && n <= JOBS.length) return JOBS[n - 1];
      return JOBS.find((j) => j.id === id) || null;
    }
    return null;
  }

  function start(id) {
    const job = resolveJob(id);
    if (!job) return false;
    const mission = {
      id: job.id,
      index: JOBS.indexOf(job),
      title: job.title,
      pay: job.pay,
      target: { x: job.target.x, z: job.target.z },
    };
    S.missions.current = mission;
    if (job.id === 'm5' && S.crew) {
      S.crew.active = true;
      if (S.crew.mesh) S.crew.mesh.visible = true;
    }
    setObjective(job.title + ' — reach the marker');
    showLines(job.briefing);
    return true;
  }

  function completeMission() {
    const cur = S.missions.current;
    if (!cur) return;
    S.cash = (S.cash || 0) + (cur.pay || 0);
    if (S.respectDirector && typeof S.respectDirector.add === 'function') {
      S.respectDirector.add(20, cur.title);
    }
    toast('Job done: ' + cur.title + ' +$' + (cur.pay || 0));
    S.missionIndex = Math.max(S.missionIndex || 0, (cur.index || 0) + 1);
    S.missions.current = null;
    setObjective('Pick a job from the board (P)');
  }

  if (!S.missions) S.missions = {};
  S.missions.start = start;
  S.missions.current = S.missions.current || null;
  S.missions.list = JOBS.map((j) => ({ id: j.id, title: j.title, pay: j.pay }));
  S.missions.jobs = S.missions.list;
  S.missions.all = JOBS;
  if (typeof S.missionIndex !== 'number') S.missionIndex = 0;
  if (ctx.api) ctx.api.showDialogue = showLines;

  // --- street race (T) ----------------------------------------------
  function racePos() {
    return S.car && S.car.pos ? S.car.pos : S.player.pos;
  }
  function startRace() {
    const race = S.sideActivities.race;
    if (race.active) return;
    const p = racePos();
    if (Math.hypot(p.x - RACE_PAD.x, p.z - RACE_PAD.z) > 14) return;
    race.active = true;
    race.gate = 0;
    race.gates = RACE_GATES.map((g) => ({ x: g.x, z: g.z }));
    toast('Street race! Hit all 4 checkpoints.');
    setObjective('Race: checkpoint 1 of 4');
  }
  function finishRace() {
    const race = S.sideActivities.race;
    race.active = false;
    race.gate = 0;
    S.stats.racesWon = (S.stats.racesWon || 0) + 1;
    S.cash = (S.cash || 0) + RACE_PRIZE;
    toast('Race won! +$' + RACE_PRIZE);
    setObjective('Pick a job from the board (P)');
    if (S.banterDirector && typeof S.banterDirector.raceWin === 'function') {
      S.banterDirector.raceWin();
    }
  }

  // --- taxi fares (Y) ------------------------------------------------
  function startTaxi() {
    const taxi = S.sideActivities.taxi;
    if (taxi.active) return;
    const p = racePos();
    if (Math.hypot(p.x - TAXI_STAND.x, p.z - TAXI_STAND.z) > 14) return;
    taxi.active = true;
    taxi.dest = { x: TAXI_DEST.x, z: TAXI_DEST.z };
    taxi.fare = TAXI_FARE;
    toast('Fare picked up — take them to the drop-off.');
    setObjective('Taxi: deliver the fare');
  }
  function finishTaxi() {
    const taxi = S.sideActivities.taxi;
    const fare = taxi.fare || TAXI_FARE;
    taxi.active = false;
    taxi.dest = null;
    S.stats.faresDone = (S.stats.faresDone || 0) + 1;
    S.cash = (S.cash || 0) + fare;
    toast('Fare delivered! +$' + fare);
    setObjective('Pick a job from the board (P)');
  }

  if (!S.sideActivities) S.sideActivities = {};
  if (!S.sideActivities.race) S.sideActivities.race = { active: false };
  if (!S.sideActivities.taxi) S.sideActivities.taxi = { active: false };
  if (!S.stats) S.stats = {};
  for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
    if (typeof S.stats[k] !== 'number') S.stats[k] = 0;
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (S.mode !== 'playing' || S.cutscene) return;
    if (e.code === 'KeyT') startRace();
    else if (e.code === 'KeyY') startTaxi();
  });

  (ctx.updates || []).push((dt) => {
    if (!S || !S.player || !S.player.pos) return;
    if (S.mode !== 'playing' || S.cutscene) return;
    // Mission 1 auto-starts when the player walks into the garage.
    if (!S.missions.current && (S.missionIndex || 0) === 0) {
      const d = Math.hypot(S.player.pos.x - GARAGE_SPOT.x, S.player.pos.z - GARAGE_SPOT.z);
      if (d < 7) start(0);
    }
    // Mission objective: reach the marker on foot or in the car.
    const cur = S.missions.current;
    if (cur && cur.target) {
      const p = racePos();
      if (Math.hypot(p.x - cur.target.x, p.z - cur.target.z) < 10) completeMission();
    }
    // Race gates.
    const race = S.sideActivities.race;
    if (race && race.active && race.gates) {
      const gate = race.gates[race.gate || 0];
      if (gate) {
        const p = racePos();
        if (Math.hypot(p.x - gate.x, p.z - gate.z) < 12) {
          race.gate = (race.gate || 0) + 1;
          if (race.gate >= race.gates.length) finishRace();
          else setObjective('Race: checkpoint ' + (race.gate + 1) + ' of 4');
        }
      }
    }
    // Taxi drop-off.
    const taxi = S.sideActivities.taxi;
    if (taxi && taxi.active && taxi.dest) {
      const p = racePos();
      if (Math.hypot(p.x - taxi.dest.x, p.z - taxi.dest.z) < 10) finishTaxi();
    }
  });
}
