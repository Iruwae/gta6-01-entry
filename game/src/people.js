// SOLMAR BAY — people.js
// Original open-world crime game for make.fun gta6-01. All code written
// from scratch in this session. No Rockstar / GTA assets, no network use.
// Low-poly pedestrians (civilians + hostile shooters) and foot police.
//
// AI shape (game-ai skill): one small FSM per ped — Wander / Flee / Fight
// (hostile) / Chase (cop) / Fallen — with separate enter/exit ranges so
// states do not flicker, and a 2 s stuck guard that picks a new waypoint.

import * as THREE from 'three';
import { S } from './state.js';

const SHIRTS = [0xcc5544, 0x4488cc, 0x44aa66, 0xddcc44, 0xaa66cc, 0xeeeeee, 0xcc8844, 0x558888];
const SKINS = [0xe8b98a, 0xc98d5f, 0x8a5a34, 0xf0c8a0, 0x6e4423];
const NAMES = [
  'Mara', 'Dito', 'Sari', 'Bimo', 'Lena', 'Raka', 'Nia', 'Tono',
  'Ayu', 'Fajar', 'Rani', 'Eko', 'Putri', 'Agus', 'Dewi', 'Joko',
];

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildPersonMesh(shirt, skin, withCap) {
  const body = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.72, 0.28), pantsMat);
  legs.position.y = 0.36;
  body.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.68, 0.34), shirtMat);
  torso.position.y = 1.06;
  body.add(torso);
  const armGeo = new THREE.BoxGeometry(0.14, 0.62, 0.16);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, shirtMat);
    arm.position.set(sx * 0.39, 1.06, 0);
    body.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skinMat);
  head.position.y = 1.62;
  body.add(head);
  if (withCap) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 }),
    );
    cap.position.y = 1.82;
    body.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 }));
    brim.position.set(0, 1.78, 0.3);
    body.add(brim);
  }
  return body;
}

export class Ped {
  constructor(scene, world, opts = {}) {
    this.scene = scene;
    this.world = world;
    this.name = opts.name || pick(NAMES);
    this.shirt = opts.shirt !== undefined ? opts.shirt : pick(SHIRTS);
    this.hostile = !!opts.hostile;
    this.health = this.hostile ? 60 : 100;
    this.alive = true;
    this.heading = rand(0, Math.PI * 2);
    this.walkSpeed = rand(1.5, 2.5);
    this.target = null;
    this.pauseT = rand(0, 2);
    this.shootT = rand(0.4, 1.2);
    this.fallT = 0;
    this.scaredT = 0;
    this.strafeDir = 1;
    this.strafeT = 0;
    this.stuckT = 0;
    this._lastX = opts.x || 0;
    this._lastZ = opts.z || 0;
    this._bobT = rand(0, 6);

    const mesh = new THREE.Group();
    this.body = buildPersonMesh(this.shirt, pick(SKINS), false);
    mesh.add(this.body);
    mesh.position.set(opts.x || 0, 0, opts.z || 0);
    mesh.rotation.y = this.heading;
    scene.add(mesh);
    this.mesh = mesh;
    this.pos = mesh.position; // pos IS mesh.position (contract)
    mesh.userData.ref = this;
  }

  update(dt, playerPos, dangerPos) {
    if (!this.alive) {
      // Fallen: rotate flat over 0.3 s, then rest (game-feel: death reads).
      this.fallT += dt;
      const k = Math.min(1, this.fallT / 0.3);
      this.mesh.rotation.x = -k * (Math.PI / 2) * 0.96;
      return;
    }
    if (dt <= 0) return;
    this.scaredT = Math.max(0, this.scaredT - dt);

    // Fight: hostile peds face the player and shoot every ~1.5 s inside 40 m.
    // Shots can miss: ~70% hit up close, ~30% at 35 m — four rivals at full
    // accuracy dealt ~20 dps, which ended a run in seconds.
    if (this.hostile && playerPos) {
      const dx = playerPos.x - this.pos.x;
      const dz = playerPos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 40) {
        this.heading = Math.atan2(dx, dz);
        this.mesh.rotation.y = this.heading;
        this.shootT -= dt;
        // Strafe slowly so the shooter is not a static turret.
        this.strafeT -= dt;
        if (this.strafeT <= 0) { this.strafeT = rand(1, 2); this.strafeDir *= -1; }
        const px = Math.cos(this.heading);
        const pz = -Math.sin(this.heading);
        this.pos.x += px * this.strafeDir * 1.0 * dt;
        this.pos.z += pz * this.strafeDir * 1.0 * dt;
        if (this.shootT <= 0 && dist < 35) {
          this.shootT = 1.5;
          // Hit chance falls with range: ~70% up close, ~30% at 35 m.
          const hitP = Math.max(0.3, 0.7 - 0.4 * (dist / 35));
          if (Math.random() < hitP) {
            if (S.player && S.player.damage) S.player.damage(5);
            if (S.fx && S.fx.burst) {
              S.fx.burst(playerPos, 0xffee88, 4, 3, 0.3);
            }
          }
          if (S.audio && S.audio.shot) S.audio.shot(0.4); // quiet distant shot
        }
        return;
      }
    }

