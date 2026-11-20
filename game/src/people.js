// SOLMAR BAY — pedestrians (round 8, written fresh from the spec).
// Simple walking figures on the sidewalks who wander the blocks and
// run from gunfire and police. Cheap by design: shared geometries and
// a handful of shared materials, a fixed small crowd, no per-ped
// allocations inside the frame loop.
import * as THREE from '../vendor/three.module.min.js';

const COUNT = 26;
const SHIRT_COLS = [0xd8b25e, 0x5e8ad8, 0xd85e6a, 0x6ad88a, 0xd8d8d8, 0x9a5ed8, 0x5ed8c9];
const PANTS_COLS = [0x2e3440, 0x4a3a2e, 0x2e4a3a, 0x3a3a4a];

function pick(arr, rnd) { return arr[(rnd() * arr.length) | 0]; }

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function init(ctx) {
  const T = ctx.THREE || THREE;
  const scene = ctx.scene;
  const S = ctx.state;
  const rnd = mulberry32(4242);

  // Shared geometry/materials: every pedestrian reuses these.
  const bodyGeo = new T.BoxGeometry(0.46, 0.85, 0.28);
  const headGeo = new T.SphereGeometry(0.17, 8, 6);
  const legsGeo = new T.BoxGeometry(0.4, 0.55, 0.26);
  const skinMat = new T.MeshLambertMaterial({ color: 0xc98a64 });
  const skinMat2 = new T.MeshLambertMaterial({ color: 0x8a5a3a });
  const shirtMats = SHIRT_COLS.map((c) => new T.MeshLambertMaterial({ color: c }));
  const pantsMats = PANTS_COLS.map((c) => new T.MeshLambertMaterial({ color: c }));

  function randomSidewalkPoint() {
    // Near a road line, offset onto the sidewalk, inside the bounds.
    const city = ctx.api.city;
    let x, z;
    if (city && city.roadXs && city.roadXs.length) {
      if (rnd() < 0.5) {
        x = pick(city.roadXs, rnd) + (rnd() < 0.5 ? -6.5 : 6.5);
        z = -170 + rnd() * 340;
      } else {
        z = pick(city.roadZs, rnd) + (rnd() < 0.5 ? -6.5 : 6.5);
        x = -170 + rnd() * 340;
      }
    } else {
      x = -170 + rnd() * 340;
      z = -170 + rnd() * 340;
    }
    return {
      x: Math.max(-175, Math.min(175, x)),
      z: Math.max(-175, Math.min(175, z)),
    };
  }

  const peds = [];
  for (let i = 0; i < COUNT; i++) {
    const g = new T.Group();
    const legs = new T.Mesh(legsGeo, pick(pantsMats, rnd));
    legs.position.y = 0.28; g.add(legs);
    const body = new T.Mesh(bodyGeo, pick(shirtMats, rnd));
    body.position.y = 0.98; g.add(body);
    const head = new T.Mesh(headGeo, rnd() < 0.5 ? skinMat : skinMat2);
    head.position.y = 1.58; g.add(head);
    const p = randomSidewalkPoint();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = rnd() * Math.PI * 2;
    scene.add(g);
    const target = randomSidewalkPoint();
    peds.push({
      group: g, body, head, legs,
      target, speed: 1.1 + rnd() * 0.9,
      state: 'walk', fleeT: 0, bobPhase: rnd() * Math.PI * 2,
      heading: g.rotation.y,
    });
  }

  if (S) S.pedestrians = peds;
  ctx.api.people = {
    list: peds,
    count: peds.length,
    scatter(x, z) {
      for (const p of peds) {
        const dx = p.group.position.x - x, dz = p.group.position.z - z;
        const d = Math.hypot(dx, dz) || 1;
        p.target = { x: p.group.position.x + (dx / d) * 30, z: p.group.position.z + (dz / d) * 30 };
        p.state = 'flee'; p.fleeT = 3;
      }
    },
  };

  function nearestThreat(px, pz) {
    // Returns {x, z, d} for the closest police car, or null.
    let best = null;
    try {
      const cars = (S && S.cars) || [];
      for (const c of cars) {
        if (!c || !c.aiPolice || !c.pos) continue;
        const dx = c.pos.x - px, dz = c.pos.z - pz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (!best || d < best.d) best = { x: c.pos.x, z: c.pos.z, d };
      }
    } catch (e) { /* police list is best-effort */ }
    return best;
  }

  function gunfireNear(px, pz) {
    // Several signals other modules may set; any one counts.
    try {
      if (S && S.player && S.player.firing) return true;
      if (S && typeof S.lastGunshotAt === 'number' && Date.now() - S.lastGunshotAt < 2500) {
        const gx = (S.lastGunshot && S.lastGunshot.x) || (S.player && S.player.pos.x) || 0;
        const gz = (S.lastGunshot && S.lastGunshot.z) || (S.player && S.player.pos.z) || 0;
        return Math.hypot(px - gx, pz - gz) < 30;
      }
      if (S && S.gunfire && S.gunfire.x !== undefined) {
        return Math.hypot(px - S.gunfire.x, pz - S.gunfire.z) < 25;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  ctx.updates.push(function peopleUpdate(dt) {
    const step = Math.max(0, Math.min(dt, 0.1));
    if (step === 0) return;
    const playerPos = S && S.player && S.player.pos;
    const heat = (S && (S.heat || 0)) || 0;
    for (const p of peds) {
      const gx = p.group.position.x, gz = p.group.position.z;
      let run = false;
      let awayX = 0, awayZ = 0;

      const threat = nearestThreat(gx, gz);
      if (threat && threat.d < 18) {
        run = true;
        awayX = gx - threat.x; awayZ = gz - threat.z;
      }
      if (!run && gunfireNear(gx, gz)) {
        run = true;
        if (playerPos) { awayX = gx - playerPos.x; awayZ = gz - playerPos.z; }
        else { awayX = 1; awayZ = 0; }
      }
      if (!run && heat >= 3 && playerPos) {
        const d = Math.hypot(gx - playerPos.x, gz - playerPos.z);
        if (d < 14) { run = true; awayX = gx - playerPos.x; awayZ = gz - playerPos.z; }
      }

      let speed = p.speed;
      let tx = p.target.x, tz = p.target.z;
      if (run) {
        p.state = 'flee'; p.fleeT = 1.5;
        const len = Math.hypot(awayX, awayZ) || 1;
        tx = gx + (awayX / len) * 25;
        tz = gz + (awayZ / len) * 25;
        speed = 4.4;
      } else if (p.state === 'flee') {
        p.fleeT -= step;
        if (p.fleeT <= 0) { p.state = 'walk'; p.target = randomSidewalkPoint(); }
        else { speed = 3.2; tx = p.target.x; tz = p.target.z; }
      }

      const dx = tx - gx, dz = tz - gz;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.2) {
        if (p.state === 'walk') p.target = randomSidewalkPoint();
        continue;
      }
      const vx = dx / dist, vz = dz / dist;
      p.group.position.x = Math.max(-178, Math.min(178, gx + vx * speed * step));
      p.group.position.z = Math.max(-178, Math.min(178, gz + vz * speed * step));
      const wantHeading = Math.atan2(vx, vz);
      let dh = wantHeading - p.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      p.heading += dh * Math.min(1, step * 8);
      p.group.rotation.y = p.heading;
      // Little walk bob so they read as walking, not sliding.
      p.bobPhase += step * (p.state === 'flee' ? 11 : 7);
      p.body.position.y = 0.98 + Math.abs(Math.sin(p.bobPhase)) * 0.05;
      p.legs.position.y = 0.28 + Math.abs(Math.cos(p.bobPhase)) * 0.04;
    }
  });
}
