// Solmar Bay — screen juice (round 7 rebuild).
// Muzzle flash, vignette pulses and camera shake on impacts and
// explosions. Deliberately tiny: a few numbers decaying each frame
// and two DOM elements fading out. No gameplay logic lives here.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const camera = ctx.camera;

  let flashA = 0;
  let shakeAmt = 0;
  let pulseA = 0;

  function flashEl() {
    return dom.flash || document.getElementById('flash');
  }
  function vignetteEl() {
    return dom.vignette || document.getElementById('vignette');
  }

  const juice = {
    flash(strength) {
      flashA = Math.max(flashA, typeof strength === 'number' ? strength : 0.85);
      const el = flashEl();
      if (el) el.style.opacity = String(Math.min(1, flashA));
    },
    muzzle() { this.flash(0.7); },
    shake(amount) {
      shakeAmt = Math.min(1.2, shakeAmt + (typeof amount === 'number' ? amount : 0.4));
    },
    cameraShake(amount) { this.shake(amount); },
    pulse(amount) {
      pulseA = Math.max(pulseA, typeof amount === 'number' ? amount : 0.5);
    },
    vignettePulse(amount) { this.pulse(amount); },
    impact(amount) {
      this.shake(typeof amount === 'number' ? amount : 0.35);
      this.pulse(0.4);
    },
    explosion() {
      this.flash(1);
      this.shake(0.9);
      this.pulse(0.8);
    },
    get shaking() { return shakeAmt; },
  };

  S.juice = juice;
  ctx.api.juice = juice;

  ctx.updates.push((dt) => {
    // Flash fades fast.
    if (flashA > 0) {
      flashA = Math.max(0, flashA - dt * 3.2);
      const el = flashEl();
      if (el) el.style.opacity = flashA > 0.01 ? String(flashA) : '';
    }
    // Vignette pulse fades, then hands the element back to its CSS.
    if (pulseA > 0) {
      pulseA = Math.max(0, pulseA - dt * 1.4);
      const el = vignetteEl();
      if (el) el.style.opacity = pulseA > 0.01 ? String(0.25 + pulseA * 0.55) : '';
    }
    // Camera shake: a small random offset that decays away.
    if (shakeAmt > 0.001 && camera) {
      shakeAmt = Math.max(0, shakeAmt - dt * 1.6);
      const s = shakeAmt * 0.35;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s * 0.6;
      if (camera.rotation) {
        camera.rotation.z += (Math.random() - 0.5) * shakeAmt * 0.02;
      }
    } else {
      shakeAmt = 0;
    }
  });
}
