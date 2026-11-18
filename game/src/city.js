// SOLMAR BAY — the city. Deterministic: mulberry32(1337) drives every
// placement, so the city is identical on every load.
//
// Layout (level-design: grid of blocks, landmarks for guidance):
//   Road centre lines at -120, -60, 0, 60, 120 on both axes (width 12).
//   Blocks are the squares BETWEEN roads, centres at -90, -30, 30, 90,
//   each spanning centre +/- 24 — exactly filling the gap between roads.
//   Buildings live strictly inside their block, never on a road.
// Landmarks: teal garage (spawn, NW block), stone bank (centre-east),
// harbour crates (SE, by the beach), pier (south beach into the water).
import * as THREE from 'three';
import { CFG } from './config.js';
import { mulberry32, rand, randInt, pick, chance } from './random.js';
import {
  makeGlowTexture,
  makeNoiseTexture,
  makeWaterMaterial,
} from './sky.js';

const ROAD_LINES = [-120, -60, 0, 60, 120];
const BLOCK_CENTRES = [-90, -30, 30, 90];
const ROAD_HALF = 6;
const CITY_SEED = 1337;

// ---------------------------------------------------------------------------
// Runtime canvas textures (no external assets, no network at runtime).
// ---------------------------------------------------------------------------

function makeRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d');
  // Wet-look asphalt: dark base with patch variation.
  g.fillStyle = '#33373d';
  g.fillRect(0, 0, 64, 256);
  // Local seeded speckle — never touches the city rng stream.
  let a = 555 >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 900; i++) {
    g.fillStyle = next() < 0.5 ? '#2b2f34' : '#454a51';
    g.globalAlpha = 0.08 + next() * 0.14;
    g.fillRect(next() * 64, next() * 256, 1 + next() * 2, 1 + next() * 2);
  }
  g.globalAlpha = 1;
  // Repaired patches.
  for (let i = 0; i < 3; i++) {
    g.fillStyle = '#2e3237';
    g.globalAlpha = 0.5;
    g.fillRect(6 + next() * 40, next() * 220, 10 + next() * 14, 8 + next() * 16);
  }
  g.globalAlpha = 1;
  // Edge lines, slightly warm from the sunset.
  g.fillStyle = '#d8cbb0';
  g.fillRect(2, 0, 3, 256);
  g.fillRect(59, 0, 3, 256);
  // Dashed centre line.
  g.fillStyle = '#f2c200';
  for (let y = 0; y < 256; y += 64) {
    g.fillRect(30, y + 8, 4, 32);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Facade with a lit-window grid. One texture per base colour, cached.
// The lit windows are recorded in the same loop that draws them, then an
// emissive map is painted from the same flags — at dusk the lit windows
// glow warm while dark windows stay dead. (No extra rng calls: the city
// layout stream is untouched.)
const facadeCache = new Map();
function facadeMaterial(baseHex, rng) {
  const key = baseHex.toString(16);
  if (facadeCache.has(key)) return facadeCache.get(key);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const base = '#' + baseHex.toString(16).padStart(6, '0');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  // Slight vertical shading so tall towers read as one volume.
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  // Window grid: 4 columns x 10 rows, some lit warm.
  const lit = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 4; col++) {
      const isLit = rng() < 0.35;
      lit.push(isLit);
      g.fillStyle = isLit ? '#ffe9a8' : '#2a3542';
      g.fillRect(12 + col * 28, 14 + row * 24, 18, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Emissive map: only the lit windows glow.
  const ec = document.createElement('canvas');
  ec.width = 128;
  ec.height = 256;
  const eg = ec.getContext('2d');
  eg.fillStyle = '#000000';
  eg.fillRect(0, 0, 128, 256);
  let i = 0;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 4; col++) {
      if (lit[i]) {
        eg.fillStyle = '#ffb347';
        eg.fillRect(12 + col * 28, 14 + row * 24, 18, 14);
      }
      i++;
    }
  }
  const emissiveTex = new THREE.CanvasTexture(ec);
  emissiveTex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    emissive: 0xffc46b,
    emissiveMap: emissiveTex,
    emissiveIntensity: 0.85,
  });
  facadeCache.set(key, mat);
  return mat;
}

function makeSignTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg;
  g.font = 'bold 56px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Small builders.
// ---------------------------------------------------------------------------

function box(w, h, d, mat, x, y, z, scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}

function flatPlane(w, d, mat, x, y, z, scene) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}

// ---------------------------------------------------------------------------
// buildCity
// ---------------------------------------------------------------------------

export function buildCity(scene) {
  const rng = mulberry32(CITY_SEED);
  const colliders = [];
  const B = CFG.CITY.bounds;

  const groundTex = makeNoiseTexture('#8f8f80', '#7a7a6e', '#a5a596', 4242);
  groundTex.repeat.set(24, 24);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex, color: 0xffffff, roughness: 0.95, metalness: 0.0,
  });
  const sidewalkMat = new THREE.MeshLambertMaterial({ color: CFG.COLORS.sidewalk });
  const sandTex = makeNoiseTexture('#d9b06a', '#c49a52', '#ecd09a', 777);
  sandTex.repeat.set(18, 2);
  const sandMat = new THREE.MeshStandardMaterial({
    map: sandTex, color: 0xffffff, roughness: 1.0, metalness: 0.0,
  });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5a58 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x2c2f33 });
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6a4a28 });
  const leafMats = [
    new THREE.MeshLambertMaterial({ color: 0x3f8f4f }),
    new THREE.MeshLambertMaterial({ color: 0x4f9a3a }),
    new THREE.MeshLambertMaterial({ color: 0x2f7a4a }),
  ];
  const palmLeafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e5f });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x30343a });
  const lampGlowMat = new THREE.MeshLambertMaterial({
    color: 0xfff2c0,
    emissive: 0xffe9a0,
  });
  const hydrantMat = new THREE.MeshLambertMaterial({ color: 0xc02020 });
  const crateMat = new THREE.MeshLambertMaterial({ color: 0xb07830 });
  const crateMat2 = new THREE.MeshLambertMaterial({ color: 0x3f7a8c });
  const tealMat = new THREE.MeshLambertMaterial({ color: 0x1e9e8c });
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xcfc4a8 });
  // Dedicated stream for NEW decoration only — the main rng stream (and
  // therefore the whole city layout) is never disturbed.
  const rng2 = mulberry32(31337);

  // --- Ground: city slab, then beach strip south of it, then water. ---
  flatPlane(300, 300, groundMat, 0, 0, 0, scene);
  flatPlane(300, 30, sandMat, 0, 0.01, 165, scene);          // beach z 150..180
  // Water: segmented plane driven by the animated shader (waves + fresnel
  // + sun glitter + shoreline foam). Kept in `water` for the main loop.
  const waterGeo = new THREE.PlaneGeometry(320, 140, 48, 20);
  const water = new THREE.Mesh(waterGeo, makeWaterMaterial());
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, 250);
  scene.add(water); // water z > 180

  // --- Roads: planes with a dashed-centre-line texture, both directions. ---
  // Standard material with a low roughness so the env map gives the
  // asphalt a damp sunset sheen.
  const roadTex = makeRoadTexture();
  for (const rx of ROAD_LINES) {
    const tex = roadTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, 12);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.45, metalness: 0.08, envMapIntensity: 0.7,
    });
    flatPlane(12, 300, mat, rx, 0.02, 0, scene);
  }
  for (const rz of ROAD_LINES) {
    const tex = roadTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, 12);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.45, metalness: 0.08, envMapIntensity: 0.7,
    });
    const m = flatPlane(300, 12, mat, 0, 0.02, rz, scene);
    m.rotation.z = Math.PI / 2; // texture runs along the road, not across it
  }

  // --- Sidewalks: strips flanking every road (walkable, non-colliding). ---
  for (const rx of ROAD_LINES) {
    flatPlane(3, 300, sidewalkMat, rx - ROAD_HALF - 1.5, 0.015, 0, scene);
    flatPlane(3, 300, sidewalkMat, rx + ROAD_HALF + 1.5, 0.015, 0, scene);
  }
  for (const rz of ROAD_LINES) {
    flatPlane(300, 3, sidewalkMat, 0, 0.015, rz - ROAD_HALF - 1.5, scene);
    flatPlane(300, 3, sidewalkMat, 0, 0.015, rz + ROAD_HALF + 1.5, scene);
  }

  // --- Crosswalks: white stripes across every intersection. ---
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e0 });
  for (const rx of ROAD_LINES) {
    for (const rz of ROAD_LINES) {
      for (let i = -2; i <= 2; i++) {
        // Stripes a driver crosses heading north/south (vary x, span z).
        box(1.2, 0.05, 3, stripeMat, rx + i * 2.4, 0.03, rz - ROAD_HALF - 1, scene);
        box(1.2, 0.05, 3, stripeMat, rx + i * 2.4, 0.03, rz + ROAD_HALF + 1, scene);
        // Stripes a driver crosses heading east/west (vary z, span x).
        box(3, 0.05, 1.2, stripeMat, rx - ROAD_HALF - 1, 0.03, rz + i * 2.4, scene);
        box(3, 0.05, 1.2, stripeMat, rx + ROAD_HALF + 1, 0.03, rz + i * 2.4, scene);
      }
    }
  }

  // --- Buildings. One block at a time; each building stays >= 4 units ---
  // --- inside its block edges, so no building ever touches a road.    ---
  function addBuilding(cx, cz, w, d, h, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(cx, h / 2, cz);
    scene.add(m);
    // Flat roof slab, slightly proud of the walls.
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), roofMat);
    roof.position.set(cx, h + 0.25, cz);
    scene.add(roof);
    colliders.push({
      minX: cx - w / 2, maxX: cx + w / 2,
      minZ: cz - d / 2, maxZ: cz + d / 2, h,
    });
    // Rooftop clutter on taller buildings: AC unit + antenna.
    if (h >= 20) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), darkMat);
      ac.position.set(cx + w / 4, h + 1, cz - d / 4);
      scene.add(ac);
      if (chance(rng, 0.6)) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5, 6), darkMat);
        mast.position.set(cx - w / 4, h + 2.5, cz + d / 4);
        scene.add(mast);
      }
    }
    return m;
  }

  function scatterInBlock(bx, bz, count) {
    // Try candidate footprints; accept only if inside the block with >= 4
    // margin and not overlapping a building already placed in this block.
    const placed = [];
    let attempts = 0;
    while (placed.length < count && attempts < 40) {
      attempts++;
      const w = rand(rng, 10, 30);
      const d = rand(rng, 10, 30);
      // Centre must stay within blockHalf - 4 - halfSize of the block centre.
      const maxOffX = 24 - 4 - w / 2;
      const maxOffZ = 24 - 4 - d / 2;
      if (maxOffX <= 0 || maxOffZ <= 0) continue;
      const cx = bx + rand(rng, -maxOffX, maxOffX);
      const cz = bz + rand(rng, -maxOffZ, maxOffZ);
      const distCentre = Math.hypot(cx, cz);
      const h = Math.round(rand(rng, 8, 28) + (1 - distCentre / 185) * 17); // 8..45, taller downtown
      let overlap = false;
      for (const p of placed) {
        if (Math.abs(cx - p.x) < (w + p.w) / 2 + 2 && Math.abs(cz - p.z) < (d + p.d) / 2 + 2) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;
      placed.push({ x: cx, z: cz, w, d });
      addBuilding(cx, cz, w, d, h, facadeMaterial(pick(rng, CFG.COLORS.buildings), rng));
    }
  }

  for (const bx of BLOCK_CENTRES) {
    for (const bz of BLOCK_CENTRES) {
      if (bx === -90 && bz === -90) continue; // garage block (special)
      if (bx === 30 && bz === 30) continue;   // bank block (special)
      scatterInBlock(bx, bz, randInt(rng, 1, 3));
    }
  }

  // --- Garage (spawn landmark): teal, low, flat roof, sign box on top. ---
  addBuilding(-90, -90, 30, 20, 10, tealMat);
  const signTex = makeSignTexture('SOLMAR GARAGE', '#123f3a', '#7df2e0');
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(24, 4, 1),
    new THREE.MeshLambertMaterial({ map: signTex }),
  );
  sign.position.set(-90, 12.5, -79.4); // front face, facing the road at z = -60
  scene.add(sign);

  // --- Bank (mission landmark): pale stone tower with a columned porch. ---
  addBuilding(30, 30, 26, 26, 30, stoneMat);
  for (let i = -1; i <= 1; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 8, 8), stoneMat);
    col.position.set(30 + i * 8, 4, 44.5);
    scene.add(col);
  }
  box(20, 1, 4, stoneMat, 30, 8.5, 44.5, scene); // porch roof

  // --- Harbour crates near (90, 138): stacked containers by the beach. ---
  const crateSpots = [
    [84, 136, 0], [92, 138, 0.4], [88, 142, 1.2],
    [98, 134, 0.9], [84, 136, 2.4], [96, 142, 2.2],
  ];
  for (const [x, z, y] of crateSpots) {
    const m = box(6, 2.4, 6, chance(rng, 0.5) ? crateMat : crateMat2, x, y + 1.2, z, scene);
    m.rotation.y = rand(rng, -0.2, 0.2);
  }

  // --- Pier: wooden deck from the beach out over the water (x = -40). ---
  for (let z = 152; z <= 208; z += 4) {
    box(6, 0.4, 4, woodMat, -40, 0.6, z, scene);
  }
  for (const px of [-43.5, -36.5]) {
    for (let z = 156; z <= 208; z += 13) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 6), darkMat);
      post.position.set(px, 0.8, z);
      scene.add(post);
    }
  }
  // Small hut at the pier end.
  box(5, 3, 4, woodMat, -40, 2.1, 206, scene);
  box(5.6, 0.4, 4.6, darkMat, -40, 3.8, 206, scene);

  // --- Beach life: boardwalk, lifeguard tower, umbrellas. ---
  // Boardwalk planks along the top of the sand (z 148..152).
  for (let x = -148; x <= 148; x += 4) {
    box(4, 0.3, 4, woodMat, x, 0.15, 150, scene);
  }
  // Lifeguard tower at x = 20: four legs, cabin, roof.
  const towerMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  const redMat = new THREE.MeshLambertMaterial({ color: 0xd83a2e });
  for (const [lx, lz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 6), woodMat);
    leg.position.set(20 + lx, 1.7, 162 + lz);
    scene.add(leg);
  }
  box(4, 2.2, 4, towerMat, 20, 4.5, 162, scene);
  box(4.6, 0.3, 4.6, redMat, 20, 5.7, 162, scene);
  // Umbrellas: tilted pole + cone canopy, dotted along the sand.
  const umbrellaMat = new THREE.MeshLambertMaterial({ color: 0xe86a8c });
  const umbrellaMat2 = new THREE.MeshLambertMaterial({ color: 0x2e9ed8 });
  for (const ux of [-110, -70, -10, 50, 110]) {
    const uz = 168 + rand(rng, -2, 2);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), woodMat);
    pole.position.set(ux, 1.3, uz);
    pole.rotation.z = 0.12;
    scene.add(pole);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1, 8),
      chance(rng, 0.5) ? umbrellaMat : umbrellaMat2,
    );
    canopy.position.set(ux + 0.3, 2.9, uz);
    scene.add(canopy);
  }

  // --- Street props (decoration only — never colliders). ---
  // Lamp glow positions, batched into one additive Points draw call.
  const lampPositions = [];
  function addLamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5, 6), lampMat);
    pole.position.set(x, 2.5, z);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampGlowMat);
    head.position.set(x, 5.1, z);
    scene.add(head);
    lampPositions.push(x, 5.1, z);
  }
  function addTree(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6), trunkMat);
    trunk.position.set(x, 1.2, z);
    scene.add(trunk);
    // Varied leaf colour from the decoration stream (layout stream safe).
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 8, 6),
      leafMats[Math.floor(rng2() * leafMats.length)],
    );
    crown.position.set(x, 3.4, z);
    scene.add(crown);
  }
  function addPalm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 5, 6), trunkMat);
    trunk.position.set(x, 2.5, z);
    trunk.rotation.z = rand(rng, -0.08, 0.08);
    scene.add(trunk);
    for (let i = 0; i < 5; i++) {
      const frond = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.7), palmLeafMat);
      const a = (i / 5) * Math.PI * 2;
      frond.position.set(x + Math.cos(a) * 1.2, 5.1, z + Math.sin(a) * 1.2);
      frond.rotation.y = -a;
      frond.rotation.z = 0.25;
      scene.add(frond);
    }
  }
  function addHydrant(x, z) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.9, 8), hydrantMat);
    body.position.set(x, 0.45, z);
    scene.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), hydrantMat);
    cap.position.set(x, 0.95, z);
    scene.add(cap);
  }
  function addBench(x, z, rotY) {
    const seat = box(2.4, 0.15, 0.8, woodMat, x, 0.55, z, scene);
    seat.rotation.y = rotY;
    box(0.15, 0.5, 0.7, darkMat, x - 0.9, 0.25, z, scene);
    box(0.15, 0.5, 0.7, darkMat, x + 0.9, 0.25, z, scene);
  }

  // Lamps along every road, both sides, every 30 units.
  for (const rx of ROAD_LINES) {
    for (let z = -135; z <= 135; z += 30) {
      addLamp(rx - ROAD_HALF - 2.2, z + (chance(rng, 0.5) ? 4 : -4));
      addLamp(rx + ROAD_HALF + 2.2, z + (chance(rng, 0.5) ? 4 : -4));
    }
  }
  // One batched glow sprite per lamp head — warm halos without a draw
  // call per lamp.
  {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lampPositions), 3));
    const glowMat = new THREE.PointsMaterial({
      size: 7,
      map: makeGlowTexture(),
      color: 0xffc46b,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const glows = new THREE.Points(geo, glowMat);
    glows.frustumCulled = false;
    scene.add(glows);
  }
  // Trees and benches scattered on sidewalks / block corners (off-road).
  for (let i = 0; i < 40; i++) {
    const bx = pick(rng, BLOCK_CENTRES);
    const bz = pick(rng, BLOCK_CENTRES);
    const x = bx + rand(rng, -20, 20);
    const z = bz + rand(rng, -20, 20);
    // Keep props clear of building footprints.
    let inside = false;
    for (const c of colliders) {
      if (x > c.minX - 1 && x < c.maxX + 1 && z > c.minZ - 1 && z < c.maxZ + 1) {
        inside = true;
        break;
      }
    }
    if (inside) continue;
    if (chance(rng, 0.6)) addTree(x, z);
    else addBench(x, z, pick(rng, [0, Math.PI / 2]));
  }
  // Palms along the beach, hydrants at a few intersections.
  for (let x = -140; x <= 140; x += 20) {
    addPalm(x + rand(rng, -4, 4), 156 + rand(rng, -2, 4));
  }
  for (const [x, z] of [[-129, -69], [51, -129], [-69, 51], [111, 111], [-9, -9]]) {
    addHydrant(x, z);
  }

  // --- Billboards (landmark signage) + one bus-stop shelter. ---
  function addBillboard(x, z, rotY, text, bg, fg) {
    const tex = makeSignTexture(text, bg, fg);
    for (const off of [-4, 4]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 9, 6), darkMat);
      pole.position.set(x + off * Math.cos(rotY), 4.5, z - off * Math.sin(rotY));
      scene.add(pole);
    }
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(12, 5, 0.5),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    panel.position.set(x, 11, z);
    panel.rotation.y = rotY;
    scene.add(panel);
  }
  addBillboard(-114, -30, Math.PI / 2, 'SOLMAR BAY', '#1e4a6e', '#ffe9a8');
  addBillboard(114, 90, -Math.PI / 2, 'VISIT THE PIER', '#6e2a1e', '#f2f2f2');
  // Bus stop on the sidewalk beside the north-south road at x = 60.
  box(4, 0.2, 2.2, darkMat, 68, 3.1, 30, scene); // shelter roof
  for (const [sx, sz] of [[66.2, 29], [69.8, 29], [66.2, 31], [69.8, 31]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), darkMat);
    post.position.set(sx, 1.5, sz);
    scene.add(post);
  }
  addBench(68, 30.6, Math.PI / 2);

  // --- Distant skyline: dusk silhouettes ringing the city so the horizon
  // --- never reads as empty flat land. Own seeded stream; a few towers
  // --- carry a red beacon that blooms in the post pass. ---
  {
    const skyRng = mulberry32(90210);
    const skyMats = [
      new THREE.MeshLambertMaterial({ color: 0x241f33 }),
      new THREE.MeshLambertMaterial({ color: 0x2e2438 }),
      new THREE.MeshLambertMaterial({ color: 0x1d1a2e }),
    ];
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + (skyRng() - 0.5) * 0.18;
      const r = 195 + skyRng() * 55;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (z > 150) continue; // keep the sea horizon open
      const w = 12 + skyRng() * 14;
      const d = 12 + skyRng() * 14;
      const h = 25 + skyRng() * 45;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        skyMats[Math.floor(skyRng() * skyMats.length)],
      );
      tower.position.set(x, h / 2, z);
      scene.add(tower);
      if (skyRng() < 0.4) {
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 6, 6), beaconMat);
        beacon.position.set(x, h + 1.2, z);
        scene.add(beacon);
      }
    }
  }

  // -------------------------------------------------------------------------
  // World interface for the rest of the game.
  // -------------------------------------------------------------------------

  function isOnRoad(x, z) {
    if (x < -B || x > B || z < -B || z > B) return false;
    for (const rx of ROAD_LINES) {
      if (Math.abs(x - rx) <= ROAD_HALF) return true;
    }
    for (const rz of ROAD_LINES) {
      if (Math.abs(z - rz) <= ROAD_HALF) return true;
    }
    return false;
  }

  // True when a circle of radius r at (x, z) touches any building AABB.
  function isInBuilding(x, z, r) {
    for (const c of colliders) {
      if (
        x + r > c.minX && x - r < c.maxX &&
        z + r > c.minZ && z - r < c.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  function clampPos(v) {
    v.x = Math.max(-B, Math.min(B, v.x));
    v.z = Math.max(-B, Math.min(B, v.z));
    return v;
  }

  // A point on a random road, heading along it (for car / ped spawns).
  function randomRoadPoint(rng2) {
    const along = rand(rng2, -144, 144);
    if (chance(rng2, 0.5)) {
      // Travel along a north-south road (constant x).
      const rx = pick(rng2, ROAD_LINES);
      return { x: rx, z: along, heading: chance(rng2, 0.5) ? 0 : Math.PI };
    }
    // Travel along an east-west road (constant z).
    const rz = pick(rng2, ROAD_LINES);
    return { x: along, z: rz, heading: chance(rng2, 0.5) ? Math.PI / 2 : -Math.PI / 2 };
  }

  // A point on a sidewalk strip beside a random road.
  function randomSidewalkPoint(rng2) {
    const along = rand(rng2, -144, 144);
    const side = pick(rng2, [-1, 1]);
    const off = ROAD_HALF + 2 + rand(rng2, 0, 1.5);
    if (chance(rng2, 0.5)) {
      return { x: pick(rng2, ROAD_LINES) + side * off, z: along };
    }
    return { x: along, z: pick(rng2, ROAD_LINES) + side * off };
  }

  const world = {
    scene,
    colliders,
    roadXs: [...ROAD_LINES],
    roadZs: [...ROAD_LINES],
    roadHalf: ROAD_HALF,
    bounds: B,
    garage: { x: -90, z: -90 },
    garageDoor: { x: -90, z: -66 },
    harbor: { x: 90, z: 138 },
    bank: { x: 30, z: 30 },
    spawn: { x: -84, z: -72 },
    water,
    isOnRoad,
    isInBuilding,
    clampPos,
    randomRoadPoint,
    randomSidewalkPoint,
  };
  return world;
}
