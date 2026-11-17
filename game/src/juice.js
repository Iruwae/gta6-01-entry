// SOLMAR BAY — game feel: hit-stop (brief sim freeze on a hit), trauma
// camera shake, red flash + vignette on damage, and floating damage numbers.
export class Juice {
  constructor(camera, flashEl, vignetteEl, fxLayer) {
    this.camera = camera;
    this.flashEl = flashEl;
    this.vignetteEl = vignetteEl;
    this.fxLayer = fxLayer;
    this.trauma = 0;
    this.hitStop = 0;
    this.shakeT = 0;
  }
  addTrauma(amount) { this.trauma = Math.min(1, this.trauma + amount); }
  freeze(seconds) { this.hitStop = Math.max(this.hitStop, seconds); }
  flash(color, opacity) {
    this.flashEl.style.background = color;
    this.flashEl.style.opacity = String(opacity);
    setTimeout(() => { this.flashEl.style.opacity = '0'; }, 90);
  }
  hurtFlash() {
    this.flash( 'rgba(200,0,0,1)', 0.35);
    this.vignetteEl.style.opacity = '0.9';
    setTimeout(() => { this.vignetteEl.style.opacity = '0'; }, 350);
  }
  damageNumber(worldPos, text, kind) {
    const el = document.createElement('div');
    el.className = 'dmgnum' + (kind ? ' ' + kind : '');
    el.textContent = text;
    const v = worldPos.clone().project(this.camera);
    if (v.z > 1) return;
    el.style.left = ((v.x + 1) / 2 * window.innerWidth) + 'px';
    el.style.top = ((-v.y + 1) / 2 * window.innerHeight) + 'px';
    this.fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 750);
  }
  // Returns the sim-time scale for this frame (0 while hit-stopped).
  update(dt) {
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return 0;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.shakeT += dt * 40;
    const s = this.trauma * this.trauma;
    if (s > 0.0001) {
      this.camera.position.x += (Math.random() - 0.5) * s * 0.9;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.7;
      this.camera.rotation.z += (Math.random() - 0.5) * s * 0.03;
    }
    return 1;
  }
}
