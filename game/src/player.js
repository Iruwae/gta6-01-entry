// player.js — Vic on foot in Solmar Bay.
// Walks the streets, keeps his health, and climbs in and out of cars.
// Written fresh for round 7 from the shared spec; no repo code was read.
import * as THREE from '../vendor/three.module.min.js';

const WALK_SPEED = 7.5;
const RUN_SPEED = 11.5;
const TURN_SPEED = 2.4;
const MAP_EDGE = 178;
const ENTER_RANGE = 5.5;

function dom(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  if (typeof document !== 'undefined') return document.getElementById(id);
  return null;
}

function keyDown(ctx, held, code) {
  if (held.has(code)) return true;
  const inp = ctx.input;
  if (!inp) return false;
  try {
    if (inp.keys instanceof Set) return inp.keys.has(code);
    if (Array.isArray(inp.keys)) return inp.keys.includes(code);
    if (inp.keys && typeof inp.keys === 'object') return !!inp.keys[code];
    if (typeof inp.down === 'function') return !!inp.down(code);
  } catch (e) { /* input shape unknown; fall back to our own keys */ }
  return false;
}

export function init(ctx) {
  const S = ctx.state;
  const T = ctx.THREE || THREE;
  if (!S.player) {
    S.player = {
      pos: new T.Vector3(0, 0, 0),
      heading: 0,
      health: 100,
      ammo: 12,
      reloading: false,
      reloadT: 0,
      loadout: { equipped: 0, current() { return null; } },
    };
  }
  const P = S.player;
  if (!P.pos || typeof P.pos.set !== 'function') P.pos = new T.Vector3(P.pos ? P.pos.x || 0 : 0, 0, P.pos ? P.pos.z || 0 : 0);
  if (typeof P.health !== 'number') P.health = 100;
  if (typeof P.heading !== 'number') P.heading = 0;
  if (typeof P.ammo !== 'number') P.ammo = 12;
  if (typeof P.reloading !== 'boolean') P.reloading = false;
  if (!P.loadout) P.loadout = { equipped: 0, current() { return null; } };
  if (typeof S.health !== 'number') S.health = P.health;

  // A simple on-foot figure: warm jacket, dark trousers, cap.
  const mesh = new T.Group();
  const jacket = new T.Mesh(
    new T.BoxGeometry(0.62, 0.85, 0.36),
    new T.MeshStandardMaterial({ color: 0xe8641f, roughness: 0.85 })
  );
  jacket.position.y = 1.05;
  const head = new T.Mesh(
    new T.SphereGeometry(0.26, 12, 10),
    new T.MeshStandardMaterial({ color: 0xd9a077, roughness: 0.7 })
  );
  head.position.y = 1.72;
  const cap = new T.Mesh(
    new T.CylinderGeometry(0.28, 0.28, 0.1, 12),
    new T.MeshStandardMaterial({ color: 0x22222e, roughness: 0.6 })
  );
  cap.position.y = 1.92;
  const legs = new T.Mesh(
    new T.BoxGeometry(0.5, 0.7, 0.32),
    new T.MeshStandardMaterial({ color: 0x2a2f45, roughness: 0.9 })
  );
  legs.position.y = 0.35;
  mesh.add(jacket, head, cap, legs);
  mesh.position.copy(P.pos);
  if (ctx.scene) ctx.scene.add(mesh);
  P.mesh = mesh;
  S.playerMesh = mesh;

  const held = new Set();
  let lastPos = { x: P.pos.x, z: P.pos.z };

  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of S.cars || []) {
      if (!car || car.aiPolice) continue;
      if (car.occupied) continue;
      const d = Math.hypot(car.pos.x - P.pos.x, car.pos.z - P.pos.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function enterOrExit() {
    if (S.mode !== 'playing' || S.cutscene) return;
    if (S.car) {
      const car = S.car;
      S.car = null;
      car.occupied = false;
      car.speed = 0;
      const side = Math.cos(P.heading || 0);
      const fwd = Math.sin(P.heading || 0);
      P.pos.set(car.pos.x + side * 1.8, 0, car.pos.z - fwd * 1.8);
      mesh.visible = true;
      const toast = dom(ctx, 'toast');
      if (toast) toast.textContent = 'You stepped out of the ' + (car.kind || 'car') + '.';
      return;
    }
    let car = null;
    if (ctx.api && ctx.api.vehicles && typeof ctx.api.vehicles.nearestCar === 'function') {
      car = ctx.api.vehicles.nearestCar(P.pos, ENTER_RANGE);
    } else {
      car = nearestCar(ENTER_RANGE);
    }
    if (!car) return;
    S.car = car;
    car.occupied = true;
    car.parked = false;
    mesh.visible = false;
    P.pos.copy(car.pos);
    const toast = dom(ctx, 'toast');
    if (toast) toast.textContent = 'You took the ' + (car.name || car.kind || 'car') + '.';
    if (ctx.api && typeof ctx.api.addHeat === 'function') ctx.api.addHeat(6);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      held.add(e.code);
      if (e.code === 'KeyE') enterOrExit();
      if (e.code && e.code.indexOf('Arrow') === 0) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { held.delete(e.code); });
    window.addEventListener('blur', () => { held.clear(); });
  }

  ctx.api.player = {
    enterOrExit,
    nearestCar,
    mesh,
  };
  ctx.api.enterCar = enterOrExit;
  ctx.api.exitCar = enterOrExit;

  ctx.updates.push((dt) => {
    if (typeof S.health === 'number' && S.health !== P.health && S.playerMesh) {
      // S.health mirrors the player; the player value leads.
      S.health = P.health;
    }
    P.health = Math.max(0, Math.min(100, P.health));
    S.health = P.health;

    if (S.car) {
      P.pos.copy(S.car.pos);
      P.pos.y = 0;
      mesh.visible = false;
      mesh.position.copy(P.pos);
      lastPos = { x: P.pos.x, z: P.pos.z };
      return;
    }
    mesh.visible = true;

    if (S.mode === 'playing' && !S.cutscene) {
      const fwd = keyDown(ctx, held, 'KeyW') || keyDown(ctx, held, 'ArrowUp');
      const back = keyDown(ctx, held, 'KeyS') || keyDown(ctx, held, 'ArrowDown');
      const left = keyDown(ctx, held, 'KeyA') || keyDown(ctx, held, 'ArrowLeft');
      const right = keyDown(ctx, held, 'KeyD') || keyDown(ctx, held, 'ArrowRight');
      const running = keyDown(ctx, held, 'ShiftLeft') || keyDown(ctx, held, 'ShiftRight');
      if (left) P.heading += TURN_SPEED * dt;
      if (right) P.heading -= TURN_SPEED * dt;
      let move = 0;
      if (fwd) move += 1;
      if (back) move -= 0.55;
      if (move !== 0) {
        const speed = running ? RUN_SPEED : WALK_SPEED;
        P.pos.x += Math.sin(P.heading) * move * speed * dt;
        P.pos.z += Math.cos(P.heading) * move * speed * dt;
      }
      P.pos.x = Math.max(-MAP_EDGE, Math.min(MAP_EDGE, P.pos.x));
      P.pos.z = Math.max(-MAP_EDGE, Math.min(MAP_EDGE, P.pos.z));
      P.pos.y = 0;
    }

    mesh.position.copy(P.pos);
    mesh.rotation.y = P.heading;
    // Track velocity for the police brain (playerVel estimate).
    const vx = dt > 0 ? (P.pos.x - lastPos.x) / dt : 0;
    const vz = dt > 0 ? (P.pos.z - lastPos.z) / dt : 0;
    P.velX = vx;
    P.velZ = vz;
    P.speed = Math.hypot(vx, vz);
    lastPos = { x: P.pos.x, z: P.pos.z };

    const fill = dom(ctx, 'health-fill');
    if (fill) fill.style.width = P.health + '%';
    const bar = dom(ctx, 'health-bar');
    if (bar) bar.setAttribute('aria-valuenow', String(Math.round(P.health)));
  });
}