    // Flee: danger (explosion / gunfire / the player after a shooting) close by.
    if (dangerPos) {
      const dx = this.pos.x - dangerPos.x;
      const dz = this.pos.z - dangerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 15 && dist > 0.01) {
        this._fleeFrom(dangerPos, dt, 5);
        return;
      }
    }
    if (this.scaredT > 0 && playerPos) {
      this._fleeFrom(playerPos, dt, 5);
      return;
    }

    this._wander(dt);
  }

  _fleeFrom(from, dt, speed) {
    const dx = this.pos.x - from.x;
    const dz = this.pos.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    this.heading = Math.atan2(dx / d, dz / d);
    this.mesh.rotation.y = this.heading;
    this.pos.x += (dx / d) * speed * dt;
    this.pos.z += (dz / d) * speed * dt;
    this._clampAndBob(dt, speed);
  }

  _wander(dt) {
    if (this.pauseT > 0) {
      this.pauseT -= dt;
      return;
    }
    if (!this.target) {
      this._pickTarget();
      return;
    }
    const dx = this.target.x - this.pos.x;
    const dz = this.target.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1) {
      this.target = null;
      if (Math.random() < 0.35) this.pauseT = rand(1, 4);
      return;
    }
    this.heading = Math.atan2(dx / dist, dz / dist);
    this.mesh.rotation.y = this.heading;
    this.pos.x += (dx / dist) * this.walkSpeed * dt;
    this.pos.z += (dz / dist) * this.walkSpeed * dt;
    // Stuck guard: no progress in 2 s -> pick a fresh waypoint.
    const moved = Math.hypot(this.pos.x - this._lastX, this.pos.z - this._lastZ);
    if (moved < 0.05) {
      this.stuckT += dt;
      if (this.stuckT > 2) { this.stuckT = 0; this._pickTarget(); }
    } else {
      this.stuckT = 0;
    }
    this._lastX = this.pos.x;
    this._lastZ = this.pos.z;
    this._clampAndBob(dt, this.walkSpeed);
  }

  _pickTarget() {
    if (this.world && this.world.randomSidewalkPoint) {
      this.target = this.world.randomSidewalkPoint(Math.random);
    } else {
      this.target = {
        x: this.pos.x + rand(-30, 30),
        z: this.pos.z + rand(-30, 30),
      };
    }
  }

  _clampAndBob(dt, speed) {
    if (this.world && this.world.clampPos) this.world.clampPos(this.pos);
    this._bobT += dt * speed * 3.2;
    this.body.position.y = Math.abs(Math.sin(this._bobT)) * 0.05;
  }

  damage(amount) {
    if (!this.alive) return false;
    this.health -= amount;
    if (S.fx && S.fx.damageNumber) {
      S.fx.damageNumber(
        { x: this.pos.x, y: this.pos.y + 2.1, z: this.pos.z },
        `-${Math.round(amount)}`,
        '#ff7777',
      );
    }
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.fallT = 0;
      if (S.fx && S.fx.burst) S.fx.burst(this.pos, 0xcc2222, 12, 4, 0.6);
      return true;
    }
    // A wounded civilian runs from whoever shot them.
    if (!this.hostile && S.player) this.scaredT = 3;
    return false;
  }

  remove() {
    if (this.scene && this.mesh) this.scene.remove(this.mesh);
  }
}

export class Cop extends Ped {
  constructor(scene, world, x, z) {
    super(scene, world, { x, z, shirt: 0x1a2a55, name: 'Officer' });
    this.health = 80;
    this.walkSpeed = 2.2; // patrol pace
    this.chaseSpeed = 4.5;
    this.punchCooldown = 0;
    // Dark-blue uniform: swap the torso/arms to navy (built navy via shirt).
    this.mesh.userData.ref = this;
  }

  update(dt, playerPos) {
    if (!this.alive) {
      this.fallT += dt;
      const k = Math.min(1, this.fallT / 0.3);
      this.mesh.rotation.x = -k * (Math.PI / 2) * 0.96;
      return;
    }
    if (dt <= 0) return;
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    const wanted = (S && S.wanted) || 0;
    if (wanted > 0 && playerPos) {
      const dx = playerPos.x - this.pos.x;
      const dz = playerPos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      // Enter chase inside 45 m; only give up when the player is far / wanted clears.
      if (dist < 45) {
        this.heading = Math.atan2(dx / dist, dz / dist);
        this.mesh.rotation.y = this.heading;
        if (dist > 1.6) {
          this.pos.x += (dx / dist) * this.chaseSpeed * dt;
          this.pos.z += (dz / dist) * this.chaseSpeed * dt;
          this._clampAndBob(dt, this.chaseSpeed);
        } else if (this.punchCooldown <= 0) {
          this.punchCooldown = 0.8;
          if (S.player && S.player.damage) S.player.damage(8);
          if (S.fx && S.fx.addShake) S.fx.addShake(0.2);
          if (S.fx && S.fx.burst) S.fx.burst(playerPos, 0xffffff, 4, 2, 0.3);
        }
        return;
      }
    }
    this._wander(dt);
  }

  damage(amount) {
    if (!this.alive) return false;
    this.health -= amount;
    if (S.fx && S.fx.damageNumber) {
      S.fx.damageNumber(
        { x: this.pos.x, y: this.pos.y + 2.1, z: this.pos.z },
        `-${Math.round(amount)}`,
        '#ff7777',
      );
    }
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.fallT = 0;
      if (S.fx && S.fx.burst) S.fx.burst(this.pos, 0xcc2222, 12, 4, 0.6);
      return true;
    }
    return false;
  }
}

export function spawnPeds(scene, world, n) {
  if (!S.peds) S.peds = [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = world && world.randomSidewalkPoint
      ? world.randomSidewalkPoint(Math.random)
      : { x: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200 };
    // Civilians only: armed street shooters are spawned by missions, never
    // at random — free roam should not ambush the player unprovoked.
    const ped = new Ped(scene, world, { x: p.x, z: p.z, hostile: false });
    S.peds.push(ped);
    out.push(ped);
  }
  return out;
}

export function spawnCop(scene, world, x, z) {
  if (!S.cops) S.cops = [];
  const cop = new Cop(scene, world, x, z);
  S.cops.push(cop);
  return cop;
}
