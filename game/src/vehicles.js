// SOLMAR BAY — vehicles.js
// Original open-world crime game for make.fun gta6-01. All code written
// from scratch in this session. No Rockstar / GTA assets, no network use.
// Arcade car driving (player + road-grid traffic AI), collisions, damage,
// smoke / explosion, police light bar, parked stealable cars.
//
// Game-feel notes (game-feel skill): crashes fire a medium-tier bundle —
// particles + trauma shake + crash sound together; police ram damage is
// deliberately LOW (~a few HP per hit, 0.5 s cooldown) so rams read as
// pressure, not an instant kill. Hit-stop lives in juice.js (FX).

import * as THREE from 'three';
import { CFG } from './config.js';
import { S } from './state.js';

const KIND_DEFAULTS = {
  sedan: { maxSpeed: 26, accel: 15, accelReverse: 10, len: 4.2, wid: 1.9, bodyH: 0.62, cabinH: 0.55 },
  taxi: { maxSpeed: 26, accel: 15, accelReverse: 10, len: 4.2, wid: 1.9, bodyH: 0.62, cabinH: 0.55 },
  sport: { maxSpeed: 34, accel: 19, accelReverse: 11, len: 4.0, wid: 2.0, bodyH: 0.5, cabinH: 0.48 },
  van: { maxSpeed: 22, accel: 11, accelReverse: 9, len: 4.8, wid: 2.1, bodyH: 1.05, cabinH: 0.9 },
  police: { maxSpeed: 30, accel: 17, accelReverse: 10, len: 4.3, wid: 1.95, bodyH: 0.62, cabinH: 0.55 },
};

function kindCfg(kind) {
  const base = KIND_DEFAULTS[kind] || KIND_DEFAULTS.sedan;
  const over = CFG && CFG.cars && CFG.cars[kind] ? CFG.cars[kind] : null;
  return over ? { ...base, ...over } : base;
}

