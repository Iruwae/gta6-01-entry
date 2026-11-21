// SOLMAR BAY — police helicopter. Appears once wanted hits 3 stars,
// circles overhead above the player, leaves as soon as wanted drops
// below 3.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { scene, state: S } = ctx;
  let angle = 0;
  let rotor = null;

  function makeHeli() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2f4a, roughness: 0.4, metalness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.15, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 4.6), bodyMat);
    group.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.2), glassMat);
    nose.position.set(0, -0.1, 2.4);
    group.add(nose);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.0), bodyMat);
    tail.position.set(0, 0.2, -4.0);
    group.add(tail);
    rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    rotor.position.y = 0.9;
    group.add(rotor);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: new THREE.Color(0xff2222), emissiveIntensity: 2 });
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), lightMat);
    light.position.set(0, -0.8, 0);
    group.add(light);
    return group;
  }

  ctx.updates.push((dt) => {
    if (S.wanted >= 3) {
      if (!S.heli) {
        const mesh = makeHeli();
        scene.add(mesh);
        S.heli = { pos: new THREE.Vector3(S.player.pos.x, 28, S.player.pos.z), mesh };
      }
      angle += dt * 0.55;
      S.heli.pos.set(
        S.player.pos.x + Math.cos(angle) * 18,
        28,
        S.player.pos.z + Math.sin(angle) * 18,
      );
      S.heli.mesh.position.copy(S.heli.pos);
      S.heli.mesh.rotation.y = -angle;
      if (rotor) rotor.rotation.y += dt * 18;
    } else if (S.heli) {
      scene.remove(S.heli.mesh);
      S.heli = null;
      rotor = null;
    }
  });
}
