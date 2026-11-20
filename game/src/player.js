// player.js — on-foot movement, weapon slots, firing + reload.
// Written fresh for the round-5 rebuild. Owns S.player: walking, the
// four-slot loadout, mouse fire and the R reload cycle.
import * as THREE from '../vendor/three.module.min.js';

const WALK_SPEED = 8;
const TURN_SPEED = 2.6;

const WEAPON_DEFS = [
  { name: 'PISTOL', mag: 12, fireRate: 0.25, unlock: 0, damage: 22, range: 55 },
  { name: 'SMG', mag: 30, fireRate: 0.09, unlock: 1, damage: 12, range: 45 },
  { name: 'SHOTGUN', mag: 6, fireRate: 0.85, unlock: 3, damage: 48, range: 22 },
  { name: 'RIFLE', mag: 30, fireRate: 0.13, unlock: 5, damage: 30, range: 90 },
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

function forwardOf(heading) {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}

// Shared frame driver: registers the update with the main loop when the
// state exposes a hook, and falls back to its own rAF loop when nobody
// calls it (the driver stays quiet while the main loop is alive).
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

function buildLoadout(S) {
  const lo = {
    defs: WEAPON_DEFS,
    equipped: 0,
    current() { return { def: WEAPON_DEFS[this.equipped], index: this.equipped }; },
    unlocked(i) { return (S.missionIndex || 0) >= WEAPON_DEFS[i].unlock; },
  };
  return lo;
}

function ensurePlayer(S) {
  if (!S.player) {
    S.player = {
      pos: v3(0, 0, 0), heading: 0, health: 100,
      loadout: null, ammo: 12, reloading: false, reloadT: 0,
    };
  }
  const p = S.player;
  if (!p.pos) p.pos = v3(0, 0, 0);
  if (typeof p.heading !== 'number') p.heading = 0;
  if (typeof p.health !== 'number') p.health = 100;
  if (!p.loadout) p.loadout = buildLoadout(S);
  if (typeof p.ammo !== 'number') p.ammo = p.loadout.current().def.mag;
  if (typeof p.reloading !== 'boolean') p.reloading = false;
  if (typeof p.reloadT !== 'number') p.reloadT = 0;
  if (!p.vel) p.vel = v3(0, 0, 0);
  if (typeof p.speed !== 'number') p.speed = 0;
  if (typeof p._fireCd !== 'number') p._fireCd = 0;
  if (typeof p._shotsFired !== 'number') p._shotsFired = 0;
  if (typeof S.health !== 'number') S.health = p.health;
  return p;
}

function ensureMesh(S, p) {
  if (!THREE || !S.scene || p.mesh) return;
  try {
    const g = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: 0x2e6f73, roughness: 0.8 });
    const denim = new THREE.MeshStandardMaterial({ color: 0x2b3a55, roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.7 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), jacket);
    torso.position.y = 1.05;
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), denim);
    legs.position.y = 0.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skin);
    head.position.y = 1.62;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xe8a33d, roughness: 0.7 }));
    cap.position.y = 1.8;
    g.add(torso, legs, head, cap);
    g.position.copy(p.pos);
    S.scene.add(g);
    p.mesh = g;
  } catch (e) { /* visuals are optional; logic must not die */ }
}

