// SOLMAR BAY — the four weapon slots. Pistol always available; the rest
// unlock as jobs are done. Mouse fires, R reloads (atomic commit on the
// timer), 1-4 switch (switching sets the mag to the new weapon's magazine).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    const p = S.player;
    // Switch weapons 1-4 (the loadout setter enforces the unlock gate).
    for (let i = 0; i < 4; i++) {
      if (input.wasPressed(`Digit${i + 1}`)) {
        const before = p.loadout.equipped;
        p.loadout.equip(i);
        if (p.loadout.equipped !== before) {
          p.reloading = false;
          p.reloadT = 0;
          ctx.api.toast(`${p.loadout.current().def.name} ready.`);
        }
      }
    }
    // Reload on R.
    if (input.wasPressed('KeyR') && !p.reloading) {
      const slot = p.loadout.current();
      if (slot.mag < slot.def.mag) {
        p.reloading = true;
        p.reloadT = slot.def.reload;
        ctx.api.audio.reload();
      }
    }
    // Fire while the mouse is held.
    if (input.mouse.down && !p.reloading && p.fireT <= 0) {
      const slot = p.loadout.current();
      if (slot.mag > 0) {
        slot.mag -= 1;
        p.fireT = slot.def.interval;
        ctx.api.audio.shot(slot.def.name);
        ctx.api.flash(60);
      } else {
        p.fireT = 0.25;
        ctx.api.audio.click();
      }
    }
  });
  ctx.weaponsReady = true;
}
