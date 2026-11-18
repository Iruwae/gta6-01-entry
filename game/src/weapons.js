// SOLMAR BAY — weapons.js
// Weapon loadout: 4 slots, unlocked by job progress (ammo-reload +
// weapon-swap contracts). One authoritative def per weapon; the HUD,
// the player and the save shape all read from here.
//
// Resource contract (ammo-reload): each slot owns its own magazine.
// Reserve is unlimited (street ammo is cheap) — reload is an atomic
// transfer at the commit boundary: after the 1.2 s reload the magazine
// is full, nothing is invented or destroyed mid-reload. A shot consumes
// exactly one round at the fire event, never in muzzle/audio code.
// Swap contract (weapon-swap): instant-holster — switch commits
// immediately on keys 1-4, only into unlocked slots; duplicate requests
// settle on one equipped weapon; the equipped weapon's magazine is
// preserved across swaps.

export const WEAPONS = [
  { id: 'pistol', name: 'PISTOL', short: 'PSTL', damage: 34, cooldown: 0.25, mag: 12, pellets: 1, spread: 0, unlock: 0, unlockText: '' },
  { id: 'smg', name: 'SMG', short: 'SMG', damage: 14, cooldown: 0.09, mag: 30, pellets: 1, spread: 0.06, unlock: 1, unlockText: 'Finish Job 1' },
  { id: 'shotgun', name: 'SHOTGUN', short: 'SG', damage: 12, cooldown: 0.8, mag: 6, pellets: 5, spread: 0.16, unlock: 2, unlockText: 'Finish Job 2' },
  { id: 'rifle', name: 'RIFLE', short: 'RFL', damage: 70, cooldown: 0.6, mag: 8, pellets: 1, spread: 0.01, unlock: 3, unlockText: 'Finish Job 3' },
];

export const CAR_NAMES = {
  sedan: 'SOLMAR SEDAN',
  taxi: 'CITY TAXI',
  sport: 'BAYLINE GT',
  van: 'HARBOUR VAN',
  police: 'PD INTERCEPTOR',
  bike: 'STREET BIKE',
  pickup: 'DESERT PICKUP',
};

export class Loadout {
  constructor() {
    this.reset();
  }

  reset() {
    this.slots = WEAPONS.map((w) => ({ def: w, ammo: w.mag }));
    this.equipped = 0;
  }

  // missionsDone = S.missionIndex (completed jobs). Pistol is always open.
  unlocked(i, missionsDone) {
    if (i < 0 || i >= WEAPONS.length) return false;
    return (missionsDone || 0) >= WEAPONS[i].unlock;
  }

  current() {
    return this.slots[this.equipped];
  }

  // Magazine as a 0..1 fraction (the shop's ammo readout + HUD low-ammo
  // warnings read this, not raw counts).
  ammoPercent() {
    const slot = this.slots[this.equipped];
    if (!slot || !slot.def || !slot.def.mag) return 1;
    return Math.max(0, Math.min(1, slot.ammo / slot.def.mag));
  }

  isLowAmmo() {
    return this.ammoPercent() < 0.25;
  }

  // Returns { ok, reason } — the caller toasts the reason when locked.
  switchTo(i, missionsDone) {
    if (i < 0 || i >= WEAPONS.length) return { ok: false, reason: '' };
    if (!this.unlocked(i, missionsDone)) {
      return { ok: false, reason: 'Locked — ' + WEAPONS[i].unlockText };
    }
    if (i === this.equipped) return { ok: true, reason: '', already: true };
    this.equipped = i;
    return { ok: true, reason: '', already: false };
  }
}
