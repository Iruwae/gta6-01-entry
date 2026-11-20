// missions.js — ten story jobs for Vic Torres in Solmar Bay.
// A job board, briefing dialogue, objectives out in the city, and
// cash on completion. All characters and story are original.
// Written fresh for round 7 from the shared spec; no repo code was read.

const GARAGE = { x: -90, z: -66 };
const JOBS = [
  {
    id: 'm1', num: 1, title: 'First Drop', payout: 250,
    objective: 'Drive the package to the old pier gate',
    dest: { x: 140, z: -140 },
    lines: [
      { name: 'LENA CRUZ', text: 'Vic wants a package moved, no questions. Pick it up here at the garage and take it to the old pier gate, east side. Quiet streets, quick feet.' },
      { name: 'MARCO SOLIS', text: 'And Vic? If the cops light you up, lose them before you reach the gate. A hot drop is a dead drop.' },
    ],
  },
  {
    id: 'm2', num: 2, title: 'Salt Air Pickup', payout: 300,
    objective: 'Collect the crate from the marina yard',
    dest: { x: -140, z: 140 },
    lines: [
      { name: 'LENA CRUZ', text: 'A crate came in on the night boat and nobody signed for it. Grab it from the marina yard, west end, and bring it back to Vic.' },
      { name: 'VIC TORRES', text: 'That crate pays for your next three dinners, kid. Do not drop it, do not open it, do not sell it.' },
    ],
  },
  {
    id: 'm3', num: 3, title: 'The Quiet Valet', payout: 350,
    objective: 'Lift the sunset-red coupe from the north lot',
    dest: { x: 150, z: 0 },
    lines: [
      { name: 'MARCO SOLIS', text: 'A sunset-red coupe sits in the north lot with the keys in the sun visor. Rich kid, lazy habits. Take it, bring it to the yard.' },
      { name: 'LENA CRUZ', text: 'If an alarm screams, drive like you mean it. The fence only pays for cars that arrive in one piece.' },
    ],
  },
  {
    id: 'm4', num: 4, title: 'Paper Trail', payout: 400,
    objective: 'Swap the ledger at the back office',
    dest: { x: -150, z: -40 },
    lines: [
      { name: 'VIC TORRES', text: 'Somebody is cooking my books. There is a ledger in a back office on the west side. Swap it for the clean one in your pocket.' },
      { name: 'MARCO SOLIS', text: 'In and out. Nobody sees your face, nobody remembers your jacket.' },
    ],
  },
  {
    id: 'm5', num: 5, title: 'Crew Night', payout: 600,
    objective: 'Hit the docks with Lena and bring back the haul',
    dest: { x: 140, z: 140 },
    lines: [
      { name: 'LENA CRUZ', text: 'Tonight we work together, Vic. I drive, you carry, and nobody gets left on the docks. The haul is in the far container row.' },
      { name: 'VIC TORRES', text: 'Lena is your crew now. Watch her back and she will watch yours — that is the whole job, and the whole rule.' },
      { name: 'LENA CRUZ', text: 'Keys are in my hand already. Let us go make the bay remember our names.' },
    ],
  },
  {
    id: 'm6', num: 6, title: 'Low Tide', payout: 450,
    objective: 'Reach the beached skiff at the south shore',
    dest: { x: -40, z: -150 },
    lines: [
      { name: 'LENA CRUZ', text: 'A skiff beached itself on the south shore at low tide with a lockbox under the bench. Wade out, grab it, come home.' },
      { name: 'VIC TORRES', text: 'Tide comes back fast down there. Do not admire the view.' },
    ],
  },
  {
    id: 'm7', num: 7, title: 'The Long Way Home', payout: 500,
    objective: 'Escort the courier to the east gate',
    dest: { x: 150, z: 80 },
    lines: [
      { name: 'MARCO SOLIS', text: 'A courier needs an escort to the east gate. Somebody wants his satchel, and they are not shy about it.' },
      { name: 'LENA CRUZ', text: 'You drive lead, I watch the mirrors. If a car sits on us twice, it is not a coincidence.' },
    ],
  },
  {
    id: 'm8', num: 8, title: 'Harbor Lights', payout: 550,
    objective: 'Photograph the manifest at the west crane',
    dest: { x: -150, z: 80 },
    lines: [
      { name: 'VIC TORRES', text: 'I need proof, not promises. The manifest hangs by the west crane. Get close enough to read it and get out.' },
      { name: 'MARCO SOLIS', text: 'Cranes mean cameras. Keep your head down and your engine running.' },
    ],
  },
  {
    id: 'm9', num: 9, title: 'Dust and Diesel', payout: 650,
    objective: 'Deliver the fuel drums to the south depot',
    dest: { x: 80, z: -150 },
    lines: [
      { name: 'LENA CRUZ', text: 'Fuel drums, south depot, before the trucks roll out. Heavy load, so brake early and take the corners wide.' },
      { name: 'VIC TORRES', text: 'That depot keeps half the bay moving. They pay on time when we deliver on time.' },
    ],
  },
  {
    id: 'm10', num: 10, title: 'Bay Legend', payout: 1000,
    objective: 'Meet Vic at the north overlook and close the book',
    dest: { x: 0, z: -168 },
    lines: [
      { name: 'VIC TORRES', text: 'One last run, kid. Meet me at the north overlook. After tonight the whole bay knows the name Vic Torres — and yours right beside it.' },
      { name: 'LENA CRUZ', text: 'We started with a borrowed car and a pocket of nothing. Finish this, and we are legends.' },
    ],
  },
];

