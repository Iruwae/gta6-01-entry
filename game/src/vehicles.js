// SOLMAR BAY — vehicles: the player car, street traffic that follows the
// road grid, and police cruisers that chase. Arcade handling: throttle,
// steering that scales with speed, and a little drift.
import * as THREE from 'three';
import { CFG, PALETTE } from './config.js';

let CAR_SEQ = 0;

function buildCarMesh(color, police) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x182030, roughness: 0.15, metalness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 4.4), bodyMat);
  body.position.y = 0.55; body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), glassMat);
  cabin.position.set(0, 1.15, -0.2); cabin.castShadow = true;
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w); wheels.push(w);
  }
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff8c0, emissive: 0xffee88, emissiveIntensity: 1.2 });
  for (const sx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), lightMat);
    h.position.set(sx, 0.6, 2.22);
    g.add(h);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xc02020, emissive: 0x800000, emissiveIntensity: 0.8 });
  for (const sx of [-0.6, 0.6]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.1), tailMat);
    t.position.set(sx, 0.62, -2.22);
    g.add(t);
  }
  if (police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2244ff, emissiveIntensity: 1.6 }),
    );
    bar.position.set(0, 1.55, -0.2);
    bar.name = 'lightbar';
    g.add(bar);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.2, 4.42),
      new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.5 }),
    );
    stripe.position.y = 0.75;
    g.add(stripe);
  }
  return { group: g, wheels };
}

export class Car {
  constructor(scene, x, z, heading, color, kind) {
    this.id = ++CAR_SEQ;
    this.kind = kind || 'traffic'; // traffic | police | player
    this.scene = scene;
    const { group, wheels } = buildCarMesh(color, this.kind === 'police');
    this.mesh = group;
    this.wheels = wheels;
    scene.add(this.mesh);
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.hp = CFG.car.maxHp;
    this.dead = false;
    this.driver = null; // 'player' when the player is inside
    this.axis = 'x'; this.dir = 1; this.road = Math.round(z / 40) * 40;
    this.targetSpeed = 8 + Math.random() * 4;
    this.stuckT = 0;
    this.hitCooldown = 0; // seconds of immunity after a crash, so one hit cannot drain the car over many frames
    this.syncMesh();
  }
  syncMesh() {
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
    for (const w of this.wheels) w.rotation.x += this.speed * 0.016 * 2.4;
  }
  // Arcade drive: throttle -1..1, steer -1..1, dt seconds.
  drive(throttle, steer, dt) {
    if (this.dead) return;
    const maxF = CFG.car.maxSpeed * (this.kind === 'police' ? 1.08 : 1);
    if (throttle > 0) this.speed += CFG.car.accel * throttle * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= CFG.car.brake * dt;
      else this.speed = Math.max(-CFG.car.reverseMax, this.speed + CFG.car.accel * 0.6 * throttle * dt);
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
    }
    this.speed = Math.max(-CFG.car.reverseMax, Math.min(maxF, this.speed));
    const steerAmt = steer * CFG.car.steerMax * Math.min(1, Math.abs(this.speed) / 8 + 0.25);
    this.heading += steerAmt * (this.speed / CFG.car.maxSpeed) * 2.4 * dt * (this.speed >= 0 ? 1 : -1);
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    this.syncMesh();
  }
  damage(amount, fx) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;
      if (fx) fx.crash(this.pos.clone().setY(1));
    }
  }
  remove() { this.scene.remove(this.mesh); }
}

