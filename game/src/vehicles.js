// SOLMAR BAY — vehicles.js (round 8 rebuild, written blind from the spec)
// Parked cars and bikes, driving physics, light traffic, the garage
// (store / spawn) and Vic's fence (sell a car for a quoted price).
// Talks to the rest of the game only through ctx.
import * as THREE from '../vendor/three.module.min.js';

const GARAGE_DOOR = { x: -90, z: -66, r: 9 };
const FENCE_YARD = { x: 110, z: 138, r: 11 };
const WORLD_EDGE = 178;

const KIND_DEFS = {
  sedan: { maxHealth: 100, perf: 24, price: 350, color: 0x7a8899 },
  bike: { maxHealth: 60, perf: 38, price: 220, color: 0xc23b2e },
  pickup: { maxHealth: 130, perf: 28, price: 420, color: 0x3f6d4e },
  sport: { maxHealth: 110, perf: 46, price: 650, color: 0xe8a13c },
  police: { maxHealth: 140, perf: 34, price: 0, color: 0x1d2733 },
};

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

  // ---- car factory ----
  function buildMesh(car) {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({
      color: car.color,
      roughness: 0.5,
      metalness: 0.35,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.8 });
    if (car.kind === 'bike') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.0), paint);
      frame.position.y = 0.6;
      g.add(frame);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.7), dark);
      seat.position.set(0, 0.95, -0.3);
      g.add(seat);
      for (const z of [-0.8, 0.8]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12), dark);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0.34, z);
        g.add(wheel);
      }
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 4.4), paint);
      body.position.y = 0.65;
      g.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), dark);
      cabin.position.set(0, 1.2, -0.2);
      g.add(cabin);
      for (const [x, z] of [[-0.95, -1.5], [0.95, -1.5], [-0.95, 1.5], [0.95, 1.5]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12), dark);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.36, z);
        g.add(wheel);
      }
    }
    return g;
  }

  function makeCar(kind, x, z, color, opts) {
    const def = KIND_DEFS[kind] || KIND_DEFS.sedan;
    const car = {
      kind,
      color: color !== undefined ? color : def.color,
      pos: new THREE.Vector3(x, 0, z),
      heading: (opts && opts.heading) || 0,
      speed: 0,
      maxHealth: def.maxHealth,
      health: (opts && opts.health) || def.maxHealth,
      tune: opts && opts.tune
        ? { ...opts.tune }
        : { engine: 0, armor: 0, paint: null, nos: false },
      mesh: null,
      traffic: !!(opts && opts.traffic),
      route: (opts && opts.route) || null,
      routeIdx: 0,
    };
    car.perf = function () {
      return def.perf + (this.tune.engine || 0) * 4;
    };
    car.mesh = buildMesh(car);
    car.mesh.position.copy(car.pos);
    scene.add(car.mesh);
    return car;
  }

  if (!Array.isArray(S.cars)) S.cars = [];
  if (!Array.isArray(S.garageCars)) S.garageCars = [];

  // Parked rides around the bay.
  const parked = [
    ['sport', -102, -64, 0xe8a13c],
    ['bike', -88, -64, 0xc23b2e],
    ['pickup', 40, 120, 0x3f6d4e],
    ['sedan', -40, 80, 0x7a8899],
    ['sedan', 90, -20, 0x8a7a99],
    ['sedan', -140, 30, 0x99a07a],
  ];
  for (const [kind, x, z, color] of parked) S.cars.push(makeCar(kind, x, z, color));

  // Light traffic looping the avenues.
  const loop = [[-140, -140], [140, -140], [140, 140], [-140, 140]];
  for (let i = 0; i < 4; i++) {
    const [x, z] = loop[i];
    const t = makeCar('sedan', x, z, 0x5a6a7a, { traffic: true, route: loop });
    t.routeIdx = (i + 1) % 4;
    S.cars.push(t);
  }

  // ---- Vic's fence: quote a car, pay the quote plus a wanted bonus ----
  const fence = {
    priceFor(car) {
      const def = KIND_DEFS[car.kind] || KIND_DEFS.sedan;
      const condition = 0.5 + 0.5 * Math.max(0, Math.min(1, car.health / car.maxHealth));
      return Math.round(def.price * condition);
    },
    wantedBonus(car) {
      return (S.wanted || 0) > 0 ? Math.round(this.priceFor(car) * 0.1) : 0;
    },
  };
  S.fenceDirector = fence;

  // ---- garage panel ----
  function buildGarageList() {
    const list = $('garage-list');
    if (!list) return;
    list.innerHTML = '';
    (S.garageCars || []).forEach((rec, i) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      const label = document.createElement('span');
      label.textContent = rec.kind.toUpperCase() + ' — engine tune ' + (rec.tune.engine || 0);
      row.appendChild(label);
      const btn = document.createElement('button');
      btn.className = 'garage-spawn';
      btn.textContent = 'SPAWN';
      btn.addEventListener('click', () => spawnStored(i));
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  function garagePanel(show) {
    const panel = $('garage-panel');
    if (panel) panel.classList.toggle('hidden', !show);
    if (show) buildGarageList();
  }

  const closeBtn = $('btn-close-garage');
  if (closeBtn) closeBtn.addEventListener('click', () => garagePanel(false));

  function spawnStored(i) {
    const rec = (S.garageCars || [])[i];
    if (!rec) return;
    const car = makeCar(rec.kind, GARAGE_DOOR.x + 6, GARAGE_DOOR.z, rec.color, {
      tune: rec.tune,
      health: rec.health,
    });
    S.garageCars.splice(i, 1);
    S.cars.push(car);
    S.car = car;
    S.player.pos.copy(car.pos);
    garagePanel(false);
    toast('Spawned your ' + rec.kind + '.');
  }

  function storeCar() {
    const car = S.car;
    if (!car) return false;
    const rec = {
      kind: car.kind,
      color: car.color,
      tune: { ...car.tune },
      health: car.health,
    };
    S.garageCars.push(rec);
    scene.remove(car.mesh);
    const idx = S.cars.indexOf(car);
    if (idx >= 0) S.cars.splice(idx, 1);
    S.car = null;
    S.player.pos.set(GARAGE_DOOR.x, 0, GARAGE_DOOR.z);
    toast('Stored the ' + rec.kind + ' in your garage.');
    return true;
  }

  function sellCar() {
    const car = S.car;
    if (!car) return;
    const price = fence.priceFor(car) + fence.wantedBonus(car);
    S.cash += price;
    S.stats.fencesSold = (S.stats.fencesSold || 0) + 1;
    scene.remove(car.mesh);
    const idx = S.cars.indexOf(car);
    if (idx >= 0) S.cars.splice(idx, 1);
    S.player.pos.copy(car.pos);
    S.car = null;
    toast("Sold the " + car.kind + " to Vic's fence for $" + price + '.');
  }

  ctx.updates.push((dt) => {
    if (S.mode && S.mode !== 'playing') return;
    const car = S.car;

    if (car) {
      // The rider's position follows the car.
      S.player.pos.copy(car.pos);
      S.player.heading = car.heading;

      // Driving: W/S throttle, A/D steer, drag when coasting.
      const top = 8 + car.perf() * 0.55;
      if (held('KeyW') || held('ArrowUp')) car.speed += 14 * dt;
      if (held('KeyS') || held('ArrowDown')) car.speed -= 12 * dt;
      if (!held('KeyW') && !held('KeyS') && !held('ArrowUp') && !held('ArrowDown')) {
        car.speed -= car.speed * 1.2 * dt;
      }
      car.speed = Math.max(-top * 0.45, Math.min(top, car.speed));
      const steer =
        (held('KeyA') || held('ArrowLeft') ? 1 : 0) -
        (held('KeyD') || held('ArrowRight') ? 1 : 0);
      if (Math.abs(car.speed) > 0.3) {
        car.heading += steer * 1.9 * dt * Math.sign(car.speed);
      }
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.pos.x = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, car.pos.x));
      car.pos.z = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, car.pos.z));
      car.mesh.position.copy(car.pos);
      car.mesh.rotation.y = car.heading;

      // G: store the car at the garage door.
      if (pressed('KeyG')) {
        const d = Math.hypot(car.pos.x - GARAGE_DOOR.x, car.pos.z - GARAGE_DOOR.z);
        if (d < GARAGE_DOOR.r) storeCar();
      }
      // V: sell the car at Vic's fence yard.
      if (pressed('KeyV')) {
        const d = Math.hypot(car.pos.x - FENCE_YARD.x, car.pos.z - FENCE_YARD.z);
        if (d < FENCE_YARD.r) sellCar();
      }
    } else {
      // G on foot near the garage opens the stored-car panel.
      if (pressed('KeyG')) {
        const d = Math.hypot(S.player.pos.x - GARAGE_DOOR.x, S.player.pos.z - GARAGE_DOOR.z);
        if (d < GARAGE_DOOR.r + 4) {
          const panel = $('garage-panel');
          const open = panel ? panel.classList.contains('hidden') : true;
          garagePanel(open);
        }
      }
    }

    // Traffic ambles around its loop.
    for (const c of S.cars || []) {
      if (!c.traffic || c === S.car || !c.route) continue;
      const wp = c.route[c.routeIdx % c.route.length];
      const dx = wp[0] - c.pos.x;
      const dz = wp[1] - c.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 6) {
        c.routeIdx++;
        continue;
      }
      const want = Math.atan2(dx, dz);
      let diff = want - c.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      c.speed = 9;
      c.pos.x += Math.sin(c.heading) * c.speed * dt;
      c.pos.z += Math.cos(c.heading) * c.speed * dt;
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.heading;
    }
  });
}