export function init(S) {
  if (S.__b1PlayerInit) return S.playerUpdate || null;
  S.__b1PlayerInit = true;
  const p = ensurePlayer(S);

  if (!S.keys) {
    S.keys = {};
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => { S.keys[e.code] = true; });
      window.addEventListener('keyup', (e) => { S.keys[e.code] = false; });
      window.addEventListener('blur', () => { for (const k of Object.keys(S.keys)) S.keys[k] = false; });
    }
  }

  let mouseDown = false;
  if (typeof window !== 'undefined') {
    const uiTarget = (e) => {
      const t = e.target;
      if (!t || !t.closest) return false;
      return !!t.closest('button, #dialogue, #shop-panel, #garage-panel, #mission-select, #pause-menu, .panel');
    };
    window.addEventListener('mousedown', (e) => { if (e.button === 0 && !uiTarget(e)) { mouseDown = true; S.mouseDown = true; } });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) { mouseDown = false; S.mouseDown = false; } });
    window.addEventListener('blur', () => { mouseDown = false; S.mouseDown = false; });
  }

  let prevKeys = {};
  let lastHealth = p.health;

  function switchWeapon(slot) {
    if (slot === p.loadout.equipped) return;
    if (slot < 0 || slot >= WEAPON_DEFS.length) return;
    if (!p.loadout.unlocked(slot)) return; // locked slot: keep the old gun
    p.loadout.equipped = slot;
    p.ammo = WEAPON_DEFS[slot].mag;
    p.reloading = false;
    p.reloadT = 0;
    p._fireCd = 0;
  }

  function update(rawDt) {
    const dt = Math.min(Math.max(rawDt || 0.016, 0), 0.05);
    ensureMesh(S, p);

    // Two-way health mirror: the player object is authoritative, but a
    // system that only writes S.health (safehouse, shop) still lands.
    if (typeof S.health === 'number') {
      if (S.health !== lastHealth && p.health === lastHealth) p.health = S.health;
      else S.health = p.health;
      lastHealth = p.health;
    } else {
      S.health = p.health;
    }
    p.health = Math.max(0, Math.min(100, p.health));

    const live = (S.mode === undefined || S.mode === 'playing') && !S.cutscene;
    if (!live) {
      if (p.mesh) { p.mesh.position.copy(p.pos); p.mesh.rotation.y = p.heading; }
      prevKeys = Object.assign({}, S.keys || {});
      return;
    }

    const keys = S.keys || {};
    const pressed = (code) => !!keys[code] && !prevKeys[code];

    // Weapon slots Digit1-4 (edge-triggered so a held key cannot reset ammo).
    if (pressed('Digit1')) switchWeapon(0);
    if (pressed('Digit2')) switchWeapon(1);
    if (pressed('Digit3')) switchWeapon(2);
    if (pressed('Digit4')) switchWeapon(3);

    // Reload on R: 1.2 s, then the mag refills atomically.
    if (pressed('KeyR') && !p.reloading && p.ammo < p.loadout.current().def.mag) {
      p.reloading = true;
      p.reloadT = 1.2;
    }
    if (p.reloading) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) {
        p.ammo = p.loadout.current().def.mag;
        p.reloading = false;
        p.reloadT = 0;
      }
    }

    // Fire on held mouse, gated by the weapon's fire rate.
    p._fireCd -= dt;
    const def = p.loadout.current().def;
    const wantFire = mouseDown || S.mouseDown;
    if (wantFire && !p.reloading && p.ammo > 0 && p._fireCd <= 0) {
      p.ammo -= 1;
      p._fireCd = def.fireRate;
      p._shotsFired += 1;
      p._shotAt = S.time || 0;
    }

    // On-foot movement (A/D turn, W forward, S back). Driving is owned
    // by vehicles.js — when S.car is set the player rides along instead.
    if (!S.car) {
      const fwd = forwardOf(p.heading);
      let move = 0;
      if (keys['KeyW'] || keys['ArrowUp']) move += 1;
      if (keys['KeyS'] || keys['ArrowDown']) move -= 0.45;
      if (keys['KeyA'] || keys['ArrowLeft']) p.heading += TURN_SPEED * dt;
      if (keys['KeyD'] || keys['ArrowRight']) p.heading -= TURN_SPEED * dt;
      const speed = move * WALK_SPEED;
      const nx = p.pos.x + fwd.x * speed * dt;
      const nz = p.pos.z + fwd.z * speed * dt;
      // City bounds only; building collision lives in the vehicle layer.
      p.pos.x = Math.max(-188, Math.min(188, nx));
      p.pos.z = Math.max(-188, Math.min(188, nz));
      p.vel.set(fwd.x * speed, 0, fwd.z * speed);
      p.speed = Math.abs(speed);
    } else {
      p.vel.set(0, 0, 0);
      p.speed = 0;
    }

    if (p.mesh) {
      p.mesh.position.copy(p.pos);
      // A light step-bob while walking so on-foot movement reads on screen.
      if (!S.car && p.speed > 0.5) p.mesh.position.y = Math.abs(Math.sin((S.time || 0) * 9)) * 0.07;
      p.mesh.rotation.y = p.heading;
      p.mesh.visible = true;
    }
    prevKeys = Object.assign({}, keys);
  }

  const wrapped = hookIntoLoop(S, update);
  S.playerUpdate = wrapped;
  return wrapped;
}
