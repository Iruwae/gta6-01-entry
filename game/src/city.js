// SOLMAR BAY — the static 3D city: ground, bay water, road grid, buildings
// with windows that light up at night, streetlights and landmarks.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

const BUILDING_COLORS = [0x3a2b4d, 0x4d3548, 0x2e3a55, 0x54402e, 0x3d2f2a, 0x2b3d4d];

export function init(ctx) {
  const { scene } = ctx;
  const nightMats = [];
  const rng = (() => { let s = 1234; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

  // Bay water along the south-east edge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 220),
    new THREE.MeshStandardMaterial({ color: 0x1d4e5e, roughness: 0.25, metalness: 0.4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(60, -0.4, 320);
  scene.add(water);

  // Road grid: dark strips with amber centre dashes.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1c1426, roughness: 0.9 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  for (let x = -180; x <= 180; x += 60) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 420), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.02, 0);
    scene.add(road);
  }
  for (let z = -180; z <= 180; z += 60) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(420, 10), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, z);
    scene.add(road);
  }
  for (let x = -180; x <= 180; x += 60) {
    for (let z = -150; z <= 150; z += 30) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1, 6), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.04, z);
      scene.add(dash);
    }
  }

  // Buildings: boxes on the blocks between roads, emissive windows at night.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      if (gx === 0 && gz === 0) continue;
      const cx = gx * 60 + 22;
      const cz = gz * 60 + 22;
      const h = 8 + rng() * 34;
      const w = 14 + rng() * 12;
      const d = 14 + rng() * 12;
      const mat = new THREE.MeshStandardMaterial({
        color: BUILDING_COLORS[Math.floor(rng() * BUILDING_COLORS.length)],
        roughness: 0.85,
        emissive: 0xffb347,
        emissiveIntensity: 0,
      });
      const b = new THREE.Mesh(boxGeo, mat);
      b.scale.set(w, h, d);
      b.position.set(cx, h / 2, cz);
      scene.add(b);
      nightMats.push(mat);
      // Roof trim in a district colour.
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
        new THREE.MeshBasicMaterial({ color: 0xff7a9e }),
      );
      trim.position.set(cx, h + 0.25, cz);
      scene.add(trim);
    }
  }

  // Streetlights along the main roads.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.6 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const lampMats = [];
  for (let x = -180; x <= 180; x += 60) {
    for (let z = -150; z <= 150; z += 60) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), poleMat);
      pole.position.set(x + 7, 3.5, z);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat.clone());
      lamp.position.set(x + 7, 7.1, z);
      scene.add(lamp);
      lampMats.push(lamp.material);
    }
  }

  // Landmarks.
  function landmark(x, z, w, h, d, color, label) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, emissive: color, emissiveIntensity: 0.15 }),
    );
    m.position.set(x, h / 2, z);
    scene.add(m);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.9, 1.2, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xffb347 }),
    );
    sign.position.set(x, h + 1, z + d / 2 + 0.2);
    scene.add(sign);
    return m;
  }
  landmark(CONFIG.shopPos.x, CONFIG.shopPos.z, 14, 6, 10, 0x8a4d2e, 'MART');
  landmark(CONFIG.garageDoor.x, CONFIG.garageDoor.z, 16, 7, 12, 0x3d5a4d, 'GARAGE');
  landmark(CONFIG.safehouse.x, CONFIG.safehouse.z, 16, 8, 10, 0x5a3d6e, 'MOTEL');
  landmark(CONFIG.sprayBooth.x, CONFIG.sprayBooth.z, 10, 5, 8, 0x2e6e8a, 'SPRAY');
  landmark(CONFIG.fenceYard.x, CONFIG.fenceYard.z, 18, 4, 14, 0x6e5a2e, 'FENCE');
  landmark(CONFIG.taxiStand.x, CONFIG.taxiStand.z, 8, 4, 8, 0xc9a13d, 'TAXI');
  landmark(CONFIG.racePad.x, CONFIG.racePad.z, 10, 1.2, 10, 0x8a2e4d, 'RACE');

  // Palm trees scattered through the districts.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e4a2e, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d8a4d, roughness: 0.8 });
  for (let i = 0; i < 46; i++) {
    const x = -170 + rng() * 340;
    const z = -170 + rng() * 340;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), trunkMat);
    trunk.position.set(x, 3, z);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3, 7), leafMat);
    leaves.position.set(x, 7, z);
    scene.add(leaves);
  }

  // Windows + lamps brighten as night lands.
  ctx.updates.push(() => {
    const n = ctx.state.dayNight.night;
    for (const m of nightMats) m.emissiveIntensity = n * 0.85;
    for (const m of lampMats) m.color.setHex(n > 0.4 ? 0xffe9b0 : 0x8a7a5a);
  });
  ctx.cityReady = true;
}
