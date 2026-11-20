// weapons.js — four slots, ammo, and reloads for Solmar Bay.
// The SMG stays locked until the first job is done.
// Written fresh for round 7 from the shared spec; no repo code was read.

const DEFS = [
  { name: 'PISTOL', mag: 12, damage: 20, rate: 0.28, auto: false, range: 55 },
  { name: 'SMG', mag: 30, damage: 12, rate: 0.09, auto: true, range: 45 },
  { name: 'SHOTGUN', mag: 6, damage: 42, rate: 0.9, auto: false, range: 22 },
  { name: 'RIFLE', mag: 24, damage: 34, rate: 0.16, auto: true, range: 90 },
];

function dom(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  if (typeof document !== 'undefined') return document.getElementById(id);
  return null;
}

export function init(ctx) {
  const S = ctx.state;
  if (!S.player) S.player = { pos: { x: 0, z: 0 }, health: 100 };
  const P = S.player;

  const weapons = DEFS.map((def) => ({ def }));
  if (!P.loadout || typeof P.loadout.current !== 'function') {
    P.loadout = {
      equipped: 0,
      weapons,
      current() { return this.weapons[this.equipped]; },
    };
  } else {
    P.loadout.weapons = weapons;
    if (typeof P.loadout.equipped !== 'number') P.loadout.equipped = 0;
    P.loadout.current = function () { return this.weapons[this.equipped]; };
  }
  if (typeof P.ammo !== 'number') P.ammo = DEFS[P.loadout.equipped].mag;
  if (typeof P.reloading !== 'boolean') P.reloading = false;
  if (typeof P.reloadT !== 'number') P.reloadT = 0;

  let firing = false;
  let cooldown = 0;

  function currentDef() {
    return DEFS[P.loadout.equipped] || DEFS[0];
  }

  function toast(text) {
    const el = dom(ctx, 'toast');
    if (el) el.textContent = text;
  }

  function equip(i) {
    if (i < 0 || i >= DEFS.length) return false;
    if (i === 1 && (typeof S.missionIndex !== 'number' || S.missionIndex < 1)) {
      toast('SMG locked — finish Job 1 to unlock it.');
      return false;
    }
    if (P.loadout.equipped === i) return true;
    P.loadout.equipped = i;
    P.ammo = DEFS[i].mag;
    P.reloading = false;
    P.reloadT = 0;
    cooldown = 0;
    refreshSlots();
    return true;
  }

  function fire() {
    if (P.reloading) return false;
    if (P.ammo <= 0) { startReload(); return false; }
    P.ammo -= 1;
    const flash = dom(ctx, 'flash');
    if (flash) {
      flash.style.opacity = '0.25';
      setTimeout(() => { flash.style.opacity = '0'; }, 60);
    }
    refreshSlots();
    return true;
  }

  function startReload() {
    if (P.reloading) return false;
    if (P.ammo >= currentDef().mag) return false;
    P.reloading = true;
    P.reloadT = 1.2;
    refreshSlots();
    return true;
  }

  function refreshSlots() {
    const box = dom(ctx, 'weapons');
    if (!box) return;
    const slots = box.querySelectorAll('.slot');
    slots.forEach((slot, i) => {
      const def = DEFS[i];
      if (!def) return;
      const nameEl = slot.querySelector('.slot-name');
      if (nameEl) nameEl.textContent = def.name;
      const ammoEl = slot.querySelector('.slot-ammo');
      if (ammoEl) ammoEl.textContent = i === P.loadout.equipped ? String(P.ammo) : String(def.mag);
      slot.classList.toggle('active', i === P.loadout.equipped);
      slot.classList.toggle('locked', i === 1 && (typeof S.missionIndex !== 'number' || S.missionIndex < 1));
      slot.classList.toggle('reloading', i === P.loadout.equipped && P.reloading);
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (S.mode !== 'playing' || S.cutscene) return;
      if (e.code === 'Digit1') equip(0);
      else if (e.code === 'Digit2') equip(1);
      else if (e.code === 'Digit3') equip(2);
      else if (e.code === 'Digit4') equip(3);
      else if (e.code === 'KeyR') startReload();
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('button, #dialogue, #menu, #pause-menu, #mission-select, #shop-panel, #garage-panel, a, input')) return;
      firing = true;
      cooldown = 0;
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) firing = false; });
    window.addEventListener('blur', () => { firing = false; });
  }

  ctx.api.weapons = { equip, fire, reload: startReload, defs: DEFS, slots: refreshSlots };
  ctx.api.equipWeapon = equip;

  refreshSlots();

  ctx.updates.push((dt) => {
    if (P.reloading) {
      P.reloadT -= dt;
      if (P.reloadT <= 0) {
        P.ammo = currentDef().mag;
        P.reloading = false;
        P.reloadT = 0;
        refreshSlots();
      }
    }
    if (firing && S.mode === 'playing' && !S.cutscene && !P.reloading) {
      cooldown -= dt;
      if (cooldown <= 0) {
        if (fire()) cooldown = currentDef().rate;
        else cooldown = 0.25;
      }
    } else if (!firing) {
      cooldown = 0;
    }
    refreshSlots();
  });
}
