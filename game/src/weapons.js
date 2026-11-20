// weapons.js — the four-slot loadout (round-6 rebuild).
// Owns the slot keys (Digit1..4), the rack tables, the tracer lines
// and the hitscan that lands where a round goes. The trigger itself
// lives in player.js — exactly one place owns ammo, the fire rate and
// the reload, so a round can never drop twice. This module watches
// S.player._shotsFired and draws + resolves each shot the trigger
// reports. The slot HUD mirrors the loadout: the equipped slot shows
// the live mag count, locked slots stay dimmed.
import * as THREE from '../vendor/three.module.min.js';

const WEAPON_DEFS = [
  { name: 'PISTOL', mag: 12, fireRate: 0.28, unlock: 0, damage: 22, range: 55, color: 0xffd24a },
  { name: 'SMG', mag: 30, fireRate: 0.10, unlock: 1, damage: 12, range: 45, color: 0x7affd4 },
  { name: 'SHOTGUN', mag: 6, fireRate: 0.9, unlock: 3, damage: 48, range: 24, color: 0xff8a3c },
  { name: 'RIFLE', mag: 30, fireRate: 0.14, unlock: 5, damage: 30, range: 90, color: 0x7ab8ff },
];
const HEAT_PER_COP_HIT = 2;

function installLoadout(S) {
  const p = S.player;
  const keep = p.loadout && typeof p.loadout.equipped === 'number' ? p.loadout.equipped : 0;
  p.loadout = {
    defs: WEAPON_DEFS,
    equipped: Math.max(0, Math.min(WEAPON_DEFS.length - 1, keep)),
    current() { return { def: WEAPON_DEFS[this.equipped], index: this.equipped }; },
    unlocked(i) { return (S.missionIndex || 0) >= WEAPON_DEFS[i].unlock; },
  };
  return p.loadout;
}

