// SOLMAR BAY — police helicopter. Appears at 3+ stars, circles overhead,
// leaves as soon as wanted drops below 3.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  let angle = 0;
  ctx.updates.push((dt) => {
    if (S.wanted >= 3) {
      if (!S.heli) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 1.4, 6.5),
          new THREE.MeshStandardMaterial({ color: 0x1c2f5e, metalness: 0.5, roughness: 0.4 })
        );
        group.add(body);
        const rotor = new THREE.Mesh(
          new THREE.BoxGeometry(9, 0.12, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        rotor.position.y = 1.0;
        group.add(rotor);
        const spot = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 })
        );
        spot.position.set(0, -0.9, 2.5);
        group.add(spot);
        scene.add(group);
        S.heli = { pos: new THREE.Vector3(S.player.pos.x, 45, S.player.pos.z), mesh: group, rotor };
      }
      angle += dt * 0.5;
      const px = S.player.pos.x;
      const pz = S.player.pos.z;
      S.heli.pos.set(px + Math.cos(angle) * 15, 45, pz + Math.sin(angle) * 15);
      S.heli.mesh.position.copy(S.heli.pos);
      S.heli.mesh.rotation.y = angle;
      if (S.heli.rotor) S.heli.rotor.rotation.y += dt * 18;
    } else if (S.heli) {
      if (S.heli.mesh) scene.remove(S.heli.mesh);
      S.heli = null;
    }
  });
}

export default { init };
