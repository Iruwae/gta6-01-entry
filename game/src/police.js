// SOLMAR BAY — the Solmar PD pursuit. Cops spawn from the wanted level
// (at least 4 at 4-5 stars), chase with a utility brain, and leave when
// the heat cools to zero. Callsigns PD-01, PD-02, …; they show in S.cops
// and on the roster. The brain's decide() picks RAMMING / ROADBLOCK /
// PURSUIT / SEARCH from the staged facts:
//   close + slow player -> RAMMING; fast player + mid-range -> ROADBLOCK;
//   far + slow -> PURSUIT; last-known position stale -> SEARCH.
export function init(ctx) {
  const { THREE, scene, state: S } = ctx;

  function makeBrain(car) {
    return {
      tactic: 'PURSUIT',
      state: 'PURSUIT',
      decideT: 0,
      decide(dt, playerPos, playerVel, playerHeading, playerSpeed) {
        const dx = playerPos.x - car.pos.x;
        const dz = playerPos.z - car.pos.z;
        const dist = Math.hypot(dx, dz);
        const stale = S.lastKnown ? (S.time - S.lastKnown.seenAt) : 99;
        let tactic;
        if (stale > 8) tactic = 'SEARCH';
        else if (dist < 10) tactic = 'RAMMING';
        else if (playerSpeed > 15 && dist < 50) tactic = 'ROADBLOCK';
        else tactic = 'PURSUIT';
        this.tactic = tactic;
        this.state = tactic;
      },
    };
  }

  function spawnCop(index) {
    const angle = (index / 4) * Math.PI * 2 + 0.6;
    const car = ctx.api.makeCar(
      'sedan',
      S.player.pos.x + Math.cos(angle) * 42,
      S.player.pos.z + Math.sin(angle) * 42,
      0,
      0x2e5fa3,
    );
    car.aiPolice = true;
    car.callsign = 'PD-' + String(index + 1).padStart(2, '0');
    car.brain = makeBrain(car);
    S.cars.push(car);
    return car;
  }

  function removeAllCops() {
    for (let i = S.cars.length - 1; i >= 0; i--) {
      const c = S.cars[i];
      if (!c.aiPolice) continue;
      if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh);
      S.cars.splice(i, 1);
    }
    S.cops = [];
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    const wanted = S.wanted;
    if (wanted <= 0) {
      if (S.cars.some((c) => c.aiPolice)) removeAllCops();
      S.lastKnown = null;
      return;
    }
    S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
    const target = Math.max(2, wanted);
    let cops = S.cars.filter((c) => c.aiPolice);
    for (let i = cops.length; i < target; i++) spawnCop(i);
    cops = S.cars.filter((c) => c.aiPolice);
    S.cops = cops;
    const playerSpeed = S.car ? Math.abs(S.car.speed) : 0;
    for (const cop of cops) {
      cop.brain.decideT -= dt;
      if (cop.brain.decideT <= 0) {
        cop.brain.decide(dt, S.player.pos, S.player.vel, S.player.heading, playerSpeed);
        cop.brain.decideT = 1.5;
      }
      let tx = S.player.pos.x;
      let tz = S.player.pos.z;
      if (cop.brain.tactic === 'ROADBLOCK') {
        tx = S.player.pos.x + S.player.vel.x * 1.2;
        tz = S.player.pos.z + S.player.vel.z * 1.2;
      } else if (cop.brain.tactic === 'SEARCH' && S.lastKnown) {
        tx = S.lastKnown.x;
        tz = S.lastKnown.z;
      }
      const ddx = tx - cop.pos.x;
      const ddz = tz - cop.pos.z;
      const dd = Math.hypot(ddx, ddz) || 1;
      const speed = cop.brain.tactic === 'SEARCH' ? 8 : 16;
      cop.heading = Math.atan2(ddx / dd, ddz / dd);
      cop.pos.x += Math.sin(cop.heading) * speed * dt;
      cop.pos.z += Math.cos(cop.heading) * speed * dt;
      cop.speed = speed;
    }
  });
}