export function init(S) {
  const p = S.player;
  if (!p) return null;
  installLoadout(S);
  if (typeof p.ammo !== 'number') p.ammo = WEAPON_DEFS[p.loadout.equipped].mag;
  if (typeof p.reloading !== 'boolean') p.reloading = false;
  if (typeof p.reloadT !== 'number') p.reloadT = 0;
  if (typeof p.ammoReserve !== 'number') p.ammoReserve = 0;
  if (typeof p.reserveAmmo !== 'number') p.reserveAmmo = 0;
  if (typeof p._shotsFired !== 'number') p._shotsFired = 0;

  let prevKeys = {};
  let lastShots = p._shotsFired || 0;
  const tracers = [];
  const lastSlotText = ['', '', '', ''];

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

  // Where the cursor points on the street, for tracer aim.
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const aimPoint = new THREE.Vector3();

  function cursorGroundPoint() {
    if (!S.camera || !S.mouse) return null;
    const nx = (S.mouse.x / window.innerWidth) * 2 - 1;
    const ny = -(S.mouse.y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera({ x: nx, y: ny }, S.camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, aimPoint);
    return hit ? aimPoint : null;
  }

  function spawnTracer(from, to, color) {
    if (!S.scene) return;
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    S.scene.add(line);
    tracers.push({ line, age: 0 });
    if (tracers.length > 8) {
      const old = tracers.shift();
      if (S.scene) S.scene.remove(old.line);
      old.line.geometry.dispose();
      old.line.material.dispose();
    }
  }

  // One reported shot: draw the tracer and resolve the hit. The trigger
  // (player.js) already spent the round — this never touches ammo.
  function resolveShot() {
    const def = p.loadout.current().def;
    const inCar = !!S.car;
    const anchor = inCar ? S.car.pos : p.pos;
    const muzzle = new THREE.Vector3(anchor.x, 1.4, anchor.z);
    let dir;
    if (inCar) {
      // Drive-by: rounds go where the car is pointed.
      dir = new THREE.Vector3(Math.sin(S.car.heading), 0, Math.cos(S.car.heading));
    } else {
      const gp = cursorGroundPoint();
      if (gp && Math.hypot(gp.x - anchor.x, gp.z - anchor.z) > 3) {
        dir = new THREE.Vector3(gp.x - anchor.x, 0, gp.z - anchor.z).normalize();
      } else {
        dir = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
      }
    }

    // Hitscan: nearest car inside a narrow cone in front of the muzzle.
    let hitCar = null, hitDist = def.range, hitPoint = null;
    for (const car of S.cars || []) {
      if (car === S.car || car.disabled) continue;
      const cx = car.pos.x - muzzle.x, cz = car.pos.z - muzzle.z;
      const along = cx * dir.x + cz * dir.z;
      if (along < 1 || along > def.range) continue;
      const perp = Math.abs(cx * dir.z - cz * dir.x);
      if (perp > 2.4) continue;
      if (along < hitDist) {
        hitDist = along;
        hitCar = car;
        hitPoint = new THREE.Vector3(muzzle.x + dir.x * along, 0.9, muzzle.z + dir.z * along);
      }
    }
    const end = hitPoint || new THREE.Vector3(muzzle.x + dir.x * def.range, 0.9, muzzle.z + dir.z * def.range);
    spawnTracer(muzzle, end, def.color);
    if (hitCar) {
      hitCar.health = Math.max(0, (hitCar.health || 0) - def.damage);
      if (hitCar.health <= 0) { hitCar.disabled = true; hitCar.speed = 0; }
      if (hitCar.aiPolice) {
        // Shooting at the PD is a crime like any other: it heats things up.
        if (S.heatDirector && typeof S.heatDirector.add === 'function') S.heatDirector.add(HEAT_PER_COP_HIT);
        else S.heat = Math.min(100, (S.heat || 0) + HEAT_PER_COP_HIT);
      }
    }
    if (def.name === 'SHOTGUN' || def.name === 'RIFLE') {
      if (S.juice) S.juice.trauma = Math.min(1, (S.juice.trauma || 0) + 0.08);
    }
  }

  function refreshSlots() {
    const box = document.getElementById('weapons');
    if (!box) return;
    const slots = box.querySelectorAll('.slot');
    if (slots.length !== WEAPON_DEFS.length) return;
    slots.forEach((slot, i) => {
      const locked = !p.loadout.unlocked(i);
      const equipped = i === p.loadout.equipped;
      slot.classList.toggle('active', equipped);
      slot.classList.toggle('locked', locked);
      // The equipped slot carries the live mag count; the rest of the
      // row is the HUD's to dress, so leave their text alone.
      if (!equipped) return;
      const text = String(p.ammo);
      const ammoEl = slot.querySelector('.slot-ammo');
      if (ammoEl && lastSlotText[i] !== text) {
        ammoEl.textContent = text;
        lastSlotText[i] = text;
      }
    });
  }

  function update(dt) {
    const keys = S.keys || {};
    const pressed = (code) => !!keys[code] && !prevKeys[code];

    // Weapon slots 1-4, edge-triggered so a held key cannot reset ammo.
    if (pressed('Digit1')) switchWeapon(0);
    if (pressed('Digit2')) switchWeapon(1);
    if (pressed('Digit3')) switchWeapon(2);
    if (pressed('Digit4')) switchWeapon(3);

    // The trigger reports through _shotsFired — draw + resolve each
    // new round exactly once, on the frame after it was fired.
    const fired = (p._shotsFired || 0) - lastShots;
    if (fired > 0) {
      for (let i = 0; i < fired; i++) resolveShot();
      lastShots = p._shotsFired;
    } else if (fired < 0) {
      lastShots = p._shotsFired || 0; // counter reset (new game, respawn)
    }

    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.age += dt;
      if (t.age > 0.08) {
        if (S.scene) S.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        tracers.splice(i, 1);
      } else {
        t.line.material.opacity = 0.9 * (1 - t.age / 0.08);
      }
    }

    refreshSlots();
    prevKeys = Object.assign({}, keys);
  }

  S.weapons = {
    defs: WEAPON_DEFS,
    switchTo: switchWeapon,
    magOf(i) { return (WEAPON_DEFS[i] && WEAPON_DEFS[i].mag) || 12; },
    fireRateOf(i) { return (WEAPON_DEFS[i] && WEAPON_DEFS[i].fireRate) || 0.25; },
  };
  if (Array.isArray(S._tick)) S._tick.push(update);
  return S.weapons;
}
