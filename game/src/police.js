// police.js — pursuit director + live roster (round-6 rebuild).
// Owns S.police and S.cops. Watches S.wanted (main.js derives it from
// S.heat every frame), keeps a matching cruiser squad on the street,
// and steers each cruiser with a small utility brain: PURSUIT,
// RAMMING, ROADBLOCK or SEARCH, picked from distance, player speed
// and how stale the last-known position is. The roster HUD reads the
// cruisers straight out of S.cars, so callsigns, distances and tactics
// are always live. When the heat hits zero the squad stands down at
// once — no cruisers, no heli, no last-known trail left behind.
import * as THREE from '../vendor/three.module.min.js';

const ROAD_LINES = [-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];
const MAX_COPS = 6;
const CALLSIGNS = ['PD-01', 'PD-02', 'PD-03', 'PD-04', 'PD-05', 'PD-06'];
const BOUND = 188;
const STALE_AFTER = 8;   // seconds without a sighting -> the brain goes SEARCH
const LKP_RANGE = 110;   // a cruiser this close keeps the last-known fresh
const RAM_RANGE = 12;    // inside this, on a slow player -> RAMMING
const RAM_SPEED = 5;
const BLOCK_MIN = 20;    // fast player, mid range -> ROADBLOCK
const BLOCK_MAX = 50;
const BLOCK_SPEED = 15;

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function nearestRoad(v) {
  let best = ROAD_LINES[0];
  for (const r of ROAD_LINES) if (Math.abs(r - v) < Math.abs(best - v)) best = r;
  return best;
}
function turnToward(heading, want, maxStep) {
  let d = want - heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return heading + clamp(d, -maxStep, maxStep);
}

function wheelMesh() {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12),
    new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.95 }),
  );
  tyre.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.4, metalness: 0.6 }),
  );
  hub.rotation.z = Math.PI / 2;
  g.add(tyre, hub);
  return g;
}

function buildCruiserMesh() {
  const group = new THREE.Group();
  const wheels = [];
  const navy = new THREE.MeshStandardMaterial({ color: 0x16222e, roughness: 0.35, metalness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0e2233, roughness: 0.15, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffe9a0, emissiveIntensity: 0.25 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.3), navy);
  body.position.y = 0.62;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), glass);
  cabin.position.set(0, 1.18, -0.25);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 1.9), white);
  roof.position.set(0, 1.48, -0.25);
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.3), dark);
  barBase.position.set(0, 1.56, -0.25);
  const redMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2222, emissiveIntensity: 2 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x000055, emissive: 0x2266ff, emissiveIntensity: 2 });
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), redMat);
  red.position.set(-0.28, 1.64, -0.25);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), blueMat);
  blue.position.set(0.28, 1.64, -0.25);
  const pushBar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.12), dark);
  pushBar.position.set(0, 0.55, 2.2);
  group.add(body, cabin, roof, barBase, red, blue, pushBar);

  for (const [wx, wz] of [[-0.85, 1.45], [0.85, 1.45], [-0.85, -1.45], [0.85, -1.45]]) {
    const w = wheelMesh();
    w.position.set(wx, 0.36, wz);
    wheels.push(w);
    group.add(w);
  }
  for (const hx of [-0.62, 0.62]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), headMat);
    lamp.position.set(hx, 0.62, 2.17);
    group.add(lamp);
  }
  return { group, wheels, redMat, blueMat };
}

// The utility brain. decide() is pure about the facts it is handed —
// distance to the player, player speed, and last-known staleness — so
// it can be driven straight from a test as well as from the loop.
// It re-evaluates at most every 0.7 s of game time (hysteresis), and
// returns the tactic it settled on.
function makeBrain(S, car) {
  const brain = {
    tactic: 'PURSUIT',
    state: 'PURSUIT',
    decideT: 0,
    decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
      this.decideT -= dt;
      if (this.decideT > 0) return this.tactic;
      this.decideT = 0.7;
      const dx = playerPos.x - car.pos.x;
      const dz = playerPos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const lk = S.lastKnown;
      const stale = !lk || (S.time - lk.seenAt) > STALE_AFTER;
      let next = 'PURSUIT';
      if (stale) next = 'SEARCH';
      else if (dist < RAM_RANGE && playerSpeed < RAM_SPEED) next = 'RAMMING';
      else if (playerSpeed > BLOCK_SPEED && dist >= BLOCK_MIN && dist <= BLOCK_MAX) next = 'ROADBLOCK';
      this.tactic = next;
      this.state = next;
      return next;
    },
  };
  return brain;
}

