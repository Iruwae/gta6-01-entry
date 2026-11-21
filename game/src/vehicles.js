// SOLMAR BAY — vehicles. Cars and bikes are plain objects on S.cars:
// {kind, pos, heading, speed, maxHealth, health, tune, perf(), mesh}.
// Parked rides the player can steal: bike (-88,-64), sport (-102,-64),
// pickup (-110,-58), sedan (30,-30). Driving: WASD accelerate/brake/
// steer, speed shows in MPH on the HUD, gears by speed. Police cars are
// added by police.js, never here.
import { CONFIG } from './config.js';

const BODY_COLORS = {
  bike: 0xff7a3d,
  sport: 0xff2e63,
  pickup: 0x5fb4c9,
  sedan: 0xe8a34c,
};

export function makeCarMesh(THREE, kind, colorOverride) {
  const g = new THREE.Group();
  const color = colorOverride !== undefined ? colorOverride : BODY_COLORS[kind] || 0xcccccc;
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.45 });
  const wide = kind === 'bike' ? 0.7 : 2;
  const long = kind === 'bike' ? 2.4 : 4.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(wide, 0.7, long), paint);
  body.position.y = 0.55;
  g.add(body);
  if (kind !== 'bike') {
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x14142a, metalness: 0.6, roughness: 0.25 }),
    );
    cabin.position.set(0, 1.15, -0.2);
    g.add(cabin);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: 0.9 });
  const wheelSpots = kind === 'bike'
    ? [[0, 0.36, 0.85], [0, 0.36, -0.85]]
    : [[-0.95, 0.36, 1.35], [0.95, 0.36, 1.35], [-0.95, 0.36, -1.35], [0.95, 0.36, -1.35]];
  for (const [x, y, z] of wheelSpots) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    g.add(w);
  }
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(wide * 0.8, 0.18, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffdf80, emissiveIntensity: 0.7 }),
  );
  lamp.position.set(0, 0.6, long / 2);
  g.add(lamp);
  return g;
}

export function init(ctx) {
  const { THREE, scene, state: S, input } = ctx;

  function makeCar(kind, x, z, heading = 0, colorOverride) {
    const stats = CONFIG.vehicleStats[kind] || CONFIG.vehicleStats.sedan;
    const car = {
      kind,
      pos: new THREE.Vector3(x, 0, z),
      heading,
      speed: 0,
      maxHealth: stats.maxHealth,
      health: stats.maxHealth,
      tune: { nos: 0, engine: 0, armor: 0, paint: 'Sunset Orange' },
      mesh: null,
      aiPolice: false,
    };
    car.perf = () => stats.perf + (car.tune.engine || 0) * 2 + (car.tune.nos || 0) * 3;
    const mesh = makeCarMesh(THREE, kind, colorOverride);
    mesh.position.copy(car.pos);
    mesh.rotation.y = car.heading;
    scene.add(mesh);
    car.mesh = mesh;
    return car;
  }
  ctx.api.makeCar = makeCar;

  S.cars.push(makeCar('bike', -88, -64));
  S.cars.push(makeCar('sport', -102, -64));
  S.cars.push(makeCar('pickup', -110, -58));
  S.cars.push(makeCar('sedan', 30, -30));

  ctx.updates.push((dt) => {
    // Sync every car mesh to its logical position.
    for (const car of S.cars) {
      if (!car.mesh) continue;
      car.mesh.position.copy(car.pos);
      car.mesh.rotation.y = car.heading;
    }
    if (S.mode !== 'playing') return;

    // E exits the car (entering is the player module's job).
    if (S.car && input.wasPressed('KeyE')) {
      const car = S.car;
      S.player.pos.copy(car.pos);
      S.player.pos.x += 2.5;
      S.player.heading = car.heading;
      car.speed = 0;
      S.car = null;
      return;
    }
    if (!S.car) return;
    const car = S.car;
    let accel = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) accel += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) accel -= 1;
    const topSpeed = 18 + car.perf() * 0.35;
    car.speed += accel * 14 * dt;
    if (accel === 0) car.speed *= Math.max(0, 1 - 1.2 * dt);
    if (car.speed > topSpeed) car.speed = topSpeed;
    if (car.speed < -8) car.speed = -8;
    let steer = 0;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) steer += 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) steer -= 1;
    if (Math.abs(car.speed) > 0.5) {
      car.heading += steer * 1.9 * dt * Math.sign(car.speed);
    }
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    S.player.pos.copy(car.pos);
    S.player.heading = car.heading;
    S.player.vel.set(Math.sin(car.heading) * car.speed, 0, Math.cos(car.heading) * car.speed);
  });
}
