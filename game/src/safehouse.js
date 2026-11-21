// safehouse.js — SOLMAR BAY safehouse rest.
// H rests at the safehouse: full health, and the heat cools down. The
// rest only works when the player is actually at the safehouse door.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  const HOME = { x: 120, z: -120 };

  function toast(msg) {
    if (ctx.api && ctx.api.toast) ctx.api.toast(msg, 4000);
    else { const el = $('toast'); if (el) el.textContent = msg; }
  }

  function nearHome() {
    const p = S.player && S.player.pos;
    if (!p) return false;
    const dx = (p.x || 0) - HOME.x;
    const dz = (p.z || 0) - HOME.z;
    return Math.sqrt(dx * dx + dz * dz) < 14;
  }

  function rest() {
    if (S.player) S.player.health = 100;
    S.health = 100;
    S.heat = Math.max(0, (S.heat || 0) - 60);
    toast('Rested at the safehouse. HP full, heat cooled off.');
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyH') return;
    if (S.mode !== 'playing') return;
    if (nearHome()) rest();
    else toast('Go to the safehouse to rest.');
  });

  ctx.api = ctx.api || {};
  ctx.api.safehouse = { rest, nearHome };
  S.safehouseDirector = ctx.api.safehouse;
}
