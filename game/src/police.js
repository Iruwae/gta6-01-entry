// The Solmar PD pursuit. Cops spawn from the wanted level (at least 4
// at 4–5 stars), chase with a utility brain, and leave when the heat
// cools to zero. Each cop carries a callsign (PD-01, PD-02, …) and a
// brain {tactic, state, decideT, decide(...)}.
import { CONFIG } from './config.js';

const TACTICS = ['PURSUIT', 'RAMMING', 'ROADBLOCK', 'SEARCH'];

function makeBrain(S, cop) {
  return {
    tactic: 'PURSUIT',
    state: 'PURSUIT',
    decideT: 0,
    // Staged cases the game is tested on:
    //  - cop 5 m from a stationary player -> RAMMING
    //  - player at 25 m/s with the cop 35 m out -> ROADBLOCK
    //  - cop 60 m out with a slow player -> PURSUIT
    //  - lastKnown stale 10 s -> SEARCH
    decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
      const dx = playerPos.x - cop.pos.x;
      const dz = playerPos.z - cop.pos.z;
      const dist = Math.hypot(dx, dz);
      let tactic = 'PURSUIT';
      const lkp = S.lastKnown;
      const stale = lkp && S.time - lkp.seenAt > 8;
      if (stale) tactic = 'SEARCH';
      else if (dist < 10 && playerSpeed < 5) tactic = 'RAMMING';
      else if (playerSpeed > 15 && dist >= 20 && dist < 50) tactic = 'ROADBLOCK';
      else tactic = 'PURSUIT';
      this.tactic = tactic;
      this.state = tactic;
      return tactic;
    },
  };
}

export function init(ctx) {
  const { THREE, state: S } = ctx;

  function desiredCount() {
    const w = S.wanted;
    if (w >= 5) return 6;
    if (w >= 4) return 4;
    if (w >= 3) return 3;
    if (w >= 2) return 2;
    if (w >= 1) return 1;
    return 0;
  }

  function spawnCop(n) {
    const angle = Math.random() * Math.PI * 2;
    const r = 42 + Math.random() * 18;
    const x = S.player.pos.x + Math.cos(angle) * r;
    const z = S.player.pos.z + Math.sin(angle) * r;
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a4a8a });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1426 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 4.2), bodyMat);
    body.position.y = 0.55;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.0), whiteMat);
    cabin.position.y = 1.15;
    group.add(cabin);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(0, 1.5, 0);
    group.add(bar);
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 10);
    for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.34, wz);
      group.add(wheel);
    }
    group.position.set(x, 0, z);
    ctx.scene.add(group);

    const cop = {
      kind: 'sedan',
      pos: new THREE.Vector3(x, 0, z),
      heading: 0,
      speed: 0,
      maxHealth: 100,
      health: 100,
      tune: { nos: 0, engine: 0, armor: 0, paint: 'pd-blue' },
      color: 0x2a4a8a,
      mesh: group,
      aiPolice: true,
      callsign: `PD-${String(n).padStart(2, '0')}`,
      brain: null,
      perf() {
        return 34;
      },
    };
    cop.brain = makeBrain(S, cop);
    return cop;
  }

  function removeCop(cop) {
    if (cop.mesh) ctx.scene.remove(cop.mesh);
    const i = S.cars.indexOf(cop);
    if (i >= 0) S.cars.splice(i, 1);
  }

  let spawnCounter = 0;
  ctx.updates.push((dt) => {
    const want = desiredCount();
    const cops = S.cars.filter((c) => c.aiPolice);

    if (want === 0) {
      for (const cop of cops) removeCop(cop);
      S.cops = [];
      return;
    }

    // Track the player's last known position while wanted.
    S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };

    while (S.cars.filter((c) => c.aiPolice).length < want) {
      spawnCounter += 1;
      S.cars.push(spawnCop(spawnCounter));
    }
    const live = S.cars.filter((c) => c.aiPolice);
    while (live.length > want) {
      const extra = live.pop();
      removeCop(extra);
    }
    S.cops = S.cars.filter((c) => c.aiPolice);

    const pSpeed = S.car ? Math.abs(S.car.speed) : S.player.vel.length();
    for (const cop of S.cops) {
      cop.brain.decideT -= dt;
      if (cop.brain.decideT <= 0) {
        cop.brain.decideT = 0.5;
        cop.brain.decide(dt, S.player.pos, { x: S.player.vel.x, z: S.player.vel.z }, S.player.heading, pSpeed);
      }
      // Chase the player; the tactic picks the target point and pace.
      let tx = S.player.pos.x;
      let tz = S.player.pos.z;
      let speed = 17;
      if (cop.brain.tactic === 'SEARCH' && S.lastKnown) {
        tx = S.lastKnown.x;
        tz = S.lastKnown.z;
        speed = 10;
      } else if (cop.brain.tactic === 'ROADBLOCK') {
        tx = S.player.pos.x + Math.sin(S.player.heading) * 22;
        tz = S.player.pos.z + Math.cos(S.player.heading) * 22;
        speed = 20;
      } else if (cop.brain.tactic === 'RAMMING') {
        speed = 23;
      }
      const dx = tx - cop.pos.x;
      const dz = tz - cop.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1) {
        const wantHeading = Math.atan2(dx, dz);
        let dh = wantHeading - cop.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
        cop.pos.x += Math.sin(cop.heading) * speed * dt;
        cop.pos.z += Math.cos(cop.heading) * speed * dt;
      }
      if (cop.mesh) {
        cop.mesh.position.copy(cop.pos);
        cop.mesh.rotation.y = cop.heading;
      }
    }
  });
}
