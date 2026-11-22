// The Solmar PD pursuit. Cops spawn from S.wanted (at least 4 at 4–5
// stars), chase with a utility brain, and leave when heat cools to zero.
import { createCar } from './vehicles.js';

function makeBrain(S, cop) {
  return {
    tactic: 'PURSUIT',
    state: 'PURSUIT',
    decideT: 0,
    decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
      const dx = cop.pos.x - playerPos.x;
      const dz = cop.pos.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      const stale = S.lastKnown ? (S.time - S.lastKnown.seenAt) : 999;
      let tactic;
      if (stale > 8) tactic = 'SEARCH';
      else if (dist < 10 && playerSpeed < 5) tactic = 'RAMMING';
      else if (playerSpeed > 15 && dist >= 20 && dist <= 50) tactic = 'ROADBLOCK';
      else tactic = 'PURSUIT';
      this.tactic = tactic;
      this.state = tactic;
      this.decideT = 0.5;
    },
  };
}

export function init(ctx) {
  const { state: S, scene } = ctx;
  let spawnN = 0;
  let decideT = 0;

  ctx.updates.push((dt) => {
    if (S.wanted > 0) {
      S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
      const target = S.wanted >= 4 ? 4 : S.wanted;
      let spawned = 0;
      while (S.cops.length < target && spawned < 2) {
        spawnN += 1;
        const a = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * 20;
        const cop = createCar(ctx, 'police',
          S.player.pos.x + Math.cos(a) * r, S.player.pos.z + Math.sin(a) * r);
        cop.aiPolice = true;
        cop.callsign = 'PD-' + String(spawnN).padStart(2, '0');
        cop.brain = makeBrain(S, cop);
        S.cars.push(cop);
        spawned += 1;
      }
      S.cops = S.cars.filter((c) => c.aiPolice);
      decideT -= dt;
      if (decideT <= 0) {
        decideT = 0.5;
        for (const c of S.cops) {
          c.brain.decide(0.5, S.player.pos, { x: 0, z: 0 }, S.player.heading, Math.abs(S.player.speed));
        }
      }
      for (const c of S.cops) {
        let tx = S.player.pos.x;
        let tz = S.player.pos.z;
        let sp = 16;
        if (c.brain.tactic === 'ROADBLOCK') {
          tx = S.player.pos.x + Math.sin(S.player.heading) * 20;
          tz = S.player.pos.z + Math.cos(S.player.heading) * 20;
          sp = 20;
        } else if (c.brain.tactic === 'SEARCH' && S.lastKnown) {
          tx = S.lastKnown.x;
          tz = S.lastKnown.z;
          sp = 10;
        } else if (c.brain.tactic === 'RAMMING') {
          sp = 24;
        }
        const dx = tx - c.pos.x;
        const dz = tz - c.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 1) {
          c.heading = Math.atan2(dx, dz);
          const step = Math.min(d, sp * dt);
          c.pos.x += (dx / d) * step;
          c.pos.z += (dz / d) * step;
          c.speed = sp;
        }
      }
    } else if (S.cops.length) {
      for (const c of S.cops) {
        if (c.mesh) scene.remove(c.mesh);
      }
      S.cars = S.cars.filter((c) => !c.aiPolice);
      S.cops = [];
      S.lastKnown = null;
    }
  });
}
