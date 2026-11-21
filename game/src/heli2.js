// heli2.js — the police helicopter. It shows up once the wanted level
// hits 3 stars, circles overhead above the player, and leaves (S.heli
// back to null) as soon as the heat drops below 3.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  let angle = 0;
  let rotor = null;

  function spawnHeli() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1d2a44, roughness: 0.4, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.2, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.4), bodyMat);
    group.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.2), glassMat);
    nose.position.set(0, -0.1, 2.4);
    group.add(nose);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.0), bodyMat);
    tail.position.set(0, 0.3, -3.8);
    group.add(tail);
    rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    rotor.position.y = 1.0;
    group.add(rotor);
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    for (const x of [-0.9, 0.9]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3.4), skidMat);
      skid.position.set(x, -0.9, 0);
      group.add(skid);
    }
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4444 })
    );
    light.position.set(0, -0.9, 1.5);
    group.add(light);
    if (scene) scene.add(group);
    const heli = {
      pos: new THREE.Vector3(S.player.pos.x, 28, S.player.pos.z),
      mesh: group,
      kind: 'heli',
    };
    group.position.copy(heli.pos);
    S.heli = heli;
    return heli;
  }

  function removeHeli() {
    if (!S.heli) return;
    if (scene && S.heli.mesh) scene.remove(S.heli.mesh);
    S.heli = null;
  }

  if (ctx.api) {
    ctx.api.spawnHeli = spawnHeli;
    ctx.api.removeHeli = removeHeli;
  }

  (ctx.updates || []).push((dt, t) => {
    if (!S || !S.player || !S.player.pos) return;
    const wanted = typeof S.wanted === 'number' ? S.wanted : 0;
    if (S.mode === 'playing' && wanted >= 3) {
      if (!S.heli) spawnHeli();
    } else if (S.heli && wanted < 3) {
      removeHeli();
      return;
    }
    if (!S.heli) return;
    // Slow orbit above the player, spotlight-style, always in view.
    angle += dt * 0.35;
    const px = S.player.pos.x;
    const pz = S.player.pos.z;
    S.heli.pos.set(px + Math.cos(angle) * 18, 28, pz + Math.sin(angle) * 18);
    if (S.heli.mesh) {
      S.heli.mesh.position.copy(S.heli.pos);
      S.heli.mesh.rotation.y = Math.atan2(px - S.heli.pos.x, pz - S.heli.pos.z);
      if (rotor) rotor.rotation.y += dt * 18;
    }
  });
}
