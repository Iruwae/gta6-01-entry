// SOLMAR BAY — districts.js
// Five named districts give the city a readable geography (game-design-theory:
// legibility first — a player who can name where they are can plan a route).
// Each district owns a name, a fog tint and a vibe line; the director detects
// crossings, toasts the new district, and hands the tint to the day/night
// director (which owns the actual fog colour). District props are built here
// — neon billboards downtown, smokestacks in the industrial quarter, beach
// umbrellas on the sand, crates and a buoy at the harbor — all placed clear
// of roads and building footprints so the city layout never moves.

import * as THREE from 'three';
import { S } from './state.js';

export const DISTRICTS = [
  { id: 'beach', name: 'BEACH', fog: 0xf0a06a, vibe: 'Sand, palms and the boardwalk' },
  { id: 'oldtown', name: 'OLD TOWN', fog: 0xd88a5e, vibe: 'Brick lanes and the old garage' },
  { id: 'downtown', name: 'DOWNTOWN', fog: 0xe08a5e, vibe: 'Glass towers and the bank' },
  { id: 'harbor', name: 'HARBOR', fog: 0xc97a6a, vibe: 'Cranes, crates and the pier' },
  { id: 'industrial', name: 'INDUSTRIAL', fog: 0xb07858, vibe: 'Warehouses and smoke' },
  { id: 'uptown', name: 'UPTOWN', fog: 0x9a7a8a, vibe: 'Glass towers, old money' },
  { id: 'strip', name: 'THE STRIP', fog: 0xe89a6a, vibe: 'Neon, noise, all-night everything' },
];

// The beach owns the south strip; the harbor owns the south-east corner;
// the industrial quarter owns the north-east; old town owns the north-west
// block; the strip owns the neon avenue south of downtown; uptown owns the
// far north-east towers; everything else is downtown. No gaps, no overlaps.
export function districtAt(x, z) {
  if (z >= 150) return DISTRICTS[0];
  if (x >= 90 && z >= 90) return DISTRICTS[3];
  if (z >= 120 && x >= -60 && x <= 60) return DISTRICTS[6];
  if (x >= 90 && z < -60) return DISTRICTS[5];
  if (x >= 90) return DISTRICTS[4];
  if (x < -30 && z < -30) return DISTRICTS[1];
  return DISTRICTS[2];
}

function signTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 96);
  g.fillStyle = fg;
  g.font = 'bold 44px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class DistrictDirector {
  constructor(scene) {
    this.scene = scene;
    this.current = null;
    this._smokeT = 0;
    this._stacks = [];
    this._buoy = null;

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.7, metalness: 0.4 });
    // Neon billboards downtown: poles at road corners, signs high above
    // traffic so nothing ever collides with them.
    const signs = [
      { text: 'SOLMAR', bg: '#ff2e88', fg: '#ffffff', x: 8, z: -66, face: -Math.PI / 2 },
      { text: 'BAYLINE', bg: '#00b8d4', fg: '#ffffff', x: -66, z: 8, face: 0 },
    ];
    for (const s of signs) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 7, 8), poleMat);
      pole.position.set(s.x, 3.5, s.z);
      scene.add(pole);
      const mat = new THREE.MeshBasicMaterial({ map: signTexture(s.text, s.bg, s.fg) });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), mat);
      board.position.set(s.x, 8.2, s.z);
      board.rotation.y = s.face;
      scene.add(board);
    }

    // Industrial smokestacks: two cylinders on the clear margin strip east
    // of the blocks (x 114..150 holds no buildings).
    const stackMat = new THREE.MeshStandardMaterial({ color: 0x6a5a50, roughness: 0.9 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xd83a2e, roughness: 0.8 });
    for (const [sx, sz] of [[132, -120], [138, -60]]) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 16, 10), stackMat);
      stack.position.set(sx, 8, sz);
      scene.add(stack);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.8, 10), bandMat);
      band.position.set(sx, 12, sz);
      scene.add(band);
      this._stacks.push({ x: sx, z: sz });
    }

    // Beach umbrellas on the sand (z 150..180: no roads, no buildings).
    const umbA = new THREE.MeshStandardMaterial({ color: 0xff6a3d, roughness: 0.8 });
    const umbB = new THREE.MeshStandardMaterial({ color: 0x2ec4b6, roughness: 0.8 });
    for (const [ux, uz, um] of [[40, 162, umbA], [-20, 168, umbB], [100, 158, umbA]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), poleMat);
      pole.position.set(ux, 1.1, uz);
      scene.add(pole);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 10), um);
      canopy.position.set(ux, 2.5, uz);
      scene.add(canopy);
    }

    // Harbor crates on the clear strip south-east, plus a buoy out on the water.
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x3f7a8c, roughness: 0.85 });
    for (const [cx, cz, cy] of [[126, 132, 1], [126, 132, 3], [122, 132, 1]]) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), crateMat);
      crate.position.set(cx, cy, cz);
      scene.add(crate);
    }
    const buoy = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xff5400, roughness: 0.6 }),
    );
    buoy.position.set(60, 0.5, 205);
    scene.add(buoy);
    this._buoy = buoy;

    // Uptown monument: a glass obelisk with a gold spire on the clear
    // margin north-east (x 114..150 holds no buildings).
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fc4d4, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.85 });
    const obelisk = new THREE.Mesh(new THREE.BoxGeometry(3, 18, 3), glassMat);
    obelisk.position.set(120, 9, -90);
    scene.add(obelisk);
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.3, metalness: 0.8, emissive: 0xf2c200, emissiveIntensity: 0.4 }),
    );
    spire.position.set(120, 20, -90);
    scene.add(spire);

    // The Strip: two more neon signs over the avenue (poles at road
    // corners, signs high above traffic like the downtown boards).
    const stripSigns = [
      { text: 'NEON', bg: '#ff2e88', fg: '#ffffff', x: -30, z: 126, face: Math.PI },
      { text: 'ALL NIGHT', bg: '#2ed573', fg: '#101418', x: 30, z: 126, face: Math.PI },
    ];
    for (const s of stripSigns) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 7, 8), poleMat);
      pole.position.set(s.x, 3.5, s.z);
      scene.add(pole);
      const mat = new THREE.MeshBasicMaterial({ map: signTexture(s.text, s.bg, s.fg) });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), mat);
      board.position.set(s.x, 8.2, s.z);
      board.rotation.y = s.face;
      scene.add(board);
    }
  }

  update(dt) {
    if (!S || !S.player) return;
    const d = districtAt(S.player.pos.x, S.player.pos.z);
    if (!this.current || this.current.id !== d.id) {
      this.current = d;
      S.district = d.id;
      S.districtName = d.name;
      S.districtFog = d.fog;
      if (S.hud && typeof S.hud.toast === 'function') {
        S.hud.toast('— ' + d.name + ' —  ' + d.vibe);
      }
    }
    // Smokestack puffs: a slow grey breath over the industrial quarter.
    this._smokeT -= dt;
    if (this._smokeT <= 0) {
      this._smokeT = 2.2;
      const st = this._stacks[Math.floor(Math.random() * this._stacks.length)];
      if (st && S.fx && S.fx.smoke) S.fx.smoke({ x: st.x, y: 16.5, z: st.z });
    }
    // The buoy rides the swell with the water.
    if (this._buoy) this._buoy.position.y = 0.5 + Math.sin((S.time || 0) * 0.7) * 0.25;
  }

  reset() {
    this.current = null;
    if (S) {
      S.district = 'downtown';
      S.districtName = 'DOWNTOWN';
      S.districtFog = 0xe08a5e;
    }
  }
}
