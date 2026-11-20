// SOLMAR BAY — screen juice (round 8, written fresh from the spec).
// Muzzle flash, vignette pulses and camera shake on impacts and
// explosions. Small and cheap, no gameplay logic: other modules call
// the api, this module just plays the effect and lets it decay.
export function init(ctx) {
  const S = ctx.state;
  let trauma = 0;       // 0..1 camera shake energy
  let flashA = 0;       // muzzle-flash overlay opacity 0..1
  let pulseA = 0;       // vignette pulse 0..1
  let lastOff = { x: 0, y: 0, z: 0 };

  function el(id) {
    if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  const juice = {
    get trauma() { return trauma; },
    flash() { flashA = 1; },
    muzzleFlash() { flashA = 1; },
    flashMuzzle() { flashA = 1; },
    shake(amount) {
      trauma = Math.max(0, Math.min(1, trauma + (amount || 0.4)));
    },
    addShake(amount) { this.shake(amount); },
    cameraShake(amount) { this.shake(amount); },
    pulse(amount) {
      pulseA = Math.max(0, Math.min(1, pulseA + (amount || 0.6)));
    },
    vignettePulse(amount) { this.pulse(amount); },
    impact(power) {
      this.shake(0.25 + (power || 0) * 0.2);
      this.pulse(0.4);
    },
    explode(pos, power) {
      this.shake(0.55 + (power || 0) * 0.15);
      this.flash();
      this.pulse(1);
      if (S) S.lastExplosion = { x: (pos && pos.x) || 0, z: (pos && pos.z) || 0, at: Date.now() };
    },
  };

  if (S) S.juice = juice;
  ctx.api.juice = juice;
  ctx.api.cameraShake = function (a) { juice.shake(a); };
  ctx.api.muzzleFlash = function () { juice.flash(); };
  ctx.api.screenShake = juice;

  ctx.updates.push(function juiceUpdate(dt) {
    const step = Math.max(0, Math.min(dt, 0.1));
    trauma = Math.max(0, trauma - step * 1.6);
    flashA = Math.max(0, flashA - step * 5);
    pulseA = Math.max(0, pulseA - step * 1.4);

    // Muzzle flash overlay.
    try {
      const f = el('flash');
      if (f) {
        if (flashA > 0.01) f.style.opacity = String(flashA);
        else if (f.style.opacity) f.style.opacity = '';
      }
    } catch (e) { /* overlay is cosmetic */ }

    // Vignette pulse.
    try {
      const v = el('vignette');
      if (v) {
        if (pulseA > 0.01) v.style.opacity = String(0.3 + 0.7 * pulseA);
        else if (v.style.opacity) v.style.opacity = '';
      }
    } catch (e) { /* overlay is cosmetic */ }

    // Camera shake: subtract last frame's offset, add a fresh one, so
    // the offset never accumulates into a permanent drift.
    try {
      const cam = ctx.camera;
      if (cam && cam.position) {
        cam.position.x -= lastOff.x;
        cam.position.y -= lastOff.y;
        cam.position.z -= lastOff.z;
        if (trauma > 0.001) {
          const mag = trauma * trauma * 0.35;
          lastOff = {
            x: (Math.random() * 2 - 1) * mag,
            y: (Math.random() * 2 - 1) * mag * 0.6,
            z: (Math.random() * 2 - 1) * mag,
          };
          cam.position.x += lastOff.x;
          cam.position.y += lastOff.y;
          cam.position.z += lastOff.z;
        } else {
          lastOff = { x: 0, y: 0, z: 0 };
        }
      }
    } catch (e) { /* camera is owned by the follow logic; skip */ }
  });
}
