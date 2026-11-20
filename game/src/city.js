import * as THREE from '../vendor/three.module.min.js';

// SOLMAR BAY — the city itself: ground, roads, the bay, and every
// block of buildings, lamps and props the player can drive past.
// The map is a 360 x 360 grid centred on (0, 0). Roads run every 30
// metres; the squares between them hold the buildings, and each of
// the seven districts gets its own palette and skyline so the drive
// reads differently from the Strip to the Harbor.
//
// The day/night module drives this file's materials through
// S._cityMats (window glow, lamp halos, traffic lights, billboards),
// and the driving module asks S.isBlocked(x, z) before it lets a
// car through a wall. Both shapes are part of the wiring contract.

const WORLD_HALF = 182;
const ROAD_EVERY = 30;
const ROAD_HALF = 4.2;

// Same borders as the district lookup: beach owns the far south,
// the Strip sits just above it, the Harbor takes the south-east
// corner, Uptown the north-east, Downtown the middle, Old Town the
// north-west, and the rest is Industrial.
function zoneOf(x, z) {
  if (z >= 150) return 'beach';
  if (z >= 120 && z < 150 && x < 100) return 'strip';
  if (x >= 100 && z >= 100) return 'harbor';
  if (x >= 100 && z < 0) return 'uptown';
  if (Math.abs(x) < 100 && Math.abs(z) < 120) return 'downtown';
  if (x <= -100 && z < 0) return 'oldtown';
  return 'industrial';
}

// One look per district: wall colour, how tall the skyline runs,
// and how wide the footprints get.
const ZONE_STYLE = {
  downtown: { wall: 0x7d6a94, tall: [18, 46], wide: [13, 20], roof: 0x2c2438 },
  uptown: { wall: 0xb09a7a, tall: [10, 26], wide: [13, 19], roof: 0x4a3a2c },
  strip: { wall: 0x6a4a7a, tall: [8, 17], wide: [12, 18], roof: 0x241a2e },
  harbor: { wall: 0x5a6a72, tall: [6, 11], wide: [16, 24], roof: 0x2a3438 },
  beach: { wall: 0xe8d8b0, tall: [5, 9], wide: [10, 15], roof: 0xb0703a },
  oldtown: { wall: 0x9a7a5a, tall: [8, 16], wide: [12, 18], roof: 0x3a2c22 },
  industrial: { wall: 0x6a6a62, tall: [6, 12], wide: [15, 22], roof: 0x30302c },
};

