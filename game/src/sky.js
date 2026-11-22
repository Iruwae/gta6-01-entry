// Sky extras: stars + moon that fade in at night, drifting clouds.
// The shader sky dome itself is owned by the boot hub (main.js).
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  // Stars: points on the upper dome.
  const starCount = 420;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.42;
    const r = 640;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) + 20;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0, sizeAttenuation: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  // Moon: a pale disc high over the bay.
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xf2ead8, transparent: true, opacity: 0, fog: false });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(26, 24), moonMat);
  moon.position.set(280, 330, -420);
  moon.lookAt(0, 0, 0);
  scene.add(moon);
  // Clouds: soft flat blobs drifting over the city.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xd8a0b8, transparent: true, opacity: 0.35, fog: false });
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(60 + Math.random() * 70, 16 + Math.random() * 14), cloudMat);
    c.position.set((Math.random() - 0.5) * 500, 120 + Math.random() * 60, (Math.random() - 0.5) * 500);
    c.rotation.x = -Math.PI / 2;
    scene.add(c);
    clouds.push(c);
  }
  ctx.updates.push((dt) => {
    const n = S.dayNight.night;
    starMat.opacity = n * 0.9;
    moonMat.opacity = n * 0.95;
    for (const c of clouds) {
      c.position.x += dt * 1.5;
      if (c.position.x > 320) c.position.x = -320;
    }
  });
}

export default init;
