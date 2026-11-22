// Police helicopter. Appears once wanted hits 3 stars, circles overhead
// above the player, leaves as soon as wanted drops below 3.
import { V3 } from './state.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  let angle = 0;

  ctx.updates.push((dt) => {
    if (S.wanted >= 3 && !S.heli) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x223355 }),
      );
      g.add(body);
      const rotor = new THREE.Mesh(
        new THREE.BoxGeometry(9, 0.15, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x888888 }),
      );
      rotor.position.y = 0.9;
      g.add(rotor);
      const spot = new THREE.Mesh(
        new THREE.ConeGeometry(2, 14, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xfff2b0, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
        }),
      );
      spot.position.y = -7;
      g.add(spot);
      g.position.set(S.player.pos.x, 60, S.player.pos.z);
      scene.add(g);
      S.heli = { pos: new V3(S.player.pos.x, 60, S.player.pos.z), mesh: g, rotor };
    } else if (S.wanted < 3 && S.heli) {
      scene.remove(S.heli.mesh);
      S.heli = null;
    }
    if (S.heli) {
      angle += dt * 0.3;
      const x = S.player.pos.x + Math.cos(angle) * 25;
      const z = S.player.pos.z + Math.sin(angle) * 25;
      const y = 55 + Math.sin(angle * 2) * 5;
      S.heli.pos.set(x, y, z);
      S.heli.mesh.position.set(x, y, z);
      S.heli.rotor.rotation.y += dt * 20;
    }
  });
}
