// SOLMAR BAY — sky extras: stars and moon that fade in at night, drifting clouds.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  // Stars.
  const starCount = 420;
  const pos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.45 + 0.08;
    const r = 640;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    pos[i * 3 + 1] = Math.sin(e) * r;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: 0, sizeAttenuation: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  // Moon.
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(18, 24),
    new THREE.MeshBasicMaterial({ color: 0xf2ead8, transparent: true, opacity: 0, fog: false })
  );
  moon.position.set(260, 300, -420);
  moon.lookAt(0, 0, 0);
  scene.add(moon);
  // Clouds.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffd9b0, transparent: true, opacity: 0.16 });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(90 + Math.random() * 80, 22 + Math.random() * 14), cloudMat);
    c.position.set(-350 + Math.random() * 700, 130 + Math.random() * 60, -300 + Math.random() * 500);
    c.rotation.x = -Math.PI / 2.4;
    scene.add(c);
    clouds.push(c);
  }
  ctx.updates.push((dt) => {
    const night = S.dayNight.night;
    starMat.opacity = night * 0.9;
    moon.material.opacity = night * 0.95;
    for (const c of clouds) {
      c.position.x += dt * 1.2;
      if (c.position.x > 420) c.position.x = -420;
    }
  });
}

export default { init };
