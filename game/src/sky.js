// SOLMAR BAY — sky: the dome is owned by the boot hub; this module adds
// the stars and moon that fade in at night, and drifting clouds.
import * as THREE from '../vendor/three.module.min.js';
import { rand } from './random.js';

export function init(ctx) {
  const { scene, state: S } = ctx;

  // Stars: points scattered on the upper dome.
  const starCount = 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = rand(0, Math.PI * 2);
    const e = rand(0.12, 1.4);
    const r = 660;
    starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xfff6d8, size: 2.2, transparent: true, opacity: 0, sizeAttenuation: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Moon: a pale disc high in the east.
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xf4ead0, transparent: true, opacity: 0, fog: false });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(22, 24), moonMat);
  moon.position.set(380, 320, -420);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  // Drifting clouds: flat translucent slabs.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffd9b0, transparent: true, opacity: 0.16, depthWrite: false });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(rand(60, 130), rand(18, 34)), cloudMat);
    c.position.set(rand(-260, 260), rand(90, 170), rand(-260, 260));
    c.rotation.x = -Math.PI / 2;
    scene.add(c);
    clouds.push(c);
  }

  ctx.updates.push((dt) => {
    const night = S.dayNight.night;
    starMat.opacity = night * 0.9;
    moonMat.opacity = night * 0.95;
    for (const c of clouds) {
      c.position.x += dt * 1.2;
      if (c.position.x > 300) c.position.x = -300;
    }
  });
}
