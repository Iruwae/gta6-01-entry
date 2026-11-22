// SOLMAR BAY — the Solmar PD pursuit. Cops spawn from the wanted level
// (at least 4 at 4-5 stars), chase with a utility brain, and leave when
// the heat cools to zero. Brain cases: near + slow -> RAMMING, fast
// player at mid-range -> ROADBLOCK, far + slow -> PURSUIT, stale
// last-known position -> SEARCH.
import * as THREE from '../vendor/three.module.min.js';
import { clamp, rand } from './random.js';

let callsignCounter = 0;

export function init(ctx) {
  const S = ctx.state;
  const { scene } = ctx;

  function spawnCop() {
    callsignCounter += 1;
    const n = callsignCounter;
    const a = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 15;
    const x = clamp(S.player.pos.x + Math.cos(a) * dist, -240, 240);
    const z = clamp(S.player.pos.z + Math.sin(a) * dist, -240, 240);
    const car = {
      kind: 'sedan',
      pos: new THREE.Vector3(x, 0, z),
      heading: 0,
      speed: 0,
      maxHealth: 100,
      health: 100,
      tune: { nos: 0, engine: 0, armor: 0, paint: 'default' },
      color: 0x2a4a7a,
      aiPolice: true,
      traffic: false,
      callsign: `PD-${String(n).padStart(2, '0')}`,
      brain: null,
      mesh: null,
      perf() {
        return 34;
      },
    };
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.7, 4.2),
      new THREE.MeshLambertMaterial({ color: 0xe8e8f2 })
    );
    body.position.y = 0.6;
    group.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x1a2433 })
    );
    cabin.position.set(0, 1.2, -0.2);
    group.add(cabin);
    const barR = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.25, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a })
    );
    barR.position.set(-0.45, 1.6, -0.2);
    group.add(barR);
    const barB = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.25, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x2a6aff })
    );
    barB.position.set(0.45, 1.6, -0.2);
    group.add(barB);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const [wx, wz] of [[-1.0, -1.4], [1.0, -1.4], [-1.0, 1.4], [1.0, 1.4]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.38, wz);
      group.add(wheel);
    }
    group.position.copy(car.pos);
    scene.add(group);
    car.mesh = group;

    car.brain = {
      tactic: 'PURSUIT',
      state: 'PURSUIT',
      decideT: 0,
      decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
        const dx = playerPos.x - car.pos.x;
        const dz = playerPos.z - car.pos.z;
        const dist = Math.hypot(dx, dz);
        const stale = S.lastKnown ? S.time - S.lastKnown.seenAt : 0;
        let tactic = 'PURSUIT';
        if (stale > 8) tactic = 'SEARCH';
        else if (dist < 10) tactic = 'RAMMING';
        else if (playerSpeed > 15 && dist < 50) tactic = 'ROADBLOCK';
        else tactic = 'PURSUIT';
        this.tactic = tactic;
        this.state = tactic;
        return tactic;
      },
    };
    S.cars.push(car);
    return car;
  }

  function removeCop(car) {
    const i = S.cars.indexOf(car);
    if (i >= 0) S.cars.splice(i, 1);
    if (car.mesh) scene.remove(car.mesh);
  }

  function targetCount() {
    if (S.wanted <= 0) return 0;
    if (S.wanted >= 4) return 5;
    if (S.wanted >= 3) return 4;
    if (S.wanted >= 2) return 3;
    return 2;
  }

  ctx.updates.push((dt) => {
    const police = S.cars.filter((c) => c.aiPolice);
    if (S.wanted === 0) {
      for (const cop of police) removeCop(cop);
      S.cops = [];
      return;
    }
    S.cops = S.cars.filter((c) => c.aiPolice);
    const want = targetCount();
    while (S.cops.length < want) {
      spawnCop();
      S.cops = S.cars.filter((c) => c.aiPolice);
    }
    // The player was just seen here.
    S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
    const playerSpeed = Math.hypot(S.player.vel.x, S.player.vel.z);
    for (const cop of S.cops) {
      cop.brain.decideT -= dt;
      if (cop.brain.decideT <= 0) {
        cop.brain.decide(dt, S.player.pos, S.player.vel, S.player.heading, playerSpeed);
        cop.brain.decideT = 1.5;
      }
      let tx = S.player.pos.x;
      let tz = S.player.pos.z;
      let speed = 20;
      if (cop.brain.tactic === 'ROADBLOCK') {
        const fx = Math.sin(S.player.heading);
        const fz = Math.cos(S.player.heading);
        tx = S.player.pos.x + fx * 22;
        tz = S.player.pos.z + fz * 22;
        speed = 22;
      } else if (cop.brain.tactic === 'SEARCH' && S.lastKnown) {
        tx = S.lastKnown.x;
        tz = S.lastKnown.z;
        speed = 12;
      } else if (cop.brain.tactic === 'RAMMING') {
        speed = 24;
      }
      const dx = tx - cop.pos.x;
      const dz = tz - cop.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2) {
        const wantHeading = Math.atan2(dx, dz);
        let dh = wantHeading - cop.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        cop.heading += clamp(dh, -2.2 * dt, 2.2 * dt);
        cop.pos.x += Math.sin(cop.heading) * speed * dt;
        cop.pos.z += Math.cos(cop.heading) * speed * dt;
      }
      if (cop.mesh) {
        cop.mesh.position.copy(cop.pos);
        cop.mesh.rotation.y = cop.heading;
      }
    }
  });

  ctx.flags.police = true;
}
