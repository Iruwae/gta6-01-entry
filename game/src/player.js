// On-foot movement + getting in/out of cars (E). Driving lives in vehicles.js.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S, input } = ctx;
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.7 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.7 });
  const legsMat = new THREE.MeshStandardMaterial({ color: 0x2a2a44, roughness: 0.8 });
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), bodyMat);
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), headMat);
  head.position.y = 1.75;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.35), legsMat);
  legs.position.y = 0.3;
  group.add(legs);
  group.position.copy(S.player.pos);
  scene.add(group);
  S.player.mesh = group;

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    // E: get in / out of the nearest car.
    if (input.wasPressed('KeyE')) {
      if (S.car) {
        const car = S.car;
        S.car = null;
        S.player.pos.set(car.pos.x + 2.5, 0, car.pos.z + 2.5);
        S.player.vel.set(0, 0, 0);
      } else {
        let best = null;
        let bestD = 6;
        for (const car of S.cars) {
          if (car.aiPolice) continue;
          const dx = car.pos.x - S.player.pos.x;
          const dz = car.pos.z - S.player.pos.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < bestD) {
            bestD = d;
            best = car;
          }
        }
        if (best) {
          S.car = best;
          S.player.pos.copy(best.pos);
          S.player.heading = best.heading;
        }
      }
    }
    if (S.car) {
      // Riding: hide the walker, it rides inside the car.
      S.player.mesh.visible = false;
      S.player.pos.copy(S.car.pos);
      return;
    }
    S.player.mesh.visible = true;
    const fwd = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0)
      - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
    const strafe = (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0)
      - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0);
    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = sprint ? CONFIG.playerSprintSpeed : CONFIG.playerWalkSpeed;
    let mx = strafe;
    let mz = -fwd;
    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 0) {
      mx /= len;
      mz /= len;
      S.player.pos.x += mx * speed * dt;
      S.player.pos.z += mz * speed * dt;
      S.player.pos.x = Math.max(-210, Math.min(210, S.player.pos.x));
      S.player.pos.z = Math.max(-210, Math.min(210, S.player.pos.z));
      S.player.heading = Math.atan2(mx, mz);
      S.player.vel.set(mx * speed, 0, mz * speed);
    } else {
      S.player.vel.set(0, 0, 0);
    }
    S.player.mesh.position.copy(S.player.pos);
    S.player.mesh.rotation.y = S.player.heading;
  });
}

export default init;
