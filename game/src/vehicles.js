// vehicles.js — every ride in Solmar Bay: sedans, bikes, pickups, sports.
//
// This module builds the world cars, drives the one the player is in,
// runs the traffic on the avenues, and owns the garage: G stores the
// current car by the garage door and spawns a stored car back out. A car
// is a plain object with a kind, a position, a tune, a perf() number and
// a damage() method; police cruisers are built by police.js and only
// borrow the road.

import * as THREE from '../vendor/three.module.min.js';

const BASE_PERF = { sedan: 32, bike: 38, pickup: 28, sport: 58 };
const BASE_HEALTH = { sedan: 100, bike: 60, pickup: 130, sport: 90 };
const DISPLAY = { sedan: 'SEDAN', bike: 'BIKE', pickup: 'PICKUP', sport: 'SPORT' };
const PAINTS = {
  sedan: ['#b03a2e', '#2e6db0', '#c9a227', '#5d6d7e'],
  bike: ['#d7263d', '#1b998b', '#e07b39'],
  pickup: ['#4a6741', '#7a5c2e', '#37474f'],
  sport: ['#e74c3c', '#f1c40f', '#8e44ad', '#111111'],
};
const GARAGE_DOOR = { x: -90, z: -66 };
const WORLD_EDGE = 188;

function readHeld(ctx, codes) {
  const inp = ctx.input || {};
  const out = new Set();
  const has = (c) => {
    if (inp.keys instanceof Set) return inp.keys.has(c);
    if (Array.isArray(inp.keys)) return inp.keys.includes(c);
    if (inp.held && typeof inp.held[c] !== 'undefined') return !!inp.held[c];
    if (inp.down instanceof Set) return inp.down.has(c);
    if (inp.pressed instanceof Set) return inp.pressed.has(c);
    if (typeof inp.isDown === 'function') return !!inp.isDown(c);
    if (inp.keys && typeof inp.keys === 'object') return !!inp.keys[c];
    return false;
  };
  for (const c of codes) if (has(c)) out.add(c);
  return out;
}

function showToast(ctx, msg) {
  const api = ctx.api || {};
  if (typeof api.toast === 'function') {
    try { api.toast(msg); return; } catch (e) { /* fall through */ }
  }
  const el = (ctx.dom && ctx.dom.toast) ||
    (typeof document !== 'undefined' ? document.getElementById('toast') : null);
  if (el) el.textContent = msg;
}

function el(ctx, id) {
  return (ctx.dom && ctx.dom[id]) ||
    (typeof document !== 'undefined' ? document.getElementById(id) : null);
}

