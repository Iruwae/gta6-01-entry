// SOLMAR BAY — side activities (round 7 rebuild, builder D).
// Three ways to earn on the side: street races (T at the start pad —
// four checkpoint gates, $300 for the win), taxi fares (Y at the taxi
// stand — pick up, drop off, $120), and twelve collectible packages
// scattered around the city ($50 each). The live state lives on
// S.sideActivities exactly as the rest of the game expects it.

const RACE_PAD = { x: -60, z: -60 };
const RACE_GATES = [
  { x: 60, z: -60 },
  { x: 60, z: 60 },
  { x: -60, z: 60 },
  { x: -60, z: -60 },
];
const RACE_PRIZE = 300;
const TAXI_STAND = { x: 68, z: 60 };
const TAXI_DEST = { x: 30, z: 30 };
const TAXI_FARE = 120;
const PACKAGE_SPOTS = [
  { x: -120, z: 120 }, { x: 120, z: -120 }, { x: -120, z: -120 }, { x: 140, z: 140 },
  { x: -150, z: 0 }, { x: 150, z: 0 }, { x: 0, z: -150 }, { x: 0, z: 150 },
  { x: -150, z: -150 }, { x: 150, z: 150 }, { x: -60, z: 150 }, { x: 60, z: -150 },
];
const PACKAGE_PAY = 50;

function near(ax, az, bx, bz, r) {
  return Math.hypot(ax - bx, az - bz) < r;
}

export function init(ctx) {
  const S = ctx.state;
  const THREE = ctx.THREE;

  // Make sure the shared side-activity shape exists, whatever the state
  // module already built.
  if (!S.sideActivities || typeof S.sideActivities !== 'object') {
    S.sideActivities = { taxi: { active: false }, race: { active: false } };
  }
  if (!S.sideActivities.taxi) S.sideActivities.taxi = { active: false };
  if (!S.sideActivities.race) S.sideActivities.race = { active: false };
  const race = S.sideActivities.race;
  const taxi = S.sideActivities.taxi;
  race.active = !!race.active;
  taxi.active = !!taxi.active;
  if (!Array.isArray(race.gates) || race.gates.length === 0) race.gates = RACE_GATES.map((g) => ({ x: g.x, z: g.z }));
  if (typeof race.gateIndex !== 'number') race.gateIndex = 0;

  // Twelve packages, with a small golden marker each in the 3D scene.
  if (!Array.isArray(S.packages) || S.packages.length !== 12) {
    S.packages = PACKAGE_SPOTS.map((s) => ({ x: s.x, z: s.z, taken: false, mesh: null }));
  }
  try {
    if (ctx.scene && THREE) {
      const geo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
      for (const pkg of S.packages) {
        if (pkg.mesh) continue;
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xa87600, emissiveIntensity: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pkg.x, 1.2, pkg.z);
        ctx.scene.add(mesh);
        pkg.mesh = mesh;
      }
    }
  } catch (e) { /* packages still work without meshes */ }

  const toast = (msg) => { try { if (ctx.api.showToast) ctx.api.showToast(msg); } catch (e) { /* silent */ } };
  const blip = () => { try { if (ctx.api.audio && ctx.api.audio.pickup) ctx.api.audio.pickup(); } catch (e) { /* silent */ } };

  function actorPos() {
    if (S.car && S.car.pos) return S.car.pos;
    return S.player && S.player.pos;
  }

  function startRace() {
    if (race.active) return false;
    const p = actorPos();
    if (!p || !near(p.x, p.z, RACE_PAD.x, RACE_PAD.z, 18)) {
      toast('The race starts at the pad on the west side — get close and press T.');
      return false;
    }
    race.active = true;
    race.gateIndex = 0;
    toast('Street race! Hit all 4 gates — $' + RACE_PRIZE + ' if you win.');
    return true;
  }

  function startTaxi() {
    if (taxi.active) return false;
    const p = actorPos();
    if (!p || !near(p.x, p.z, TAXI_STAND.x, TAXI_STAND.z, 16)) {
      toast('The taxi stand is on the east side — get close and press Y.');
      return false;
    }
    taxi.active = true;
    taxi.dest = { x: TAXI_DEST.x, z: TAXI_DEST.z };
    taxi.fare = TAXI_FARE;
    taxi.passenger = 'a night-shift nurse';
    toast('Fare picked up — drop your passenger off downtown.');
    return true;
  }

  function collectPackage(pkg) {
    pkg.taken = true;
    try { if (pkg.mesh) pkg.mesh.visible = false; } catch (e) { /* ignore */ }
    if (S.stats) S.stats.packages = (S.stats.packages || 0) + 1;
    S.cash = (S.cash || 0) + PACKAGE_PAY;
    toast('Package found — +$' + PACKAGE_PAY + '.');
    blip();
  }

  ctx.api.startRace = startRace;
  ctx.api.startTaxi = startTaxi;
  ctx.api.racePad = RACE_PAD;
  ctx.api.taxiStand = TAXI_STAND;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (S.mode !== 'playing') return;
    if (e.code === 'KeyT') startRace();
    else if (e.code === 'KeyY') startTaxi();
  });

  ctx.updates.push(() => {
    try {
      const p = actorPos();
      if (!p) return;
      // Street race gates.
      if (race.active) {
        const gate = race.gates[race.gateIndex];
        if (gate && near(p.x, p.z, gate.x, gate.z, 14)) {
          race.gateIndex += 1;
          blip();
          if (race.gateIndex >= race.gates.length) {
            race.active = false;
            if (S.stats) S.stats.racesWon = (S.stats.racesWon || 0) + 1;
            S.cash = (S.cash || 0) + RACE_PRIZE;
            toast('Race won! +$' + RACE_PRIZE + '.');
            try {
              if (S.banterDirector && typeof S.banterDirector.raceWin === 'function') S.banterDirector.raceWin();
            } catch (e) { /* banter is optional */ }
          } else {
            toast('Gate ' + race.gateIndex + ' of ' + race.gates.length + ' — keep going!');
          }
        }
      }
      // Taxi drop-off.
      if (taxi.active && taxi.dest) {
        if (near(p.x, p.z, taxi.dest.x, taxi.dest.z, 14)) {
          taxi.active = false;
          if (S.stats) S.stats.faresDone = (S.stats.faresDone || 0) + 1;
          S.cash = (S.cash || 0) + (taxi.fare || TAXI_FARE);
          toast('Fare delivered — +$' + (taxi.fare || TAXI_FARE) + '.');
          blip();
        }
      }
      // Packages.
      if (Array.isArray(S.packages)) {
        for (const pkg of S.packages) {
          if (!pkg || pkg.taken) continue;
          if (near(p.x, p.z, pkg.x, pkg.z, 8)) collectPackage(pkg);
        }
      }
    } catch (e) { /* side activities must never break the loop */ }
  });
}
