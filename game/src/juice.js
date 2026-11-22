// Game feel: screen shake (CSS translate on the game canvas) and the
// hit-flash helper lives in the boot hub (ctx.api.flash). A toast is only
// replaced by a newer toast (see main.js).
export function init(ctx) {
  let shakeT = 0;
  ctx.api.shake = () => { shakeT = 0.25; };
  ctx.updates.push((dt) => {
    if (shakeT > 0) {
      shakeT -= dt;
      const el = ctx.dom['game-container'];
      if (shakeT > 0) {
        el.style.transform = `translate(${(Math.random() * 6 - 3).toFixed(1)}px, ${(Math.random() * 6 - 3).toFixed(1)}px)`;
      } else {
        el.style.transform = '';
      }
    }
  });
}
