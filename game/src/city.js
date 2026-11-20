// SOLMAR BAY — city builder (round 8, written fresh from the spec).
// Lays down the ground, the road grid, the building blocks, the Strip
// and downtown, and publishes the map layout on ctx.api for the other
// modules (vehicles, police, districts) to read.
import * as THREE from '../vendor/three.module.min.js';

// Tiny deterministic RNG so the skyline is the same on every load.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLEAR_SPOTS = [
  // [x, z, radius] — keep buildings off gameplay spots other modules use.
  [0, 0, 16],       // downtown chase staging
  [0, 135, 12],     // the Strip district heart
  [0, 165, 12],     // beach district heart
  [120, 120, 12],   // harbor district heart
  [120, -90, 12],   // uptown district heart
  [-90, -66, 13],   // garage
  [-72, -60, 11],   // MART corner store
  [120, -120, 13],  // safehouse
  [-90, -58, 11],   // pay-n-spray booth
  [110, 138, 20],   // Vic's fence yard
  [-88, -64, 9],    // parked bike
  [-102, -64, 9],   // parked sport car
  [-60, -60, 11],   // race start pad
  [68, 60, 11],     // taxi stand
  [-120, 120, 9],   // package spot
  [60, -60, 10], [60, 60, 10], [-60, 60, 10], // race gates
];

