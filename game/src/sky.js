// SOLMAR BAY — sky extras: stars and a moon that fade in at night, plus
// slow drifting clouds. The shader sky dome itself lives in main.js.
import * as THREE from '../vendor/three.module.min.js';

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state;

  // Stars on the dome.
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
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    transparent: true,
    opacity: 0,
    sizeAttenuation: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Moon: a pale disc high over the bay.
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xf2ead8, transparent: true, opacity: 0 });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(22, 24), moonMat);
  moon.position.set(-260, 320, -420);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  // Clouds: flat pale slabs drifting over the city.
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffd9b0,
    transparent: true,
    opacity: 0.35,
  });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(60 + Math.random() * 60, 18 + Math.random() * 14), cloudMat);
    c.rotation.x = -Math.PI / 2;
    c.position.set((Math.random() - 0.5) * 500, 95 + Math.random() * 30, (Math.random() - 0.5) * 500);
    c.userData.speed = 1 + Math.random() * 2;
    scene.add(c);
    clouds.push(c);
  }

  ctx.updates.push((dt) => {
    const night = S.dayNight.night;
    starMat.opacity = night * 0.95;
    moonMat.opacity = night * 0.95;
    cloudMat.opacity = 0.35 - night * 0.22;
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 320) c.position.x = -320;
    }
  });

  ctx.flags.sky = true;
}
