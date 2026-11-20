// police.js — the wanted system on wheels. Turns S.heat into a star
// level, spawns patrol cars up to that level, despawns them when the
// player cools off, and drives each cop with a small utility brain:
// PURSUIT / RAMMING / ROADBLOCK / SEARCH, picked from live facts.
import * as THREE from '../vendor/three.module.min.js';

const SPAWN_RADIUS = 60;
const TACTIC_SPEEDS = { PURSUIT: 26, RAMMING: 32, ROADBLOCK: 28, SEARCH: 14 };

const _now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function v3(x, y, z) {
  if (THREE && THREE.Vector3) return new THREE.Vector3(x || 0, y || 0, z || 0);
  const v = {
    x: x || 0, y: y || 0, z: z || 0,
    set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; },
    copy(o) { this.x = o.x; this.y = o.y; this.z = o.z; return this; },
    clone() { return v3(this.x, this.y, this.z); },
  };
  return v;
}

function hookIntoLoop(S, fn) {
  const wrapped = (dt) => { S.__b1External = _now(); fn(dt); };
  S.__b1Fns = S.__b1Fns || [];
  S.__b1Fns.push(fn);
  if (typeof S.addUpdater === 'function') { try { S.addUpdater(wrapped); } catch (e) { /* main owns the loop */ } }
  else if (Array.isArray(S.updaters)) S.updaters.push(wrapped);
  else if (Array.isArray(S.systems)) S.systems.push(wrapped);
  else if (Array.isArray(S.tickFns)) S.tickFns.push(wrapped);
  else if (Array.isArray(S.updateFns)) S.updateFns.push(wrapped);
  else if (Array.isArray(S.onUpdate)) S.onUpdate.push(wrapped);
  else S.updaters = [wrapped];
  if (!S.__b1DriverOn && typeof requestAnimationFrame !== 'undefined') {
    S.__b1DriverOn = true;
    let last = _now();
    const step = () => {
      const now = _now();
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
      last = now;
      if (!S.__b1External || now - S.__b1External > 3000) {
        for (const f of (S.__b1Fns || [])) { try { f(dt); } catch (e) { /* keep the loop alive */ } }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  return wrapped;
}

export function wantedFor(heat) {
  const h = heat || 0;
  if (h >= 80) return 4;
  if (h >= 60) return 3;
  if (h >= 40) return 2;
  if (h >= 20) return 1;
  return 0;
}

function angleToward(from, to, maxStep) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (d > maxStep) return from + maxStep;
  if (d < -maxStep) return from - maxStep;
  return to;
}

function buildPoliceMesh(S, car) {
  if (!THREE || !S.scene) return;
  try {
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.35, metalness: 0.4 });
    const black = new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.4, metalness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0e1a24, roughness: 0.15, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.2), white);
    body.position.y = 0.55;
    const doors = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.4, 2.0), black);
    doors.position.y = 0.55;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 2.0), glass);
    cabin.position.set(0, 1.05, -0.15);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 }));
    bar.position.set(0, 1.4, -0.15);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
    red.position.set(-0.28, 1.48, -0.15);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x0000aa }));
    blue.position.set(0.28, 1.48, -0.15);
    const tyre = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]]) {
      const w = new THREE.Mesh(wheelGeo, tyre);
      w.position.set(wx, 0.36, wz);
      g.add(w);
    }
    g.add(body, doors, cabin, bar, red, blue);
    g.position.copy(car.pos);
    g.rotation.y = car.heading;
    S.scene.add(g);
    car.mesh = g;
    car._lightRed = red;
    car._lightBlue = blue;
  } catch (e) { /* visuals are optional; logic must not die */ }
}