const TRAFFIC_COLORS = [
  0x8899aa, 0xaa4444, 0x44aa66, 0xdddddd, 0x333344, 0xcc8833,
  0x4477cc, 0x77ccdd, 0xaa77cc, 0xeeeeaa, 0x226622, 0x992222,
];
const ROAD_LINES = [-120, -60, 0, 60, 120];

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// Shared headlight-beam geometry/material (one pair per car mesh).
let _headConeGeo = null;
let _headConeMat = null;
function headConeGeo() {
  if (!_headConeGeo) _headConeGeo = new THREE.ConeGeometry(1.1, 7, 12, 1, true);
  return _headConeGeo;
}
function headConeMat() {
  if (!_headConeMat) {
    _headConeMat = new THREE.MeshBasicMaterial({
      color: 0xffe9a0, transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
  }
  return _headConeMat;
}
function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class Car {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.kind = opts.kind || 'sedan';
    this.color = opts.color !== undefined ? opts.color : 0x8899aa;
    this.heading = opts.heading || 0;
    this.speed = 0;
    this.health = 100;
    this.dead = false;
    this.driverless = true;
    this.crashCooldown = 0;
    this.lightPhase = 0;
    this.stolen = false;
    this.parked = false;
    this.smokeT = 0;
    this.exhaustT = 0;
    this.steerAngle = 0;
    this.aiAxis = Math.random() < 0.5 ? 'x' : 'z';
    this.aiDir = Math.random() < 0.5 ? 1 : -1;
    this.aiLine = ROAD_LINES[Math.floor(Math.random() * ROAD_LINES.length)];
    this.aiCruise = 8 + Math.random() * 4;
    this.aiTurnT = 0;
    this.wheels = [];
    this.redLight = null;
    this.blueLight = null;

    const k = kindCfg(this.kind);
    const paint = this.kind === 'police' ? 0xf2f2f2
      : this.kind === 'taxi' ? 0xf7c948 : this.color;
    // Sunset-ready paint: clearcoat-smooth with a strong env reflection;
    // glass is dark, near-mirror, and picks up the orange sky.
    const bodyMat = new THREE.MeshStandardMaterial({
      color: paint, roughness: 0.28, metalness: 0.55, envMapIntensity: 1.2,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.8, metalness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x223344, roughness: 0.06, metalness: 0.9, envMapIntensity: 1.5,
    });

    const mesh = new THREE.Group();
    const bodyH = k.bodyH;
    const bodyY = this.kind === 'van' ? 0.85 : 0.55;
    const body = new THREE.Mesh(new THREE.BoxGeometry(k.wid, bodyH, k.len), bodyMat);
    body.position.y = bodyY;
    mesh.add(body);
    // Cabin / roof box.
    const cabLen = this.kind === 'van' ? k.len * 0.72 : k.len * 0.48;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(k.wid * 0.86, k.cabinH, cabLen), glassMat);
    cabin.position.set(0, bodyY + bodyH / 2 + k.cabinH / 2 - 0.04, this.kind === 'van' ? -0.2 : -0.15);
    mesh.add(cabin);
    // Painted roof panel over the glass cabin + front grille + bumpers +
    // side mirrors: the silhouettes that read as "car" from a distance.
    const roofPanel = new THREE.Mesh(
      new THREE.BoxGeometry(k.wid * 0.8, 0.06, cabLen * 0.9), bodyMat,
    );
    roofPanel.position.set(0, bodyY + bodyH / 2 + k.cabinH - 0.02, cabin.position.z);
    mesh.add(roofPanel);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(k.wid * 0.5, 0.14, 0.06), darkMat);
    grille.position.set(0, bodyY - 0.1, k.len / 2 + 0.01);
    mesh.add(grille);
    for (const bz of [1, -1]) {
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(k.wid + 0.06, 0.16, 0.18), darkMat);
      bumper.position.set(0, 0.32, bz * (k.len / 2 + 0.02));
      mesh.add(bumper);
    }
    for (const sx of [-1, 1]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.2), darkMat);
      mirror.position.set(sx * (k.wid / 2 + 0.08), bodyY + bodyH / 2 + 0.12, 0.55);
      mesh.add(mirror);
    }
    if (this.kind === 'sport') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(k.wid * 0.9, 0.06, 0.4), darkMat);
      wing.position.set(0, bodyY + bodyH + 0.12, -k.len / 2 + 0.35);
      mesh.add(wing);
    }
    // Police cars get a black hood/trunk band via a thin dark box on the body.
    if (this.kind === 'police') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(k.wid + 0.02, 0.08, k.len * 0.34), darkMat);
      band.position.set(0, bodyY + bodyH / 2 + 0.01, -k.len * 0.28);
      mesh.add(band);
      // Light bar: two small emissive boxes, flashed in updateTraffic/setPlayerInput.
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.35), darkMat);
      barBase.position.set(0, bodyY + bodyH / 2 + k.cabinH + 0.05, -0.15);
      mesh.add(barBase);
      const redMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 1 });
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x0022ff, emissiveIntensity: 1 });
      this.redLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), redMat);
      this.redLight.position.set(-0.28, bodyY + bodyH / 2 + k.cabinH + 0.14, -0.15);
      mesh.add(this.redLight);
      this.blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), blueMat);
      this.blueLight.position.set(0.28, bodyY + bodyH / 2 + k.cabinH + 0.14, -0.15);
      mesh.add(this.blueLight);
    }
    if (this.kind === 'taxi') {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.18, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xfff2aa, emissive: 0xccaa22, emissiveIntensity: 0.6 }),
      );
      sign.position.set(0, bodyY + bodyH / 2 + k.cabinH + 0.09, -0.15);
      mesh.add(sign);
    }
    // Headlights (front = +Z local) and taillights.
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6cc, emissive: 0xffee99, emissiveIntensity: 1.4 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xff1111, emissiveIntensity: 0.9 });
    this.tailMat = tailMat;
    for (const sx of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headMat);
      head.position.set(sx * (k.wid / 2 - 0.3), bodyY, k.len / 2 + 0.01);
      mesh.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), tailMat);
      tail.position.set(sx * (k.wid / 2 - 0.3), bodyY, -k.len / 2 - 0.01);
      mesh.add(tail);
      // Volumetric-looking headlight beam: a wide additive cone, apex at
      // the lamp, widening forward. Cheap, no shadow cost.
      const cone = new THREE.Mesh(headConeGeo(), headConeMat());
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(sx * (k.wid / 2 - 0.3), bodyY, k.len / 2 + 3.5);
      mesh.add(cone);
    }
    // 4 wheels: pivot group per wheel so spin about the axle (X) is visible
    // via a spoke bar inside the tyre cylinder.
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
    const spokeGeo = new THREE.BoxGeometry(0.32, 0.62, 0.06);
    const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.34, 10);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.25, metalness: 0.9 });
    for (const [wx, wz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const pivot = new THREE.Group();
      pivot.position.set(wx * (k.wid / 2 - 0.05), 0.38, wz * (k.len / 2 - 0.7));
      const tyre = new THREE.Mesh(wheelGeo, darkMat);
      tyre.rotation.z = Math.PI / 2; // cylinder axis -> X (the axle)
      pivot.add(tyre);
      const spoke = new THREE.Mesh(spokeGeo, new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.4, metalness: 0.6 }));
      pivot.add(spoke);
      // Bright rim disc, slightly proud of the tyre on both faces.
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      pivot.add(rim);
      mesh.add(pivot);
      this.wheels.push(pivot);
    }

    mesh.position.set(opts.x || 0, 0, opts.z || 0);
    mesh.rotation.y = this.heading;
    scene.add(mesh);
    this.mesh = mesh;
    // Raycast hits walk up parents for userData.ref (player.js shoot):
    // without this, shots pass through cars with no owner to damage.
    mesh.userData.ref = this;
    this.pos = mesh.position; // pos IS mesh.position (contract)
  }

  // ---- player driving (arcade) ----
  setPlayerInput(input, dt) {
    if (this.dead || dt <= 0) return;
    const k = kindCfg(this.kind);
    const world = S.world;
    const fwd = input.down('KeyW') || input.down('ArrowUp');
    const back = input.down('KeyS') || input.down('ArrowDown');
    const left = input.down('KeyA') || input.down('ArrowLeft');
    const right = input.down('KeyD') || input.down('ArrowRight');

    if (fwd) this.speed += k.accel * dt;
    if (back) {
      if (this.speed > 0.5) this.speed -= k.accel * 1.4 * dt; // brake
      else this.speed -= k.accelReverse * dt; // reverse
    }
    if (!fwd && !back) {
      // Rolling drag + a little engine braking so the car settles.
      this.speed -= this.speed * 0.55 * dt;
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }
    this.speed = clamp(this.speed, -10, k.maxSpeed);
    // Brake lights flare while braking.
    if (this.tailMat) this.tailMat.emissiveIntensity = (back && this.speed > 0.5) ? 3.2 : 0.9;

    // Steering: A = left (+1), D = right (-1); authority falls with speed
    // (physics-tuning: no twitchy steering at top speed).
    const steerIn = (left ? 1 : 0) - (right ? 1 : 0);
    const maxSteer = 0.55 / (1 + Math.abs(this.speed) * 0.045);
    const steerTarget = steerIn * maxSteer;
    this.steerAngle += (steerTarget - this.steerAngle) * Math.min(1, dt * 8);
    this.heading += this.steerAngle * this.speed * dt * 0.09;

    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    this.mesh.rotation.y = this.heading;

    this._spinWheels(dt);
    this._flashLights(dt);
    this.crashCooldown = Math.max(0, this.crashCooldown - dt);
    this._maybeSmoke(dt);
    // Exhaust puffs from the tailpipe while moving.
    if (Math.abs(this.speed) > 10 && S.fx && S.fx.exhaust) {
      this.exhaustT -= dt;
      if (this.exhaustT <= 0) {
        this.exhaustT = 0.14;
        S.fx.exhaust({
          x: this.pos.x - Math.sin(this.heading) * (k.len / 2 + 0.3),
          y: 0.35,
          z: this.pos.z - Math.cos(this.heading) * (k.len / 2 + 0.3),
        });
      }
    }
    if (world) {
      this._collideWorld(world);
      this._collideCars();
      if (world.clampPos) world.clampPos(this.pos);
    }
  }

  // ---- traffic AI: follow the road grid (game-ai skill: perceive -> decide
  // -> steer; waypoints are road lines, repath only at intersections). ----
  updateTraffic(dt) {
    if (this.dead || this.parked || !this.driverless || dt <= 0) return;
    const world = S.world;
    this.aiTurnT = Math.max(0, this.aiTurnT - dt);
    this.crashCooldown = Math.max(0, this.crashCooldown - dt);
    this._maybeSmoke(dt);
    this._flashLights(dt);

    // Perceive: is there a car stopped/slow ahead in my lane?
    let blocked = false;
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    const cars = (S.cars || []);
    for (const other of cars) {
      if (other === this || other.dead) continue;
      const dx = other.pos.x - this.pos.x;
      const dz = other.pos.z - this.pos.z;
      const ahead = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (ahead > 0 && ahead < 8 && side < 2.5) { blocked = true; break; }
    }
    const targetSpeed = blocked ? 0 : this.aiCruise;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 1.5);

    // Decide: at an intersection, sometimes turn onto the crossing road.
    const movingCoord = this.aiAxis === 'x' ? this.pos.x : this.pos.z;
    let nearestCross = null;
    let nearestDist = Infinity;
    for (const line of ROAD_LINES) {
      const d = Math.abs(movingCoord - line);
      if (d < nearestDist) { nearestDist = d; nearestCross = line; }
    }
    if (nearestDist < 2.5 && this.aiTurnT <= 0 && Math.random() < 0.35) {
      this.aiTurnT = 3; // hysteresis: no flickering turns at one crossing
      const newAxis = this.aiAxis === 'x' ? 'z' : 'x';
      this.aiAxis = newAxis;
      this.aiLine = nearestCross;
      this.aiDir = Math.random() < 0.5 ? 1 : -1;
      // Snap onto the crossing line so the car never cuts a building corner.
      if (newAxis === 'x') this.pos.z = nearestCross;
      else this.pos.x = nearestCross;
    }

    // Steer: drive along the current road line, easing back onto it.
    const targetHeading = this.aiAxis === 'x'
      ? (this.aiDir > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (this.aiDir > 0 ? 0 : Math.PI);
    this.heading = angleLerp(this.heading, targetHeading, Math.min(1, dt * 3));
    if (this.aiAxis === 'x') {
      this.pos.x += this.aiDir * this.speed * dt;
      this.pos.z += (this.aiLine - this.pos.z) * Math.min(1, dt * 2);
    } else {
      this.pos.z += this.aiDir * this.speed * dt;
      this.pos.x += (this.aiLine - this.pos.x) * Math.min(1, dt * 2);
    }
    this.mesh.rotation.y = this.heading;
    this._spinWheels(dt);
    if (world) {
      this._collideCars();
      if (world.clampPos) world.clampPos(this.pos);
      // U-turn if we somehow reached the world edge.
      if (Math.abs(this.pos.x) > (world.bounds || 150) - 3
        || Math.abs(this.pos.z) > (world.bounds || 150) - 3) {
        this.aiDir *= -1;
      }
    }
  }

  _spinWheels(dt) {
    const spin = (this.speed * dt) / 0.38;
    for (const w of this.wheels) w.rotation.x += spin;
  }

  _flashLights(dt) {
    if (!this.redLight || !this.blueLight) return;
    this.lightPhase += dt * 7;
    const on = Math.sin(this.lightPhase) > 0;
    this.redLight.material.emissiveIntensity = on ? 2.6 : 0.15;
    this.blueLight.material.emissiveIntensity = on ? 0.15 : 2.6;
  }

  _maybeSmoke(dt) {
    if (this.health >= 40 || this.dead) return;
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.16;
      if (S.fx && S.fx.smoke) S.fx.smoke(this.pos);
    }
  }

  _applyCrash(impactSpeed) {
    // One bundled feedback event per hit (never per-frame while overlapping).
    this.crashCooldown = 0.5;
    this.speed *= 0.4;
    // Ram damage stays LOW (~2-6 HP per hit, capped) — police shoves sting,
    // they do not delete the car.
    const dmg = Math.min(6, Math.max(2, (impactSpeed - 8) * 0.45));
    this.damage(dmg);
    if (S.fx) {
      if (S.fx.burst) S.fx.burst(this.pos, 0xffcc66, 14, 6, 0.5);
      if (S.fx.addShake) S.fx.addShake(0.35);
    }
    if (S.audio && S.audio.crash) S.audio.crash();
  }

  _collideWorld(world) {
    const colliders = world.colliders || [];
    const r = 2.2;
    for (const c of colliders) {
      const cx = clamp(this.pos.x, c.minX, c.maxX);
      const cz = clamp(this.pos.z, c.minZ, c.maxZ);
      let dx = this.pos.x - cx;
      let dz = this.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = r - d;
        this.pos.x += (dx / d) * push;
        this.pos.z += (dz / d) * push;
      } else {
        // Centre inside the box: push out along the smallest penetration.
        const pl = (this.pos.x + r) - c.minX;
        const pr = c.maxX - (this.pos.x - r);
        const pt = (this.pos.z + r) - c.minZ;
        const pb = c.maxZ - (this.pos.z - r);
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) this.pos.x = c.minX - r;
        else if (m === pr) this.pos.x = c.maxX + r;
        else if (m === pt) this.pos.z = c.minZ - r;
        else this.pos.z = c.maxZ + r;
      }
      const impact = Math.abs(this.speed);
      if (impact > 8 && this.crashCooldown <= 0) this._applyCrash(impact);
      else if (impact > 2) this.speed *= 0.7;
      else this.speed *= 0.5;
    }
  }

  _collideCars() {
    const cars = S.cars || [];
    for (const other of cars) {
      if (other === this || other.dead) continue;
      const dx = this.pos.x - other.pos.x;
      const dz = this.pos.z - other.pos.z;
      const d2 = dx * dx + dz * dz;
      const minD = 4.0;
      if (d2 >= minD * minD || d2 < 0.0001) continue;
      const d = Math.sqrt(d2);
      const overlap = minD - d;
      const nx = dx / d;
      const nz = dz / d;
      // Parked cars are heavy: the moving car takes most of the push.
      const otherWeight = other.parked ? 0.1 : 0.5;
      this.pos.x += nx * overlap * (1 - otherWeight);
      this.pos.z += nz * overlap * (1 - otherWeight);
      if (!other.parked) {
        other.pos.x -= nx * overlap * otherWeight;
        other.pos.z -= nz * overlap * otherWeight;
      }
      const closing = Math.abs(this.speed - other.speed);
      if (closing > 8 && this.crashCooldown <= 0) {
        this._applyCrash(closing);
      } else if (closing > 3) {
        // Small speed exchange, no damage for gentle bumps.
        const mine = this.speed;
        this.speed = other.speed * 0.5 + mine * 0.3;
        if (!other.parked) other.speed = mine * 0.5 + other.speed * 0.3;
      }
    }
  }

  damage(amount) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.explode();
    }
  }

  explode() {
    if (this.dead) return;
    this.dead = true;
    this.speed = 0;
    if (S.fx && S.fx.burst) {
      S.fx.burst(this.pos, 0xff6600, 42, 11, 1.1);
      S.fx.burst(this.pos, 0xffcc33, 24, 8, 0.8);
      if (S.fx.addShake) S.fx.addShake(0.8);
    }
    if (S.audio && S.audio.crash) S.audio.crash();
    if (S.car === this) S.car = null;
    this.remove();
  }

  remove() {
    if (this.scene && this.mesh) this.scene.remove(this.mesh);
  }
}

