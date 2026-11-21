// SOLMAR BAY — Solmar PD pursuit: utility-brain cops with callsigns.
import * as THREE from '../vendor/three.module.min.js';
import { createCarMesh } from './vehicles.js';

const TACTICS = ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'SEARCH'];

function makeBrain(S, car) {
  return {
    tactic: 'PURSUIT',
    state: 'PURSUIT',
    decideT: 0,
    decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
      this.decideT += dt;
      const dx = playerPos.x - car.pos.x;
      const dz = playerPos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const stale = S.lastKnown ? S.time - S.lastKnown.seenAt : 999;
      let next = 'PURSUIT';
      if (stale > 5) {
        next = 'SEARCH';
      } else if (dist < 8 && playerSpeed < 5) {
        next = 'RAMMING';
      } else if (playerSpeed > 15 && dist > 20 && dist < 50) {
        next = 'ROADBLOCK';
      } else {
        next = 'PURSUIT';
      }
      this.tactic = next;
      this.state = next;
      return next;
    },
  };
}

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;
  let nextId = 1;

  function spawnCop() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 12;
    const x = S.player.pos.x + Math.cos(angle) * dist;
    const z = S.player.pos.z + Math.sin(angle) * dist;
    const mesh = createCarMesh(T, 'sedan', 0x1a2a4a);
    // Light bar on the roof.
    const barMat = new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 1.2 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), barMat);
    bar.position.set(0, 1.65, -0.2);
    mesh.add(bar);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const car = {
      kind: 'sedan',
      aiPolice: true,
      callsign: 'PD-' + String(nextId).padStart(2, '0'),
      pos: new THREE.Vector3(x, 0, z),
      heading: 0,
      speed: 0,
      maxHealth: 100,
      health: 100,
      tune: { nos: false, engine: 0, armor: 0, paint: 0 },
      mesh,
      perf() {
        return 40;
      },
    };
    nextId += 1;
    car.brain = makeBrain(S, car);
    S.cars.push(car);
    S.cops.push(car);
    return car;
  }

  function removeCop(car) {
    const i = S.cars.indexOf(car);
    if (i >= 0) S.cars.splice(i, 1);
    const j = S.cops.indexOf(car);
    if (j >= 0) S.cops.splice(j, 1);
    if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
  }

  ctx.updates.push((dt) => {
    const wanted = S.wanted;
    if (wanted <= 0) {
      // Heat cooled to zero: every cop leaves at once.
      for (const cop of [...S.cops]) removeCop(cop);
      S.lastKnown = null;
      return;
    }
    // Track the player's last known position while wanted.
    S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
    const target = wanted >= 4 ? 6 : wanted >= 3 ? 4 : wanted >= 2 ? 3 : 2;
    while (S.cops.length < target) spawnCop();
    while (S.cops.length > target) removeCop(S.cops[S.cops.length - 1]);

    const pp = S.player.pos;
    const pv = S.player.vel || { x: 0, z: 0 };
    const playerSpeed = S.car ? Math.abs(S.car.speed) : Math.hypot(pv.x, pv.z);
    for (const cop of S.cops) {
      cop.brain.decide(dt, pp, pv, S.player.heading, playerSpeed);
      let tx = pp.x;
      let tz = pp.z;
      let speed = 22;
      if (cop.brain.tactic === 'ROADBLOCK') {
        // Get ahead of the player's path.
        tx = pp.x + (pv.x || 0) * 1.2 + Math.sin(S.player.heading) * playerSpeed * 1.2;
        tz = pp.z + (pv.z || 0) * 1.2 + Math.cos(S.player.heading) * playerSpeed * 1.2;
        speed = 26;
      } else if (cop.brain.tactic === 'RAMMING') {
        speed = 27;
      } else if (cop.brain.tactic === 'SEARCH') {
        if (S.lastKnown) {
          tx = S.lastKnown.x;
          tz = S.lastKnown.z;
        }
        speed = 10;
      }
      const dx = tx - cop.pos.x;
      const dz = tz - cop.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 1) {
        const wantHeading = Math.atan2(dx, dz);
        let diff = wantHeading - cop.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        cop.speed += (speed - cop.speed) * Math.min(1, 2 * dt);
        cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
        cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
        cop.mesh.position.copy(cop.pos);
        cop.mesh.rotation.y = cop.heading;
      }
    }
  });

  return { spawnCop, TACTICS };
}

export default init;
