// SOLMAR BAY — on-foot movement + getting in/out of cars (E).
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;
  const input = ctx.input;

  // Player mesh: a small hustler in an amber jacket.
  const jacket = new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a077, roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.95 });
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.35), jacket);
  body.position.y = 1.2;
  mesh.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skin);
  head.position.y = 1.85;
  mesh.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.24), pants);
  legL.position.set(-0.16, 0.4, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  mesh.add(legL);
  mesh.add(legR);
  mesh.position.copy(S.player.pos);
  scene.add(mesh);
  ctx.playerMesh = mesh;
  S.player.mesh = mesh;

  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of S.cars) {
      if (car.aiPolice) continue;
      const d = Math.hypot(car.pos.x - S.player.pos.x, car.pos.z - S.player.pos.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    // E: get in / out of a car.
    if (input.wasPressed('KeyE')) {
      if (S.car) {
        const car = S.car;
        S.car = null;
        S.player.pos.set(car.pos.x - Math.sin(car.heading) * 3, 0, car.pos.z - Math.cos(car.heading) * 3);
        mesh.visible = true;
        ctx.api.toast('Out of the car.');
      } else {
        const car = nearestCar(5);
        if (car) {
          S.car = car;
          mesh.visible = false;
          ctx.api.toast(`In the ${car.kind}. Drive safe — or don't.`);
        }
      }
    }
    if (S.car) {
      mesh.position.copy(S.car.pos);
      return; // driving lives in vehicles.js
    }
    // On-foot movement: WASD / arrows, heading follows movement.
    const fwd = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0)
      - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
    const strafe = (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0)
      - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0);
    if (fwd !== 0 || strafe !== 0) {
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speed = sprint ? CONFIG.player.sprintSpeed : CONFIG.player.walkSpeed;
      // Move relative to the camera-facing heading: forward is -Z on screen,
      // so use the player's heading as the facing direction.
      const mx = Math.sin(S.player.heading) * fwd + Math.cos(S.player.heading) * strafe;
      const mz = Math.cos(S.player.heading) * fwd - Math.sin(S.player.heading) * strafe;
      const len = Math.hypot(mx, mz) || 1;
      S.player.pos.x += (mx / len) * speed * dt;
      S.player.pos.z += (mz / len) * speed * dt;
      S.player.heading = Math.atan2(mx, mz);
      S.player.pos.x = Math.max(-185, Math.min(185, S.player.pos.x));
      S.player.pos.z = Math.max(-185, Math.min(185, S.player.pos.z));
    }
    mesh.position.copy(S.player.pos);
    mesh.rotation.y = S.player.heading;
    // Little walk bob.
    const moving = fwd !== 0 || strafe !== 0;
    mesh.position.y = moving ? Math.abs(Math.sin(performance.now() / 130)) * 0.06 : 0;
  });

  return { mesh, nearestCar };
}

export default init;
