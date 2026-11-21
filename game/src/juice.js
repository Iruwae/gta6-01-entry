// SOLMAR BAY — game feel: screen shake, hit flashes, toast helper.
// A toast is only replaced by a newer toast (the boot hub owns showToast).
export function init(ctx) {
  const dom = ctx.dom;
  let shakeAmount = 0;

  ctx.api.flash = (opacity = 80) => {
    const el = dom.flash;
    if (!el) return;
    el.style.opacity = String(Math.min(1, opacity / 100));
    setTimeout(() => {
      el.style.opacity = '0';
    }, 90);
  };

  ctx.api.shake = (amount) => {
    shakeAmount = Math.max(shakeAmount, amount);
  };

  ctx.updates.push((dt) => {
    const canvas = ctx.renderer.domElement;
    if (shakeAmount > 0.2) {
      const x = (Math.random() - 0.5) * shakeAmount;
      const y = (Math.random() - 0.5) * shakeAmount;
      canvas.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      shakeAmount *= Math.max(0, 1 - 6 * dt);
    } else if (canvas.style.transform) {
      canvas.style.transform = '';
      shakeAmount = 0;
    }
  });

  return {};
}

export default init;
