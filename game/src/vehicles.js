// SOLMAR BAY — vehicles: parked rides, driving, tuning-aware perf().
import * as THREE from '../vendor/three.module.min.js';

const COLORS = { bike: 0xff7a3d, sport: 0xff2e63, pickup: 0x7ec98a, sedan: 0x5fb4c9 };

export function makeCar(ctx, kind, x, z, heading = 0) {
  const { THREE, scene, config } = ctx;
  const base = config.vehicleKinds[kind] || config.vehicleKinds.sedan;
  const car = {
    kind,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    maxHealth: base.maxHealth,
    health: base.maxHealth,
    tune: { nos: 0, engine: 0, armor: 0, paint: '#' + COLORS[kind].toString(16).padStart(6, '0') },
    mesh: null,
    aiPolice: false,
    perf() {
      return base.perf + (this.tune.engine || 0) * 2 + (this.tune.nos || 0) * 4;
    },
  };
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS[kind], metalness: 0.4, roughness: 0.4 });
  if (kind === 'bike') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 2.2), bodyMat);
    body.position.y = 0.6;
    group.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.7), new THREE.MeshStandardMaterial({ color: 0x1a1a22 }));
    seat.position.set(0, 1.05, -0.3);
    group.add(seat);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.3), bodyMat);
    body.position.y = 0.65;
    group.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.65, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x18202e, metalness: 0.6, roughness: 0.25 })
    );
    cabin.position.set(0, 1.3, -0.2);
    group.add(cabin);
    const wheelGeo = new THREE.BoxGeometry(0.35, 0.7, 0.7);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const [wx, wz] of [[-1.0, 1.4], [1.0, 1.4], [-1.0, -1.4], [1.0, -1.4]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, 0.35, wz);
      group.add(w);
    }
  }
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  car.mesh = group;
  return car;
}

export function init(ctx) {
  const { state: S, input } = ctx;
  const parked = [
    ['bike', -88, -64, 0],
    ['sport', -102, -64, 0],
    ['pickup', -116, -70, 0.4],
    ['sedan', 20, -40, -0.5],
  ];
  for (const [kind, x, z, h] of parked) {
    const car = makeCar(ctx, kind, x, z, h);
    S.cars.push(car);
  }
  ctx.api.createVehicle = (kind, x, z, heading = 0) => makeCar(ctx, kind, x, z, heading);

  ctx.updates.push((dt) => {
    const car = S.car;
    if (!car) return;
    const maxSpeed = 18 + car.perf() * 0.35;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) car.speed += 26 * dt;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) car.speed -= 34 * dt;
    if (Math.abs(car.speed) < 0.4 && !input.isDown('KeyW') && !input.isDown('KeyS')) car.speed = 0;
    car.speed -= car.speed * 0.35 * dt;
    if (car.speed > maxSpeed) car.speed = maxSpeed;
    if (car.speed < -9) car.speed = -9;
    const steer = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
    if (steer !== 0 && Math.abs(car.speed) > 0.5) {
      car.heading += steer * 1.6 * dt * Math.min(1, Math.abs(car.speed) / 12) * (car.speed >= 0 ? 1 : -1);
    }
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    if (car.mesh) {
      car.mesh.position.set(car.pos.x, 0, car.pos.z);
      car.mesh.rotation.y = car.heading;
    }
    S.player.pos.set(car.pos.x, 0, car.pos.z);
    S.player.heading = car.heading;
    // Note: getting out (E) is handled by player.js, which owns the
    // enter/exit toggle — handling it here too would exit the car in the
    // same frame it was entered.
  });
}

export default { init };
