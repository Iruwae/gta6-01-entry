// vehicles.js — the cars, bikes and trucks parked around Solmar Bay,
// plus driving physics for whichever one the player is sitting in.
// Every vehicle is a plain object on S.cars: { kind, pos, heading,
// speed, maxHealth, tune, perf(), mesh }. Police cars are added to the
// same list by police.js; this module never touches aiPolice entries.
import * as THREE from '../vendor/three.module.min.js';

const SPECS = {
  bike:   { maxHealth: 60,  basePerf: 38, topSpeed: 30, accel: 22, color: 0xd8b13a },
  sedan:  { maxHealth: 100, basePerf: 32, topSpeed: 26, accel: 16, color: 0x7a8ba0 },
  pickup: { maxHealth: 130, basePerf: 28, topSpeed: 22, accel: 13, color: 0x9a5a3a },
  sport:  { maxHealth: 110, basePerf: 45, topSpeed: 36, accel: 24, color: 0xc23a4e },
};

const PARKED = [
  { kind: 'bike',   x: -88,  z: -64, heading: 0.4 },
  { kind: 'sport',  x: -102, z: -64, heading: -0.3 },
  { kind: 'pickup', x: 40,   z: -40, heading: 1.2 },
  { kind: 'sedan',  x: 20,   z: 80,  heading: 2.1 },
  { kind: 'sedan',  x: -40,  z: 40,  heading: -1.0 },
  { kind: 'sport',  x: 100,  z: 100, heading: 2.8 },
];

export function init(ctx) {
  const S = ctx.state || ctx.S;
  const scene = ctx.scene;
  const held = new Set();
  const driveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', (e) => { if (driveKeys.includes(e.code)) held.add(e.code); });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());

  function makeMesh(kind, color) {
    if (!scene || !THREE) return null;
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.8 });
    if (kind === 'bike') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.1), bodyMat);
      frame.position.y = 0.55;
      group.add(frame);
      for (const z of [-0.8, 0.8]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 12), darkMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0.34, z);
        group.add(wheel);
      }
    } else {
      const long = kind === 'pickup' ? 4.6 : kind === 'sport' ? 4.2 : 4.0;
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, long), bodyMat);
      body.position.y = 0.55;
      group.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, long * 0.45), darkMat);
      cabin.position.set(0, 1.15, kind === 'pickup' ? 0.6 : -0.2);
      group.add(cabin);
      for (const [x, z] of [[-0.85, -long / 2 + 0.7], [0.85, -long / 2 + 0.7], [-0.85, long / 2 - 0.7], [0.85, long / 2 - 0.7]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12), darkMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.36, z);
        group.add(wheel);
      }
    }
    scene.add(group);
    return group;
  }

  function makeCar(kind, x, z, heading) {
    const spec = SPECS[kind] || SPECS.sedan;
    const car = {
      kind,
      pos: new THREE.Vector3(x, 0, z),
      heading: heading || 0,
      speed: 0,
      health: spec.maxHealth,
      maxHealth: spec.maxHealth,
      basePerf: spec.basePerf,
      topSpeed: spec.topSpeed,
      accel: spec.accel,
      color: spec.color,
      tune: { engine: 0, armor: 0, paint: 0, nos: false },
      aiPolice: false,
      mesh: null,
      perf() {
        return this.basePerf + (this.tune.engine || 0) * 2 + (this.tune.nos ? 4 : 0);
      },
    };
    car.mesh = makeMesh(kind, spec.color);
    return car;
  }

  if (!Array.isArray(S.cars)) S.cars = [];
  if (!Array.isArray(S.garageCars)) S.garageCars = [];
  // Only seed the world once — a reload keeps the state's own list.
  if (S.cars.length === 0) {
    for (const p of PARKED) S.cars.push(makeCar(p.kind, p.x, p.z, p.heading));
  }
  if (ctx.api) {
    ctx.api.makeCar = makeCar;
    ctx.api.vehicleSpecs = SPECS;
  }

  (ctx.updates || []).push((dt) => {
    if (!S) return;
    // Keep every mesh glued to its logical position.
    for (const c of S.cars || []) {
      if (!c || !c.pos) continue;
      if (c.mesh) {
        c.mesh.position.set(c.pos.x, 0, c.pos.z);
        c.mesh.rotation.y = c.heading || 0;
        c.mesh.visible = true;
      }
    }
    const car = S.car;
    if (!car || S.mode !== 'playing' || S.cutscene) return;
    const up = held.has('KeyW') || held.has('ArrowUp');
    const down = held.has('KeyS') || held.has('ArrowDown');
    const left = held.has('KeyA') || held.has('ArrowLeft');
    const right = held.has('KeyD') || held.has('ArrowRight');
    const top = (car.topSpeed || 26) * (1 + ((car.tune && car.tune.engine) || 0) * 0.08);
    if (up) car.speed += (car.accel || 16) * dt;
    else if (down) car.speed -= (car.accel || 16) * 1.2 * dt;
    else {
      // Coast down gently.
      if (car.speed > 0) car.speed = Math.max(0, car.speed - 8 * dt);
      else if (car.speed < 0) car.speed = Math.min(0, car.speed + 8 * dt);
    }
    if (car.speed > top) car.speed = top;
    if (car.speed < -8) car.speed = -8;
    if (Math.abs(car.speed) > 0.2) {
      const steer = (left ? 1 : 0) - (right ? 1 : 0);
      car.heading += steer * 1.9 * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 8 + 0.3);
    }
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    car.pos.y = 0;
  });
}
