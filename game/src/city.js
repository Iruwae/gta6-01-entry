// SOLMAR BAY — static city: road grid, bay water, buildings with windows
// that light up at night, streetlights and landmark shops.
import * as THREE from '../vendor/three.module.min.js';
import { makeRng } from './random.js';

export function init(ctx) {
  const { THREE, scene, state: S, config } = ctx;
  const rng = makeRng(7);
  const city = new THREE.Group();
  scene.add(city);

  // Bay water along the south edge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 130),
    new THREE.MeshStandardMaterial({ color: 0x14425e, roughness: 0.25, metalness: 0.4 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.02, 245);
  city.add(water);

  // Road grid strips.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x241a30, roughness: 0.9 });
  for (let i = -3; i <= 3; i++) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(12, 420), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(i * 60, 0.04, 0);
    city.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(420, 12), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.04, i * 60);
    city.add(h);
  }

  // Buildings with emissive windows.
  const windowMats = [];
  const palette = [0x3a2b4d, 0x4d3242, 0x2e3a4d, 0x503a2e, 0x33284a];
  for (let i = 0; i < 70; i++) {
    const bx = Math.round((rng() * 11 - 5.5)) * 30 + (rng() - 0.5) * 12;
    const bz = Math.round((rng() * 11 - 5.5)) * 30 + (rng() - 0.5) * 12;
    if (Math.abs(bx) < 14 && Math.abs(bz) < 14) continue;
    if (Math.abs(bx % 60) < 10 || Math.abs(bz % 60) < 10) continue;
    if (Math.abs(bz) > 185) continue;
    const w = 10 + rng() * 14;
    const h = 8 + rng() * 32;
    const d = 10 + rng() * 14;
    const winMat = new THREE.MeshStandardMaterial({
      color: palette[i % palette.length],
      emissive: 0xffb347,
      emissiveIntensity: 0.15,
      roughness: 0.85,
    });
    windowMats.push(winMat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), winMat);
    b.position.set(bx, h / 2, bz);
    city.add(b);
  }
  ctx.cityWindows = windowMats;

  // Streetlights along the main roads.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc46b, emissiveIntensity: 0.9 });
  for (let i = -3; i <= 3; i++) {
    for (let j = -2; j <= 2; j++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), poleMat);
      pole.position.set(i * 60 + 7, 3, j * 60);
      city.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), lampMat);
      lamp.position.set(i * 60 + 7, 6.2, j * 60);
      city.add(lamp);
    }
  }

  // Landmark shops: MART, garage, safehouse motel, pay-n-spray, fence yard, taxi stand, race pad.
  function landmark(x, z, w, h, d, color, label) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.7 })
    );
    m.position.set(x, h / 2, z);
    city.add(m);
    return m;
  }
  landmark(config.shop.x, config.shop.z, 16, 6, 10, 0xff7a3d, 'MART');
  landmark(config.garage.x, config.garage.z, 18, 7, 12, 0x7ec98a, 'GARAGE');
  landmark(config.safehouse.x, config.safehouse.z, 20, 9, 12, 0x5fb4c9, 'MOTEL');
  landmark(config.spray.x, config.spray.z, 10, 5, 8, 0xb48ce8, 'SPRAY');
  landmark(config.fenceYard.x, config.fenceYard.z, 22, 3, 16, 0xe8a34c, 'YARD');
  landmark(config.taxiStand.x, config.taxiStand.z, 8, 4, 8, 0xf2d492, 'TAXI');
  landmark(config.racePad.x, config.racePad.z, 12, 1, 12, 0xff2e63, 'RACE');

  ctx.updates.push(() => {
    const night = S.dayNight.night;
    for (const m of windowMats) m.emissiveIntensity = 0.15 + night * 0.85;
  });
}

export default { init };
