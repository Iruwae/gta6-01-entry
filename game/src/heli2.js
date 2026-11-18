// SOLMAR BAY — heli2.js
// SkyWatch: the SKY-7 news chopper. The PD helicopter circles high (34 m,
// 32 m out) and never enters the chase-camera frame, so at 2+ stars a
// second, lower chopper joins: it orbits tight (18 m radius, 17 m up),
// close enough to read on screen, with a camera pod, rotor wash kicking
// dust off the street below it, and a ground spotlight pool that pins the
// player. It also publishes an `overhead` factor (0..1) so the main loop
// can tilt the chase camera up toward it when it passes directly above.
//
// Purely presentational pressure — it never damages the player, never
// rams, never blocks. It is the city's eye, not its fist.

import * as THREE from 'three';
import { S } from './state.js';

const SKY7_RED = 0xd81e2a;
const SKY7_WHITE = 0xf5f2ea;
const SKY7_GLASS = 0x1d2f45;

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export class SkyWatch {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = 0;
    this.washT = 0;
    this.overhead = 0; // 0..1: how directly above the player the chopper sits
    this._poolT = 0;

    const body = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: SKY7_RED, roughness: 0.45, metalness: 0.35 });
    const white = new THREE.MeshStandardMaterial({ color: SKY7_WHITE, roughness: 0.5, metalness: 0.25 });
    const glass = new THREE.MeshStandardMaterial({ color: SKY7_GLASS, roughness: 0.08, metalness: 0.85, envMapIntensity: 1.4 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.8, metalness: 0.2 });

    // Fuselage: white belly, red roof band — a news bird, not a PD bird.
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 3.6), white);
    hull.position.y = 0;
    body.add(hull);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.45, 3.0), red);
    roof.position.y = 0.72;
    body.add(roof);
    // Bubble canopy: the camera sees through it, the player sees the pilot.
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), glass);
    canopy.scale.set(1.0, 0.85, 1.25);
    canopy.position.set(0, 0.25, 1.55);
    body.add(canopy);
    // Camera pod: a gimbal ball slung under the nose with a long lens.
    const pod = new THREE.Group();
    const podBall = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), dark);
    pod.add(podBall);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10), dark);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 0.5;
    pod.add(lens);
    const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12),
      new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.05, metalness: 1.0, emissive: 0x0a2438, emissiveIntensity: 0.8 }));
    lensGlass.position.z = 0.86;
    pod.add(lensGlass);
    pod.position.set(0, -0.85, 1.3);
    body.add(pod);
    this.pod = pod;
    // Tail boom + tail fin + tail rotor.
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 3.8), white);
    boom.position.set(0, 0.3, -3.4);
    body.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.9), red);
    fin.position.set(0, 0.9, -5.0);
    body.add(fin);
    this.tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.4, 0.26), dark);
    this.tailRotor.position.set(0.36, 0.8, -5.1);
    body.add(this.tailRotor);
    // Skids.
    for (const sx of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.0), dark);
      skid.position.set(sx * 0.8, -0.85, 0.2);
      body.add(skid);
    }
    // Main rotor: four-blade cross + blur disc, faster and wider than the PD bird.
    this.rotor = new THREE.Group();
    for (const a of [0, Math.PI / 2]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.07, 0.4), dark);
      blade.rotation.y = a;
      this.rotor.add(blade);
    }
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(4.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    this.rotor.add(disc);
    this.rotor.position.y = 1.15;
    body.add(this.rotor);
    // Anti-collision strobe (white, double-blink).
    this.strobeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3 });
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), this.strobeMat);
    strobe.position.set(0, 1.05, -1.0);
    body.add(strobe);

    // Ground spotlight pool: a warm ellipse on the street that tracks the
    // player while the chopper is up. Additive, so it reads as light.
    const poolGeo = new THREE.CircleGeometry(5.5, 24);
    this.poolMat = new THREE.MeshBasicMaterial({
      color: 0xffe9a0, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.pool = new THREE.Mesh(poolGeo, this.poolMat);
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.position.y = 0.06;
    scene.add(this.pool);

    this.mesh = body;
    this.pos = body.position;
    this.pos.set(0, 17, 0);
    body.visible = false;
    scene.add(body);
  }

  // How hard the camera should tilt up toward the chopper this frame.
  // 1 when the chopper is almost directly above the player, 0 when it is
  // far out on its orbit or parked. The main loop blends this into pitch.
  tiltBoost() {
    return this.active ? this.overhead : 0;
  }

  update(dt, playerPos, wanted) {
    const shouldFly = wanted >= 2;
    if (shouldFly && !this.active) {
      this.active = true;
      this.mesh.visible = true;
      if (S && S.audio && typeof S.audio.rotor === 'function') S.audio.rotor(true);
    } else if (!shouldFly && this.active) {
      this.active = false;
      this.mesh.visible = false;
      this.poolMat.opacity = 0;
      if (S && S.audio && typeof S.audio.rotor === 'function') S.audio.rotor(false);
    }
    if (!this.active) {
      this.overhead = 0;
      return;
    }

    // Tight, low orbit: 18 m radius, 17 m up — inside the camera frame.
    this.angle += dt * 0.3;
    const R = 18;
    this.pos.set(
      playerPos.x + Math.sin(this.angle) * R,
      17 + Math.sin(this.angle * 2) * 1.2,
      playerPos.z + Math.cos(this.angle) * R,
    );
    this.mesh.rotation.y = this.angle + Math.PI / 2;
    this.spin += dt * 34;
    this.rotor.rotation.y = this.spin;
    this.tailRotor.rotation.x = this.spin * 1.9;
    // Double-blink strobe: two flashes per cycle.
    const ph = (this._poolT += dt) % 1.1;
    this.strobeMat.emissiveIntensity = (ph < 0.08 || (ph > 0.18 && ph < 0.26)) ? 4 : 0.1;

    // Overhead factor: 1 when the horizontal gap to the player is under
    // 6 m, fading to 0 by 26 m. The chopper passes overhead twice an orbit.
    const gap = Math.hypot(this.pos.x - playerPos.x, this.pos.z - playerPos.z);
    const target = 1 - clamp01((gap - 6) / 20);
    this.overhead += (target - this.overhead) * Math.min(1, dt * 3);

    // Camera pod tracks the player (it is a news camera, after all).
    // Aim in the body's local frame: rotate the world delta by the
    // body's yaw, then yaw/pitch the pod — no lookAt, no double rotation.
    if (this.pod) {
      const dxw = playerPos.x - this.pos.x;
      const dzw = playerPos.z - this.pos.z;
      const yaw = this.mesh.rotation.y;
      const cos = Math.cos(-yaw);
      const sin = Math.sin(-yaw);
      const lx = dxw * cos - dzw * sin;
      const lz = dxw * sin + dzw * cos;
      this.pod.rotation.y = Math.atan2(lx, lz);
      const horiz = Math.hypot(dxw, dzw);
      this.pod.rotation.x = Math.max(0.15, Math.min(1.1, Math.atan2(this.pos.y - 0.85, Math.max(1, horiz))));
    }

    // Spotlight pool follows the player and breathes with the orbit.
    this.pool.position.set(playerPos.x, 0.06, playerPos.z);
    this.poolMat.opacity = 0.10 + 0.06 * Math.sin(this._poolT * 2.2);
    const poolScale = 1 + 0.15 * Math.sin(this._poolT * 1.7);
    this.pool.scale.set(poolScale, poolScale, 1);

    // Rotor wash: dust kicked off the street directly below the chopper.
    this.washT -= dt;
    if (this.washT <= 0) {
      this.washT = 0.4;
      if (S && S.fx && typeof S.fx.rotorWash === 'function') {
        S.fx.rotorWash({ x: this.pos.x, y: 0.4, z: this.pos.z });
      } else if (S && S.fx && typeof S.fx.smoke === 'function') {
        S.fx.smoke({ x: this.pos.x, y: 0.4, z: this.pos.z });
      }
    }
  }

  // Hide the chopper without destroying it: update() re-activates it
  // when the wanted level climbs again. (Unlike the PD heli, SkyWatch
  // is created once and reused — remove() is only for teardown.)
  reset() {
    this.active = false;
    this.overhead = 0;
    this.mesh.visible = false;
    this.poolMat.opacity = 0;
    if (S && S.audio && typeof S.audio.rotor === 'function') S.audio.rotor(false);
  }

  remove() {
    if (this.scene) {
      if (this.mesh) this.scene.remove(this.mesh);
      if (this.pool) this.scene.remove(this.pool);
    }
    this.active = false;
    if (S && S.audio && typeof S.audio.rotor === 'function') S.audio.rotor(false);
  }
}
