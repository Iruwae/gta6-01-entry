// SOLMAR BAY — city builder (round 9 rebuild, builder B / world).
// Builds the static 3D city: ground, bay water, the road grid, buildings,
// streetlights, landmark shops and the parked vehicles the player can steal.
// Written fresh from the build contract; it talks to other modules only
// through ctx and never imports another game module.
import * as THREE from '../vendor/three.module.min.js';

const HALF = 200; // the city spans x, z in [-200, 200]
const ROAD_LINES = [-160, -120, -80, -40, 0, 40, 80, 120, 160];

// Landmark spots every system agrees on (contract + smoke test).
const SPOTS = {
  garage: { x: -90, z: -66 },
  mart: { x: -72, z: -60 },
  safehouse: { x: 120, z: -120 },
  booth: { x: -90, z: -58 },
  racePad: { x: -60, z: -60 },
  taxiStand: { x: 68, z: 60 },
  fenceYard: { x: 110, z: 138 },
  downtown: { x: 0, z: 0 },
  harbor: { x: 120, z: 120 },
  beach: { x: 0, z: 165 },
  uptown: { x: 120, z: -90 },
  strip: { x: 0, z: 135 },
};

// District centres, duplicated here only so the minimap can dot them
// (districts.js is the owner of district logic).
const MAP_DISTRICTS = [
  { name: 'DOWNTOWN', x: 0, z: 0, color: '#ffb347' },
  { name: 'HARBOR', x: 120, z: 120, color: '#4fc3f7' },
  { name: 'BEACH', x: 0, z: 165, color: '#ffe082' },
  { name: 'UPTOWN', x: 120, z: -90, color: '#ce93d8' },
  { name: 'THE STRIP', x: 0, z: 135, color: '#ff80ab' },
  { name: 'OLD TOWN', x: -120, z: -40, color: '#a5d6a7' },
  { name: 'PALM ROW', x: -120, z: 120, color: '#80cbc4' },
];

const VEHICLE_DEFS = {
  sedan: { hp: 100, perf: 30, len: 4.3, wid: 1.9, h: 1.15, cabin: 0.85 },
  bike: { hp: 60, perf: 38, len: 2.3, wid: 0.85, h: 0.95, cabin: 0 },
  pickup: { hp: 130, perf: 28, len: 4.9, wid: 2.0, h: 1.45, cabin: 0.8 },
  sport: { hp: 90, perf: 46, len: 4.4, wid: 2.0, h: 1.0, cabin: 0.7 },
};

// Deterministic RNG so the city looks the same on every load.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

function flatPlane(w, d, color, x, z, y = 0.02) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

// Asphalt with a dashed centre line, tiled along the road.
function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#33333a';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#c8b96a';
  g.fillRect(30, 6, 4, 26);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      g.fillStyle = (i + j) % 2 === 0 ? '#f2f2f2' : '#161616';
      g.fillRect(i * 32, j * 32, 32, 32);
    }
  }
  return new THREE.CanvasTexture(c);
}

function buildVehicleMesh(kind, color) {
  const def = VEHICLE_DEFS[kind];
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(def.len, def.h * 0.55, def.wid),
    paint,
  );
  body.position.y = def.h * 0.45;
  g.add(body);
  if (def.cabin > 0) {
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(def.len * 0.45, def.cabin, def.wid * 0.85),
      glass,
    );
    cab.position.set(-def.len * 0.05, def.h * 0.72 + def.cabin * 0.28, 0);
    g.add(cab);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111214 });
  const spots =
    kind === 'bike'
      ? [[def.len * 0.32, 0], [-def.len * 0.32, 0]]
      : [
          [def.len * 0.32, def.wid / 2],
          [def.len * 0.32, -def.wid / 2],
          [-def.len * 0.32, def.wid / 2],
          [-def.len * 0.32, -def.wid / 2],
        ];
  for (const [wx, wz] of spots) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.34, wz);
    g.add(w);
  }
  return g;
}

