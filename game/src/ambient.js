// SOLMAR BAY — ambient.js
// CityLife: the city stops being a backdrop and starts living. Four
// pedestrian archetypes with their own rhythms, seagulls over the beach,
// and a rush hour that actually fills the roads.
//
// - Joggers run the road grid at 4+ m/s and never stop to look around.
// - Tourists drift between landmarks (garage, bank, harbor) and stand
//   still for long stretches, gawping at the skyline.
// - Beachgoers stay on the sand (z 152..178), wandering the shoreline.
// - Buskers plant themselves by the harbor and the beach, bobbing to a
//   song only they hear, with a gold note-burst every few seconds.
// - Seagulls: five gulls circling the beach and harbor, wings flapping.
// - Rush hour: when the game clock reads 18:00-19:00 or 07:00-08:00 the
//   roads fill — six extra traffic cars spawn once per rush window.
//
// Archetype behaviour lives in people.js (a small hook in _wander /
// _pickTarget); this file owns spawning, gulls, and the rush clock.

import * as THREE from 'three';
import { S } from './state.js';
import { Ped } from './people.js';
import { spawnTraffic } from './vehicles.js';

const JOGGER_SHIRTS = [0xff5a3c, 0x2ed573, 0x1e90ff, 0xffd32a];
const TOURIST_SHIRTS = [0xf8efba, 0xffeaa7, 0xfd79a8, 0x74b9ff];
const BEACH_SHIRTS = [0x00cec9, 0xe17055, 0xfdcb6e, 0x6c5ce7];

function rand(a, b) { return a + Math.random() * (b - a); }

