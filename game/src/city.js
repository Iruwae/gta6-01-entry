// SOLMAR BAY — the city itself: ground texture with roads, sidewalks, beach
// and water drawn on one canvas, a grid of buildings with lit windows, palm
// trees, lamps and props. Also owns the collision boxes the rest of the game
// tests against, and the road graph traffic drives on.
import * as THREE from 'three';
import { CFG, PALETTE } from './config.js';

const ROADS = [];
for (let i = -4; i <= 4; i++) ROADS.push(i * CFG.world.roadEvery);

export class City {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = []; // {x, z, hx, hz}
    this.roadLines = ROADS;
    this.buildGround();
    this.buildBlocks();
    this.buildPalmsAndLamps();
    this.buildSun();
  }
  onRoad(x, z) {
    for (const r of ROADS) {
      if (Math.abs(x - r) < CFG.world.roadHalf + 1.2) return true;
      if (Math.abs(z - r) < CFG.world.roadHalf + 1.2) return true;
    }
    return false;
  }
  nearestRoadPoint(x, z) {
    let bx = ROADS[0], bz = ROADS[0], bd = 1e9;
    for (const r of ROADS) {
      const dx = Math.abs(x - r); if (dx < bd) { bd = dx; bx = r; bz = z; }
      const dz = Math.abs(z - r); if (dz < bd) { bd = dz; bx = x; bz = r; }
    }
    return { x: bx, z: bz };
  }
  collideCircle(x, z, r) {
    for (const c of this.colliders) {
      const dx = Math.max(Math.abs(x - c.x) - c.hx, 0);
      const dz = Math.max(Math.abs(z - c.z) - c.hz, 0);
      if (dx * dx + dz * dz < r * r) return c;
    }
    return null;
  }
  // Push a circle out of every building it overlaps; returns true on hit.
  resolveCircle(pos, r) {
    let hit = false;
    for (const c of this.colliders) {
      const cx = Math.max(c.x - c.hx, Math.min(pos.x, c.x + c.hx));
      const cz = Math.max(c.z - c.hz, Math.min(pos.z, c.z + c.hz));
      const dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * r; pos.z = cz + (dz / d) * r;
        } else {
          pos.x += (pos.x >= c.x ? r : -r);
        }
      }
    }
    return hit;
  }
  buildGround() {
    const S = CFG.world.size;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1024;
    const g = cv.getContext('2d');
    const px = (v) => ((v + S / 2) / S) * 1024;
    g.fillStyle = '#8a8578'; g.fillRect(0, 0, 1024, 1024);
    // Beach + water on the west edge (x < -190).
    g.fillStyle = '#d9b380'; g.fillRect(0, 0, px(-178), 1024);
    g.fillStyle = '#2a7fa8'; g.fillRect(0, 0, px(-196), 1024);
    g.fillStyle = '#5db8d8';
    for (let i = 0; i < 40; i++) {
      g.fillRect(0, (i * 53) % 1024, px(-196) * (0.5 + 0.5 * Math.sin(i)), 3);
    }
    // Roads.
    for (const r of ROADS) {
      g.fillStyle = '#2c2c30';
      g.fillRect(px(r - CFG.world.roadHalf), 0, px(r + CFG.world.roadHalf) - px(r - CFG.world.roadHalf), 1024);
      g.fillRect(0, px(r - CFG.world.roadHalf), 1024, px(r + CFG.world.roadHalf) - px(r - CFG.world.roadHalf));
    }
    // Lane dashes.
    g.fillStyle = '#d8c040';
    for (const r of ROADS) {
      for (let v = -200; v < 200; v += 16) {
        g.fillRect(px(r) - 2, px(v), 4, 14);
        g.fillRect(px(v), px(r) - 2, 14, 4);
      }
    }
    // Crosswalks at every intersection.
    g.fillStyle = '#e8e8e8';
    for (const rx of ROADS) for (const rz of ROADS) {
      for (let k = -2; k <= 2; k++) {
        g.fillRect(px(rx + k * 2.2) - 2, px(rz - 5), 4, 10);
        g.fillRect(px(rx - 5), px(rz + k * 2.2) - 2, 10, 4);
      }
    }
    // Block tops: slightly varied concrete. Blocks sit BETWEEN the roads,
    // centred at 40k+20, so no building ever stands on a road.
    for (let bx = -5; bx <= 4; bx++) for (let bz = -5; bz <= 4; bz++) {
      const cx = bx * 40 + 20, cz = bz * 40 + 20;
      if (cx < -160) continue; // beach strip stays open
      g.fillStyle = ['#7d7868', '#857f70', '#78736a'][(bx * 7 + bz * 13 + 20) % 3];
      g.fillRect(px(cx - 14), px(cz - 14), px(cx + 14) - px(cx - 14), px(cz + 14) - px(cz - 14));
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(S + 60, S + 60),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }
  windowTexture(base, lit) {
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 64, 128);
    for (let y = 8; y < 120; y += 14) for (let x = 6; x < 58; x += 14) {
      g.fillStyle = this.rng.chance(0.55) ? '#ffd880' : '#202840';
      g.fillRect(x, y, 9, 10);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  buildBlocks() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mats = PALETTE.building.map((c) => {
      const hex = '#' + c.toString(16).padStart(6, '0');
      return new THREE.MeshStandardMaterial({
        map: this.windowTexture(hex, true), roughness: 0.85,
        emissive: 0x332200, emissiveIntensity: 0.25,
      });
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 1 });
    for (let bx = -5; bx <= 4; bx++) for (let bz = -5; bz <= 4; bz++) {
      const cx = bx * 40 + 20, cz = bz * 40 + 20;
      if (cx < -160) continue; // beach strip stays open
      if (cx === 20 && cz === 20) continue; // central plaza
      if (cx === 20 && cz === -20) continue; // Meridian Bank tower
      const n = this.rng.int(1, 2);
      for (let k = 0; k < n; k++) {
        const w = this.rng.range(9, 15), d = this.rng.range(9, 15);
        const h = this.rng.range(8, this.rng.chance(0.18) ? 42 : 22);
        const ox = k === 0 ? -6.5 : 6.5, oz = k === 0 ? -6.5 : 6.5;
        const mesh = new THREE.Mesh(geo, this.rng.pick(mats));
        mesh.position.set(cx + ox, 0, cz + oz);
        mesh.scale.set(w, h, d);
        mesh.castShadow = true; mesh.receiveShadow = true;
        this.scene.add(mesh);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6), roofMat);
        roof.position.set(cx + ox, h, cz + oz);
        this.scene.add(roof);
        this.colliders.push({ x: cx + ox, z: cz + oz, hx: w / 2, hz: d / 2 });
      }
    }
    // Central plaza: fountain + the Meridian Bank tower, on their own blocks.
    const bank = new THREE.Mesh(geo, mats[3]);
    bank.position.set(20, 0, -20); bank.scale.set(20, 30, 16);
    bank.castShadow = true;
    this.scene.add(bank);
    this.colliders.push({ x: 20, z: -20, hx: 10, hz: 8 });
    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 7, 1.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.6 }),
    );
    fountain.position.set(20, 0.6, 20);
    this.scene.add(fountain);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.2, 0.3, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a9ac8, roughness: 0.2, metalness: 0.4 }),
    );
    water.position.set(20, 1.1, 20);
    this.scene.add(water);
    this.colliders.push({ x: 20, z: 20, hx: 6.5, hz: 6.5 });
  }
  buildPalmsAndLamps() {
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 });
    const leafGeo = new THREE.ConeGeometry(2.6, 3.4, 7);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a8a4a, roughness: 0.9 });
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x303030, roughness: 0.6, metalness: 0.5 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffeebb, emissive: 0xffcc66, emissiveIntensity: 1.4 });
    for (let i = 0; i < 90; i++) {
      const x = this.rng.range(-200, 200), z = this.rng.range(-200, 200);
      if (this.onRoad(x, z) || this.collideCircle(x, z, 3)) continue;
      if (x < -178) continue;
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 3, z);
      trunk.castShadow = true;
      this.scene.add(trunk);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(x, 7.2, z);
      leaf.castShadow = true;
      this.scene.add(leaf);
    }
    for (const rx of ROADS) for (const rz of ROADS) {
      if (this.rng.chance(0.5)) continue;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(rx + 7, 3, rz + 7);
      this.scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), lampMat);
      lamp.position.set(rx + 7, 6.2, rz + 7);
      this.scene.add(lamp);
    }
  }
  buildSun() {
    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x8a7a5a, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
    sun.position.set(120, 160, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
    sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
    sun.shadow.camera.far = 500;
    this.scene.add(sun);
    this.scene.background = new THREE.Color(PALETTE.sky);
    this.scene.fog = new THREE.Fog(PALETTE.fog, 180, 420);
  }
}
