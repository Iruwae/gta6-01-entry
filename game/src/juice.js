// Game feel for SOLMAR BAY: screen shake (a CSS translate on the game
// canvas), hit flashes (the #flash overlay) and the toast helper other
// modules call. A toast is only ever replaced by a newer toast.
export function init(ctx) {
  const { dom, renderer } = ctx;
  let shakeMag = 0;

  ctx.api.shake = (mag) => {
    shakeMag = Math.max(shakeMag, mag || 6);
  };
  ctx.api.flash = ctx.api.flash || (() => {
    dom.flash.style.opacity = '0.55';
    setTimeout(() => {
      dom.flash.style.opacity = '0';
    }, 130);
  });

  ctx.updates.push((dt) => {
    if (shakeMag > 0.2) {
      const ox = (Math.random() - 0.5) * shakeMag;
      const oy = (Math.random() - 0.5) * shakeMag;
      renderer.domElement.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`;
      shakeMag *= Math.max(0, 1 - dt * 6);
    } else if (renderer.domElement.style.transform) {
      renderer.domElement.style.transform = '';
      shakeMag = 0;
    }
  });
}
