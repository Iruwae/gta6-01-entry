import * as THREE from '../vendor/three.module.min.js';

// SOLMAR BAY — the on-foot player: walk, aim, shoot, reload.
// This module owns S.player while the player is outside a car. The
// car itself is the vehicles module's job: it owns KeyE, the driving
// model, and copying the car's position onto the player, so this file
// never touches E and never moves the player while S.car is set.
//
// The weapons module owns the slot keys (Digit1..4) and the tracer
// lines; this file owns the trigger. The split matters: firing lives
// in exactly one place — here — so ammo can never drop twice for one
// round. A reload takes 1.2 s and refills the whole magazine in one
// atomic step when its timer runs out; switching slots (handled by
// the weapons module) refills the new magazine at once.

const WALK_SPEED = 7.5;
const RUN_SPEED = 11;
const WORLD_HALF = 178;
const RELOAD_TIME = 1.2;

// Fallbacks when the weapons module has not built its tables yet.
// These match the rack: pistol 12 / SMG 30 / shotgun 6 / rifle 30.
const FALLBACK_RATES = [0.25, 0.09, 0.85, 0.13];
const FALLBACK_MAGS = [12, 30, 6, 30];

const _raycaster = new THREE.Raycaster();
const _aimPoint = new THREE.Vector3();

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function init(S) {
  const p = S.player;
  if (!p) return null;
  if (!p.pos) p.pos = new THREE.Vector3(-90, 0, -66);
  if (typeof p.heading !== 'number') p.heading = 0;
  if (typeof p.health !== 'number') p.health = 100;
  if (typeof p.ammo !== 'number') p.ammo = 12;
  if (typeof p.reloading !== 'boolean') p.reloading = false;
  if (typeof p.reloadT !== 'number') p.reloadT = 0;
  p._fireCd = 0;
  p._shotsFired = 0;
  p.speed = 0;
  if (!p.vel) p.vel = new THREE.Vector3();
  if (!p.loadout) {
    const defs = [
      { name: 'PISTOL', mag: 12, damage: 12 },
      { name: 'SMG', mag: 30, damage: 8 },
      { name: 'SHOTGUN', mag: 6, damage: 30 },
      { name: 'RIFLE', mag: 30, damage: 22 },
    ];
    const lo = { equipped: 0, defs };
    lo.current = () => ({ def: lo.defs[lo.equipped] || lo.defs[0] });
    p.loadout = lo;
  }

  // ---- the visible figure -------------------------------------------
  const figure = new THREE.Group();
  figure.name = 'solmar-player';
  const jacket = new THREE.MeshStandardMaterial({ color: 0x2e8a7a, roughness: 0.8 });
  const denim = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89878, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.32), jacket);
  torso.position.y = 1.12;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skin);
  head.position.y = 1.72;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.09, 12), dark);
  cap.position.y = 1.88;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), denim);
  legL.position.set(-0.15, 0.38, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), denim);
  legR.position.set(0.15, 0.38, 0);
  // The gun in the right hand: a small dark box that points forward.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.5), dark);
  gun.position.set(0.3, 1.15, 0.3);
  figure.add(torso, head, cap, legL, legR, gun);
  figure.position.copy(p.pos);
  figure.rotation.y = p.heading;
  if (S.scene) S.scene.add(figure);
  p.mesh = figure;

  let prevKeys = {};
  let bobPhase = 0;

  function magOfSlot(i) {
    if (S.weapons && typeof S.weapons.magOf === 'function') return S.weapons.magOf(i);
    if (p.loadout && p.loadout.defs && p.loadout.defs[i]) return p.loadout.defs[i].mag;
    return FALLBACK_MAGS[i] || 12;
  }

  function rateOfSlot(i) {
    if (S.weapons && typeof S.weapons.fireRateOf === 'function') return S.weapons.fireRateOf(i);
    return FALLBACK_RATES[i] || 0.25;
  }

  // Point the player at the ground under the mouse cursor, so the
  // figure faces where the shots are going. Falls back to the
  // current heading when there is no camera or no clean ray hit.
  function aimAtMouse() {
    try {
      const cam = S.camera;
      const mouse = S.mouse;
      if (!cam || !mouse) return;
      const w = window.innerWidth || 1280;
      const h = window.innerHeight || 720;
      const nx = (mouse.x / w) * 2 - 1;
      const ny = -((mouse.y / h) * 2 - 1);
      if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
      _raycaster.setFromCamera({ x: nx, y: ny }, cam);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = _raycaster.ray.intersectPlane(plane, _aimPoint);
      if (!hit) return;
      const dx = _aimPoint.x - p.pos.x;
      const dz = _aimPoint.z - p.pos.z;
      if (Math.hypot(dx, dz) > 0.5) p.heading = Math.atan2(dx, dz);
    } catch (e) { /* aiming is best-effort; movement must not die */ }
  }

  function update(rawDt) {
    const dt = clamp(typeof rawDt === 'number' ? rawDt : 0.016, 0, 0.05);
    const keys = S.keys || {};
    const inCar = !!S.car;
    const live = S.mode === 'playing' && !S.cutscene;

    if (p._fireCd > 0) p._fireCd -= dt;

    if (live && !inCar) {
      // ---- walk: world-aligned WASD / arrows, Shift to run ----------
      let mx = 0;
      let mz = 0;
      if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
      const moving = mx !== 0 || mz !== 0;
      const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? RUN_SPEED : WALK_SPEED;
      if (moving) {
        const len = Math.hypot(mx, mz);
        mx /= len;
        mz /= len;
        // Face where we are going; forward is (sin h, cos h).
        p.heading = Math.atan2(mx, mz);
        const step = speed * dt;
        const nx = p.pos.x + mx * step;
        const nz = p.pos.z + mz * step;
        const blocked = typeof S.isBlocked === 'function' ? S.isBlocked : null;
        // Try each axis on its own so the player slides along walls.
        if (!blocked || !blocked(nx, p.pos.z)) p.pos.x = clamp(nx, -WORLD_HALF, WORLD_HALF);
        if (!blocked || !blocked(p.pos.x, nz)) p.pos.z = clamp(nz, -WORLD_HALF, WORLD_HALF);
        p.speed = speed;
        p.vel.set(mx * speed, 0, mz * speed);
        bobPhase += dt * speed * 1.6;
      } else {
        p.speed = 0;
        p.vel.set(0, 0, 0);
      }

      // ---- aim + fire ----------------------------------------------
      if (S.mouse && S.mouse.down) aimAtMouse();
      const slot = p.loadout ? p.loadout.equipped : 0;
      if (S.mouse && S.mouse.down && !p.reloading && p._fireCd <= 0) {
        if (p.ammo > 0) {
          p.ammo -= 1;
          p._shotsFired += 1;
          p._fireCd = rateOfSlot(slot);
          if (S.juice && typeof S.juice.add === 'function') S.juice.add(0.05);
          if (p.ammo === 0) {
            // Dry mag: start the reload on its own.
            p.reloading = true;
            p.reloadT = RELOAD_TIME;
          }
        } else if (!p.reloading) {
          p.reloading = true;
          p.reloadT = RELOAD_TIME;
        }
      }

      // ---- reload: R starts it, the timer commits it atomically -----
      const pressedR = !!keys['KeyR'] && !prevKeys['KeyR'];
      if (pressedR && !p.reloading && p.ammo < magOfSlot(slot)) {
        p.reloading = true;
        p.reloadT = RELOAD_TIME;
      }
    }

    if (p.reloading) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) {
        const slot = p.loadout ? p.loadout.equipped : 0;
        p.ammo = magOfSlot(slot);
        p.reloading = false;
        p.reloadT = 0;
      }
    }

    // ---- death: back on your feet at the garage, full health --------
    if (p.health <= 0) {
      p.health = 100;
      p.pos.set(-90, 0, -66);
      p.heading = 0;
      if (S.car) S.car = null;
      S.heat = 0;
      S.wanted = 0;
    }
    p.health = clamp(p.health, 0, 100);
    S.health = p.health;

    // ---- keep the figure glued to the state -------------------------
    figure.position.copy(p.pos);
    figure.rotation.y = p.heading;
    figure.visible = !inCar;
    const bob = p.speed > 0 ? Math.abs(Math.sin(bobPhase)) * 0.06 : 0;
    figure.position.y = p.pos.y + bob;
    legL.rotation.x = p.speed > 0 ? Math.sin(bobPhase) * 0.5 : 0;
    legR.rotation.x = p.speed > 0 ? -Math.sin(bobPhase) * 0.5 : 0;

    prevKeys = Object.assign({}, keys);
  }

  p.tick = update;
  p.update = update;
  S.playerTick = update;
  return p;
}