function buildCruiser(S, callsign, x, z, heading) {
  const built = buildCruiserMesh();
  const car = {
    kind: 'sedan',
    color: '#16222e',
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    gear: 'N',
    health: 100,
    maxHealth: 100,
    tune: { engine: 1, armor: 0, nos: 0 },
    aiPolice: true,
    callsign,
    mesh: built.group,
    _wheels: built.wheels,
    _redMat: built.redMat,
    _blueMat: built.blueMat,
    _target: null,
    _wanderT: 0,
    _ramCd: 0,
    disabled: false,
    perf() { return 26 + this.tune.engine * 2; },
    brain: null,
  };
  car.brain = makeBrain(S, car);
  built.group.position.set(x, 0, z);
  return car;
}

export function init(S) {
  if (!Array.isArray(S.cars)) S.cars = [];
  if (!Array.isArray(S.cops)) S.cops = [];
  let lkpT = 0;

  function desiredCount() {
    const w = S.wanted || 0;
    return w <= 0 ? 0 : Math.min(w + 1, MAX_COPS);
  }

  function spawnCop() {
    const p = S.player && S.player.pos ? S.player.pos : { x: 0, z: 0 };
    const used = new Set(S.cops.map((c) => c.callsign));
    const sign = CALLSIGNS.find((c) => !used.has(c)) || ('PD-' + String(S.cops.length + 1).padStart(2, '0'));
    const ang = rand(0, Math.PI * 2);
    const dist = rand(42, 58);
    let x = clamp(p.x + Math.cos(ang) * dist, -BOUND, BOUND);
    const z = clamp(p.z + Math.sin(ang) * dist, -BOUND, BOUND);
    x = nearestRoad(x); // arrive on a road, not inside a block
    const heading = Math.atan2(p.x - x, p.z - z);
    const cop = buildCruiser(S, sign, x, z, heading);
    if (S.scene) S.scene.add(cop.mesh);
    S.cars.push(cop);
    S.cops.push(cop);
    return cop;
  }

  function removeCop(cop) {
    if (cop.mesh && cop.mesh.parent) cop.mesh.parent.remove(cop.mesh);
    const a = S.cars.indexOf(cop);
    if (a >= 0) S.cars.splice(a, 1);
    const b = S.cops.indexOf(cop);
    if (b >= 0) S.cops.splice(b, 1);
  }

  // The dispatch always has a fix on the player while the player is
  // wanted: with no cruiser on the street yet the fix is the player's
  // own position, and once cruisers are out a sighting refreshes it.
  // Only when every cruiser loses the trail does the fix go stale and
  // the brain fall back to SEARCH.
  function refreshLastKnown(dt) {
    lkpT -= dt;
    if (lkpT > 0) return;
    // Do not spend the throttle slot on a wasted attempt: wanted is
    // derived after this tick runs, so the first frame after a crime
    // still reads the old level — the fix must land on the next frame.
    if ((S.wanted || 0) <= 0) return;
    const p = S.player && S.player.pos;
    if (!p) return;
    lkpT = 0.4;
    if (S.cops.length === 0) {
      S.lastKnown = { x: p.x, z: p.z, seenAt: S.time || 0 };
      return;
    }
    for (const cop of S.cops) {
      if (Math.hypot(cop.pos.x - p.x, cop.pos.z - p.z) < LKP_RANGE) {
        S.lastKnown = { x: p.x, z: p.z, seenAt: S.time || 0 };
        return;
      }
    }
  }

  function driveCop(cop, dt) {
    const p = S.player && S.player.pos ? S.player.pos : { x: 0, z: 0 };
    const pv = (S.player && S.player.vel) || { x: 0, z: 0 };
    const ps = (S.player && typeof S.player.speed === 'number') ? S.player.speed : 0;
    const ph = (S.player && typeof S.player.heading === 'number') ? S.player.heading : 0;
    const tactic = cop.brain.decide(dt, p, pv, ph, ps);

    let tx = p.x, tz = p.z, cruise = 30;
    if (tactic === 'PURSUIT') {
      tx = p.x + pv.x * 0.6; // cut the corner the player is running to
      tz = p.z + pv.z * 0.6;
      cruise = 30;
    } else if (tactic === 'RAMMING') {
      tx = p.x; tz = p.z; cruise = 30;
    } else if (tactic === 'ROADBLOCK') {
      const fx = Math.sin(ph), fz = Math.cos(ph);
      const ahead = ps * 1.2 + 12; // plant the cruiser where the player is headed
      tx = p.x + fx * ahead;
      tz = p.z + fz * ahead;
      cruise = 30;
    } else { // SEARCH — sweep the last-known spot, then fan out around it
      const lk = S.lastKnown;
      if (lk) { tx = lk.x; tz = lk.z; }
      cruise = 13;
      cop._wanderT -= dt;
      const d = Math.hypot(tx - cop.pos.x, tz - cop.pos.z);
      if (d < 8) {
        if (cop._wanderT <= 0) {
          cop._wanderT = 4;
          cop._target = {
            x: (lk ? lk.x : p.x) + rand(-25, 25),
            z: (lk ? lk.z : p.z) + rand(-25, 25),
          };
        }
        if (cop._target) { tx = cop._target.x; tz = cop._target.z; }
      } else {
        cop._target = null;
      }
    }

    const dx = tx - cop.pos.x, dz = tz - cop.pos.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    cop.heading = turnToward(cop.heading, want, 3.4 * dt);

    if (tactic === 'ROADBLOCK' && dist < 7) {
      // In place: stop and sit broadside across the player's path.
      cop.speed = Math.max(0, cop.speed - 20 * dt);
      if (cop.speed < 0.5) cop.heading = turnToward(cop.heading, ph + Math.PI / 2, 2 * dt);
    } else if (!cop.disabled) {
      cop.speed = Math.min(cruise, cop.speed + 12 * dt);
    } else {
      cop.speed = Math.max(0, cop.speed - 10 * dt);
    }

    const f = { x: Math.sin(cop.heading), z: Math.cos(cop.heading) };
    cop.pos.x = clamp(cop.pos.x + f.x * cop.speed * dt, -BOUND, BOUND);
    cop.pos.z = clamp(cop.pos.z + f.z * cop.speed * dt, -BOUND, BOUND);

    // Ram: shoulder the player's ride and shake the camera. On foot the
    // shove is a nudge only — the PD never ends a run by touching you.
    cop._ramCd -= dt;
    if (tactic === 'RAMMING' && cop._ramCd <= 0) {
      const pd = Math.hypot(p.x - cop.pos.x, p.z - cop.pos.z);
      if (pd < 4) {
        cop._ramCd = 1.5;
        const nx = (p.x - cop.pos.x) / (pd || 1), nz = (p.z - cop.pos.z) / (pd || 1);
        if (S.car && S.car.pos) {
          S.car.pos.x = clamp(S.car.pos.x + nx * 1.4, -BOUND, BOUND);
          S.car.pos.z = clamp(S.car.pos.z + nz * 1.4, -BOUND, BOUND);
          S.car.speed = (S.car.speed || 0) * 0.55;
        } else if (S.player && S.player.pos) {
          S.player.pos.x = clamp(S.player.pos.x + nx * 0.8, -BOUND, BOUND);
          S.player.pos.z = clamp(S.player.pos.z + nz * 0.8, -BOUND, BOUND);
        }
        if (S.juice) S.juice.trauma = Math.min(1, (S.juice.trauma || 0) + 0.3);
      }
    }

    if (cop.mesh) {
      cop.mesh.position.set(cop.pos.x, 0, cop.pos.z);
      cop.mesh.rotation.y = cop.heading;
      if (cop._wheels) {
        const spin = cop.speed * dt / 0.36;
        for (const w of cop._wheels) w.rotation.x += spin;
      }
      const flash = Math.floor((S.time || 0) * 3) % 2 === 0;
      if (cop._redMat) cop._redMat.emissiveIntensity = flash ? 2.5 : 0.2;
      if (cop._blueMat) cop._blueMat.emissiveIntensity = flash ? 0.2 : 2.5;
    }
  }

  function tick(dt) {
    const want = desiredCount();
    while (S.cops.length < want) spawnCop();
    while (S.cops.length > want) {
      // Stand down the farthest cruiser first.
      const p = S.player && S.player.pos ? S.player.pos : { x: 0, z: 0 };
      let far = S.cops[0], farD = -1;
      for (const c of S.cops) {
        const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z);
        if (d > farD) { farD = d; far = c; }
      }
      removeCop(far);
    }
    refreshLastKnown(dt);
    for (const cop of [...S.cops]) driveCop(cop, dt);
  }

  const police = {
    tick,
    update: tick,
    get cops() { return S.cops; },
    // Rows for the roster HUD: callsign, live distance, live tactic.
    roster() {
      const p = S.player && S.player.pos ? S.player.pos : { x: 0, z: 0 };
      return S.cops.map((c) => ({
        callsign: c.callsign,
        distance: Math.round(Math.hypot(c.pos.x - p.x, c.pos.z - p.z)),
        tactic: (c.brain && c.brain.tactic) || 'PURSUIT',
      }));
    },
  };
  S.police = police;
  return police;
}
