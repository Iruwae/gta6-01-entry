// SOLMAR BAY — Lena Cruz, getaway driver. Parked out of sight until a
// crew job calls her in (mission 5), then she follows the player on foot,
// fights beside them, and talks. This module owns the banter director the
// smoke test exercises (say/raceWin/pickup/heatUp, 9 game-second cooldown,
// toast format `SPEAKER: "text"`).
import * as THREE from '../vendor/three.module.min.js';

const LINES = {
  raceWin: [
    ['LENA', 'See that? Told you the bay was ours tonight.'],
    ['LENA', 'Clean win. Vic is going to love this.'],
    ['VIC', 'That is how you drive a getaway. Beautiful.'],
  ],
  pickup: [
    ['LENA', 'Package is ours. Do not stop for anybody.'],
    ['VIC', 'Good hands. Bring it home.'],
    ['LENA', 'One more for the crew. Keep moving.'],
  ],
  heatUp: [
    ['LENA', 'Cops on us — drive like you mean it!'],
    ['VIC', 'Heat is rising. Lose them before the bridge.'],
    ['LENA', 'They are gaining. Floor it!'],
  ],
};

export function init(ctx) {
  const { scene, state: S } = ctx;

  // The live banter director (installed after banter.js, so this one stays).
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      ctx.api.toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    raceWin() { const [s, t] = LINES.raceWin[Math.floor(Math.random() * LINES.raceWin.length)]; return this.say(s, t); },
    pickup() { const [s, t] = LINES.pickup[Math.floor(Math.random() * LINES.pickup.length)]; return this.say(s, t); },
    heatUp() { const [s, t] = LINES.heatUp[Math.floor(Math.random() * LINES.heatUp.length)]; return this.say(s, t); },
  };

  ctx.updates.push((dt) => {
    if (!S.crew.active) return;
    if (S.crew.mesh) {
      if (!S.crew.mesh.parent) scene.add(S.crew.mesh);
      S.crew.mesh.visible = true;
      if (S.mode === 'playing') {
        // Follow the player on foot, a couple of metres behind.
        const px = S.player.pos.x;
        const pz = S.player.pos.z;
        const tx = px - Math.sin(S.player.heading) * 2.5;
        const tz = pz - Math.cos(S.player.heading) * 2.5;
        const dx = tx - S.crew.mesh.position.x;
        const dz = tz - S.crew.mesh.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.4) {
          const step = Math.min(d, 8 * dt);
          S.crew.mesh.position.x += (dx / d) * step;
          S.crew.mesh.position.z += (dz / d) * step;
          S.crew.mesh.position.y = Math.abs(Math.sin(performance.now() / 130)) * 0.05;
        }
      }
    }
  });
  ctx.crewReady = true;
}
