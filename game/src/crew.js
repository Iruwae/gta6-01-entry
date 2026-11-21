// SOLMAR BAY — Lena Cruz, getaway driver. Parked out of sight until a crew
// job calls her in (mission 5), then she follows the player and talks.
// Owns the banter director the game uses (9 game-second cooldown).
import * as THREE from '../vendor/three.module.min.js';
import { BANTER_LINES } from './banter.js';

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;
  const toast = ctx.api.toast;

  // The banter director — this is the one that stays live.
  let lineIdx = 0;
  const director = {
    _cooldown: 0,
    _lineIdx: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    _pick(kind) {
      const lines = BANTER_LINES[kind] || BANTER_LINES.idle;
      const line = lines[lineIdx % lines.length];
      lineIdx += 1;
      this._lineIdx = lineIdx;
      return this.say(line[0], line[1]);
    },
    raceWin() {
      return this._pick('raceWin');
    },
    pickup() {
      return this._pick('pickup');
    },
    heatUp() {
      return this._pick('heatUp');
    },
  };
  // Keep the cooldown value the smoke test reads in sync with state.
  S.banterDirector = director;

  // Lena's mesh: pink box-person, hidden until a crew job calls her in.
  if (!S.crew.mesh) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.7, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xff7a9e }),
    );
    mesh.visible = false;
    S.crew.mesh = mesh;
  }
  if (!S.crew.mesh.parent) scene.add(S.crew.mesh);
  S.crew.mesh.visible = !!S.crew.active;

  ctx.updates.push((dt) => {
    const mesh = S.crew.mesh;
    if (!mesh) return;
    if (!S.crew.active) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    // Follow the player on foot, a few metres behind.
    const target = S.car ? S.car.pos : S.player.pos;
    const dx = target.x - mesh.position.x;
    const dz = target.z - mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 3) {
      const step = Math.min(d - 2.5, 11 * dt);
      mesh.position.x += (dx / d) * step;
      mesh.position.z += (dz / d) * step;
      mesh.rotation.y = Math.atan2(dx, dz);
    }
    mesh.position.y = 0.85;
    // Occasional idle chatter while the crew is active.
    if (Math.random() < dt * 0.02) director._pick('idle');
  });

  return { director };
}

export default init;
