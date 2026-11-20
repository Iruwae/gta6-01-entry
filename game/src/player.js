// player.js — Vic Torres on foot in Solmar Bay.
//
// This module owns the player while he is walking around: WASD / arrow
// movement, the direction he faces, getting into and out of cars with E,
// and keeping the two health numbers (S.health and S.player.health) in
// step. Driving physics lives in vehicles.js; this file only decides who
// is behind the wheel and where the feet go.

import * as THREE from '../vendor/three.module.min.js';

const WALK_SPEED = 6.5;
const RUN_SPEED = 9.5;
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

function buildPlayerMesh(THREE) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xe2703a, roughness: 0.8 });
  const denim = new THREE.MeshStandardMaterial({ color: 0x2c3e58, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.7 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.85 });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.26), denim);
  legL.position.set(-0.16, 0.28, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.68, 0.34), jacket);
  torso.position.y = 0.9;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.2), jacket);
  armL.position.set(-0.4, 0.88, 0);
  const armR = armL.clone();
  armR.position.x = 0.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), skin);
  head.position.y = 1.46;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.09, 12), capMat);
  cap.position.y = 1.62;

  group.add(legL, legR, torso, armL, armR, head, cap);
  return group;
}

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  if (!S.player) S.player = {};
  const P = S.player;

  if (!P.pos || typeof P.pos.set !== 'function') P.pos = new THREE.Vector3(-90, 0, -40);
  if (typeof P.health !== 'number') P.health = 100;
  if (typeof P.heading !== 'number') P.heading = 0;
  if (typeof S.health !== 'number') S.health = P.health;
  if (typeof P.ammo !== 'number') P.ammo = 12;
  if (typeof P.reloading !== 'boolean') P.reloading = false;

  let mesh = P.mesh || null;
  if (!mesh && scene && ctx.THREE) {
    mesh = buildPlayerMesh(ctx.THREE);
    mesh.position.copy(P.pos);
    P.mesh = mesh;
    scene.add(mesh);
  }

  function nearestCar(maxD) {
    let best = null;
    let bd = maxD;
    const cars = S.cars || [];
    for (const c of cars) {
      if (!c || !c.pos || c.aiPolice || c.wrecked) continue;
      const d = Math.hypot(c.pos.x - P.pos.x, c.pos.z - P.pos.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function enterCar() {
    if (S.car) return false;
    const car = nearestCar(4.5);
    if (!car) return false;
    S.car = car;
    P.pos.copy(car.pos);
    if (car.owner === 'street') {
      car.owner = 'player';
      const heatApi = ctx.api.heat;
      if (heatApi && typeof heatApi.add === 'function') heatApi.add(12);
      else if (S.heatDirector && typeof S.heatDirector.add === 'function') S.heatDirector.add(12);
      showToast(ctx, 'Stole the ' + (car.name || car.kind) + ' — heat is up.');
    } else {
      showToast(ctx, 'In the ' + (car.name || car.kind) + '.');
    }
    return true;
  }

  function exitCar() {
    const car = S.car;
    if (!car) return false;
    const h = car.heading || 0;
    const rx = Math.cos(h);
    const rz = -Math.sin(h);
    P.pos.set(car.pos.x + rx * 2.6, 0, car.pos.z + rz * 2.6);
    S.car = null;
    return true;
  }

  const prev = new Set();
  let aliasDone = false;

  ctx.updates.push((dt, t) => {
    // The smoke harness also reaches the player as __solmar.player; keep
    // that alias pointing at the same object if the boot hub did not set it.
    if (!aliasDone && typeof window !== 'undefined' && window.__solmar) {
      if (!window.__solmar.player) window.__solmar.player = P;
      aliasDone = true;
    }

    const held = readHeld(ctx, [
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'KeyE', 'ShiftLeft', 'ShiftRight',
    ]);
    const rising = (code) => held.has(code) && !prev.has(code);
    const playing = S.mode === 'playing' && !S.cutscene;

    if (playing && rising('KeyE')) {
      if (S.car) exitCar();
      else enterCar();
    }

    if (playing && !S.car && P.health > 0) {
      // Camera-relative walking: forward follows where the camera looks.
      let fx = 0;
      let fz = -1;
      if (ctx.camera) {
        const d = new THREE.Vector3();
        ctx.camera.getWorldDirection(d);
        const len = Math.hypot(d.x, d.z);
        if (len > 0.001) { fx = d.x / len; fz = d.z / len; }
      }
      const rx = -fz;
      const rz = fx;
      let mx = 0;
      let mz = 0;
      if (held.has('KeyW') || held.has('ArrowUp')) { mx += fx; mz += fz; }
      if (held.has('KeyS') || held.has('ArrowDown')) { mx -= fx; mz -= fz; }
      if (held.has('KeyD') || held.has('ArrowRight')) { mx += rx; mz += rz; }
      if (held.has('KeyA') || held.has('ArrowLeft')) { mx -= rx; mz -= rz; }
      const mLen = Math.hypot(mx, mz);
      if (mLen > 0.001) {
        mx /= mLen;
        mz /= mLen;
        const speed = (held.has('ShiftLeft') || held.has('ShiftRight')) ? RUN_SPEED : WALK_SPEED;
        const step = Math.min(dt || 0, 0.05);
        P.pos.x += mx * speed * step;
        P.pos.z += mz * speed * step;
        P.heading = Math.atan2(mx, mz);
        P.vel = { x: mx * speed, z: mz * speed };
      } else {
        P.vel = { x: 0, z: 0 };
      }
      P.pos.x = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, P.pos.x));
      P.pos.z = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, P.pos.z));
      P.pos.y = 0;
    }

    // While driving, the player rides with the car.
    if (S.car && S.car.pos) {
      P.pos.copy(S.car.pos);
      P.vel = {
        x: Math.sin(S.car.heading || 0) * (S.car.speed || 0),
        z: Math.cos(S.car.heading || 0) * (S.car.speed || 0),
      };
    }

    // The two health numbers always agree; the HUD reads either one.
    S.health = P.health;

    if (mesh) {
      mesh.position.copy(P.pos);
      mesh.rotation.y = P.heading;
      mesh.visible = !S.car && P.health > 0;
    }

    // Chase camera: no other module follows the player once the intro
    // cutscene hands over, so this module keeps the camera on Vic — a
    // high sunset angle that pulls back a little while driving. The
    // shake module runs after this and adds its offset on top.
    if (ctx.camera && S.mode === 'playing' && !S.cutscene) {
      const anchor = S.car && S.car.pos ? S.car.pos : P.pos;
      const lift = S.car ? 30 : 26;
      const back = S.car ? 40 : 34;
      const k = 1 - Math.exp(-(dt || 0) * 2.5);
      ctx.camera.position.x += (anchor.x - ctx.camera.position.x) * k;
      ctx.camera.position.y += (lift - ctx.camera.position.y) * k;
      ctx.camera.position.z += (anchor.z + back - ctx.camera.position.z) * k;
      ctx.camera.lookAt(anchor.x, 0, anchor.z);
    }

    prev.clear();
    for (const k of held) prev.add(k);
  });

  ctx.api.player = { enter: enterCar, exit: exitCar, nearestCar };
}
