// SOLMAR BAY — vehicles. Cars and bikes are plain objects on S.cars:
// {kind, pos, heading, speed, maxHealth, health, tune, perf(), mesh}.
// perf() is the base perf for the kind plus tuning. Driving: WASD
// accelerate/brake/steer, speed in MPH on the HUD, gears by speed.
// Police cars are added by police.js, never here.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { clamp } from './random.js';

const BODY_COLORS = {
  bike: 0xc23a5e,
  sedan: 0x4a7a9e,
  pickup: 0x7a5a2e,
  sport: 0xff7a3d,
};

export function makeCar(ctx, kind, x, z, opts = {}) {
  const S = ctx.state;
  const base = CONFIG.vehicleStats[kind] || CONFIG.vehicleStats.sedan;
  const car = {
    kind,
    pos: new THREE.Vector3(x, 0, z),
    heading: opts.heading || 0,
    speed: 0,
    maxHealth: base.maxHealth,
    health: opts.health ?? base.maxHealth,
    tune: { nos: 0, engine: 0, armor: 0, paint: 'default', ...(opts.tune || {}) },
    color: opts.color || BODY_COLORS[kind] || 0x888888,
    aiPolice: false,
    traffic: false,
    callsign: null,
    brain: null,
    mesh: null,
    perf() {
      return base.perf + this.tune.engine * 4 + this.tune.nos * 6;
    },
  };
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: car.color });
  if (kind === 'bike') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.0), bodyMat);
    body.position.y = 0.7;
    group.add(body);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const wz of [-0.8, 0.8]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 10), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.35, wz);
      group.add(wheel);
    }
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), bodyMat);
    body.position.y = 0.6;
    group.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x1a2433 })
    );
    cabin.position.set(0, 1.2, kind === 'pickup' ? 0.9 : -0.2);
    group.add(cabin);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const [wx, wz] of [[-1.0, -1.4], [1.0, -1.4], [-1.0, 1.4], [1.0, 1.4]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.38, wz);
      group.add(wheel);
    }
  }
  group.position.copy(car.pos);
  ctx.scene.add(group);
  car.mesh = group;
  return car;
}

export function init(ctx) {
  const S = ctx.state;
  const { input } = ctx;

  ctx.api.makeCar = (kind, x, z, opts) => makeCar(ctx, kind, x, z, opts);

  // Parked, stealable: bike, sport car, pickup, sedan.
  const parked = [
    { kind: 'bike', x: -88, z: -64 },
    { kind: 'sport', x: -102, z: -64 },
    { kind: 'pickup', x: -96, z: -70 },
    { kind: 'sedan', x: -78, z: -70 },
  ];
  for (const p of parked) {
    const car = makeCar(ctx, p.kind, p.x, p.z);
    S.cars.push(car);
  }

  ctx.updates.push((dt) => {
    // Keep every mesh glued to its car object.
    for (const car of S.cars) {
      if (car.mesh) {
        car.mesh.position.copy(car.pos);
        car.mesh.position.y = 0;
        car.mesh.rotation.y = car.heading;
      }
    }
    if (S.mode !== 'playing' || S.cutscene) return;
    const car = S.car;
    if (!car) return;
    const topSpeed = car.perf() * 0.95;
    let accel = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) accel += 26;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) accel -= 34;
    car.speed = clamp(car.speed + accel * dt, -12, topSpeed);
    if (accel === 0) {
      car.speed *= Math.max(0, 1 - 0.6 * dt);
      if (Math.abs(car.speed) < 0.2) car.speed = 0;
    }
    let steer = 0;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) steer += 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) steer -= 1;
    if (steer !== 0 && Math.abs(car.speed) > 0.5) {
      car.heading += steer * 1.9 * dt * Math.sign(car.speed) * clamp(Math.abs(car.speed) / 12, 0.3, 1);
    }
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.pos.x += fx * car.speed * dt;
    car.pos.z += fz * car.speed * dt;
    car.pos.x = clamp(car.pos.x, -260, 260);
    car.pos.z = clamp(car.pos.z, -260, 260);
    S.player.vel.set(fx * car.speed, 0, fz * car.speed);
  });

  ctx.flags.vehicles = true;
}
