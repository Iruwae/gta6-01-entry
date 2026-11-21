// SOLMAR BAY — Lena Cruz, getaway driver. Parked out of sight until a
// crew job calls her in (mission 5), then she follows the player on
// foot, fights beside them, and talks. This module owns the banter
// director the game actually uses: say/raceWin/pickup/heatUp with a 9
// game-second cooldown, toast format `SPEAKER: "text"`.
import { BANTER_LINES } from './banter.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;

  const mesh = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.6, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xff7a9e, roughness: 0.7 }),
  );
  body.position.y = 0.9;
  mesh.add(body);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffd9b3, roughness: 0.7 }),
  );
  head.position.y = 1.95;
  mesh.add(head);
  const hair = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.3, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x2a1a3a, roughness: 0.9 }),
  );
  hair.position.y = 2.2;
  mesh.add(hair);
  mesh.visible = false;
  mesh.position.set(S.player.pos.x + 2, 0, S.player.pos.z + 2);
  scene.add(mesh);
  S.crew.mesh = mesh;
  S.crew.name = 'Lena Cruz';

  S.banterDirector = {
    _cooldown: 0,
    say(speaker, text) {
      if (this._cooldown > 0) return false;
      ctx.api.toast(`${speaker}: "${text}"`);
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
    if (!S.crew.active) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const target = S.car ? S.car.pos : S.player.pos;
    const dx = target.x - mesh.position.x;
    const dz = target.z - mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 3) {
      const step = Math.min(10 * dt, d - 2.5);
      mesh.position.x += (dx / d) * step;
      mesh.position.z += (dz / d) * step;
      mesh.rotation.y = Math.atan2(dx, dz);
    }
  });
}
