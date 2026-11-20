import * as THREE from '../vendor/three.module.min.js';

// SOLMAR BAY — the light post pipeline. No composer, no example
// modules (nothing offline to import): ACES tone mapping on the
// renderer, a shared radial glow texture for lamp halos and the heli
// spotlight, a CSS vignette, and a tiny flash helper for hits and
// cutscene punches.
export function init(S) {
  const renderer = S.renderer;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,224,160,0.55)');
  grad.addColorStop(0.65, 'rgba(255,200,120,0.16)');
  grad.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const glowTexture = new THREE.CanvasTexture(c);
  S.glowTexture = glowTexture;

  if (!document.getElementById('vignette')) {
    const v = document.createElement('div');
    v.id = 'vignette';
    document.body.appendChild(v);
  }
  if (!document.getElementById('flash')) {
    const f = document.createElement('div');
    f.id = 'flash';
    document.body.appendChild(f);
  }

  S.postfx = {
    glowTexture,
    setExposure(e) {
      renderer.toneMappingExposure = e;
    },
    flash(color, ms) {
      const el = document.getElementById('flash');
      if (!el) return;
      el.style.background = color || 'rgba(255,240,200,0.85)';
      el.style.opacity = '0.85';
      window.setTimeout(() => {
        el.style.opacity = '0';
      }, ms || 130);
    },
    makeGlow(color, scale) {
      const m = new THREE.SpriteMaterial({
        map: glowTexture,
        color: color || 0xffc27a,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const s = new THREE.Sprite(m);
      s.scale.set(scale || 6, scale || 6, 1);
      return s;
    },
  };
  return S.postfx;
}
