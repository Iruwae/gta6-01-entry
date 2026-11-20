// Solmar Bay — the seven districts (round 7 rebuild).
// Four centres are fixed by the game contract; the other three are
// invented here. Each district gets its own look through street
// props, and a nearest-centre lookup answers "where am I?" for any
// map position. S.district (the id) and the HUD name follow the
// player as they move.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const T = ctx.THREE || THREE;
  const dom = ctx.dom || {};

  const DISTRICTS = [
    { id: 'harbor', name: 'HARBOR', x: 120, z: 120, look: 'cranes and stacked containers, rust and sea blue' },
    { id: 'beach', name: 'BEACH', x: 0, z: 165, look: 'pale sand, palms, surf shacks' },
    { id: 'uptown', name: 'UPTOWN', x: 120, z: -90, look: 'glass towers, manicured planters, quiet money' },
    { id: 'strip', name: 'THE STRIP', x: 0, z: 135, look: 'neon frontage, crowds, loud colour' },
    { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0, look: 'tall towers, plazas, office glass' },
    { id: 'oldtown', name: 'OLD TOWN', x: -120, z: 120, look: 'brick rows, awnings, corner cafes' },
    { id: 'westside', name: 'WESTSIDE', x: -120, z: -90, look: 'warehouses, chain fences, wide empty lots' },
  ];

  function districtAt(x, z) {
    let best = DISTRICTS[4];
    let bestD = Infinity;
    for (const d of DISTRICTS) {
      const dd = (d.x - x) * (d.x - x) + (d.z - z) * (d.z - z);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  }
  function districtById(id) {
    return DISTRICTS.find((d) => d.id === id) || DISTRICTS[4];
  }

  // ---- per-district street props (cheap shared materials) ------------
  const crateMatA = new T.MeshLambertMaterial({ color: 0x7a4a2b });
  const crateMatB = new T.MeshLambertMaterial({ color: 0x2f5d7a });
  const palmTrunk = new T.MeshLambertMaterial({ color: 0x6b4a2f });
  const palmLeaf = new T.MeshLambertMaterial({ color: 0x2f7a4a });
  const planterMat = new T.MeshLambertMaterial({ color: 0x3a5a3a });
  const brickMat = new T.MeshLambertMaterial({ color: 0x8a4a3a });
  const wareMat = new T.MeshLambertMaterial({ color: 0x5a5a60 });
  const neonMats = [0xff4d8a, 0x2fd8ff, 0xffc23d].map(
    (c) => new T.MeshBasicMaterial({ color: c })
  );
  const unitBox = new T.BoxGeometry(1, 1, 1);
  function box(x, y, z, w, h, d, mat) {
    const m = new T.Mesh(unitBox, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  // HARBOR: stacked containers + two crane masts
  for (let i = 0; i < 8; i++) {
    const cx = 105 + (i % 4) * 10;
    const cz = 105 + Math.floor(i / 4) * 9;
    box(cx, 1.2, cz, 8, 2.4, 2.6, i % 2 ? crateMatA : crateMatB);
    if (i % 3 === 0) box(cx, 3.6, cz, 8, 2.4, 2.6, crateMatB);
  }
  box(138, 11, 108, 1.2, 22, 1.2, wareMat);
  box(138, 21, 108, 14, 1.2, 1.2, wareMat);
  box(102, 9, 138, 1.2, 18, 1.2, wareMat);

  // BEACH: sand patch + a row of palms
  const sand = new T.Mesh(
    new T.PlaneGeometry(90, 26),
    new T.MeshLambertMaterial({ color: 0xd8c49a })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.03, 168);
  scene.add(sand);
  for (let i = 0; i < 7; i++) {
    const px = -42 + i * 14;
    const pz = 158 + (i % 2) * 6;
    const trunk = new T.Mesh(new T.CylinderGeometry(0.25, 0.4, 5, 6), palmTrunk);
    trunk.position.set(px, 2.5, pz);
    trunk.rotation.z = 0.15;
    scene.add(trunk);
    const top = new T.Mesh(new T.ConeGeometry(2.2, 1.6, 7), palmLeaf);
    top.position.set(px + 0.7, 5.4, pz);
    scene.add(top);
  }

  // UPTOWN: planters and a glass slab
  for (let i = 0; i < 6; i++) {
    box(102 + (i % 3) * 18, 0.6, -102 + Math.floor(i / 3) * 16, 3, 1.2, 3, planterMat);
  }
  box(132, 8, -78, 6, 16, 6, new T.MeshLambertMaterial({ color: 0x9ab8d8 }));

  // THE STRIP: neon totems along the frontage
  for (let i = 0; i < 6; i++) {
    const nx = -60 + i * 24;
    const m = new T.Mesh(unitBox, neonMats[i % neonMats.length]);
    m.scale.set(1.4, 6 + (i % 3) * 2, 1.4);
    m.position.set(nx, 3 + (i % 3), 128);
    scene.add(m);
  }

  // DOWNTOWN: plaza planters and benches
  for (let i = 0; i < 4; i++) {
    box(-12 + (i % 2) * 24, 0.5, -12 + Math.floor(i / 2) * 24, 4, 1, 1.4, planterMat);
  }

  // OLD TOWN: brick rows with awnings
  for (let i = 0; i < 5; i++) {
    const ox = -138 + i * 9;
    box(ox, 2.5, 108, 7, 5, 6, brickMat);
    box(ox, 4.4, 105, 7.4, 0.5, 2, new T.MeshLambertMaterial({ color: 0xd8b23d }));
  }

  // WESTSIDE: warehouses and a chain-fence run (posts only, cheap)
  box(-132, 3, -102, 16, 6, 10, wareMat);
  box(-108, 2.5, -78, 12, 5, 9, wareMat);
  for (let i = 0; i < 8; i++) {
    box(-140 + i * 5, 1, -70, 0.3, 2, 0.3, wareMat);
  }

  // ---- lookup + live tracking -----------------------------------------
  ctx.api.districts = DISTRICTS;
  ctx.api.districtAt = districtAt;
  ctx.api.districtById = districtById;

  function el(id) {
    return dom[id] || document.getElementById(id);
  }

  function refresh() {
    let px = 0;
    let pz = 0;
    if (S.player && S.player.pos) {
      px = S.player.pos.x;
      pz = S.player.pos.z;
    } else if (S.car && S.car.pos) {
      px = S.car.pos.x;
      pz = S.car.pos.z;
    }
    const d = districtAt(px, pz);
    if (S.district !== d.id) {
      S.district = d.id;
      S.districtName = d.name;
      const elD = el('district');
      if (elD) elD.textContent = d.name;
    }
  }

  refresh();
  ctx.updates.push((dt) => refresh());
}
