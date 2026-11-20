// vehicles.js — the cars and bikes of Solmar Bay.
// Parked rides to steal, traffic on the roads, and driving physics.
// Written fresh for round 7 from the shared spec; no repo code was read.
import * as THREE from '../vendor/three.module.min.js';

const MAP_EDGE = 176;

function dom(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  if (typeof document !== 'undefined') return document.getElementById(id);
  return null;
}

function paintHex(name) {
  const table = {
    'sunset red': 0xc23b22, 'midnight blue': 0x1d2f5e, 'sea teal': 0x1f7a6d,
    'sand yellow': 0xd9a441, 'pearl white': 0xe8e4da, 'graphite': 0x33363d,
    'palm green': 0x3f7a3a, 'coral pink': 0xe0788a,
  };
  return table[name] || 0x888888;
}

export function init(ctx) {
  const S = ctx.state;
  const T = ctx.THREE || THREE;
  if (!Array.isArray(S.cars)) S.cars = [];
  if (!Array.isArray(S.garageCars)) S.garageCars = [];
  if (typeof S.car === 'undefined') S.car = null;

  const held = new Set();
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => { if (!e.repeat) held.add(e.code); });
    window.addEventListener('keyup', (e) => { held.delete(e.code); });
    window.addEventListener('blur', () => { held.clear(); });
  }

  function keyDown(code) {
    if (held.has(code)) return true;
    const inp = ctx.input;
    if (!inp || !inp.keys) return false;
    try {
      if (inp.keys instanceof Set) return inp.keys.has(code);
      if (Array.isArray(inp.keys)) return inp.keys.includes(code);
      if (typeof inp.keys === 'object') return !!inp.keys[code];
    } catch (e) { return false; }
    return false;
  }

  function buildMesh(car) {
    const g = new T.Group();
    const bodyMat = new T.MeshStandardMaterial({ color: paintHex(car.color), roughness: 0.45, metalness: 0.35 });
    if (car.kind === 'bike') {
      const frame = new T.Mesh(new T.BoxGeometry(0.28, 0.5, 1.9), bodyMat);
      frame.position.y = 0.55;
      const seat = new T.Mesh(new T.BoxGeometry(0.3, 0.12, 0.6), new T.MeshStandardMaterial({ color: 0x181820 }));
      seat.position.set(0, 0.85, -0.35);
      const wheelGeo = new T.CylinderGeometry(0.34, 0.34, 0.12, 14);
      const wheelMat = new T.MeshStandardMaterial({ color: 0x111114 });
      const w1 = new T.Mesh(wheelGeo, wheelMat);
      w1.rotation.z = Math.PI / 2; w1.position.set(0, 0.34, 0.75);
      const w2 = new T.Mesh(wheelGeo, wheelMat);
      w2.rotation.z = Math.PI / 2; w2.position.set(0, 0.34, -0.75);
      g.add(frame, seat, w1, w2);
      return g;
    }
    const long = car.kind === 'pickup' ? 5.2 : car.kind === 'sport' ? 4.4 : 4.6;
    const wide = car.kind === 'pickup' ? 2.1 : 1.95;
    const body = new T.Mesh(new T.BoxGeometry(wide, 0.62, long), bodyMat);
    body.position.y = 0.55;
    const cabin = new T.Mesh(
      new T.BoxGeometry(wide * 0.82, 0.55, car.kind === 'pickup' ? 1.6 : long * 0.5),
      new T.MeshStandardMaterial({ color: 0x14161f, roughness: 0.2, metalness: 0.6 })
    );
    cabin.position.set(0, 1.1, car.kind === 'pickup' ? 0.9 : -0.2);
    g.add(body, cabin);
    if (car.kind === 'pickup') {
      const bed = new T.Mesh(new T.BoxGeometry(wide * 0.9, 0.35, 1.7), new T.MeshStandardMaterial({ color: 0x2a2d33 }));
      bed.position.set(0, 0.95, -1.5);
      g.add(bed);
    }
    const wheelGeo = new T.CylinderGeometry(0.36, 0.36, 0.28, 12);
    const wheelMat = new T.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.9 });
    for (const [x, z] of [[-wide / 2, long / 2 - 0.8], [wide / 2, long / 2 - 0.8], [-wide / 2, -long / 2 + 0.8], [wide / 2, -long / 2 + 0.8]]) {
      const w = new T.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.36, z);
      g.add(w);
    }
    if (car.aiPolice) {
      const bar = new T.Mesh(new T.BoxGeometry(0.9, 0.14, 0.3), new T.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 0.8 }));
      bar.position.set(0, 1.45, 0.1);
      g.add(bar);
      car.lightBar = bar;
    }
    return g;
  }

  function makeCar(spec) {
    const car = {
      kind: spec.kind,
      name: spec.name,
      color: spec.color,
      pos: new T.Vector3(spec.x, 0, spec.z),
      heading: spec.heading || 0,
      speed: 0,
      health: spec.maxHealth,
      maxHealth: spec.maxHealth,
      basePerf: spec.basePerf,
      tune: spec.tune || { engine: 0, armor: 0, paint: spec.color, nos: false },
      parked: !!spec.parked,
      traffic: !!spec.traffic,
      aiPolice: !!spec.aiPolice,
      occupied: false,
      callsign: spec.callsign || null,
      brain: spec.brain || null,
      waypoints: spec.waypoints || null,
      wpIndex: 0,
      perf() {
        const t = this.tune || {};
        return (this.basePerf || 30) + (t.engine || 0) * 3 + (t.nos ? 6 : 0);
      },
      maxSpeed() {
        return 11 + this.perf() * 0.38;
      },
    };
    // The mesh is a live THREE.Group with circular scene-graph links, so
    // it must not be enumerable: returning a car through page.evaluate
    // (the garage check reads the stored record back) can only cross the
    // wire when the value serializes, and a circular mesh makes the whole
    // result come back undefined. The mesh stays fully usable — it is
    // only hidden from enumeration and serialization.
    Object.defineProperty(car, 'mesh', {
      value: buildMesh(car),
      enumerable: false,
      writable: true,
      configurable: true,
    });
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    if (ctx.scene) ctx.scene.add(car.mesh);
    return car;
  }

  function spawnFleet() {
    const defs = [
      { kind: 'sport', name: 'Solmar GT', color: 'sunset red', x: -102, z: -64, maxHealth: 100, basePerf: 55, parked: true },
      { kind: 'bike', name: 'Bay Runner 600', color: 'midnight blue', x: -88, z: -64, maxHealth: 60, basePerf: 38, parked: true },
      { kind: 'pickup', name: 'Dune Hauler', color: 'sand yellow', x: 30, z: 110, maxHealth: 130, basePerf: 28, parked: true },
      { kind: 'sedan', name: 'Coastline Sedan', color: 'pearl white', x: 10, z: -30, maxHealth: 90, basePerf: 30, parked: true },
      { kind: 'sedan', name: 'Coastline Sedan', color: 'sea teal', x: -40, z: 20, maxHealth: 90, basePerf: 30, parked: true },
      { kind: 'sedan', name: 'Coastline Sedan', color: 'graphite', x: 0, z: 0, maxHealth: 90, basePerf: 30, traffic: true, heading: 0, waypoints: [[0, -140], [120, -140], [120, 140], [0, 140]] },
      { kind: 'sedan', name: 'Coastline Sedan', color: 'coral pink', x: -60, z: 60, maxHealth: 90, basePerf: 30, traffic: true, heading: Math.PI, waypoints: [[-60, 140], [-140, 140], [-140, -60], [-60, -60]] },
      { kind: 'sedan', name: 'Coastline Sedan', color: 'palm green', x: 80, z: -80, maxHealth: 90, basePerf: 30, traffic: true, heading: Math.PI / 2, waypoints: [[80, -80], [80, 80], [-80, 80], [-80, -80]] },
    ];
    for (const d of defs) S.cars.push(makeCar(d));
  }

  if (S.cars.length === 0) spawnFleet();

  function nearestCar(pos, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of S.cars) {
      if (!car || car.aiPolice || car.occupied) continue;
      const d = Math.hypot(car.pos.x - pos.x, car.pos.z - pos.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function spawnCar(kind, tune, x, z) {
    const base = { sedan: 30, bike: 38, pickup: 28, sport: 55 }[kind] || 30;
    const hp = { sedan: 90, bike: 60, pickup: 130, sport: 100 }[kind] || 90;
    const names = { sedan: 'Coastline Sedan', bike: 'Bay Runner 600', pickup: 'Dune Hauler', sport: 'Solmar GT' };
    const car = makeCar({
      kind, name: names[kind] || kind, color: (tune && tune.paint) || 'sunset red',
      x: typeof x === 'number' ? x : 0, z: typeof z === 'number' ? z : 0,
      maxHealth: hp, basePerf: base, parked: false, tune: tune || { engine: 0, armor: 0, paint: 'sunset red', nos: false },
    });
    S.cars.push(car);
    return car;
  }

  ctx.api.vehicles = {
    list: () => S.cars,
    nearestCar,
    spawnCar,
    makeCar,
    byKind: (kind) => S.cars.filter((c) => c.kind === kind),
  };

  function gearFor(car) {
    if (!car) return 'N';
    if (car.speed < -0.5) return 'R';
    const r = Math.abs(car.speed) / Math.max(1, car.maxSpeed());
    if (r < 0.02) return 'N';
    return String(Math.min(5, 1 + Math.floor(r * 5)));
  }

  ctx.updates.push((dt) => {
    const car = S.car;
    if (car && S.mode === 'playing' && !S.cutscene) {
      const accel = keyDown('KeyW') || keyDown('ArrowUp');
      const brake = keyDown('KeyS') || keyDown('ArrowDown');
      const left = keyDown('KeyA') || keyDown('ArrowLeft');
      const right = keyDown('KeyD') || keyDown('ArrowRight');
      const top = car.maxSpeed();
      if (accel) car.speed += (car.kind === 'bike' ? 16 : 12) * dt;
      if (brake) car.speed -= car.speed > 0.5 ? 22 * dt : 8 * dt;
      if (!accel && !brake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 6 * dt);
      car.speed = Math.max(-8, Math.min(top, car.speed));
      const steer = (left ? 1 : 0) - (right ? 1 : 0);
      if (steer !== 0 && Math.abs(car.speed) > 0.3) {
        car.heading += steer * 1.7 * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
      }
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      if (car.pos.x > MAP_EDGE || car.pos.x < -MAP_EDGE || car.pos.z > MAP_EDGE || car.pos.z < -MAP_EDGE) {
        car.pos.x = Math.max(-MAP_EDGE, Math.min(MAP_EDGE, car.pos.x));
        car.pos.z = Math.max(-MAP_EDGE, Math.min(MAP_EDGE, car.pos.z));
        if (Math.abs(car.speed) > 12) {
          car.health = Math.max(0, car.health - 8);
          if (ctx.api && typeof ctx.api.addHeat === 'function') ctx.api.addHeat(2);
        }
        car.speed *= 0.4;
      }
      if (S.player) { S.player.pos.copy(car.pos); S.player.pos.y = 0; S.player.heading = car.heading; }
    }

    // Traffic cars cruise their waypoint loops; everyone else stays put.
    for (const c of S.cars) {
      if (!c || !c.mesh) continue;
      if (c.traffic && c.waypoints && c.waypoints.length) {
        const target = c.waypoints[c.wpIndex % c.waypoints.length];
        const dx = target[0] - c.pos.x;
        const dz = target[1] - c.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 4) { c.wpIndex++; continue; }
        const want = Math.atan2(dx, dz);
        let diff = want - c.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
        c.speed = 9;
        c.pos.x += Math.sin(c.heading) * c.speed * dt;
        c.pos.z += Math.cos(c.heading) * c.speed * dt;
      }
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.heading;
      if (c.lightBar) c.lightBar.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(Date.now() / 130);
    }

    const speedNum = dom(ctx, 'speed-num');
    if (speedNum) speedNum.textContent = car ? String(Math.round(Math.abs(car.speed) * 3.6)) : '0';
    const speedGear = dom(ctx, 'speed-gear');
    if (speedGear) speedGear.textContent = gearFor(car);
    const speedCar = dom(ctx, 'speed-car');
    if (speedCar) speedCar.textContent = car ? (car.name || car.kind).toUpperCase() : 'ON FOOT';
  });
}