function makeVehicle(kind, x, z, color, heading = 0) {
  const def = VEHICLE_DEFS[kind];
  const mesh = buildVehicleMesh(kind, color);
  const car = {
    kind,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    health: def.hp,
    maxHealth: def.hp,
    color,
    tune: { engine: 0, armor: 0, paint: color, nos: false },
    mesh,
    perf() {
      return def.perf + this.tune.engine * 3 + (this.tune.nos ? 8 : 0);
    },
  };
  mesh.position.copy(car.pos);
  mesh.rotation.y = heading;
  return car;
}

function nearSpot(x, z, r) {
  for (const s of Object.values(SPOTS)) {
    const dx = s.x - x;
    const dz = s.z - z;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

function buildGround(scene) {
  const ground = flatPlane(HALF * 2, HALF * 2, 0x8a7f6a, 0, 0, 0);
  scene.add(ground);
  // Bay water sits under everything; it shows past the beach edge.
  const water = flatPlane(1400, 1400, 0x2e6f8e, 0, 0, -0.6);
  scene.add(water);
  // Sand strip along the beach.
  scene.add(flatPlane(150, 46, 0xd9b380, 0, 168, 0.03));
}

function buildRoads(scene) {
  const tex = roadTexture();
  for (const ln of ROAD_LINES) {
    const alongX = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 9),
      new THREE.MeshLambertMaterial({ map: tex.clone() }),
    );
    alongX.material.map.repeat.set(25, 1);
    alongX.material.map.needsUpdate = true;
    alongX.rotation.x = -Math.PI / 2;
    alongX.position.set(0, 0.02, ln);
    scene.add(alongX);
    const alongZ = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 400),
      new THREE.MeshLambertMaterial({ map: tex.clone() }),
    );
    alongZ.material.map.repeat.set(1, 25);
    alongZ.material.map.needsUpdate = true;
    alongZ.rotation.x = -Math.PI / 2;
    alongZ.position.set(ln, 0.02, 0);
    scene.add(alongZ);
  }
}

function buildBlocks(scene, rng) {
  const centres = [-140, -100, -60, -20, 20, 60, 100, 140];
  const palette = [0xd8c1a3, 0xc98d6b, 0xe0a899, 0x9fb4a8, 0xd9c27a, 0xb08a7a, 0x7fa3b0, 0xe8dcc8];
  for (const bx of centres) {
    for (const bz of centres) {
      if (bz > 140) continue; // beach sand stays open
      if (nearSpot(bx, bz, 20)) continue; // keep landmark plots clear
      const uptown = bz < -40 && bx > 60;
      const downtown = Math.abs(bx) < 50 && Math.abs(bz) < 50;
      const h = uptown
        ? 18 + rng() * 26
        : downtown
          ? 8 + rng() * 14
          : 5 + rng() * 9;
      const w = 16 + rng() * 10;
      const d = 16 + rng() * 10;
      const x = bx + (rng() * 6 - 3);
      const z = bz + (rng() * 6 - 3);
      const colour = palette[(rng() * palette.length) | 0];
      scene.add(box(w, h, d, colour, x, h / 2, z));
      scene.add(box(w * 0.7, 1.2, d * 0.7, 0x5a5148, x, h + 0.6, z));
      if (h > 26) {
        scene.add(box(w * 0.55, 8, d * 0.55, colour, x, h + 4.6, z));
      }
    }
  }
}

function buildStreetlights(scene) {
  const lampMat = new THREE.MeshLambertMaterial({
    color: 0xfff2c0,
    emissive: 0xffe6a0,
    emissiveIntensity: 0.4,
  });
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6, 8);
  const lampGeo = new THREE.SphereGeometry(0.35, 10, 8);
  for (const lx of ROAD_LINES) {
    for (const lz of [-120, -40, 40, 120]) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(lx + 6, 3, lz + 6);
      scene.add(pole);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(lx + 6, 6.2, lz + 6);
      scene.add(lamp);
    }
  }
  return lampMat;
}

