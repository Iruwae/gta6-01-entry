// Solmar Bay — city builder (round 7 rebuild).
// Lays down the ground, the road grid, the blocks of sunset-lit
// buildings, the Strip frontage and the downtown towers at (0, 0).
// Everything here is built from a small seeded random so the layout
// is identical every time the game loads.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const T = ctx.THREE || THREE;

  // Small deterministic random: same seed -> same city, every load.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(20261120);

  const HALF = 180; // city extends -180..180 on both axes
  const STEP = 30; // road spacing
  const ROAD_W = 9;

  // ---- facade textures: dark walls with warm lit windows -------------
  function facadeTexture(base, lit) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = base;
    g.fillRect(0, 0, 128, 256);
    // faint floor bands
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 128, 3);
    const warm = ['#ffd27a', '#ff9a5c', '#ffe9b0', '#ff7a4d'];
    for (let row = 0; row < 14; row++) {
      for (let col = 0; col < 6; col++) {
        const x = 10 + col * 19;
        const y = 10 + row * 17;
        if (rand() < lit) {
          g.fillStyle = warm[Math.floor(rand() * warm.length)];
          g.globalAlpha = 0.75 + rand() * 0.25;
        } else {
          g.fillStyle = '#14101c';
          g.globalAlpha = 0.9;
        }
        g.fillRect(x, y, 11, 10);
      }
    }
    g.globalAlpha = 1;
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  const facades = [
    new T.MeshLambertMaterial({ map: facadeTexture('#4a3a4e', 0.55) }),
    new T.MeshLambertMaterial({ map: facadeTexture('#3d4457', 0.5) }),
    new T.MeshLambertMaterial({ map: facadeTexture('#5b4636', 0.6) }),
    new T.MeshLambertMaterial({ map: facadeTexture('#33302e', 0.45) }),
  ];
  const stripMat = new T.MeshLambertMaterial({ map: facadeTexture('#6b2f4d', 0.75) });
  const unitBox = new T.BoxGeometry(1, 1, 1);

  // ---- ground --------------------------------------------------------
  const ground = new T.Mesh(
    new T.PlaneGeometry(HALF * 2 + 60, HALF * 2 + 60),
    new T.MeshLambertMaterial({ color: 0x38322f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);

  // ---- road grid ------------------------------------------------------
  const roadMat = new T.MeshLambertMaterial({ color: 0x1d1a22 });
  const lineMat = new T.MeshBasicMaterial({ color: 0xd8a24a });
  const avenues = [];
  const streets = [];
  for (let v = -150; v <= 150; v += STEP) {
    avenues.push(v);
    streets.push(v);
    const ns = new T.Mesh(new T.PlaneGeometry(ROAD_W, HALF * 2 + 40), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(v, 0.01, 0);
    scene.add(ns);
    const ew = new T.Mesh(new T.PlaneGeometry(HALF * 2 + 40, ROAD_W), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.01, v);
    scene.add(ew);
    // centre dashes along each road
    const dashGeo = new T.PlaneGeometry(0.6, 3);
    for (let d = -165; d <= 165; d += 15) {
      const d1 = new T.Mesh(dashGeo, lineMat);
      d1.rotation.x = -Math.PI / 2;
      d1.position.set(v, 0.02, d);
      scene.add(d1);
      const d2 = new T.Mesh(dashGeo, lineMat);
      d2.rotation.x = -Math.PI / 2;
      d2.rotation.z = Math.PI / 2;
      d2.position.set(d, 0.02, v);
      scene.add(d2);
    }
  }

  // ---- buildings ------------------------------------------------------
  function addBuilding(x, z, w, d, h, mat) {
    const m = new T.Mesh(unitBox, mat);
    m.scale.set(w, h, d);
    m.position.set(x, h / 2, z);
    scene.add(m);
    return m;
  }

  // Blocks sit between roads: centres at -135, -105, ... 135.
  for (let bx = -135; bx <= 135; bx += STEP) {
    for (let bz = -135; bz <= 135; bz += STEP) {
      // The Strip frontage is handled separately below.
      if (bz >= 120 && bz <= 150) continue;
      const distCentre = Math.hypot(bx, bz);
      const downtownBoost = Math.max(0, 1 - distCentre / 130);
      const count = distCentre < 70 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const ox = count === 2 ? (i === 0 ? -6 : 6) : 0;
        const oz = count === 2 ? (i === 0 ? -6 : 6) : 0;
        const w = 12 + rand() * 8;
        const d = 12 + rand() * 8;
        let h = 7 + rand() * 11 + downtownBoost * downtownBoost * 30;
        if (distCentre < 25) h = 26 + rand() * 18; // downtown towers
        const mat = facades[Math.floor(rand() * facades.length)];
        addBuilding(bx + ox, bz + oz, w, d, h, mat);
      }
    }
  }

  // ---- the Strip: low, wide, loud-coloured frontage along z = 135 ----
  const stripCols = [0xd84a7a, 0x2fb3c9, 0xe8a33d, 0x7a4ad8, 0x3dd68c];
  for (let x = -75; x <= 75; x += 15) {
    const h = 6 + rand() * 5;
    const col = stripCols[Math.floor(rand() * stripCols.length)];
    const m = new T.Mesh(
      unitBox,
      new T.MeshLambertMaterial({
        map: stripMat.map,
        color: col,
        emissive: col,
        emissiveIntensity: 0.12,
      })
    );
    m.scale.set(12, h, 9);
    m.position.set(x, h / 2, 135);
    scene.add(m);
    // glowing sign board on the roof line
    const sign = new T.Mesh(
      new T.BoxGeometry(7, 1.2, 0.4),
      new T.MeshBasicMaterial({ color: stripCols[Math.floor(rand() * stripCols.length)] })
    );
    sign.position.set(x, h + 0.7, 135);
    scene.add(sign);
  }

  // ---- shared city facts for vehicles, police, districts -------------
  function isRoad(x, z) {
    const near = (v) => {
      const r = ((v + 150) % STEP + STEP) % STEP;
      const d = Math.min(r, STEP - r);
      return d <= ROAD_W / 2 + 1;
    };
    return near(x) || near(z);
  }

  ctx.api.city = {
    bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
    half: HALF,
    roadSpacing: STEP,
    roadWidth: ROAD_W,
    avenues: avenues.slice(),
    streets: streets.slice(),
    downtown: { x: 0, z: 0 },
    strip: { x: 0, z: 135 },
    isRoad,
    clamp(x, z) {
      return {
        x: Math.max(-HALF, Math.min(HALF, x)),
        z: Math.max(-HALF, Math.min(HALF, z)),
      };
    },
  };
  ctx.api.cityBounds = ctx.api.city.bounds;
  S.city = ctx.api.city;
}
