// SOLMAR BAY — missions.js (round 8 rebuild, written blind from the spec)
// Ten story jobs and the job board, street races (T), taxi fares (Y),
// the 12 collectible packages, and the district readout.
// Missions wrap the state's start function: they call it, they do not
// replace the state shape. Talks to the game only through ctx.
import * as THREE from '../vendor/three.module.min.js';

const GARAGE = { x: -90, z: -66 };
const RACE_PAD = { x: -60, z: -60 };
const RACE_GATES = [[60, -60], [60, 60], [-60, 60], [-60, -60]];
const TAXI_STAND = { x: 68, z: 60 };
const TAXI_DESTS = [[-120, -120], [120, 120], [0, 165], [-140, 40], [100, -60], [0, -165]];
const PACKAGE_SPOTS = [
  [-120, 120], [-120, -120], [120, -120], [120, 120],
  [0, 165], [0, -165], [-165, 0], [165, 0],
  [60, 120], [-60, -120], [90, -90], [-90, 90],
];
const DISTRICTS = [
  { id: 'harbor', name: 'HARBOR', x: 120, z: 120 },
  { id: 'beach', name: 'BEACH', x: 0, z: 165 },
  { id: 'uptown', name: 'UPTOWN', x: 120, z: -90 },
  { id: 'strip', name: 'THE STRIP', x: 0, z: 135 },
  { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0 },
  { id: 'marina', name: 'MARINA', x: -120, z: 60 },
  { id: 'oldtown', name: 'OLD TOWN', x: -120, z: -120 },
];

