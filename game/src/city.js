// The static 3D city: bay water, road grid, box buildings with windows
// that light up at night, streetlights, landmark shops.
export function init(ctx) {
  const { THREE, scene, state: S } = ctx;

  // Bay water at the east edge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 900),
    new THREE.MeshStandardMaterial({ color: 0x1a4a6a, roughness: 0.3, metalness: 0.4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(330, -0.02, 0);
  scene.add(water);

  // Road grid.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x241a33, roughness: 1 });
  for (let i = -2; i <= 2; i++) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(420, 10), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0, i * 60);
    scene.add(h);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(10, 420), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(i * 60, 0, 0);
    scene.add(v);
  }

  // Landmark shops.
  function landmark(x, z, color, w = 16, h = 8, d = 12) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color }),
    );
    m.position.set(x, h / 2, z);
    scene.add(m);
    return m;
  }
  landmark(-72, -60, 0xff7a3d); // MART
  landmark(-90, -66, 0x7ec98a); // garage
  landmark(120, -120, 0xb48ce8); // safehouse motel
  landmark(-90, -58, 0x5fb4c9, 10, 5, 10); // pay-n-spray
  landmark(110, 138, 0xe8a34c, 20, 4, 16); // fence yard
  landmark(68, 60, 0xf2d492, 8, 4, 8); // taxi stand

  // Box buildings — never on a gameplay spot.
  const keepClear = [
    [-90, -66], [-72, -60], [-60, -60], [68, 60], [110, 138],
    [120, -120], [-90, -58], [-88, -64], [-102, -64], [-116, -64],
    [-60, -84], [-84, -58], [0, 0],
  ];
  const windowMats = [];
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      if (gx === 0 && gz === 0) continue;
      const cx = gx * 60;
      const cz = gz * 60;
      if (keepClear.some(([kx, kz]) => Math.hypot(cx - kx, cz - kz) < 30)) continue;
      const w = 14 + Math.random() * 14;
      const h = 12 + Math.random() * 30;
      const d = 14 + Math.random() * 14;
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3a2a55, roughness: 0.9, emissive: 0xffb347, emissiveIntensity: 0.15,
      });
      windowMats.push(mat);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(cx + (Math.random() * 10 - 5), h / 2, cz + (Math.random() * 10 - 5));
      scene.add(b);
    }
  }

  // Streetlights.
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0x444444, emissive: 0xffe9c9, emissiveIntensity: 0.6,
  });
  for (let i = -3; i <= 3; i++) {
    for (const z of [-120, -60, 0, 60, 120]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 6), lightMat);
      p.position.set(i * 60 + 8, 3.5, z + 6);
      scene.add(p);
    }
  }

  ctx.updates.push(() => {
    const night = S.dayNight.night;
    for (const m of windowMats) m.emissiveIntensity = 0.15 + night * 1.4;
  });
}
