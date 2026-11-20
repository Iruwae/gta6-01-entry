// vehicles.js — traffic, stealable rides and driving (round-6 rebuild).
// Owns S.cars: the parked rides you can steal, the traffic cruising the
// road grid, and the car the player is driving (S.car). E gets in and
// out, WASD drives with a speed + gear model the speedo reads. Police
// cruisers also live in S.cars, but police.js owns them — this module
// only keeps their meshes in step and cleans up meshes when a car
// leaves the array (sold, stored, despawned).
import * as THREE from '../vendor/three.module.min.js';

const ROAD_LINES = [-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];
const KEEP_CLEAR = [
  [-90, -66], [-72, -60], [120, -120], [110, 138], [-60, -60],
  [68, 60], [-88, -64], [-102, -64], [-90, -58], [0, 165],
];
const BOUND = 188;
const ENTER_RADIUS = 4.5;
const TRAFFIC_TARGET = 9;

const FALLBACK_SPECS = {
  sedan: { kind: 'sedan', maxHealth: 100, perf: 26, topSpeed: 26, accel: 9 },
  sport: { kind: 'sport', maxHealth: 100, perf: 32, topSpeed: 34, accel: 13 },
  bike: { kind: 'bike', maxHealth: 60, perf: 38, topSpeed: 38, accel: 16 },
  pickup: { kind: 'pickup', maxHealth: 130, perf: 28, topSpeed: 28, accel: 10 },
};

const PAINT = ['#c0392b', '#2e6f73', '#e8a33d', '#7a2a8a', '#c8ccd4', '#4a7a3f', '#8a6fb8', '#e8542f'];

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function fwd(heading) { return { x: Math.sin(heading), z: Math.cos(heading) }; }
function nearestRoad(v) {
  let best = ROAD_LINES[0];
  for (const r of ROAD_LINES) if (Math.abs(r - v) < Math.abs(best - v)) best = r;
  return best;
}
function nearClear(x, z, r) {
  for (const [cx, cz] of KEEP_CLEAR) {
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}
function angleTo(from, tx, tz) { return Math.atan2(tx - from.x, tz - from.z); }
function turnToward(heading, want, maxStep) {
  let d = want - heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return heading + clamp(d, -maxStep, maxStep);
}
function toast(msg) {
  const el = document.getElementById('toast');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

// --- meshes ---------------------------------------------------------------
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

function buildRideMesh(kind, color) {
  const group = new THREE.Group();
  const wheels = [];
  const paint = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.35, metalness: 0.55 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0e2233, roughness: 0.15, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffe9a0, emissiveIntensity: 0.25 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xcc2222, emissiveIntensity: 0.4 });

  if (kind === 'bike') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.7), dark);
    frame.position.y = 0.72;
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.62), paint);
    tank.position.set(0, 0.92, 0.18);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.55), dark);
    seat.position.set(0, 0.92, -0.48);
    const bars = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.06), dark);
    bars.position.set(0, 1.08, 0.72);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.1), headMat);
    lamp.position.set(0, 0.85, 0.95);
    const wF = wheelMesh(); wF.position.set(0, 0.36, 0.88);
    const wR = wheelMesh(); wR.position.set(0, 0.36, -0.88);
    wheels.push(wF, wR);
    group.add(frame, tank, seat, bars, lamp, wF, wR);
    return { group, wheels, headMat };
  }

  const longBody = kind === 'pickup';
  const bodyLen = longBody ? 4.6 : 4.3;
  const bodyH = kind === 'sport' ? 0.5 : 0.62;
  const bodyY = kind === 'sport' ? 0.55 : 0.62;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, bodyH, bodyLen), paint);
  body.position.y = bodyY;
  group.add(body);

  if (kind === 'pickup') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.6), paint);
    cab.position.set(0, 1.05, -1.1);
    const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 0.1), glass);
    cabGlass.position.set(0, 1.2, -0.28);
    const bedWall = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.35, 0.12), paint);
    bedWall.position.set(0, 1.0, 2.2);
    group.add(cab, cabGlass, bedWall);
  } else {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), glass);
    cabin.position.set(0, bodyY + 0.55, -0.25);
    group.add(cabin);
    if (kind === 'sport') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.42), dark);
      wing.position.set(0, 1.08, -2.0);
      group.add(wing);
    }
  }

  const wheelZ = bodyLen / 2 - 0.7;
  for (const [wx, wz] of [[-0.85, wheelZ], [0.85, wheelZ], [-0.85, -wheelZ], [0.85, -wheelZ]]) {
    const w = wheelMesh();
    w.position.set(wx, 0.36, wz);
    wheels.push(w);
    group.add(w);
  }
  for (const hx of [-0.62, 0.62]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), headMat);
    lamp.position.set(hx, bodyY, bodyLen / 2 + 0.02);
    group.add(lamp);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.08), tailMat);
    tail.position.set(hx, bodyY + 0.06, -bodyLen / 2 - 0.02);
    group.add(tail);
  }
  return { group, wheels, headMat };
}

