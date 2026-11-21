// SOLMAR BAY — on-foot movement and getting in/out of cars.
// Driving itself lives in vehicles.js.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { clamp } from './random.js';

export function init(ctx) {
  const { scene, state: S, input } = ctx;

  // The player on foot: a small amber-jacketed figure.
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 0.9 });
  const playerMesh = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), bodyMat);
  torso.position.y = 1.15;
  playerMesh.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.8 }));
  head.position.y = 1.85;
  playerMesh.add(head);
  const legGeo = new THREE.BoxGeometry(0.26, 0.7, 0.26);
  const legL = new THREE.Mesh(legGeo, darkMat);
  legL.position.set(-0.18, 0.35, 0);
  const legR = new THREE.Mesh(legGeo, darkMat);
  legR.position.set(0.18, 0.35, 0);
  playerMesh.add(legL);
  playerMesh.add(legR);
  scene.add(playerMesh);
  ctx.api.playerMesh = playerMesh;

  let walkPhase = 0;

  ctx.updates.push((dt) => {
    // E: get in / out of the nearest car.
    if (input.wasPressed('KeyE')) {
      if (S.car) {
        const car = S.car;
        S.car = null;
        S.player.pos.set(car.pos.x + 2.5, 0, car.pos.z + 2.5);
        S.player.vel.set(0, 0, 0);
        car.speed = 0;
      } else {
        let best = null;
        let bestD = 5;
        for (const car of S.cars) {
          if (car.aiPolice) continue;
          const d = Math.hypot(car.pos.x - S.player.pos.x, car.pos.z - S.player.pos.z);
          if (d < bestD) { bestD = d; best = car; }
        }
        if (best) {
          S.car = best;
          best.speed = 0;
          S.player.pos.copy(best.pos);
          S.player.heading = best.heading;
        }
      }
    }

    if (S.car) {
      playerMesh.visible = false;
      return;
    }
    playerMesh.visible = true;

    let mx = 0;
    let mz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) mz -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) mz += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
    const moving = mx !== 0 || mz !== 0;
    if (moving) {
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speed = sprint ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
      S.player.pos.x += mx * speed * dt;
      S.player.pos.z += mz * speed * dt;
      S.player.pos.x = clamp(S.player.pos.x, -190, 190);
      S.player.pos.z = clamp(S.player.pos.z, -190, 190);
      S.player.heading = Math.atan2(mx, mz);
      S.player.vel.set(mx * speed, 0, mz * speed);
      walkPhase += dt * speed * 1.4;
      legL.rotation.x = Math.sin(walkPhase) * 0.6;
      legR.rotation.x = -Math.sin(walkPhase) * 0.6;
    } else {
      S.player.vel.set(0, 0, 0);
      legL.rotation.x *= 0.8;
      legR.rotation.x *= 0.8;
    }
    playerMesh.position.copy(S.player.pos);
    playerMesh.rotation.y = S.player.heading;
  });
}
