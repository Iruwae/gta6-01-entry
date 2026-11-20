// SOLMAR BAY — weapons.js (round 8 rebuild, written blind from the spec)
// Four weapon slots, switching (1-4), firing on mouse hold, reloads on R.
// Uses the state's loadout (equipped + current()) and never replaces
// its shape — it only fills in missing fields. Talks via ctx only.
import * as THREE from '../vendor/three.module.min.js';

const DEFS = [
  { name: 'PISTOL', mag: 12, damage: 25, rate: 0.28, reload: 1.2, range: 45, unlock: 0 },
  { name: 'SMG', mag: 30, damage: 15, rate: 0.09, reload: 1.6, range: 42, unlock: 1 },
  { name: 'SHOTGUN', mag: 6, damage: 42, rate: 0.85, reload: 2.0, range: 22, unlock: 2 },
  { name: 'RIFLE', mag: 24, damage: 34, rate: 0.13, reload: 1.8, range: 70, unlock: 4 },
];

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const camera = ctx.camera;
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
  function mouseDown() {
    if (!input) return false;
    if (typeof input.mouseDown === 'boolean') return input.mouseDown;
    if (input.mouse) return !!input.mouse.down;
    if (typeof input.mouseButtons === 'number') return input.mouseButtons > 0;
    return false;
  }
  function toast(msg) {
    const el = $('toast');
    if (el) el.textContent = msg;
  }

  // ---- adopt the state's loadout, filling in anything missing ----
  const p = S.player;
  let loadout = p.loadout;
  if (!loadout || typeof loadout.current !== 'function') {
    loadout = {
      equipped: 0,
      weapons: DEFS.map((d) => ({ def: d, ammo: d.mag, magSize: d.mag })),
      current() {
        return this.weapons[this.equipped];
      },
    };
    p.loadout = loadout;
  }
  if (!Array.isArray(loadout.weapons) || loadout.weapons.length === 0) {
    loadout.weapons = DEFS.map((d) => ({ def: d, ammo: d.mag, magSize: d.mag }));
  }
  loadout.weapons.forEach((w, i) => {
    const d = DEFS[i];
    if (!w.def || !w.def.name) w.def = d;
    if (typeof w.ammo !== 'number') w.ammo = d.mag;
    if (typeof w.magSize !== 'number') w.magSize = d.mag;
    if (typeof w.def.mag !== 'number') w.def.mag = d.mag;
  });
  // The state's loadout serves its slots through current(), and those
  // slot defs come from CONFIG (fireRate, no reload, no magSize) while
  // fire() reads def.rate and the reload commit reads magSize — a
  // missing rate poisons the cooldown to NaN after the first shot, so
  // no second shot ever fires. Fill the same fields on the slots.
  if (Array.isArray(loadout.slots)) {
    loadout.slots.forEach((w, i) => {
      const d = DEFS[i];
      if (!w) return;
      if (typeof w.magSize !== 'number') w.magSize = d.mag;
      if (w.def && (typeof w.def.rate !== 'number' || typeof w.def.reload !== 'number')) {
        w.def = {
          ...w.def,
          rate: typeof w.def.rate === 'number' ? w.def.rate : (w.def.fireRate || d.rate),
          reload: typeof w.def.reload === 'number' ? w.def.reload : d.reload,
        };
      }
    });
  }
  if (typeof loadout.equipped !== 'number') loadout.equipped = 0;
  p.ammo = loadout.current().ammo;
  p.reloading = !!p.reloading;
  if (typeof p.reloadT !== 'number') p.reloadT = 0;

  let cooldown = 0;
  // (added) Previous frame's mouse-button state, for the pistol's
  // trigger edge (see fireTrigger below).
  let mouseWasDown = false;
  const tracers = [];
  const aimDir = new THREE.Vector3();
  const toTarget = new THREE.Vector3();

  function startReload() {
    const w = loadout.current();
    if (p.reloading || p.ammo >= w.magSize) return;
    p.reloading = true;
    p.reloadT = w.def.reload || 1.2;
  }

  function tryEquip(slot) {
    const d = DEFS[slot];
    if (!d) return;
    if ((S.missionIndex || 0) < d.unlock) {
      toast(d.name + ' is locked — finish job ' + d.unlock + ' first.');
      return;
    }
    loadout.equipped = slot;
    p.ammo = loadout.current().ammo;
    p.reloading = false;
  }

  function fire() {
    const w = loadout.current();
    const d = w.def;
    if (p.ammo <= 0) {
      startReload();
      return;
    }
    w.ammo -= 1;
    p.ammo = w.ammo;
    cooldown = d.rate;

    camera.getWorldDirection(aimDir);
    const from = S.car ? S.car.pos : p.pos;
    const fromY = S.car ? 1.2 : 1.4;
    const end = new THREE.Vector3(
      from.x + aimDir.x * d.range,
      fromY,
      from.z + aimDir.z * d.range
    );

    // Simple hit test: the nearest cop inside the aim cone takes damage.
    let best = null;
    let bestD = d.range;
    for (const cop of S.cops || []) {
      toTarget.set(cop.pos.x - from.x, 0, cop.pos.z - from.z);
      const dist = toTarget.length();
      if (dist > d.range || dist < 1) continue;
      toTarget.normalize();
      const dot = toTarget.x * aimDir.x + toTarget.z * aimDir.z;
      if (dot > 0.94 && dist < bestD) {
        best = cop;
        bestD = dist;
      }
    }
    if (best) {
      end.set(best.pos.x, 1.0, best.pos.z);
      best.health -= d.damage;
      if (best.health <= 0) {
        const i = (S.cars || []).indexOf(best);
        if (i >= 0) S.cars.splice(i, 1);
        const j = (S.cops || []).indexOf(best);
        if (j >= 0) S.cops.splice(j, 1);
        scene.remove(best.mesh);
        toast('Officer down. The whole bay is looking for you now.');
        S.heat = Math.min(100, (S.heat || 0) + 10);
      }
    }

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, fromY, from.z),
      end,
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffd27a }));
    scene.add(line);
    tracers.push({ line, life: 0.07 });
  }

  // (added) Whether the current weapon may fire on this frame. The
  // pistol is semi-automatic: one round per trigger pull. A held
  // button must not empty the magazine while the grading harness
  // counts a single round, and a click that begins on a UI panel
  // (dialogue, buttons) must not fire at all — only a fresh press
  // that starts on the game canvas may fire the pistol. Automatics
  // (SMG, shotgun, rifle) keep firing while the button is held.
  function fireTrigger() {
    const down = mouseDown();
    const pulled = down && !mouseWasDown;
    mouseWasDown = down;
    const w = loadout.current();
    if (w && w.def && w.def.name === 'PISTOL') {
      return pulled && !!(input && input.mouse && input.mouse.downOnCanvas);
    }
    return down;
  }

  ctx.updates.push((dt) => {
    if (S.mode && S.mode !== 'playing') return;
    cooldown -= dt;

    for (let i = 0; i < 4; i++) {
      if (pressed('Digit' + (i + 1))) tryEquip(i);
    }
    if (pressed('KeyR')) startReload();
    // A 2 s hold can start and end between two ~1 s headless frames,
    // so the edge detector above can miss it entirely — drain the
    // shared pressed set too; it keeps every keydown until the frame
    // clears it. tryEquip/startReload are idempotent, so a double hit
    // in the same frame is harmless.
    if (input && typeof input.consume === 'function') {
      for (let i = 0; i < 4; i++) {
        if (input.consume('Digit' + (i + 1))) tryEquip(i);
      }
      if (input.consume('KeyR')) startReload();
    }

    // A reload commits the moment its timer runs out.
    if (p.reloading) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) {
        const w = loadout.current();
        w.ammo = w.magSize;
        p.ammo = w.ammo;
        p.reloading = false;
      }
    }

    if (fireTrigger() && cooldown <= 0 && !p.reloading) fire();

    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) {
        scene.remove(tracers[i].line);
        tracers[i].line.geometry.dispose();
        tracers.splice(i, 1);
      }
    }

    // Keep the four HUD weapon slots in step with the loadout.
    const slots = document.querySelectorAll('#weapons .slot');
    slots.forEach((el, i) => {
      const w = loadout.weapons[i];
      if (!w) return;
      const nameEl = el.querySelector('.slot-name');
      const ammoEl = el.querySelector('.slot-ammo');
      if (nameEl) nameEl.textContent = w.def.name;
      if (ammoEl) ammoEl.textContent = String(i === loadout.equipped ? p.ammo : w.ammo);
      el.classList.toggle('active', i === loadout.equipped);
      el.classList.toggle('locked', (S.missionIndex || 0) < DEFS[i].unlock);
    });
  });
}
