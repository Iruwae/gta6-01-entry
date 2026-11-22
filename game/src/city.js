// SOLMAR BAY — the static 3D city: road grid, bay water, box buildings
// with windows that light up at night, streetlights, and the landmark
// shops (MART, garage, motel, pay-n-spray, fence yard, taxi stand, race
// pad). Parked stealable cars live in vehicles.js, not here.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { makeRng } from './random.js';

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state;
  const rng = makeRng(20261122);
  const group = new THREE.Group();
  scene.add(group);
  ctx.cityGroup = group;

  // Bay water along the south edge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 140),
    new THREE.MeshLambertMaterial({ color: 0x1d4e63 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.0, 260);
  group.add(water);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 26),
    new THREE.MeshLambertMaterial({ color: 0xc2a06b })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.01, 178);
  group.add(sand);

  // Road grid: dark strips every 30 units across the city.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x241a30 });
  for (let i = -5; i <= 5; i++) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(360, 9), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(0, 0.02, i * 30);
    group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(9, 360), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(i * 30, 0.02, 0);
    group.add(h);
  }

  // Buildings: boxes on the blocks between roads, windows glow at night.
  const windowMats = [];
  const wallColors = [0x3a2b4d, 0x4d3242, 0x2e3a55, 0x54402e, 0x3d2f33];
  for (let gx = -5; gx <= 5; gx++) {
    for (let gz = -5; gz <= 5; gz++) {
      if (gx === 0 && gz === 0) continue;
      const cx = gx * 30 + 15 * (gx >= 0 ? 1 : -1) * 0 + (rng() - 0.5) * 8;
      const cz = gz * 30 + (rng() - 0.5) * 8;
      if (Math.abs(cx) < 14 && Math.abs(cz) < 14) continue;
      const w = 10 + rng() * 8;
      const d = 10 + rng() * 8;
      const h = 6 + rng() * rng() * 30;
      const wall = new THREE.MeshLambertMaterial({
        color: wallColors[Math.floor(rng() * wallColors.length)],
      });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
      b.position.set(cx, h / 2, cz);
      group.add(b);
      const winMat = new THREE.MeshBasicMaterial({
        color: 0xffc46b,
        transparent: true,
        opacity: 0,
      });
      windowMats.push(winMat);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, Math.min(h * 0.55, 8)), winMat);
      win.position.set(cx, h * 0.55, cz + d / 2 + 0.06);
      group.add(win);
      const win2 = win.clone();
      win2.rotation.y = Math.PI;
      win2.position.set(cx, h * 0.55, cz - d / 2 - 0.06);
      group.add(win2);
    }
  }
  ctx.cityWindows = windowMats;

  // Streetlights along the main roads.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x555560 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe1a1, transparent: true, opacity: 0.25 });
  ctx.cityLamps = lampMat;
  for (let i = -4; i <= 4; i++) {
    for (const [x, z] of [[i * 30 + 6, 6], [6, i * 30 + 6]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), poleMat);
      pole.position.set(x, 3.5, z);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat);
      lamp.position.set(x, 7.1, z);
      group.add(lamp);
    }
  }

  // Landmarks.
  function landmarkBox(x, z, w, h, d, color, emissive) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000 })
    );
    m.position.set(x, h / 2, z);
    group.add(m);
    return m;
  }
  function sign(x, z, color, text) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(6, 1.6, 0.3),
      new THREE.MeshBasicMaterial({ color })
    );
    s.position.set(x, 6.5, z);
    group.add(s);
    return s;
  }
  landmarkBox(-72, -60, 16, 7, 12, 0x7a4a2e); // MART corner store
  sign(-72, -53, 0xffb347);
  landmarkBox(-90, -66, 14, 6, 10, 0x4a4a55); // Vic's garage
  sign(-90, -60, 0xff7a9e);
  landmarkBox(120, -120, 18, 8, 12, 0x5a3a5e); // safehouse motel
  sign(120, -113, 0x5fb4c9);
  landmarkBox(-90, -58, 6, 4, 6, 0x2e6a7a); // pay-n-spray booth
  // Fence yard: low walls around (110,138).
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x6b5a3a });
  for (const [x, z, w, d] of [[110, 126, 26, 1], [110, 150, 26, 1], [97, 138, 1, 24], [123, 138, 1, 24]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), wallMat);
    wall.position.set(x, 1.1, z);
    group.add(wall);
  }
  landmarkBox(68, 60, 6, 3, 4, 0x3a6a4a); // taxi stand shelter
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff7a3d, transparent: true, opacity: 0.85 })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-60, 0.05, -60);
  group.add(pad);

  // Windows + lamps follow the night.
  ctx.updates.push(() => {
    const night = S.dayNight.night;
    for (const m of windowMats) m.opacity = night * 0.9;
    lampMat.opacity = 0.25 + night * 0.75;
  });

  ctx.flags.city = true;
}
