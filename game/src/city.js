// city.js — SOLMAR BAY: the world itself.
// Ground, road grid, building blocks, landmark shops, street lamps,
// palm trees, and the parked cars scattered around the map.
// Written fresh for round 8 from the shared contract. All art original.
import * as THREE from '../vendor/three.module.min.js';

// Spots the game logic teleports the player to — keep buildings clear.
const KEEP_CLEAR = [
  [-90, -66], [-72, -60], [120, -120], [-102, -64], [-88, -64],
  [-60, -60], [68, 60], [110, 138], [-120, 120], [120, 120],
  [0, 165], [0, 135], [120, -90], [0, 0], [-90, -58], [-60, 100],
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clearOf(x, z, r) {
  for (const [cx, cz] of KEEP_CLEAR) {
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r) return false;
  }
  return true;
}

// A hand-painted sign on a canvas texture — no font files, no network.
function makeSign(text, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = fg; g.font = 'bold 62px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2.5),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
  );
  return m;
}

const CAR_BASE = {
  sedan: { hp: 80, perf: 32 },
  sport: { hp: 100, perf: 55 },
  bike: { hp: 60, perf: 38 },
  pickup: { hp: 130, perf: 28 },
};

function buildCarMesh(kind, color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.6, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.15, metalness: 0.7 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffdf80, emissiveIntensity: 0.7 });
  if (kind === 'bike') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 2.1), paint);
    frame.position.y = 0.55; g.add(frame);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.7), dark);
    seat.position.set(0, 0.85, -0.35); g.add(seat);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.7), paint);
    tank.position.set(0, 0.8, 0.35); g.add(tank);
    for (const z of [-0.85, 0.85]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 14), dark);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.34, z); g.add(wheel);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), lampMat);
    lamp.position.set(0, 0.62, 1.08); g.add(lamp);
    return g;
  }
  const dims = { sedan: [4.2, 0.62, 1.9], sport: [4.4, 0.5, 1.9], pickup: [4.9, 0.7, 2.0] }[kind];
  const [len, h, w] = dims;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), paint);
  body.position.y = 0.55; g.add(body);
  if (kind === 'pickup') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.35, len * 0.42), dark);
    bed.position.set(0, 0.85, -len * 0.26); g.add(bed);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w - 0.15, 0.62, len * 0.34), glass);
    cab.position.set(0, 1.05, len * 0.22); g.add(cab);
  } else {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(w - 0.25, 0.55, len * 0.45), glass);
    cabin.position.set(0, 1.05, -len * 0.05); g.add(cabin);
  }
  for (const x of [-w / 2 + 0.25, w / 2 - 0.25]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), lampMat);
    lamp.position.set(x, 0.6, len / 2 + 0.02); g.add(lamp);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12);
  for (const [x, z] of [[-w / 2, len / 2 - 0.8], [w / 2, len / 2 - 0.8], [-w / 2, -len / 2 + 0.8], [w / 2, -len / 2 + 0.8]]) {
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.36, z);
    g.add(wheel);
  }
  return g;
}

