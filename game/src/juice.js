// SOLMAR BAY — game feel: screen shake, hit flashes on the #flash overlay,
// and the toast helper other modules call. A toast is only replaced by a
// newer toast.
export function init(ctx) {
  const { dom } = ctx;
  ctx.api.flash = () => {
    const el = dom.flash;
    if (!el) return;
    el.style.opacity = '0.55';
    setTimeout(() => {
      el.style.opacity = '0';
    }, 110);
  };
  ctx.api.shake = (amt = 6) => {
    const el = dom.gameContainer;
    if (!el) return;
    el.style.transform = `translate(${(Math.random() - 0.5) * amt}px, ${(Math.random() - 0.5) * amt}px)`;
    setTimeout(() => {
      el.style.transform = '';
    }, 130);
  };
  ctx.api.juiceLoaded = true;
}

export default { init };