function palm(scene, x, z, rng) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 5, 7),
    new THREE.MeshLambertMaterial({ color: 0x7a5a38 }),
  );
  trunk.position.y = 2.5;
  g.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x3f7a4a }),
  );
  leaves.scale.set(1.4, 0.45, 1.4);
  leaves.position.y = 5.2;
  g.add(leaves);
  g.position.set(x, 0, z);
  g.rotation.y = rng() * Math.PI * 2;
  scene.add(g);
}

function buildLandmarks(scene, rng) {
  // MART corner store.
  scene.add(box(12, 5, 8, 0xe8dcc8, SPOTS.mart.x, 2.5, SPOTS.mart.z));
  scene.add(box(13, 0.6, 3.5, 0xc0392b, SPOTS.mart.x, 4.4, SPOTS.mart.z + 4.2));
  scene.add(box(8, 1.6, 0.5, 0xf5f0e0, SPOTS.mart.x, 5.8, SPOTS.mart.z));
  // Safehouse motel + pool.
  scene.add(box(16, 7, 10, 0xd9a0a0, SPOTS.safehouse.x, 3.5, SPOTS.safehouse.z));
  scene.add(flatPlane(7, 5, 0x3f9ec2, SPOTS.safehouse.x + 13, SPOTS.safehouse.z, 0.03));
  // Garage with a dark roller door facing the street.
  scene.add(box(14, 6, 10, 0x7f8ea3, SPOTS.garage.x, 3, SPOTS.garage.z));
  scene.add(box(8, 4, 0.3, 0x2c2f36, SPOTS.garage.x, 2, SPOTS.garage.z + 5.1));
  // Pay-n-spray booth + marker poles.
  scene.add(box(4, 3, 4, 0xe8c33a, SPOTS.booth.x, 1.5, SPOTS.booth.z));
  for (const dx of [-4, 4]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 2.4, 8),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
    );
    pole.position.set(SPOTS.booth.x + dx, 1.2, SPOTS.booth.z + 3);
    scene.add(pole);
  }
  // Race start pad: checkered slab.
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshLambertMaterial({ map: checkerTexture() }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(SPOTS.racePad.x, 0.04, SPOTS.racePad.z);
  scene.add(pad);
  // Taxi stand: yellow kerb + sign.
  scene.add(box(6, 0.5, 2, 0xe8c33a, SPOTS.taxiStand.x, 0.25, SPOTS.taxiStand.z));
  const signPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x3a3f46 }),
  );
  signPole.position.set(SPOTS.taxiStand.x + 4, 2, SPOTS.taxiStand.z);
  scene.add(signPole);
  scene.add(box(2.2, 1.2, 0.2, 0xf7d54a, SPOTS.taxiStand.x + 4, 4.2, SPOTS.taxiStand.z));
  // Harbor containers.
  scene.add(box(8, 2.6, 2.6, 0xc65a3a, 132, 1.3, 128));
  scene.add(box(8, 2.6, 2.6, 0x3a7ac6, 132, 1.3, 132));
  scene.add(box(8, 2.6, 2.6, 0x4a9e5c, 132, 3.9, 130));
  // The Strip: a row of low, bright shop fronts.
  const stripCols = [0xff80ab, 0x4fc3f7, 0xffb347];
  stripCols.forEach((c, i) => {
    scene.add(box(10, 4 + i, 7, c, -24 + i * 24, 2 + i / 2, 135));
  });
  // Palms along the beach and the strip.
  for (let i = 0; i < 8; i++) palm(scene, -56 + i * 16, 152 + rng() * 14, rng);
  for (let i = 0; i < 4; i++) palm(scene, -36 + i * 24, 146, rng);
}

