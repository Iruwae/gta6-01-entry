// SOLMAR BAY — player.js (round 8 rebuild, written blind from the spec)
// On-foot movement, health, getting in and out of cars, safehouse rest.
// This module talks to the rest of the game only through ctx.
import * as THREE from '../vendor/three.module.min.js';

const WALK_SPEED = 6.5;
const WORLD_EDGE = 178;
const SAFEHOUSE = { x: 120, z: -120, r: 7 };

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const input = ctx.input;
  const dom = ctx.dom || {};

  const $ = (id) => dom[id] || document.getElementById(id);

  // ---- tiny input helpers (poll the shared input state) ----
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

  // ---- the player figure: sunset-orange shirt, cap, denim ----
  const figure = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 1.0, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xe86a2c })
  );
  torso.position.y = 1.05;
  figure.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9a066 })
  );
  head.position.y = 1.85;
  figure.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.8, 0.36),
    new THREE.MeshStandardMaterial({ color: 0x2c3550 })
  );
  legs.position.y = 0.4;
  figure.add(legs);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.14, 0.52),
    new THREE.MeshStandardMaterial({ color: 0x30203a })
  );
  cap.position.y = 2.06;
  figure.add(cap);
  scene.add(figure);
  S.player.mesh = figure;

  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const move = new THREE.Vector3();

  function nearestCar(maxD) {
    let best = null;
    let bestD = maxD;
    for (const c of S.cars || []) {
      if (c.aiPolice) continue;
      const d = Math.hypot(c.pos.x - S.player.pos.x, c.pos.z - S.player.pos.z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  ctx.updates.push((dt) => {
    const p = S.player;
    if (!p) return;
    if (S.mode && S.mode !== 'playing') return;

    // Keep the mirrored health field in step.
    p.health = Math.max(0, Math.min(100, p.health));
    S.health = p.health;

    const ePressed = pressed('KeyE');

    // ---- riding: the vehicle module drives, we just sit in the car ----
    if (S.car) {
      figure.visible = false;
      if (ePressed) {
        const car = S.car;
        S.car = null;
        p.pos.set(car.pos.x + 2.5, 0, car.pos.z + 2.5);
        toast('On foot.');
      }
      return;
    }
    figure.visible = true;

    // ---- on-foot movement, camera relative ----
    ctx.camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 0.001) fwd.set(0, 0, -1);
    fwd.normalize();
    right.crossVectors(fwd, UP).normalize();
    move.set(0, 0, 0);
    if (held('KeyW') || held('ArrowUp')) move.add(fwd);
    if (held('KeyS') || held('ArrowDown')) move.sub(fwd);
    if (held('KeyD') || held('ArrowRight')) move.add(right);
    if (held('KeyA') || held('ArrowLeft')) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize();
      p.pos.x += move.x * WALK_SPEED * dt;
      p.pos.z += move.z * WALK_SPEED * dt;
      p.heading = Math.atan2(move.x, move.z);
    }
    p.pos.x = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, p.pos.x));
    p.pos.z = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, p.pos.z));
    p.pos.y = 0;
    figure.position.copy(p.pos);
    figure.rotation.y = p.heading || 0;

    // ---- E: climb into the nearest car ----
    if (ePressed) {
      const car = nearestCar(4.5);
      if (car) {
        S.car = car;
        toast('Driving the ' + car.kind + '.');
      }
    }

    // ---- H: rest at the safehouse — full heal, heat cools off ----
    if (pressed('KeyH')) {
      const d = Math.hypot(p.pos.x - SAFEHOUSE.x, p.pos.z - SAFEHOUSE.z);
      if (d < SAFEHOUSE.r) {
        p.health = 100;
        S.health = 100;
        S.heat = Math.max(0, (S.heat || 0) - 40);
        toast('Rested at the safehouse. Fully healed, heat cooled off.');
      }
    }

    // ---- wiped out: wake up at the safehouse ----
    if (p.health <= 0) {
      p.pos.set(SAFEHOUSE.x, 0, SAFEHOUSE.z);
      p.health = 100;
      S.health = 100;
      S.heat = 0;
      toast('You woke up at the safehouse.');
    }
  });
}
