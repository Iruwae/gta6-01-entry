// SOLMAR BAY — the Solmar PD pursuit. Cops spawn from S.wanted (at least
// 4 at 4–5 stars), chase with a utility brain, and leave when heat cools
// to zero. S.cars entries for police carry aiPolice, callsign and brain.
import * as THREE from '../vendor/three.module.min.js';
import { rand, randInt } from './random.js';

const TACTICS = ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'SEARCH'];

function makeCopMesh() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2f4a, roughness: 0.35, metalness: 0.5 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.4, metalness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.15, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 4.4), bodyMat);
  body.position.y = 0.55;
  group.add(body);
  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.35, 2.0), whiteMat);
  doors.position.y = 0.62;
  group.add(doors);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.0), glassMat);
  cabin.position.set(0, 1.05, -0.2);
  group.add(cabin);
  // Light bar: red + blue beacons that flash.
  const redMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: new THREE.Color(0xff2222), emissiveIntensity: 1 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x000033, emissive: new THREE.Color(0x2244ff), emissiveIntensity: 1 });
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), redMat);
  red.position.set(-0.45, 1.4, -0.2);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), blueMat);
  blue.position.set(0.45, 1.4, -0.2);
  group.add(red);
  group.add(blue);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x141018, roughness: 0.9 });
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.position.set(x, 0.36, z);
    group.add(w);
  }
  return { group, redMat, blueMat };
}

function desiredCops(wanted) {
  if (wanted <= 0) return 0;
  if (wanted >= 4) return 6;
  if (wanted >= 3) return 4;
  if (wanted >= 2) return 3;
  return 2;
}

export function init(ctx) {
  const { scene, state: S } = ctx;
  let copCounter = 0;
  let flashT = 0;

  function spawnCop() {
    copCounter += 1;
    const n = copCounter;
    const angle = rand(0, Math.PI * 2);
    const dist = rand(35, 55);
    const x = S.player.pos.x + Math.cos(angle) * dist;
    const z = S.player.pos.z + Math.sin(angle) * dist;
    const { group, redMat, blueMat } = makeCopMesh();
    group.position.set(x, 0, z);
    scene.add(group);
    const car = {
      kind: 'sedan',
      pos: new THREE.Vector3(x, 0, z),
      heading: 0,
      speed: 0,
      maxHealth: 100,
      health: 100,
      tune: { nos: false, engine: 0, armor: 0, paint: '#1c2f4a' },
      color: '#1c2f4a',
      mesh: group,
      aiPolice: true,
      callsign: `PD-${String(n).padStart(2, '0')}`,
      brain: null,
      _redMat: redMat,
      _blueMat: blueMat,
      perf() { return 32; },
    };
    const brain = {
      tactic: 'PURSUIT',
      state: 'PURSUIT',
      decideT: 0,
      decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
        const dx = playerPos.x - car.pos.x;
        const dz = playerPos.z - car.pos.z;
        const d = Math.hypot(dx, dz);
        const stale = S.lastKnown ? (S.time - S.lastKnown.seenAt) : 999;
        let t;
        if (stale > 8) t = 'SEARCH';
        else if (d < 8 && playerSpeed < 2) t = 'RAMMING';
        else if (playerSpeed > 15 && d > 20 && d < 50) t = 'ROADBLOCK';
        else t = 'PURSUIT';
        this.tactic = t;
        this.state = t;
      },
    };
    car.brain = brain;
    S.cars.push(car);
    S.cops.push(car);
    return car;
  }

  function removeCop(car) {
    scene.remove(car.mesh);
    S.cars = S.cars.filter((c) => c !== car);
    S.cops = S.cops.filter((c) => c !== car);
  }

  ctx.updates.push((dt) => {
    const wanted = S.wanted;
    if (wanted > 0) {
      S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
    } else {
      S.lastKnown = null;
    }
    const want = desiredCops(wanted);
    const police = S.cars.filter((c) => c.aiPolice);
    while (police.length < want) {
      const c = spawnCop();
      police.push(c);
    }
    while (police.length > want) {
      removeCop(police.pop());
    }
    S.cops = S.cars.filter((c) => c.aiPolice);

    flashT += dt;
    const flashOn = Math.floor(flashT * 4) % 2 === 0;
    const pp = S.player.pos;
    const pv = S.player.vel;
    const pSpeed = Math.hypot(pv.x, pv.z);
    for (const cop of S.cops) {
      cop._redMat.emissiveIntensity = flashOn ? 2.2 : 0.2;
      cop._blueMat.emissiveIntensity = flashOn ? 0.2 : 2.2;
      cop.brain.decideT -= dt;
      if (cop.brain.decideT <= 0) {
        cop.brain.decide(0.2, pp, pv, S.player.heading, pSpeed);
        cop.brain.decideT = 0.5;
      }
      let tx = pp.x;
      let tz = pp.z;
      let speed = 16;
      if (cop.brain.tactic === 'ROADBLOCK') {
        const vl = Math.hypot(pv.x, pv.z) || 1;
        tx = pp.x + (pv.x / vl) * 16;
        tz = pp.z + (pv.z / vl) * 16;
        speed = 14;
      } else if (cop.brain.tactic === 'RAMMING') {
        speed = 21;
      } else if (cop.brain.tactic === 'SEARCH') {
        if (S.lastKnown) { tx = S.lastKnown.x; tz = S.lastKnown.z; }
        speed = 10;
      }
      const dx = tx - cop.pos.x;
      const dz = tz - cop.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.5) {
        const step = Math.min(d, speed * dt);
        cop.pos.x += (dx / d) * step;
        cop.pos.z += (dz / d) * step;
        cop.heading = Math.atan2(dx, dz);
      }
      cop.mesh.position.copy(cop.pos);
      cop.mesh.rotation.y = cop.heading;
    }
  });
}
