// On-foot movement for SOLMAR BAY. WASD/arrows walk, Shift sprints,
// heading follows the movement direction. Getting in and out of cars
// (E) lives here too; driving itself lives in vehicles.js.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, state: S, input } = ctx;

  // A simple box-person for the player, amber jacket, dark trousers.
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.7, 0.4),
    new THREE.MeshBasicMaterial({ color: 0xffb347 }),
  );
  body.position.copy(S.player.pos);
  ctx.scene.add(body);
  S.player.mesh = body;

  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const car of S.cars) {
      if (car.aiPolice) continue;
      const dx = car.pos.x - S.player.pos.x;
      const dz = car.pos.z - S.player.pos.z;
      const dd = dx * dx + dz * dz;
      if (dd < bestD) {
        bestD = dd;
        best = car;
      }
    }
    return best;
  }

  function update(dt) {
    if (S.mode !== 'playing') return;

    // Getting in / out of a car.
    if (input.wasPressed('KeyE')) {
      if (S.car) {
        const car = S.car;
        S.car = null;
        S.player.pos.set(car.pos.x + 2.5, 0, car.pos.z + 2.5);
        S.player.heading = car.heading;
      } else {
        const car = nearestCar(4.5);
        if (car) {
          S.car = car;
          S.player.pos.copy(car.pos);
          S.player.heading = car.heading;
        }
      }
    }

    // On foot: the player mesh follows the feet, the car drives itself.
    if (S.car) {
      S.player.pos.copy(S.car.pos);
      S.player.heading = S.car.heading;
      body.position.copy(S.player.pos);
      body.rotation.y = S.player.heading;
      return;
    }

    let mx = 0;
    let mz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) mz += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) mz -= 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;

    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = sprint ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      // Camera-relative: forward is -z on screen, so W moves -z when the
      // camera sits behind the player. Heading 0 faces +z; the camera
      // sits at -forward, so W should move along -forward... keep the
      // simple world mapping: W = -z, S = +z, A = -x, D = +x, and the
      // heading follows the movement direction.
      const vx = mx * speed;
      const vz = -mz * speed;
      S.player.pos.x += vx * dt;
      S.player.pos.z += vz * dt;
      S.player.vel.set(vx, 0, vz);
      S.player.heading = Math.atan2(vx, vz);
    } else {
      S.player.vel.set(0, 0, 0);
    }
    S.player.pos.x = Math.max(-190, Math.min(190, S.player.pos.x));
    S.player.pos.z = Math.max(-190, Math.min(190, S.player.pos.z));
    body.position.copy(S.player.pos);
    body.rotation.y = S.player.heading;
  }

  ctx.updates.push(update);
}
