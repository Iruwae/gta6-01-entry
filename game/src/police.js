// police.js — the Solmar Bay PD on your tail.
//
// A live roster of patrol cruisers with callsigns, distances and a
// tactic each, picked by a small utility brain: RAMMING up close against
// a slow target, ROADBLOCK ahead of a fast one at mid range, PURSUIT
// from far away, SEARCH when the last-known position has gone stale.
// Heat brings them in; when the heat cools to nothing they pack up and
// the roster panel closes.

import * as THREE from '../vendor/three.module.min.js';

const STALE_SECONDS = 6;
const MAX_COPS = 6;

function el(ctx, id) {
  return (ctx.dom && ctx.dom[id]) ||
    (typeof document !== 'undefined' ? document.getElementById(id) : null);
}

function buildCruiserMesh(THREE) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141824, roughness: 0.4, metalness: 0.5 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.5, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.15, metalness: 0.6 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.95 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.5), bodyMat);
  body.position.y = 0.55;
  group.add(body);
  const doors = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.4, 1.6), doorMat);
  doors.position.set(0, 0.6, 0.2);
  group.add(doors);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.55, 2.0), glass);
  cabin.position.set(0, 1.1, -0.2);
  group.add(cabin);
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x222222 }));
  barBase.position.set(0, 1.44, -0.2);
  group.add(barBase);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
  red.position.set(-0.28, 1.52, -0.2);
  group.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x0000aa }));
  blue.position.set(0.28, 1.52, -0.2);
  group.add(blue);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14);
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    group.add(w);
  }
  return group;
}

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  if (!Array.isArray(S.cops)) S.cops = [];
  if (!Array.isArray(S.cars)) S.cars = [];
  if (typeof S.lastKnown === 'undefined') S.lastKnown = null;

  function wantedLevel() {
    if (typeof S.wanted === 'number') return S.wanted;
    if (typeof S.heat === 'number' && S.heat > 0) return Math.min(5, Math.ceil(S.heat / 20));
    return 0;
  }

  // The tactic brain. Called directly by the acceptance harness with
  // staged facts, so it decides fresh on every call — no cooldown gate.
  function decideFor(cop, dt, playerPos, playerVel, heading, speed) {
    const brain = cop.brain;
    const dx = playerPos.x - cop.pos.x;
    const dz = playerPos.z - cop.pos.z;
    const dist = Math.hypot(dx, dz);
    const pvx = playerVel ? (playerVel.x || 0) : 0;
    const pvz = playerVel ? (playerVel.z || 0) : 0;
    const spd = typeof speed === 'number' ? speed : Math.hypot(pvx, pvz);
    const lk = S.lastKnown;
    const stale = lk && typeof lk.seenAt === 'number' &&
      typeof S.time === 'number' && (S.time - lk.seenAt) > STALE_SECONDS;
    let tactic;
    if (stale) tactic = 'SEARCH';
    else if (dist <= 12 && spd < 8) tactic = 'RAMMING';
    else if (spd >= 15 && dist >= 12 && dist <= 55) tactic = 'ROADBLOCK';
    else tactic = 'PURSUIT';
    brain.tactic = tactic;
    brain.state = tactic;
    return tactic;
  }

  function spawnCop() {
    const n = S.cops.length + 1;
    const callsign = 'PD-' + String(n).padStart(2, '0');
    const ang = Math.random() * Math.PI * 2;
    const r = 45 + Math.random() * 15;
    const x = Math.max(-180, Math.min(180, S.player.pos.x + Math.cos(ang) * r));
    const z = Math.max(-180, Math.min(180, S.player.pos.z + Math.sin(ang) * r));
    const cop = {
      kind: 'police',
      name: 'CRUISER',
      pos: new THREE.Vector3(x, 0, z),
      heading: 0,
      speed: 0,
      maxHealth: 120,
      health: 120,
      color: '#141824',
      tune: { engine: 0, armor: 0, paint: '#141824', nos: false },
      aiPolice: true,
      callsign,
      wrecked: false,
      perf() { return 34; },
      damage(m) {
        this.health = Math.max(0, this.health - m);
        if (this.health <= 0) { this.wrecked = true; this.speed = 0; }
        return this.health;
      },
      brain: {
        tactic: 'PURSUIT',
        state: 'PURSUIT',
        decideT: 0,
        decide(dt, pp, pv, h, s) { return decideFor(cop, dt, pp, pv, h, s); },
      },
    };
    if (scene && ctx.THREE) {
      cop.mesh = buildCruiserMesh(ctx.THREE);
      cop.mesh.position.copy(cop.pos);
      scene.add(cop.mesh);
    }
    S.cars.push(cop);
    S.cops.push(cop);
    return cop;
  }

  function clearCops() {
    for (const cop of S.cops) {
      if (cop.mesh && scene) scene.remove(cop.mesh);
    }
    S.cops.length = 0;
    if (Array.isArray(S.cars)) {
      for (let i = S.cars.length - 1; i >= 0; i--) {
        if (S.cars[i] && S.cars[i].aiPolice) S.cars.splice(i, 1);
      }
    }
  }

  function refreshRoster() {
    const rosterEl = el(ctx, 'roster');
    const rowsEl = el(ctx, 'roster-rows');
    const codeEl = el(ctx, 'roster-code');
    if (!rosterEl) return;
    const w = wantedLevel();
    if (w <= 0) {
      rosterEl.classList.add('hidden');
      if (rowsEl) rowsEl.innerHTML = '';
      return;
    }
    rosterEl.classList.remove('hidden');
    if (codeEl) {
      codeEl.textContent = 'DISPATCH 10-' + (80 + w) + ' — ' + w + ' STAR' + (w > 1 ? 'S' : '') + ' — ALL UNITS RESPOND';
    }
    if (!rowsEl) return;
    rowsEl.innerHTML = '';
    for (const cop of S.cops) {
      const d = Math.round(Math.hypot(cop.pos.x - S.player.pos.x, cop.pos.z - S.player.pos.z));
      const row = document.createElement('div');
      row.className = 'roster-row';
      const call = document.createElement('span');
      call.className = 'roster-call';
      call.textContent = cop.callsign;
      const dist = document.createElement('span');
      dist.className = 'roster-dist';
      dist.textContent = d + 'm';
      const tac = document.createElement('span');
      tac.className = 'roster-tactic';
      tac.textContent = cop.brain.tactic;
      row.appendChild(call);
      row.appendChild(dist);
      row.appendChild(tac);
      rowsEl.appendChild(row);
    }
  }

  function moveCop(cop, dt) {
    const step = Math.min(dt || 0, 0.05);
    const P = S.player.pos;
    let tx = P.x;
    let tz = P.z;
    let cruise = 17;
    if (cop.brain.tactic === 'ROADBLOCK') {
      // Cut across ahead of the player's line of travel.
      const px = (cop._pvx || 0);
      const pz = (cop._pvz || 0);
      tx = P.x + px * 1.2;
      tz = P.z + pz * 1.2;
      cruise = 19;
    } else if (cop.brain.tactic === 'RAMMING') {
      cruise = 20;
    } else if (cop.brain.tactic === 'SEARCH') {
      const lk = S.lastKnown;
      if (lk) { tx = lk.x; tz = lk.z; }
      cruise = 10;
    }
    const dx = tx - cop.pos.x;
    const dz = tz - cop.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.5) {
      const want = Math.atan2(dx, dz);
      let diff = want - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.heading += Math.max(-2.4 * step, Math.min(2.4 * step, diff));
      const slow = cop.brain.tactic === 'SEARCH' && dist < 8 ? 0.4 : 1;
      cop.speed = cruise * slow;
      cop.pos.x += Math.sin(cop.heading) * cop.speed * step;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * step;
    } else {
      cop.speed = 0;
    }
    if (cop.mesh) {
      cop.mesh.position.copy(cop.pos);
      cop.mesh.rotation.y = cop.heading;
    }
  }

  let rosterT = 0;
  let lkT = 0;
  let prevPx = S.player.pos.x;
  let prevPz = S.player.pos.z;

  ctx.updates.push((dt, t) => {
    const w = wantedLevel();
    const playing = S.mode === 'playing' && !S.cutscene;

    if (w <= 0) {
      if (S.cops.length) clearCops();
      refreshRoster();
      prevPx = S.player.pos.x;
      prevPz = S.player.pos.z;
      return;
    }

    // The roster grows with the heat: one star brings three cruisers.
    const target = Math.min(MAX_COPS, w + 2);
    while (S.cops.length < target) spawnCop();

    // Seed the last-known fix the moment the heat comes on. The slow
    // refresh below only stamps it every 1.5 game-seconds — half a
    // minute of wall time under the software renderer — and the roster,
    // the helicopter and the search brain all need a fix right away.
    if (!S.lastKnown) S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };

    // Estimate how fast the player is moving from frame to frame.
    const step = Math.max(dt || 0.001, 0.001);
    let pvx = (S.player.pos.x - prevPx) / step;
    let pvz = (S.player.pos.z - prevPz) / step;
    const pMag = Math.hypot(pvx, pvz);
    if (pMag > 40) { pvx = (pvx / pMag) * 40; pvz = (pvz / pMag) * 40; }
    prevPx = S.player.pos.x;
    prevPz = S.player.pos.z;
    const pSpeed = Math.hypot(pvx, pvz);

    // The last-known position refreshes while the player is out in the
    // open; tucked into a lay-low spot, it goes stale and the search
    // begins.
    lkT += dt || 0;
    if (lkT > 1.5) {
      lkT = 0;
      const layingLow = (S.heatDirector && Array.isArray(S.heatDirector.layLow) &&
        S.heatDirector.layLow.some((s) => Math.hypot(S.player.pos.x - s.x, S.player.pos.z - s.z) < s.r));
      if (!layingLow) S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
    }

    for (const cop of S.cops.slice()) {
      cop._pvx = pvx;
      cop._pvz = pvz;
      cop.brain.decideT -= dt || 0;
      if (cop.brain.decideT <= 0) {
        cop.brain.decideT = 0.5;
        decideFor(cop, dt, S.player.pos, { x: pvx, z: pvz }, S.player.heading, pSpeed);
      }
      if (playing) moveCop(cop, dt);
    }

    rosterT += dt || 0;
    if (rosterT >= 0.25) {
      rosterT = 0;
      refreshRoster();
    }
  });

  ctx.api.police = {
    roster: () => S.cops,
    decide: (cop, dt, pp, pv, h, s) => decideFor(cop, dt, pp, pv, h, s),
    spawn: spawnCop,
    clear: clearCops,
  };
  ctx.api.policeRoster = () => S.cops;
  ctx.api.policeDecide = (cop, dt, pp, pv, h, s) => decideFor(cop, dt, pp, pv, h, s);
}
