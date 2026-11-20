// vehicles.js — every car in Solmar Bay: parked rides, street traffic
// and the player's own driving. Owns S.cars, the KeyE enter/exit flow
// and the arcade driving model (accelerate, steer, stop at walls).
import * as THREE from '../vendor/three.module.min.js';

const KINDS = {
  sedan: { base: 30, hp: 100 },
  sport: { base: 45, hp: 100 },
  bike: { base: 38, hp: 60 },
  pickup: { base: 28, hp: 130 },
};

const PAINTS = {
  sedan: [0x8a97a8, 0x5b6b7a, 0xb8b0a0, 0x3f4a3a],
  sport: [0xc22e2e, 0xe8a33d, 0x27408b, 0x222222],
  bike: [0x1d1d22, 0xc22e2e, 0x2e6f73],
  pickup: [0x7a5a34, 0x4a5a3a, 0x8a97a8],
};

const PARKED = [
  { kind: 'sport', x: -102, z: -64, heading: 0.4 },
  { kind: 'bike', x: -88, z: -64, heading: -0.3 },
  { kind: 'pickup', x: 40, z: -40, heading: 2.2 },
];

// Slow sedans cruising the grid so the streets never read empty.
const TRAFFIC = [
  { x: -40, z: -20, heading: 0, axis: 'z', dir: 1, cruise: 8 },
  { x: 20, z: 40, heading: Math.PI, axis: 'z', dir: -1, cruise: 7 },
  { x: -120, z: 60, heading: Math.PI / 2, axis: 'x', dir: 1, cruise: 9 },
  { x: 80, z: -100, heading: -Math.PI / 2, axis: 'x', dir: -1, cruise: 8 },
  { x: 0, z: -140, heading: 0, axis: 'z', dir: 1, cruise: 7 },
  { x: -60, z: 120, heading: Math.PI / 2, axis: 'x', dir: 1, cruise: 8 },
];

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

function pickPaint(kind, seed) {
  const list = PAINTS[kind] || PAINTS.sedan;
  return list[Math.abs(seed) % list.length];
}

function makeCar(kind, x, z, heading, opts) {
  const spec = KINDS[kind] || KINDS.sedan;
  const o = opts || {};
  const car = {
    kind,
    pos: v3(x, 0, z),
    heading: heading || 0,
    speed: 0,
    health: spec.hp,
    maxHealth: spec.hp,
    tune: { engine: 0, armor: 0, paint: 0, nos: false },
    color: o.color !== undefined ? o.color : pickPaint(kind, Math.floor(Math.random() * 997)),
    mesh: null,
    aiPolice: false,
    brain: null,
    callsign: null,
    traffic: o.traffic || null,
    perf() {
      const base = (KINDS[this.kind] || KINDS.sedan).base;
      return base + this.tune.engine * 3 + (this.tune.nos ? 5 : 0);
    },
  };
  return car;
}

function buildMesh(S, car) {
  if (!THREE || !S.scene) return;
  try {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: car.color, roughness: 0.35, metalness: 0.55 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0e1a24, roughness: 0.15, metalness: 0.8 });
    const tyre = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
    if (car.kind === 'bike') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 1.9), paint);
      frame.position.y = 0.65;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }));
      seat.position.set(0, 0.95, -0.35);
      const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 14);
      wheelGeo.rotateZ(Math.PI / 2);
      const w1 = new THREE.Mesh(wheelGeo, tyre); w1.position.set(0, 0.34, 0.8);
      const w2 = new THREE.Mesh(wheelGeo, tyre); w2.position.set(0, 0.34, -0.8);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xaa8833 }));
      lamp.position.set(0, 0.8, 1.0);
      g.add(frame, seat, w1, w2, lamp);
    } else {
      const long = car.kind === 'pickup' ? 5.0 : 4.2;
      const wide = car.kind === 'pickup' ? 2.1 : 1.9;
      const body = new THREE.Mesh(new THREE.BoxGeometry(wide, 0.62, long), paint);
      body.position.y = 0.55;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(wide - 0.25, 0.55, long * 0.45), glass);
      cabin.position.set(0, 1.05, car.kind === 'pickup' ? -0.5 : -0.15);
      g.add(body, cabin);
      if (car.kind === 'pickup') {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(wide - 0.2, 0.35, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 }));
        bed.position.set(0, 0.95, 1.55);
        g.add(bed);
      }
      const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      for (const [wx, wz] of [[-wide / 2, long / 2 - 0.8], [wide / 2, long / 2 - 0.8],
        [-wide / 2, -long / 2 + 0.8], [wide / 2, -long / 2 + 0.8]]) {
        const w = new THREE.Mesh(wheelGeo, tyre);
        w.position.set(wx, 0.36, wz);
        g.add(w);
      }
      const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0x887733 });
      for (const lx of [-wide / 2 + 0.3, wide / 2 - 0.3]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.08), lampMat);
        lamp.position.set(lx, 0.62, long / 2 + 0.01);
        g.add(lamp);
      }
    }
    g.position.copy(car.pos);
    g.rotation.y = car.heading;
    S.scene.add(g);
    car.mesh = g;
  } catch (e) { /* visuals are optional; logic must not die */ }
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}

