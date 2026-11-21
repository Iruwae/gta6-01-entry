// The four weapon slots for SOLMAR BAY. The pistol is always
// available; the SMG stays locked until the first job is done
// (missionIndex >= 1). Firing spends ammo while the mouse is held, R
// reloads (the refill commits atomically to a full magazine when the
// timer hits zero, in state.js), and switching sets the magazine to
// the new weapon's. Keys 1–4 switch.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, api } = ctx;

  function tryHit() {
    const slot = S.player.loadout.current();
    const def = slot.def;
    // Simple hitscan: the nearest cop in range and roughly ahead takes
    // the hit. The player shoots where they face.
    let best = null;
    let bestD = def.range;
    for (const cop of S.cars) {
      if (!cop.aiPolice) continue;
      const dx = cop.pos.x - S.player.pos.x;
      const dz = cop.pos.z - S.player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > def.range) continue;
      const ang = Math.atan2(dx, dz);
      let dh = ang - S.player.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      if (Math.abs(dh) > 0.6) continue;
      if (d < bestD) {
        bestD = d;
        best = cop;
      }
    }
    if (best) {
      best.health -= def.damage;
      if (api.flash) api.flash();
      if (best.health <= 0) {
        const i = S.cars.indexOf(best);
        if (i >= 0) S.cars.splice(i, 1);
        if (best.mesh) ctx.scene.remove(best.mesh);
        S.cops = S.cops.filter((c) => c !== best);
        api.toast(`Took down ${best.callsign}.`);
      }
    }
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    const loadout = S.player.loadout;

    // Keys 1–4 switch weapons (the loadout setter is the unlock gate).
    for (let i = 0; i < 4; i++) {
      if (input.wasPressed(`Digit${i + 1}`)) {
        const before = loadout.equipped;
        loadout.equip(i);
        if (loadout.equipped !== before) {
          api.toast(`${loadout.current().def.name} ready.`);
        } else if (i !== before) {
          api.toast(`${CONFIG.weapons[i].name} is locked — finish more jobs.`);
        }
      }
    }

    // R starts a reload when the magazine is not full.
    if (input.wasPressed('KeyR') && !S.player.reloading) {
      const slot = loadout.current();
      if (slot.mag < slot.def.mag) {
        S.player.reloading = true;
        S.player.reloadT = slot.def.reload;
        if (api.audio) api.audio.reload();
      }
    }

    // Hold the mouse to fire.
    if (input.mouse.down && !S.player.reloading && S.player.fireT <= 0) {
      const slot = loadout.current();
      if (slot.mag > 0) {
        slot.mag -= 1;
        S.player.fireT = slot.def.interval;
        if (api.audio) api.audio.shot();
        tryHit();
      } else {
        // Dry fire starts a reload.
        S.player.reloading = true;
        S.player.reloadT = slot.def.reload;
      }
    }
  });
}
