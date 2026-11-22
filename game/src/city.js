// The static 3D city: ground, bay water, road grid, buildings, landmarks.
import * as THREE from '../vendor/three.module.min.js';
import { makeRng } from './random.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  const rng = makeRng(20261122);
  const windowMats = [];

  // Bay water along the south edge, past the beach.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 160),
    new THREE.MeshStandardMaterial({ color: 0x1a4a6b, roughness: 0.25, metalness: 0.6 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.02, 260);
  scene.add(water);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 26),
    new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 1 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.01, 172);
  scene.add(sand);

  // Road grid: dark asphalt strips.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x191426, roughness: 1 });
  for (const z of [-150, -90, -30, 30, 90, 150]) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(420, 10), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, z);
    scene.add(road);
  }
  for (const x of [-150, -90, -30, 30, 90, 150]) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 420), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.02, 0);
    scene.add(road);
  }

  // Buildings: boxes on the blocks between roads, some with lit windows.
  const palette = [0x3a2a4a, 0x4a2f3a, 0x2f3a4a, 0x453a2a, 0x33263d];
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      if (gx === 0 && gz === 0) continue;
      const bx = gx * 60 + (rng() - 0.5) * 12;
      const bz = gz * 60 + (rng() - 0.5) * 12;
      if (Math.abs(bx + 72) < 14 && Math.abs(bz + 60) < 14) continue;
      if (Math.abs(bx + 90) < 14 && Math.abs(bz + 66) < 14) continue;
      if (Math.abs(bx - 120) < 14 && Math.abs(bz + 120) < 14) continue;
      const h = 8 + rng() * 30;
      const winMat = new THREE.MeshStandardMaterial({
        color: palette[Math.floor(rng() * palette.length)],
        roughness: 0.85,
        emissive: 0xffb347,
        emissiveIntensity: 0,
      });
      windowMats.push(winMat);
      const b = new THREE.Mesh(new THREE.BoxGeometry(20 + rng() * 10, h, 20 + rng() * 10), winMat);
      b.position.set(bx, h / 2, bz);
      scene.add(b);
      // Roof trim so the skyline reads at dusk.
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(21 + rng() * 10, 0.6, 21 + rng() * 10),
        new THREE.MeshStandardMaterial({ color: 0xff7a9e, roughness: 0.6, emissive: 0xff7a9e, emissiveIntensity: 0.4 })
      );
      trim.position.set(bx, h + 0.3, bz);
      scene.add(trim);
    }
  }

  // Streetlights at the intersections.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc860, emissiveIntensity: 1.4 });
  for (const x of [-150, -90, -30, 30, 90, 150]) {
    for (const z of [-150, -90, -30, 30, 90, 150]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), poleMat);
      pole.position.set(x + 5, 3.5, z + 5);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), lampMat);
      lamp.position.set(x + 5, 7.1, z + 5);
      scene.add(lamp);
    }
  }

  // Landmarks.
  function landmarkBox(x, z, w, h, d, color, y = 0) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    );
    m.position.set(x, y + h / 2, z);
    scene.add(m);
    return m;
  }
  // MART corner store.
  landmarkBox(-72, -60, 16, 6, 12, 0x2f6b4f);
  landmarkBox(-72, -53.5, 14, 1.2, 1, 0x7ec98a, 6);
  // Garage.
  landmarkBox(-90, -66, 18, 7, 12, 0x4a3a5e);
  landmarkBox(-90, -59.5, 12, 1.2, 1, 0xff7a9e, 7);
  // Safehouse motel.
  landmarkBox(120, -120, 20, 8, 12, 0x6b4a2f);
  landmarkBox(120, -113.5, 14, 1.2, 1, 0xffb347, 8);
  // Pay-n-spray booth: canopy + posts.
  landmarkBox(-90, -58, 10, 0.8, 8, 0x5fb4c9, 5);
  // Fence yard: low walls around Vic's lot.
  landmarkBox(110, 126, 24, 1.2, 1, 0x555560);
  landmarkBox(110, 150, 24, 1.2, 1, 0x555560);
  landmarkBox(98, 138, 1, 1.2, 24, 0x555560);
  landmarkBox(122, 138, 1, 1.2, 24, 0x555560);
  // Taxi stand marker.
  landmarkBox(68, 60, 4, 0.5, 4, 0xf2d492, 0);
  // Race start pad.
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-60, 0.03, -60);
  scene.add(pad);
  const padEdge = new THREE.Mesh(
    new THREE.PlaneGeometry(12.6, 12.6),
    new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 })
  );
  padEdge.rotation.x = -Math.PI / 2;
  padEdge.position.set(-60, 0.025, -60);
  scene.add(padEdge);

  // Windows light up as night lands.
  ctx.updates.push(() => {
    const n = S.dayNight.night;
    for (const m of windowMats) m.emissiveIntensity = n * 1.1;
  });
}

export default init;
