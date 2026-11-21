// Sky dressing for SOLMAR BAY: stars and a moon that fade in at night,
// plus slow-drifting clouds. The shader dome itself lives in main.js.
export function init(ctx) {
  const { THREE, state: S } = ctx;

  // Stars: a cloud of points high above the city.
  const starCount = 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.45 + 0.12;
    const r = 640;
    starPos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    starPos[i * 3 + 1] = Math.sin(e) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: 0 });
  const stars = new THREE.Points(starGeo, starMat);
  ctx.scene.add(stars);

  // The moon: a pale disc that hangs over the bay at night.
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(22, 24),
    new THREE.MeshBasicMaterial({ color: 0xf2ead0, transparent: true, opacity: 0, fog: false }),
  );
  moon.position.set(-260, 260, -420);
  moon.lookAt(0, 0, 0);
  ctx.scene.add(moon);

  // Clouds: flat pale slabs drifting slowly across the sunset.
  const clouds = [];
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffd9c0, transparent: true, opacity: 0.35 });
  for (let i = 0; i < 7; i++) {
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(70 + Math.random() * 60, 10 + Math.random() * 8), cloudMat);
    cloud.position.set(-300 + Math.random() * 600, 90 + Math.random() * 60, -320 + Math.random() * 500);
    cloud.rotation.x = -0.2;
    ctx.scene.add(cloud);
    clouds.push(cloud);
  }

  ctx.updates.push((dt) => {
    const n = S.dayNight.night;
    starMat.opacity = n * 0.9;
    moon.material.opacity = n * 0.95;
    for (const cloud of clouds) {
      cloud.position.x += dt * 1.5;
      if (cloud.position.x > 360) cloud.position.x = -360;
      cloud.material.opacity = 0.35 * (1 - n * 0.6);
    }
  });
}
