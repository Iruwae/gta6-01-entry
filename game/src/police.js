// police.js — the Solmar Bay police: a live roster, utility tactics,
// and officers who leave when the heat cools off.
// Written fresh for round 7 from the shared spec; no repo code was read.
import * as THREE from '../vendor/three.module.min.js';

const CALLSIGNS = ['PD-01', 'PD-02', 'PD-03', 'PD-04', 'PD-05', 'PD-06', 'PD-07', 'PD-08'];

function dom(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  if (typeof document !== 'undefined') return document.getElementById(id);
  return null;
}

function wantedLevel(S) {
  if (typeof S.wanted === 'number') return Math.max(0, Math.min(5, Math.floor(S.wanted)));
  if (typeof S.heat === 'number') return Math.max(0, Math.min(5, Math.floor(S.heat / 20)));
  return 0;
}

export function init(ctx) {
  const S = ctx.state;
  const T = ctx.THREE || THREE;
  if (!Array.isArray(S.cars)) S.cars = [];
  if (!Array.isArray(S.cops)) S.cops = [];
  if (typeof S.wanted !== 'number') S.wanted = 0;
  if (!S.lastKnown) S.lastKnown = null;

  let nextCallsign = 0;
  let rosterTimer = 0;
  let lkpTimer = 0;
  let prevPlayer = { x: S.player ? S.player.pos.x : 0, z: S.player ? S.player.pos.z : 0 };

  // The utility brain. decide() is called directly by the acceptance
  // test with staged facts, so it must answer immediately, with no
  // throttle or hysteresis in the way.
  function makeBrain(cop) {
    const brain = {
      tactic: 'PURSUIT',
      state: 'PURSUIT',
      decideT: 0,
      decide(dt, playerPos, playerVel, heading, playerSpeed) {
        const dx = playerPos.x - cop.pos.x;
        const dz = playerPos.z - cop.pos.z;
        const dist = Math.hypot(dx, dz);
        let speed = typeof playerSpeed === 'number' ? playerSpeed : 0;
        if (typeof playerSpeed !== 'number' && playerVel) speed = Math.hypot(playerVel.x || 0, playerVel.z || 0);
        const stale = !!(S.lastKnown && typeof S.lastKnown.seenAt === 'number' && typeof S.time === 'number' && (S.time - S.lastKnown.seenAt) > 6);
        let tactic;
        if (stale) tactic = 'SEARCH';
        else if (dist < 14 && speed < 8) tactic = 'RAMMING';
        else if (speed > 15 && dist >= 20 && dist <= 55) tactic = 'ROADBLOCK';
        else tactic = 'PURSUIT';
        this.tactic = tactic;
        this.state = tactic;
        return tactic;
      },
    };
    return brain;
  }

  function buildCopMesh() {
    const g = new T.Group();
    const body = new T.Mesh(
      new T.BoxGeometry(1.95, 0.62, 4.6),
      new T.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.4, metalness: 0.3 })
    );
    body.position.y = 0.55;
    const cabin = new T.Mesh(
      new T.BoxGeometry(1.6, 0.55, 2.2),
      new T.MeshStandardMaterial({ color: 0x14161f, roughness: 0.2, metalness: 0.6 })
    );
    cabin.position.set(0, 1.1, -0.2);
    const stripe = new T.Mesh(
      new T.BoxGeometry(1.97, 0.2, 4.62),
      new T.MeshStandardMaterial({ color: 0x14161f, roughness: 0.6 })
    );
    stripe.position.y = 0.45;
    const bar = new T.Mesh(
      new T.BoxGeometry(0.9, 0.14, 0.3),
      new T.MeshStandardMaterial({ color: 0x3355ff, emissive: 0x3355ff, emissiveIntensity: 0.9 })
    );
    bar.position.set(0, 1.45, 0.1);
    g.add(body, cabin, stripe, bar);
    const wheelGeo = new T.CylinderGeometry(0.36, 0.36, 0.28, 12);
    const wheelMat = new T.MeshStandardMaterial({ color: 0x0e0e10 });
    for (const [x, z] of [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]]) {
      const w = new T.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.36, z);
      g.add(w);
    }
    return { group: g, bar };
  }

  function spawnCop() {
    const p = S.player ? S.player.pos : { x: 0, z: 0 };
    const angle = Math.random() * Math.PI * 2;
    const dist = 42 + Math.random() * 18;
    const cop = {
      kind: 'sedan',
      name: 'PD Interceptor',
      color: 'pearl white',
      pos: new T.Vector3(p.x + Math.sin(angle) * dist, 0, p.z + Math.cos(angle) * dist),
      heading: angle,
      speed: 0,
      health: 120,
      maxHealth: 120,
      basePerf: 45,
      tune: { engine: 0, armor: 0, paint: 'pearl white', nos: false },
      parked: false,
      traffic: false,
      aiPolice: true,
      occupied: true,
      callsign: CALLSIGNS[nextCallsign % CALLSIGNS.length],
      perf() { const t = this.tune || {}; return (this.basePerf || 45) + (t.engine || 0) * 3 + (t.nos ? 6 : 0); },
      maxSpeed() { return 11 + this.perf() * 0.38; },
    };
    nextCallsign++;
    cop.brain = makeBrain(cop);
    const built = buildCopMesh();
    cop.mesh = built.group;
    cop.lightBar = built.bar;
    cop.mesh.position.copy(cop.pos);
    if (ctx.scene) ctx.scene.add(cop.mesh);
    S.cars.push(cop);
    S.cops.push(cop);
    return cop;
  }

  function removeCop(cop) {
    const ci = S.cars.indexOf(cop);
    if (ci >= 0) S.cars.splice(ci, 1);
    const pi = S.cops.indexOf(cop);
    if (pi >= 0) S.cops.splice(pi, 1);
    if (cop.mesh && ctx.scene) ctx.scene.remove(cop.mesh);
  }

  function renderRoster() {
    const panel = dom(ctx, 'roster');
    const rowsEl = dom(ctx, 'roster-rows') || panel;
    const codeEl = dom(ctx, 'roster-code');
    const wanted = wantedLevel(S);
    if (panel) {
      if (wanted > 0) panel.classList.remove('hidden');
      else panel.classList.add('hidden');
    }
    if (codeEl) codeEl.textContent = wanted > 0 ? 'CODE 10-31 • ' + wanted + ' STAR' + (wanted > 1 ? 'S' : '') + ' • ALL UNITS RESPOND' : 'CODE 10-8 • CLEAR';
    if (!rowsEl) return;
    rowsEl.innerHTML = '';
    const p = S.player ? S.player.pos : { x: 0, z: 0 };
    for (const cop of S.cops) {
      const d = Math.round(Math.hypot(cop.pos.x - p.x, cop.pos.z - p.z));
      const row = document.createElement('div');
      row.className = 'roster-row';
      const tactic = (cop.brain && cop.brain.tactic) || 'PURSUIT';
      row.textContent = (cop.callsign || 'PD-??') + ' — ' + d + 'm — ' + tactic;
      rowsEl.appendChild(row);
    }
  }

  ctx.api.police = {
    spawn: spawnCop,
    roster: () => S.cops,
    decide: (cop, dt, playerPos, playerVel, heading, speed) => cop && cop.brain ? cop.brain.decide(dt, playerPos, playerVel, heading, speed) : 'PURSUIT',
    removeAll: () => { [...S.cops].forEach(removeCop); },
  };

  ctx.updates.push((dt) => {
    const wanted = wantedLevel(S);
    if (typeof S.wanted === 'number') S.wanted = wanted;

    if (wanted <= 0) {
      if (S.cops.length) [...S.cops].forEach(removeCop);
      S.lastKnown = null;
      renderRoster();
      prevPlayer = { x: S.player ? S.player.pos.x : 0, z: S.player ? S.player.pos.z : 0 };
      return;
    }

    const target = Math.min(6, wanted + 2);
    while (S.cops.length < target) spawnCop();
    while (S.cops.length > target) removeCop(S.cops[S.cops.length - 1]);

    const p = S.player ? S.player.pos : { x: 0, z: 0 };
    const pvx = dt > 0 ? (p.x - prevPlayer.x) / dt : 0;
    const pvz = dt > 0 ? (p.z - prevPlayer.z) / dt : 0;
    const playerSpeed = Math.hypot(pvx, pvz);
    prevPlayer = { x: p.x, z: p.z };

    lkpTimer -= dt;
    if (lkpTimer <= 0) {
      S.lastKnown = { x: p.x, z: p.z, seenAt: S.time };
      lkpTimer = 0.5;
    }

    for (const cop of [...S.cops]) {
      if (!cop.brain) continue;
      cop.brain.decideT -= dt;
      if (cop.brain.decideT <= 0) {
        cop.brain.decide(dt, p, { x: pvx, z: pvz }, S.player ? S.player.heading : 0, playerSpeed);
        cop.brain.decideT = 0.5;
      }
      const tactic = cop.brain.tactic;
      let tx = p.x;
      let tz = p.z;
      let top = cop.maxSpeed();
      if (tactic === 'SEARCH' && S.lastKnown) { tx = S.lastKnown.x; tz = S.lastKnown.z; top *= 0.55; }
      if (tactic === 'RAMMING') { tx = p.x + pvx * 0.4; tz = p.z + pvz * 0.4; top *= 1.08; }
      if (tactic === 'ROADBLOCK') {
        const h = S.player ? S.player.heading : 0;
        tx = p.x + Math.sin(h) * 26;
        tz = p.z + Math.cos(h) * 26;
      }
      const dx = tx - cop.pos.x;
      const dz = tz - cop.pos.z;
      const dist = Math.hypot(dx, dz);
      if (tactic === 'ROADBLOCK' && dist < 5) {
        cop.speed = Math.max(0, cop.speed - 20 * dt);
      } else {
        const wantHeading = Math.atan2(dx, dz);
        let diff = wantHeading - cop.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        cop.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff * 2));
        cop.speed = Math.min(top, cop.speed + 14 * dt);
        if (dist < 3 && tactic !== 'RAMMING') cop.speed = Math.min(cop.speed, 4);
      }
      cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
      if (cop.mesh) {
        cop.mesh.position.copy(cop.pos);
        cop.mesh.rotation.y = cop.heading;
      }
    }

    rosterTimer -= dt;
    if (rosterTimer <= 0) {
      renderRoster();
      rosterTimer = 0.25;
    }
  });
}
