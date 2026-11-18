// SOLMAR BAY — player.js
// Original open-world crime game for make.fun gta6-01. All code written
// from scratch in this session. No Rockstar / GTA assets, no network use.
// On-foot movement (camera-relative), car enter/exit + stealing, pistol
// shooting via a shoulder-origin raycast toward the crosshair aim point.
//
// Camera convention: S.camYaw is owned by the main loop. At yaw 0 the
// camera looks down -Z, so W moves along (-sin yaw, 0, -cos yaw).
// Meshes face +Z at heading 0: heading = atan2(dx, dz).

import * as THREE from 'three';
import { CFG } from './config.js';
import { S } from './state.js';
import { Car } from './vehicles.js';

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class Player {
  constructor(scene, world, opts = {}) {
    this.scene = scene;
    this.world = world;
    this.heading = opts.heading || 0;
    this.vel = new THREE.Vector3();
    this.health = 100;
    this.onFoot = true;
    this.car = null;
    this.armed = true;
    this.ammo = 12;
    this.reloadT = 0;
    this.reloading = false;
    this.shootCooldown = 0;
    this.invulnT = 0;
    this.walkBob = 0;
    this._prev = new Set(); // previous-frame key states for justPressed

    // Distinct look: white shirt, dark pants, red cap.
    const mesh = new THREE.Group();
    const body = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x222633, roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 });
    const red = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.8 });
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.3), dark);
    legs.position.y = 0.36;
    body.add(legs);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.7, 0.36), white);
    torso.position.y = 1.07;
    body.add(torso);
    const armGeo = new THREE.BoxGeometry(0.15, 0.64, 0.17);
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(armGeo, white);
      arm.position.set(sx * 0.4, 1.07, 0);
      body.add(arm);
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
    head.position.y = 1.64;
    body.add(head);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.52), red);
    cap.position.y = 1.84;
    body.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.24), red);
    brim.position.set(0, 1.8, 0.32);
    body.add(brim);
    mesh.add(body);
    this.body = body;
    mesh.position.set(opts.x || 0, 0, opts.z || 0);
    mesh.rotation.y = this.heading;
    scene.add(mesh);
    this.mesh = mesh;
    this.pos = mesh.position; // pos IS mesh.position (contract)
    mesh.userData.ref = this;
  }

  reset(x, z, heading) {
    this.pos.set(x, 0, z);
    this.heading = heading || 0;
    this.mesh.rotation.y = this.heading;
    this.vel.set(0, 0, 0);
    this.health = 100;
    if (S) S.health = 100;
    this.onFoot = true;
    this.car = null;
    this.ammo = 12;
    this.reloadT = 0;
    this.reloading = false;
    this.shootCooldown = 0;
    this.invulnT = 0;
    this.mesh.visible = true;
  }

  // justPressed via a previous-frame snapshot (input-systems pattern).
  _pressed(code, input) {
    const down = input.down(code);
    const was = this._prev.has(code);
    if (down) this._prev.add(code);
    else this._prev.delete(code);
    return down && !was;
  }

  update(dt, input) {
    if (dt <= 0) return;
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.reloading = false;
        this.ammo = 12;
      }
    }
    const pressedE = this._pressed('KeyE', input);
    const pressedR = this._pressed('KeyR', input);

    if (!this.onFoot) {
      if (this.car) {
        if (this.car.dead) {
          this.exitCar();
        } else {
          this.car.setPlayerInput(input, dt);
          this.pos.copy(this.car.pos);
          this.heading = this.car.heading;
        }
      } else {
        this.onFoot = true;
        this.mesh.visible = true;
      }
      if (pressedE && this.onFoot === false && this.car) this.exitCar();
      if (S) S.health = this.health;
      return;
    }

    // ---- on foot: camera-relative WASD ----
    const yaw = (S && typeof S.camYaw === 'number') ? S.camYaw : 0;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const fIn = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0)
      - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
    const rIn = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0)
      - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
    let mx = fx * fIn + rx * rIn;
    let mz = fz * fIn + rz * rIn;
    const mLen = Math.hypot(mx, mz);
    const walkSpeed = (CFG && CFG.player && CFG.player.walkSpeed) || 6;
    const sprintSpeed = (CFG && CFG.player && CFG.player.sprintSpeed) || 9;
    if (mLen > 0.01) {
      mx /= mLen;
      mz /= mLen;
      const sprinting = input.down('ShiftLeft') || input.down('ShiftRight');
      const speed = sprinting ? sprintSpeed : walkSpeed;
      this.pos.x += mx * speed * dt;
      this.pos.z += mz * speed * dt;
      const targetHeading = Math.atan2(mx, mz);
      this.heading = angleLerp(this.heading, targetHeading, Math.min(1, dt * 12));
      this.mesh.rotation.y = this.heading;
      // Walk bob + squash & stretch (game-feel): bob the inner body group,
      // never the collision position.
      this.walkBob += dt * speed * 1.6;
      this.body.position.y = Math.abs(Math.sin(this.walkBob)) * 0.07;
      const squash = 1 + Math.sin(this.walkBob * 2) * 0.02;
      const inv = 1 / Math.sqrt(squash);
      this.body.scale.set(inv, squash, inv);
    } else {
      this.body.position.y = 0;
      this.body.scale.set(1, 1, 1);
    }

    this._collideWorld();
    if (this.world && this.world.clampPos) this.world.clampPos(this.pos);

    // Enter the nearest car.
    if (pressedE) {
      const car = this._nearestCar(3.5);
      if (car) this.enterCar(car);
    }
    // Reload.
    if (pressedR && this.ammo < 12 && !this.reloading) this._startReload();
    // Fire: hold mouse or Space.
    if (input.mouseDown || input.down('Space')) this.shoot();
    if (S) S.health = this.health;
  }

  _collideWorld() {
    const world = this.world;
    if (!world || !world.colliders) return;
    const r = 0.6;
    for (const c of world.colliders) {
      const cx = clamp(this.pos.x, c.minX, c.maxX);
      const cz = clamp(this.pos.z, c.minZ, c.maxZ);
      let dx = this.pos.x - cx;
      let dz = this.pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        this.pos.x += (dx / d) * (r - d);
        this.pos.z += (dz / d) * (r - d);
      } else {
        const pl = (this.pos.x + r) - c.minX;
        const pr = c.maxX - (this.pos.x - r);
        const pt = (this.pos.z + r) - c.minZ;
        const pb = c.maxZ - (this.pos.z - r);
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) this.pos.x = c.minX - r;
        else if (m === pr) this.pos.x = c.maxX + r;
        else if (m === pt) this.pos.z = c.minZ - r;
        else this.pos.z = c.maxZ + r;
      }
    }
  }

  _nearestCar(maxDist) {
    const cars = (S && S.cars) || [];
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      if (!car || car.dead) continue;
      const d = Math.hypot(car.pos.x - this.pos.x, car.pos.z - this.pos.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  enterCar(car) {
    if (!car || car.dead) return;
    this.onFoot = false;
    this.car = car;
    if (S) S.car = car;
    car.driverless = false;
    car.parked = false;
    this.mesh.visible = false;
    // Stealing any car raises heat once per car.
    if (!car.stolen) {
      car.stolen = true;
      if (S) {
        S.heat = (S.heat || 0) + 25;
        if (S.stats) S.stats.carsStolen = (S.stats.carsStolen || 0) + 1;
      }
    }
    this.pos.copy(car.pos);
  }

  exitCar() {
    const car = this.car;
    this.car = null;
    if (S) S.car = null;
    this.onFoot = true;
    this.mesh.visible = true;
    if (car) {
      car.driverless = true;
      // Step out to the car's right side.
      const rx = -Math.cos(car.heading);
      const rz = Math.sin(car.heading);
      this.pos.set(car.pos.x + rx * 2.5, 0, car.pos.z + rz * 2.5);
      this.mesh.rotation.y = this.heading;
    }
    this.body.position.y = 0;
    this.body.scale.set(1, 1, 1);
  }

  _startReload() {
    this.reloading = true;
    this.reloadT = 1.2;
    if (S.audio && S.audio.reload) S.audio.reload();
  }

  shoot() {
    if (!this.onFoot || !this.armed || this.ammo <= 0
      || this.shootCooldown > 0 || this.reloading) return;
    this.ammo -= 1;
    this.shootCooldown = 0.25;
    if (S.stats) S.stats.shotsFired = (S.stats.shotsFired || 0) + 1;

    const targets = [];
    for (const p of (S.peds || [])) if (p.alive) targets.push(p.mesh);
    for (const c of (S.cops || [])) if (c.alive) targets.push(c.mesh);
    for (const car of (S.cars || [])) if (!car.dead) targets.push(car.mesh);
    // Shoulder-origin ray, two steps (third-person shooter standard):
    // 1. cast from the camera along the crosshair ray and take the first
    //    hit point — the shot then lands exactly where the crosshair is;
    // 2. fire from the player's right shoulder toward that point.
    // If nothing is under the crosshair, fall back to a gently descending
    // ray toward where the camera faces horizontally: a far point on the
    // raw camera ray would send the shot underground within ~10 m (the
    // camera looks down at a near point), while this keeps cars and peds
    // on the facing line hittable out to ~35 m.
    const shoulder = new THREE.Vector3(
      this.pos.x - Math.cos(this.heading) * 0.45,
      this.pos.y + 1.45,
      this.pos.z + Math.sin(this.heading) * 0.45,
    );
    const aimPoint = new THREE.Vector3();
    if (S.camera) {
      const camRay = new THREE.Raycaster();
      camRay.far = 60;
      const camDir = new THREE.Vector3();
      S.camera.getWorldDirection(camDir);
      camRay.set(S.camera.position, camDir);
      const camHits = camRay.intersectObjects(targets, true);
      if (camHits.length > 0) {
        aimPoint.copy(camHits[0].point);
      } else {
        const flat = new THREE.Vector3(camDir.x, 0, camDir.z);
        if (flat.lengthSq() < 0.0001) flat.set(0, 0, -1);
        flat.normalize();
        aimPoint.copy(S.camera.position).addScaledVector(flat, 40);
        aimPoint.y = shoulder.y - 1.0;
      }
    } else {
      aimPoint.set(
        this.pos.x + Math.sin(this.heading) * 40,
        this.pos.y + 1.5,
        this.pos.z + Math.cos(this.heading) * 40,
      );
    }
    const ray = new THREE.Raycaster();
    ray.far = 60;
    ray.set(shoulder, aimPoint.sub(shoulder).normalize());
    const hits = ray.intersectObjects(targets, true);
    let hitPoint = null;
    if (hits.length > 0) {
      const hit = hits[0];
      hitPoint = hit.point;
      let node = hit.object;
      let owner = null;
      while (node) {
        if (node.userData && node.userData.ref) { owner = node.userData.ref; break; }
        node = node.parent;
      }
      if (owner) {
        if (owner instanceof Car) {
          owner.damage(12);
          if (S.fx && S.fx.burst) S.fx.burst(hitPoint, 0xffdd88, 8, 5, 0.4);
          if (S.fx && S.fx.damageNumber) {
            S.fx.damageNumber({ x: hitPoint.x, y: hitPoint.y + 0.4, z: hitPoint.z }, '-12', '#ffdd88');
          }
        } else {
          // Ped or Cop.
          const died = owner.damage(34);
          if (S.fx && S.fx.burst) S.fx.burst(hitPoint, 0xcc2222, 10, 4, 0.5);
          if (died) {
            if (S.stats) S.stats.kills = (S.stats.kills || 0) + 1;
            if (S) S.heat = (S.heat || 0) + 30;
            // Mission crews track their own casualties.
            if (S.missions && typeof S.missions.registerKill === 'function') {
              S.missions.registerKill(owner);
            }
          } else {
            if (S) S.heat = (S.heat || 0) + 20;
          }
        }
      }
    }

    // Gunfire scares nearby pedestrians away from the shooter.
    if (S) S.lastDanger = { x: this.pos.x, z: this.pos.z };
    // Muzzle flash at the gun tip (player pos + forward, chest height).
    if (S.fx && S.fx.burst) {
      const tip = new THREE.Vector3(
        this.pos.x + Math.sin(this.heading) * 0.8,
        this.pos.y + 1.35,
        this.pos.z + Math.cos(this.heading) * 0.8,
      );
      S.fx.burst(tip, 0xffee66, 6, 4, 0.25);
      if (S.fx.hitStop) S.fx.hitStop(0.03); // 30 ms freeze — small tier
      if (S.fx.addShake) S.fx.addShake(0.15);
    }
    if (S.audio && S.audio.shot) S.audio.shot();
    if (this.ammo <= 0) this._startReload();
  }

  damage(amount, source) {
    if (this.invulnT > 0) return;
    this.health -= amount;
    this.invulnT = 0.25;
    if (S) S.health = this.health;
    if (S.fx && S.fx.addShake) S.fx.addShake(0.3);
    if (S.hud && S.hud.flashDamage) S.hud.flashDamage();
    if (this.health <= 0) {
      this.health = 0;
      if (S) {
        S.health = 0;
        S.mode = 'wasted'; // main loop shows the wasted screen
      }
    }
  }
}