const MISSIONS = [
  {
    id: 'm1', n: 1, title: 'First Wheels', pay: 150, target: { x: 140, z: -40 },
    lines: [
      { name: 'LENA CRUZ', text: 'Vic says you need wheels before anything else. Take the sport car by the garage — it is yours to borrow.' },
      { name: 'MARCO SOLIS', text: 'Drive it east to the old pier and do not scratch the paint. Vic hates scratches more than cops.' },
    ],
  },
  {
    id: 'm2', n: 2, title: 'Sunset Drop', pay: 200, target: { x: -140, z: 140 },
    lines: [
      { name: 'LENA CRUZ', text: 'A package needs to reach the marina before dark. Small bag, big money, no questions.' },
      { name: 'VIC TORRES', text: 'The buyer waits at the far pier. If anyone follows you, lose them first.' },
    ],
  },
  {
    id: 'm3', n: 3, title: 'Harbor Lights', pay: 250, target: { x: 120, z: 120 },
    lines: [
      { name: 'MARCO SOLIS', text: 'The harbor crew skims our crates every week. Go remind them whose bay this is.' },
      { name: 'LENA CRUZ', text: 'Keep it quiet. We want them scared, not dead — dead men bring detectives.' },
    ],
  },
  {
    id: 'm4', n: 4, title: 'Strip Run', pay: 300, target: { x: 0, z: 135 },
    lines: [
      { name: 'VIC TORRES', text: 'The Strip pays protection to the wrong people now. Drive through and collect what is ours.' },
      { name: 'LENA CRUZ', text: 'Smile at the cameras. The Strip loves a show, and we love the money.' },
    ],
  },
  {
    id: 'm5', n: 5, title: 'Two Hands', pay: 400, target: { x: 0, z: 165 },
    lines: [
      { name: 'LENA CRUZ', text: 'This one needs two hands, so I am riding with you. Stay close and do what I say.' },
      { name: 'VIC TORRES', text: 'Lena drives, you run. The beach house pays cash — bring it all back to me.' },
    ],
  },
  {
    id: 'm6', n: 6, title: 'Uptown Debt', pay: 450, target: { x: 120, z: -90 },
    lines: [
      { name: 'MARCO SOLIS', text: 'An uptown dealer owes Vic three weeks of rent. Go collect, politely at first.' },
      { name: 'LENA CRUZ', text: 'Uptown has cameras on every corner. Hood up, head down, in and out.' },
    ],
  },
  {
    id: 'm7', n: 7, title: 'Night Shift', pay: 500, target: { x: -165, z: 0 },
    lines: [
      { name: 'VIC TORRES', text: 'Tonight the whole bay is awake. Move the shipment west while the cops watch the Strip.' },
      { name: 'LENA CRUZ', text: 'Night driving is my favorite. Follow my line and the headlights will never find us.' },
    ],
  },
  {
    id: 'm8', n: 8, title: 'Old Town Score', pay: 600, target: { x: -120, z: -120 },
    lines: [
      { name: 'MARCO SOLIS', text: 'Old Town keeps its money in a back room with one sleepy guard. You know what to do.' },
      { name: 'VIC TORRES', text: 'Six hundred if it is clean. If it is loud, you never heard my name.' },
    ],
  },
  {
    id: 'm9', n: 9, title: 'Bay Bridge Run', pay: 750, target: { x: 0, z: -165 },
    lines: [
      { name: 'LENA CRUZ', text: 'One last courier run before the big one. North end, fast car, no stops.' },
      { name: 'VIC TORRES', text: 'Do this right and tomorrow you are not a hustler any more. You are crew.' },
    ],
  },
  {
    id: 'm10', n: 10, title: 'Bay Legend', pay: 1000, target: { x: 0, z: 0 },
    lines: [
      { name: 'VIC TORRES', text: 'Downtown, sunset, the whole city watching. Take the bay and it is yours.' },
      { name: 'LENA CRUZ', text: 'Whatever happens out there — I am right behind you. Make it legendary.' },
    ],
  },
];

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const input = ctx.input;
  const dom = ctx.dom || {};

  const $ = (id) => dom[id] || document.getElementById(id);

  function held(code) {
    if (!input) return false;
    if (typeof input.isDown === 'function') return input.isDown(code);
    const k = input.keys;
    if (k instanceof Set) return k.has(code);
    if (k) return !!k[code];
    return false;
  }
  const prevKeys = {};
  function pressed(code) {
    const now = held(code);
    const was = !!prevKeys[code];
    prevKeys[code] = now;
    return now && !was;
  }

  function toast(msg) {
    const el = $('toast');
    if (el) el.textContent = msg;
  }
  function setObjective(text) {
    const el = $('objective');
    if (el) el.textContent = text;
  }

  if (!S.missions) S.missions = {};
  if (!S.sideActivities) S.sideActivities = { taxi: { active: false }, race: { active: false } };
  if (!S.sideActivities.taxi) S.sideActivities.taxi = { active: false };
  if (!S.sideActivities.race) S.sideActivities.race = { active: false };
  if (!S.stats) S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  if (typeof S.missionIndex !== 'number') S.missionIndex = 0;

  // Wrap the state's start function: call it, then add our own layer.
  const origStart =
    typeof S.missions.start === 'function' ? S.missions.start : null;

  // ---- mission briefing dialogue (click the box to advance) ----
  let dlgQueue = [];
  let dlgShowing = false;
  let dlgDone = null;
  function showDialogue(lines, onDone) {
    dlgQueue = lines.slice();
    dlgDone = onDone || null;
    advanceDialogue();
  }
  function advanceDialogue() {
    const line = dlgQueue.shift();
    const box = $('dialogue');
    if (!line) {
      dlgShowing = false;
      if (box) box.classList.add('hidden');
      const done = dlgDone;
      dlgDone = null;
      if (done) done();
      return;
    }
    dlgShowing = true;
    const nameEl = $('dlg-name');
    const textEl = $('dlg-text');
    if (nameEl) nameEl.textContent = line.name;
    if (textEl) textEl.textContent = line.text;
    if (box) box.classList.remove('hidden');
  }
  const dlgEl = $('dialogue');
  if (dlgEl) {
    dlgEl.addEventListener('click', () => {
      if (dlgShowing) advanceDialogue();
    });
  }

  function startMission(idx) {
    const def =
      typeof idx === 'number'
        ? MISSIONS[idx]
        : MISSIONS.find((m) => m.id === idx);
    if (!def) return;
    if (origStart) {
      try {
        origStart.call(S.missions, idx);
      } catch (e) {
        // Fall through to our own shape below.
      }
    }
    S.missions.current = {
      id: def.id,
      title: def.title,
      pay: def.pay,
      target: def.target,
      n: def.n,
    };
    if (def.id === 'm5') {
      if (S.crew) S.crew.active = true;
      if (ctx.api && typeof ctx.api.crewJoin === 'function') {
        try {
          ctx.api.crewJoin();
        } catch (e) {}
      }
    }
    showDialogue(def.lines);
    setObjective(def.title + ' — reach the marker.');
    toast('Job started: ' + def.title);
  }
  S.missions.start = startMission;

  // ---- job board: ten rows, click one to take the job ----
  function buildJobList() {
    const list = $('mission-list');
    if (!list) return;
    list.innerHTML = '';
    MISSIONS.forEach((m, i) => {
      const row = document.createElement('div');
      row.className = 'job-row';
      row.textContent = 'JOB ' + m.n + ' — ' + m.title + ' · $' + m.pay;
      row.addEventListener('click', () => {
        if (S.missions.current) {
          toast('Finish the current job first.');
          return;
        }
        startMission(i);
        const panel = $('mission-select');
        if (panel) panel.classList.add('hidden');
      });
      list.appendChild(row);
    });
  }
  buildJobList();
  const btnMissions = $('btn-missions');
  if (btnMissions) {
    btnMissions.addEventListener('click', () => {
      const panel = $('mission-select');
      if (panel) panel.classList.remove('hidden');
    });
  }
  const btnCloseJobs = $('btn-close-jobs');
  if (btnCloseJobs) {
    btnCloseJobs.addEventListener('click', () => {
      const panel = $('mission-select');
      if (panel) panel.classList.add('hidden');
    });
  }

  // ---- street race state (lives on the shared sideActivities) ----
  const raceState = S.sideActivities.race;
  const taxiState = S.sideActivities.taxi;
  let raceGate = 0;

  function startRace() {
    raceState.active = true;
    raceGate = 0;
    toast('Street race! Hit all 4 gates.');
    setObjective('Race — gate 1 of 4.');
  }

  function startTaxi() {
    const dest = TAXI_DESTS[Math.floor(Math.random() * TAXI_DESTS.length)];
    taxiState.active = true;
    taxiState.dest = { x: dest[0], z: dest[1] };
    const d = Math.round(Math.hypot(dest[0] - TAXI_STAND.x, dest[1] - TAXI_STAND.z));
    taxiState.fare = 80 + Math.round(d * 0.25);
    toast('Fare picked up — take them to the marker. Pays $' + taxiState.fare + '.');
    setObjective('Taxi fare — deliver the passenger.');
  }

  // ---- the 12 packages, glowing gold, scattered across the bay ----
  const packages = PACKAGE_SPOTS.map(([x, z]) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({
        color: 0xffc94d,
        emissive: 0xa87800,
        emissiveIntensity: 0.9,
      })
    );
    mesh.position.set(x, 0.9, z);
    scene.add(mesh);
    return { x, z, mesh, taken: false };
  });
  // The side module already runs the 12 packages (its own set, its own
  // meshes): letting this duplicate set pay too would double every
  // pickup to $100 and double-count the stats, so this set never pays
  // out — mark it taken and hide its markers at the source.
  for (const p of packages) { p.taken = true; if (p.mesh) p.mesh.visible = false; }

  let districtT = 0;

  ctx.updates.push((dt) => {
    if (S.mode && S.mode !== 'playing') return;
    const pp = S.player.pos;
    const cp = S.car ? S.car.pos : pp;

    // Mission 1 auto-starts when the player reaches the garage.
    if (!S.missions.current && S.missionIndex === 0) {
      if (Math.hypot(pp.x - GARAGE.x, pp.z - GARAGE.z) < 10) startMission(0);
    }

    // Mission completion: reach the marker, get paid, next job unlocks.
    const cur = S.missions.current;
    if (cur && cur.target) {
      if (Math.hypot(cp.x - cur.target.x, cp.z - cur.target.z) < 12) {
        const def = MISSIONS.find((m) => m.id === cur.id);
        S.cash += cur.pay || 0;
        S.missionIndex = Math.max(S.missionIndex || 0, def ? def.n : 1);
        S.missions.current = null;
        toast('Job done: ' + cur.title + ' — paid $' + cur.pay + '.');
        setObjective('Pick the next job from the board (P).');
        if (S.respectDirector && typeof S.respectDirector.add === 'function') {
          try {
            S.respectDirector.add(25, 'job done');
          } catch (e) {}
        }
      }
    }

    // T: start a street race at the start pad.
    if (pressed('KeyT') && S.car && !raceState.active) {
      if (Math.hypot(cp.x - RACE_PAD.x, cp.z - RACE_PAD.z) < 10) startRace();
    }
    if (raceState.active) {
      const g = RACE_GATES[raceGate];
      if (g && Math.hypot(cp.x - g[0], cp.z - g[1]) < 9) {
        raceGate++;
        if (raceGate >= RACE_GATES.length) {
          raceState.active = false;
          S.stats.racesWon = (S.stats.racesWon || 0) + 1;
          S.cash += 300;
          toast('Race won! +$300.');
          setObjective('Pick the next job from the board (P).');
          if (S.banterDirector && typeof S.banterDirector.raceWin === 'function') {
            try {
              S.banterDirector.raceWin();
            } catch (e) {}
          }
        } else {
          setObjective('Race — gate ' + (raceGate + 1) + ' of 4.');
        }
      }
    }

    // Y: pick up a taxi fare at the stand.
    if (pressed('KeyY') && S.car && !taxiState.active) {
      if (Math.hypot(cp.x - TAXI_STAND.x, cp.z - TAXI_STAND.z) < 10) startTaxi();
    }
    if (taxiState.active && taxiState.dest) {
      if (Math.hypot(cp.x - taxiState.dest.x, cp.z - taxiState.dest.z) < 9) {
        taxiState.active = false;
        S.stats.faresDone = (S.stats.faresDone || 0) + 1;
        S.cash += taxiState.fare || 0;
        toast('Fare delivered! +$' + (taxiState.fare || 0) + '.');
        taxiState.dest = null;
      }
    }

    // Packages: walk onto one to collect it for $50.
    for (const pkg of packages) {
      if (pkg.taken) continue;
      if (Math.hypot(pp.x - pkg.x, pp.z - pkg.z) < 3) {
        pkg.taken = true;
        pkg.mesh.visible = false;
        S.stats.packages = (S.stats.packages || 0) + 1;
        S.cash += 50;
        toast('Package found! +$50.');
      }
    }

    // District readout: nearest named district wins.
    districtT -= dt;
    if (districtT <= 0) {
      districtT = 0.3;
      let best = DISTRICTS[4];
      let bestD = Infinity;
      for (const d of DISTRICTS) {
        const dd = Math.hypot(pp.x - d.x, pp.z - d.z);
        if (dd < bestD) {
          bestD = dd;
          best = d;
        }
      }
      S.district = best.id;
      const el = $('district');
      if (el) el.textContent = best.name;
    }
  });
}
