// SOLMAR BAY — sky extras: stars, moon and drifting clouds.
// The boot hub owns the shader sky dome itself (S.skyDome).
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;

  // Stars: points on the upper dome, fading in at night.
  const starCount = 320;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.45 + 0.08;
    const r = 640;
    positions[i * 3] = Math.cos(a) * Math.cos(e) * r;
    positions[i * 3 + 1] = Math.sin(e) * r;
    positions[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0, sizeAttenuation: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Moon: a pale disc that fades in at night.
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xf2ead8, transparent: true, opacity: 0, fog: false });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(22, 24), moonMat);
  moon.position.set(-260, 300, -420);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  // Clouds: flat translucent blobs drifting slowly.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffd9b0, transparent: true, opacity: 0.28, fog: false });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(18 + Math.random() * 14, 10, 8), cloudMat);
    c.scale.y = 0.22;
    c.position.set(-240 + Math.random() * 480, 110 + Math.random() * 60, -240 + Math.random() * 480);
    scene.add(c);
    clouds.push(c);
  }

  ctx.updates.push((_dt) => {
    const night = S.dayNight.night;
    starMat.opacity = night * 0.9;
    moonMat.opacity = night * 0.95;
    for (const c of clouds) {
      c.position.x += 0.35 * _dt;
      if (c.position.x > 280) c.position.x = -280;
    }
  });

  return { stars, moon, clouds };
}

export default init;
