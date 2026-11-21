// SOLMAR BAY — game feel. Screen shake (a quick CSS translate on the
// game canvas), hit flashes (the #flash overlay) and the toast helper
// other modules call. A toast is only replaced by a newer toast — the
// boot hub's showToast owns that token, this module just exposes it.
export function init(ctx) {
  const { dom } = ctx;
  let shaking = 0;
  ctx.api.shake = (mag = 6) => {
    shaking = Math.max(shaking, mag);
  };
  // The #flash overlay pulse itself lives in the boot hub (ctx.api.flash);
  // this module only adds shake on top of it.
  ctx.updates.push((dt) => {
    if (shaking <= 0) return;
    const canvas = dom['game-container'] ? dom['game-container'].querySelector('canvas') : null;
    if (canvas) {
      const x = (Math.random() - 0.5) * shaking;
      const y = (Math.random() - 0.5) * shaking;
      canvas.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
    shaking *= Math.max(0, 1 - dt * 8);
    if (shaking < 0.4) {
      shaking = 0;
      if (canvas) canvas.style.transform = '';
    }
  });
}
