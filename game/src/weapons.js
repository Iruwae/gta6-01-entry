// Weapons: the four slots. Pistol always available; SMG stays locked
// until the first job is done (missionIndex >= 1). Firing spends ammo
// (mouse held), R reloads, 1–4 switch.
export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    const player = S.player;
    // 1–4 switch (unlock gate lives in the loadout setter).
    for (let i = 0; i < 4; i++) {
      if (input.wasPressed(`Digit${i + 1}`)) {
        const before = player.loadout.equipped;
        player.loadout.equip(i);
        if (player.loadout.equipped !== before && ctx.audio) ctx.audio.blip();
      }
    }
    // R reload.
    if (input.wasPressed('KeyR') && !player.reloading && player.loadout.current().mag < player.loadout.current().def.mag) {
      player.reloading = true;
      player.reloadT = player.loadout.current().def.reload;
      if (ctx.audio) ctx.audio.reload();
    }
    // Fire while the mouse is held.
    if (input.mouse.down && !player.reloading && player.fireT <= 0) {
      const slot = player.loadout.current();
      if (slot.mag > 0) {
        slot.mag -= 1;
        player.fireT = slot.def.interval;
        if (ctx.audio) ctx.audio.shot();
        if (ctx.api.flash) ctx.api.flash(0.12);
      } else {
        player.fireT = 0.25;
      }
    }
  });
}

export default init;
