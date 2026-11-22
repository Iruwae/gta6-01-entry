// SOLMAR BAY — police helicopter. Appears once wanted hits 3 stars,
// circles overhead above the player, and leaves (S.heli back to null)
// as soon as wanted drops below 3.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state;
  const { scene } = ctx;
  let angle = 0;

  function spawnHeli() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 5.0),
      new THREE.MeshLambertMaterial({ color: 0x2a3a55 })
    );
    group.add(body);
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.12, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xcccccc })
    );
    rotor.position.y = 1.0;
    group.add(rotor);
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    light.position.set(0, -0.9, 1.5);
    group.add(light);
    scene.add(group);
    S.heli = { pos: new THREE.Vector3(0, 38, 0), mesh: group, rotor };
  }

  function removeHeli() {
    if (S.heli && S.heli.mesh) scene.remove(S.heli.mesh);
    S.heli = null;
  }

  ctx.updates.push((dt) => {
    if (S.wanted >= 3) {
      if (!S.heli) spawnHeli();
      angle += dt * 0.35;
      S.heli.pos.set(
        S.player.pos.x + Math.cos(angle) * 22,
        38,
        S.player.pos.z + Math.sin(angle) * 22
      );
      if (S.heli.mesh) {
        S.heli.mesh.position.copy(S.heli.pos);
        S.heli.mesh.rotation.y = -angle;
        if (S.heli.rotor) S.heli.rotor.rotation.y += dt * 18;
      }
    } else if (S.heli) {
      removeHeli();
    }
  });

  ctx.flags.heli2 = true;
}