// --- car factory ------------------------------------------------------------
function buildRide(specs, kind, tune, color, x, z) {
  const spec = specs[kind] || specs.sedan;
  const paintColor = color || pick(PAINT);
  const t = {
    engine: tune && typeof tune.engine === 'number' ? tune.engine : 0,
    armor: tune && typeof tune.armor === 'number' ? tune.armor : 0,
    nos: tune && typeof tune.nos !== 'undefined' ? tune.nos : 0,
  };
  const built = buildRideMesh(kind, paintColor);
  const car = {
    kind,
    color: paintColor,
    pos: new THREE.Vector3(x, 0, z),
    heading: 0,
    speed: 0,
    gear: 'N',
    health: spec.maxHealth,
    maxHealth: spec.maxHealth,
    tune: t,
    aiPolice: false,
    brain: null,
    mesh: built.group,
    _wheels: built.wheels,
    _headMat: built.headMat,
    _traffic: false,
    _target: null,
    _axis: 'x',
    _cruise: 0,
    disabled: false,
    perf() { return spec.perf + this.tune.engine * 2 + (this.tune.nos ? 4 : 0); },
    topSpeed() { return spec.topSpeed + this.tune.engine * 1.5 + (this.tune.nos ? 6 : 0); },
    accelRate() { return spec.accel + this.tune.engine * 0.8; },
  };
  built.group.position.set(x, 0, z);
  return car;
}

