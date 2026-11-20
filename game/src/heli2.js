// SOLMAR BAY — heli2.js (round 8 rebuild, written blind from the spec)
// The police helicopter: it lifts off at 3+ wanted stars, shadows the
// player from high above, and stands down below 3 stars.
// Talks to the rest of the game only through ctx.
import * as THREE from '../vendor/three.module.min.js';

const HOVER_HEIGHT = 42;

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;

  // One helicopter, built once and parked out of sight until it is needed.
  const heli = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x27313d,
    roughness: 0.5,
    metalness: 0.3,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 5.2), bodyMat);
  heli.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.2), bodyMat);
  tail.position.set(0, 0.2, -4.4);
  heli.add(tail);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.9, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.2, metalness: 0.6 })
  );
  glass.position.set(0, 0.2, 2.2);
  heli.add(glass);
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x14181f });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  rotor.position.y = 1.0;
  heli.add(rotor);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfff2b0,
      emissive: 0xffe9a0,
      emissiveIntensity: 1.2,
    })
  );
  lamp.position.set(0, -0.9, 1.5);
  heli.add(lamp);
  heli.visible = false;

  const target = new THREE.Vector3();

  ctx.updates.push((dt) => {
    if (S.mode && S.mode !== 'playing') return;
    const wanted = S.wanted || 0;

    if (wanted >= 3 && !S.heli) {
      S.heli = {
        pos: new THREE.Vector3(S.player.pos.x, HOVER_HEIGHT, S.player.pos.z),
        mesh: heli,
        rotor,
      };
      scene.add(heli);
      heli.visible = true;
    } else if (wanted < 3 && S.heli) {
      scene.remove(heli);
      heli.visible = false;
      S.heli = null;
    }

    if (S.heli) {
      // Ease overhead and hold station above the player.
      target.set(S.player.pos.x, HOVER_HEIGHT, S.player.pos.z);
      S.heli.pos.lerp(target, Math.min(1, dt * 1.4));
      heli.position.copy(S.heli.pos);
      heli.rotation.y += dt * 0.4;
      rotor.rotation.y += dt * 22;
    }
  });
}
