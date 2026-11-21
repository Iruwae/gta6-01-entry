// SOLMAR BAY — game feel: screen shake (CSS translate on the game
// canvas), hit flashes (the #flash overlay) and the toast helper other
// modules call. A toast is only replaced by a newer toast (the boot hub
// owns that rule).
export function init(ctx) {
  const { renderer, api, dom } = ctx;
  let shakeTimer = null;
  api.shake = (mag = 6) => {
    const el = renderer.domElement;
    el.style.transform = `translate(${(Math.random() - 0.5) * mag}px, ${(Math.random() - 0.5) * mag}px)`;
    if (shakeTimer) clearTimeout(shakeTimer);
    shakeTimer = setTimeout(() => { el.style.transform = ''; }, 120);
  };
  api.toast = api.toast;
  ctx.api.juice = { shake: api.shake };
}
