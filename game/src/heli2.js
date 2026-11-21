// SOLMAR BAY — police helicopter. Appears at 3+ stars, circles overhead,
// leaves as soon as wanted drops below 3.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { scene, state: S } = ctx;
  let angle = 0;

  function makeHeliMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 4.2),
      new THREE.MeshStandardMaterial({ color: 0x2244cc, roughness: 0.4, metalness: 0.4 }),
    );
    g.add(body);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x2244cc, roughness: 0.4, metalness: 0.4 }),
    );
    tail.position.set(0, 0.2, -3.4);
    g.add(tail);
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.08, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xdddddd }),
    );
    rotor.position.y = 0.9;
    g.add(rotor);
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    light.position.set(0, -0.8, 1.6);
    g.add(light);
    g.userData.rotor = rotor;
    return g;
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    if (S.wanted >= 3 && !S.heli) {
      const mesh = makeHeliMesh();
      mesh.position.set(S.player.pos.x + 18, 28, S.player.pos.z);
      scene.add(mesh);
      S.heli = { pos: mesh.position, mesh };
      ctx.api.toast('Police helicopter overhead!');
    } else if (S.wanted < 3 && S.heli) {
      scene.remove(S.heli.mesh);
      S.heli = null;
    }
    if (S.heli) {
      angle += dt * 0.5;
      const px = S.player.pos.x;
      const pz = S.player.pos.z;
      S.heli.pos.set(px + Math.cos(angle) * 18, 28, pz + Math.sin(angle) * 18);
      S.heli.mesh.rotation.y = -angle;
      if (S.heli.mesh.userData.rotor) S.heli.mesh.userData.rotor.rotation.y += dt * 18;
    }
  });
  ctx.heliReady = true;
}
