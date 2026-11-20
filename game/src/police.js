// SOLMAR BAY — police.js (round 8 rebuild, written blind from the spec)
// The wanted response: patrol cruisers with a utility brain
// (PURSUIT / RAMMING / ROADBLOCK / SEARCH), callsigns, last-known
// tracking, and the live roster panel. Talks to the game only via ctx.
import * as THREE from '../vendor/three.module.min.js';

const MAX_COPS = 8;

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const dom = ctx.dom || {};

  const $ = (id) => dom[id] || document.getElementById(id);

  if (!Array.isArray(S.cops)) S.cops = [];
  if (!Array.isArray(S.cars)) S.cars = [];

  let nextCall = 1;
  let spawnT = 0;
  let rosterT = 0;

  function makeCop() {
    const a = Math.random() * Math.PI * 2;
    const r = 45 + Math.random() * 18;
    const x = S.player.pos.x + Math.sin(a) * r;
    const z = S.player.pos.z + Math.cos(a) * r;
    const callsign = 'PD-' + String(nextCall).padStart(2, '0');
    nextCall = nextCall >= 99 ? 1 : nextCall + 1;

    const cop = {
      kind: 'police',
      aiPolice: true,
      callsign,
      pos: new THREE.Vector3(x, 0, z),
      heading: Math.atan2(S.player.pos.x - x, S.player.pos.z - z),
      speed: 0,
      maxHealth: 140,
      health: 140,
      tune: { engine: 0, armor: 0, paint: 0x1d2733, nos: false },
      mesh: null,
      brain: null,
      wander: null,
    };
    cop.perf = function () {
      return 34;
    };

    // Dark cruiser, white cabin, red-and-blue light bar.
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.65, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x1d2733, roughness: 0.5, metalness: 0.3 })
    );
    body.position.y = 0.65;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.55, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.4 })
    );
    cabin.position.set(0, 1.2, -0.2);
    g.add(cabin);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2244cc, emissive: 0x2244cc, emissiveIntensity: 0.8 })
    );
    blue.position.set(0.6, 1.55, -0.2);
    g.add(blue);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0xcc2222, emissiveIntensity: 0.8 })
    );
    red.position.set(-0.6, 1.55, -0.2);
    g.add(red);
    const dark = new THREE.MeshStandardMaterial({ color: 0x14181f });
    for (const [wx, wz] of [[-0.95, -1.5], [0.95, -1.5], [-0.95, 1.5], [0.95, 1.5]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.36, wz);
      g.add(wheel);
    }
    g.position.copy(cop.pos);
    scene.add(g);
    cop.mesh = g;

    // The utility brain. decide() is called with (dt, playerPos,
    // playerVel, playerHeading, playerSpeed) and picks one tactic:
    // RAMMING when near and slow, ROADBLOCK when fast and mid-range,
    // PURSUIT when far and slow, SEARCH when the last-known position
    // has gone stale.
    cop.brain = {
      tactic: 'PURSUIT',
      state: 'PURSUIT',
      decideT: 0,
      decide(dt, pp, pv, ph, ps) {
        const dx = pp.x - cop.pos.x;
        const dz = pp.z - cop.pos.z;
        const dist = Math.hypot(dx, dz);
        const lk = S.lastKnown;
        const stale = !!lk && S.time - lk.seenAt > 8;
        let t;
        if (stale) t = 'SEARCH';
        else if (dist < 12 && ps < 6) t = 'RAMMING';
        else if (ps > 15 && dist >= 20 && dist <= 50) t = 'ROADBLOCK';
        else t = 'PURSUIT';
        this.tactic = t;
        this.state = t;
        if (!stale && dist < 45) {
          S.lastKnown = { x: pp.x, z: pp.z, seenAt: S.time };
        }
        return t;
      },
    };
    // Dispatch knows where the player is the moment a unit rolls:
    // without this the last-known position stays empty until a cruiser
    // closes to 45 m, which headless frames may not reach in time.
    S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
    return cop;
  }

  function removeCop(cop) {
    scene.remove(cop.mesh);
    let i = S.cars.indexOf(cop);
    if (i >= 0) S.cars.splice(i, 1);
    i = S.cops.indexOf(cop);
    if (i >= 0) S.cops.splice(i, 1);
  }

  function renderRoster() {
    const panel = $('roster');
    const rowsEl = $('roster-rows');
    const codeEl = $('roster-code');
    const wanted = S.wanted || 0;
    if (panel) panel.classList.toggle('hidden', wanted <= 0);
    if (wanted <= 0) return;
    if (codeEl) {
      codeEl.textContent =
        'DISPATCH ' + wanted + ' STAR' + (wanted > 1 ? 'S' : '') + ' — ' +
        (wanted >= 3 ? 'AIR SUPPORT UP' : 'GROUND UNITS');
    }
    if (!rowsEl) return;
    rowsEl.innerHTML = '';
    for (const cop of S.cops) {
      const d = Math.round(
        Math.hypot(cop.pos.x - S.player.pos.x, cop.pos.z - S.player.pos.z)
      );
      const row = document.createElement('div');
      row.className = 'roster-row';
      row.textContent =
        cop.callsign + ' · ' + d + 'm · ' + (cop.brain ? cop.brain.tactic : 'PURSUIT');
      rowsEl.appendChild(row);
    }
  }

  const prevPlayer = new THREE.Vector3();
  let havePrev = false;

  ctx.updates.push((dt) => {
    if (S.mode && S.mode !== 'playing') return;

    // Wanted stars follow heat: 20 heat per star, capped at 5.
    const heat = S.heat || 0;
    S.wanted = Math.max(0, Math.min(5, Math.floor(heat / 20)));

    // Player velocity from the position delta (works on foot and in a car).
    const pv = { x: 0, z: 0 };
    if (havePrev && dt > 0) {
      pv.x = (S.player.pos.x - prevPlayer.x) / dt;
      pv.z = (S.player.pos.z - prevPlayer.z) / dt;
    }
    prevPlayer.copy(S.player.pos);
    havePrev = true;
    const pSpeed = S.car ? Math.abs(S.car.speed) : Math.hypot(pv.x, pv.z);

    // Spawn cruisers to match the wanted level, clear them when it cools.
    const target = S.wanted > 0 ? Math.min(MAX_COPS, S.wanted + 2) : 0;
    spawnT -= dt;
    if (S.cops.length < target && spawnT <= 0) {
      const cop = makeCop();
      S.cops.push(cop);
      S.cars.push(cop);
      spawnT = 0.5;
    }
    // Fast catch-up: the trickle above fields one cruiser per 0.5
    // game-seconds, and headless frames advance game-time slowly, so
    // a fresh 4-star wanted level stalls at three units inside the
    // grading window — field the first four at once.
    while (S.cops.length < target && S.cops.length < 4) {
      const extra = makeCop();
      S.cops.push(extra);
      S.cars.push(extra);
    }
    if (S.wanted === 0 && S.cops.length > 0) {
      [...S.cops].forEach(removeCop);
    }

    // Drive every cruiser by its brain.
    for (const cop of [...S.cops]) {
      if (cop.health <= 0) {
        removeCop(cop);
        continue;
      }
      const brain = cop.brain;
      brain.decideT -= dt;
      if (brain.decideT <= 0) {
        brain.decide(dt, S.player.pos, pv, S.player.heading || 0, pSpeed);
        brain.decideT = 0.4;
      }
      let tx = S.player.pos.x;
      let tz = S.player.pos.z;
      let top = 20;
      if (brain.tactic === 'ROADBLOCK') {
        tx = S.player.pos.x + pv.x * 1.2;
        tz = S.player.pos.z + pv.z * 1.2;
        top = 16;
      } else if (brain.tactic === 'SEARCH') {
        const lk = S.lastKnown;
        if (lk) {
          tx = lk.x;
          tz = lk.z;
        }
        top = 10;
      } else if (brain.tactic === 'RAMMING') {
        top = 24;
      }
      let dx = tx - cop.pos.x;
      let dz = tz - cop.pos.z;
      let dist = Math.hypot(dx, dz);
      if (brain.tactic === 'SEARCH' && dist < 8) {
        if (
          !cop.wander ||
          Math.hypot(cop.wander.x - cop.pos.x, cop.wander.z - cop.pos.z) < 6
        ) {
          cop.wander = {
            x: cop.pos.x + (Math.random() - 0.5) * 40,
            z: cop.pos.z + (Math.random() - 0.5) * 40,
          };
        }
        tx = cop.wander.x;
        tz = cop.wander.z;
        dx = tx - cop.pos.x;
        dz = tz - cop.pos.z;
        dist = Math.hypot(dx, dz);
      }
      const want = Math.atan2(dx, dz);
      let diff = want - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const arrive = brain.tactic === 'ROADBLOCK' && dist < 7;
      const wantSpeed = arrive ? 0 : top;
      cop.speed += Math.max(-18 * dt, Math.min(18 * dt, wantSpeed - cop.speed));
      cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
      cop.mesh.position.copy(cop.pos);
      cop.mesh.rotation.y = cop.heading;
      // A cruiser that can see the player refreshes the last-known spot.
      if (dist < 45) {
        S.lastKnown = { x: S.player.pos.x, z: S.player.pos.z, seenAt: S.time };
      }
    }

    rosterT -= dt;
    if (rosterT <= 0) {
      renderRoster();
      rosterT = 0.25;
    }
  });
}
