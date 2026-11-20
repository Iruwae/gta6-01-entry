// juice.js — game feel: screen shake and impact bursts.
// Other modules call ctx.api.shake(amount) or ctx.api.impact(pos);
// this module owns the trauma value, the camera offset, and a small
// pooled particle system so bursts never allocate mid-frame.
// Written fresh for round 8 from the shared contract.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const S = ctx.state;
  const scene = ctx.scene;
  const camera = ctx.camera;

  const juice = { trauma: 0 };
  S.juice = juice;

  // ---- particle pool: one Points cloud, fixed size ----
  const MAX = 240;
  const positions = new Float32Array(MAX * 3);
  for (let i = 0; i < MAX; i++) positions[i * 3 + 1] = -100;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffc27a, size: 0.35, transparent: true, opacity: 0, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const parts = [];
  for (let i = 0; i < MAX; i++) {
    parts.push({ alive: false, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });
  }
  let cursor = 0;

  function burst(pos, color, n, speed) {
    if (!pos) return;
    const count = n || 14;
    const sp = speed || 6;
    for (let k = 0; k < count; k++) {
      const p = parts[cursor];
      cursor = (cursor + 1) % MAX;
      p.alive = true;
      p.life = 0.5 + Math.random() * 0.5;
      p.x = pos.x;
      p.y = (pos.y || 0) + 0.6;
      p.z = pos.z;
      const a = Math.random() * Math.PI * 2;
      const s = sp * (0.4 + Math.random() * 0.8);
      p.vx = Math.cos(a) * s;
      p.vz = Math.sin(a) * s;
      p.vy = 2 + Math.random() * 5;
    }
    mat.color.set(color === undefined ? 0xffc27a : color);
  }

  ctx.api.shake = (amount) => {
    juice.trauma = Math.min(1, juice.trauma + (amount || 0.3));
  };
  ctx.api.burst = burst;
  ctx.api.impact = (pos) => {
    burst(pos, 0xffb35c, 14, 7);
    juice.trauma = Math.min(1, juice.trauma + 0.25);
  };
  ctx.api.sparks = (pos) => burst(pos, 0xffe9a8, 10, 5);

  // ---- per-frame: decay the shake, apply the offset, step particles ----
  const prevOffset = new THREE.Vector3();
  ctx.updates.push((dt) => {
    juice.trauma = Math.max(0, juice.trauma - dt * 1.4);
    camera.position.sub(prevOffset);
    prevOffset.set(0, 0, 0);
    if (juice.trauma > 0.001) {
      const s = juice.trauma * juice.trauma * 0.55;
      prevOffset.set(
        (Math.random() - 0.5) * s,
        (Math.random() - 0.5) * s,
        (Math.random() - 0.5) * s,
      );
      camera.position.add(prevOffset);
    }
    let any = false;
    for (let i = 0; i < MAX; i++) {
      const p = parts[i];
      if (!p.alive) { positions[i * 3 + 1] = -100; continue; }
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        positions[i * 3 + 1] = -100;
        continue;
      }
      p.vy -= 12 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.4; }
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      any = true;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = any ? 0.95 : 0;
  });
}