export function init(S) {
  if (S.__b1VehiclesInit) return S.vehiclesUpdate || null;
  S.__b1VehiclesInit = true;
  if (!Array.isArray(S.cars)) S.cars = [];
  if (typeof S.car === 'undefined') S.car = null;

  for (const spot of PARKED) {
    S.cars.push(makeCar(spot.kind, spot.x, spot.z, spot.heading));
  }
  for (const t of TRAFFIC) {
    S.cars.push(makeCar('sedan', t.x, t.z, t.heading, { traffic: t }));
  }

  let prevKeys = {};

  function nearestCar(px, pz, maxD) {
    let best = null;
    let bestD = maxD;
    for (const c of S.cars) {
      if (c.aiPolice) continue; // patrol cars stay with their officer
      const dx = c.pos.x - px;
      const dz = c.pos.z - pz;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function update(rawDt) {
    const dt = Math.min(Math.max(rawDt || 0.016, 0), 0.05);
    const keys = S.keys || {};
    const pressed = (code) => !!keys[code] && !prevKeys[code];

    // Lazy mesh build: the scene may only exist after this module inits.
    for (const c of S.cars) {
      if (!c.mesh && S.scene) buildMesh(S, c);
    }

    const live = (S.mode === undefined || S.mode === 'playing') && !S.cutscene;
    if (!live) { prevKeys = Object.assign({}, keys); return; }

    // KeyE: step into the nearest parked ride, or step back out.
    if (pressed('KeyE')) {
      if (!S.car) {
        const p = S.player;
        if (p) {
          const near = nearestCar(p.pos.x, p.pos.z, 4);
          if (near) {
            S.car = near;
            near.speed = 0;
            p.pos.copy(near.pos);
            p.heading = near.heading;
          }
        }
      } else {
        const car = S.car;
        const p = S.player;
        S.car = null;
        car.speed = 0;
        if (p) {
          // Out on the right flank so the player never spawns inside the car.
          const rx = Math.cos(car.heading);
          const rz = -Math.sin(car.heading);
          p.pos.set(car.pos.x + rx * 2.4, 0, car.pos.z + rz * 2.4);
          p.heading = car.heading;
        }
      }
    }

    // Player driving: W/S throttle, A/D steer, hard stop at city bounds
    // and at anything the world flags as blocked.
    if (S.car) {
      const car = S.car;
      const top = car.perf();
      if (keys['KeyW'] || keys['ArrowUp']) car.speed += 14 * dt;
      else if (keys['KeyS'] || keys['ArrowDown']) car.speed -= (car.speed > 0.5 ? 22 : 9) * dt;
      else {
        const drag = 10 * dt;
        if (car.speed > drag) car.speed -= drag;
        else if (car.speed < -drag) car.speed += drag;
        else car.speed = 0;
      }
      car.speed = Math.max(-8, Math.min(top, car.speed));
      const steer = ((keys['KeyA'] || keys['ArrowLeft']) ? 1 : 0) - ((keys['KeyD'] || keys['ArrowRight']) ? 1 : 0);
      if (steer !== 0 && Math.abs(car.speed) > 0.2) {
        const grip = car.kind === 'bike' ? 2.6 : 1.9;
        car.heading += steer * grip * dt * Math.min(1, Math.abs(car.speed) / 9) * Math.sign(car.speed);
      }
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      let nx = car.pos.x + fx * car.speed * dt;
      let nz = car.pos.z + fz * car.speed * dt;
      let blocked = nx < -182 || nx > 182 || nz < -182 || nz > 182;
      if (!blocked && typeof S.isBlocked === 'function') {
        try { blocked = !!S.isBlocked(nx, nz); } catch (e) { blocked = false; }
      }
      if (blocked) {
        car.speed = 0; // a wall stops the car dead, no sliding through
      } else {
        car.pos.x = nx;
        car.pos.z = nz;
      }
      const p = S.player;
      if (p) {
        p.pos.copy(car.pos);
        p.heading = car.heading;
        if (p.vel) p.vel.set(fx * car.speed, 0, fz * car.speed);
        p.speed = Math.abs(car.speed);
      }
    }

    // Traffic cruises its lane and wraps to the far side of the map.
    for (const c of S.cars) {
      if (!c.traffic || c === S.car) continue;
      const t = c.traffic;
      // Yield: never drive through the player's car — stop short of it.
      if (S.car) {
        const dx = S.car.pos.x - c.pos.x;
        const dz = S.car.pos.z - c.pos.z;
        const ahead = dx * Math.sin(c.heading) + dz * Math.cos(c.heading);
        if (ahead > 0 && ahead < 9 && Math.abs(dx * Math.cos(c.heading) - dz * Math.sin(c.heading)) < 3) {
          c.speed = 0;
          continue;
        }
      }
      c.speed = t.cruise;
      c.pos.x += Math.sin(c.heading) * c.speed * dt;
      c.pos.z += Math.cos(c.heading) * c.speed * dt;
      if (c.pos.x > 185 || c.pos.x < -185 || c.pos.z > 185 || c.pos.z < -185) {
        if (t.axis === 'x') { c.pos.x = -t.dir * 180; }
        else { c.pos.z = -t.dir * 180; }
      }
    }

    // Keep every mesh glued to its car.
    for (const c of S.cars) {
      if (!c.mesh) continue;
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.heading;
      if (c.kind === 'bike' && Math.abs(c.speed) > 3) {
        c.mesh.rotation.z = -0.08 * Math.sign(c.speed);
      } else if (c.kind === 'bike') {
        c.mesh.rotation.z = 0;
      }
    }
    prevKeys = Object.assign({}, keys);
  }

  const wrapped = hookIntoLoop(S, update);
  S.vehiclesUpdate = wrapped;
  S.makeCar = makeCar;
  return wrapped;
}
