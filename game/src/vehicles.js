// Vehicles for SOLMAR BAY. Cars and bikes are plain objects on S.cars
// with a mesh, a tune and a perf() that honours the tuning. Four rides
// are parked around the garage for the player to steal; police cars are
// added by police.js, never here. Driving is arcade: W/S accelerate and
// brake, A/D steer, speed shows in MPH on the HUD.
import { CONFIG } from './config.js';

const CAR_COLORS = {
  bike: 0xff7a9e,
  sedan: 0x5fb4c9,
  pickup: 0xe8a34c,
  sport: 0xff5a3d,
};

export function makeCar(ctx, kind, x, z, heading = 0) {
  const { THREE } = ctx;
  const stats = CONFIG.vehicleStats[kind] || CONFIG.vehicleStats.sedan;
  const car = {
    kind,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0, // metres per second, signed
    maxHealth: stats.maxHealth,
    health: stats.maxHealth,
    tune: { nos: 0, engine: 0, armor: 0, paint: 'sunset' },
    color: CAR_COLORS[kind] || 0xcccccc,
    mesh: null,
    perf() {
      const base = (CONFIG.vehicleStats[this.kind] || CONFIG.vehicleStats.sedan).perf;
      return base + this.tune.engine * 2 + this.tune.nos * 4;
    },
  };
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: car.color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1426 });
  if (kind === 'bike') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.0), bodyMat);
    frame.position.y = 0.55;
    group.add(frame);
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.18, 12);
    for (const wz of [-0.8, 0.8]) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.34, wz);
      group.add(wheel);
    }
  } else {
    const len = kind === 'pickup' ? 4.6 : kind === 'sport' ? 4.0 : 4.2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, len), bodyMat);
    body.position.y = 0.55;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, len * 0.45), darkMat);
    cabin.position.set(0, 1.2, kind === 'pickup' ? -0.5 : 0);
    group.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12);
    for (const [wx, wz] of [[-0.95, len / 2 - 0.7], [0.95, len / 2 - 0.7], [-0.95, -len / 2 + 0.7], [0.95, -len / 2 + 0.7]]) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.36, wz);
      group.add(wheel);
    }
    if (kind === 'sport') {
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.4), darkMat);
      spoiler.position.set(0, 1.15, -len / 2 + 0.2);
      group.add(spoiler);
    }
  }
  group.position.copy(car.pos);
  group.rotation.y = heading;
  ctx.scene.add(group);
  car.mesh = group;
  return car;
}

export function init(ctx) {
  const { state: S, input } = ctx;

  // The parked rides the player can steal.
  const parked = [
    makeCar(ctx, 'bike', -88, -64, 0.4),
    makeCar(ctx, 'sport', -102, -64, 0),
    makeCar(ctx, 'pickup', -96, -72, -0.3),
    makeCar(ctx, 'sedan', -116, -64, 0.2),
  ];
  for (const car of parked) S.cars.push(car);
  ctx.api.makeCar = (kind, x, z, heading) => makeCar(ctx, kind, x, z, heading);

  function update(dt) {
    if (S.mode !== 'playing') return;
    const car = S.car;
    if (!car) return;

    const stats = CONFIG.vehicleStats[car.kind] || CONFIG.vehicleStats.sedan;
    const topSpeed = 14 + stats.perf * 0.55 + car.tune.nos * 3;
    const accel = 16 + car.tune.engine * 2;
    let throttle = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) throttle = 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) throttle = -1;
    car.speed += throttle * accel * dt;
    // Drag + rolling resistance.
    car.speed -= car.speed * 0.6 * dt;
    if (Math.abs(car.speed) < 0.05 && throttle === 0) car.speed = 0;
    car.speed = Math.max(-8, Math.min(topSpeed, car.speed));

    let steer = 0;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) steer = 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) steer = -1;
    if (Math.abs(car.speed) > 0.2) {
      car.heading += steer * dt * 1.9 * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 8);
    }

    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.pos.x += fx * car.speed * dt;
    car.pos.z += fz * car.speed * dt;
    car.pos.x = Math.max(-190, Math.min(190, car.pos.x));
    car.pos.z = Math.max(-190, Math.min(190, car.pos.z));
    if (car.mesh) {
      car.mesh.position.copy(car.pos);
      car.mesh.rotation.y = car.heading;
    }
    S.player.pos.copy(car.pos);
  }

  ctx.updates.push(update);
}
