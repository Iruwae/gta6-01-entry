// Sky extras: stars + moon that fade in at night, drifting clouds.
// The shader sky dome itself lives in the boot hub (main.js).
export function init(ctx) {
  const { THREE, scene, state: S } = ctx;

  const starGeo = new THREE.BufferGeometry();
  const N = 400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * 0.9 + 0.05;
    const r = 650;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    pos[i * 3 + 1] = Math.sin(e) * r;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(18, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9c9, transparent: true, opacity: 0 }),
  );
  moon.position.set(-300, 260, -420);
  scene.add(moon);

  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 40),
      new THREE.MeshBasicMaterial({ color: 0x8a6a9a, transparent: true, opacity: 0.35 }),
    );
    c.position.set(Math.random() * 500 - 250, 120 + Math.random() * 60, Math.random() * 500 - 250);
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
