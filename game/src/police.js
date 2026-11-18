// SOLMAR BAY — police.js
// Police brain (BT-lite + utility tactics) and the PD helicopter.
// Original code, written fresh for round 4. No Rockstar / GTA assets.
//
// Design (ai-behavior-trees-utility-ai + enemy-ai + enemy-perception):
// - Top level is a tiny state machine: PURSUIT / SEARCH / STANDOFF, one
//   logical decision clock (5 Hz, staggered per car), transitions recorded
//   with a reason so the roster can explain the brain, not just show it.
// - Inside PURSUIT the tactic is a utility choice: PURSUIT vs RAMMING vs
//   ROADBLOCK. Every input is normalized 0..1 through a curve before
//   combining; a 0 vetoes; the running tactic gets a +0.08 hysteresis
//   bonus (only on positive scores) so units do not flicker every tick.
// - Perception writes facts: last-known position (LKP) with a timestamp.
//   When no unit has been within 45 m of the player for 4 s the LKP goes
//   stale and units switch to SEARCH: drive to the LKP and sweep it.
//   The minimap search zone is drawn from this same evidence.

import * as THREE from 'three';
import { S } from './state.js';
import { CFG } from './config.js';

export const TACTICS = {
  PURSUIT: { label: 'PURSUIT', color: '#ffb703' },
  RAMMING: { label: 'RAMMING', color: '#ff5252' },
  ROADBLOCK: { label: 'ROADBLOCK', color: '#4fc3f7' },
  SEARCH: { label: 'SEARCH', color: '#b388ff' },
};

// Deterministic callsigns in spawn order: PD-01, PD-02, ...
let _callsignN = 0;
export function nextCallsign() {
  _callsignN = (_callsignN % 99) + 1;
  return 'PD-' + String(_callsignN).padStart(2, '0');
}

// A RAMMING hit at 3+ stars spikes the heat (heat.js owns the drain; this
// is the police side of the same rule — the PD holds a grudge at high
// wanted, so every ram makes the chase harder to shake).
export function ramHeatSpike() {
  if (!S || (S.wanted || 0) < 3) return 0;
  const bonus = (CFG && CFG.HEAT && CFG.HEAT.spikeBonus) || 5;
  S.heat = Math.min(100, (S.heat || 0) + bonus);
  return bonus;
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

export class PoliceBrain {
  constructor(car) {
    this.car = car;
    this.tactic = 'PURSUIT';
    this.state = 'PURSUIT'; // PURSUIT | SEARCH | STANDOFF
    this.reason = 'spawn';
    this.decideT = Math.random() * 0.2; // stagger the 5 Hz decision clock
    this.blockPoint = null;
    this.blockSetT = 0;
  }

  // One decision tick. Returns the movement intent for this frame:
  // { tx, tz, targetSpeed, steerRate, holdHeading }.
  decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
    this.decideT -= dt;
    if (this.decideT > 0) return this._intent(playerPos, playerVel, playerHeading, playerSpeed);
    this.decideT = 0.2; // 5 Hz decision cadence, movement still every frame

    const car = this.car;
    const dx = playerPos.x - car.pos.x;
    const dz = playerPos.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    const speed01 = clamp01(Math.abs(playerSpeed) / 30);

    // --- perception: last-known position goes stale after 4 s unseen ---
    const lk = S.lastKnown;
    const stale = !lk || (S.time - lk.seenAt) > 4;
    if (stale && lk) {
      if (this.state !== 'SEARCH') {
        this.state = 'SEARCH';
        this.tactic = 'SEARCH';
        this.reason = 'lkp_stale';
      }
      return this._intent(playerPos, playerVel, playerHeading, playerSpeed);
    }

    // --- utility scoring (all inputs 0..1) ---
    // Each tactic owns a clear win zone: RAMMING near + slow, ROADBLOCK
    // fast + mid-range, PURSUIT everywhere else. PURSUIT's base is kept
    // low (0.1–0.6) so the specialists can actually win their zones.
    const pursuit = 0.1 + 0.5 * (1 - clamp01(dist / 80));
    // RAMMING: near + slow player. Vetoed at range (0) or at high speed.
    const ram = (1 - clamp01(dist / 15)) * (1 - speed01 * 0.5);
    // ROADBLOCK: fast player at mid range — cut them off, don't chase.
    const block = speed01 * (1 - clamp01(Math.abs(dist - 35) / 30));

    const scores = { PURSUIT: pursuit, RAMMING: ram, ROADBLOCK: block };
    // Hysteresis: +0.08 to the running tactic, positive scores only.
    if (scores[this.tactic] > 0) scores[this.tactic] += 0.08;

    let best = 'PURSUIT';
    let bestScore = -1;
    for (const k of ['PURSUIT', 'RAMMING', 'ROADBLOCK']) {
      if (scores[k] > bestScore) { bestScore = scores[k]; best = k; }
    }
    if (best !== this.tactic) {
      this.tactic = best;
      this.state = best === 'ROADBLOCK' ? 'STANDOFF' : 'PURSUIT';
      this.reason = 'utility_' + best.toLowerCase();
      if (best === 'ROADBLOCK') this.blockSetT = S.time;
    }
    if (this.tactic === 'ROADBLOCK') {
      // Aim 28 m ahead of the player's heading — the interception point.
      const fx = Math.sin(playerHeading);
      const fz = Math.cos(playerHeading);
      this.blockPoint = {
        x: THREE.MathUtils.clamp(playerPos.x + fx * 28, -145, 145),
        z: THREE.MathUtils.clamp(playerPos.z + fz * 28, -145, 145),
      };
    }
    return this._intent(playerPos, playerVel, playerHeading, playerSpeed);
  }

  _intent(playerPos, playerVel, playerHeading) {
    const car = this.car;
    if (this.state === 'SEARCH' && S.lastKnown) {
      // Sweep the last-known position: drive to it, then orbit slowly.
      const lk = S.lastKnown;
      const d = Math.hypot(lk.x - car.pos.x, lk.z - car.pos.z);
      if (d > 10) return { tx: lk.x, tz: lk.z, targetSpeed: 18, steerRate: 1.6 };
      // Orbit the LKP at ~12 m.
      const ang = Math.atan2(car.pos.x - lk.x, car.pos.z - lk.z) + 0.5;
      return {
        tx: lk.x + Math.sin(ang) * 12,
        tz: lk.z + Math.cos(ang) * 12,
        targetSpeed: 12, steerRate: 1.6,
      };
    }
    if (this.tactic === 'ROADBLOCK' && this.blockPoint) {
      const bp = this.blockPoint;
      const d = Math.hypot(bp.x - car.pos.x, bp.z - car.pos.z);
      if (d > 7) return { tx: bp.x, tz: bp.z, targetSpeed: 26, steerRate: 1.6 };
      // Hold the block: stop across the road, facing perpendicular.
      return {
        tx: car.pos.x, tz: car.pos.z, targetSpeed: 0, steerRate: 2.0,
        holdHeading: playerHeading + Math.PI / 2,
      };
    }
    if (this.tactic === 'RAMMING') {
      // Lead the player by 0.4 s of their velocity and hit hard.
      return {
        tx: playerPos.x + playerVel.x * 0.4,
        tz: playerPos.z + playerVel.z * 0.4,
        targetSpeed: 30, steerRate: 2.2,
      };
    }
    // PURSUIT (default): chase the player, ease off when on top of them.
    const dist = Math.hypot(playerPos.x - car.pos.x, playerPos.z - car.pos.z);
    return {
      tx: playerPos.x, tz: playerPos.z,
      targetSpeed: dist > 6 ? 26 : 14, steerRate: 1.6,
    };
  }
}

