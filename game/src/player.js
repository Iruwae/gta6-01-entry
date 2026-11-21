// SOLMAR BAY — on-foot player: WASD movement, enter/exit cars with E.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE: T, scene, state: S, input, config } = ctx;
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb347 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.45), bodyMat);
  mesh.position.copy(S.player.pos);
  scene.add(mesh);
  S.player.mesh = mesh;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xf2c89b })
  );
  head.position.y = 1.15;
  mesh.add(head);

  ctx.updates.push((dt) => {
    const p = S.player;
    // E toggles enter/exit here and nowhere else: handling both directions
    // on the same edge in two modules made the car exit in the same frame
    // it was entered.
    if (input.wasPressed('KeyE')) {
      if (S.car) {
        S.car.speed = 0;
        S.car = null;
        ctx.api.toast('You got out.');
      } else {
        let best = null;
        let bd = 6;
        for (const c of S.cars) {
          if (c.aiPolice) continue;
          const d = Math.hypot(c.pos.x - p.pos.x, c.pos.z - p.pos.z);
          if (d < bd) {
            bd = d;
            best = c;
          }
        }
        if (best) {
          S.car = best;
          best.speed = 0;
          p.heading = best.heading;
          ctx.api.toast(`You took the ${best.kind}.`);
        }
      }
    }
    if (S.car) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    let fx = 0;
    let fz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) fz -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) fz += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) fx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) fx += 1;
    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = sprint ? config.sprintSpeed : config.walkSpeed;
    if (fx !== 0 || fz !== 0) {
      const len = Math.hypot(fx, fz);
      fx /= len;
      fz /= len;
      p.pos.x += fx * speed * dt;
      p.pos.z += fz * speed * dt;
      p.heading = Math.atan2(fx, fz);
      p.vel.set(fx * speed, 0, fz * speed);
    } else {
      p.vel.set(0, 0, 0);
    }
    mesh.position.set(p.pos.x, 0.9, p.pos.z);
    mesh.rotation.y = p.heading;
  });
}

export default { init };
