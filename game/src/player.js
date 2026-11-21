// SOLMAR BAY — the player on foot. WASD/arrows walk (Shift sprints),
// heading follows movement, E gets into the nearest car. Driving itself
// lives in vehicles.js; this module only moves the player and syncs the
// little amber box-person mesh that stands in for them.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S, input } = ctx;

  const mesh = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.7, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.7 }),
  );
  body.position.y = 0.95;
  mesh.add(body);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffd9b3, roughness: 0.7 }),
  );
  head.position.y = 2.05;
  mesh.add(head);
  mesh.position.copy(S.player.pos);
  scene.add(mesh);
  S.player.mesh = mesh;

  ctx.updates.push((dt) => {
    // Keep the mesh on the player (or hidden while driving).
    mesh.position.copy(S.player.pos);
    mesh.rotation.y = S.player.heading;
    mesh.visible = !S.car;

    if (S.mode !== 'playing') return;
    if (S.car) return;
    const p = S.player;
    let fx = 0;
    let fz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) fz -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) fz += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) fx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) fx += 1;
    if (fx !== 0 || fz !== 0) {
      const len = Math.hypot(fx, fz);
      fx /= len;
      fz /= len;
      const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const speed = sprint ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
      p.pos.x += fx * speed * dt;
      p.pos.z += fz * speed * dt;
      p.heading = Math.atan2(fx, fz);
      p.vel.set(fx * speed, 0, fz * speed);
    } else {
      p.vel.set(0, 0, 0);
    }

    if (input.wasPressed('KeyE')) {
      let best = null;
      let bestDist = 16; // within 4 metres
      for (const car of S.cars) {
        if (car.aiPolice) continue;
        const dx = car.pos.x - p.pos.x;
        const dz = car.pos.z - p.pos.z;
        const d = dx * dx + dz * dz;
        if (d < bestDist) { bestDist = d; best = car; }
      }
      if (best) {
        S.car = best;
        p.pos.copy(best.pos);
        // Consume this press: the vehicles module also watches KeyE
        // (to exit), and must not see the same press that just entered.
        input.pressed.delete('KeyE');
        ctx.api.toast(`Got in the ${best.kind}.`);
      }
    }
  });
}
