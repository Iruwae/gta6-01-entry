// SOLMAR BAY — the four weapon slots: fire (mouse), reload (R), switch (1–4).
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const input = ctx.input;
  const player = S.player;

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    // 1–4: switch weapon (the loadout setter enforces the unlock gate).
    for (let i = 0; i < 4; i++) {
      if (input.wasPressed('Digit' + (i + 1)) || input.wasPressed('Numpad' + (i + 1))) {
        const before = player.loadout.equipped;
        player.loadout.equip(i);
        if (player.loadout.equipped !== before) {
          player.reloading = false;
          player.reloadT = 0;
          ctx.api.toast(`${player.loadout.current().def.name} ready.`);
        } else if (player.loadout.slots[i].def.unlock > S.missionIndex) {
          ctx.api.toast(`${player.loadout.slots[i].def.name} unlocks after job ${player.loadout.slots[i].def.unlock}.`);
        }
      }
    }
    // R: reload the current weapon.
    if (input.wasPressed('KeyR') && !player.reloading) {
      const slot = player.loadout.current();
      if (slot.mag < slot.def.mag) {
        player.reloading = true;
        player.reloadT = slot.def.reload;
        ctx.api.audio('reload');
      }
    }
    // Mouse held: fire.
    if (input.mouse.down && !player.reloading && player.fireT <= 0) {
      const slot = player.loadout.current();
      if (slot.mag > 0) {
        slot.mag -= 1;
        player.fireT = slot.def.interval;
        ctx.api.audio('shot');
        ctx.api.flash(60);
        // Tiny heat for making noise in public.
        if (S.wanted < 5) S.heatDirector.add(0.4);
      } else {
        player.fireT = 0.25;
        ctx.api.audio('dry');
      }
    }
    void dt;
    void CONFIG;
  });

  return {};
}

export default init;
