// SOLMAR BAY — game feel (round 9 rebuild, builder B / world).
// The shared juice box: screen shake, hit flashes and the toast helper
// other modules call. Shake is applied as a CSS translate on the game
// canvas so it never fights the camera controller, and a toast is only
// ever hidden by the module that set it. Written fresh from the build
// contract; no other game module is imported.

export function init(ctx) {
  const S = ctx.state || ctx.S;
  let shakeMag = 0;
  let flashA = 0;
  let toastTimer = null;

  function domEl(id) {
    return (ctx.dom && ctx.dom[id]) || document.getElementById(id);
  }

  function toast(msg, ms = 2600) {
    const el = domEl('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      // Only hide it if nobody else has claimed the toast since.
      if (el.textContent === msg) el.classList.add('hidden');
      toastTimer = null;
    }, ms);
  }

  function shake(mag) {
    shakeMag = Math.max(shakeMag, mag || 0);
  }

  function flash(color, strength) {
    const el = domEl('flash');
    if (!el) return;
    el.style.background = color || '#ffffff';
    el.style.opacity = String(strength == null ? 0.55 : strength);
    flashA = strength == null ? 0.55 : strength;
  }

  ctx.api.toast = toast;
  ctx.api.juice = { toast, shake, flash };
  if (S) S.juice = ctx.api.juice;

  ctx.updates.push((dt) => {
    const cv = ctx.renderer && ctx.renderer.domElement;
    if (shakeMag > 0.05) {
      if (cv) {
        const ox = (Math.random() * 2 - 1) * shakeMag;
        const oy = (Math.random() * 2 - 1) * shakeMag;
        cv.style.transform =
          'translate(' + ox.toFixed(1) + 'px, ' + oy.toFixed(1) + 'px)';
      }
      shakeMag *= Math.max(0, 1 - dt * 5);
    } else if (shakeMag !== 0) {
      shakeMag = 0;
      if (cv) cv.style.transform = '';
    }
    if (flashA > 0.01) {
      flashA *= Math.max(0, 1 - dt * 3);
      const el = domEl('flash');
      if (el) el.style.opacity = String(Math.max(0, flashA));
    }
  });
}
