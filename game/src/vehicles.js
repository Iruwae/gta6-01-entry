// Vehicles: parked rides, driving, and the car factory the garage reuses.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

const COLORS = {
  bike: 0x2a2a33,
  sport: 0xff4d6d,
  pickup: 0xe8853d,
  sedan: 0x4d7dd1,
};

export function makeCar(THREE, kind, x, z, heading = 0, tune = null) {
  const base = CONFIG.vehicleBase[kind] || CONFIG.vehicleBase.sedan;
  const car = {
    kind,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    maxHealth: base.maxHealth,
    health: base.maxHealth,
    tune: tune || { nos: 0, engine: 0, armor: 0, paint: 'default' },
    mesh: null,
    perf() {
      return base.perf + (car.tune.engine || 0) * 4 + (car.tune.nos || 0) * 6;
    },
  };
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS[kind] || 0x888888, roughness: 0.5, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 });
  if (kind === 'bike') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.2), bodyMat);
    frame.position.y = 0.6;
    group.add(frame);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.7), darkMat);
    seat.position.set(0, 0.9, -0.4);
    group.add(seat);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), bodyMat);
    body.position.y = 0.55;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), darkMat);
    cabin.position.set(0, 1.15, -0.2);
    group.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 });
    for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.38, wz);
      group.add(w);
    }
  }
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  car.mesh = group;
  return car;
}

export function init(ctx) {
  const { THREE, scene, state: S } = ctx;
  const parked = [
    makeCar(THREE, 'bike', -88, -64, 0.4),
    makeCar(THREE, 'sport', -102, -64, -0.2),
    makeCar(THREE, 'pickup', -112, -58, 0.1),
    makeCar(THREE, 'sedan', -96, -52, 1.2),
  ];
  for (const car of parked) {
    S.cars.push(car);
    scene.add(car.mesh);
  }
  ctx.api.spawnCar = function spawnCar(kind, tune, x, z, heading = 0) {
    const car = makeCar(THREE, kind, x, z, heading, tune ? { ...tune } : null);
    S.cars.push(car);
    scene.add(car.mesh);
    return car;
  };
  ctx.updates.push((dt) => {
    const input = ctx.input;
    // Drive the player's car.
    if (S.car) {
      const car = S.car;
      const maxSpeed = 8 + car.perf() * 0.35;
      const fwd = input.isDown('KeyW') || input.isDown('ArrowUp');
      const back = input.isDown('KeyS') || input.isDown('ArrowDown');
      const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
      const right = input.isDown('KeyD') || input.isDown('ArrowRight');
      if (fwd) car.speed += 14 * dt;
      else if (back) car.speed -= 10 * dt;
      else {
        // drag
        car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
      }
      car.speed = Math.max(-8, Math.min(maxSpeed, car.speed));
      const steer = (left ? 1 : 0) - (right ? 1 : 0);
      if (Math.abs(car.speed) > 0.5) {
        car.heading += steer * 1.6 * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 8);
      }
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.pos.x = Math.max(-210, Math.min(210, car.pos.x));
      car.pos.z = Math.max(-210, Math.min(210, car.pos.z));
      S.player.pos.copy(car.pos);
      S.player.heading = car.heading;
    }
    // Keep every mesh glued to its car object (teleports included).
    for (const car of S.cars) {
      if (!car.mesh) continue;
      car.mesh.position.copy(car.pos);
      car.mesh.rotation.y = car.heading;
    }
  });
}

export default init;