export function spawnTraffic(scene, world, n) {
  if (!S.cars) S.cars = [];
  const kinds = ['sedan', 'sedan', 'sedan', 'taxi', 'sport', 'van'];
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = world && world.randomRoadPoint
      ? world.randomRoadPoint(Math.random)
      : { x: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200 };
    const car = new Car(scene, {
      x: p.x, z: p.z,
      heading: Math.random() * Math.PI * 2,
      color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)],
      kind: kinds[Math.floor(Math.random() * kinds.length)],
    });
    S.cars.push(car);
    out.push(car);
  }
  return out;
}

export function makeParkedCars(scene, world) {
  if (!S.cars) S.cars = [];
  const g = (world && world.garage) || { x: 0, z: 0 };
  const h = (world && world.harbor) || { x: 60, z: 60 };
  const b = (world && world.bank) || { x: -60, z: -60 };
  // Parked cars sit OUTSIDE every building collider. Garage footprint is
  // x -105..-75, z -100..-80; bank footprint is x 17..43, z 17..43 — so the
  // garage cars park on the forecourt strip south of the garage (z = -66,
  // the garage-door road edge) and the bank cars on the forecourt south of
  // the bank (z = 52), both clear of the walls and stealable from the road.
  const spots = [
    { x: g.x + 12, z: -66, kind: 'sedan', color: 0xaa4444 },
    { x: g.x - 12, z: -66, kind: 'sport', color: 0x2244aa },
    { x: h.x - 8, z: h.z + 4, kind: 'taxi', color: 0xf7c948 },
    { x: h.x - 8, z: h.z + 10, kind: 'van', color: 0xdddddd },
    { x: b.x - 6, z: 52, kind: 'sedan', color: 0x226622 },
    { x: b.x + 6, z: 52, kind: 'police', color: 0xf2f2f2 },
  ];
  const out = [];
  for (const s of spots) {
    const car = new Car(scene, {
      x: s.x, z: s.z, heading: (Math.random() - 0.5) * 0.6,
      color: s.color, kind: s.kind,
    });
    car.parked = true;
    S.cars.push(car);
    out.push(car);
  }
  return out;
}