const NEON = [0xff5a7a, 0x3ad8ff, 0xffd24a, 0x7affd4, 0xff8a3c];
const CONTAINER_COLORS = [0xc22e2e, 0x2e6fc2, 0x3a8a4a, 0xe8a33d, 0x7a4a9a];

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function init(S) {
  const scene = S.scene;
  const rng = typeof S.rand === 'function' ? S.rand : Math.random;

  const group = new THREE.Group();
  group.name = 'solmar-city';
  scene.add(group);

  const footprints = [];
  const buildingMats = [];
  const billboards = [];

  // ---- shared geometry + materials --------------------------------
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const wallMats = {};
  for (const [zone, style] of Object.entries(ZONE_STYLE)) {
    const mat = new THREE.MeshStandardMaterial({
      color: style.wall,
      roughness: 0.85,
      metalness: 0.05,
      emissive: 0xffc27a,
      emissiveIntensity: 0,
    });
    wallMats[zone] = mat;
    buildingMats.push(mat);
  }
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x241e2c, roughness: 0.95 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a3a, roughness: 0.15, metalness: 0.7,
    emissive: 0x335577, emissiveIntensity: 0.25,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.9 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7a3a, roughness: 0.9 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.6, metalness: 0.6 });
  const lampHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfff2b0, emissive: 0xffd27a, emissiveIntensity: 0.4, roughness: 0.4,
  });
  const lampGlowMat = new THREE.SpriteMaterial({
    map: S.glowTexture || null,
    color: 0xffc27a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const trafficMat = new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0x33ff66, emissiveIntensity: 0.4, roughness: 0.5,
  });

  function addBox(mat, w, h, d, x, y, z) {
    const m = new THREE.Mesh(boxGeo, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }

  // ---- ground, sand and water --------------------------------------
  const land = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshStandardMaterial({ color: 0x35303c, roughness: 1 }),
  );
  land.rotation.x = -Math.PI / 2;
  land.position.y = -0.05;
  group.add(land);

  // The beach: pale sand along the whole southern edge.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(380, 36),
    new THREE.MeshStandardMaterial({ color: 0xd8c090, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.01, 167);
  group.add(sand);

  // The bay itself, stretching south past the sand.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 160),
    new THREE.MeshStandardMaterial({ color: 0x1a4a6a, roughness: 0.25, metalness: 0.35 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.0, 265);
  group.add(water);

  // ---- roads --------------------------------------------------------
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1c1a20, roughness: 1 });
  const roadLines = [];
  for (let c = -180; c <= 180; c += ROAD_EVERY) roadLines.push(c);
  for (const c of roadLines) {
    const along = new THREE.Mesh(new THREE.PlaneGeometry(400, ROAD_HALF * 2), roadMat);
    along.rotation.x = -Math.PI / 2;
    along.position.set(0, 0.02, c);
    group.add(along);
    const across = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 400), roadMat);
    across.rotation.x = -Math.PI / 2;
    across.position.set(c, 0.02, 0);
    group.add(across);
  }

  // ---- buildings, one or two per block ------------------------------
  const blockCentres = [];
  for (let x = -165; x <= 165; x += ROAD_EVERY) {
    for (let z = -165; z <= 165; z += ROAD_EVERY) blockCentres.push([x, z]);
  }

  function raiseBuilding(bx, bz, zone) {
    const style = ZONE_STYLE[zone];
    const w = style.wide[0] + rng() * (style.wide[1] - style.wide[0]);
    const d = style.wide[0] + rng() * (style.wide[1] - style.wide[0]);
    const h = style.tall[0] + rng() * (style.tall[1] - style.tall[0]);
    const jx = (rng() - 0.5) * 3;
    const jz = (rng() - 0.5) * 3;
    const x = bx + jx;
    const z = bz + jz;
    const body = addBox(wallMats[zone], w, h, d, x, h / 2, z);
    body.castShadow = false;
    // A darker cap so rooftops read from above.
    addBox(roofMat, w + 0.3, 0.5, d + 0.3, x, h + 0.25, z);
    // A lit glass band near the top of taller towers.
    if (h > 14) {
      addBox(glassMat, w + 0.15, 1.1, d + 0.15, x, h * 0.72, z);
    }
    footprints.push({
      x0: x - w / 2, x1: x + w / 2,
      z0: z - d / 2, z1: z + d / 2,
    });
    return { x, z, w, h, d };
  }

  for (const [bx, bz] of blockCentres) {
    const zone = zoneOf(bx, bz);
    if (zone === 'beach') {
      // Beach huts stay low and sparse; the sand does the talking.
      if (rng() < 0.55) raiseBuilding(bx, bz, zone);
      continue;
    }
    if (zone === 'harbor') {
      // Warehouses: one wide shed per block, plus container stacks.
      const shed = raiseBuilding(bx, bz, zone);
      if (rng() < 0.7) {
        const cols = 1 + Math.floor(rng() * 3);
        for (let i = 0; i < cols; i++) {
          const cm = new THREE.MeshStandardMaterial({ color: pick(rng, CONTAINER_COLORS), roughness: 0.8 });
          addBox(cm, 6, 2.6, 2.6, shed.x + (i - 1) * 7, 1.3, shed.z + shed.d / 2 + 4);
        }
      }
      continue;
    }
    raiseBuilding(bx, bz, zone);
    // Downtown and the Strip sometimes squeeze a second tower in.
    if ((zone === 'downtown' || zone === 'strip') && rng() < 0.35) {
      const style = ZONE_STYLE[zone];
      const w = style.wide[0] * 0.55;
      const d = style.wide[0] * 0.55;
      const h = style.tall[0] + rng() * (style.tall[1] - style.tall[0]) * 0.6;
      const x = bx + 8;
      const z = bz - 8;
      addBox(wallMats[zone], w, h, d, x, h / 2, z);
      footprints.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    }
  }

  // ---- the pier ------------------------------------------------------
  addBox(woodMat, 12, 0.6, 34, 0, 0.6, 182);
  for (const px of [-5, 5]) {
    for (const pz of [170, 180, 190, 197]) {
      addBox(poleMat, 0.5, 3.4, 0.5, px, -0.6, pz);
    }
  }
  // A little bait shack at the pier root.
  raiseBuilding(0, 156, 'beach');

  // ---- harbor cranes -------------------------------------------------
  for (const [cx, cz, rot] of [[140, 128, 0.5], [158, 152, -0.4]]) {
    const crane = new THREE.Group();
    crane.position.set(cx, 0, cz);
    crane.rotation.y = rot;
    const mast = new THREE.Mesh(boxGeo, poleMat);
    mast.scale.set(1.6, 26, 1.6);
    mast.position.y = 13;
    const jib = new THREE.Mesh(boxGeo, poleMat);
    jib.scale.set(1.2, 1.2, 22);
    jib.position.set(0, 25, 6);
    const hook = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xe8a33d, roughness: 0.6 }));
    hook.scale.set(1.4, 1.4, 1.4);
    hook.position.set(0, 18, 14);
    crane.add(mast, jib, hook);
    group.add(crane);
    footprints.push({ x0: cx - 1.5, x1: cx + 1.5, z0: cz - 1.5, z1: cz + 1.5 });
  }

  // ---- street lamps --------------------------------------------------
  const lampPositions = [];
  for (let x = -150; x <= 150; x += 60) {
    for (let z = -150; z <= 150; z += 60) lampPositions.push([x + 6, z + 6]);
  }
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6);
  const headGeo = new THREE.SphereGeometry(0.28, 8, 6);
  for (const [lx, lz] of lampPositions) {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(lx, 2.6, lz);
    group.add(pole);
    const head = new THREE.Mesh(headGeo, lampHeadMat);
    head.position.set(lx, 5.3, lz);
    group.add(head);
    const glow = new THREE.Sprite(lampGlowMat);
    glow.scale.set(7, 7, 1);
    glow.position.set(lx, 5.3, lz);
    group.add(glow);
  }

  // ---- traffic lights at the big junctions ---------------------------
  const lightSpots = [[-60, -60], [60, -60], [-60, 60], [60, 60], [0, 0], [-120, 0], [120, 0], [0, -120]];
  for (const [tx, tz] of lightSpots) {
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.scale.set(1, 1.15, 1);
    pole.position.set(tx + 5, 3, tz + 5);
    group.add(pole);
    addBox(trafficMat, 0.5, 1.1, 0.5, tx + 5, 6.2, tz + 5);
  }

  // ---- billboards over the Strip and Downtown ------------------------
  const boardSpots = [
    { x: -30, z: 132, rot: 0, color: 0xff5a7a },
    { x: 30, z: 132, rot: 0, color: 0x3ad8ff },
    { x: -45, z: -15, rot: Math.PI / 2, color: 0xffd24a },
    { x: 45, z: 15, rot: -Math.PI / 2, color: 0x7affd4 },
  ];
  for (const b of boardSpots) {
    const mat = new THREE.MeshBasicMaterial({
      color: b.color, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), mat);
    board.position.set(b.x, 12, b.z);
    board.rotation.y = b.rot;
    group.add(board);
    billboards.push({ material: mat });
    // Two posts hold it up.
    addBox(poleMat, 0.4, 12, 0.4, b.x - 5, 6, b.z);
    addBox(poleMat, 0.4, 12, 0.4, b.x + 5, 6, b.z);
  }

  // ---- palms along the beach -----------------------------------------
  const palmGeo = new THREE.CylinderGeometry(0.14, 0.22, 4.5, 6);
  const crownGeo = new THREE.IcosahedronGeometry(1.6, 0);
  for (let i = 0; i < 12; i++) {
    const px = -160 + i * 29 + (rng() - 0.5) * 8;
    const pz = 158 + rng() * 8;
    const trunk = new THREE.Mesh(palmGeo, trunkMat);
    trunk.position.set(px, 2.25, pz);
    trunk.rotation.z = (rng() - 0.5) * 0.2;
    group.add(trunk);
    const crown = new THREE.Mesh(crownGeo, leafMat);
    crown.position.set(px, 5, pz);
    crown.scale.y = 0.6;
    group.add(crown);
    footprints.push({ x0: px - 0.5, x1: px + 0.5, z0: pz - 0.5, z1: pz + 0.5 });
  }

  // ---- neon strip signs ----------------------------------------------
  for (let i = 0; i < 6; i++) {
    const nx = -75 + i * 30;
    const mat = new THREE.MeshBasicMaterial({
      color: pick(rng, NEON), transparent: true, opacity: 0.8,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), mat);
    sign.position.set(nx, 6.5, 126);
    group.add(sign);
  }

  // ---- wiring the rest of the game expects ---------------------------
  S._cityMats = {
    buildings: buildingMats,
    lampGlow: lampGlowMat,
    lampHead: lampHeadMat,
    trafficHead: trafficMat,
    billboards,
  };

  S.isBlocked = (x, z) => {
    for (const f of footprints) {
      if (x > f.x0 - 0.7 && x < f.x1 + 0.7 && z > f.z0 - 0.7 && z < f.z1 + 0.7) return true;
    }
    return false;
  };

  S.city = {
    zoneOf,
    footprints,
    bounds: WORLD_HALF,
    group,
  };

  return group;
}