function dom(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  if (typeof document !== 'undefined') return document.getElementById(id);
  return null;
}

export function init(ctx) {
  const S = ctx.state;
  if (typeof S.cash !== 'number') S.cash = 120;
  if (typeof S.missionIndex !== 'number') S.missionIndex = 0;
  if (!S.missions || typeof S.missions.start !== 'function') {
    S.missions = { start: null, current: (S.missions && S.missions.current) || null };
  }
  if (!S.crew) S.crew = { active: false, mesh: null };

  let lastListIndex = -1;

  // Dialogue lives in exactly one place: the dialogue module owns the
  // #dialogue box, its lines, and its click handler. This module used to
  // run a second controller on the same box, so one click fired both
  // listeners — the dialogue module hid the box, and its backstop then
  // re-opened the canned briefing instead of the mission's next line.
  // Missions now only hand their lines to the dialogue module, lazily.
  function showDialogue(lines) {
    if (ctx.api && typeof ctx.api.showDialogue === 'function' && ctx.api.showDialogue !== showDialogue) {
      ctx.api.showDialogue(lines);
    }
  }

  function advanceDialogue() {
    if (ctx.api && typeof ctx.api.advanceDialogue === 'function' && ctx.api.advanceDialogue !== advanceDialogue) {
      ctx.api.advanceDialogue();
    }
  }

  function toast(text) {
    const el = dom(ctx, 'toast');
    if (el) el.textContent = text;
  }

  function joinCrew() {
    if (!S.crew) S.crew = { active: false, mesh: null };
    S.crew.active = true;
    if (S.crew.mesh) S.crew.mesh.visible = true;
    if (ctx.api && typeof ctx.api.crewJoin === 'function') ctx.api.crewJoin();
  }

  function start(id) {
    let index = -1;
    if (typeof id === 'string') {
      const m = id.match(/(\d+)/);
      index = m ? parseInt(m[1], 10) - 1 : JOBS.findIndex((j) => j.id === id);
    } else if (typeof id === 'number') {
      index = id >= 0 && id < JOBS.length ? id : -1;
    }
    if (index < 0 || index >= JOBS.length) return null;
    const job = JOBS[index];
    const current = {
      id: job.id, num: job.num, title: job.title,
      objective: job.objective, payout: job.payout,
      dest: { x: job.dest.x, z: job.dest.z },
      lines: job.lines,
    };
    S.missions.current = current;
    if (job.num >= 5) joinCrew();
    showDialogue(job.lines);
    const obj = dom(ctx, 'objective');
    if (obj) obj.textContent = job.title + ': ' + job.objective;
    refreshList();
    return current;
  }

  function complete(job) {
    S.cash += job.payout;
    S.missionIndex = Math.max(S.missionIndex, job.num);
    S.missions.current = null;
    toast(job.title + ' complete — $' + job.payout + ' paid.');
    if (S.respectDirector && typeof S.respectDirector.add === 'function') S.respectDirector.add(25, job.title);
    const obj = dom(ctx, 'objective');
    if (obj) obj.textContent = S.missionIndex < JOBS.length ? 'Next job: ' + JOBS[S.missionIndex].title : 'All jobs done — you run the bay now.';
    refreshList();
  }

  function refreshList() {
    const list = dom(ctx, 'mission-list');
    if (!list) return;
    list.innerHTML = '';
    JOBS.forEach((job, i) => {
      const row = document.createElement('div');
      row.className = 'job-row';
      const status = i < S.missionIndex ? 'DONE' : i === S.missionIndex ? 'AVAILABLE' : 'LOCKED';
      row.dataset.mission = job.id;
      row.innerHTML = '';
      const titleEl = document.createElement('span');
      titleEl.className = 'job-title';
      titleEl.textContent = 'JOB ' + job.num + ' — ' + job.title;
      const payEl = document.createElement('span');
      payEl.className = 'job-pay';
      payEl.textContent = '$' + job.payout + ' • ' + status;
      row.appendChild(titleEl);
      row.appendChild(payEl);
      row.addEventListener('click', () => {
        if (i <= S.missionIndex && !S.missions.current) start(i);
      });
      list.appendChild(row);
    });
    lastListIndex = S.missionIndex;
  }

  S.missions.start = start;
  // NOTE: do not assign ctx.api.showDialogue / advanceDialogue here —
  // the dialogue module owns those; assigning the wrappers above would
  // make them call themselves.
  ctx.api.missions = { start, jobs: JOBS, complete, showDialogue, advanceDialogue };

  refreshList();
  const btnMissions = dom(ctx, 'btn-missions');
  if (btnMissions && !btnMissions.dataset.missionsWired) {
    btnMissions.dataset.missionsWired = '1';
    btnMissions.addEventListener('click', () => { setTimeout(refreshList, 50); });
  }

  ctx.updates.push((dt) => {
    if (lastListIndex !== S.missionIndex) refreshList();

    // Job 1 finds the player at the garage.
    if (!S.missions.current && S.missionIndex === 0 && S.mode === 'playing' && !S.cutscene && S.player) {
      const d = Math.hypot(S.player.pos.x - GARAGE.x, S.player.pos.z - GARAGE.z);
      if (d < 9) start(0);
    }

    const cur = S.missions.current;
    if (cur && cur.dest && S.player && S.mode === 'playing') {
      const where = S.car ? S.car.pos : S.player.pos;
      const d = Math.hypot(where.x - cur.dest.x, where.z - cur.dest.z);
      if (d < 7) complete(cur);
    }
  });
}
