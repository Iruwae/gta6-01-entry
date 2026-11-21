// SOLMAR BAY — the player on foot: WASD movement, heading follows motion,
// E to get in/out of the nearest car.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { scene, state: S, input } = ctx;

  // Player mesh: a small hustler in an amber jacket.
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.1, 0.35),
    new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.7 }),
  );
  body.position.y = 1.0;
  mesh.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 }),
  );
  head.position.y = 1.8;
  mesh.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.7, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 }),
  );
  legs.position.y = 0.35;
  mesh.add(legs);
  mesh.position.copy(S.player.pos);
  scene.add(mesh);
  S.player.mesh = mesh;

  function nearestCar(maxD) {
    let best = null;
    let bestD = maxD;
    for (const c of S.cars) {
      if (c.aiPolice) continue;
      const d = Math.hypot(c.pos.x - S.player.pos.x, c.pos.z - S.player.pos.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') {
      mesh.position.copy(S.player.pos);
      mesh.visible = !S.car;
      return;
    }
    if (input.wasPressed('KeyE')) {
      if (S.car) {
        const car = S.car;
        S.car = null;
        S.player.pos.set(car.pos.x + 2, 0, car.pos.z + 2);
        S.player.vel.set(0, 0, 0);
        ctx.api.toast('On foot.');
      } else {
        const car = nearestCar(5);
        if (car) {
          S.car = car;
          S.player.pos.copy(car.pos);
          ctx.api.toast(`In the ${car.kind}. Drive!`);
        }
      }
    }
    if (!S.car) {
      const fwd = (input.isDown('KeyW') || input.isDown('ArrowUp')) ? 1 : 0;
      const back = (input.isDown('KeyS') || input.isDown('ArrowDown')) ? 1 : 0;
      const left = (input.isDown('KeyA') || input.isDown('ArrowLeft')) ? 1 : 0;
      const right = (input.isDown('KeyD') || input.isDown('ArrowRight')) ? 1 : 0;
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speed = sprint ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
      const dx = right - left;
      const dz = back - fwd;
      if (dx !== 0 || dz !== 0) {
        const len = Math.hypot(dx, dz);
        S.player.pos.x += (dx / len) * speed * dt;
        S.player.pos.z += (dz / len) * speed * dt;
        S.player.heading = Math.atan2(dx / len, dz / len);
        S.player.vel.set((dx / len) * speed, 0, (dz / len) * speed);
      } else {
        S.player.vel.set(0, 0, 0);
      }
      // Stay inside the city.
      S.player.pos.x = Math.max(-190, Math.min(190, S.player.pos.x));
      S.player.pos.z = Math.max(-190, Math.min(190, S.player.pos.z));
    }
    mesh.position.copy(S.player.pos);
    mesh.rotation.y = S.player.heading;
    mesh.visible = !S.car;
  });
  ctx.playerReady = true;
}
