// weapons.js — the four slots on Vic's belt.
//
// Pistol, SMG, Shotgun, Rifle on keys 1-4. The loadout itself lives in
// state.js (four slots with a magazine each, SMG locked until the first
// job is done); this module is the trigger finger on top of it: it
// switches slots, fires on mouse hold, starts a reload on R, and draws
// the tracer. Firing and reloading go through the player's own helpers
// so the slot magazines and S.player.ammo never drift apart.

import * as THREE from '../vendor/three.module.min.js';

const RELOAD_SECONDS = 1.2;
const RANGES = { PISTOL: 70, SMG: 55, SHOTGUN: 28, RIFLE: 110 };

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

function mouseHeld(ctx) {
  const inp = ctx.input || {};
  if (typeof inp.mouseDown === 'boolean') return inp.mouseDown;
  if (inp.mouse && typeof inp.mouse.down === 'boolean') return inp.mouse.down;
  if (inp.mouse && typeof inp.mouse.left === 'boolean') return inp.mouse.left;
  if (typeof inp.isMouseDown === 'function') return !!inp.isMouseDown();
  if (inp.buttons instanceof Set) return inp.buttons.has(0);
  if (typeof inp.leftMouse === 'boolean') return inp.leftMouse;
  if (inp.mouse && typeof inp.mouse.buttons === 'number') return (inp.mouse.buttons & 1) === 1;
  return false;
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

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  const P = S.player;
  const loadout = P.loadout;

  let cooldown = 0;
  const tracers = [];
  const prev = new Set();
  let lastHud = '';

  function currentDef() {
    const cur = loadout && typeof loadout.current === 'function' ? loadout.current() : null;
    return (cur && cur.def) || { name: 'PISTOL', mag: 12, rate: 0.35 };
  }

  function isLocked(i) {
    if (loadout && typeof loadout.canEquip === 'function') return !loadout.canEquip(i);
    return i === 1 && (S.missionIndex || 0) < 1;
  }

  function switchTo(i) {
    if (!loadout) return false;
    if (typeof loadout.canEquip === 'function' && !loadout.canEquip(i)) {
      const name = (loadout.weapons && loadout.weapons[i] && loadout.weapons[i].def.name) || 'SMG';
      showToast(ctx, name + ' unlocks after your first job.');
      return false;
    }
    if (typeof loadout.equip === 'function') {
      if (!loadout.equip(i)) return false;
    } else {
      loadout.equipped = i;
      P.ammo = (loadout.weapons[i] && loadout.weapons[i].ammo) || currentDef().mag;
    }
    P.reloading = false;
    P.reloadT = 0;
    cooldown = 0;
    refreshSlotsHud(true);
    return true;
  }

  function startReload() {
    if (P.reloading) return false;
    if (typeof P.startReload === 'function') return P.startReload();
    if (P.ammo >= currentDef().mag) return false;
    P.reloading = true;
    P.reloadT = RELOAD_SECONDS;
    return true;
  }

  function aimDirection() {
    if (ctx.camera) {
      const d = new THREE.Vector3();
      ctx.camera.getWorldDirection(d);
      const len = Math.hypot(d.x, d.z);
      if (len > 0.001) return { x: d.x / len, z: d.z / len };
    }
    return { x: Math.sin(P.heading || 0), z: Math.cos(P.heading || 0) };
  }

  function spawnTracer(def) {
    if (!scene || !ctx.THREE) return;
    const range = RANGES[def.name] || 60;
    const dir = aimDirection();
    const from = new THREE.Vector3(P.pos.x, 1.3, P.pos.z);
    const to = new THREE.Vector3(P.pos.x + dir.x * range, 1.1, P.pos.z + dir.z * range);
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    tracers.push({ line, life: 0.07 });
  }

  function fire() {
    const def = currentDef();
    if (typeof P.fire === 'function') {
      if (!P.fire()) { startReload(); return; }
    } else {
      if (P.ammo <= 0) { startReload(); return; }
      P.ammo -= 1;
    }
    cooldown = def.rate || 0.3;
    spawnTracer(def);
  }

  function refreshSlotsHud(force) {
    const box = (ctx.dom && ctx.dom.weapons) ||
      (typeof document !== 'undefined' ? document.getElementById('weapons') : null);
    if (!box || !loadout) return;
    const key = loadout.equipped + ':' + P.ammo + ':' + (S.missionIndex || 0) + ':' + (P.reloading ? 'r' : '');
    if (!force && key === lastHud) return;
    lastHud = key;
    const list = loadout.weapons || loadout.slots || [];
    const slotEls = box.querySelectorAll('.slot');
    slotEls.forEach((slotEl, i) => {
      const w = list[i];
      if (!w) return;
      const nameEl = slotEl.querySelector('.slot-name');
      const ammoEl = slotEl.querySelector('.slot-ammo');
      if (nameEl) nameEl.textContent = (w.def && w.def.name) || w.name || '';
      if (ammoEl) {
        ammoEl.textContent = i === loadout.equipped ? String(P.ammo)
          : (typeof w.ammo === 'number' ? String(w.ammo) : String((w.def && w.def.mag) || ''));
      }
      slotEl.classList.toggle('active', i === loadout.equipped);
      slotEl.classList.toggle('locked', isLocked(i));
      // The HUD reads this flag to grey the locked slot out.
      w.locked = isLocked(i);
    });
  }

  ctx.updates.push((dt, t) => {
    const held = readHeld(ctx, ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyR']);
    const rising = (code) => held.has(code) && !prev.has(code);
    const playing = S.mode === 'playing' && !S.cutscene;

    if (playing) {
      if (rising('Digit1')) switchTo(0);
      if (rising('Digit2')) switchTo(1);
      if (rising('Digit3')) switchTo(2);
      if (rising('Digit4')) switchTo(3);
      if (rising('KeyR')) startReload();
      cooldown -= dt || 0;
      if (mouseHeld(ctx) && !S.car && !P.reloading && cooldown <= 0) fire();
    }

    // The reload itself commits in the state housekeeping (it owns the
    // timer on the player); this module only starts one, never double
    // counts the timer down.

    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt || 0;
      if (tracers[i].life <= 0) {
        if (scene) scene.remove(tracers[i].line);
        tracers.splice(i, 1);
      }
    }

    refreshSlotsHud(false);
    prev.clear();
    for (const k of held) prev.add(k);
  });

  ctx.api.weapons = {
    switchTo,
    reload: startReload,
    fire,
    defs: (loadout && loadout.weapons ? loadout.weapons.map((w) => w.def) : []),
    loadout,
  };
}
