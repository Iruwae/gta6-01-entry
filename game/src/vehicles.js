// SOLMAR BAY — vehicles: parked cars to steal, tuning, and driving.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

const KIND_COLORS = {
  bike: 0xff5a5a,
  sport: 0xffb347,
  pickup: 0x5fb4c9,
  sedan: 0x7ec98a,
};

export function createCarMesh(THREE, kind, colorHex) {
  const group = new THREE.Group();
  const color = colorHex ?? KIND_COLORS[kind] ?? 0x888888;
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.2, metalness: 0.4 });
  if (kind === 'bike') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 2.3), bodyMat);
    body.position.y = 0.7;
    group.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.7), darkMat);
    seat.position.set(0, 1.0, -0.4);
    group.add(seat);
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.18, 12);
    for (const z of [0.85, -0.85]) {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.38, z);
      group.add(w);
    }
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.4), bodyMat);
    body.position.y = 0.6;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.1), darkMat);
    cabin.position.set(0, 1.2, kind === 'pickup' ? -0.9 : -0.2);
    group.add(cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
    for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.42, z);
      group.add(w);
    }
  }
  group.userData.bodyMat = bodyMat;
  return group;
}

export function makeVehicle(THREE, kind, x, z, heading = 0) {
  const stats = CONFIG.vehicleStats[kind] || CONFIG.vehicleStats.sedan;
  const mesh = createCarMesh(THREE, kind);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  const car = {
    kind,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    maxHealth: stats.maxHealth,
    health: stats.maxHealth,
    tune: { nos: false, engine: 0, armor: 0, paint: 0 },
    color: KIND_COLORS[kind] ?? 0x888888,
    mesh,
    perf() {
      return stats.perf + this.tune.engine * 3 + (this.tune.nos ? 8 : 0);
    },
  };
  return car;
}

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;
  const input = ctx.input;

  // Parked cars the player can steal.
  const parked = [
    makeVehicle(T, 'bike', -88, -64, 0.3),
    makeVehicle(T, 'sport', -102, -64, 0),
    makeVehicle(T, 'pickup', -108, -72, -0.4),
    makeVehicle(T, 'sedan', -84, -72, 0.5),
  ];
  for (const car of parked) {
    S.cars.push(car);
    scene.add(car.mesh);
  }

  ctx.updates.push((dt) => {
    const car = S.car;
    if (!car) return;
    const fwd = input.isDown('KeyW') || input.isDown('ArrowUp');
    const back = input.isDown('KeyS') || input.isDown('ArrowDown');
    const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
    const right = input.isDown('KeyD') || input.isDown('ArrowRight');
    const maxSpeed = 16 + car.perf() * 0.4;
    if (fwd) car.speed += 15 * dt;
    if (back) car.speed -= (car.speed > 0.5 ? 24 : 9) * dt;
    if (!fwd && !back) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
    car.speed = Math.max(-10, Math.min(maxSpeed, car.speed));
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    if (Math.abs(car.speed) > 0.3) {
      car.heading += steer * dt * (1.6 + Math.min(1, Math.abs(car.speed) / 20)) * Math.sign(car.speed);
    }
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    car.pos.x = Math.max(-185, Math.min(185, car.pos.x));
    car.pos.z = Math.max(-185, Math.min(185, car.pos.z));
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    // The player rides along.
    S.player.pos.copy(car.pos);
    S.player.heading = car.heading;
  });

  return { parked, makeVehicle, createCarMesh };
}

export default init;
