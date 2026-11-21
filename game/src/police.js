// SOLMAR BAY — Solmar PD pursuit. Cops spawn from the wanted level and
// chase with a utility brain: RAMMING / ROADBLOCK / PURSUIT / SEARCH.
import * as THREE from '../vendor/three.module.min.js';

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
        let speed = playerSpeed;
        if (typeof speed !== 'number' || Number.isNaN(speed)) {
          const vx = (playerVel && playerVel.x) || 0;
          const vz = (playerVel && playerVel.z) || 0;
          speed = Math.hypot(vx, vz);
        }
        let tactic = 'PURSUIT';
        const lk = S.lastKnown;
        if (lk && S.time - lk.seenAt > 5) tactic = 'SEARCH';
        else if (dist < 12 && speed < 5) tactic = 'RAMMING';
        else if (speed > 15 && dist >= 20 && dist <= 50) tactic = 'ROADBLOCK';
        else tactic = 'PURSUIT';
        this.tactic = tactic;
        this.state = tactic;
        this.decideT = 1.2;
        return tactic;
      },
    };
  }

  function spawnCop(i) {
    const a = Math.random() * Math.PI * 2;
    const r = 32 + Math.random() * 18;
    const x = S.player.pos.x + Math.cos(a) * r;
    const z = S.player.pos.z + Math.sin(a) * r;
    const car = ctx.api.createVehicle('sedan', x, z, 0);
    car.aiPolice = true;
    car.callsign = 'PD-' + String(i + 1).padStart(2, '0');
    car.brain = makeBrain(car);
    if (car.mesh && car.mesh.children[0]) {
      car.mesh.children[0].material = new THREE.MeshStandardMaterial({ color: 0x2a4fd8, metalness: 0.4, roughness: 0.4 });
    }
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.8 })
    );
    bar.position.y = 1.75;
    car.mesh.add(bar);
    car.lightBar = bar;
    return car;
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    const wanted = S.wanted;
    if (wanted > 0) {
      S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
      const target = Math.min(6, wanted + 1);
      const cops = S.cars.filter((c) => c.aiPolice);
      let n = cops.length;
      while (n < target) {
        const car = spawnCop(n);
        S.cars.push(car);
        n++;
      }
    } else {
      const cops = S.cars.filter((c) => c.aiPolice);
      for (const c of cops) {
        if (c.mesh) scene.remove(c.mesh);
        const idx = S.cars.indexOf(c);
        if (idx >= 0) S.cars.splice(idx, 1);
      }
      S.cops = [];
      return;
    }
    const cops = S.cars.filter((c) => c.aiPolice);
    S.cops = cops;
    const px = S.player.pos.x;
    const pz = S.player.pos.z;
    const pSpeed = S.car ? Math.abs(S.car.speed) : Math.hypot(S.player.vel.x, S.player.vel.z);
    const pVel = S.car ? { x: Math.sin(S.car.heading) * S.car.speed, z: Math.cos(S.car.heading) * S.car.speed } : S.player.vel;
    for (const c of cops) {
      c.brain.decideT -= dt;
      if (c.brain.decideT <= 0) {
        c.brain.decide(dt, S.player.pos, pVel, S.player.heading, pSpeed);
      }
      let tx = px;
      let tz = pz;
      let speed = 15;
      if (c.brain.tactic === 'ROADBLOCK') {
        const ahead = 14;
        tx = px + Math.sin(S.player.heading) * ahead;
        tz = pz + Math.cos(S.player.heading) * ahead;
        speed = 18;
      } else if (c.brain.tactic === 'SEARCH' && S.lastKnown) {
        tx = S.lastKnown.x;
        tz = S.lastKnown.z;
        speed = 10;
      } else if (c.brain.tactic === 'RAMMING') {
        speed = 20;
      }
      const dx = tx - c.pos.x;
      const dz = tz - c.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2) {
        const want = Math.atan2(dx, dz);
        let diff = want - c.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        c.pos.x += Math.sin(c.heading) * speed * dt;
        c.pos.z += Math.cos(c.heading) * speed * dt;
      }
      if (c.mesh) {
        c.mesh.position.set(c.pos.x, 0, c.pos.z);
        c.mesh.rotation.y = c.heading;
      }
      if (c.lightBar) {
        c.lightBar.material.emissiveIntensity = 0.4 + 0.6 * Math.abs(Math.sin(S.time * 9 + c.pos.x));
      }
    }
  });
}

export default { init };
