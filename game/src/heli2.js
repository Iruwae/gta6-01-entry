// SOLMAR BAY — police helicopter: appears at 3+ stars, circles overhead.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;
  let rotor = null;
  let angle = 0;

  function buildHeli() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.4, metalness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.5), bodyMat);
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 3.5), bodyMat);
    tail.position.set(0, 0.2, -3.6);
    g.add(tail);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9adfff, roughness: 0.1, metalness: 0.6 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.2), glassMat);
    glass.position.set(0, 0.3, 1.8);
    g.add(glass);
    rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    rotor.position.y = 1.1;
    g.add(rotor);
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const x of [-0.9, 0.9]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3.4), skidMat);
      skid.position.set(x, -0.9, 0);
      g.add(skid);
    }
    return g;
  }

  ctx.updates.push((dt, t) => {
    if (S.wanted >= 3) {
      if (!S.heli) {
        const mesh = buildHeli();
        scene.add(mesh);
        S.heli = { pos: new THREE.Vector3(0, 28, 0), mesh };
      }
      angle += dt * 0.5;
      const px = S.player.pos.x;
      const pz = S.player.pos.z;
      S.heli.pos.set(px + Math.cos(angle) * 18, 28, pz + Math.sin(angle) * 18);
      S.heli.mesh.position.copy(S.heli.pos);
      S.heli.mesh.rotation.y = -angle;
      if (rotor) rotor.rotation.y = t * 18;
    } else if (S.heli) {
      if (S.heli.mesh && S.heli.mesh.parent) S.heli.mesh.parent.remove(S.heli.mesh);
      S.heli = null;
      rotor = null;
    }
  });

  return {};
}

export default init;
