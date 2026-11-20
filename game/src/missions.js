// missions.js — ten jobs for Vic Torres in Solmar Bay.
//
// The job list itself (titles, pay, briefings) lives in state.js and
// the job board panel lives in menu.js; this module is the story layer
// on top: where each job actually goes, what the objective line says,
// the crew joining for mission 5, and paying out when Vic reaches the
// drop point. It wraps the state's start() rather than replacing it,
// so the briefing lines, the mission index and the crew flag all stay
// exactly as the rest of the game expects them. The story here is all
// original: Vic, Lena and Marco working the bay, no borrowed plot.

const JOBS = [
  {
    id: 'm1', title: 'First Wheels', payout: 200,
    target: { x: 150, z: -150 },
    objective: 'Deliver the package to the north-east docks',
    lines: [
      { name: 'LENA CRUZ', text: "Vic's got a pickup that needs legs, not questions. You in, Vic?" },
      { name: 'MARCO SOLIS', text: 'Docks, north-east pier. Do not stop for anyone in a uniform.' },
    ],
  },
  {
    id: 'm2', title: 'Harbor Lights', payout: 250,
    target: { x: 170, z: 30 },
    objective: 'Skim the harbor crates and get the cut to the east pier',
    lines: [
      { name: 'LENA CRUZ', text: 'The harbor crew skims every crate that comes in. Tonight we skim them back.' },
      { name: 'VIC TORRES', text: 'Quiet, quick, and nobody sees my face. That is the whole plan.' },
    ],
  },
  {
    id: 'm3', title: 'Strip Run', payout: 300,
    target: { x: -160, z: 140 },
    objective: 'Carry the package across town by the long road',
    lines: [
      { name: 'MARCO SOLIS', text: 'Package goes across town. The long way. The short way has cameras.' },
      { name: 'LENA CRUZ', text: "I'll ride the radio for you. Holler if it gets loud out there." },
    ],
  },
  {
    id: 'm4', title: 'Beach Party Crash', payout: 350,
    target: { x: 0, z: -170 },
    objective: 'Slip the envelope to the north gate without making noise',
    lines: [
      { name: 'VIC TORRES', text: 'No noise on this one. In, out, like I was never there.' },
      { name: 'LENA CRUZ', text: 'I stashed a spare ride near the old arcade. Just in case.' },
    ],
  },
  {
    id: 'm5', title: 'Crew Up', payout: 500,
    target: { x: -150, z: -140 },
    objective: 'Run the south-west drop together with Lena riding along',
    lines: [
      { name: 'LENA CRUZ', text: "That's it — from here on, we run together. I drive, you handle the loud part." },
      { name: 'VIC TORRES', text: "Lena's with me now. Treat her right and she'll get you out of anything." },
    ],
  },
  {
    id: 'm6', title: 'Uptown Score', payout: 450,
    target: { x: 170, z: -60 },
    objective: 'Make three drops on the east side before sunrise traffic',
    lines: [
      { name: 'LENA CRUZ', text: "Sun's down, streets are ours. Let's show the bay how fast we are." },
      { name: 'MARCO SOLIS', text: 'Three drops, no stops. The buyers are already waiting.' },
    ],
  },
  {
    id: 'm7', title: 'Night Shift', payout: 400,
    target: { x: -170, z: 20 },
    objective: 'Collect the ledger from the west-side lockup',
    lines: [
      { name: 'VIC TORRES', text: "Somebody's been writing names down. I go un-write them." },
      { name: 'LENA CRUZ', text: 'Burner phones only tonight. Leave yours in the car.' },
    ],
  },
  {
    id: 'm8', title: "The Fence's Favor", payout: 550,
    target: { x: 60, z: -170 },
    objective: 'Lift the crate from the north yard while the guards sleep',
    lines: [
      { name: 'MARCO SOLIS', text: 'The yard sleeps at 2am. The guards sleep harder.' },
      { name: 'LENA CRUZ', text: "I'll keep the engine warm. You keep it quiet." },
    ],
  },
  {
    id: 'm9', title: 'Heat Wave', payout: 600,
    target: { x: -60, z: 170 },
    objective: 'Meet the boat at the south pier when the tide turns',
    lines: [
      { name: 'VIC TORRES', text: 'The tide brings in more than fish tonight. Be at the pier when it turns.' },
      { name: 'LENA CRUZ', text: "Water's choppy and so are the buyers. Eyes open." },
    ],
  },
  {
    id: 'm10', title: 'Bay Legend', payout: 1000,
    target: { x: 150, z: 120 },
    objective: 'Bring the vault cut home to the east marina',
    lines: [
      { name: 'VIC TORRES', text: "Everything we've built comes down to tonight. One vault, one crew, one shot." },
      { name: 'LENA CRUZ', text: 'We walk out of this legends, Vic. All of us. Together.' },
    ],
  },
];

