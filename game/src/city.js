// SOLMAR BAY — the static 3D city: roads, buildings, lights, landmarks.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

function makeLabel(text, bg = '#ffb347', fg = '#1a0f2a') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = fg;
  g.font = 'bold 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), mat);
  return mesh;
}

function landmark(scene, x, z, w, h, d, color, label, labelBg) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  box.position.set(x, h / 2, z);
  scene.add(box);
  const sign = makeLabel(label, labelBg || '#ffb347');
  sign.position.set(x, h + 2.5, z);
  scene.add(sign);
  return box;
}

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;

  // Bay water at the south edge, past the beach.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 200),
    new THREE.MeshStandardMaterial({ color: 0x1d5a7a, roughness: 0.25, metalness: 0.4, transparent: true, opacity: 0.9 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, 300);
  scene.add(water);

  // Road grid: strips every 40 units.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2338, roughness: 0.95 });
  for (let i = -160; i <= 160; i += 40) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(400, 8), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.02, i);
    scene.add(h);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(8, 400), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(i, 0.02, 0);
    scene.add(v);
  }

  // Buildings: blocks offset from the roads, deterministic layout.
  const palette = [0x3a2b4d, 0x4d3a2b, 0x2b3a4d, 0x4d2b3a, 0x35304a];
  const windowMats = [];
  const rng = (seed) => {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  };
  const rand = rng(1337);
  const keepOut = [
    { x: -72, z: -60, r: 16 }, { x: -90, z: -66, r: 18 }, { x: 120, z: -120, r: 14 },
    { x: -90, z: -58, r: 12 }, { x: 110, z: 138, r: 16 }, { x: 68, z: 60, r: 12 },
    { x: -60, z: -60, r: 12 }, { x: -84, z: -58, r: 10 }, { x: 0, z: 0, r: 14 },
    { x: -100, z: -68, r: 16 },
  ];
  for (let gx = -160; gx <= 140; gx += 40) {
    for (let gz = -160; gz <= 140; gz += 40) {
      const bx = gx + 20;
      const bz = gz + 20;
      if (keepOut.some((k) => Math.hypot(bx - k.x, bz - k.z) < k.r)) continue;
      const w = 12 + rand() * 8;
      const d = 12 + rand() * 8;
      const h = 7 + rand() * 24;
      const color = palette[Math.floor(rand() * palette.length)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        emissive: 0xffb347,
        emissiveIntensity: 0,
      });
      windowMats.push(mat);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(bx, h / 2, bz);
      scene.add(b);
      // Roof box for silhouette variety.
      if (rand() > 0.5) {
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 2, d * 0.5), mat);
        roof.position.set(bx, h + 1, bz);
        scene.add(roof);
      }
    }
  }
  ctx.windowMats = windowMats;

  // Streetlights along the roads.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.6, metalness: 0.6 });
  const lampMats = [];
  const lampGeo = new THREE.SphereGeometry(0.35, 8, 8);
  for (let i = -160; i <= 160; i += 40) {
    for (const z of [-120, -40, 40, 120]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
      pole.position.set(i + 5, 3, z);
      scene.add(pole);
      const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc861, emissiveIntensity: 0 });
      lampMats.push(lampMat);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(i + 5, 6.2, z);
      scene.add(lamp);
    }
  }
  ctx.streetlightMats = lampMats;

  // Landmarks.
  landmark(scene, -72, -60, 16, 6, 11, 0xc94f6d, 'MART', '#ff7a9e');
  landmark(scene, -90, -66, 18, 7, 13, 0x8a6d2f, 'GARAGE', '#ffb347');
  landmark(scene, 120, -120, 13, 9, 11, 0x5f7a9e, 'MOTEL', '#5fb4c9');
  landmark(scene, -90, -58, 6, 4, 6, 0x3f8a6d, 'SPRAY', '#7ec98a');
  landmark(scene, 110, 138, 20, 1.2, 16, 0x6d4f2f, 'FENCE', '#e8a34c');
  landmark(scene, 68, 60, 5, 4, 5, 0xe8a34c, 'TAXI', '#f2d492');
  // Race pad: flat checkered-look pad.
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.3, 14),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 }),
  );
  pad.position.set(-60, 0.15, -60);
  scene.add(pad);
  const raceSign = makeLabel('RACE', '#f2d492');
  raceSign.position.set(-60, 5, -60);
  scene.add(raceSign);

  // Palm trees dotting Palm Row and the beach.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4f2f, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8a4d, roughness: 0.9 });
  const palmSpots = [
    [-120, 120], [-110, 110], [-130, 130], [0, 165], [-20, 160], [20, 158],
    [-120, 100], [-100, 125], [10, 150], [-140, 110],
  ];
  for (const [px, pz] of palmSpots) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.set(px, 3.5, pz);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), leafMat);
    leaves.scale.y = 0.45;
    leaves.position.set(px, 7.4, pz);
    scene.add(leaves);
  }

  return { windowMats, lampMats };
}

export default init;
