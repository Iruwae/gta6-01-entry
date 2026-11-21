// weapons.js — the four weapon slots. Pistol is always available; the
// SMG stays locked until the first job is done (missionIndex >= 1).
// Firing spends ammo, R reloads (reloadT counts down, the refill commits
// when it hits zero), and switching sets the mag to the new weapon.
const DEFS = [
  { name: 'PISTOL',  mag: 12, damage: 25, rate: 0.25, reloadTime: 1.2 },
  { name: 'SMG',     mag: 30, damage: 14, rate: 0.09, reloadTime: 1.4 },
  { name: 'SHOTGUN', mag: 6,  damage: 60, rate: 0.8,  reloadTime: 1.8 },
  { name: 'RIFLE',   mag: 24, damage: 35, rate: 0.16, reloadTime: 1.6 },
];

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  let firing = false;
  let fireT = 0;

  const p = S.player;
  if (!p.loadout) p.loadout = { equipped: 0 };
  const loadout = p.loadout;
  if (typeof loadout.equipped !== 'number') loadout.equipped = 0;
  loadout.weapons = DEFS;
  loadout.current = function () {
    return { def: DEFS[this.equipped] || DEFS[0], index: this.equipped };
  };
  // The state's ammo proxy reads current().mag and its reload commit
  // reads current().def.magSize, so the replacement above has to keep
  // both live: mag through the state's own slot, magSize alongside mag.
  DEFS.forEach((d) => { d.magSize = d.mag; });
  const weaponCurrent = loadout.current;
  loadout.current = function () {
    const base = weaponCurrent.call(this);
    const slot = loadout.slots && loadout.slots[this.equipped];
    if (!slot) return base;
    return {
      def: base.def,
      index: base.index,
      get mag() { return slot.mag; },
      set mag(v) { slot.mag = v; },
    };
  };
  if (typeof p.ammo !== 'number') p.ammo = DEFS[loadout.equipped].mag;
  if (typeof p.reloading !== 'boolean') p.reloading = false;
  if (typeof p.reloadT !== 'number') p.reloadT = 0;

  function currentDef() {
    return DEFS[loadout.equipped] || DEFS[0];
  }

  function equip(i) {
    if (i < 0 || i >= DEFS.length) return;
    // SMG lock: no job done yet, no SMG.
    if (i === 1 && (S.missionIndex || 0) < 1) return;
    if (loadout.equipped === i) return;
    loadout.equipped = i;
    p.ammo = DEFS[i].mag;
    p.reloading = false;
    p.reloadT = 0;
  }

  function startReload() {
    if (p.reloading) return;
    const def = currentDef();
    if (p.ammo >= def.mag) return;
    p.reloading = true;
    p.reloadT = def.reloadTime;
  }

  function playing() {
    return S && (S.mode === 'playing' || S.mode === undefined) && !S.cutscene;
  }

  window.addEventListener('keydown', (e) => {
    if (!playing() || e.repeat) return;
    if (e.code === 'Digit1') equip(0);
    else if (e.code === 'Digit2') equip(1);
    else if (e.code === 'Digit3') equip(2);
    else if (e.code === 'Digit4') equip(3);
    else if (e.code === 'KeyR') startReload();
  });
  window.addEventListener('mousedown', (e) => { if (e.button === 0) firing = true; });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) firing = false; });
  window.addEventListener('blur', () => { firing = false; });

  if (ctx.api) {
    ctx.api.weaponDefs = DEFS;
    ctx.api.equipWeapon = equip;
    ctx.api.startReload = startReload;
  }

  (ctx.updates || []).push((dt) => {
    if (!S || !S.player) return;
    // Reload commit: atomic — the mag refills the moment the timer ends.
    if (p.reloading) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) {
        p.ammo = currentDef().mag;
        p.reloading = false;
        p.reloadT = 0;
      }
    }
    // Firing.
    fireT -= dt;
    if (playing() && firing && !p.reloading && fireT <= 0) {
      if (p.ammo <= 0) {
        startReload();
      } else {
        p.ammo -= 1;
        fireT = currentDef().rate;
        // A loud shot draws a little attention.
        if (S.heatDirector && typeof S.heatDirector.add === 'function') {
          S.heatDirector.add(1);
        } else if (typeof S.heat === 'number') {
          S.heat = Math.min(100, S.heat + 1);
        }
      }
    }
    // Keep the four HUD slots honest: name, ammo, active highlight.
    const panel = dom.weapons || document.getElementById('weapons');
    if (panel) {
      const slots = panel.querySelectorAll('.slot');
      slots.forEach((slot, i) => {
        if (i >= DEFS.length) return;
        const nameEl = slot.querySelector('.slot-name');
        const ammoEl = slot.querySelector('.slot-ammo');
        if (nameEl) nameEl.textContent = DEFS[i].name;
        if (ammoEl) ammoEl.textContent = i === loadout.equipped ? String(p.ammo) : String(DEFS[i].mag);
        slot.classList.toggle('active', i === loadout.equipped);
        slot.classList.toggle('locked', i === 1 && (S.missionIndex || 0) < 1);
      });
    }
  });
}
