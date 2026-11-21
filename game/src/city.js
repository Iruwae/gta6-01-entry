// The static 3D city of SOLMAR BAY: a dark ground sheet, bay water at
// the east edge, a road grid, box buildings (some with windows that
// light up at night), streetlights and the landmark shops — MART,
// garage, safehouse motel, pay-n-spray, fence yard, taxi stand and the
// race pad. The parked rides live in vehicles.js.
import { CONFIG } from './config.js';

function box(ctx, w, h, d, color, x, y, z, emissive = 0) {
  const mat = new THREE_MeshLambert(ctx, color, emissive);
  const mesh = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  ctx.scene.add(mesh);
  return mesh;
}

function THREE_MeshLambert(ctx, color, emissive) {
  const params = { color };
  if (emissive) params.emissive = emissive;
  return new ctx.THREE.MeshLambertMaterial(params);
}

export function init(ctx) {
  const { THREE, state: S } = ctx;
  const nightWindows = [];

  // Dark ground sheet under the whole city (the boot hub owns the base
  // plane; this one carries the streets, offset so they never z-fight).
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(880, 880),
    new THREE.MeshLambertMaterial({ color: 0x241a38, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.04;
  ctx.scene.add(ground);

  // Bay water at the east edge — a flat blue sheet that catches the sun.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 880),
    new THREE.MeshBasicMaterial({ color: 0x2a6a8a }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(250, -0.02, 0);
  ctx.scene.add(water);

  // Road grid: dark strips with pale centre dashes.
  const roadMat = new THREE.MeshBasicMaterial({ color: 0x191423 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0x8a7a55 });
  for (let i = -3; i <= 3; i++) {
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(10, 380), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(i * 60, 0.0, 0);
    ctx.scene.add(roadV);
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(380, 10), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.0, i * 60);
    ctx.scene.add(roadH);
    for (let d = -180; d <= 180; d += 40) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(i * 60, 0.01, d);
      ctx.scene.add(dash);
    }
  }

  // Buildings: boxes of varied height, some with emissive windows that
  // light up at night (litWindows are collected for the night update).
  const rng = (seed) => {
    let a = seed;
    return () => {
      a = (a * 16807) % 2147483647;
      return a / 2147483647;
    };
  };
  const rnd = rng(1234567);
  const palette = [0x3a2b52, 0x4a3550, 0x2e3a55, 0x52384a, 0x3d4a3a, 0x55402e];
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      if (gx === 0 && gz === 0) continue; // downtown plaza stays open
      const bx = gx * 60 + (rnd() - 0.5) * 18;
      const bz = gz * 60 + (rnd() - 0.5) * 18;
      const h = 8 + rnd() * 26;
      const lit = rnd() > 0.45;
      const b = box(ctx, 16 + rnd() * 10, h, 16 + rnd() * 10, palette[Math.floor(rnd() * palette.length)], bx, h / 2, bz, lit ? 0xffc46a : 0);
      if (lit) nightWindows.push(b);
    }
  }

  // Streetlights along the main roads.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x333344 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const lamps = [];
  for (let i = -3; i <= 3; i++) {
    for (const z of [-120, 0, 120]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), poleMat);
      pole.position.set(i * 60 + 6, 3.5, z);
      ctx.scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampMat);
      lamp.position.set(i * 60 + 6, 7.2, z);
      ctx.scene.add(lamp);
      lamps.push(lamp);
    }
  }

  // Landmarks — big coloured signs you can navigate by.
  function landmark(x, z, w, h, d, color, label) {
    const m = box(ctx, w, h, d, color, x, h / 2, z);
    m.userData.label = label;
    return m;
  }
  landmark(-72, -60, 18, 7, 12, 0xffb347, 'MART'); // corner store
  landmark(-90, -66, 16, 8, 12, 0x5fb4c9, 'GARAGE'); // Vic's garage
  landmark(120, -120, 20, 9, 12, 0x7ec98a, 'MOTEL'); // safehouse
  landmark(-90, -58, 10, 5, 10, 0xff7a9e, 'SPRAY'); // pay-n-spray
  landmark(110, 138, 16, 4, 16, 0xb48ce8, 'FENCE'); // Vic's fence yard
  landmark(68, 60, 8, 4, 8, 0xf2d492, 'TAXI'); // taxi stand
  landmark(-60, -60, 8, 1, 8, 0xff5a3d, 'RACE'); // race start pad

  // Night update: windows and lamps glow once the sun is down.
  ctx.updates.push(() => {
    const n = S.dayNight.night;
    for (const b of nightWindows) {
      b.material.emissive.setHex(n > 0.4 ? 0xffc46a : 0x000000);
      b.material.emissiveIntensity = n;
    }
    for (const lamp of lamps) {
      lamp.material.color.setHex(n > 0.4 ? 0xffe9b0 : 0x8a7a55);
    }
  });
}