export class CityLife {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.gulls = [];
    this.rushDone = false; // rush-hour spawn already fired this window
    this.buskerT = 0;
    this.spawned = { jogger: 0, tourist: 0, beach: 0, busker: 0 };
    this._buildGulls();
  }

  // Five gulls, each a body + two flapping wing planes, circling the
  // beach (0, 165) and the harbor (90, 138) at 20-30 m up.
  _buildGulls() {
    const gullMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2, side: THREE.DoubleSide });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x2a2f3a, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.1, 6), gullMat);
      body.rotation.x = Math.PI / 2;
      group.add(body);
      const wingGeo = new THREE.PlaneGeometry(1.5, 0.45);
      const wingL = new THREE.Mesh(wingGeo, gullMat);
      wingL.position.x = -0.85;
      group.add(wingL);
      const wingR = new THREE.Mesh(wingGeo, gullMat);
      wingR.position.x = 0.85;
      group.add(wingR);
      const tip = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.45), tipMat);
      tip.position.x = 1.65;
      group.add(tip);
      const centre = i < 3 ? { x: 0, z: 165 } : { x: 90, z: 138 };
      this.gulls.push({
        mesh: group,
        wingL,
        wingR,
        centre,
        radius: rand(14, 26),
        height: rand(20, 30),
        angle: rand(0, Math.PI * 2),
        speed: rand(0.12, 0.22) * (Math.random() < 0.5 ? 1 : -1),
        flap: rand(0, Math.PI * 2),
        flapSpeed: rand(5, 8),
      });
      this.scene.add(group);
    }
  }

  // One archetype ped, tagged so people.js drives it differently.
  _makePed(kind, x, z, shirt) {
    const ped = new Ped(this.scene, this.world, { x, z, hostile: false, shirt });
    ped.archetype = kind;
    if (kind === 'jogger') ped.walkSpeed = rand(4.0, 4.8);
    if (kind === 'tourist') ped.walkSpeed = rand(1.0, 1.6);
    if (kind === 'beachgoer') ped.walkSpeed = rand(1.2, 2.0);
    if (kind === 'busker') { ped.walkSpeed = 0.4; ped.pauseT = rand(6, 12); }
    if (S && Array.isArray(S.peds)) S.peds.push(ped);
    this.spawned[kind === 'beachgoer' ? 'beach' : kind]++;
    return ped;
  }

  // Spawn the full ambient cast once, at game start.
  spawnCast() {
    if (!this.world) return;
    const w = this.world;
    // Joggers: on the road grid, spread across the city.
    for (let i = 0; i < 6; i++) {
      const p = w.randomRoadPoint ? w.randomRoadPoint(Math.random) : { x: rand(-120, 120), z: rand(-120, 120) };
      this._makePed('jogger', p.x, p.z, JOGGER_SHIRTS[i % JOGGER_SHIRTS.length]);
    }
    // Tourists: near landmarks, in pairs.
    const spots = [
      { x: w.garage.x + 6, z: w.garage.z + 6 },
      { x: w.bank.x + 8, z: w.bank.z + 8 },
      { x: w.harbor.x - 6, z: w.harbor.z - 6 },
    ];
    for (let i = 0; i < 6; i++) {
      const s = spots[i % spots.length];
      this._makePed('tourist', s.x + rand(-4, 4), s.z + rand(-4, 4), TOURIST_SHIRTS[i % TOURIST_SHIRTS.length]);
    }
    // Beachgoers: on the sand, z 152..178.
    for (let i = 0; i < 6; i++) {
      this._makePed('beachgoer', rand(-110, 110), rand(153, 176), BEACH_SHIRTS[i % BEACH_SHIRTS.length]);
    }
    // Buskers: harbor steps + beach edge.
    this._makePed('busker', w.harbor.x - 10, w.harbor.z - 2, 0x8e44ad);
    this._makePed('busker', 24, 154, 0xd35400);
  }

  // Game clock hour (day 1 starts 18:30; 1 game hour = 120 s).
  _clockHour() {
    const hours = 18.5 + (S.time || 0) / 120;
    return hours % 24;
  }

  _inRush() {
    const h = this._clockHour();
    return (h >= 18 && h < 19) || (h >= 7 && h < 8);
  }

  update(dt) {
    // Gulls: circle their centre, wings flapping.
    for (const g of this.gulls) {
      g.angle += g.speed * dt;
      g.flap += g.flapSpeed * dt;
      const x = g.centre.x + Math.sin(g.angle) * g.radius;
      const z = g.centre.z + Math.cos(g.angle) * g.radius;
      const y = g.height + Math.sin(g.flap * 0.5) * 1.5;
      g.mesh.position.set(x, y, z);
      // Face along the orbit tangent.
      g.mesh.rotation.y = g.angle + (g.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
      const flap = Math.sin(g.flap) * 0.55;
      g.wingL.rotation.z = flap;
      g.wingR.rotation.z = -flap;
    }

    // Rush hour: one burst of extra traffic per window.
    if (this._inRush()) {
      if (!this.rushDone) {
        this.rushDone = true;
        spawnTraffic(this.scene, this.world, 6);
        if (S && S.hud && typeof S.hud.toast === 'function') {
          S.hud.toast('Rush hour — the roads are packed.');
        }
      }
    } else {
      this.rushDone = false;
    }

    // Buskers: a gold note-burst above a random busker every few seconds.
    this.buskerT -= dt;
    if (this.buskerT <= 0) {
      this.buskerT = rand(4, 8);
      const buskers = (S.peds || []).filter((p) => p && p.alive && p.archetype === 'busker');
      if (buskers.length > 0 && S.fx && typeof S.fx.burst === 'function') {
        const b = buskers[Math.floor(Math.random() * buskers.length)];
        S.fx.burst({ x: b.pos.x, y: 2.4, z: b.pos.z }, 0xffd700, 5, 1.5, 0.8);
      }
    }

    // Top the cast back up if the player thinned it (never above the cap).
    const alive = (S.peds || []).filter((p) => p && p.alive && p.archetype);
    if (alive.length < 12 && Math.random() < dt * 0.05) {
      const kinds = ['jogger', 'tourist', 'beachgoer'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const p = this.world.randomSidewalkPoint
        ? this.world.randomSidewalkPoint(Math.random)
        : { x: rand(-120, 120), z: rand(-120, 120) };
      const shirts = kind === 'jogger' ? JOGGER_SHIRTS : kind === 'tourist' ? TOURIST_SHIRTS : BEACH_SHIRTS;
      this._makePed(kind, p.x, p.z, shirts[Math.floor(Math.random() * shirts.length)]);
    }
  }

  remove() {
    for (const g of this.gulls) this.scene.remove(g.mesh);
    this.gulls = [];
  }
}
