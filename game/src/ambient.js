// SOLMAR BAY — ambient life (round 9 rebuild, builder B / world).
// Traffic sedans cruising the road grid (they brake when the player is
// right in front of them) and gulls circling over the harbour and beach.
// Traffic is sedans only, so the parked bike and pickup stay the unique
// finds of their kind. Written fresh from the build contract; no other
// game module is imported.
import * as THREE from '../vendor/three.module.min.js';

const ROAD_LINES = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
const BOUND = 195;
const TRAFFIC_COUNT = 8;

function buildSedanMesh(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.65, 1.9), paint);
  body.position.y = 0.5;
  g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.85, 1.6), glass);
  cab.position.set(-0.2, 1.05, 0);
  g.add(cab);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111214 });
  for (const [wx, wz] of [
    [1.38, 0.95],
    [1.38, -0.95],
    [-1.38, 0.95],
    [-1.38, -0.95],
  ]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.34, wz);
    g.add(w);
  }
  return g;
}

function spawnTraffic(scene, S) {
  const palette = [0x8a9bb0, 0xc2a35a, 0x7a6a9a, 0x9a9a92, 0xb0705a, 0x5a8a7a];
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const axis = Math.random() < 0.5 ? 'x' : 'z';
    const line = ROAD_LINES[(Math.random() * ROAD_LINES.length) | 0];
    const along = -BOUND + Math.random() * BOUND * 2;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const color = palette[(Math.random() * palette.length) | 0];
    const mesh = buildSedanMesh(color);
    const car = {
      kind: 'sedan',
      aiTraffic: true,
      pos: new THREE.Vector3(
        axis === 'x' ? along : line + (Math.random() * 4 - 2),
        0,
        axis === 'x' ? line + (Math.random() * 4 - 2) : along,
      ),
      heading: 0,
      speed: 0,
      cruise: 9 + Math.random() * 5,
      axis,
      dir,
      health: 100,
      maxHealth: 100,
      color,
      tune: { engine: 0, armor: 0, paint: color, nos: false },
      mesh,
      perf() {
        return 30 + this.tune.engine * 3 + (this.tune.nos ? 8 : 0);
      },
    };
    car.heading =
      axis === 'x' ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    mesh.position.copy(car.pos);
    mesh.rotation.y = car.heading;
    cars.push(car);
    S.cars.push(car);
    scene.add(mesh);
  }
  return cars;
}

function spawnGulls(scene) {
  const gulls = [];
  const wingMat = new THREE.MeshLambertMaterial({ color: 0xf2f2ee });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), wingMat);
    body.scale.set(1.6, 0.7, 0.7);
    g.add(body);
    const wingGeo = new THREE.BoxGeometry(0.9, 0.05, 0.35);
    const wl = new THREE.Mesh(wingGeo, wingMat);
    wl.position.set(0, 0.08, -0.55);
    const wr = new THREE.Mesh(wingGeo, wingMat);
    wr.position.set(0, 0.08, 0.55);
    g.add(wl);
    g.add(wr);
    scene.add(g);
    gulls.push({
      mesh: g,
      wl,
      wr,
      cx: 60 + (Math.random() * 80 - 40),
      cz: 130 + (Math.random() * 40 - 20),
      h: 42 + Math.random() * 18,
      r: 18 + Math.random() * 22,
      a: Math.random() * Math.PI * 2,
      speed: 0.25 + Math.random() * 0.2,
    });
  }
  return gulls;
}

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state || ctx.S;
  if (!Array.isArray(S.cars)) S.cars = [];

  const traffic = spawnTraffic(scene, S);
  const gulls = spawnGulls(scene);
  ctx.api.ambient = { traffic };

  ctx.updates.push((dt, t) => {
    const p = S.player && S.player.pos;
    for (const car of traffic) {
      // Brake for the player, then pull away again.
      let target = car.cruise;
      if (p) {
        const dx = car.pos.x - p.x;
        const dz = car.pos.z - p.z;
        if (dx * dx + dz * dz < 81) target = 0;
      }
      car.speed += (target - car.speed) * Math.min(1, dt * 2);
      if (car.axis === 'x') {
        car.pos.x += car.dir * car.speed * dt;
        if (car.pos.x > BOUND) car.pos.x = -BOUND;
        if (car.pos.x < -BOUND) car.pos.x = BOUND;
      } else {
        car.pos.z += car.dir * car.speed * dt;
        if (car.pos.z > BOUND) car.pos.z = -BOUND;
        if (car.pos.z < -BOUND) car.pos.z = BOUND;
      }
      car.mesh.position.set(car.pos.x, 0, car.pos.z);
      car.mesh.rotation.y = car.heading;
    }
    for (const gu of gulls) {
      gu.a += gu.speed * dt;
      gu.mesh.position.set(
        gu.cx + Math.cos(gu.a) * gu.r,
        gu.h + Math.sin(t * 0.7 + gu.a) * 2,
        gu.cz + Math.sin(gu.a) * gu.r,
      );
      gu.mesh.rotation.y = -gu.a;
      const flap = Math.sin(t * 6 + gu.a * 3) * 0.45;
      gu.wl.rotation.x = flap;
      gu.wr.rotation.x = -flap;
    }
  });
}
