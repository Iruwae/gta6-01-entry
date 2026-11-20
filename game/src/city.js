import * as THREE from '../vendor/three.module.min.js';

// SOLMAR BAY — the city itself. A dense 400x400 grid: roads every 30
// units, buildings packed into every block with varied heights and
// facades, parked cars on the curbs, moving traffic, lamps, billboards,
// bus stops, hydrants, bins, palms on the beach and docks in the
// harbor. Ground detail comes from one painted canvas texture so the
// whole street network costs a single mesh.
const ROAD_LINES = [-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];
const BLOCK_CENTERS = [-165, -135, -105, -75, -45, -15, 15, 45, 75, 105, 135, 165];
const KEEP_CLEAR = [
  [-90, -66], [-72, -60], [120, -120], [110, 138], [-60, -60],
  [68, 60], [-88, -64], [-102, -64], [-90, -58], [0, 165],
];

function nearClear(x, z, r) {
  for (const [cx, cz] of KEEP_CLEAR) {
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

function facadeTexture(base, lit) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < 256; y += 16) g.fillRect(0, y, 128, 2);
  const rng = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 5; col++) {
      const on = rng() < lit;
      g.fillStyle = on ? '#ffd489' : '#20242c';
      g.fillRect(10 + col * 23, 12 + row * 20, 14, 11);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function groundTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d');
  const px = (v) => ((v + 200) / 400) * 1024;
  g.fillStyle = '#26292f';
  g.fillRect(0, 0, 1024, 1024);
  // City blocks: slightly varied concrete slabs.
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const bx of BLOCK_CENTERS) {
    for (const bz of BLOCK_CENTERS) {
      const shade = 52 + Math.floor(rnd() * 14);
      g.fillStyle = 'rgb(' + shade + ',' + (shade + 3) + ',' + (shade + 9) + ')';
      g.fillRect(px(bx - 10), px(bz - 10), px(20) - px(0), px(20) - px(0));
    }
  }
  // Road beds.
  g.fillStyle = '#1d1f24';
  for (const line of ROAD_LINES) {
    g.fillRect(0, px(line - 5), 1024, px(10) - px(0));
    g.fillRect(px(line - 5), 0, px(10) - px(0), 1024);
  }
  // Centre dashes.
  g.fillStyle = '#c9a227';
  for (const line of ROAD_LINES) {
    for (let v = -195; v < 200; v += 20) {
      g.fillRect(px(v), px(line) - 1, 18, 2);
      g.fillRect(px(line) - 1, px(v), 2, 18);
    }
  }
  // Crosswalks at every other crossing.
  g.fillStyle = 'rgba(230,230,220,0.75)';
  for (let i = 0; i < ROAD_LINES.length; i += 2) {
    for (let j = 0; j < ROAD_LINES.length; j += 2) {
      const x = ROAD_LINES[i];
      const z = ROAD_LINES[j];
      for (let k = -4; k <= 4; k += 2) {
        g.fillRect(px(x + k - 0.6), px(z - 5), 3, 26);
        g.fillRect(px(x - 5), px(z + k - 0.6), 26, 3);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function billboardTexture(word, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = fg;
  g.font = 'bold 44px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(word, 128, 58);
  g.font = 'bold 20px sans-serif';
  g.fillText('SOLMAR BAY', 128, 100);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function init(S) {
  const scene = S.scene;
  const rng = S.rng;

  // --- Ground, sand, water -------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.5, metalness: 0.08 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 52),
    new THREE.MeshStandardMaterial({ color: 0xc2a878, roughness: 1 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.03, 176);
  scene.add(sand);

  const seaMat = new THREE.MeshStandardMaterial({ color: 0x1a4a6b, roughness: 0.15, metalness: 0.4 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 90), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.25, 222);
  scene.add(sea);
  const basin = new THREE.Mesh(new THREE.PlaneGeometry(84, 78), seaMat);
  basin.rotation.x = -Math.PI / 2;
  basin.position.set(160, -0.25, 138);
  scene.add(basin);

  // --- Buildings -----------------------------------------------------------
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const facadeDefs = [
    { base: '#5a5148', lit: 0.55, tint: 0x8a7f72 },
    { base: '#6b4a3a', lit: 0.45, tint: 0x9a6a52 },
    { base: '#3f4a58', lit: 0.6, tint: 0x5f7488 },
    { base: '#7a6a58', lit: 0.4, tint: 0xa8906f },
  ];
  const buildingMats = facadeDefs.map((d) => {
    const tex = facadeTexture(d.base, d.lit);
    return new THREE.MeshStandardMaterial({
      color: d.tint,
      map: tex,
      emissiveMap: tex,
      emissive: 0xffc27a,
      emissiveIntensity: 0,
      roughness: 0.85,
    });
  });

  const palette = [0x8a7f72, 0x9a6a52, 0x5f7488, 0xa8906f, 0x6f7a5a, 0x7a5a6e];
  function districtOf(x, z) {
    if (z >= 150) return 'beach';
    if (x >= 100 && z >= 100) return 'harbor';
    if (x >= 100 && z < 0) return 'uptown';
    if (Math.abs(x) < 100 && Math.abs(z) < 120) return 'downtown';
    if (x <= -100 && z < 0) return 'oldtown';
    return 'industrial';
  }

  function heightFor(d) {
    if (d === 'downtown') return 8 + rng() * 16;
    if (d === 'uptown') return 6 + rng() * 10;
    if (d === 'strip') return 6 + rng() * 8;
    if (d === 'oldtown') return 4 + rng() * 5;
    if (d === 'harbor') return 4 + rng() * 3;
    return 5 + rng() * 3;
  }

  let built = 0;
  for (const bx of BLOCK_CENTERS) {
    for (const bz of BLOCK_CENTERS) {
      if (bz >= 150) continue;
      if (nearClear(bx, bz, 15)) continue;
      const d = districtOf(bx, bz);
      const lots = d === 'harbor' ? 1 : (rng() < 0.35 ? 2 : 1);
      for (let lot = 0; lot < lots; lot++) {
        const jx = lots === 2 ? (lot === 0 ? -5 : 5) : 0;
        const jz = lots === 2 ? (lot === 0 ? -4 : 4) : 0;
        const x = bx + jx + rng() * 3 - 1.5;
        const z = bz + jz + rng() * 3 - 1.5;
        if (nearClear(x, z, 11)) continue;
        const wide = d === 'industrial' || d === 'harbor';
        const w = wide ? 15 + rng() * 4 : 9 + rng() * 7;
        const dep = wide ? 13 + rng() * 4 : 9 + rng() * 7;
        const h = heightFor(d);
        const mat = buildingMats[Math.floor(rng() * buildingMats.length)];
        const b = new THREE.Mesh(boxGeo, mat);
        b.position.set(x, h / 2, z);
        b.scale.set(w, h, dep);
        b.rotation.y = rng() < 0.5 ? 0 : Math.PI / 2;
        scene.add(b);
        built++;
      }
    }
  }

  // --- Anchor buildings: garage, mart, motel, fence yard ------------------
  function anchorBox(x, z, w, h, d, color) {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    m.position.set(x, h / 2, z);
    m.scale.set(w, h, d);
    scene.add(m);
    return m;
  }
  anchorBox(-90, -80, 18, 6, 12, 0x2e6f6a); // garage hall behind the forecourt
  anchorBox(-72, -72, 12, 5, 9, 0xc96a2e); // corner mart
  anchorBox(134, -120, 14, 7, 18, 0x7a6a9a); // motel block by the safehouse
  anchorBox(110, 152, 20, 4, 6, 0x4a4a52); // fence yard back wall
  const boothRoof = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x3a7a8a, roughness: 0.7 }));
  boothRoof.position.set(-90, 4.4, -50);
  boothRoof.scale.set(10, 0.4, 8);
  scene.add(boothRoof);

  // Harbor docks: piers + crates.
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a5232, roughness: 0.95 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 });
  for (const pz of [112, 130, 148]) {
    const pier = new THREE.Mesh(boxGeo, woodMat);
    pier.position.set(150, 0.4, pz);
    pier.scale.set(26, 0.8, 5);
    scene.add(pier);
  }
  for (let i = 0; i < 6; i++) {
    const crate = new THREE.Mesh(boxGeo, crateMat);
    crate.position.set(128 + rng() * 40, 0.9, 106 + rng() * 56);
    crate.scale.set(2.2, 1.8, 2.2);
    crate.rotation.y = rng() * Math.PI;
    scene.add(crate);
  }

  // --- Lamps: instanced poles + heads + shared glow sprites --------------
  const lampSpots = [];
  ROAD_LINES.forEach((line, li) => {
    if (li % 2 !== 0) return;
    for (let v = -150; v <= 150; v += 120) {
      if (nearClear(line + 7, v, 10) || nearClear(line - 7, v, 10)) continue;
      lampSpots.push([line + 6.5, v]);
      lampSpots.push([line - 6.5, v + 60]);
    }
  });
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 6, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.6, metalness: 0.5 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
  const headGeo = new THREE.SphereGeometry(0.32, 8, 6);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffc27a, emissiveIntensity: 0 });
  const heads = new THREE.InstancedMesh(headGeo, headMat, lampSpots.length);
  const dummy = new THREE.Object3D();
  const lampGlowMat = new THREE.SpriteMaterial({
    map: S.glowTexture,
    color: 0xffc27a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  lampSpots.forEach(([x, z], i) => {
    dummy.position.set(x, 3, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 6.1, z);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    const glow = new THREE.Sprite(lampGlowMat);
    glow.position.set(x, 6.1, z);
    glow.scale.set(7, 7, 1);
    scene.add(glow);
  });
  poles.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  scene.add(poles);
  scene.add(heads);

  // --- Billboards -----------------------------------------------------------
  const boards = [
    ['SOLMAR', 0x1a2a4a, '#ffd24a', -40, 132],
    ['VICE', 0x4a1a2a, '#ff7ab0', 40, 132],
    ['PIER 9', 0x1a4a3a, '#7affd4', -120, 132],
    ['NEON', 0x2a1a4a, '#b07aff', 120, 132],
    ['BAYLINE', 0x4a3a1a, '#fff2a0', -140, -20],
    ['TACOS', 0x4a2a1a, '#ffb347', 60, -140],
  ];
  const billboardMeshes = [];
  for (const [word, bg, fg, x, z] of boards) {
    const tex = billboardTexture(word, '#' + bg.toString(16).padStart(6, '0'), fg);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55 })
    );
    m.position.set(x, 16 + rng() * 6, z);
    m.rotation.y = rng() * Math.PI;
    scene.add(m);
    const post = new THREE.Mesh(boxGeo, poleMat);
    post.position.set(x, 8, z);
    post.scale.set(0.6, 16, 0.6);
    scene.add(post);
    billboardMeshes.push(m);
  }

  // --- Bus stops, hydrants, bins -------------------------------------------
  const stopMat = new THREE.MeshStandardMaterial({ color: 0x3a5a7a, roughness: 0.7 });
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
  const stopSpots = [[-30, 37], [30, -37], [90, 37], [-90, -37], [150, -7], [-150, 7]];
  for (const [x, z] of stopSpots) {
    const shelter = new THREE.Mesh(boxGeo, stopMat);
    shelter.position.set(x, 2.6, z);
    shelter.scale.set(6, 0.3, 2.4);
    scene.add(shelter);
    const bench = new THREE.Mesh(boxGeo, benchMat);
    bench.position.set(x, 0.5, z);
    bench.scale.set(5, 0.25, 0.9);
    scene.add(bench);
  }
  const hydGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.9, 8);
  const hydMat = new THREE.MeshStandardMaterial({ color: 0xb02020, roughness: 0.5 });
  const hydrants = new THREE.InstancedMesh(hydGeo, hydMat, 12);
  const binGeo = new THREE.BoxGeometry(0.9, 1.1, 0.9);
  const binMat = new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 0.9 });
  const bins = new THREE.InstancedMesh(binGeo, binMat, 16);
  for (let i = 0; i < 12; i++) {
    dummy.position.set(-170 + i * 31, 0.45, 96 + (i % 2) * 8);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    hydrants.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < 16; i++) {
    dummy.position.set(-160 + (i % 8) * 44, 0.55, -96 + Math.floor(i / 8) * 180);
    dummy.rotation.set(0, rng() * 0.6, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bins.setMatrixAt(i, dummy.matrix);
  }
  hydrants.instanceMatrix.needsUpdate = true;
  bins.instanceMatrix.needsUpdate = true;
  scene.add(hydrants);
  scene.add(bins);

  // --- Palms on the beach ---------------------------------------------------
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const x = -150 + i * 60 + rng() * 10;
    const z = 158 + rng() * 14;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 6, 6), trunkMat);
    trunk.position.set(x, 3, z);
    trunk.rotation.z = (rng() - 0.5) * 0.2;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), crownMat);
    crown.position.set(x, 6.4, z);
    crown.scale.set(1, 0.45, 1);
    scene.add(crown);
  }

  // --- Decorative parked cars along the curbs -------------------------------
  const carPalette = [0xb02020, 0x2050b0, 0xd8c020, 0x20b070, 0xe0e0e0, 0x30343a, 0x9020a0];
  const carBodyGeo = new THREE.BoxGeometry(1.9, 0.6, 4.3);
  const carCabinGeo = new THREE.BoxGeometry(1.6, 0.55, 2.1);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.2, metalness: 0.6 });
  const parkedSpots = [];
  let guard = 0;
  while (parkedSpots.length < 12 && guard++ < 200) {
    const line = ROAD_LINES[Math.floor(rng() * ROAD_LINES.length)];
    const along = -165 + rng() * 330;
    const side = rng() < 0.5 ? 1 : -1;
    const vertical = rng() < 0.5;
    const x = vertical ? line + side * 6.8 : along;
    const z = vertical ? along : line + side * 6.8;
    if (nearClear(x, z, 15)) continue;
    if (Math.abs(x) > 185 || Math.abs(z) > 185) continue;
    parkedSpots.push([x, z, vertical ? Math.PI / 2 : 0]);
  }
  for (const [x, z, rot] of parkedSpots) {
    const paint = new THREE.MeshStandardMaterial({ color: carPalette[Math.floor(rng() * carPalette.length)], roughness: 0.35, metalness: 0.5 });
    const body = new THREE.Mesh(carBodyGeo, paint);
    body.position.set(x, 0.45, z);
    body.rotation.y = rot;
    scene.add(body);
    const cabin = new THREE.Mesh(carCabinGeo, glassMat);
    cabin.position.set(x, 0.95, z);
    cabin.rotation.y = rot;
    scene.add(cabin);
  }

  // --- Moving traffic on rectangular loops around blocks --------------------
  const trafficHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffe9a0, emissiveIntensity: 0 });
  const traffic = [];
  for (let i = 0; i < 10; i++) {
    const cx = BLOCK_CENTERS[Math.floor(rng() * BLOCK_CENTERS.length)];
    const cz = BLOCK_CENTERS[Math.floor(rng() * BLOCK_CENTERS.length)];
    if (nearClear(cx, cz, 20)) { i--; continue; }
    const group = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: carPalette[Math.floor(rng() * carPalette.length)], roughness: 0.35, metalness: 0.5 });
    const body = new THREE.Mesh(carBodyGeo, paint);
    body.position.y = 0.45;
    const cabin = new THREE.Mesh(carCabinGeo, glassMat);
    cabin.position.y = 0.95;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.1), trafficHeadMat);
    beam.position.set(0, 0.5, 2.18);
    group.add(body, cabin, beam);
    scene.add(group);
    traffic.push({ group, cx, cz, s: rng() * 120, speed: 6 + rng() * 3 });
  }
  S.traffic = traffic;

  const trafficTick = (dt) => {
    for (const t of traffic) {
      t.s = (t.s + t.speed * dt) % 120;
      const s = t.s;
      let x;
      let z;
      let heading;
      if (s < 30) { x = t.cx - 15 + s; z = t.cz - 15; heading = Math.PI / 2; }
      else if (s < 60) { x = t.cx + 15; z = t.cz - 15 + (s - 30); heading = 0; }
      else if (s < 90) { x = t.cx + 15 - (s - 60); z = t.cz + 15; heading = -Math.PI / 2; }
      else { x = t.cx - 15; z = t.cz + 15 - (s - 90); heading = Math.PI; }
      t.group.position.set(x, 0, z);
      t.group.rotation.y = heading;
    }
  };
  S._tick.push(trafficTick);

  S._cityMats = {
    buildings: buildingMats,
    lampGlow: lampGlowMat,
    lampHead: headMat,
    trafficHead: trafficHeadMat,
    billboards: billboardMeshes,
  };
  S.city = { built, lampCount: lampSpots.length, trafficCount: traffic.length };
  return S.city;
}
