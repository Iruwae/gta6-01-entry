// Solmar Bay — pedestrians (round 7 rebuild).
// Simple walking figures on the sidewalks who wander from corner
// to corner. When police close in or shots ring out nearby they
// break into a run away from the trouble. Kept deliberately cheap:
// shared geometry and materials, a couple of dozen figures, and
// only a handful of distance checks per frame.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const T = ctx.THREE || THREE;

  const COUNT = 22;
  const HALF = 170;

  const bodyGeo = new T.BoxGeometry(0.55, 0.95, 0.32);
  const headGeo = new T.SphereGeometry(0.22, 8, 6);
  const shirtCols = [0xd84a4a, 0x4a7ad8, 0x3da35a, 0xe8c33d, 0xd84a9a, 0x8a6ad8, 0xeeeeee, 0x2f2f33];
  const shirtMats = shirtCols.map((c) => new T.MeshLambertMaterial({ color: c }));
  const skinMats = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0].map(
    (c) => new T.MeshLambertMaterial({ color: c })
  );
  const legMat = new T.MeshLambertMaterial({ color: 0x2a2a33 });

  function sidewalkSpot(i) {
    // Near a road line, offset onto the sidewalk.
    const road = -150 + (i * 37) % 300;
    const along = -160 + ((i * 91) % 320);
    if (i % 2 === 0) return { x: road + 7, z: along };
    return { x: along, z: road + 7 };
  }

  const people = [];
  for (let i = 0; i < COUNT; i++) {
    const grp = new T.Group();
    const body = new T.Mesh(bodyGeo, shirtMats[i % shirtMats.length]);
    body.position.y = 0.95;
    grp.add(body);
    const head = new T.Mesh(headGeo, skinMats[i % skinMats.length]);
    head.position.y = 1.62;
    grp.add(head);
    const legs = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.3), legMat);
    legs.position.y = 0.25;
    grp.add(legs);
    const s = sidewalkSpot(i);
    grp.position.set(s.x, 0, s.z);
    scene.add(grp);
    people.push({
      mesh: grp,
      x: s.x,
      z: s.z,
      tx: s.x + 20,
      tz: s.z - 10,
      heading: 0,
      speed: 1 + (i % 5) * 0.25,
      state: 'walk',
      bob: Math.random() * 6,
      retarget: 0,
    });
  }

  S.people = people;
  S.pedestrians = people;

  function gunfireNear(x, z) {
    // Combat modules may expose a last-shot position under a few
    // possible names; honour whichever one is present and fresh.
    const spots = [S.gunfirePos, S.lastShotPos, S.shotPos];
    for (const p of spots) {
      if (!p) continue;
      const at = p.at ?? p.time ?? S.time;
      if (typeof at === 'number' && S.time - at > 6) continue;
      const dx = (p.x ?? 0) - x;
      const dz = (p.z ?? 0) - z;
      if (dx * dx + dz * dz < 22 * 22) return { x: p.x ?? 0, z: p.z ?? 0 };
    }
    return null;
  }

  function scatter(x, z) {
    for (const p of people) {
      const dx = p.x - x;
      const dz = p.z - z;
      const d = Math.hypot(dx, dz) || 1;
      p.tx = Math.max(-HALF, Math.min(HALF, p.x + (dx / d) * 40));
      p.tz = Math.max(-HALF, Math.min(HALF, p.z + (dz / d) * 40));
      p.state = 'flee';
    }
  }

  ctx.api.people = { list: people, scatter, count: people.length };

  ctx.updates.push((dt, t) => {
    const cops = Array.isArray(S.cars) ? S.cars.filter((c) => c && c.aiPolice && c.pos) : [];
    const px = S.player && S.player.pos ? S.player.pos.x : 0;
    const pz = S.player && S.player.pos ? S.player.pos.z : 0;
    for (const p of people) {
      // --- decide: flee or stroll ---
      let threat = null;
      for (const c of cops) {
        const dx = c.pos.x - p.x;
        const dz = c.pos.z - p.z;
        if (dx * dx + dz * dz < 15 * 15) { threat = c.pos; break; }
      }
      if (!threat) {
        const shot = gunfireNear(p.x, p.z);
        if (shot) threat = shot;
      }
      if (threat) {
        if (p.state !== 'flee') {
          const dx = p.x - threat.x;
          const dz = p.z - threat.z;
          const d = Math.hypot(dx, dz) || 1;
          p.tx = Math.max(-HALF, Math.min(HALF, p.x + (dx / d) * 45));
          p.tz = Math.max(-HALF, Math.min(HALF, p.z + (dz / d) * 45));
          p.state = 'flee';
        }
      } else if (p.state === 'flee') {
        p.state = 'walk';
        p.retarget = 0;
      }

      // --- retarget when arrived or bored ---
      const dxT = p.tx - p.x;
      const dzT = p.tz - p.z;
      const distT = Math.hypot(dxT, dzT);
      p.retarget -= dt;
      if ((distT < 2 || p.retarget <= 0) && p.state === 'walk') {
        p.tx = Math.max(-HALF, Math.min(HALF, p.x + (Math.random() * 70 - 35)));
        p.tz = Math.max(-HALF, Math.min(HALF, p.z + (Math.random() * 70 - 35)));
        p.retarget = 6 + Math.random() * 8;
      }

      // --- move ---
      const speed = p.state === 'flee' ? 3.6 : p.speed;
      if (distT > 0.4) {
        const step = Math.min(distT, speed * dt);
        p.x += (dxT / distT) * step;
        p.z += (dzT / distT) * step;
        p.heading = Math.atan2(dxT, dzT);
      }
      p.bob += dt * (p.state === 'flee' ? 11 : 6);
      p.mesh.position.set(p.x, Math.abs(Math.sin(p.bob)) * 0.06, p.z);
      p.mesh.rotation.y = p.heading;
      void px; void pz; void t;
    }
  });
}