function buildCarMesh(THREE, kind, color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.15, metalness: 0.6 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.95 });

  if (kind === 'bike') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.1), paint);
    body.position.y = 0.75;
    group.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.9), tyre);
    seat.position.set(0, 1.02, -0.25);
    group.add(seat);
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.16, 14);
    for (const z of [0.85, -0.85]) {
      const w = new THREE.Mesh(wheelGeo, tyre);
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.34, z);
      group.add(w);
    }
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.16, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xaa8800 })
    );
    lamp.position.set(0, 0.85, 1.06);
    group.add(lamp);
    return group;
  }

  const len = kind === 'pickup' ? 4.9 : kind === 'sport' ? 4.3 : 4.5;
  const wid = kind === 'pickup' ? 2.0 : 1.9;
  const body = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.62, len), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.86, 0.55, len * 0.45), glass);
  cabin.position.set(0, 1.1, -len * 0.05);
  group.add(cabin);
  if (kind === 'pickup') {
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(wid * 0.9, 0.4, len * 0.34),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
    );
    bed.position.set(0, 0.95, -len * 0.3);
    group.add(bed);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14);
  for (const [x, z] of [
    [-wid / 2, len * 0.32], [wid / 2, len * 0.32],
    [-wid / 2, -len * 0.32], [wid / 2, -len * 0.32],
  ]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    group.add(w);
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0x998800 });
  for (const x of [-wid * 0.3, wid * 0.3]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), lampMat);
    lamp.position.set(x, 0.62, len / 2 + 0.01);
    group.add(lamp);
  }
  return group;
}

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  if (!Array.isArray(S.cars)) S.cars = [];
  if (!Array.isArray(S.garageCars)) S.garageCars = [];
  if (typeof S.car === 'undefined') S.car = null;

  function makeCar(kind, x, z, opts) {
    opts = opts || {};
    const color = opts.color || PAINTS[kind][Math.floor(Math.random() * PAINTS[kind].length)];
    const car = {
      kind,
      name: opts.name || DISPLAY[kind] || kind.toUpperCase(),
      pos: new THREE.Vector3(x, 0, z),
      heading: typeof opts.heading === 'number' ? opts.heading : 0,
      speed: 0,
      maxHealth: BASE_HEALTH[kind] || 100,
      health: typeof opts.health === 'number' ? opts.health : (BASE_HEALTH[kind] || 100),
      color,
      owner: opts.owner || 'street',
      traffic: !!opts.traffic,
      trafficAxis: opts.trafficAxis || null,
      trafficDir: opts.trafficDir || 1,
      cruise: opts.cruise || 0,
      aiPolice: false,
      wrecked: false,
      tune: Object.assign(
        { engine: 0, armor: 0, paint: color, nos: false },
        opts.tune || {}
      ),
      perf() {
        return (BASE_PERF[this.kind] || 30) + (this.tune.engine || 0) * 2;
      },
      damage(n) {
        const soak = 1 - Math.min(0.6, (this.tune.armor || 0) * 0.15);
        this.health = Math.max(0, this.health - n * soak);
        if (this.health <= 0) { this.wrecked = true; this.speed = 0; }
        return this.health;
      },
    };
    if (scene && ctx.THREE) {
      car.mesh = buildCarMesh(ctx.THREE, kind, color);
      car.mesh.position.copy(car.pos);
      car.mesh.rotation.y = car.heading;
      scene.add(car.mesh);
    }
    return car;
  }

  function topSpeed(car) {
    return 8 + car.perf() * 0.55;
  }

  function gearFor(car) {
    const top = topSpeed(car);
    const f = Math.min(1, Math.abs(car.speed) / top);
    return Math.min(5, 1 + Math.floor(f * 5));
  }

  function updateSpeedo(car) {
    const numEl = el(ctx, 'speed-num');
    if (numEl) numEl.textContent = String(Math.round((car ? Math.abs(car.speed) : 0) * 2.4));
    const gearEl = el(ctx, 'speed-gear');
    if (gearEl) {
      gearEl.textContent = !car ? 'N'
        : car.speed < -0.5 ? 'R'
        : Math.abs(car.speed) < 0.5 ? 'N'
        : String(gearFor(car));
    }
    const carEl = el(ctx, 'speed-car');
    if (carEl) carEl.textContent = car ? (car.name || car.kind).toUpperCase() : 'ON FOOT';
  }

  // ---- the parked rides and the traffic ----
  const parked = [
    ['sport', -102, -64, { heading: 0.4 }],
    ['bike', -88, -64, { heading: -0.5 }],
    ['pickup', 36, 96, { heading: 1.2 }],
    ['sedan', 24, -40, { heading: 0 }],
    ['sedan', -140, 60, { heading: Math.PI / 2 }],
  ];
  for (const [kind, x, z, opts] of parked) S.cars.push(makeCar(kind, x, z, opts));

  const avenues = [
    { axis: 'x', z: -60 }, { axis: 'x', z: 60 },
    { axis: 'z', x: -60 }, { axis: 'z', x: 60 },
    { axis: 'x', z: 0 }, { axis: 'z', x: 0 },
  ];
  for (let i = 0; i < 8; i++) {
    const road = avenues[i % avenues.length];
    const dir = i % 2 === 0 ? 1 : -1;
    let x;
    let z;
    if (road.axis === 'x') { x = -160 + i * 42; z = road.z + (dir > 0 ? 2.5 : -2.5); }
    else { x = road.x + (dir > 0 ? 2.5 : -2.5); z = -160 + i * 42; }
    const car = makeCar('sedan', x, z, {
      traffic: true,
      trafficAxis: road.axis,
      trafficDir: dir,
      cruise: 8 + (i % 3) * 2,
    });
    car.heading = road.axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    S.cars.push(car);
  }

  // ---- garage: store the current car, spawn a stored one back ----
  function storeCar() {
    const car = S.car;
    if (!car) return false;
    const rec = {
      kind: car.kind,
      name: car.name,
      color: car.color,
      health: car.health,
      maxHealth: car.maxHealth,
      tune: {
        engine: car.tune.engine || 0,
        armor: car.tune.armor || 0,
        paint: car.tune.paint || car.color,
        nos: !!car.tune.nos,
      },
    };
    S.garageCars.push(rec);
    const idx = S.cars.indexOf(car);
    if (idx >= 0) S.cars.splice(idx, 1);
    if (car.mesh && scene) scene.remove(car.mesh);
    S.car = null;
    S.player.pos.set(GARAGE_DOOR.x, 0, GARAGE_DOOR.z);
    showToast(ctx, 'Stored the ' + (car.name || car.kind) + ' in the garage.');
    return true;
  }

  function spawnStored(i) {
    const rec = S.garageCars[i];
    if (!rec) return false;
    S.garageCars.splice(i, 1);
    const car = makeCar(rec.kind, -92, -62, {
      color: rec.color,
      tune: rec.tune,
      health: rec.health,
      owner: 'player',
    });
    S.cars.push(car);
    S.car = car;
    S.player.pos.copy(car.pos);
    const panel = el(ctx, 'garage-panel');
    if (panel) panel.classList.add('hidden');
    showToast(ctx, 'Rolled the ' + (rec.name || rec.kind) + ' out of the garage.');
    return true;
  }

  function openGaragePanel() {
    const panel = el(ctx, 'garage-panel');
    const list = el(ctx, 'garage-list');
    if (!panel || !list) return false;
    list.innerHTML = '';
    S.garageCars.forEach((rec, i) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      const label = document.createElement('span');
      label.textContent = (rec.name || rec.kind).toUpperCase() + ' — HP ' + rec.health + '/' + rec.maxHealth;
      const btn = document.createElement('button');
      btn.className = 'garage-spawn';
      btn.textContent = 'SPAWN';
      btn.addEventListener('click', () => spawnStored(i));
      row.appendChild(label);
      row.appendChild(btn);
      list.appendChild(row);
    });
    panel.classList.remove('hidden');
    return true;
  }

  // The garage module owns the G key and the panel; these calls hand
  // over to it when it is there, and fall back to the local store /
  // panel only if it is not.
  function garageStore() {
    const g = ctx.api.garage;
    if (g && typeof g.storeCar === 'function') return g.storeCar();
    if (g && typeof g.store === 'function') return g.store();
    return storeCar();
  }
  function garageSpawn(i) {
    const g = ctx.api.garage;
    if (g && typeof g.spawnCar === 'function') return g.spawnCar(i);
    if (g && typeof g.spawn === 'function') return g.spawn(i);
    return spawnStored(i);
  }
  function garageOpen() {
    const g = ctx.api.garage;
    if (g && typeof g.openPanel === 'function') return g.openPanel();
    if (g && typeof g.open === 'function') return g.open();
    return openGaragePanel();
  }
  ctx.api.vehicles = { makeCar, storeCar: garageStore, spawnStored: garageSpawn, openGaragePanel: garageOpen, topSpeed };

  const prev = new Set();

  ctx.updates.push((dt, t) => {
    const held = readHeld(ctx, [
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    ]);
    const rising = (code) => held.has(code) && !prev.has(code);
    const playing = S.mode === 'playing' && !S.cutscene;
    const step = Math.min(dt || 0, 0.05);

    // The garage module owns the G key; this module never binds it.

    // Drive the player's car.
    const car = S.car;
    if (playing && car && !car.wrecked) {
      const top = topSpeed(car);
      const accel = held.has('KeyW') || held.has('ArrowUp');
      const brake = held.has('KeyS') || held.has('ArrowDown');
      if (accel) car.speed = Math.min(top, car.speed + 16 * step);
      if (brake) car.speed = Math.max(-8, car.speed - (car.speed > 0.5 ? 24 * step : 9 * step));
      if (!accel && !brake) car.speed *= Math.max(0, 1 - 0.5 * step);
      car.speed *= Math.max(0, 1 - 0.06 * step);
      if (Math.abs(car.speed) < 0.05 && !accel && !brake) car.speed = 0;
      const steer = (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0) -
        (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0);
      if (steer !== 0 && Math.abs(car.speed) > 0.3) {
        const grip = Math.min(1, Math.abs(car.speed) / 8);
        car.heading += steer * 1.9 * step * grip * (car.speed < 0 ? -1 : 1);
      }
      car.pos.x += Math.sin(car.heading) * car.speed * step;
      car.pos.z += Math.cos(car.heading) * car.speed * step;
      car.pos.x = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, car.pos.x));
      car.pos.z = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, car.pos.z));
      if (car.mesh) {
        car.mesh.position.copy(car.pos);
        car.mesh.rotation.y = car.heading;
      }
      if (S.player && S.player.pos) S.player.pos.copy(car.pos);
    }

    // Traffic keeps rolling on its avenue and wraps at the city edge.
    if (playing) {
      for (const c of S.cars) {
        if (!c || !c.traffic || c.aiPolice || c === S.car) continue;
        const v = c.cruise * c.trafficDir * step;
        if (c.trafficAxis === 'x') {
          c.pos.x += v;
          if (c.pos.x > 186) c.pos.x = -186;
          if (c.pos.x < -186) c.pos.x = 186;
        } else {
          c.pos.z += v;
          if (c.pos.z > 186) c.pos.z = -186;
          if (c.pos.z < -186) c.pos.z = 186;
        }
        if (c.mesh) {
          c.mesh.position.copy(c.pos);
          c.mesh.rotation.y = c.heading;
        }
      }
    }

    updateSpeedo(car);
    prev.clear();
    for (const k of held) prev.add(k);
  });
}
