import * as THREE from '../vendor/three.module.min.js';

// SOLMAR BAY — sky life: slow clouds drifting over the bay and a few
// birds circling the rooftops. Pure atmosphere, zero gameplay, one
// cheap tick.
export function init(S) {
  const scene = S.scene;
  const rng = S.rng;

  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffe8d8,
    transparent: true,
    opacity: 0.55,
    fog: false,
  });
  const cloudGeo = new THREE.SphereGeometry(1, 10, 8);
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Group();
    const n = 3;
    for (let j = 0; j < n; j++) {
      const ball = new THREE.Mesh(cloudGeo, cloudMat);
      ball.position.set(j * 7 - n * 3.5, rng() * 2, rng() * 4 - 2);
      ball.scale.set(7 + rng() * 4, 2.6 + rng() * 1.4, 4 + rng() * 2);
      puff.add(ball);
    }
    puff.position.set(-220 + rng() * 440, 58 + rng() * 26, -180 + rng() * 360);
    scene.add(puff);
    clouds.push({ puff, speed: 0.6 + rng() * 0.9 });
  }

  const birdMat = new THREE.MeshBasicMaterial({ color: 0x1a1a22 });
  const birds = [];
  for (let i = 0; i < 4; i++) {
    const bird = new THREE.Group();
    const wingGeo = new THREE.BoxGeometry(1.6, 0.06, 0.5);
    const left = new THREE.Mesh(wingGeo, birdMat);
    left.position.x = -0.8;
    const right = new THREE.Mesh(wingGeo, birdMat);
    right.position.x = 0.8;
    bird.add(left, right);
    scene.add(bird);
    birds.push({
      bird, left, right,
      radius: 34 + i * 13,
      height: 30 + i * 5,
      angle: rng() * Math.PI * 2,
      speed: 0.14 + rng() * 0.08,
      flap: rng() * 10,
    });
  }

  const tick = (dt) => {
    for (const c of clouds) {
      c.puff.position.x += c.speed * dt;
      if (c.puff.position.x > 250) c.puff.position.x = -250;
    }
    for (const b of birds) {
      b.angle += b.speed * dt;
      b.flap += dt * 9;
      const x = Math.cos(b.angle) * b.radius;
      const z = Math.sin(b.angle) * b.radius;
      b.bird.position.set(x, b.height + Math.sin(b.flap * 0.5) * 1.2, z);
      b.bird.rotation.y = -b.angle;
      const flap = Math.sin(b.flap) * 0.55;
      b.left.rotation.z = flap;
      b.right.rotation.z = -flap;
    }
  };
  S._tick.push(tick);
  S.ambient = { clouds, birds };
  return S.ambient;
}
