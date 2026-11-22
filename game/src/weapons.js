// SOLMAR BAY — the four weapon slots. Pistol always available; SMG stays
// locked until the first job is done (missionIndex >= 1). Firing spends
// ammo (mouse held), R reloads (reloadT counts down, the refill commits
// atomically to a full magazine when it hits zero), switching sets the
// mag to the new weapon's magazine. Keys 1-4 switch.
export function init(ctx) {
  const S = ctx.state;
  const { input } = ctx;

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing' || S.cutscene) return;
    const p = S.player;
    const loadout = p.loadout;

    // Switch weapons on 1-4 (edge-triggered, unlock-gated in the loadout).
    for (let i = 0; i < 4; i++) {
      if (input.justPressed(`Digit${i + 1}`)) loadout.equip(i);
    }

    // Reload on R.
    if (input.justPressed('KeyR') && !p.reloading) {
      const cur = loadout.current();
      if (cur.mag < cur.def.mag) {
        p.reloading = true;
        p.reloadT = cur.def.reload;
        if (ctx.api.audio) ctx.api.audio.reload();
      }
    }

    // Fire while the mouse is held.
    if (input.mouse.down && !p.reloading && p.fireT <= 0) {
      const cur = loadout.current();
      if (cur.mag > 0) {
        cur.mag -= 1;
        p.fireT = cur.def.interval;
        if (ctx.api.audio) ctx.api.audio.shot();
        if (ctx.api.flash) ctx.api.flash(0.12);
      } else {
        p.fireT = 0.15; // dry-fire click pause
      }
    }
  });

  ctx.flags.weapons = true;
}