// ---- PD helicopter -------------------------------------------------------
// One heli, only at 3+ stars. Circles the player at ~32 m radius, 34 m up,
// main rotor spinning, red beacon blinking, searchlight cone pinned on the
// player. Purely presentational pressure — it does not damage the player.

export class Helicopter {
  constructor(scene) {
    this.scene = scene;
    this.angle = Math.random() * Math.PI * 2;
    this.rotorSpin = 0;
    this.blinkT = 0;

    const body = new THREE.Group();
    const navy = new THREE.MeshStandardMaterial({ color: 0x1a2a55, roughness: 0.5, metalness: 0.4 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5, metalness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.06, metalness: 0.9, envMapIntensity: 1.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.8, metalness: 0.2 });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.2), navy);
    hull.position.y = 0;
    body.add(hull);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.3, 4.24), white);
    stripe.position.y = 0.1;
    body.add(stripe);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 1.2), glass);
    nose.position.set(0, 0.1, 2.4);
    body.add(nose);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.6), navy);
    tail.position.set(0, 0.35, -4.0);
    body.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 1.1), navy);
    fin.position.set(0, 1.0, -6.0);
    body.add(fin);
    // Skids.
    for (const sx of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.4), dark);
      skid.position.set(sx * 0.9, -0.95, 0.3);
      body.add(skid);
    }
    // Main rotor: two-blade bar + translucent blur disc.
    this.rotor = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 0.45), dark);
    this.rotor.add(blade);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(4.8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    this.rotor.add(disc);
    this.rotor.position.y = 1.05;
    body.add(this.rotor);
    // Tail rotor.
    this.tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.3), dark);
    this.tailRotor.position.set(0.5, 0.9, -6.1);
    body.add(this.tailRotor);
    // Red beacon.
    this.beaconMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 2 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), this.beaconMat);
    beacon.position.set(0, 1.0, -1.2);
    body.add(beacon);
    // Searchlight cone: apex at the heli, base on the player. Geometry
    // height 1, scaled to the heli->player distance each frame; -Y maps
    // onto the heli->player direction so the apex stays at the heli.
    const coneGeo = new THREE.ConeGeometry(6, 1, 16, 1, true);
    this.coneMat = new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.09,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.cone = new THREE.Mesh(coneGeo, this.coneMat);
    body.add(this.cone);

    this.mesh = body;
    this.pos = body.position; // pos IS mesh.position (contract)
    this.pos.set(0, 34, 0);
    scene.add(body);
  }

  update(dt, playerPos) {
    this.angle += dt * 0.22;
    const R = 32;
    this.pos.set(
      playerPos.x + Math.sin(this.angle) * R,
      34,
      playerPos.z + Math.cos(this.angle) * R,
    );
    // Face along the orbit tangent.
    this.mesh.rotation.y = this.angle + Math.PI / 2;
    this.rotorSpin += dt * 28;
    this.rotor.rotation.y = this.rotorSpin;
    this.tailRotor.rotation.x = this.rotorSpin * 1.7;
    this.blinkT += dt;
    this.beaconMat.emissiveIntensity = (Math.sin(this.blinkT * 7) > 0) ? 2.6 : 0.15;

    // Searchlight: from heli belly to the player.
    const dx = playerPos.x - this.pos.x;
    const dy = 0 - this.pos.y;
    const dz = playerPos.z - this.pos.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    const dir = new THREE.Vector3(dx / dist, dy / dist, dz / dist);
    this.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    this.cone.scale.set(1, dist, 1);
    this.cone.position.set(dx / 2, dy / 2, dz / 2);
  }

  remove() {
    if (this.scene && this.mesh) this.scene.remove(this.mesh);
  }
}
