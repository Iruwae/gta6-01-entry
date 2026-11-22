// Lena Cruz, getaway driver. Parked out of sight until a crew job calls
// her in (mission 5), then she follows the player on foot, fights beside
// them, and talks. Owns the banter director the game uses (say / raceWin /
// pickup / heatUp with a 9 game-second cooldown; toast format `SPEAKER: "text"`).
import { BANTER_LINES } from './banter.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.1, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xff7a9e }),
  );
  body.position.y = 0.9;
  mesh.add(body);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x2a1a3a }),
  );
  head.position.y = 1.7;
  mesh.add(head);
  mesh.visible = false;
  mesh.position.set(-90, 0, -70);
  scene.add(mesh);
  S.crew.mesh = mesh;

  const toast = ctx.api.toast;
  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      toast(`${speaker}: "${text}"`);
      this._cooldown = 9;
      return true;
    },
    raceWin() {
      const [s, t] = BANTER_LINES.raceWin[Math.floor(Math.random() * BANTER_LINES.raceWin.length)];
      return this.say(s, t);
    },
    pickup() {
      const [s, t] = BANTER_LINES.pickup[Math.floor(Math.random() * BANTER_LINES.pickup.length)];
      return this.say(s, t);
    },
    heatUp() {
      const [s, t] = BANTER_LINES.heatUp[Math.floor(Math.random() * BANTER_LINES.heatUp.length)];
      return this.say(s, t);
    },
  };

  ctx.updates.push((dt) => {
    if (S.crew.active) {
      mesh.visible = true;
      const p = S.player.pos;
      const dx = p.x - mesh.position.x;
      const dz = p.z - mesh.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.5) {
        const step = Math.min(d - 2, 8 * dt);
        mesh.position.x += (dx / d) * step;
        mesh.position.z += (dz / d) * step;
        mesh.rotation.y = Math.atan2(dx, dz);
      }
    } else {
      mesh.visible = false;
    }
  });
}