function nearClearSpot(x, z) {
  for (const [cx, cz, r] of CLEAR_SPOTS) {
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

// A canvas texture of lit windows, shared by every building so the
// sunset glow is cheap: one texture, one material family.
function makeWindowTexture() {
  try {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#241d28'; g.fillRect(0, 0, 64, 128);
    const lit = ['#ffb347', '#ff8c42', '#ffd28a', '#ff6b6b', '#ffe9a8'];
    const rnd = mulberry32(90210);
    for (let y = 8; y < 120; y += 14) {
      for (let x = 6; x < 58; x += 12) {
        if (rnd() < 0.55) {
          g.fillStyle = lit[(rnd() * lit.length) | 0];
          g.globalAlpha = 0.55 + rnd() * 0.45;
          g.fillRect(x, y, 7, 9);
        } else {
          g.fillStyle = '#120e14'; g.globalAlpha = 1;
          g.fillRect(x, y, 7, 9);
        }
      }
    }
    g.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
  } catch (e) {
    return null;
  }
}

export function init(ctx) {
  const THREE_NS = ctx.THREE || THREE;
  const scene = ctx.scene;
  const S = ctx.state;
  const rnd = mulberry32(1337);

  const BOUNDS = { minX: -180, maxX: 180, minZ: -180, maxZ: 180, size: 360 };
  const ROAD_XS = []; for (let x = -180; x <= 180; x += 30) ROAD_XS.push(x);
  const ROAD_ZS = []; for (let z = -180; z <= 180; z += 30) ROAD_ZS.push(z);

  // ---- ground ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 460),
    new THREE.MeshLambertMaterial({ color: 0x3b362f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  // Beach sand at the north shore.
  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(52, 28),
    new THREE.MeshLambertMaterial({ color: 0xd9b380 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.015, 168);
  scene.add(sand);

  // Bay water off the harbor side.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshLambertMaterial({ color: 0x1d4a6b })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(225, 0.01, 120);
  scene.add(water);

  // ---- road grid ----
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x232028 });
  const roads = [];
  for (const x of ROAD_XS) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(9, 400), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.02, 0);
    scene.add(r); roads.push(r);
  }
  for (const z of ROAD_ZS) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(400, 9), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(0, 0.02, z);
    scene.add(r); roads.push(r);
  }
  // Pale centre dashes down the two main avenues.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xc9a86a });
  for (let d = -170; d <= 170; d += 20) {
    for (const [x, z, w, h] of [[0, d, 0.6, 4], [d, 0, 4, 0.6]]) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(w, h), dashMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.03, z);
      scene.add(dash);
    }
  }

  // ---- buildings ----
  const winTex = makeWindowTexture();
  const wallPalette = [0x6b4a3a, 0x54423e, 0x7a5a44, 0x4a3f55, 0x635040, 0x8a6a52, 0x3f4a55];
  const stripPalette = [0x9a4a6a, 0x6a4a9a, 0xc97a3a, 0x4a7a8a, 0xb05a5a];
  const buildings = [];
  const boxGeoCache = new Map();
  function boxGeo(w, h, d) {
    const key = w + 'x' + h + 'x' + d;
    if (!boxGeoCache.has(key)) boxGeoCache.set(key, new THREE.BoxGeometry(w, h, d));
    return boxGeoCache.get(key);
  }

  for (let bx = -165; bx <= 165; bx += 30) {
    for (let bz = -165; bz <= 165; bz += 30) {
      const cx = bx + (rnd() - 0.5) * 6;
      const cz = bz + (rnd() - 0.5) * 6;
      if (nearClearSpot(cx, cz)) continue;
      if (bz >= 150 && Math.abs(bx) <= 60) continue; // beachfront stays open
      if (bx >= 165) continue; // harbour water edge
      const distDowntown = Math.hypot(cx, cz);
      const inStrip = Math.abs(cx) <= 75 && cz >= 105 && cz <= 155;
      let h;
      if (inStrip) h = 14 + rnd() * 22;
      else h = Math.max(8, 40 - distDowntown * 0.14) + rnd() * 14;
      const w = 13 + rnd() * 9, d = 13 + rnd() * 9;
      const palette = inStrip ? stripPalette : wallPalette;
      const mat = new THREE.MeshLambertMaterial({
        color: palette[(rnd() * palette.length) | 0],
        emissive: 0xff8c42,
        emissiveIntensity: 0.22,
      });
      if (winTex) { mat.map = winTex; mat.emissiveMap = winTex; }
      const b = new THREE.Mesh(boxGeo(w, h, d), mat);
      b.position.set(cx, h / 2, cz);
      b.rotation.y = (rnd() - 0.5) * 0.08;
      scene.add(b); buildings.push(b);
      // Rooftop box on the taller towers.
      if (h > 30 && rnd() < 0.6) {
        const roof = new THREE.Mesh(
          boxGeo(Math.max(3, w * 0.3), 2.5, Math.max(3, d * 0.3)),
          new THREE.MeshLambertMaterial({ color: 0x2c2830 })
        );
        roof.position.set(cx, h + 1.2, cz);
        scene.add(roof); buildings.push(roof);
      }
    }
  }

  // ---- the Strip: a bright boulevard sign row ----
  const neonMats = [];
  const neonCols = [0xff4ad8, 0x37e6ff, 0xffb347, 0x7dff5e];
  for (let i = 0; i < 8; i++) {
    const x = -63 + i * 18;
    const mat = new THREE.MeshBasicMaterial({ color: neonCols[i % neonCols.length] });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 0.6), mat);
    sign.position.set(x, 9 + (i % 3) * 2, 128);
    scene.add(sign); neonMats.push(mat);
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 9, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x222028 })
    );
    pole.position.set(x - 4.5, 4.5, 128);
    scene.add(pole);
  }

  // ---- street lamps along the avenues ----
  const lampMat = new THREE.MeshLambertMaterial({
    color: 0x444038, emissive: 0xffc46b, emissiveIntensity: 0.15,
  });
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xffd28a });
  const lamps = [];
  for (let d = -150; d <= 150; d += 60) {
    for (const [x, z] of [[-6, d], [6, d], [d, -6], [d, 6]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6),
        new THREE.MeshLambertMaterial({ color: 0x2a2830 }));
      pole.position.set(x, 3, z); scene.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampHeadMat);
      head.position.set(x, 6.1, z); scene.add(head);
      lamps.push({ pole, head, x, z });
    }
  }

  // Publish the map for vehicles, police and districts.
  const cityApi = {
    bounds: BOUNDS,
    roadXs: ROAD_XS,
    roadZs: ROAD_ZS,
    roadSpacing: 30,
    roadWidth: 9,
    roads,
    buildings,
    lamps,
    lampMaterial: lampMat,
    lampHeadMaterial: lampHeadMat,
    neonMaterials: neonMats,
    downtown: { x: 0, z: 0 },
    strip: { x: 0, z: 135 },
    isRoad(x, z) {
      for (const rx of ROAD_XS) if (Math.abs(x - rx) < 5.5) return true;
      for (const rz of ROAD_ZS) if (Math.abs(z - rz) < 5.5) return true;
      return false;
    },
    clampToBounds(x, z) {
      return {
        x: Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x)),
        z: Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, z)),
      };
    },
  };
  ctx.api.city = cityApi;
  ctx.api.cityBounds = BOUNDS;
  ctx.api.roads = { xs: ROAD_XS, zs: ROAD_ZS, spacing: 30, width: 9 };
  if (S) S.cityBounds = BOUNDS;
}
