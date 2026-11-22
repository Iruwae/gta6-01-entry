// SOLMAR BAY — on-foot movement. WASD/arrows walk (Shift sprints),
// heading follows the movement direction, E gets in/out of the nearest
// car. Driving itself lives in vehicles.js.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { scene, input } = ctx;
  const S = ctx.state;

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.7, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xffb347 })
  );
  mesh.position.copy(S.player.pos);
  scene.add(mesh);
  S.player.mesh = mesh;

  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of S.cars) {
      if (car.aiPolice || car.traffic) continue;
      const d = Math.hypot(car.pos.x - S.player.pos.x, car.pos.z - S.player.pos.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing' || S.cutscene) return;

    // E: get in / out.
    if (input.justPressed('KeyE')) {
      if (S.car) {
        const car = S.car;
        S.car = null;
        S.player.pos.set(car.pos.x + 2.5, 0, car.pos.z + 2.5);
        S.player.heading = car.heading;
      } else {
        const car = nearestCar(5);
        if (car) {
          S.car = car;
          S.player.pos.copy(car.pos);
        }
      }
    }

    if (S.car) {
      // Driving: the car owns the motion; the player rides along.
      S.player.pos.copy(S.car.pos);
      S.player.heading = S.car.heading;
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    let mx = 0;
    let mz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) mz -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) mz += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
    if (mx === 0 && mz === 0) {
      S.player.vel.set(0, 0, 0);
    } else {
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speed = sprint ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
      S.player.pos.x += mx * speed * dt;
      S.player.pos.z += mz * speed * dt;
      S.player.pos.x = Math.max(-260, Math.min(260, S.player.pos.x));
      S.player.pos.z = Math.max(-260, Math.min(260, S.player.pos.z));
      S.player.heading = Math.atan2(mx, mz);
      S.player.vel.set(mx * speed, 0, mz * speed);
    }
    mesh.position.copy(S.player.pos);
    mesh.position.y = 0.85;
    mesh.rotation.y = S.player.heading;
  });

  ctx.flags.player = true;
}