export function init(S) {
  const specs = (S.config && S.config.vehicles) || FALLBACK_SPECS;
  if (!Array.isArray(S.cars)) S.cars = [];
  const known = new Map(); // car -> mesh, so a sold/stored car leaves no ghost

  function register(car) {
    if (car.mesh && S.scene) {
      S.scene.add(car.mesh);
      known.set(car, car.mesh);
    }
    if (!S.cars.includes(car)) S.cars.push(car);
    return car;
  }

  function spawnRide(kind, tune, color, x, z) {
    return register(buildRide(specs, kind, tune, color, x, z));
  }

  // --- parked stealable rides (garage sport + bike first, they are the
  // ones the smoke test and the screenshots climb into) ---
  const sport = spawnRide('sport', { engine: 0, armor: 0, nos: 0 }, '#e8542f', -102, -64);
  sport.heading = 0.3;
  const bike = spawnRide('bike', { engine: 0, armor: 0, nos: 0 }, '#2f7fe8', -88, -64);
  bike.heading = -0.4;
  spawnRide('sedan', null, '#c8ccd4', 30, -120).heading = 1.2;
  spawnRide('pickup', null, '#4a7a3f', 120, 30).heading = -0.8;
  spawnRide('sedan', null, '#8a6fb8', -150, 60).heading = 2.4;
  spawnRide('pickup', null, '#c0392b', -60, 150).heading = 0.9;

  // --- roaming traffic on the road grid ---
  function pickWaypoint(from) {
    for (let i = 0; i < 10; i++) {
      const x = pick(ROAD_LINES);
      const z = pick(ROAD_LINES);
      if (Math.hypot(x - from.x, z - from.z) < 50) continue;
      if (nearClear(x, z, 12)) continue;
      return { x, z };
    }
    return { x: 0, z: 0 };
  }

  function randomRoadPoint(minPlayerDist) {
    for (let i = 0; i < 12; i++) {
      const x = nearestRoad(rand(-180, 180));
      const z = rand(-180, 180);
      if (nearClear(x, z, 12)) continue;
      const p = S.player && S.player.pos;
      if (p && Math.hypot(x - p.x, z - p.z) < (minPlayerDist || 30)) continue;
      return { x, z };
    }
    return { x: 0, z: 0 };
  }

  function spawnTraffic() {
    const kinds = ['sedan', 'sedan', 'pickup', 'sedan', 'bike', 'sedan', 'pickup', 'sedan', 'sedan'];
    const spot = randomRoadPoint(30);
    const car = spawnRide(pick(kinds), null, null, spot.x, spot.z);
    car._traffic = true;
    car._cruise = rand(8, 13);
    car._target = pickWaypoint(car.pos);
    car._axis = Math.abs(car._target.x - car.pos.x) >= Math.abs(car._target.z - car.pos.z) ? 'x' : 'z';
    car.heading = angleTo(car.pos, car._target.x, car._target.z);
    return car;
  }

  for (let i = 0; i < TRAFFIC_TARGET; i++) spawnTraffic();

  // --- enter / exit (E) ---
  function nearestRide(maxDist) {
    const p = S.player && S.player.pos;
    if (!p) return null;
    let best = null, bestD = maxDist;
    for (const car of S.cars) {
      if (car.aiPolice) continue; // cruisers stay with the PD
      const d = Math.hypot(car.pos.x - p.x, car.pos.z - p.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function enterRide(car) {
    S.car = car;
    car._traffic = false; // a stolen ride stops its route and stays put
    car._target = null;
    if (S.player && S.player.pos) {
      S.player.pos.set(car.pos.x, 0, car.pos.z);
      S.player.heading = car.heading;
    }
    toast('You took the ' + (car.kind || 'car') + '.');
  }

  function exitRide() {
    const car = S.car;
    if (!car) return;
    S.car = null;
    const f = fwd(car.heading);
    const rx = f.z, rz = -f.x; // right-hand side of the car
    if (S.player && S.player.pos) {
      S.player.pos.set(car.pos.x + rx * 2.4, 0, car.pos.z + rz * 2.4);
      S.player.heading = car.heading;
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyE' || e.repeat) return;
    if (S.mode !== 'playing' || S.cutscene) return;
    if (S.car) { exitRide(); return; }
    const car = nearestRide(ENTER_RADIUS);
    if (car) enterRide(car);
  });

  // --- driving ---
  function drivePlayerCar(dt) {
    const car = S.car;
    if (!car) return;
    const keys = S.keys || {};
    const spec = specs[car.kind] || specs.sedan;
    const top = typeof car.topSpeed === 'function' ? car.topSpeed() : spec.topSpeed;
    const acc = typeof car.accelRate === 'function' ? car.accelRate() : spec.accel;
    const nos = !!car.tune.nos && (keys['ShiftLeft'] || keys['ShiftRight']);
    const topNow = nos ? top * 1.35 : top;
    const accNow = nos ? acc * 1.8 : acc;

    const fwdIn = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
    const steerIn = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);

    if (!car.disabled) {
      if (fwdIn > 0) car.speed = Math.min(topNow, car.speed + accNow * dt);
      else if (fwdIn < 0) {
        if (car.speed > 0.5) car.speed = Math.max(0, car.speed - 24 * dt);
        else car.speed = Math.max(-9, car.speed - accNow * 0.7 * dt);
      } else {
        const drag = 7 * dt;
        if (Math.abs(car.speed) <= drag) car.speed = 0;
        else car.speed -= Math.sign(car.speed) * drag;
      }
    } else {
      car.speed *= Math.max(0, 1 - 2 * dt);
    }

    const spd = car.speed;
    if (Math.abs(spd) > 0.05) {
      const grip = clamp(Math.abs(spd) / 6, 0, 1);
      car.heading += steerIn * 2.4 * dt * grip * (spd >= 0 ? 1 : -1);
    }
    const f = fwd(car.heading);
    car.pos.x = clamp(car.pos.x + f.x * spd * dt, -BOUND, BOUND);
    car.pos.z = clamp(car.pos.z + f.z * spd * dt, -BOUND, BOUND);

    const a = Math.abs(spd);
    car.gear = spd < -0.5 ? 'R' : a < 0.6 ? 'N' : Math.min(5, 1 + Math.floor(a / (topNow / 5)));

    if (S.player && S.player.pos) {
      S.player.pos.set(car.pos.x, 0, car.pos.z);
      S.player.heading = car.heading;
    }
  }

  function driveTraffic(dt) {
    for (const car of S.cars) {
      if (!car._traffic || car.aiPolice) continue;
      if (car.disabled) { car.speed *= Math.max(0, 1 - 2 * dt); continue; }
      if (!car._target) car._target = pickWaypoint(car.pos);
      // Axis-aligned legs: travel along one road line at a time so the
      // cars never cut diagonally through a block.
      const via = car._axis === 'x'
        ? { x: car._target.x, z: car.pos.z }
        : { x: car.pos.x, z: car._target.z };
      const dx = via.x - car.pos.x, dz = via.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3) {
        const done = Math.abs(car._target.x - car.pos.x) < 3 && Math.abs(car._target.z - car.pos.z) < 3;
        if (done) {
          car._target = pickWaypoint(car.pos);
          car._axis = Math.abs(car._target.x - car.pos.x) >= Math.abs(car._target.z - car.pos.z) ? 'x' : 'z';
        } else {
          car._axis = car._axis === 'x' ? 'z' : 'x';
        }
      }
      const want = angleTo(car.pos, via.x, via.z);
      car.heading = turnToward(car.heading, want, 2.6 * dt);
      car.speed = Math.min(car._cruise || 10, car.speed + 6 * dt);
      const f = fwd(car.heading);
      car.pos.x = clamp(car.pos.x + f.x * car.speed * dt, -BOUND, BOUND);
      car.pos.z = clamp(car.pos.z + f.z * car.speed * dt, -BOUND, BOUND);
    }
  }

  function syncMeshes(dt) {
    const night = S.dayNight ? (S.dayNight.night || 0) : 0;
    for (const car of S.cars) {
      if (!car.mesh || !car.pos) continue;
      car.mesh.position.set(car.pos.x, 0, car.pos.z);
      car.mesh.rotation.y = car.heading;
      if (car._wheels) {
        const spin = (car.speed || 0) * dt / 0.36;
        for (const w of car._wheels) w.rotation.x += spin;
      }
      if (car._headMat) car._headMat.emissiveIntensity = night > 0.4 ? 2.2 : 0.25;
    }
    for (const [car, mesh] of [...known]) {
      if (!S.cars.includes(car)) {
        if (mesh.parent) mesh.parent.remove(mesh);
        known.delete(car);
      }
    }
  }

  let topUpT = 0;
  function update(dt) {
    if (S.car && !S.cars.includes(S.car)) {
      const lost = S.car;
      S.car = null;
      if (S.player && S.player.pos) S.player.pos.set(lost.pos.x, 0, lost.pos.z);
    }
    drivePlayerCar(dt);
    driveTraffic(dt);
    topUpT += dt;
    if (topUpT > 20) {
      topUpT = 0;
      if (S.cars.filter((c) => c._traffic).length < TRAFFIC_TARGET) spawnTraffic();
    }
    syncMeshes(dt);
  }

  S.spawnCar = (kind, tune, color, x, z) => spawnRide(kind, tune, color, x ?? -90, z ?? -66);
  S.vehicles = { spawnCar: S.spawnCar, specs };
  if (Array.isArray(S._tick)) S._tick.push(update);
  return S.vehicles;
}
