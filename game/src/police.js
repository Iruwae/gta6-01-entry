// SOLMAR BAY — Solmar PD pursuit. Cops spawn from the wanted level and
// chase with a utility brain: RAMMING / ROADBLOCK / PURSUIT / SEARCH.
import * as THREE from '../vendor/three.module.min.js';

const TACTICS = ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'SEARCH'];

function makeCopMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.85, 4.6),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.4 }),
  );
  body.position.y = 0.6;
  g.add(body);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.92, 0.3, 4.62),
    new THREE.MeshStandardMaterial({ color: 0x2244cc, roughness: 0.4 }),
  );
  stripe.position.y = 0.75;
  g.add(stripe);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.55, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.2, metalness: 0.5 }),
  );
  cabin.position.y = 1.25;
  g.add(cabin);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.22, 0.4),
    new THREE.MeshBasicMaterial({ color: 0xff2244 }),
  );
  bar.position.set(0, 1.6, 0.2);
  g.add(bar);
  return g;
}

export function init(ctx) {
  const { scene, state: S } = ctx;
  let callsignN = 0;
  let decideClock = 0;

  function makeBrain(car) {
    return {
      tactic: 'PURSUIT',
      state: 'PURSUIT',
      decideT: 0,
      decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
        const dx = playerPos.x - car.pos.x;
        const dz = playerPos.z - car.pos.z;
        const dist = Math.hypot(dx, dz);
        const stale = S.lastKnown && (S.time - S.lastKnown.seenAt) > 5;
        let tactic;
        if (stale) tactic = 'SEARCH';
        else if (dist < 10 && playerSpeed < 5) tactic = 'RAMMING';
        else if (playerSpeed >= 20 && dist >= 20 && dist <= 50) tactic = 'ROADBLOCK';
        else tactic = 'PURSUIT';
        this.tactic = tactic;
        this.state = tactic;
        return tactic;
      },
    };
  }

  function spawnCop() {
    callsignN += 1;
    const a = Math.random() * Math.PI * 2;
    const d = 32 + Math.random() * 14;
    const x = S.player.pos.x + Math.cos(a) * d;
    const z = S.player.pos.z + Math.sin(a) * d;
    const car = {
      kind: 'sedan',
      pos: new THREE.Vector3(x, 0, z),
      heading: 0,
      speed: 0,
      maxHealth: 100,
      health: 100,
      tune: { nos: 0, engine: 0, armor: 0, paint: 'pd' },
      mesh: makeCopMesh(),
      aiPolice: true,
      callsign: `PD-${String(callsignN).padStart(2, '0')}`,
      brain: null,
      perf() { return 34; },
    };
    car.brain = makeBrain(car);
    car.mesh.position.set(x, 0, z);
    scene.add(car.mesh);
    S.cars.push(car);
    return car;
  }

  function policeCars() {
    return S.cars.filter((c) => c.aiPolice);
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    const wanted = S.wanted;
    if (wanted > 0) {
      S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
      const desired = Math.min(6, wanted + 1);
      const cops = policeCars();
      for (let i = cops.length; i < desired; i++) spawnCop();
    } else if (policeCars().length > 0) {
      for (const c of policeCars()) {
        scene.remove(c.mesh);
        const i = S.cars.indexOf(c);
        if (i >= 0) S.cars.splice(i, 1);
      }
    }
    const cops = policeCars();
    S.cops = cops;
    decideClock += dt;
    const doDecide = decideClock >= 0.5;
    if (doDecide) decideClock = 0;
    const pp = S.player.pos;
    const pv = S.player.vel;
    const pSpeed = Math.hypot(pv.x, pv.z);
    for (const cop of cops) {
      if (doDecide) {
        cop.brain.decideT = 0;
        cop.brain.decide(0.5, pp, { x: pv.x, z: pv.z }, S.player.heading, pSpeed);
      }
      let tx;
      let tz;
      let speed = 20;
      if (cop.brain.tactic === 'ROADBLOCK') {
        const len = Math.max(0.001, pSpeed);
        tx = pp.x + (pv.x / len) * 25;
        tz = pp.z + (pv.z / len) * 25;
        speed = 24;
      } else if (cop.brain.tactic === 'SEARCH' && S.lastKnown) {
        tx = S.lastKnown.x;
        tz = S.lastKnown.z;
        speed = 14;
      } else {
        tx = pp.x;
        tz = pp.z;
        speed = cop.brain.tactic === 'RAMMING' ? 27 : 21;
      }
      const dx = tx - cop.pos.x;
      const dz = tz - cop.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 1.2) {
        const step = Math.min(d, speed * dt);
        cop.heading = Math.atan2(dx, dz);
        cop.pos.x += (dx / d) * step;
        cop.pos.z += (dz / d) * step;
        cop.speed = speed;
      } else {
        cop.speed = 0;
      }
      if (cop.mesh) {
        cop.mesh.position.set(cop.pos.x, 0, cop.pos.z);
        cop.mesh.rotation.y = cop.heading;
      }
    }
  });
  ctx.policeReady = true;
}
