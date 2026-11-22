// SOLMAR BAY — Lena Cruz, getaway driver. Parked out of sight until a
// crew job calls her in (mission 5), then she follows the player on
// foot, fights beside them, and talks. This module owns the banter
// director the game exercises: say/raceWin/pickup/heatUp with a 9
// game-second cooldown, toast format `SPEAKER: "text"`.
import * as THREE from '../vendor/three.module.min.js';
import { pick } from './random.js';

const LINES = {
  raceWin: [
    'Told you. Nobody outdrives us on this bay.',
    'That was clean. Vic is going to love this.',
    'See? Stick with me and the bay is ours.',
  ],
  pickup: [
    'Package secured. You make this look easy.',
    'Got it. Quick and quiet, just how Vic likes it.',
  ],
  heatUp: [
    'You lit the whole bay up. Cool it down, kid.',
    'Cops everywhere. Lose them before you call me.',
  ],
};

export function init(ctx) {
  const S = ctx.state;
  const { scene } = ctx;

  // The live banter director (replaces the state fallback).
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      if (ctx.api.toast) ctx.api.toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    raceWin() {
      return this.say('LENA', pick(LINES.raceWin));
    },
    pickup() {
      return this.say('LENA', pick(LINES.pickup));
    },
    heatUp() {
      const line = pick(LINES.heatUp);
      return this.say('VIC', line);
    },
  };

  // Lena's mesh: parked out of sight until a crew job calls her in.
  if (!S.crew.mesh) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.7, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xff7a9e })
    );
    mesh.visible = false;
    S.crew.mesh = mesh;
  }
  if (!S.crew.mesh.parent) scene.add(S.crew.mesh);
  S.crew.mesh.position.set(-84, 0.85, -56);

  ctx.updates.push((dt) => {
    const mesh = S.crew.mesh;
    if (!mesh) return;
    if (!S.crew.active) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    // Follow the player on foot, a couple of metres behind.
    const tx = S.player.pos.x - Math.sin(S.player.heading) * 2.2;
    const tz = S.player.pos.z - Math.cos(S.player.heading) * 2.2;
    const dx = tx - mesh.position.x;
    const dz = tz - mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.3) {
      const step = Math.min(d, 8 * dt);
      mesh.position.x += (dx / d) * step;
      mesh.position.z += (dz / d) * step;
      mesh.rotation.y = Math.atan2(dx, dz);
    }
    mesh.position.y = 0.85;
  });

  ctx.flags.crew = true;
}
