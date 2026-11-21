// SOLMAR BAY — the static 3D city. Dark ground, bay water at the east
// edge, a road grid, box buildings (some with emissive windows that light
// up at night), streetlights, and the landmark shops: MART, garage,
// safehouse motel, pay-n-spray, fence yard, taxi stand, race pad.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  const windowMats = [];

  function box(w, h, d, color, x, y, z, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0.05,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity || 0,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return { mesh: m, mat };
  }

  // Bay water along the east edge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 900),
    new THREE.MeshStandardMaterial({ color: 0x1a4a6e, roughness: 0.25, metalness: 0.4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(300, 0.02, 0);
  scene.add(water);

  // Road grid: dark strips on the ground.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x191423, roughness: 1 });
  for (let i = -2; i <= 2; i++) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(10, 380), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(i * 60, 0.0, 0);
    scene.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(380, 10), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.0, i * 60);
    scene.add(ew);
  }

  // Buildings: a deterministic-ish scatter so the skyline reads at once.
  const palette = [0x3a2b4d, 0x4d3a5e, 0x2e2438, 0x54406a, 0x41304f];
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 64; i++) {
    const bx = -165 + rnd() * 330;
    const bz = -165 + rnd() * 330;
    if (Math.abs(bx) < 14 && Math.abs(bz) < 14) continue; // keep downtown plaza open
    if (Math.hypot(bx - -72, bz - -60) < 12) continue;
    if (Math.hypot(bx - -90, bz - -66) < 12) continue;
    const w = 10 + rnd() * 14;
    const d = 10 + rnd() * 14;
    const h = 8 + rnd() * 34;
    const b = box(w, h, d, palette[i % palette.length], bx, h / 2, bz);
    // A lit window band on some buildings; it glows after dark.
    if (rnd() > 0.45) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.7, Math.min(2.2, h * 0.25), 0.2),
        new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffc46a, emissiveIntensity: 0 }),
      );
      win.position.set(bx, h * 0.62, bz + d / 2 + 0.12);
      scene.add(win);
      windowMats.push(win.material);
    }
  }

  // Streetlights along the main roads.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc46a, emissiveIntensity: 0.4 });
  for (let i = -2; i <= 2; i++) {
    for (const z of [-120, 0, 120]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), poleMat);
      pole.position.set(i * 60 + 6, 3, z);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), lampMat);
      lamp.position.set(i * 60 + 6, 6.2, z);
      scene.add(lamp);
    }
  }

  // Landmarks.
  const mart = box(16, 7, 10, 0x7a4a2e, CONFIG.shop.x, 3.5, CONFIG.shop.z);
  box(16.4, 1.2, 10.4, 0xff7a3d, CONFIG.shop.x, 7.4, CONFIG.shop.z, { emissive: 0xff7a3d, emissiveIntensity: 0.55 });
  box(10, 6, 8, 0x5e3a5e, CONFIG.garage.x, 3, CONFIG.garage.z);
  box(10.4, 1, 8.4, 0xffb347, CONFIG.garage.x, 6.4, CONFIG.garage.z, { emissive: 0xffb347, emissiveIntensity: 0.5 });
  box(18, 9, 10, 0x4a5e7a, CONFIG.safehouse.x, 4.5, CONFIG.safehouse.z);
  box(18.4, 1.2, 10.4, 0x5fb4c9, CONFIG.safehouse.x, 9.4, CONFIG.safehouse.z, { emissive: 0x5fb4c9, emissiveIntensity: 0.5 });
  // Pay-n-spray booth: striped canopy over the pad.
  box(8, 0.6, 8, 0xff2e63, CONFIG.spray.x, 4.4, CONFIG.spray.z, { emissive: 0xff2e63, emissiveIntensity: 0.4 });
  // Fence yard: low walls + an office box.
  box(14, 5, 8, 0x3d4a2e, CONFIG.fenceYard.x, 2.5, CONFIG.fenceYard.z);
  // Taxi stand sign.
  box(2, 5, 0.6, 0xf2d492, CONFIG.taxiStand.x, 2.5, CONFIG.taxiStand.z, { emissive: 0xf2d492, emissiveIntensity: 0.6 });
  // Race pad: checkered slab.
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(CONFIG.racePad.x, 0.03, CONFIG.racePad.z);
  scene.add(pad);

  // Windows light up as night lands.
  ctx.updates.push(() => {
    const n = S.dayNight.night;
    for (const m of windowMats) m.emissiveIntensity = n * 1.6;
  });
}