const GARAGE_SPOT = { x: -90, z: -66 };
const COMPLETE_RADIUS = 7;

function el(ctx, id) {
  return (ctx.dom && ctx.dom[id]) ||
    (typeof document !== 'undefined' ? document.getElementById(id) : null);
}

function showToast(ctx, msg) {
  const api = ctx.api || {};
  if (typeof api.toast === 'function') {
    try { api.toast(msg); return; } catch (e) { /* fall through */ }
  }
  const box = el(ctx, 'toast');
  if (box) box.textContent = msg;
}

export function init(ctx) {
  const S = ctx.state;

  function showLines(lines) {
    // Only used if the state's own briefing path is unavailable; the
    // normal path goes through the dialogue module via state.js.
    const api = ctx.api || {};
    try {
      if (typeof api.showDialogue === 'function') { api.showDialogue(lines); return; }
      if (api.dialogue && typeof api.dialogue.show === 'function') { api.dialogue.show(lines); return; }
      if (typeof api.startDialogue === 'function') { api.startDialogue(lines); return; }
    } catch (e) { /* fall through to the direct DOM path */ }
    const box = el(ctx, 'dialogue');
    const nameEl = el(ctx, 'dlg-name');
    const textEl = el(ctx, 'dlg-text');
    if (!box || !nameEl || !textEl) return;
    S._dlgQueue = lines.slice();
    S._dlgIndex = 0;
    nameEl.textContent = lines[0].name || lines[0].speaker;
    textEl.textContent = lines[0].text;
    box.classList.remove('hidden');
    if (!showLines._wired) {
      showLines._wired = true;
      box.addEventListener('click', () => {
        const q = S._dlgQueue;
        if (!q) return;
        const i = (S._dlgIndex || 0) + 1;
        if (i >= q.length) {
          box.classList.add('hidden');
          S._dlgQueue = null;
          S._dlgIndex = 0;
          return;
        }
        S._dlgIndex = i;
        nameEl.textContent = q[i].name || q[i].speaker;
        textEl.textContent = q[i].text;
      });
    }
  }

  function refreshObjective() {
    const objEl = el(ctx, 'objective');
    if (!objEl) return;
    const cur = S.missions.current;
    const text = cur
      ? 'JOB: ' + cur.title + ' — ' + (cur.objective || cur.brief || '')
      : 'Free roam — open the job board with P';
    if (objEl.textContent !== text) objEl.textContent = text;
  }

  // Wrap the state's start(): it opens the job, advances the mission
  // index, raises the briefing and flags the crew for mission 5. This
  // wrapper only pins the drop point and the objective line onto the
  // mission it returns.
  const origStart = S.missions && typeof S.missions.start === 'function'
    ? S.missions.start.bind(S.missions)
    : null;

  function start(idOrIndex) {
    let idx = -1;
    if (typeof idOrIndex === 'number') idx = idOrIndex;
    else if (typeof idOrIndex === 'string') {
      const m = /^m?(\d+)$/.exec(idOrIndex.trim());
      if (m) idx = parseInt(m[1], 10) - 1;
    }
    if (idx < 0 || idx >= JOBS.length) return false;
    // The job counter means jobs DONE, not jobs opened: the state's
    // start() advances it when a job opens, which would unlock the
    // SMG the moment job 1 opens instead of when it is finished.
    // Pin it here and hand it back below; complete() is the only
    // place that moves it.
    const indexBeforeStart = S.missionIndex || 0;
    let cur = null;
    if (origStart) {
      cur = origStart(idx);
    } else {
      // No state start to wrap: open the job directly, same shape.
      cur = {
        id: JOBS[idx].id, index: idx, title: JOBS[idx].title,
        pay: JOBS[idx].payout, brief: JOBS[idx].objective, stage: 0,
      };
      S.missions.current = cur;
      S.missionIndex = idx + 1;
      showLines(JOBS[idx].lines);
    }
    // Hand the counter back: starting a job does not finish it.
    S.missionIndex = indexBeforeStart;
    if (cur) {
      cur.target = JOBS[idx].target;
      cur.objective = JOBS[idx].objective;
      if (idx === 4) {
        if (!S.crew) S.crew = { active: false, name: 'Lena Cruz' };
        S.crew.active = true;
        const crewApi = ctx.api.crew;
        if (crewApi && typeof crewApi.join === 'function') {
          try { crewApi.join(); } catch (e) { /* crew module reads S.crew */ }
        }
      }
    }
    refreshObjective();
    return cur || false;
  }

  if (S.missions) S.missions.start = start;

  function complete(job) {
    const idx = (typeof job.index === 'number') ? job.index : JOBS.findIndex((j) => j.id === job.id);
    const pay = (typeof job.pay === 'number') ? job.pay : JOBS[idx >= 0 ? idx : 0].payout;
    S.cash = (S.cash || 0) + pay;
    if (idx >= 0) S.missionIndex = Math.max(S.missionIndex || 0, idx + 1);
    S.missions.current = null;
    showToast(ctx, 'JOB DONE — ' + job.title + ' +$' + pay);
    const rd = S.respectDirector;
    if (rd && typeof rd.add === 'function') rd.add(60, 'job done');
    refreshObjective();
  }

  // ---- the job board panel (menu.js owns the main board; this is the
  // same ten rows as a fallback if it is ever opened from here) ----
  let builtFor = -1;
  function buildJobList() {
    const listEl = el(ctx, 'mission-list');
    if (!listEl) return;
    const rows = (S.missions && Array.isArray(S.missions.list)) ? S.missions.list : JOBS;
    listEl.innerHTML = '';
    rows.forEach((row, i) => {
      const done = (S.missionIndex || 0) > i;
      const div = document.createElement('div');
      div.className = 'job-row';
      const title = document.createElement('span');
      title.className = 'job-title';
      title.textContent = (i + 1) + '. ' + row.title;
      const pay = document.createElement('span');
      pay.className = 'job-pay';
      pay.textContent = '$' + (row.pay || row.payout || 0);
      const btn = document.createElement('button');
      btn.className = 'job-start';
      btn.textContent = done ? 'DONE' : 'START';
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        start(i);
        const panel = el(ctx, 'mission-select');
        if (panel) panel.classList.add('hidden');
        if (S.mode === 'paused') {
          S.mode = 'playing';
          const pause = el(ctx, 'pause-menu');
          if (pause) pause.classList.add('hidden');
        }
      });
      div.appendChild(title);
      div.appendChild(pay);
      div.appendChild(btn);
      listEl.appendChild(div);
    });
    builtFor = S.missionIndex || 0;
  }

  const btnMissions = el(ctx, 'btn-missions');
  if (btnMissions) {
    btnMissions.addEventListener('click', () => {
      buildJobList();
      const panel = el(ctx, 'mission-select');
      if (panel) panel.classList.remove('hidden');
    });
  }
  const btnClose = el(ctx, 'btn-close-jobs');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      const panel = el(ctx, 'mission-select');
      if (panel) panel.classList.add('hidden');
    });
  }
  const btnResume = el(ctx, 'btn-resume');
  if (btnResume) {
    btnResume.addEventListener('click', () => {
      S.mode = 'playing';
      const pause = el(ctx, 'pause-menu');
      if (pause) pause.classList.add('hidden');
      const panel = el(ctx, 'mission-select');
      if (panel) panel.classList.add('hidden');
    });
  }
  buildJobList();
  refreshObjective();

  // Wall-clock backstop for the garage offer: the frame loop runs at
  // roughly one frame per second under the software renderer, so a
  // frame-only trigger can take several seconds to notice the player
  // at the garage door. This timer checks the same spot on real time
  // and opens job 1 at once; it stands down once a job opens or the
  // counter moves.
  const garageWatch = setInterval(() => {
    try {
      if (S.mode !== 'playing' || S.cutscene) return;
      if (S.missions.current || (S.missionIndex || 0) !== 0) { clearInterval(garageWatch); return; }
      if (!S.player || !S.player.pos) return;
      const d = Math.hypot(S.player.pos.x - GARAGE_SPOT.x, S.player.pos.z - GARAGE_SPOT.z);
      if (d < 6) { clearInterval(garageWatch); start(0); }
    } catch (e) { /* the frame loop owns the offer; this is only a nudge */ }
  }, 250);

  ctx.updates.push((dt, t) => {
    const playing = S.mode === 'playing' && !S.cutscene;
    const panel = el(ctx, 'mission-select');
    if (panel && !panel.classList.contains('hidden') && builtFor !== (S.missionIndex || 0)) {
      buildJobList();
    }
    if (!playing) return;

    // Mission 1 offers itself at the garage door; the state
    // housekeeping watches the same spot, so this is only a backstop.
    if (!S.missions.current && (S.missionIndex || 0) === 0 && S.player && S.player.pos) {
      const d = Math.hypot(S.player.pos.x - GARAGE_SPOT.x, S.player.pos.z - GARAGE_SPOT.z);
      if (d < 6) start(0);
    }

    // Reaching the drop point closes the job out.
    const cur = S.missions.current;
    if (cur && cur.target) {
      const ep = (S.car && S.car.pos) ? S.car.pos : S.player.pos;
      if (ep) {
        const d = Math.hypot(ep.x - cur.target.x, ep.z - cur.target.z);
        if (d < COMPLETE_RADIUS) complete(cur);
      }
    }
    refreshObjective();
  });

  ctx.api.missions = { start, list: (S.missions && S.missions.list) || JOBS, complete };
}
