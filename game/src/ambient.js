// SOLMAR BAY — ambient life: traffic sedans cruising the road grid
// (they brake when the player is right in front of them) and gulls
// circling over the harbour and the beach. Traffic is sedans only and
// never joins S.cars — it cannot be stolen or mistaken for a parked ride.
import * as THREE from '../vendor/three.module.min.js';
import { rand, randInt, pick } from './random.js';

const TRAFFIC_COLORS = [0x8a8fa8, 0xc9a06a, 0x6a8a7a, 0xa86a6a, 0x5a6a8a];

export function init(ctx) {
  const { scene, state: S } = ctx;
  const cars = [];
  const carGeo = new THREE.BoxGeometry(2.0, 0.7, 4.2);
  const cabinGeo = new THREE.BoxGeometry(1.7, 0.5, 2.0);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2436, roughness: 0.2, metalness: 0.5 });

  for (let i = 0; i < 6; i++) {
    const horizontal = i % 2 === 0;
    const lane = randInt(-5, 5) * 30 + (horizontal ? 3.5 : -3.5);
    const mat = new THREE.MeshStandardMaterial({ color: pick(TRAFFIC_COLORS), roughness: 0.4, metalness: 0.4 });
    const group = new THREE.Group();
    const body = new THREE.Mesh(carGeo, mat);
    body.position.y = 0.5;
    group.add(body);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.y = 1.05;
    group.add(cabin);
    scene.add(group);
    cars.push({
      mesh: group,
      horizontal,
      lane,
      t: rand(-180, 180),
      speed: rand(7, 11),
      dir: Math.random() < 0.5 ? 1 : -1,
    });
  }

  // Gulls over the harbour (120,120) and the beach (0,165).
  const gulls = [];
  const gullMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const gullGeo = new THREE.ConeGeometry(0.35, 1.4, 4);
  gullGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Mesh(gullGeo, gullMat);
    scene.add(g);
    gulls.push({
      mesh: g,
      cx: i % 2 === 0 ? 120 : 0,
      cz: i % 2 === 0 ? 120 : 165,
      r: rand(8, 22),
      h: rand(18, 30),
      a: rand(0, Math.PI * 2),
      w: rand(0.3, 0.7),
    });
  }

  ctx.updates.push((dt) => {
    for (const c of cars) {
      // Brake when the player is right in front of the car.
      const px = S.player.pos.x;
      const pz = S.player.pos.z;
      let blocked = false;
      if (c.horizontal) {
        const aheadX = c.mesh.position.x + c.dir * 7;
        if (Math.abs(pz - c.lane) < 4 && Math.abs(px - aheadX) < 7) blocked = true;
      } else {
        const aheadZ = c.mesh.position.z + c.dir * 7;
        if (Math.abs(px - c.lane) < 4 && Math.abs(pz - aheadZ) < 7) blocked = true;
      }
      const v = blocked ? 0 : c.speed;
      c.t += v * c.dir * dt;
      if (c.t > 190) c.t = -190;
      if (c.t < -190) c.t = 190;
      if (c.horizontal) {
        c.mesh.position.set(c.t, 0, c.lane);
        c.mesh.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        c.mesh.position.set(c.lane, 0, c.t);
        c.mesh.rotation.y = c.dir > 0 ? 0 : Math.PI;
      }
    }
    for (const g of gulls) {
      g.a += g.w * dt;
      g.mesh.position.set(g.cx + Math.cos(g.a) * g.r, g.h + Math.sin(g.a * 2.3) * 1.5, g.cz + Math.sin(g.a) * g.r);
      g.mesh.rotation.y = -g.a;
    }
  });
}
