// SOLMAR BAY — ambient life: traffic sedans and harbour gulls.
import * as THREE from '../vendor/three.module.min.js';
import { createCarMesh } from './vehicles.js';

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;

  // Traffic: sedans cruising the road grid (they brake for the player).
  const traffic = [];
  const lanes = [
    { axis: 'x', lane: -40, dir: 1 },
    { axis: 'x', lane: 40, dir: -1 },
    { axis: 'x', lane: 120, dir: 1 },
    { axis: 'z', lane: -80, dir: 1 },
    { axis: 'z', lane: 0, dir: -1 },
    { axis: 'z', lane: 80, dir: 1 },
    { axis: 'x', lane: -120, dir: -1 },
    { axis: 'z', lane: 160, dir: -1 },
  ];
  const trafficColors = [0x8a8a9a, 0x5a6a7a, 0x9a7a5a, 0x6a5a8a, 0x7a8a6a];
  lanes.forEach((lane, i) => {
    const mesh = createCarMesh(T, 'sedan', trafficColors[i % trafficColors.length]);
    scene.add(mesh);
    traffic.push({
      mesh,
      axis: lane.axis,
      lane: lane.lane,
      dir: lane.dir,
      pos: lane.axis === 'x' ? -160 + i * 40 : -160 + i * 35,
      speed: 8 + (i % 4),
      cruise: 8 + (i % 4),
    });
  });

  // Gulls circling the harbour and the beach.
  const gulls = [];
  const gullMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const gullCenters = [{ x: 120, z: 120 }, { x: 0, z: 165 }];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const wingGeo = new THREE.PlaneGeometry(1.4, 0.35);
    const w1 = new THREE.Mesh(wingGeo, gullMat);
    w1.position.x = -0.7;
    const w2 = new THREE.Mesh(wingGeo, gullMat);
    w2.position.x = 0.7;
    g.add(w1);
    g.add(w2);
    g.userData.wings = [w1, w2];
    scene.add(g);
    const c = gullCenters[i % gullCenters.length];
    gulls.push({
      mesh: g,
      cx: c.x,
      cz: c.z,
      r: 18 + i * 3,
      h: 24 + (i % 3) * 5,
      a: (i / 6) * Math.PI * 2,
      speed: 0.25 + (i % 3) * 0.08,
    });
  }

  ctx.updates.push((dt, t) => {
    const pp = S.player.pos;
    for (const car of traffic) {
      // Brake when the player is right in front.
      const dx = pp.x - (car.axis === 'x' ? car.pos : car.lane);
      const dz = pp.z - (car.axis === 'z' ? car.pos : car.lane);
      const dist = Math.hypot(dx, dz);
      const ahead = car.axis === 'x'
        ? Math.sign(dx) === car.dir && Math.abs(dz) < 4
        : Math.sign(dz) === car.dir && Math.abs(dx) < 4;
      const target = ahead && dist < 14 ? 0 : car.cruise;
      car.speed += (target - car.speed) * Math.min(1, 3 * dt);
      car.pos += car.speed * car.dir * dt;
      if (car.pos > 185) car.pos = -185;
      if (car.pos < -185) car.pos = 185;
      if (car.axis === 'x') {
        car.mesh.position.set(car.pos, 0, car.lane);
        car.mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        car.mesh.position.set(car.lane, 0, car.pos);
        car.mesh.rotation.y = car.dir > 0 ? 0 : Math.PI;
      }
    }
    for (const g of gulls) {
      g.a += g.speed * dt;
      g.mesh.position.set(g.cx + Math.cos(g.a) * g.r, g.h + Math.sin(t * 0.8 + g.r) * 1.5, g.cz + Math.sin(g.a) * g.r);
      g.mesh.rotation.y = -g.a;
      const flap = Math.sin(t * 6 + g.r) * 0.5;
      g.mesh.userData.wings[0].rotation.z = flap;
      g.mesh.userData.wings[1].rotation.z = -flap;
    }
  });

  return { traffic, gulls };
}

export default init;
