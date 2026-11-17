// SOLMAR BAY — people: sidewalk pedestrians who stroll and flee gunfire,
// gang members who fight, and foot cops who chase the player. The player
// avatar is built by the same mesh factory.
import * as THREE from 'three';
import { CFG, PALETTE } from './config.js';

export function makePersonMesh(shirt, pants) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants || 0x2a2a3a, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8a070, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.9, 8), shirtMat);
  body.position.y = 1.05; body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skinMat);
  head.position.y = 1.78; head.castShadow = true;
  g.add(head);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 6), pantsMat);
  legL.position.set(-0.14, 0.35, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.14; g.add(legR);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 6), shirtMat);
  armL.position.set(-0.45, 1.05, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.45; g.add(armR);
  g.userData = { legL, legR, armL, armR, body };
  return g;
}

export class People {
  constructor(scene, city, rng) {
    this.scene = scene; this.city = city; this.rng = rng;
    this.peds = [];
    this.enemies = [];
    for (let i = 0; i < CFG.traffic.peds; i++) this.spawnPed(true);
  }
  spawnPed(anywhere) {
    // Retry: most random points land on a road or inside a building.
    for (let tries = 0; tries < 24; tries++) {
      const bx = this.rng.int(-5, 4) * 40 + 20, bz = this.rng.int(-5, 4) * 40 + 20;
      if (bx < -160) continue;
      const x = bx + this.rng.range(-12, 12), z = bz + this.rng.range(-12, 12);
      if (this.city.onRoad(x, z) || this.city.collideCircle(x, z, 2)) continue;
      const mesh = makePersonMesh(this.rng.pick(PALETTE.pedShirt));
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      const ped = {
        mesh, pos: mesh.position, heading: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(1.2, 2.2), target: null, flee: 0, walkT: Math.random() * 10,
      };
      ped.target = this.pickStrollTarget(ped.pos);
      this.peds.push(ped);
      return ped;
    }
    return null;
  }
  pickStrollTarget(from) {
    // A point on the same block's sidewalk ring (blocks centre on 40k+20).
    const bx = Math.round((from.x - 20) / 40) * 40 + 20;
    const bz = Math.round((from.z - 20) / 40) * 40 + 20;
    return new THREE.Vector3(
      bx + this.rng.pick([-13, 13, this.rng.range(-12, 12)]),
      0,
      bz + this.rng.pick([-13, 13, this.rng.range(-12, 12)]),
    );
  }
  spawnEnemy(x, z, kind) {
    const shirt = kind === 'cop' ? 0x1a2a5a : 0x8a2020;
    const mesh = makePersonMesh(shirt, kind === 'cop' ? 0x1a2a5a : 0x3a3a3a);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const e = {
      mesh, pos: mesh.position, heading: 0, kind: kind || 'gang',
      hp: kind === 'cop' ? CFG.combat.copHp : CFG.combat.enemyHp,
      speed: kind === 'cop' ? 5.2 : 3.6, shootT: this.rng.range(0.5, 1.5),
      dead: false, walkT: 0,
    };
    this.enemies.push(e);
    return e;
  }
  removeEnemy(e) {
    this.scene.remove(e.mesh);
    this.enemies = this.enemies.filter((x) => x !== e);
  }
  scare(x, z, radius) {
    for (const p of this.peds) {
      if (Math.hypot(p.pos.x - x, p.pos.z - z) < radius) p.flee = 4;
    }
  }
  damageEnemy(e, amount, fx, onKill) {
    if (e.dead) return;
    e.hp -= amount;
    if (fx) fx.blood(e.pos.clone().setY(1.4));
    if (e.hp <= 0) {
      e.dead = true;
      if (fx) fx.blood(e.pos.clone().setY(1));
      this.removeEnemy(e);
      if (onKill) onKill(e);
    }
  }
  update(dt, playerPos, playerAlive, events) {
    // Pedestrians stroll the block edges; flee from gunfire.
    for (const p of [...this.peds]) {
      p.walkT += dt;
      const speed = p.flee > 0 ? 5 : p.speed;
      if (p.flee > 0) p.flee -= dt;
      const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 1) {
        p.target = p.flee > 0
          ? new THREE.Vector3(p.pos.x + (p.pos.x - playerPos.x), 0, p.pos.z + (p.pos.z - playerPos.z))
          : this.pickStrollTarget(p.pos);
      } else {
        const want = Math.atan2(dx, dz);
        let dh = want - p.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        p.heading += Math.max(-3 * dt, Math.min(3 * dt, dh));
        p.pos.x += Math.sin(p.heading) * speed * dt;
        p.pos.z += Math.cos(p.heading) * speed * dt;
        this.city.resolveCircle(p.pos, 0.6);
      }
      p.mesh.rotation.y = p.heading;
      const swing = Math.sin(p.walkT * (p.flee > 0 ? 14 : 8)) * 0.5;
      p.mesh.userData.legL.rotation.x = swing;
      p.mesh.userData.legR.rotation.x = -swing;
      p.mesh.userData.armL.rotation.x = -swing * 0.7;
      p.mesh.userData.armR.rotation.x = swing * 0.7;
      if (Math.abs(p.pos.x) > 205 || Math.abs(p.pos.z) > 205) {
        this.scene.remove(p.mesh);
        this.peds = this.peds.filter((x) => x !== p);
        this.spawnPed(true);
      }
    }
    // Enemies: close in and shoot at the player.
    for (const e of [...this.enemies]) {
      if (e.dead) continue;
      const dx = playerPos.x - e.pos.x, dz = playerPos.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      e.walkT += dt;
      if (playerAlive && d > 2.5 && d < 60) {
        const want = Math.atan2(dx, dz);
        let dh = want - e.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        e.heading += Math.max(-4 * dt, Math.min(4 * dt, dh));
        e.pos.x += Math.sin(e.heading) * e.speed * dt;
        e.pos.z += Math.cos(e.heading) * e.speed * dt;
        this.city.resolveCircle(e.pos, 0.6);
      }
      e.mesh.rotation.y = e.heading;
      const swing = Math.sin(e.walkT * 10) * 0.4;
      e.mesh.userData.legL.rotation.x = swing;
      e.mesh.userData.legR.rotation.x = -swing;
      e.shootT -= dt;
      if (playerAlive && d < 42 && d > 3 && e.shootT <= 0) {
        e.shootT = e.kind === 'cop' ? 1.6 : 1.1;
        if (events && events.enemyShot) events.enemyShot(e, d);
      }
      if (playerAlive && d < 1.6 && events && events.enemyTouch) events.enemyTouch(e);
    }
  }
}