export function init(S) {
  if (S.__b1PoliceInit) return S.policeUpdate || null;
  S.__b1PoliceInit = true;
  if (!Array.isArray(S.cars)) S.cars = [];
  if (!Array.isArray(S.cops)) S.cops = [];
  if (typeof S.wanted !== 'number') S.wanted = 0;
  if (typeof S.__pdNext !== 'number') S.__pdNext = 1;

  function makeBrain(car) {
    const brain = {
      tactic: 'PURSUIT',
      state: 'PURSUIT',
      decideT: 0,
      target: { x: 0, z: 0 },
      targetSpeed: TACTIC_SPEEDS.PURSUIT,
      // Utility pick, in priority order: a stale last-known position
      // means the trail went cold; a slow player up close gets rammed;
      // a fast player at mid range gets cut off ahead; otherwise chase.
      decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
        const px = playerPos.x;
        const pz = playerPos.z;
        const dx = px - car.pos.x;
        const dz = pz - car.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const lkp = S.lastKnown;
        const stale = lkp && (S.time || 0) - lkp.seenAt > 8;
        let pick = 'PURSUIT';
        if (stale) pick = 'SEARCH';
        else if (dist < 10 && playerSpeed < 5) pick = 'RAMMING';
        else if (playerSpeed > 15 && dist >= 20 && dist <= 50) pick = 'ROADBLOCK';
        else pick = 'PURSUIT';
        brain.tactic = pick;
        brain.state = pick;
        if (pick === 'ROADBLOCK') {
          const vx = (playerVel && playerVel.x) || 0;
          const vz = (playerVel && playerVel.z) || 0;
          brain.target = { x: px + vx * 1.5, z: pz + vz * 1.5 };
        } else if (pick === 'SEARCH' && lkp) {
          brain.target = { x: lkp.x, z: lkp.z };
        } else {
          brain.target = { x: px, z: pz };
        }
        brain.targetSpeed = TACTIC_SPEEDS[pick];
      },
    };
    return brain;
  }

  function spawnCop() {
    const p = S.player;
    if (!p) return;
    const angle = Math.random() * Math.PI * 2 + S.cops.length * 1.9; // fan fresh units out
    const x = Math.max(-175, Math.min(175, p.pos.x + Math.cos(angle) * SPAWN_RADIUS));
    const z = Math.max(-175, Math.min(175, p.pos.z + Math.sin(angle) * SPAWN_RADIUS));
    const num = S.__pdNext;
    S.__pdNext = num >= 99 ? 1 : num + 1;
    const car = {
      kind: 'sedan',
      pos: v3(x, 0, z),
      heading: Math.atan2(p.pos.x - x, p.pos.z - z),
      speed: 0,
      health: 100,
      maxHealth: 100,
      tune: { engine: 0, armor: 0, paint: 0, nos: false },
      color: 0xf2f2ee,
      mesh: null,
      aiPolice: true,
      brain: null,
      callsign: 'PD-' + String(num).padStart(2, '0'),
      traffic: null,
      perf() { return 30 + this.tune.engine * 3 + (this.tune.nos ? 5 : 0); },
    };
    car.brain = makeBrain(car);
    car.brain.target = { x: p.pos.x, z: p.pos.z };
    buildPoliceMesh(S, car);
    S.cars.push(car);
    S.cops.push(car);
  }

  function despawnCop(car) {
    if (car.mesh && S.scene) {
      try { S.scene.remove(car.mesh); } catch (e) { /* already gone */ }
    }
    car.mesh = null;
    const ci = S.cars.indexOf(car);
    if (ci >= 0) S.cars.splice(ci, 1);
    const pi = S.cops.indexOf(car);
    if (pi >= 0) S.cops.splice(pi, 1);
  }

  function update(rawDt) {
    const dt = Math.min(Math.max(rawDt || 0.016, 0), 0.05);
    const p = S.player;

    // Wanted always follows heat, whoever writes the heat.
    S.wanted = wantedFor(S.heat || 0);
    const live = (S.mode === undefined || S.mode === 'playing') && !S.cutscene && !!p;
    if (!live) return;

    // The cops always know where the player was last seen — until the
    // trail goes cold and the brain flips to SEARCH.
    if (S.wanted > 0) {
      S.lastKnown = { x: p.pos.x, z: p.pos.z, seenAt: S.time || 0 };
    }

    if (S.wanted === 0) {
      // Cooled off: every patrol car leaves, from both lists at once.
      for (const cop of [...S.cops]) despawnCop(cop);
      for (const car of [...S.cars]) if (car.aiPolice) despawnCop(car);
      return;
    }

    // Reconcile: S.cops must hold exactly the aiPolice cars in S.cars.
    for (const car of [...S.cars]) {
      if (car.aiPolice && !S.cops.includes(car)) S.cops.push(car);
    }
    for (const cop of [...S.cops]) {
      if (!S.cars.includes(cop)) S.cops.splice(S.cops.indexOf(cop), 1);
    }

    while (S.cops.length < S.wanted) spawnCop();

    const pvx = (p.vel && p.vel.x) || 0;
    const pvz = (p.vel && p.vel.z) || 0;
    const pSpeed = (typeof p.speed === 'number') ? p.speed
      : (S.car ? Math.abs(S.car.speed) : 0);

    for (const cop of S.cops) {
      if (!cop.mesh && S.scene) buildPoliceMesh(S, cop);
      // Re-decide roughly twice a second of game time.
      cop.brain.decideT -= dt;
      if (cop.brain.decideT <= 0) {
        cop.brain.decide(dt, p.pos, { x: pvx, z: pvz }, p.heading, pSpeed);
        cop.brain.decideT = 0.5;
      }
      // Drive toward the brain's target point.
      const tx = cop.brain.target.x - cop.pos.x;
      const tz = cop.brain.target.z - cop.pos.z;
      const dist = Math.sqrt(tx * tx + tz * tz);
      const wantHeading = Math.atan2(tx, tz);
      cop.heading = angleToward(cop.heading, wantHeading, 2.4 * dt);
      const wantSpeed = dist < 4 ? Math.min(cop.brain.targetSpeed, 6) : cop.brain.targetSpeed;
      const accel = 13 * dt;
      if (cop.speed < wantSpeed) cop.speed = Math.min(wantSpeed, cop.speed + accel);
      else if (cop.speed > wantSpeed) cop.speed = Math.max(wantSpeed, cop.speed - accel * 1.4);
      cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
      cop.pos.x = Math.max(-185, Math.min(185, cop.pos.x));
      cop.pos.z = Math.max(-185, Math.min(185, cop.pos.z));
      if (cop.mesh) {
        cop.mesh.position.copy(cop.pos);
        cop.mesh.rotation.y = cop.heading;
        // Alternating light bar, four flashes a second.
        const phase = Math.floor((S.time || 0) * 4) % 2 === 0;
        if (cop._lightRed) cop._lightRed.visible = phase;
        if (cop._lightBlue) cop._lightBlue.visible = !phase;
      }
    }
  }

  const wrapped = hookIntoLoop(S, update);
  S.policeUpdate = wrapped;
  S.wantedFor = wantedFor;
  return wrapped;
}
