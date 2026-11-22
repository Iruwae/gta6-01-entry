// The four weapon slots. Pistol always available; SMG stays locked until
// the first job is done (missionIndex >= 1 — the unlock gate lives in the
// loadout setter in state.js). Firing spends ammo (mouse held), R reloads
// (reloadT counts down, the refill commits atomically in state.tick),
// switching sets the mag to the new weapon's magazine. Keys 1–4 switch.
export function init(ctx) {
  const { state: S, input } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    const p = S.player;
    if (input.wasPressed('Digit1')) p.loadout.equip(0);
    if (input.wasPressed('Digit2')) p.loadout.equip(1);
    if (input.wasPressed('Digit3')) p.loadout.equip(2);
    if (input.wasPressed('Digit4')) p.loadout.equip(3);
    const cur = p.loadout.current();
    if (input.wasPressed('KeyR') && !p.reloading && cur.mag < cur.def.mag) {
      p.reloading = true;
      p.reloadT = cur.def.reload;
      if (ctx.api.audio) ctx.api.audio.reload();
    }
    if (input.mouse.down && !p.reloading && p.fireT <= 0) {
      if (cur.mag > 0) {
        cur.mag -= 1;
        p.fireT = cur.def.interval;
        if (ctx.api.audio) ctx.api.audio.shot();
        ctx.api.flash();
      } else {
        p.reloading = true;
        p.reloadT = cur.def.reload;
      }
    }
  });
}