function parkVehicles(scene, S) {
  if (!Array.isArray(S.cars)) S.cars = [];
  const parked = [
    makeVehicle('sport', -102, -64, 0xe23b2e, 0.4),
    makeVehicle('bike', -88, -64, 0x18c8c0, -0.3),
    makeVehicle('pickup', 96, -24, 0x4a7a4a, 1.2),
    makeVehicle('sedan', 20, -40, 0x8a9bb0, 0),
    makeVehicle('sedan', -20, 80, 0xc2a35a, 1.6),
    makeVehicle('sedan', 60, 120, 0x7a6a9a, -1.2),
    makeVehicle('sedan', -140, 20, 0x9a9a92, 0.8),
  ];
  for (const car of parked) {
    S.cars.push(car);
    scene.add(car.mesh);
  }
}

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state || ctx.S;
  const rng = mulberry32(20261121);

  buildGround(scene);
  buildRoads(scene);
  buildBlocks(scene, rng);
  const lampMat = buildStreetlights(scene);
  buildLandmarks(scene, rng);
  parkVehicles(scene, S);

  ctx.api.city = {
    spots: SPOTS,
    half: HALF,
    roads: ROAD_LINES,
    lamps: [lampMat],
  };

  const districtsOf = () =>
    (ctx.api.districts && ctx.api.districts.list) || MAP_DISTRICTS;

  function drawMinimap() {
    const cv =
      (ctx.dom && ctx.dom.minimap) || document.getElementById('minimap');
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const W = cv.width || 180;
    const H = cv.height || 180;
    const px = (v) => ((v + HALF) / (HALF * 2)) * W;
    const pz = (v) => ((v + HALF) / (HALF * 2)) * H;
    g.fillStyle = '#12121c';
    g.fillRect(0, 0, W, H);
    // Bay water along the south edge.
    g.fillStyle = '#1d4a63';
    g.fillRect(0, pz(145), W, H - pz(145));
    // Roads.
    g.strokeStyle = '#2e2e3a';
    g.lineWidth = 2;
    for (const ln of ROAD_LINES) {
      g.beginPath();
      g.moveTo(px(ln), 0);
      g.lineTo(px(ln), H);
      g.stroke();
      g.beginPath();
      g.moveTo(0, pz(ln));
      g.lineTo(W, pz(ln));
      g.stroke();
    }
    // District dots.
    for (const d of districtsOf()) {
      g.fillStyle = d.color || '#888888';
      g.beginPath();
      g.arc(px(d.x), pz(d.z), 3, 0, Math.PI * 2);
      g.fill();
    }
    // Police search zone around the last known position.
    if (S.wanted > 0 && S.lastKnown) {
      g.fillStyle = 'rgba(255, 150, 40, 0.25)';
      g.beginPath();
      g.arc(px(S.lastKnown.x), pz(S.lastKnown.z), 18, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255, 150, 40, 0.8)';
      g.lineWidth = 1;
      g.stroke();
    }
    // Cars: police red, everyone else grey.
    for (const car of S.cars || []) {
      g.fillStyle = car.aiPolice ? '#ff4444' : '#9a9aa8';
      g.fillRect(px(car.pos.x) - 1.5, pz(car.pos.z) - 1.5, 3, 3);
    }
    // Player arrow.
    const p = S.player && S.player.pos;
    if (p) {
      const heading = S.player.heading || 0;
      g.save();
      g.translate(px(p.x), pz(p.z));
      g.rotate(-heading);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(0, -5);
      g.lineTo(4, 4);
      g.lineTo(-4, 4);
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  let lastMap = 0;
  ctx.updates.push((dt) => {
    // Keep every vehicle mesh glued to its logical position.
    for (const car of S.cars || []) {
      if (!car.mesh || !car.pos) continue;
      car.mesh.position.set(car.pos.x, 0, car.pos.z);
      car.mesh.rotation.y = car.heading || 0;
    }
    const now = performance.now();
    if (now - lastMap > 300) {
      lastMap = now;
      drawMinimap();
    }
  });
}
