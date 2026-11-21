// SOLMAR BAY — sky dressing: stars and a moon that fade in at night,
// and slow clouds drifting over the bay.
export function init(ctx) {
  const { THREE, scene, state: S } = ctx;

  const starCount = 420;
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
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: 0 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(22, 24),
    new THREE.MeshBasicMaterial({ color: 0xf5ead0, transparent: true, opacity: 0, fog: false }),
  );
  moon.position.set(-320, 300, -420);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  const clouds = [];
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffc9a0, transparent: true, opacity: 0.22, fog: false });
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(90 + Math.random() * 70, 22 + Math.random() * 14), cloudMat);
    c.position.set(-260 + Math.random() * 520, 120 + Math.random() * 60, -260 + Math.random() * 520);
    c.rotation.x = -Math.PI / 2;
    scene.add(c);
    clouds.push(c);
  }

  ctx.updates.push((dt) => {
    const n = S.dayNight.night;
    starMat.opacity = n * 0.9;
    moon.material.opacity = n * 0.95;
    for (const c of clouds) {
      c.position.x += dt * 1.5;
      if (c.position.x > 300) c.position.x = -300;
    }
  });
}
