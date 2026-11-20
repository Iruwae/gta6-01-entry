// Solmar Bay — ambient life (round 7 rebuild).
// Birds circling the bay, flags waving over the Strip, neon signs
// flickering, and a slow harbour haze of gulls. Pure flavour: no
// gameplay, no collisions, a few dozen cheap meshes and a light
// per-frame update.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const T = ctx.THREE || THREE;

  // ---- birds: dark dart shapes circling high over the city -----------
  const birdMat = new T.MeshBasicMaterial({ color: 0x1a1a22 });
  const wingGeo = new T.BoxGeometry(1.6, 0.06, 0.35);
  const birds = [];
  for (let i = 0; i < 6; i++) {
    const grp = new T.Group();
    const left = new T.Mesh(wingGeo, birdMat);
    left.position.x = -0.8;
    grp.add(left);
    const right = new T.Mesh(wingGeo, birdMat);
    right.position.x = 0.8;
    grp.add(right);
    scene.add(grp);
    birds.push({
      mesh: grp, left, right,
      r: 60 + i * 22,
      h: 42 + (i % 3) * 12,
      a: (i / 6) * Math.PI * 2,
      speed: 0.05 + (i % 3) * 0.015,
      cx: -40 + (i % 3) * 40,
      cz: 20 - (i % 2) * 60,
    });
  }

  // ---- flags over the Strip and downtown ------------------------------
  const flagCols = [0xff5a7a, 0x2fb3c9, 0xffc23d, 0x7a4ad8];
  const flags = [];
  for (let i = 0; i < 8; i++) {
    const fx = -70 + i * 20;
    const fz = i % 2 === 0 ? 128 : -8;
    const pole = new T.Mesh(
      new T.CylinderGeometry(0.08, 0.1, 7, 6),
      new T.MeshLambertMaterial({ color: 0x3a3a40 })
    );
    pole.position.set(fx, 3.5, fz);
    scene.add(pole);
    const cloth = new T.Mesh(
      new T.PlaneGeometry(2.6, 1.4),
      new T.MeshLambertMaterial({ color: flagCols[i % flagCols.length], side: T.DoubleSide })
    );
    cloth.position.set(fx + 1.35, 6.2, fz);
    scene.add(cloth);
    flags.push({ cloth, phase: i * 0.9 });
  }

  // ---- neon signs: bright boxes that flicker on the Strip -------------
  const neonCols = [0xff4d8a, 0x2fd8ff, 0xffc23d, 0x3dd68c];
  const signs = [];
  for (let i = 0; i < 6; i++) {
    const mat = new T.MeshBasicMaterial({ color: neonCols[i % neonCols.length] });
    const sign = new T.Mesh(new T.BoxGeometry(5 + (i % 3), 1, 0.3), mat);
    sign.position.set(-60 + i * 24, 8 + (i % 2) * 2, 131);
    scene.add(sign);
    signs.push({ mesh: sign, mat, seed: i * 1.7 });
  }

  // ---- harbour gulls: two slow dots out over the water edge -----------
  const gullMat = new T.MeshBasicMaterial({ color: 0xdddddd });
  const gulls = [];
  for (let i = 0; i < 3; i++) {
    const g = new T.Mesh(new T.SphereGeometry(0.5, 6, 4), gullMat);
    g.scale.set(2.2, 0.5, 0.6);
    scene.add(g);
    gulls.push({ mesh: g, a: i * 2.1, r: 30 + i * 8 });
  }

  ctx.api.ambient = { birds, flags, signs, gulls };
  S.ambient = ctx.api.ambient;

  ctx.updates.push((dt, t) => {
    for (const b of birds) {
      b.a += b.speed * dt;
      const x = b.cx + Math.cos(b.a) * b.r;
      const z = b.cz + Math.sin(b.a) * b.r;
      b.mesh.position.set(x, b.h + Math.sin(t * 0.7 + b.a) * 2, z);
      b.mesh.rotation.y = -b.a;
      const flap = Math.sin(t * 7 + b.a * 3) * 0.55;
      b.left.rotation.z = flap;
      b.right.rotation.z = -flap;
    }
    for (const f of flags) {
      f.cloth.rotation.y = Math.sin(t * 1.6 + f.phase) * 0.45;
      f.cloth.rotation.z = Math.sin(t * 2.3 + f.phase) * 0.08;
    }
    for (const s of signs) {
      // Mostly steady, with an occasional buzz-dip.
      const wob = Math.sin(t * 3.1 + s.seed) * Math.sin(t * 0.7 + s.seed * 2);
      const bright = wob > 0.86 ? 0.35 : 1;
      s.mat.color.setHex(neonCols[Math.floor(s.seed) % neonCols.length]);
      s.mesh.visible = bright > 0.5 || Math.sin(t * 9 + s.seed) > -0.4;
      s.mesh.scale.y = bright;
    }
    for (const g of gulls) {
      g.a += dt * 0.08;
      g.mesh.position.set(150 + Math.cos(g.a) * g.r, 26 + Math.sin(g.a * 2) * 2, 150 + Math.sin(g.a) * g.r);
      g.mesh.rotation.y = -g.a;
    }
  });
}
