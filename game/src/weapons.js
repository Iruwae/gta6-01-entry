// SOLMAR BAY — the four weapon slots. Pistol always available; SMG stays
// locked until the first job is done (missionIndex >= 1). Firing spends
// ammo (mouse held), R reloads (reloadT counts down, the refill commits
// atomically to a full magazine when it hits zero), switching sets the
// mag to the new weapon's magazine. Keys 1–4 switch.
export function init(ctx) {
  const { state: S, input, api } = ctx;

  ctx.updates.push((dt) => {
    // 1–4 switch weapons (the loadout's equipped setter is the unlock gate).
    for (let i = 0; i < 4; i++) {
      if (input.wasPressed(`Digit${i + 1}`)) {
        const before = S.player.loadout.equipped;
        S.player.loadout.equip(i);
        if (S.player.loadout.equipped !== before) {
          api.toast(`${S.player.loadout.current().def.name} equipped.`);
        } else if (before !== i) {
          api.toast('That weapon is still locked — finish more jobs for Vic.');
        }
      }
    }
    // R reloads (only if the magazine is not already full).
    if (input.wasPressed('KeyR') && !S.player.reloading) {
      const slot = S.player.loadout.current();
      if (slot.mag < slot.def.mag) {
        S.player.reloading = true;
        S.player.reloadT = slot.def.reload;
        if (ctx.api.audio) ctx.api.audio.reload();
      }
    }
    // Fire while the mouse is held.
    if (input.mouse.down && !S.player.reloading && S.player.fireT <= 0) {
      const slot = S.player.loadout.current();
      if (slot.mag > 0) {
        slot.mag -= 1;
        S.player.fireT = slot.def.interval;
        if (ctx.api.audio) ctx.api.audio.shot();
        api.flash();
      } else {
        // Dry fire: nudge the player to reload.
        S.player.fireT = 0.25;
        if (ctx.api.audio) ctx.api.audio.blip();
      }
    }
  });
}
