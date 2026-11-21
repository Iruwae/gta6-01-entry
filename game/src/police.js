// police.js — the Solmar PD pursuit. Cops spawn from S.wanted, chase
// with a small utility brain (decide() picks RAMMING / ROADBLOCK /
// PURSUIT / SEARCH), show up on the roster panel, and leave when the
// heat cools to zero. S.cops is the live list; police cars also live
// in S.cars with aiPolice set so the world can see them.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const dom = ctx.dom || {};
  if (!Array.isArray(S.cops)) S.cops = [];
  if (!Array.isArray(S.cars)) S.cars = [];
  let nextNum = 1;
  let rosterT = 0;

  function makeBrain(car) {
    const brain = {
      tactic: 'PURSUIT',
      state: 'PURSUIT',
      decideT: 0,
      target: { x: 0, z: 0 },
      decide(dt, playerPos, playerVel, heading, speed) {
        this.decideT -= dt;
        if (this.decideT > 0) return;
        this.decideT = 1.5;
        const dx = car.pos.x - playerPos.x;
        const dz = car.pos.z - playerPos.z;
        const dist = Math.hypot(dx, dz);
        const seenAt = S.lastKnown && typeof S.lastKnown.seenAt === 'number' ? S.lastKnown.seenAt : S.time;
        const stale = (S.time - seenAt) > 5;
        let tactic = 'PURSUIT';
        if (stale) tactic = 'SEARCH';
        else if (dist < 15 && speed < 8) tactic = 'RAMMING';
        else if (speed > 12 && dist >= 15 && dist <= 50) tactic = 'ROADBLOCK';
        else tactic = 'PURSUIT';
        this.tactic = tactic;
        this.state = tactic;
      },
    };
    return brain;
  }

  function spawnCop() {
    const num = nextNum++;
    const callsign = 'PD-' + String(num).padStart(2, '0');
    const a = Math.random() * Math.PI * 2;
    const d = 32 + Math.random() * 18;
    const x = S.player.pos.x + Math.cos(a) * d;
    const z = S.player.pos.z + Math.sin(a) * d;
    const cop = {
      kind: 'sedan',
      callsign,
      aiPolice: true,
      pos: new THREE.Vector3(x, 0, z),
      heading: Math.atan2(S.player.pos.x - x, S.player.pos.z - z),
      speed: 0,
      health: 100,
      maxHealth: 100,
      basePerf: 34,
      topSpeed: 30,
      accel: 18,
      color: 0x1d2a44,
      tune: { engine: 0, armor: 0, paint: 0, nos: false },
      mesh: null,
      perf() { return this.basePerf; },
      brain: null,
    };
    cop.brain = makeBrain(cop);
    if (scene && THREE) {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1d2a44, roughness: 0.4, metalness: 0.4 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 4.0), bodyMat);
      body.position.y = 0.55;
      group.add(body);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.25, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x3355ff })
      );
      bar.position.set(0, 1.05, 0);
      group.add(bar);
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.6, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.8 })
      );
      cabin.position.set(0, 1.15, -0.2);
      group.add(cabin);
      scene.add(group);
      cop.mesh = group;
    }
    S.cops.push(cop);
    S.cars.push(cop);
    return cop;
  }

  function removeCop(cop) {
    S.cops = S.cops.filter((c) => c !== cop);
    S.cars = S.cars.filter((c) => c !== cop);
    if (scene && cop.mesh) scene.remove(cop.mesh);
  }

  function refreshRoster() {
    const panel = dom.roster || document.getElementById('roster');
    if (!panel) return;
    const codeEl = dom['roster-code'] || document.getElementById('roster-code');
    if ((S.wanted || 0) <= 0 || S.cops.length === 0) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    if (codeEl) codeEl.textContent = '10-31 SOLMAR PD — ' + S.wanted + ' STAR' + (S.wanted > 1 ? 'S' : '');
    // Rebuild rows: one per officer, callsign + distance + tactic.
    panel.querySelectorAll('.roster-row').forEach((row) => row.remove());
    for (const cop of S.cops) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const dist = Math.round(Math.hypot(cop.pos.x - S.player.pos.x, cop.pos.z - S.player.pos.z));
      row.textContent = cop.callsign + '  ' + dist + 'm  ' + ((cop.brain && cop.brain.tactic) || 'PURSUIT');
      panel.appendChild(row);
    }
  }

  if (ctx.api) {
    ctx.api.spawnCop = spawnCop;
    ctx.api.policeCount = () => S.cops.length;
  }

  (ctx.updates || []).push((dt) => {
    if (!S || !S.player || !S.player.pos) return;
    const wanted = typeof S.wanted === 'number' ? S.wanted : 0;
    if (S.mode !== 'playing' || S.cutscene) {
      if (wanted <= 0) refreshRoster();
      return;
    }
    // Track the last known position while wanted.
    if (wanted > 0) {
      S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
    }
    const desired = wanted <= 0 ? 0 : wanted + 2;
    while (S.cops.length < desired) spawnCop();
    while (S.cops.length > desired) removeCop(S.cops[S.cops.length - 1]);
    if (wanted <= 0) {
      S.lastKnown = S.lastKnown || null;
      refreshRoster();
      return;
    }
    // Player velocity estimate for the roadblock play.
    const pvx = S.car ? Math.sin(S.car.heading || 0) * (S.car.speed || 0) : 0;
    const pvz = S.car ? Math.cos(S.car.heading || 0) * (S.car.speed || 0) : 0;
    const pSpeed = S.car ? Math.abs(S.car.speed || 0) : 0;
    for (const cop of [...S.cops]) {
      if (!cop.brain) continue;
      cop.brain.decide(dt, S.player.pos, { x: pvx, z: pvz }, S.player.heading || 0, pSpeed);
      const tactic = cop.brain.tactic;
      let tx = S.player.pos.x;
      let tz = S.player.pos.z;
      let cruise = 20;
      if (tactic === 'SEARCH' && S.lastKnown) {
        tx = S.lastKnown.x;
        tz = S.lastKnown.z;
        cruise = 12;
      } else if (tactic === 'ROADBLOCK') {
        // Cut across ahead of the player's path.
        tx = S.player.pos.x + pvx * 1.2;
        tz = S.player.pos.z + pvz * 1.2;
        cruise = 24;
      } else if (tactic === 'RAMMING') {
        cruise = 26;
      }
      const dx = tx - cop.pos.x;
      const dz = tz - cop.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2) {
        const wantHeading = Math.atan2(dx, dz);
        let dh = wantHeading - cop.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
        const arrive = tactic === 'ROADBLOCK' && dist < 6;
        cop.speed = arrive ? 0 : cruise;
        cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
        cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
        cop.pos.y = 0;
      }
      if (cop.mesh) {
        cop.mesh.position.set(cop.pos.x, 0, cop.pos.z);
        cop.mesh.rotation.y = cop.heading;
      }
    }
    rosterT -= dt;
    if (rosterT <= 0) {
      rosterT = 0.25;
      refreshRoster();
    }
  });
}
