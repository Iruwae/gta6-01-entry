// SOLMAR BAY — juice.js
// Original open-world crime game for make.fun gta6-01. All code written
// from scratch in this session. No Rockstar / GTA assets, no network use.
// Game feel: pooled particles, floating damage numbers, trauma-based
// screen shake, and hit-stop.
//
// Contract with the main loop:
//  - Call fx.update(dt) every frame with the RAW frame dt (before any
//    hit-stop scaling) so hit-stop and trauma decay in real time.
//  - Scale the game dt by fx.timeScale (0.05 during a stop, else 1).
//  - Add fx.shakeOffset(dt) to the camera position AFTER smooth follow.
// Shake uses summed sines under a decaying trauma value (game-feel skill),
// never a per-frame random buzz; trauma^2 makes light hits barely move
// the camera and heavy hits punch.

import * as THREE from 'three';

const POOL = 300;

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.trauma = 0;
    this.hitStopT = 0;
    this._t = 0;
    this._cursor = 0;
    this.numbers = [];

    this.positions = new Float32Array(POOL * 3);
    this.colors = new Float32Array(POOL * 3);
    this.velocities = new Float32Array(POOL * 3);
    this.life = new Float32Array(POOL);
    this.maxLife = new Float32Array(POOL);
    for (let i = 0; i < POOL; i++) this.positions[i * 3 + 1] = -999; // parked
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.PointsMaterial({
      size: 0.35, vertexColors: true, transparent: true,
      opacity: 0.95, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(pos, color, n = 20, speed = 6, life = 0.6, size = 1, up = 2) {
    const c = new THREE.Color(color);
    const count = Math.min(n, POOL);
    for (let i = 0; i < count; i++) {
      const idx = this._cursor;
      this._cursor = (this._cursor + 1) % POOL;
      const i3 = idx * 3;
      this.positions[i3] = pos.x;
      this.positions[i3 + 1] = (pos.y || 0) + 0.5;
      this.positions[i3 + 2] = pos.z;
      // Random direction on a sphere, biased upward.
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = speed * (0.4 + Math.random() * 0.8) * (0.7 + 0.3 * size);
      this.velocities[i3] = Math.sin(ph) * Math.cos(th) * sp;
      this.velocities[i3 + 1] = Math.abs(Math.cos(ph)) * sp * 0.7 + up * Math.random();
      this.velocities[i3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
      const l = life * (0.6 + Math.random() * 0.8);
      this.life[idx] = l;
      this.maxLife[idx] = l;
      this.colors[i3] = c.r;
      this.colors[i3 + 1] = c.g;
      this.colors[i3 + 2] = c.b;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  smoke(pos) {
    // Grey, slow, rising — a damaged car smoulders rather than pops.
    this.burst(pos, 0x888888, 6, 1.0, 1.4, 1, 2.5);
  }

  damageNumber(pos, text, color = '#ffffff') {
    if (this.numbers.length > 24) {
      const old = this.numbers.shift();
      this._disposeNumber(old);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 56px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, 128, 64);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(pos.x, (pos.y || 0) + 0.6, pos.z);
    sprite.scale.set(2.4, 1.2, 1);
    this.scene.add(sprite);
    this.numbers.push({ sprite, life: 0.9, maxLife: 0.9 });
  }

  _disposeNumber(entry) {
    if (!entry) return;
    this.scene.remove(entry.sprite);
    if (entry.sprite.material.map) entry.sprite.material.map.dispose();
    entry.sprite.material.dispose();
  }

  addShake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  // Returns the camera offset for this frame. Decay happens in update(dt)
  // with real time so shake never freezes off-centre during hit-stop.
  shakeOffset(dt) {
    this._t += dt * 30;
    const s = this.trauma * this.trauma;
    if (s <= 0) return { x: 0, y: 0 };
    return {
      x: 0.5 * s * Math.sin(this._t * 1.7),
      y: 0.35 * s * Math.sin(this._t * 2.3),
    };
  }

  hitStop(ms) {
    // Newest call wins; the countdown in update() restores time.
    this.hitStopT = Math.max(this.hitStopT, ms / 1000);
  }

  get timeScale() {
    return this.hitStopT > 0 ? 0.05 : 1;
  }

  update(dt) {
    if (dt <= 0) return;
    // Hit-stop counts down in real time (a scaled dt would freeze it).
    this.hitStopT = Math.max(0, this.hitStopT - dt);
    this.trauma = Math.max(0, this.trauma - 1.2 * dt);

    // Particles.
    let anyAlive = false;
    for (let i = 0; i < POOL; i++) {
      if (this.life[i] <= 0) continue;
      anyAlive = true;
      this.life[i] -= dt;
      const i3 = i * 3;
      if (this.life[i] <= 0) {
        this.positions[i3 + 1] = -999;
        this.velocities[i3] = 0;
        this.velocities[i3 + 1] = 0;
        this.velocities[i3 + 2] = 0;
        continue;
      }
      this.velocities[i3 + 1] -= 4 * dt; // light gravity
      this.velocities[i3] *= (1 - 1.2 * dt);
      this.velocities[i3 + 2] *= (1 - 1.2 * dt);
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;
      if (this.positions[i3 + 1] < 0.02) {
        this.positions[i3 + 1] = 0.02;
        this.velocities[i3 + 1] = Math.abs(this.velocities[i3 + 1]) * 0.3;
      }
    }
    if (anyAlive) {
      this.points.geometry.attributes.position.needsUpdate = true;
    }

    // Damage numbers: rise + fade, then dispose.
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const entry = this.numbers[i];
      entry.life -= dt;
      entry.sprite.position.y += dt * 1.6;
      entry.sprite.material.opacity = Math.max(0, entry.life / entry.maxLife);
      if (entry.life <= 0) {
        this.numbers.splice(i, 1);
        this._disposeNumber(entry);
      }
    }
  }
}
