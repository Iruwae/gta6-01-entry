// Police helicopter: appears at 3+ stars, circles overhead, leaves below 3.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  let angle = 0;
  let rotor = null;
  ctx.updates.push((dt) => {
    if (S.wanted >= 3 && !S.heli) {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.5, metalness: 0.4 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 4.5), bodyMat);
      group.add(body);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 3.5), bodyMat);
      tail.position.set(0, 0.2, -3.6);
      group.add(tail);
      rotor = new THREE.Mesh(
        new THREE.BoxGeometry(9, 0.08, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6 })
      );
      rotor.position.y = 0.9;
      group.add(rotor);
      const spot = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 6, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
      );
      spot.position.y = -3.4;
      spot.rotation.x = Math.PI;
      group.add(spot);
      group.position.set(S.player.pos.x + 12, 30, S.player.pos.z);
      scene.add(group);
      S.heli = { pos: group.position, mesh: group };
    }
    if (S.wanted < 3 && S.heli) {
      scene.remove(S.heli.mesh);
      S.heli = null;
      rotor = null;
      return;
    }
    if (S.heli) {
      angle += dt * 0.4;
      S.heli.pos.set(
        S.player.pos.x + Math.cos(angle) * 12,
        30,
        S.player.pos.z + Math.sin(angle) * 12
      );
      if (rotor) rotor.rotation.y += dt * 9;
    }
  });
}

export default init;
