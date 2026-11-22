// Solmar PD pursuit: cops spawn from the wanted level and chase with a
// utility brain — RAMMING / ROADBLOCK / PURSUIT / SEARCH.
import * as THREE from '../vendor/three.module.min.js';

function targetCount(wanted) {
  if (wanted >= 4) return 5;
  if (wanted === 3) return 4;
  if (wanted === 2) return 3;
  if (wanted === 1) return 2;
  return 0;
}

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  let nextNum = 1;
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5, metalness: 0.3 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x2244cc, roughness: 0.5, emissive: 0x2244cc, emissiveIntensity: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 });

  function makeCop() {
    const n = nextNum++;
    const cop = {
      kind: 'sedan',
      aiPolice: true,
      callsign: `PD-${String(n).padStart(2, '0')}`,
      pos: new THREE.Vector3(0, 0, 0),
      heading: 0,
      speed: 0,
      maxHealth: 100,
      health: 100,
      tune: { nos: 0, engine: 0, armor: 0, paint: 'police' },
      mesh: null,
      brain: null,
      perf() {
        return 32;
      },
    };
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), whiteMat);
    body.position.y = 0.55;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), darkMat);
    cabin.position.set(0, 1.15, -0.2);
    group.add(cabin);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), blueMat);
    bar.position.set(0, 1.55, -0.2);
    group.add(bar);
    cop.mesh = group;
    const brain = {
      tactic: 'PURSUIT',
      state: 'PURSUIT',
      decideT: 0,
      decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
        const dx = playerPos.x - cop.pos.x;
        const dz = playerPos.z - cop.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const stale = S.lastKnown ? S.time - S.lastKnown.seenAt : 999;
        let tactic;
        if (stale > 5) tactic = 'SEARCH';
        else if (dist < 12 && playerSpeed < 5) tactic = 'RAMMING';
        else if (playerSpeed > 15 && dist >= 20 && dist <= 60) tactic = 'ROADBLOCK';
        else tactic = 'PURSUIT';
        brain.tactic = tactic;
        brain.state = tactic;
      },
    };
    cop.brain = brain;
    return cop;
  }

  function removeCop(cop) {
    if (cop.mesh) scene.remove(cop.mesh);
    const i = S.cars.indexOf(cop);
    if (i >= 0) S.cars.splice(i, 1);
  }

  ctx.updates.push((dt) => {
    const wanted = S.wanted;
    if (wanted === 0) {
      const cops = S.cars.filter((c) => c.aiPolice);
      if (cops.length > 0) {
        for (const cop of cops) removeCop(cop);
        S.cops = [];
      }
      return;
    }
    // The player is seen while wanted.
    S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
    const want = targetCount(wanted);
    let cops = S.cars.filter((c) => c.aiPolice);
    while (cops.length < want) {
      const cop = makeCop();
      const a = Math.random() * Math.PI * 2;
      const d = 40 + Math.random() * 30;
      cop.pos.set(S.player.pos.x + Math.cos(a) * d, 0, S.player.pos.z + Math.sin(a) * d);
      cop.mesh.position.copy(cop.pos);
      S.cars.push(cop);
      scene.add(cop.mesh);
      cops.push(cop);
    }
    S.cops = cops;
    const playerSpeed = S.car ? Math.abs(S.car.speed) : Math.hypot(S.player.vel.x, S.player.vel.z);
    for (const cop of cops) {
      cop.brain.decideT += dt;
      if (cop.brain.decideT > 0.5) {
        cop.brain.decideT = 0;
        cop.brain.decide(0.5, S.player.pos, S.player.vel, S.player.heading, playerSpeed);
      }
      // Steer toward the tactic target.
      let tx = S.player.pos.x;
      let tz = S.player.pos.z;
      if (cop.brain.tactic === 'SEARCH' && S.lastKnown) {
        tx = S.lastKnown.x;
        tz = S.lastKnown.z;
      } else if (cop.brain.tactic === 'ROADBLOCK') {
        const sp = Math.max(1, playerSpeed);
        tx = S.player.pos.x + (S.player.vel.x / sp) * 12;
        tz = S.player.pos.z + (S.player.vel.z / sp) * 12;
      }
      const dx = tx - cop.pos.x;
      const dz = tz - cop.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - cop.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      cop.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
      const speedByTactic = { RAMMING: 20, ROADBLOCK: 16, PURSUIT: 15, SEARCH: 10 }[cop.brain.tactic] || 14;
      cop.speed = dist > 3 ? speedByTactic : 0;
      cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
      cop.mesh.position.copy(cop.pos);
      cop.mesh.rotation.y = cop.heading;
    }
  });
}

export default init;
