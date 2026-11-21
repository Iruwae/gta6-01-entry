// SOLMAR BAY — sky extras: stars and a moon that fade in at night, plus
// slow-drifting clouds. (The shader sky dome itself lives in main.js.)
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { scene } = ctx;
  const rng = (() => { let s = 777; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

  // Stars: points on a high dome.
  const starCount = 420;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = rng() * Math.PI * 2;
    const e = 0.15 + rng() * 1.2;
    const r = 640;
    positions[i * 3] = Math.cos(a) * Math.cos(e) * r;
    positions[i * 3 + 1] = Math.sin(e) * r;
    positions[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: 0, sizeAttenuation: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Moon: a pale disc high in the east.
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(18, 24),
    new THREE.MeshBasicMaterial({ color: 0xf2ead8, transparent: true, opacity: 0, fog: false }),
  );
  moon.position.set(420, 320, -260);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  // Clouds: flat translucent slabs drifting slowly.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffd9b0, transparent: true, opacity: 0.28 });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(70 + rng() * 60, 16 + rng() * 10), cloudMat.clone());
    c.rotation.x = -Math.PI / 2;
    c.position.set(-300 + rng() * 600, 120 + rng() * 40, -300 + rng() * 600);
    scene.add(c);
    clouds.push(c);
  }

  ctx.updates.push((dt) => {
    const n = ctx.state.dayNight.night;
    starMat.opacity = n * 0.9;
    moon.material.opacity = n * 0.95;
    for (const c of clouds) {
      c.position.x += dt * 1.5;
      if (c.position.x > 340) c.position.x = -340;
      c.material.opacity = 0.28 - n * 0.16;
    }
  });
  ctx.skyReady = true;
}
