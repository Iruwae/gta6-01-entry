// people.js — the pedestrians of SOLMAR BAY.
// Twenty-six locals wandering the blocks on foot: they pick a corner,
// walk to it, wait a while, and pick another. They give the player a
// little space when he gets close, and they bob as they walk.
// Written fresh for round 8 from the shared contract.
import * as THREE from '../vendor/three.module.min.js';

const SHIRTS = [0xff8a5c, 0x5cb8ff, 0x9ad86a, 0xffd25c, 0xc86aff, 0x5ce8c8, 0xff6a7a, 0xe8e8e8];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  const rand = mulberry32(777);
  const COUNT = 26;
  const peds = [];

  for (let i = 0; i < COUNT; i++) {
    const shirt = SHIRTS[Math.floor(rand() * SHIRTS.length)];
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 1.05, 0.32),
      new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 }),
    );
    body.position.y = 0.95;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.8 }),
    );
    head.position.y = 1.68;
    g.add(head);
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.75, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x2a2a33, roughness: 1 }),
    );
    legs.position.y = 0.38;
    g.add(legs);
    const x = (rand() - 0.5) * 320;
    const z = (rand() - 0.5) * 320;
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({
      mesh: g,
      pos: g.position,
      heading: rand() * Math.PI * 2,
      speed: 1 + rand() * 1.2,
      target: null,
      waitT: rand() * 2,
      phase: rand() * Math.PI * 2,
    });
  }

  S.peds = peds;
  S.people = peds;
  ctx.api.pedestrians = peds;

  function pickTarget(p) {
    p.target = { x: (rand() - 0.5) * 320, z: (rand() - 0.5) * 320 };
  }

  let t = 0;
  ctx.updates.push((dt) => {
    t += dt;
    if (S.mode !== 'playing') return;
    for (const p of peds) {
      if (p.waitT > 0) { p.waitT -= dt; continue; }
      if (!p.target) pickTarget(p);
      const dx = p.target.x - p.pos.x;
      const dz = p.target.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5) {
        p.target = null;
        p.waitT = 1 + rand() * 4;
        continue;
      }
      let mx = dx / d;
      let mz = dz / d;
      // Shy away from the player when he gets close.
      if (S.player && S.player.pos) {
        const px = p.pos.x - S.player.pos.x;
        const pz = p.pos.z - S.player.pos.z;
        const pd = Math.hypot(px, pz);
        if (pd < 3 && pd > 0.01) {
          mx += (px / pd) * 0.8;
          mz += (pz / pd) * 0.8;
          const ml = Math.hypot(mx, mz) || 1;
          mx /= ml; mz /= ml;
        }
      }
      p.pos.x += mx * p.speed * dt;
      p.pos.z += mz * p.speed * dt;
      p.heading = Math.atan2(mx, mz);
      p.mesh.rotation.y = p.heading;
      p.mesh.position.y = Math.abs(Math.sin(t * 6 + p.phase)) * 0.05;
    }
  });
}
