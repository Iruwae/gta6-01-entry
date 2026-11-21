// SOLMAR BAY — vehicles: parked rides to steal, driving, tuning/perf.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';

const KIND_COLORS = { bike: 0xffb347, sport: 0xff4d6e, pickup: 0x5f8ac9, sedan: 0x4dc9a5 };
const KIND_SIZES = {
  bike: { w: 0.7, h: 0.9, l: 2.0 },
  sport: { w: 1.9, h: 0.75, l: 4.4 },
  pickup: { w: 2.0, h: 1.1, l: 5.0 },
  sedan: { w: 1.9, h: 0.9, l: 4.6 },
};

function buildMesh(kind, colorHex) {
  const g = new THREE.Group();
  const s = KIND_SIZES[kind];
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.l), bodyMat);
  body.position.y = 0.6;
  g.add(body);
  if (kind !== 'bike') {
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(s.w * 0.8, 0.6, s.l * 0.45),
      new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.2, metalness: 0.6 }),
    );
    cabin.position.set(0, 1.2, -0.2);
    g.add(cabin);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const spots = kind === 'bike'
    ? [[0, 0.36, 0.8], [0, 0.36, -0.8]]
    : [[-s.w / 2, 0.36, s.l / 3], [s.w / 2, 0.36, s.l / 3], [-s.w / 2, 0.36, -s.l / 3], [s.w / 2, 0.36, -s.l / 3]];
  for (const [x, y, z] of spots) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    g.add(w);
  }
  return g;
}

export function makeCar(kind, x, z, heading = 0, tune = null) {
  const base = CONFIG.vehicleBase[kind];
  const car = {
    kind,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    maxHealth: base.maxHealth,
    health: base.maxHealth,
    tune: tune || { nos: 0, engine: 0, armor: 0, paint: 'sunset' },
    mesh: null,
    aiPolice: false,
    callsign: null,
    brain: null,
    perf() {
      return base.perf + (this.tune.engine || 0) * 4 + (this.tune.nos || 0) * 6;
    },
  };
  car.mesh = buildMesh(kind, KIND_COLORS[kind] || 0xcccccc);
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading;
  return car;
}

export function init(ctx) {
  const { scene, state: S } = ctx;

  function addCar(car) {
    scene.add(car.mesh);
    S.cars.push(car);
    return car;
  }

  ctx.api.spawnCar = function spawnCar(kind, tune, x, z, heading = 0) {
    const car = makeCar(kind, x, z, heading, tune ? { ...tune } : null);
    return addCar(car);
  };

  // Parked rides the player can steal.
  addCar(makeCar('bike', -88, -64, 0.4));
  addCar(makeCar('sport', -102, -64, -0.3));
  addCar(makeCar('pickup', -116, -70, 0.2));
  addCar(makeCar('sedan', 30, 90, 1.2));

  ctx.updates.push((dt) => {
    const input = ctx.input;
    if (S.mode !== 'playing') {
      // Parked cars still sit still; just sync meshes.
      for (const c of S.cars) {
        if (c.mesh) { c.mesh.position.set(c.pos.x, 0, c.pos.z); c.mesh.rotation.y = c.heading; }
      }
      return;
    }
    const car = S.car;
    if (car) {
      const fwd = (input.isDown('KeyW') || input.isDown('ArrowUp')) ? 1 : 0;
      const back = (input.isDown('KeyS') || input.isDown('ArrowDown')) ? 1 : 0;
      const left = (input.isDown('KeyA') || input.isDown('ArrowLeft')) ? 1 : 0;
      const right = (input.isDown('KeyD') || input.isDown('ArrowRight')) ? 1 : 0;
      const maxSpeed = 14 + car.perf() * 0.45;
      if (fwd) car.speed += 16 * dt;
      else if (back) car.speed -= (car.speed > 0 ? 26 : 10) * dt;
      else {
        // Coast down.
        const drag = 6 * dt;
        car.speed = Math.abs(car.speed) <= drag ? 0 : car.speed - Math.sign(car.speed) * drag;
      }
      car.speed = Math.max(-9, Math.min(maxSpeed, car.speed));
      const steer = (left ? 1 : 0) - (right ? 1 : 0);
      if (steer !== 0 && Math.abs(car.speed) > 0.3) {
        car.heading += steer * dt * (0.9 + Math.min(1, Math.abs(car.speed) / 20) * 0.9) * Math.sign(car.speed);
      }
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      S.player.pos.copy(car.pos);
      S.player.heading = car.heading;
      S.player.vel.set(Math.sin(car.heading) * car.speed, 0, Math.cos(car.heading) * car.speed);
    } else {
      S.player.vel.set(0, 0, 0);
    }
    for (const c of S.cars) {
      if (c.mesh) { c.mesh.position.set(c.pos.x, 0, c.pos.z); c.mesh.rotation.y = c.heading; }
    }
  });
  ctx.vehiclesReady = true;
}
