// SOLMAR BAY — the static 3D city: bay water, road grid, buildings with
// windows that light up at night, streetlights and the landmark shops.
// (The boot hub owns the ground plane; the parked rides live in vehicles.js.)
import * as THREE from '../vendor/three.module.min.js';
import { rand, randInt, pick } from './random.js';

const LANDMARKS = [
  { name: 'MART', x: -72, z: -60, w: 14, d: 10, h: 6, color: 0xff7a3d },
  { name: 'GARAGE', x: -90, z: -66, w: 16, d: 12, h: 7, color: 0x8a6bb0 },
  { name: 'MOTEL', x: 120, z: -120, w: 18, d: 10, h: 9, color: 0x5fb4c9 },
  { name: 'SPRAY', x: -90, z: -58, w: 10, d: 8, h: 5, color: 0x7ec98a },
  { name: 'FENCE', x: 110, z: 138, w: 16, d: 12, h: 5, color: 0xe8a34c },
  { name: 'TAXI', x: 68, z: 60, w: 8, d: 8, h: 4, color: 0xf2d492 },
  { name: 'RACE', x: -60, z: -60, w: 10, d: 10, h: 1, color: 0xff7a9e },
];

export function init(ctx) {
  const { scene, state: S } = ctx;
  const buildingMats = [];
  const glowMats = [];

  // Bay water at the south edge, past the beach.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 130),
    new THREE.MeshStandardMaterial({ color: 0x1d5f7a, roughness: 0.25, metalness: 0.5 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.02, 250);
  scene.add(water);

  // Road grid: dark asphalt strips every 30 units.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x241a30, roughness: 1 });
  for (let i = -180; i <= 180; i += 30) {
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(380, 7), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.0, i);
    scene.add(hRoad);
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(7, 380), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(i, 0.0, 0);
    scene.add(vRoad);
  }

  // Box buildings, kept off the roads and off the landmark plots.
  const palette = [0x3a2a4a, 0x4a2f3a, 0x2f3a4a, 0x453a2a, 0x35243a];
  const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let gx = -5; gx <= 5; gx++) {
    for (let gz = -5; gz <= 5; gz++) {
      const x = gx * 30 + 15 + rand(-4, 4);
      const z = gz * 30 + 15 + rand(-4, 4);
      if (Math.abs(x) > 185 || Math.abs(z) > 185) continue;
      if (LANDMARKS.some((L) => Math.abs(L.x - x) < 14 && Math.abs(L.z - z) < 12)) continue;
      if (Math.abs(x + 84) < 12 && Math.abs(z + 58) < 12) continue; // player start clearing
      if (rand() < 0.45) continue;
      const w = rand(8, 14);
      const d = rand(8, 14);
      const h = rand(6, 26);
      // One mesh per building; its emissive lifts at night like lit windows.
      const mat = new THREE.MeshStandardMaterial({
        color: pick(palette),
        roughness: 0.9,
        emissive: new THREE.Color(0xffc46b),
        emissiveIntensity: 0.05,
      });
      const b = new THREE.Mesh(buildingGeo, mat);
      b.scale.set(w, h, d);
      b.position.set(x, h / 2, z);
      scene.add(b);
      buildingMats.push(mat);
    }
  }

  // Landmark shops: simple coloured boxes with a taller sign post.
  for (const L of LANDMARKS) {
    const mat = new THREE.MeshStandardMaterial({ color: L.color, roughness: 0.7 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(L.w, L.h, L.d), mat);
    box.position.set(L.x, L.h / 2, L.z);
    scene.add(box);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x111111, emissive: new THREE.Color(L.color), emissiveIntensity: 0.9,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(L.w * 0.7, 1.2, 0.4), signMat);
    sign.position.set(L.x, L.h + 1, L.z);
    scene.add(sign);
    glowMats.push(signMat);
  }

  // Streetlights: poles with a warm glowing head.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 0.7 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: new THREE.Color(0xffd27a), emissiveIntensity: 0.4,
  });
  for (let i = 0; i < 18; i++) {
    const x = randInt(-6, 6) * 30 + rand(-8, 8);
    const z = randInt(-6, 6) * 30 + rand(-8, 8);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.5, 6), poleMat);
    pole.position.set(x, 2.75, z);
    scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampMat);
    lamp.position.set(x, 5.6, z);
    scene.add(lamp);
  }
  glowMats.push(lampMat);

  ctx.updates.push(() => {
    const night = S.dayNight.night;
    // Buildings lift just a little at night (lit windows); signs and
    // lamps glow hard.
    for (const m of buildingMats) {
      m.emissiveIntensity = 0.05 + night * 0.22;
    }
    for (const m of glowMats) {
      m.emissiveIntensity = 0.3 + night * 1.2;
    }
  });
}
