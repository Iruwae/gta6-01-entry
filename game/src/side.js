// side.js — street races, taxi fares, collectible packages
// (round-5 rebuild, builder B2).
// S.sideActivities = { race, taxi, packages }.
// Race: KeyT in a car at the start pad (-60,-60) opens a 4-gate loop
// worth $300. Taxi: KeyY in a car at the stand (68,60) takes a $100
// fare to the motel. Packages: 12 spots around the map, $50 each.

const RACE_PAD = { x: -60, z: -60 };
const RACE_PAD_RADIUS = 8;
const RACE_GATES = [
  { x: 60, z: -60 },
  { x: 60, z: 60 },
  { x: -60, z: 60 },
  { x: -60, z: -60 },
];
const GATE_RADIUS = 12;
const RACE_PRIZE = 300;

const TAXI_STAND = { x: 68, z: 60 };
const TAXI_STAND_RADIUS = 8;
const TAXI_DEST = { x: 120, z: -120 };
const TAXI_FARE = 100;
const TAXI_ARRIVE_RADIUS = 8;

const PACKAGE_SPOTS = [
  { x: -120, z: 120 },
  { x: 120, z: -120 },
  { x: -120, z: -120 },
  { x: -30, z: 150 },
  { x: 30, z: -150 },
  { x: 150, z: 30 },
  { x: -150, z: -30 },
  { x: -150, z: 90 },
  { x: 150, z: -90 },
  { x: -30, z: -150 },
  { x: 90, z: -150 },
  { x: 0, z: 0 },
];
const PACKAGE_RADIUS = 3;
const PACKAGE_PAY = 50;

function distTo(pos, x, z) {
  if (!pos) return Infinity;
  return Math.hypot(pos.x - x, pos.z - z);
}

function toast(msg) {
  const el = document.getElementById('toast');
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

export function init(S) {
  if (!S.sideActivities) S.sideActivities = {};
  const sa = S.sideActivities;
  if (!sa.race) sa.race = { active: false, gate: 0 };
  if (!sa.taxi) sa.taxi = { active: false, dest: null, fare: 0 };
  if (!Array.isArray(sa.packages)) {
    sa.packages = PACKAGE_SPOTS.map((p) => ({ x: p.x, z: p.z, taken: false }));
  }
  if (!S.stats) S.stats = {};
  for (const k of ['racesWon', 'faresDone', 'packages']) {
    if (typeof S.stats[k] !== 'number') S.stats[k] = 0;
  }

  let gateInside = false;

  function update(dt) {
    if (S.mode === 'paused') return;
    // Street race gates: advance only on ENTRY, so a slow frame rate
    // (or a double-ticked update) can never skip or double-count.
    if (sa.race.active && S.car && S.car.pos) {
      const gate = RACE_GATES[sa.race.gate];
      if (gate) {
        const d = distTo(S.car.pos, gate.x, gate.z);
        if (d <= GATE_RADIUS && !gateInside) {
          gateInside = true;
          sa.race.gate += 1;
          toast('Gate ' + sa.race.gate + ' / ' + RACE_GATES.length);
          if (sa.race.gate >= RACE_GATES.length) {
            sa.race.active = false;
            sa.race.gate = 0;
            S.stats.racesWon = (S.stats.racesWon || 0) + 1;
            S.cash = (S.cash || 0) + RACE_PRIZE;
            toast('Race won! +$' + RACE_PRIZE);
            if (S.banterDirector && typeof S.banterDirector.raceWin === 'function') {
              S.banterDirector.raceWin();
            }
          }
        } else if (d > GATE_RADIUS) {
          gateInside = false;
        }
      }
    } else {
      gateInside = false;
    }
    // Taxi drop-off.
    if (sa.taxi.active && sa.taxi.dest && S.car && S.car.pos) {
      if (distTo(S.car.pos, sa.taxi.dest.x, sa.taxi.dest.z) <= TAXI_ARRIVE_RADIUS) {
        const fare = sa.taxi.fare || TAXI_FARE;
        sa.taxi.active = false;
        sa.taxi.dest = null;
        sa.taxi.fare = 0;
        S.stats.faresDone = (S.stats.faresDone || 0) + 1;
        S.cash = (S.cash || 0) + fare;
        toast('Fare delivered! +$' + fare);
      }
    }
    // Packages: the player or the car can pick them up.
    for (const pkg of sa.packages) {
      if (pkg.taken) continue;
      const dp = distTo(S.player && S.player.pos, pkg.x, pkg.z);
      const dc = distTo(S.car && S.car.pos, pkg.x, pkg.z);
      if (Math.min(dp, dc) <= PACKAGE_RADIUS) {
        pkg.taken = true;
        S.stats.packages = (S.stats.packages || 0) + 1;
        S.cash = (S.cash || 0) + PACKAGE_PAY;
        toast('Package found! +$' + PACKAGE_PAY);
      }
    }
  }

  sa.update = update;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (S.mode === 'paused') return;
    if (e.code === 'KeyT') {
      if (S.car && S.car.pos && !sa.race.active
        && distTo(S.car.pos, RACE_PAD.x, RACE_PAD.z) <= RACE_PAD_RADIUS) {
        sa.race.active = true;
        sa.race.gate = 0;
        gateInside = false;
        toast('Street race started — hit all 4 gates!');
      }
    } else if (e.code === 'KeyY') {
      if (S.car && S.car.pos && !sa.taxi.active
        && distTo(S.car.pos, TAXI_STAND.x, TAXI_STAND.z) <= TAXI_STAND_RADIUS) {
        sa.taxi.active = true;
        sa.taxi.dest = { x: TAXI_DEST.x, z: TAXI_DEST.z };
        sa.taxi.fare = TAXI_FARE;
        toast('Taxi fare: take them to the motel ($' + TAXI_FARE + ').');
      }
    }
  });

  setInterval(() => {
    try { update(0.15); } catch (e) { /* never break the page */ }
  }, 150);
  if (Array.isArray(S._moduleTicks)) S._moduleTicks.push((dt) => update(dt));

  return sa;
}

export default init;
