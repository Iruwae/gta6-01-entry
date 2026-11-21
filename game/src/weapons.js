// SOLMAR BAY — the four weapon slots. Pistol always available; SMG
// stays locked until the first job is done (missionIndex >= 1). Firing
// spends ammo (mouse held), R reloads (reloadT counts down in the state
// tick; the refill commits atomically to a full magazine when it hits
// zero), switching sets the mag to the new weapon's magazine. Keys 1-4
// switch.
export function init(ctx) {
  const { state: S, input } = ctx;

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    const p = S.player;
    for (let i = 0; i < 4; i++) {
      if (input.wasPressed('Digit' + (i + 1))) p.loadout.equip(i);
    }
    if (input.wasPressed('KeyR') && !p.reloading) {
      const cur = p.loadout.current();
      if (cur.mag < cur.def.mag) {
        p.reloading = true;
        p.reloadT = cur.def.reload;
        if (ctx.api.audio) ctx.api.audio.reload();
      }
    }
    if (input.mouse.down && p.fireT <= 0 && !p.reloading) {
      const cur = p.loadout.current();
      if (cur.mag > 0) {
        cur.mag -= 1;
        p.fireT = cur.def.interval;
        if (ctx.api.audio) ctx.api.audio.shot();
      } else {
        p.reloading = true;
        p.reloadT = cur.def.reload;
      }
    }
  });
}
