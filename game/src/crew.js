// SOLMAR BAY — crew.js
// Lena Cruz as a getaway companion: she joins every story job, follows
// Marco on foot, rides shotgun when he drives, and shoots hostile crew
// members beside him. She is a real actor, not a HUD label — her kills
// count through the same registerKill path the player's shots use, and
// she speaks her own lines (crew_join / crew_done in dialogue.js) only
// when no mission briefing is running, so she never talks over a briefing.

import * as THREE from 'three';
import { S } from './state.js';
import { DIALOGUE } from './dialogue.js';

const FOLLOW_DIST = 6;   // metres: closer than this she holds position
const FOLLOW_SPEED = 7;  // m/s on foot — a touch slower than a sprint
const SHOOT_RANGE = 30;  // metres: hostiles inside this get shot at
const SHOOT_DAMAGE = 12;
const SHOOT_COOLDOWN = 1.2;

function buildLenaMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x7a1f2b, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.9 });
  const denim = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.85 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), jacket);
  torso.position.y = 1.15;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skin);
  head.position.y = 1.72;
  g.add(head);
  // Long dark hair: back panel + top cap, like her portrait.
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.18), hair);
  hairBack.position.set(0, 1.45, -0.14);
  g.add(hairBack);
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), hair);
  hairTop.position.set(0, 1.82, -0.02);
  hairTop.scale.set(1, 0.7, 1);
  g.add(hairTop);
  // Gold hoop earring (left).
  const hoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.012, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.3 }),
  );
  hoop.position.set(-0.22, 1.66, 0);
  g.add(hoop);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), denim);
  legL.position.set(-0.14, 0.38, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.14;
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), jacket);
  armL.position.set(-0.36, 1.15, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.36;
  g.add(armR);
  // Pistol in her right hand.
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.4, metalness: 0.6 }),
  );
  gun.position.set(0.36, 0.82, 0.15);
  g.add(gun);
  return { group: g, legL, legR };
}

export class CrewMember {
  constructor(scene) {
    this.scene = scene;
    this.active = false;   // joined a mission
    this.inCar = false;    // riding shotgun (mesh hidden)
    this.heading = 0;
    this.shootT = 0;
    this._bobT = 0;
    this.pos = new THREE.Vector3(-84, 0, -72);
    const built = buildLenaMesh();
    this.mesh = built.group;
    this._legL = built.legL;
    this._legR = built.legR;
    this.mesh.visible = false;
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  joinMission(idx) {
    if (this.active || !S || !S.player) return;
    this.active = true;
    this.inCar = false;
    // Spawn a few metres behind the player, facing the same way.
    const p = S.player.pos;
    this.pos.set(p.x - Math.sin(S.player.heading) * 3, 0, p.z - Math.cos(S.player.heading) * 3);
    this.heading = S.player.heading;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    this.mesh.visible = true;
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast('Lena joined the job — she has your back.');
    }
    this._say('crew_join');
  }

  leaveMission() {
    if (!this.active) return;
    this.active = false;
    this.inCar = false;
    this.mesh.visible = false;
    this._say('crew_done');
  }

  // Play a crew line only when no mission briefing is running — Lena never
  // talks over Lena's own briefing or Vic's.
  _say(id) {
    if (!S || !S.dialogue) return;
    if (S.dialogue.active) return;
    const lines = DIALOGUE[id];
    if (lines) S.dialogue.play(lines);
  }

  update(dt) {
    if (!this.active || !S || !S.player || dt <= 0) return;
    const p = S.player.pos;
    if (S.car) {
      // Riding shotgun: hidden, carried by the car.
      this.inCar = true;
      this.mesh.visible = false;
      this.pos.copy(S.car.pos);
      return;
    }
    this.inCar = false;
    this.mesh.visible = true;
    const dx = p.x - this.pos.x;
    const dz = p.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > FOLLOW_DIST) {
      // Close the gap at a run, facing the player.
      this.heading = Math.atan2(dx / d, dz / d);
      this.mesh.rotation.y = this.heading;
      this.pos.x += (dx / d) * FOLLOW_SPEED * dt;
      this.pos.z += (dz / d) * FOLLOW_SPEED * dt;
      this._bobT += dt * FOLLOW_SPEED * 3.2;
      const swing = Math.sin(this._bobT) * 0.5;
      if (this._legL) this._legL.rotation.x = swing;
      if (this._legR) this._legR.rotation.x = -swing;
      this.mesh.position.y = Math.abs(Math.sin(this._bobT)) * 0.05;
    } else {
      this.mesh.position.y = 0;
      if (this._legL) this._legL.rotation.x = 0;
      if (this._legR) this._legR.rotation.x = 0;
    }
    this.mesh.position.x = this.pos.x;
    this.mesh.position.z = this.pos.z;
    if (S.world && S.world.clampPos) S.world.clampPos(this.pos);
    this._shoot(dt);
  }

  _shoot(dt) {
    this.shootT -= dt;
    if (this.shootT > 0) return;
    let best = null;
    let bd = SHOOT_RANGE;
    for (const ped of (S.peds || [])) {
      if (!ped || !ped.alive || !ped.hostile) continue;
      const d = Math.hypot(ped.pos.x - this.pos.x, ped.pos.z - this.pos.z);
      if (d < bd) { bd = d; best = ped; }
    }
    if (!best) return;
    this.shootT = SHOOT_COOLDOWN;
    this.heading = Math.atan2(best.pos.x - this.pos.x, best.pos.z - this.pos.z);
    this.mesh.rotation.y = this.heading;
    const muzzle = {
      x: this.pos.x + Math.sin(this.heading) * 0.6,
      y: 1.3,
      z: this.pos.z + Math.cos(this.heading) * 0.6,
    };
    if (S.fx && S.fx.muzzle) S.fx.muzzle(muzzle);
    if (S.audio && S.audio.shot) S.audio.shot(0.25);
    if (best.damage(SHOOT_DAMAGE)) {
      if (S.stats) S.stats.kills++;
      if (S.stats) S.stats.crewKills = (S.stats.crewKills || 0) + 1;
      if (S.missions) S.missions.registerKill(best);
      if (S.respectDirector) S.respectDirector.crewKill();
      if (S.banterDirector) S.banterDirector.crewKill();
      if (S.hud && typeof S.hud.toast === 'function') S.hud.toast('Lena dropped one!');
    }
  }
}
