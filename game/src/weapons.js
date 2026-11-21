// SOLMAR BAY — the four weapon slots. Pistol always available; SMG stays
// locked until the first job is done. Firing spends ammo (mouse held), R
// reloads (reloadT counts down, the refill commits atomically to a full
// magazine when it hits zero), switching sets the mag to the new weapon's
// magazine. Keys 1-4 switch.
export function init(ctx) {
  const { state: S, input, api } = ctx;
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    const p = S.player;
    for (let i = 0; i < 4; i++) {
      if (input.wasPressed('Digit' + (i + 1))) {
        const ok = p.loadout.equip(i);
        if (ok) {
          api.toast(`${p.loadout.current().def.name} equipped.`);
        } else {
          api.toast(`${S.player.loadout.slots[i].def.name} is locked — finish more jobs.`);
        }
      }
    }
    const slot = p.loadout.current();
    if (input.wasPressed('KeyR') && !p.reloading && slot.mag < slot.def.mag) {
      p.reloading = true;
      p.reloadT = slot.def.reload;
      if (api.audio) api.audio.reload();
    }
    if (input.mouse.down && !p.reloading && p.fireT <= 0) {
      if (slot.mag > 0) {
        slot.mag -= 1;
        p.fireT = slot.def.interval;
        if (api.audio) api.audio.shot();
        if (api.flash) api.flash();
      } else {
        p.reloading = true;
        p.reloadT = slot.def.reload;
      }
    }
  });
  ctx.api.weaponsLoaded = true;
}

export default { init };
