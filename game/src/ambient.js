// ambient.js — the city breathing: traffic on the road grid and birds
// circling over the beach. Traffic cars are kept out of S.cars on
// purpose, so the enter-car key never grabs a moving car by mistake.
// Written fresh for round 8 from the shared contract.
import * as THREE from '../vendor/three.module.min.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  const rand = mulberry32(4242);

  // Shared headlight material so every traffic car lights up at night.
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffdf80, emissiveIntensity: 0.5 });

  function buildTrafficMesh(color) {
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.6, metalness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.15, metalness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.2), paint);
    body.position.y = 0.55;
    g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 1.9), glass);
    cabin.position.set(0, 1.05, -0.2);
    g.add(cabin);
    for (const x of [-0.7, 0.7]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), headMat);
      lamp.position.set(x, 0.6, 2.12);
      g.add(lamp);
    }
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12);
    for (const [x, z] of [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]]) {
      const wheel = new THREE.Mesh(wheelGeo, dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.36, z);
      g.add(wheel);
    }
    return g;
  }

  // Traffic runs the road grid (roads at multiples of 60) and wraps.
  const ROADS = [-120, -60, 0, 60, 120];
  const COLORS = [0x8a97a8, 0xb8b0a0, 0x6a7a8a, 0xa85a4a, 0x4a6a8a, 0xc8c8c8];
  const traffic = [];
  for (let i = 0; i < 9; i++) {
    const alongZ = rand() > 0.5;
    const road = ROADS[Math.floor(rand() * ROADS.length)];
    const dir = rand() > 0.5 ? 1 : -1;
    const lane = (rand() - 0.5) * 4;
    const color = COLORS[Math.floor(rand() * COLORS.length)];
    const mesh = buildTrafficMesh(color);
    scene.add(mesh);
    traffic.push({
      mesh, alongZ, road, dir, lane,
      speed: 8 + rand() * 6,
      s: (rand() - 0.5) * 360,
    });
  }
  S.traffic = traffic;
  ctx.api.traffic = traffic;

  // Gulls over the beach, circling slow and high.
  const birds = [];
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Group();
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), birdMat);
    w1.rotation.z = 0.5; w1.position.x = -0.4; b.add(w1);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), birdMat);
    w2.rotation.z = -0.5; w2.position.x = 0.4; b.add(w2);
    scene.add(b);
    birds.push({
      mesh: b,
      cx: (rand() - 0.5) * 120,
      cz: 150 + rand() * 30,
      r: 20 + rand() * 40,
      h: 26 + rand() * 14,
      a: rand() * Math.PI * 2,
      w: 0.1 + rand() * 0.12,
    });
  }
  S.birds = birds;

  let t = 0;
  ctx.updates.push((dt) => {
    t += dt;
    const n = S.dayNight ? S.dayNight.night : 0;
    headMat.emissiveIntensity = 0.5 + n * 2.0;
    if (S.mode !== 'playing') return;
    for (const c of traffic) {
      c.s += c.dir * c.speed * dt;
      if (c.s > 195) c.s = -195;
      if (c.s < -195) c.s = 195;
      if (c.alongZ) {
        c.mesh.position.set(c.road + c.lane, 0, c.s);
        c.mesh.rotation.y = c.dir > 0 ? 0 : Math.PI;
      } else {
        c.mesh.position.set(c.s, 0, c.road + c.lane);
        c.mesh.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    for (const b of birds) {
      b.a += b.w * dt;
      b.mesh.position.set(
        b.cx + Math.cos(b.a) * b.r,
        b.h + Math.sin(t * 0.7 + b.a) * 2,
        b.cz + Math.sin(b.a) * b.r,
      );
      b.mesh.rotation.y = -b.a;
      b.mesh.rotation.z = Math.sin(t * 3 + b.a * 5) * 0.25;
    }
  });
}