export class Traffic {
  constructor(scene, city, rng) {
    this.scene = scene; this.city = city; this.rng = rng;
    this.cars = [];
    for (let i = 0; i < CFG.traffic.cars; i++) this.spawnTrafficCar(true);
  }
  spawnTrafficCar(anywhere) {
    for (let tries = 0; tries < 8; tries++) {
      const road = this.rng.pick(this.city.roadLines);
      const along = this.rng.range(-180, 180);
      const axisX = this.rng.chance(0.5);
      const x = axisX ? along : road + 1.6;
      const z = axisX ? road + 1.6 : along;
      if (this.city.collideCircle(x, z, 3)) continue;
      const heading = axisX ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (Math.random() < 0.5 ? 0 : Math.PI);
      const car = new Car(this.scene, x, z, heading, this.rng.pick(PALETTE.car), 'traffic');
      car.axis = axisX ? 'x' : 'z';
      car.dir = axisX ? (heading > 0 ? 1 : -1) : (heading === 0 ? 1 : -1);
      car.road = road;
      car.speed = car.targetSpeed;
      this.cars.push(car);
      return car;
    }
    return null;
  }
  spawnPolice(x, z) {
    const car = new Car(this.scene, x, z, 0, 0xf0f0f0, 'police');
    car.speed = 0;
    this.cars.push(car);
    return car;
  }
  removeCar(car) {
    car.remove();
    this.cars = this.cars.filter((c) => c !== car);
  }
  carAhead(car, dist) {
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    let best = null, bd = dist;
    for (const o of this.cars) {
      if (o === car || o.dead) continue;
      const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z;
      const fwd = dx * fx + dz * fz;
      if (fwd > 0 && fwd < bd && Math.abs(dx * fz - dz * fx) < 3) { bd = fwd; best = o; }
    }
    return best;
  }
  update(dt, playerPos, playerCar, onCrash) {
    for (const car of [...this.cars]) {
      if (car.dead) continue;
      car.hitCooldown = Math.max(0, car.hitCooldown - dt);
      if (car.kind === 'traffic') this.updateTraffic(car, dt);
      else if (car.kind === 'police') this.updatePolice(car, dt, playerPos, playerCar, onCrash);
      // Building collision. The player's own car is handled by the game
      // (it bounces there too), so the traffic pass only pushes it out.
      const hit = this.city.resolveCircle(car.pos, 2.1);
      if (hit && car.kind !== 'player' && Math.abs(car.speed) > 4 && car.hitCooldown <= 0) {
        car.hitCooldown = 1.0;
        car.speed *= -0.25;
        car.damage(Math.min(20, Math.abs(car.speed) * 1.2), null);
        if (onCrash) onCrash(car.pos.clone().setY(1));
      }
      if (car.pos.x < -205 || car.pos.x > 205 || car.pos.z < -205 || car.pos.z > 205) {
        if (car.kind === 'traffic') { this.removeCar(car); this.spawnTrafficCar(true); }
      }
    }
    // Car-car collisions.
    for (let i = 0; i < this.cars.length; i++) for (let j = i + 1; j < this.cars.length; j++) {
      const a = this.cars[i], b = this.cars[j];
      if (a.dead || b.dead) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 4.2 && d > 0.01) {
        const push = (4.2 - d) / 2;
        const nx = dx / d, nz = dz / d;
        a.pos.x -= nx * push; a.pos.z -= nz * push;
        b.pos.x += nx * push; b.pos.z += nz * push;
        const rel = Math.abs(a.speed - b.speed);
        if (rel > 6 && a.hitCooldown <= 0 && b.hitCooldown <= 0) {
          a.hitCooldown = 0.8; b.hitCooldown = 0.8;
          a.damage(rel * 0.6, null); b.damage(rel * 0.6, null);
          if (onCrash) onCrash(a.pos.clone().lerp(b.pos, 0.5).setY(1));
        }
        a.syncMesh(); b.syncMesh();
      }
    }
    // Clean up dead wrecks (except the player's car, which the game handles).
    for (const car of [...this.cars]) {
      if (car.dead && car.kind !== 'player') {
        car.deadT = (car.deadT || 0) + dt;
        if (car.deadT > 6) { this.removeCar(car); if (car.kind === 'traffic') this.spawnTrafficCar(true); }
      }
    }
  }
  updateTraffic(car, dt) {
    // Follow the road grid: drive along the current axis; at an intersection,
    // sometimes turn onto the crossing road.
    const ahead = this.carAhead(car, 12);
    let target = car.targetSpeed;
    if (ahead) target = Math.min(target, Math.max(0, ahead.speed - 2));
    const throttle = car.speed < target ? 1 : 0;
    car.drive(throttle, 0, dt);
    const along = car.axis === 'x' ? car.pos.x : car.pos.z;
    const nextLine = Math.round((along + car.dir * 20) / 40) * 40;
    const distToLine = Math.abs(along + car.dir * 8 - nextLine);
    if (distToLine < 1.2 && Math.abs(along - nextLine) < 8) {
      if (this.rng.chance(0.3)) {
        // Turn onto the crossing road.
        const cross = nextLine;
        if (car.axis === 'x') {
          car.axis = 'z'; car.road = cross;
          car.dir = this.rng.chance(0.5) ? 1 : -1;
          car.heading = car.dir > 0 ? 0 : Math.PI;
          car.pos.x = cross + 1.6;
        } else {
          car.axis = 'x'; car.road = cross;
          car.dir = this.rng.chance(0.5) ? 1 : -1;
          car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          car.pos.z = cross + 1.6;
        }
        car.speed = Math.max(4, car.speed * 0.7);
        car.syncMesh();
      }
    }
    // Snap back onto the lane so drift never carries a car into a block.
    if (car.axis === 'x') car.pos.z += (car.road + 1.6 - car.pos.z) * Math.min(1, dt * 2);
    else car.pos.x += (car.road + 1.6 - car.pos.x) * Math.min(1, dt * 2);
    car.syncMesh();
  }
  updatePolice(car, dt, playerPos, playerCar, onCrash) {
    const target = playerCar && !playerCar.dead ? playerCar : null;
    const tx = target ? target.pos.x : playerPos.x;
    const tz = target ? target.pos.z : playerPos.z;
    const dx = tx - car.pos.x, dz = tz - car.pos.z;
    const dist = Math.hypot(dx, dz);
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, dh * 1.6));
    let throttle = 1;
    if (dist < 6) throttle = 0.3;
    if (dist < 3.5 && target) {
      // Ram: slow, steady damage to the player's car — not an instant kill.
      target.damage(10 * dt, null);
      car.speed = Math.max(0, car.speed - 6 * dt);
    }
    car.drive(throttle, steer, dt);
    // Light bar flash.
    const bar = car.mesh.getObjectByName('lightbar');
    if (bar) bar.material.emissive.setHex(Math.floor(performance.now() / 300) % 2 ? 0xff2222 : 0x2244ff);
  }
}
