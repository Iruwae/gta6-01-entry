// Game feel: screen shake + hit flashes + the toast helper.
export function init(ctx) {
  ctx.shake = 0;
  ctx.api.shake = (amt) => {
    ctx.shake = Math.max(ctx.shake, amt || 0.3);
  };
  ctx.updates.push((dt) => {
    const canvas = ctx.renderer ? ctx.renderer.domElement : null;
    if (!canvas) return;
    if (ctx.shake > 0.01) {
      const s = ctx.shake * 8;
      canvas.style.transform = `translate(${(Math.random() - 0.5) * s}px, ${(Math.random() - 0.5) * s}px)`;
      ctx.shake = Math.max(0, ctx.shake - dt * 1.5);
    } else if (canvas.style.transform) {
      canvas.style.transform = '';
    }
  });
}

export default init;