function spawnParkedCar(S, scene, kind, x, z, heading, color) {
  const base = CAR_BASE[kind];
  const mesh = buildCarMesh(kind, color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  const car = {
    kind, color,
    pos: new THREE.Vector3(x, 0, z),
    heading, speed: 0,
    health: base.hp, maxHealth: base.hp,
    tune: { engine: 0, armor: 0, paint: color, nos: false },
    mesh, aiPolice: false, brain: null,
    perf() { return base.perf + this.tune.engine * 4 + (this.tune.nos ? 8 : 0); },
  };
  S.cars.push(car);
  return car;
}

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  if (!S.cars) S.cars = [];
  const rand = mulberry32(20261120);
  const buildingMats = [];
  const lampMats = [];
  const nightLights = [];

  // ---- ground, sand, water ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(440, 440),
    new THREE.MeshStandardMaterial({ color: 0x37323e, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(440, 72),
    new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.015, 184);
  scene.add(sand);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(440, 44),
    new THREE.MeshStandardMaterial({ color: 0x1d5a7a, roughness: 0.25, metalness: 0.4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, 242);
  scene.add(water);

  // ---- road grid: strips along x and z at multiples of 60 ----
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x211d26, roughness: 1 });
  for (const c of [-180, -120, -60, 0, 60, 120, 180]) {
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(440, 10), roadMat);
    rx.rotation.x = -Math.PI / 2; rx.position.set(0, 0.02, c); scene.add(rx);
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(10, 440), roadMat);
    rz.rotation.x = -Math.PI / 2; rz.position.set(c, 0.02, 0); scene.add(rz);
  }

  // ---- building blocks between the roads ----
  const wallColors = [0x6b4a5e, 0x54426b, 0x7a5a6b, 0x4a3f66, 0x8a6a5a, 0x5d5a7a, 0x74555f];
  const BLOCKS = [-150, -90, -30, 30, 90, 150];
  for (const bx of BLOCKS) {
    for (const bz of BLOCKS) {
      const n = 1 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        const x = bx + (rand() - 0.5) * 26;
        const z = bz + (rand() - 0.5) * 26;
        if (!clearOf(x, z, 15)) continue;
        const w = 12 + rand() * 10, d = 12 + rand() * 10, h = 8 + rand() * 30;
        const color = wallColors[Math.floor(rand() * wallColors.length)];
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, emissive: 0xffb35c, emissiveIntensity: 0 });
        buildingMats.push(mat);
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(x, h / 2, z);
        scene.add(b);
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
          new THREE.MeshStandardMaterial({ color: 0x2c2530, roughness: 1 }),
        );
        roof.position.set(x, h + 0.25, z);
        scene.add(roof);
      }
    }
  }

  // ---- landmarks (set back from the walk-up spot so the player is never inside a wall) ----
  function landmark(x, z, w, h, d, color, signText) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive: 0xffb35c, emissiveIntensity: 0 });
    buildingMats.push(mat);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, h / 2, z);
    scene.add(b);
    if (signText) {
      const sign = makeSign(signText, '#ffd9a0', '#241a2e');
      sign.position.set(x, h + 1.4, z + d / 2 + 0.4);
      scene.add(sign);
    }
    return b;
  }
  // Garage: Vic's garage, front wall set back from the mission start spot.
  landmark(-90, -72, 16, 6, 10, 0x7a4a3a, 'SOLMAR GARAGE');
  // MART corner store, front wall set back from the shop spot.
  landmark(-72, -67, 12, 5, 8, 0x3a6b4f, 'MART');
  // Palm Motel safehouse, front wall set back from the rest spot.
  landmark(120, -128, 22, 7, 12, 0x5a4a7a, 'PALM MOTEL');

  // ---- pay-n-spray booth at (-90, -58): open canopy, no walls ----
  const boothMat = new THREE.MeshStandardMaterial({ color: 0x2e6b7a, roughness: 0.7, metalness: 0.3 });
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(11, 9), new THREE.MeshStandardMaterial({ color: 0x3a5a6a, roughness: 0.9 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(-90, 0.03, -58); scene.add(pad);
  for (const [px, pz] of [[-94.5, -61.5], [-85.5, -61.5], [-94.5, -54.5], [-85.5, -54.5]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.4, 8), boothMat);
    post.position.set(px, 1.7, pz); scene.add(post);
  }
  const boothRoof = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.3, 8.5), boothMat);
  boothRoof.position.set(-90, 3.5, -58); scene.add(boothRoof);
  const boothSign = makeSign('PAY N SPRAY', '#ffe9a8', '#14323e');
  boothSign.position.set(-90, 4.4, -53.6); scene.add(boothSign);

  // ---- street race start pad at (-60, -60) ----
  const racePad = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x191520, roughness: 1 }));
  racePad.rotation.x = -Math.PI / 2; racePad.position.set(-60, 0.03, -60); scene.add(racePad);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6a2a, roughness: 0.8 });
  for (const [cx, cz] of [[-64, -60], [-56, -60]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 10), coneMat);
    cone.position.set(cx, 0.55, cz); scene.add(cone);
  }
  for (const px of [-64.5, -55.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), boothMat);
    post.position.set(px, 1.6, -66); scene.add(post);
  }
  const startSign = makeSign('START', '#1c1420', '#ffd25c');
  startSign.position.set(-60, 3.4, -66); scene.add(startSign);

  // ---- taxi stand shelter at (68, 60) ----
  const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 3), new THREE.MeshStandardMaterial({ color: 0x2a6a8a, roughness: 0.8 }));
  shelterRoof.position.set(68, 2.6, 60); scene.add(shelterRoof);
  for (const px of [65, 71]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 8), boothMat);
    post.position.set(px, 1.3, 60); scene.add(post);
  }
  const taxiSign = makeSign('TAXI', '#12202a', '#ffd25c');
  taxiSign.position.set(68, 3.4, 60); scene.add(taxiSign);

  // ---- harbor containers near (120, 120) ----
  const containerColors = [0xb85a3a, 0x3a7a5a, 0x4a6a9a, 0xc8a03a];
  for (let i = 0; i < 4; i++) {
    const cont = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2.6, 2.6),
      new THREE.MeshStandardMaterial({ color: containerColors[i], roughness: 0.85, metalness: 0.2 }),
    );
    cont.position.set(138 + (i % 2) * 9, 1.3, 96 + Math.floor(i / 2) * 9);
    cont.rotation.y = (rand() - 0.5) * 0.4;
    scene.add(cont);
  }

  // ---- street lamps at the intersections ----
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.7, metalness: 0.5 });
  for (const cx of [-120, -60, 0, 60, 120]) {
    for (const cz of [-120, -60, 0, 60, 120]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5, 8), poleMat);
      pole.position.set(cx + 6, 2.5, cz + 6); scene.add(pole);
      const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffc27a, emissiveIntensity: 0.4 });
      lampMats.push(lampMat);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), lampMat);
      head.position.set(cx + 6, 5.1, cz + 6); scene.add(head);
    }
  }

  // ---- a few real lights that only matter at night ----
  for (const [lx, lz] of [[-90, -66], [-72, -60], [120, -120], [0, 135], [120, 120]]) {
    const pl = new THREE.PointLight(0xffa050, 0, 42, 1.6);
    pl.position.set(lx, 6, lz);
    scene.add(pl);
    nightLights.push(pl);
  }

  // ---- palm trees along the beach ----
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3a7a4a, roughness: 0.9 });
  for (let i = 0; i < 16; i++) {
    const px = -180 + i * 24 + (rand() - 0.5) * 10;
    const pz = 156 + rand() * 42;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 5.5, 8), trunkMat);
    trunk.position.set(px, 2.75, pz);
    trunk.rotation.z = (rand() - 0.5) * 0.16;
    scene.add(trunk);
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.9, 8, 6), frondMat);
    top.scale.y = 0.45;
    top.position.set(px, 5.6, pz);
    scene.add(top);
  }

  // ---- parked cars the player can steal ----
  spawnParkedCar(S, scene, 'sport', -102, -64, 0.4, 0xff5a3c);
  spawnParkedCar(S, scene, 'bike', -88, -64, -0.3, 0x2ec8b8);
  spawnParkedCar(S, scene, 'pickup', 60, 100, 1.2, 0x7a8a3a);
  spawnParkedCar(S, scene, 'sedan', -40, 20, 0.9, 0x4a6a9a);
  spawnParkedCar(S, scene, 'sedan', 20, -40, -1.1, 0x9a4a6a);
  spawnParkedCar(S, scene, 'sedan', 80, -20, 2.2, 0xc8a03a);
  spawnParkedCar(S, scene, 'sedan', -60, 100, 0.2, 0x5a7a5a);

  // ---- night falls: windows and lamps light up ----
  ctx.updates.push((dt) => {
    const dn = S.dayNight;
    const n = dn ? dn.night : 0;
    for (const m of buildingMats) m.emissiveIntensity = n * 0.5;
    for (const m of lampMats) m.emissiveIntensity = 0.4 + n * 2.2;
    for (const l of nightLights) l.intensity = n * 1.6;
  });
}
