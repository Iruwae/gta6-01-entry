// Cars, bikes and trucks as plain objects on S.cars + driving (WASD).
// Police cars are added to S.cars by police.js, never here.
import { CONFIG } from './config.js';
import { V3 } from './state.js';

const KIND_COLORS = {
  bike: 0xff7a3d, sport: 0xff2a6d, pickup: 0x7ec98a, sedan: 0x5fb4c9, police: 0x2a4a8f,
};

export function createCar(ctx, kind, x, z) {
  const stats = CONFIG.vehicleStats[kind] || { maxHealth: 100, perf: 30 };
  const car = {
    kind,
    pos: new V3(x, 0, z),
    heading: 0,
    speed: 0,
    maxHealth: stats.maxHealth,
    health: stats.maxHealth,
    tune: { nos: 0, engine: 0, armor: 0, paint: 0 },
    aiPolice: false,
    mesh: null,
    perf() {
      return stats.perf + (this.tune.engine || 0) * 2 + (this.tune.nos || 0) * 3;
    },
  };
  const THREE = ctx.THREE;
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(kind === 'bike' ? 0.6 : 2, 0.7, kind === 'bike' ? 1.8 : 4.2),
    new THREE.MeshStandardMaterial({ color: KIND_COLORS[kind] || 0xcccccc }),
  );
  body.position.y = 0.6;
  g.add(body);
  if (kind !== 'bike') {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 2),
      new THREE.MeshStandardMaterial({ color: 0x1a0f2e }),
    );
    top.position.y = 1.2;
    g.add(top);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.9 }),
    );
    bar.position.y = 1.6;
    g.add(bar);
  }
  g.position.set(x, 0, z);
  ctx.scene.add(g);
  car.mesh = g;
  return car;
}

export function init(ctx) {
  const { state: S, input } = ctx;
  // Parked rides the player can steal.
  for (const spot of CONFIG.parked) {
    S.cars.push(createCar(ctx, spot.kind, spot.x, spot.z));
  }

  ctx.updates.push((dt) => {
    for (const c of S.cars) {
      if (c.mesh) {
        c.mesh.position.set(c.pos.x, 0, c.pos.z);
        c.mesh.rotation.y = c.heading;
      }
    }
    const car = S.car;
    if (!car) return;
    const maxSpeed = 20 + car.perf();
    let accel = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) accel += 26;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) accel -= 30;
    car.speed += accel * dt;
    car.speed -= car.speed * 0.4 * dt; // drag
    if (Math.abs(car.speed) < 0.05 && accel === 0) car.speed = 0;
    car.speed = Math.max(-12, Math.min(maxSpeed, car.speed));
    const steer = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? -1 : 0)
      + (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
    if (steer !== 0 && Math.abs(car.speed) > 0.5) {
      car.heading += steer * dt * 1.6 * Math.min(1, Math.abs(car.speed) / 10) * Math.sign(car.speed);
    }
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    S.player.pos.set(car.pos.x, 0, car.pos.z);
    S.player.heading = car.heading;
    S.player.speed = car.speed;
  });
}
