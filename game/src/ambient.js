// SOLMAR BAY — ambient life (round 8, written fresh from the spec).
// Birds circling overhead, flags waving, neon signs flickering —
// things that make the city feel alive without touching gameplay.
// Deliberately cheap: a few objects, a little sine math, no allocations
// in the frame loop.
import * as THREE from '../vendor/three.module.min.js';

const NEON_COLS = [0xff4ad8, 0x37e6ff, 0xffb347, 0x7dff5e];

export function init(ctx) {
  const T = ctx.THREE || THREE;
  const scene = ctx.scene;
  const S = ctx.state;

  // ---- birds: small dark darts circling high over the city ----
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x1a1620 });
  const birdGeo = new THREE.ConeGeometry(0.35, 1.6, 4);
  birdGeo.rotateX(Math.PI / 2);
  const birds = [];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(birdGeo, birdMat);
    scene.add(b);
    birds.push({
      mesh: b,
      cx: -40 + i * 18, cz: -30 + (i % 3) * 45,
      r: 34 + i * 7, h: 42 + (i % 4) * 9,
      a: i * 1.1, speed: 0.14 + (i % 3) * 0.05,
    });
  }

  // ---- flags on poles near the Strip and the beach ----
  const flags = [];
  const flagCols = [0xff6b6b, 0xffb347, 0x37e6ff, 0x7dff5e, 0xff4ad8];
  for (let i = 0; i < 5; i++) {
    const x = -50 + i * 25, z = i % 2 === 0 ? 120 : 158;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 7, 6),
      new THREE.MeshLambertMaterial({ color: 0x3a3840 })
    );
    pole.position.set(x, 3.5, z); scene.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.5),
      new THREE.MeshBasicMaterial({ color: flagCols[i % flagCols.length], side: THREE.DoubleSide })
    );
    flag.position.set(x + 1.35, 6.2, z);
    scene.add(flag);
    flags.push({ mesh: flag, phase: i * 1.3 });
  }

  // ---- neon signs on the Strip that flicker ----
  const neons = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: NEON_COLS[i % NEON_COLS.length], transparent: true, opacity: 1,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 0.5), mat);
    sign.position.set(-55 + i * 22, 7 + (i % 3) * 3, 118);
    scene.add(sign);
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 7, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x222028 })
    );
    pole.position.set(-58 + i * 22, 3.5, 118);
    scene.add(pole);
    neons.push({ mat, phase: i * 2.1 });
  }

  // A few drifting paper specks low over the streets.
  const speckMat = new THREE.MeshBasicMaterial({ color: 0xd8c9a8, transparent: true, opacity: 0.7 });
  const specks = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), speckMat);
    s.position.set(-100 + i * 28, 1 + (i % 3), -80 + (i * 31) % 160);
    scene.add(s);
    specks.push({ mesh: s, phase: i * 0.9, speed: 0.5 + (i % 3) * 0.2 });
  }

  ctx.api.ambient = {
    birds: birds.map((b) => b.mesh),
    flags: flags.map((f) => f.mesh),
    neonMaterials: neons.map((n) => n.mat),
  };

  function flickerNeonList(list, time, glow, rate, step) {
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      m.transparent = true;
      const stutter = Math.sin(time * 7 + i * step) > 0.96 ? 0.25 : 1;
      m.opacity = glow * (0.85 + 0.15 * Math.sin(time * rate + i * 1.7)) * stutter;
    }
  }

  ctx.updates.push(function ambientUpdate(dt, t) {
    const night = (S && S.dayNight && S.dayNight.night) || 0;
    const time = t || 0;

    for (const b of birds) {
      b.a += b.speed * dt;
      b.mesh.position.set(
        b.cx + Math.cos(b.a) * b.r,
        b.h + Math.sin(time * 0.7 + b.a * 2) * 2.5,
        b.cz + Math.sin(b.a) * b.r
      );
      b.mesh.rotation.y = Math.atan2(-Math.sin(b.a), -Math.cos(b.a)) + Math.PI / 2;
    }

    for (const f of flags) {
      f.mesh.rotation.y = Math.sin(time * 2.2 + f.phase) * 0.45;
      f.mesh.scale.x = 1 + Math.sin(time * 3.1 + f.phase) * 0.12;
    }

    // Neon burns brighter at night and stutters now and then.
    const glow = 0.45 + night * 0.55;
    flickerNeonList(neons.map((n) => n.mat), time, glow, 3.7, 2.1);
    try {
      const extra = ctx.api.districtInfo && ctx.api.districtInfo.neonMaterials;
      flickerNeonList(extra, time, glow, 4.3, 1.7);
      const cityNeon = ctx.api.city && ctx.api.city.neonMaterials;
      flickerNeonList(cityNeon, time, glow, 3.9, 2.3);
    } catch (e) { /* neon is cosmetic; never break the frame */ }

    for (const s of specks) {
      s.mesh.position.x += s.speed * dt;
      s.mesh.position.y = 1 + Math.sin(time * 1.4 + s.phase) * 0.6;
      s.mesh.rotation.z = time * 0.8 + s.phase;
      if (s.mesh.position.x > 180) s.mesh.position.x = -180;
    }
  });
}
