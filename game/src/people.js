import * as THREE from '../vendor/three.module.min.js';

// SOLMAR BAY — pedestrians. A dozen walkers in bright shirts strolling
// the sidewalks, turning at intersections, bobbing as they go. Cheap
// on purpose: one shared body geometry, a few shared materials, and a
// single tick that moves them all.
const SHIRTS = [0xd84a4a, 0x4a7ad8, 0x4ad87a, 0xd8c24a, 0xe0e0e0, 0x9a4ad8, 0x4ad8c8];
const SKINS = [0xc89878, 0x8a5a3a, 0xe8b898, 0x6a3a22];

export function init(S) {
  const scene = S.scene;
  const rng = S.rng;
  const bodyGeo = new THREE.BoxGeometry(0.55, 1.15, 0.32);
  const headGeo = new THREE.SphereGeometry(0.23, 10, 8);
  const shirtMats = SHIRTS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
  const skinMats = SKINS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));

  S.people = [];
  for (let i = 0; i < 12; i++) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, shirtMats[Math.floor(rng() * shirtMats.length)]);
    body.position.y = 0.95;
    const head = new THREE.Mesh(headGeo, skinMats[Math.floor(rng() * skinMats.length)]);
    head.position.y = 1.75;
    group.add(body, head);
    scene.add(group);

    const vertical = rng() < 0.5;
    const line = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150][Math.floor(rng() * 11)];
    const side = rng() < 0.5 ? 7.6 : -7.6;
    const start = -170 + rng() * 340;
    S.people.push({
      group,
      vertical,
      fixed: line + side,
      along: start,
      dir: rng() < 0.5 ? 1 : -1,
      speed: 1 + rng() * 1.1,
      phase: rng() * Math.PI * 2,
    });
  }

  let t = 0;
  const tick = (dt) => {
    t += dt;
    for (const p of S.people) {
      p.along += p.dir * p.speed * dt;
      if (p.along > 178) { p.along = 178; p.dir = -1; }
      if (p.along < -178) { p.along = -178; p.dir = 1; }
      if (p.vertical) {
        p.group.position.set(p.fixed, Math.abs(Math.sin(t * 6 + p.phase)) * 0.06, p.along);
        p.group.rotation.y = p.dir > 0 ? 0 : Math.PI;
      } else {
        p.group.position.set(p.along, Math.abs(Math.sin(t * 6 + p.phase)) * 0.06, p.fixed);
        p.group.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
  };
  S._tick.push(tick);
  S.peopleTick = tick;
  return S.people;
}
