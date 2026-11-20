// postfx.js — the sunset grade: vignette, sunset band, damage flash,
// and tone mapping that follows the day/night cycle.
// Other modules call ctx.api.flash(color, strength) for a hit flash;
// this module owns the overlay elements and fades them back out.
// It never touches a toast — toasts belong to the modules that set them.
// Written fresh for round 8 from the shared contract.
export function init(ctx) {
  const S = ctx.state;
  const dom = ctx.dom || {};
  const renderer = ctx.renderer;

  if (renderer && ctx.THREE) {
    renderer.toneMapping = ctx.THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  }

  let flashA = 0;
  let vignetteTouched = false;

  function showFlash(color, strength) {
    flashA = strength === undefined ? 0.55 : strength;
    const el = dom.flash;
    if (el) {
      el.style.background = color || '#ff5a3c';
      el.style.opacity = String(flashA);
    }
  }
  ctx.api.flash = showFlash;
  ctx.api.flashScreen = showFlash;
  S.postfx = { flash: showFlash };

  let t = 0;
  ctx.updates.push((dt) => {
    t += dt;
    const dn = S.dayNight;
    const n = dn ? dn.night : 0;

    // Sunset band: strongest at golden hour, gone by full night.
    const band = dom['sunset-band'];
    if (band) {
      const o = Math.max(0, 0.55 - n * 0.55);
      band.style.opacity = String(o.toFixed(2));
    }

    // Vignette: only touched when the player is hurt, so the default
    // look stays exactly as the page styled it.
    const vig = dom.vignette;
    const hp = S.player ? S.player.health : 100;
    if (vig) {
      if (hp < 50) {
        const o = 0.45 + ((50 - hp) / 50) * 0.35 + Math.sin(t * 5) * 0.05;
        vig.style.opacity = String(Math.min(0.9, Math.max(0.3, o)).toFixed(2));
        vignetteTouched = true;
      } else if (vignetteTouched) {
        vig.style.opacity = '';
        vignetteTouched = false;
      }
    }

    // Flash decay.
    if (flashA > 0) {
      flashA = Math.max(0, flashA - dt * 1.8);
      const el = dom.flash;
      if (el) el.style.opacity = String(flashA.toFixed(2));
    }

    // Exposure drifts down as night falls.
    if (renderer) renderer.toneMappingExposure = 1.12 - n * 0.3;
  });
}
