// SOLMAR BAY — game feel: screen shake (CSS translate on the game
// canvas), hit flashes (the #flash overlay) and the toast helper other
// modules call. A toast is only replaced by a newer toast.
export function init(ctx) {
  const { dom } = ctx;
  let shakeT = 0;
  let shakeMag = 0;

  ctx.api.shake = function shake(mag, dur) {
    shakeMag = Math.max(shakeMag, mag || 6);
    shakeT = Math.max(shakeT, dur || 0.3);
  };
  ctx.api.flash = function flash(strength) {
    if (!dom.flash) return;
    dom.flash.style.opacity = String(Math.min(0.6, (strength || 80) / 200));
    setTimeout(() => { dom.flash.style.opacity = '0'; }, 90);
  };

  ctx.updates.push((dt) => {
    if (shakeT > 0) {
      shakeT -= dt;
      const el = ctx.renderer.domElement;
      if (el) {
        const m = shakeMag * (shakeT > 0 ? 1 : 0);
        el.style.transform = `translate(${(Math.random() - 0.5) * m}px, ${(Math.random() - 0.5) * m}px)`;
        if (shakeT <= 0) { el.style.transform = ''; shakeMag = 0; }
      }
    }
  });
  ctx.juiceReady = true;
}
