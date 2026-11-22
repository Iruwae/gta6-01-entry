// On-foot movement + getting in/out of cars (E). Driving lives in vehicles.js.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S, input } = ctx;
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.1, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xff7a9e }),
  );
  body.position.y = 0.9;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xf2c89b }),
  );
  head.position.y = 1.7;
  mesh.add(body);
  mesh.add(head);
  mesh.position.set(S.player.pos.x, 0, S.player.pos.z);
  scene.add(mesh);
  S.player.mesh = mesh;

  ctx.updates.push((dt) => {
    const p = S.player;
    if (input.wasPressed('KeyE')) {
      if (S.car) {
        p.pos.set(S.car.pos.x + 2, 0, S.car.pos.z + 2);
        S.car = null;
      } else {
        let best = null;
        let bestD = 16; // 4 m
        for (const c of S.cars) {
          if (c.aiPolice) continue;
          const dx = c.pos.x - p.pos.x;
          const dz = c.pos.z - p.pos.z;
          const d = dx * dx + dz * dz;
          if (d < bestD) { bestD = d; best = c; }
        }
        if (best) {
          S.car = best;
          p.pos.set(best.pos.x, 0, best.pos.z);
          p.heading = best.heading;
        }
      }
    }
    if (S.car) { mesh.visible = false; return; }
    mesh.visible = true;
    let fx = 0;
    let fz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) fz -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) fz += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) fx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) fx += 1;
    const len = Math.hypot(fx, fz);
    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = sprint ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
    if (len > 0) {
      fx /= len;
      fz /= len;
      p.heading = Math.atan2(fx, fz);
      p.pos.x += fx * speed * dt;
      p.pos.z += fz * speed * dt;
      p.speed = speed;
    } else {
      p.speed = 0;
    }
    mesh.position.set(p.pos.x, 0, p.pos.z);
    mesh.rotation.y = p.heading;
  });
}
