// SOLMAR BAY — Lena Cruz, getaway driver. Parked out of sight until a
// crew job calls her in (mission 5), then she follows the player on
// foot, fights beside them, and talks. Owns the banter director the
// smoke test exercises (say/raceWin/pickup/heatUp, 9 game-second
// cooldown, toast format `SPEAKER: "text"`).
import * as THREE from '../vendor/three.module.min.js';
import { makeBanterDirector } from './banter.js';

export function init(ctx) {
  const { scene, state: S, api } = ctx;

  // The live banter director: this is the one that stays.
  S.banterDirector = makeBanterDirector(api.toast);

  // Make sure Lena's mesh exists in the scene once she is called in.
  function ensureMesh() {
    if (!S.crew.mesh) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.8, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xff7a9e }),
      );
      mesh.position.copy(S.player.pos);
      S.crew.mesh = mesh;
    }
    if (!S.crew.mesh.parent) scene.add(S.crew.mesh);
  }

  let heatWarned = false;

  ctx.updates.push((dt) => {
    if (!S.crew.active) {
      if (S.crew.mesh) S.crew.mesh.visible = false;
      return;
    }
    ensureMesh();
    const mesh = S.crew.mesh;
    mesh.visible = true;
    // Follow the player on foot, a few metres behind.
    const px = S.player.pos.x;
    const pz = S.player.pos.z;
    const dx = px - mesh.position.x;
    const dz = pz - mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 3.5) {
      const step = Math.min(d - 3, 7 * dt);
      mesh.position.x += (dx / d) * step;
      mesh.position.z += (dz / d) * step;
      mesh.rotation.y = Math.atan2(dx, dz);
    }
    mesh.position.y = Math.abs(Math.sin(performance.now() * 0.004)) * 0.05;
    // She warns the player when the heat spikes.
    if (S.wanted >= 2 && !heatWarned) {
      heatWarned = true;
      S.banterDirector.heatUp();
    }
    if (S.wanted === 0) heatWarned = false;
  });
}
