// SOLMAR BAY — vehicles: parked rides, driving, tuning-aware perf().
// Police cars are added by police.js, never here.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { clamp, withTrail } from './random.js';

const KIND_COLORS = { bike: '#ff7a9e', sport: '#ffb347', pickup: '#7ec98a', sedan: '#5fb4c9' };

function makeCarMesh(kind, colorHex) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.35, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2436, roughness: 0.15, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141018, roughness: 0.9 });
  if (kind === 'bike') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 2.0), paint);
    body.position.y = 0.55;
    group.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.7), dark);
    seat.position.set(0, 0.78, -0.3);
    group.add(seat);
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.18, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const z of [0.75, -0.75]) {
      const w = new THREE.Mesh(wheelGeo, dark);
      w.position.set(0, 0.34, z);
      group.add(w);
    }
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 4.4), paint);
    body.position.y = 0.55;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.2), glass);
    cabin.position.set(0, 1.05, kind === 'pickup' ? -0.9 : -0.2);
    group.add(cabin);
    if (kind === 'pickup') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 1.6), dark);
      bed.position.set(0, 0.95, 1.2);
      group.add(bed);
    }
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
      const w = new THREE.Mesh(wheelGeo, dark);
      w.position.set(x, 0.36, z);
      group.add(w);
    }
  }
  return group;
}

export function makeCar(kind, x, z, tune) {
  const stats = CONFIG.vehicleStats[kind] || CONFIG.vehicleStats.sedan;
  const car = {
    kind,
    pos: withTrail(new THREE.Vector3(x, 0, z)),
    heading: 0,
    speed: 0,
    maxHealth: stats.maxHealth,
    health: stats.maxHealth,
    tune: tune || { nos: false, engine: 0, armor: 0, paint: KIND_COLORS[kind] || '#ffb347' },
    color: (tune && tune.paint) || KIND_COLORS[kind] || '#ffb347',
    mesh: null,
    perf() {
      const base = (CONFIG.vehicleStats[this.kind] || {}).perf || 32;
      return base + (this.tune.engine || 0) * 4 + (this.tune.nos ? 10 : 0);
    },
  };
  car.mesh = makeCarMesh(kind, car.color);
  car.mesh.position.copy(car.pos);
  return car;
}

const PARKED = [
  { kind: 'bike', x: -88, z: -64 },
  { kind: 'sport', x: -102, z: -64 },
  { kind: 'pickup', x: -40, z: -100 },
  { kind: 'sedan', x: 40, z: 100 },
];

export function init(ctx) {
  const { scene, state: S } = ctx;
  for (const spot of PARKED) {
    const car = makeCar(spot.kind, spot.x, spot.z);
    scene.add(car.mesh);
    S.cars.push(car);
  }
  // Garage spawn helper: builds a car, puts it in the world and returns it.
  ctx.api.makeVehicle = (kind, x, z, tune) => {
    const car = makeCar(kind, x, z, tune ? { ...tune } : undefined);
    scene.add(car.mesh);
    S.cars.push(car);
    return car;
  };

  ctx.updates.push((dt) => {
    const car = S.car;
    if (!car) return;
    const input = ctx.input;
    const accel = 20 * (car.perf() / 32);
    const topSpeed = 26 + car.perf() * 0.28;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) car.speed += accel * dt;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) {
      car.speed -= (car.speed > 0.5 ? 30 : 12) * dt;
      if (car.speed < -8) car.speed = -8;
    }
    if (!input.isDown('KeyW') && !input.isDown('ArrowUp') && !input.isDown('KeyS') && !input.isDown('ArrowDown')) {
      car.speed -= car.speed * 0.6 * dt;
      if (Math.abs(car.speed) < 0.05) car.speed = 0;
    }
    car.speed = clamp(car.speed, -8, topSpeed);
    let steer = 0;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) steer += 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) steer -= 1;
    const steerFactor = clamp(Math.abs(car.speed) / 8, 0, 1);
    car.heading += steer * 1.9 * steerFactor * dt * (car.speed >= 0 ? 1 : -1);
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.pos.x += fx * car.speed * dt;
    car.pos.z += fz * car.speed * dt;
    car.pos.x = clamp(car.pos.x, -190, 190);
    car.pos.z = clamp(car.pos.z, -190, 190);
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    // The player rides along.
    S.player.pos.copy(car.pos);
    S.player.heading = car.heading;
    S.player.vel.set(fx * car.speed, 0, fz * car.speed);
  });
}
