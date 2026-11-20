// safehouse.js — SOLMAR BAY safehouse.
// H rests at the safehouse: full health and cooled heat. The safehouse
// is the motel on the east edge of the map; resting only works near it.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const el = (id) => dom[id] || document.getElementById(id);

  const HOUSE = { x: 120, z: -120 };
  const REST_RADIUS = 12;
  const HEAT_DROP = 60;

  function toast(msg) {
    try {
      if (ctx.api && typeof ctx.api.toast === 'function') { ctx.api.toast(msg); return; }
    } catch (e) { /* fall through */ }
    const t = el('toast');
    if (t) t.textContent = msg;
  }

  function nearHouse() {
    const p = S.player && S.player.pos;
    if (!p) return false;
    const dx = p.x - HOUSE.x;
    const dz = p.z - HOUSE.z;
    return Math.sqrt(dx * dx + dz * dz) < REST_RADIUS;
  }

  function rest() {
    if (!S.player) return false;
    S.player.health = 100;
    S.health = 100;
    if (typeof S.heat === 'number') S.heat = Math.max(0, S.heat - HEAT_DROP);
    toast('Rested at the safehouse. Full health, heat cooled off.');
    try {
      if (ctx.api && ctx.api.audio && typeof ctx.api.audio.pickup === 'function') ctx.api.audio.pickup();
    } catch (e) { /* audio is optional */ }
    return true;
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyH') return;
    if (!S.mode || S.mode !== 'playing') return;
    if (S.cutscene) return;
    if (nearHouse()) rest();
    else toast('The safehouse is the motel on the east edge of town.');
  });

  ctx.api.safehouse = { rest, near: nearHouse, house: HOUSE };
  ctx.api.rest = rest;
}
