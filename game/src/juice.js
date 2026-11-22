// SOLMAR BAY — game feel. Screen shake (a CSS translate on the game
// canvas) and the toast helper other modules call. A toast is only
// replaced by a newer toast — the boot hub owns that rule.
export function init(ctx) {
  let shakeT = 0;
  let shakeMag = 0;
  ctx.api.shake = (mag) => {
    shakeMag = Math.max(shakeMag, mag || 4);
    shakeT = 0.35;
  };
  ctx.updates.push((dt) => {
    const canvas = ctx.renderer ? ctx.renderer.domElement : null;
    if (!canvas) return;
    if (shakeT > 0) {
      shakeT -= dt;
      const m = shakeMag * (shakeT / 0.35);
      canvas.style.transform = `translate(${(Math.random() - 0.5) * m}px, ${(Math.random() - 0.5) * m}px)`;
      if (shakeT <= 0) {
        canvas.style.transform = '';
        shakeMag = 0;
      }
    }
  });
  ctx.flags.juice = true;
}
