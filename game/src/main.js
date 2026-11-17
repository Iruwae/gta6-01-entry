// SOLMAR BAY — bootstrap & fixed-step loop. Owns the wiring between systems:
// the player on foot and in a car, shooting, the wanted level and the police
// who answer it, the camera, the screens, and the save. Game rules live in
// their own modules; this file only moves the player and the clock.
import * as THREE from 'three';
import { CFG } from './config.js';
import { RNG } from './random.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { City } from './city.js';
import { Car, Traffic } from './vehicles.js';
import { People, makePersonMesh } from './people.js';
import { Particles } from './particles.js';
import { Juice } from './juice.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { SaveData } from './state.js';
import { stageShot } from './shots.js';

const FIXED = 1 / 60;
const GARAGE = { x: 100, z: -100 };
const SAFEHOUSE = { x: -180, z: -180 };

export class Game {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.seed = Number(params.get('seed') || 7) || 7;
    this.shot = params.get('shot') || null;
    this.rng = new RNG(this.seed);
    this.state = 'title';
    this.time = 0;
    this.cash = CFG.money.startCash;
    this.wanted = 0;
    this.crimeCooldown = 0;
    this.wantedQuiet = 0;
    this.fireT = 0;
    this.policeSpawnT = 0;
    this.bustedT = 0;
    this.shotStaged = false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('app').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CFG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 600);
    this.camera.position.set(30, 26, 60);
    this.camera.lookAt(0, 0, 0);

    this.input = new Input(this.renderer.domElement);
    this.audio = new AudioSys();
    this.city = new City(this.scene, this.rng);
    this.traffic = new Traffic(this.scene, this.city, this.rng);
    this.people = new People(this.scene, this.city, this.rng);
    this.particles = new Particles(this.scene);
    this.hud = new HUD();
    this.juice = new Juice(this.camera,
      document.getElementById('flash'), document.getElementById('vignette'),
      document.getElementById('fx-layer'));
    this.missions = new Missions(this);
    this.raycaster = new THREE.Raycaster();

    // The player avatar: Marco Solis, teal shirt, dark jeans.
    this.playerMesh = makePersonMesh(0x2aa8a0, 0x2a2a3a);
    this.scene.add(this.playerMesh);
    this.playerPosV = new THREE.Vector3(88, 0, -88);
    this.playerYaw = Math.PI;
    this.playerVy = 0;
    this.playerHp = CFG.player.maxHp;
    this.playerCar = null;
    this.camYaw = Math.PI;
    this.camPitch = 0.32;
    this.walkT = 0;
    this._camPos = new THREE.Vector3(30, 26, 60);
    this._camLook = new THREE.Vector3(0, 0, 0);

    this.buildMarker();
    this.buildGarageSign();
    this.bindScreens();
    this.loadSave();
    window.addEventListener('resize', () => this.onResize());
    window.__game = this;
    window.__shotReady = false;

    let last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      let dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.frame(dt);
    };
    requestAnimationFrame(loop);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ---- 3D markers -------------------------------------------------------
  buildMarker() {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 3.2, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    this.scene.add(ring);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 30, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.y = 15;
    this.scene.add(beam);
    this.markerRing = ring;
    this.markerBeam = beam;
  }
  buildGarageSign() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 96;
    const g = canvas.getContext('2d');
    g.fillStyle = '#101418'; g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#ffd24a'; g.font = 'bold 52px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('BAYLINE GARAGE', 256, 50);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 2.25),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    sign.position.set(GARAGE.x, 6, GARAGE.z - 13);
    this.scene.add(sign);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(14, 5, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.8 }),
    );
    box.position.set(GARAGE.x, 2.5, GARAGE.z - 8);
    box.castShadow = true;
    this.scene.add(box);
    this.city.colliders.push({ x: GARAGE.x, z: GARAGE.z - 8, hx: 7, hz: 5 });
  }

  // ---- screens ----------------------------------------------------------
  bindScreens() {
    const show = (id) => {
      for (const s of document.querySelectorAll('.screen')) s.style.display = 'none';
      document.getElementById(id).style.display = 'flex';
      document.getElementById('overlay').style.display = 'flex';
    };
    this.showScreen = show;
    document.getElementById('btn-start').addEventListener('click', () => this.startGame(false));
    document.getElementById('btn-continue').addEventListener('click', () => this.startGame(true));
    document.getElementById('btn-resume').addEventListener('click', () => this.resume());
    document.getElementById('btn-restart').addEventListener('click', () => this.restartAfterBusted());
    document.getElementById('btn-quit-title').addEventListener('click', () => {
      this.state = 'title';
      this.hud.hide();
      show('screen-title');
    });
    document.getElementById('btn-mute').addEventListener('click', () => {
      this.audio.ensure();
      const m = this.audio.toggleMute();
      document.getElementById('btn-mute').textContent = m ? '🔇' : '🔊';
    });
    const saved = SaveData.load();
    document.getElementById('btn-continue').style.display = saved ? 'inline-block' : 'none';
    document.getElementById('best-line').textContent = saved
      ? `Save found — $${saved.cash} in pocket, ${saved.missionsDone} job${saved.missionsDone === 1 ? '' : 's'} done`
      : 'No save yet — Solmar Bay is waiting.';
  }
  startGame(continueSave) {
    this.audio.ensure();
    document.getElementById('overlay').style.display = 'none';
    if (continueSave) this.loadSave();
    else {
      this.cash = CFG.money.startCash;
      this.missions.index = 0; this.missions.doneCount = 0; this.missions.active = null;
    }
    this.state = 'play';
    this.playerHp = CFG.player.maxHp;
    this.setWanted(0);
    this.hud.show();
    this.hud.setCash(this.cash);
    this.hud.setHealth(this.playerHp, CFG.player.maxHp);
    this.hud.setWanted(0);
    this.hud.setObjective(this.missions.active ? this.missions.stepDef().text : 'Press E at the Bayline garage to start the first job');
    this.hud.setMissionTitle(this.missions.currentDef() ? this.missions.currentDef().title : 'FREE ROAM');
    this.hud.showToast('Welcome to Solmar Bay, Marco. WASD to move, F to steal a car, mouse to shoot.');
    this.saveGame();
  }
  resume() {
    document.getElementById('overlay').style.display = 'none';
    this.state = 'play';
  }
  restartAfterBusted() {
    document.getElementById('overlay').style.display = 'none';
    this.state = 'play';
    this.playerHp = CFG.player.maxHp;
    this.setWanted(0);
    this.playerPosV.set(88, 0, -88);
    this.playerYaw = Math.PI;
    if (this.playerCar) { this.playerCar.driver = null; this.playerCar = null; }
    this.hud.setHealth(this.playerHp, CFG.player.maxHp);
    this.hud.setWanted(0);
    this.hud.showToast('You walked out of the precinct with a warning. Back to work.');
  }
  loadSave() {
    const d = SaveData.load();
    if (!d) return;
    this.cash = d.cash;
    this.missions.index = Math.min(d.missionIndex || 0, 4);
    this.missions.doneCount = d.missionsDone || 0;
  }
  saveGame() {
    SaveData.store({ cash: this.cash, missionIndex: this.missions.index, missionsDone: this.missions.doneCount });
  }
  addCash(n) {
    this.cash += n;
    this.hud.setCash(this.cash);
    this.audio.cash();
    this.saveGame();
  }

  // ---- wanted -----------------------------------------------------------
  setWanted(n) {
    this.wanted = Math.max(0, Math.min(CFG.wanted.maxStars, n));
    this.wantedQuiet = 0;
    this.hud.setWanted(this.wanted);
    this.audio.setSiren(this.wanted > 0, this.time);
  }
  addWanted(n, reason) {
    if (this.crimeCooldown > 0) return;
    this.crimeCooldown = 2;
    if (this.wanted < CFG.wanted.maxStars) {
      this.setWanted(this.wanted + n);
      this.hud.showToast(reason + ' — wanted level ' + this.wanted);
    }
  }
  playerPos() { return this.playerCar ? this.playerCar.pos : this.playerPosV; }
  playerHeading() { return this.playerCar ? this.playerCar.heading : this.playerYaw; }

  // ---- frame ------------------------------------------------------------
  frame(dt) {
    // Screenshot staging runs once, on the first frames, before play starts.
    if (this.shot && !this.shotStaged) {
      this.shotStaged = true;
      stageShot(this, this.shot);
      window.__shotReady = true;
    }
    const scale = this.state === 'play' ? this.juice.update(dt) : 1;
    const step = FIXED * scale;
    if (this.state === 'play' && scale > 0) {
      this.time += step;
      this.update(step);
    } else if (this.state === 'title') {
      // Slow orbit over the city behind the title screen.
      const t = performance.now() / 1000;
      this.camera.position.set(Math.sin(t * 0.05) * 120, 55, Math.cos(t * 0.05) * 120);
      this.camera.lookAt(0, 0, 0);
      this.traffic.update(0.016, this.playerPosV, null, null);
      this.particles.update(0.016);
    }
    if (this.state !== 'title') this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
    window.__fps = Math.round(1 / Math.max(dt, 0.001));
  }

  update(dt) {
    this.crimeCooldown = Math.max(0, this.crimeCooldown - dt);
    this.fireT = Math.max(0, this.fireT - dt);
    // Wanted decay: stay clean and the heat fades, one star at a time.
    if (this.wanted > 0) {
      this.wantedQuiet += dt;
      if (this.wantedQuiet > CFG.wanted.decaySeconds) {
        this.setWanted(this.wanted - 1);
        this.hud.showToast('Heat dying down… wanted level ' + this.wanted);
      }
    }
    if (this.input.wasPressed('KeyM')) {
      this.audio.ensure();
      const m = this.audio.toggleMute();
      document.getElementById('btn-mute').textContent = m ? '🔇' : '🔊';
    }
    if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
      this.state = 'paused';
      this.showScreen('screen-pause');
      return;
    }
    if (this.input.wasPressed('KeyE')) this.tryInteract();
    if (this.input.wasPressed('KeyF')) this.tryEnterExitCar();

    if (this.playerCar) this.updateDriving(dt);
    else this.updateOnFoot(dt);
    this.updateShooting(dt);
    this.updatePolice(dt);
    this.traffic.update(dt, this.playerPosV, this.playerCar, (pos) => {
      this.particles.crash(pos);
      this.audio.noise(0.25, 0.2, 900);
    });
    this.people.update(dt, this.playerPos(), this.state === 'play' && this.playerHp > 0, {
      enemyShot: (e, d) => this.enemyShot(e, d),
      enemyTouch: (e) => this.damagePlayer(12 * dt * 3, e.pos),
    });
    this.particles.update(dt);
    this.missions.update(dt);
    this.updateMarker();
    this.updateHud(dt);
    this.audio.setEngine(this.playerCar ? Math.abs(this.playerCar.speed) / CFG.car.maxSpeed : 0, !!this.playerCar);
    this.audio.setSiren(this.wanted > 0, this.time);
  }

  updateOnFoot(dt) {
    const fwd = this.input.axis('KeyS', 'KeyW');
    const strafe = this.input.axis('KeyA', 'KeyD');
    this.camYaw -= this.input.mouseDX * 0.004;
    this.camPitch = Math.max(0.05, Math.min(0.9, this.camPitch + this.input.mouseDY * 0.003));
    const run = this.input.held('ShiftLeft') || this.input.held('ShiftRight');
    const speed = (run ? CFG.player.runSpeed : CFG.player.walkSpeed);
    // Move relative to the camera yaw.
    const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
    let mx = (sin * fwd + cos * strafe);
    let mz = (cos * fwd - sin * strafe);
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      mx /= len; mz /= len;
      this.playerPosV.x += mx * speed * dt;
      this.playerPosV.z += mz * speed * dt;
      this.playerYaw = Math.atan2(mx, mz);
      this.walkT += dt * (run ? 13 : 9);
    }
    this.city.resolveCircle(this.playerPosV, CFG.player.radius);
    this.playerPosV.x = Math.max(-208, Math.min(208, this.playerPosV.x));
    this.playerPosV.z = Math.max(-208, Math.min(208, this.playerPosV.z));
    // Jump.
    if (this.input.wasPressed('Space') && this.playerPosV.y <= 0.01) this.playerVy = CFG.player.jumpSpeed;
    this.playerVy -= CFG.player.gravity * dt;
    this.playerPosV.y += this.playerVy * dt;
    if (this.playerPosV.y < 0) { this.playerPosV.y = 0; this.playerVy = 0; }
    const m = this.playerMesh;
    m.position.copy(this.playerPosV);
    m.rotation.y = this.playerYaw;
    const swing = len > 0.01 ? Math.sin(this.walkT) * 0.55 : 0;
    m.userData.legL.rotation.x = swing;
    m.userData.legR.rotation.x = -swing;
    m.userData.armL.rotation.x = -swing * 0.7;
    m.userData.armR.rotation.x = swing * 0.7;
    m.visible = true;
  }

  updateDriving(dt) {
    const car = this.playerCar;
    const throttle = this.input.axis('KeyS', 'KeyW');
    const steer = this.input.axis('KeyA', 'KeyD');
    car.drive(throttle, steer, dt);
    this.carHitCd = Math.max(0, (this.carHitCd || 0) - dt);
    const hit = this.city.resolveCircle(car.pos, 2.1);
    if (hit && Math.abs(car.speed) > 6 && this.carHitCd <= 0) {
      this.carHitCd = 1.0;
      car.speed *= -0.3;
      car.damage(Math.min(20, Math.abs(car.speed) * 1.2), null);
      this.particles.crash(car.pos.clone().setY(1));
      this.juice.addTrauma(0.5);
      this.audio.noise(0.3, 0.3, 800);
    }
    // Running over a pedestrian is a crime.
    for (const p of this.people.peds) {
      if (Math.hypot(p.pos.x - car.pos.x, p.pos.z - car.pos.z) < 2.2 && Math.abs(car.speed) > 3) {
        this.people.scene.remove(p.mesh);
        this.people.peds = this.people.peds.filter((x) => x !== p);
        this.particles.blood(p.pos.clone().setY(1));
        this.addWanted(1, 'Pedestrian down');
        this.juice.freeze(0.06);
      }
    }
    if (car.dead) {
      this.particles.crash(car.pos.clone().setY(1.5));
      this.audio.explosion();
      this.juice.addTrauma(1);
      this.exitCar(true);
      this.damagePlayer(25, car.pos);
    }
  }

  tryEnterExitCar() {
    if (this.state !== 'play') return;
    if (this.playerCar) { this.exitCar(false); return; }
    let best = null, bd = 4.2;
    for (const car of this.traffic.cars) {
      if (car.dead) continue;
      const d = Math.hypot(car.pos.x - this.playerPosV.x, car.pos.z - this.playerPosV.z);
      if (d < bd) { bd = d; best = car; }
    }
    if (!best) return;
    this.playerCar = best;
    best.kind = 'player';
    best.driver = 'player';
    this.playerMesh.visible = false;
    this.audio.ensure();
    this.audio.blip(300, 0.12, 'square', 0.12, 500);
    // Stealing a car you do not own is a crime; your own car is free.
    if (!best.owned) this.addWanted(1, 'Car stolen');
    this.hud.showToast('You are driving. W/S accelerate & brake, A/D steer, F to get out.');
  }
  exitCar(wrecked) {
    const car = this.playerCar;
    if (!car) return;
    car.driver = null;
    if (!wrecked) { car.kind = 'traffic'; car.owned = true; }
    this.playerCar = null;
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    this.playerPosV.set(car.pos.x + side.x * 3, 0, car.pos.z + side.z * 3);
    this.city.resolveCircle(this.playerPosV, 1);
    this.playerMesh.visible = true;
  }

  tryInteract() {
    if (this.state !== 'play') return;
    const p = this.playerPos();
    // Mission start marker at the garage.
    if (!this.missions.active && this.missions.currentDef()) {
      if (Math.hypot(p.x - GARAGE.x, p.z - GARAGE.z) < 9) {
        if (this.missions.start()) {
          this.hud.setMissionTitle(this.missions.currentDef().title);
          return;
        }
      }
    }
    if (this.missions.active && this.missions.stepDef() && this.missions.stepDef().kind === 'grab') {
      const s = this.missions.stepDef();
      if (Math.hypot(p.x - s.target[0], p.z - s.target[1]) < 7) return; // handled by update
    }
  }

  updateShooting(dt) {
    const wantFire = this.input.mouseDown || this.input.mouseClicked || this.input.held('KeyJ');
    if (!wantFire || this.fireT > 0 || this.playerCar) return;
    this.fireT = CFG.combat.pistolRate;
    this.audio.ensure();
    this.audio.shoot();
    this.people.scare(this.playerPosV.x, this.playerPosV.z, 25);
    this.juice.addTrauma(0.12);
    // Muzzle flash + tracer from the player toward the crosshair.
    const origin = this.playerPosV.clone().setY(1.5);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.raycaster.set(origin, dir);
    this.raycaster.far = CFG.combat.pistolRange;
    const targets = [];
    for (const e of this.people.enemies) targets.push(e.mesh);
    for (const p of this.people.peds) targets.push(p.mesh);
    for (const car of this.traffic.cars) if (!car.dead) targets.push(car.mesh);
    const hits = this.raycaster.intersectObjects(targets, true);
    let end = origin.clone().addScaledVector(dir, 60);
    if (hits.length) {
      const hit = hits[0];
      end = hit.point.clone();
      let obj = hit.object;
      while (obj && !obj.userData._owner) obj = obj.parent;
      const enemy = this.people.enemies.find((e) => e.mesh === hit.object || e.mesh === obj || e.mesh.children.includes(hit.object));
      const ped = this.people.peds.find((p) => p.mesh === hit.object || p.mesh === obj || p.mesh.children.includes(hit.object));
      const car = this.traffic.cars.find((c) => c.mesh === hit.object || c.mesh === obj || c.mesh.children.includes(hit.object));
      if (enemy) {
        this.people.damageEnemy(enemy, CFG.combat.pistolDamage, this.particles, (e) => {
          this.addCash(25);
          this.juice.damageNumber(e.pos.clone().setY(2), '+$25', 'chain');
          if (this.missions.active && this.missions.stepDef() && this.missions.stepDef().kind === 'fight') {
            this.missions.active.kills++;
          }
        });
        this.juice.damageNumber(hit.point.clone(), '-' + CFG.combat.pistolDamage, 'crit');
        this.juice.freeze(0.05);
      } else if (ped) {
        this.people.scene.remove(ped.mesh);
        this.people.peds = this.people.peds.filter((x) => x !== ped);
        this.particles.blood(hit.point.clone());
        this.addWanted(1, 'Pedestrian shot');
      } else if (car) {
        car.damage(CFG.combat.pistolDamage, this.particles);
        this.particles.sparks(hit.point.clone());
        this.juice.damageNumber(hit.point.clone(), '-' + CFG.combat.pistolDamage);
        if (car.kind === 'police') this.addWanted(1, 'Cop car shot');
      }
    }
    this.spawnTracer(origin, end);
  }
  spawnTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    setTimeout(() => { this.scene.remove(line); geo.dispose(); }, 70);
    this.particles.sparks(from.clone().add(new THREE.Vector3(0, 0, 0)));
  }
  enemyShot(e, dist) {
    this.audio.enemyShoot();
    const hitChance = Math.max(0.12, 0.45 - dist * 0.008);
    if (Math.random() < hitChance && !this.playerCar) {
      this.damagePlayer(8, e.pos);
    } else if (Math.random() < hitChance * 0.5 && this.playerCar) {
      this.playerCar.damage(6, null);
    }
    const from = e.pos.clone().setY(1.5);
    const to = this.playerPos().clone().setY(1.2);
    this.spawnTracer(from, to);
  }
  damagePlayer(amount, fromPos) {
    if (this.state !== 'play' || this.playerHp <= 0) return;
    this.playerHp -= amount;
    this.hud.setHealth(this.playerHp, CFG.player.maxHp);
    this.juice.hurtFlash();
    this.juice.addTrauma(0.35);
    this.audio.hurt();
    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.state = 'busted';
      const lost = Math.floor(this.cash * 0.2);
      this.cash -= lost;
      this.saveGame();
      this.audio.busted();
      this.hud.hide();
      document.getElementById('busted-loss').textContent = 'The Solmar Bay PD took $' + lost + ' in "processing fees".';
      this.showScreen('screen-busted');
    }
  }

  updatePolice(dt) {
    // Keep the right number of cruisers + foot cops for the wanted level.
    const wantCars = this.wanted * CFG.wanted.copCarsPerStar;
    const wantCops = this.wanted * CFG.wanted.footCopsPerStar;
    const policeCars = this.traffic.cars.filter((c) => c.kind === 'police' && !c.dead);
    const footCops = this.people.enemies.filter((e) => e.kind === 'cop');
    this.policeSpawnT -= dt;
    if (policeCars.length < wantCars && this.policeSpawnT <= 0) {
      this.policeSpawnT = 1.2;
      const a = Math.random() * Math.PI * 2;
      const p = this.playerPos();
      const rp = this.city.nearestRoadPoint(p.x + Math.cos(a) * 55, p.z + Math.sin(a) * 55);
      const car = this.traffic.spawnPolice(rp.x, rp.z);
      if (car) this.audio.sirenBlip();
    }
    if (footCops.length < wantCops && this.policeSpawnT <= 0 && this.wanted >= 2) {
      this.policeSpawnT = 1.2;
      const a = Math.random() * Math.PI * 2;
      const p = this.playerPos();
      this.people.spawnEnemy(p.x + Math.cos(a) * 25, p.z + Math.sin(a) * 25, 'cop');
    }
    if (this.wanted === 0) {
      for (const car of [...policeCars]) {
        const d = Math.hypot(car.pos.x - this.playerPosV.x, car.pos.z - this.playerPosV.z);
        if (d > 90) this.traffic.removeCar(car);
      }
      for (const cop of [...footCops]) {
        const d = Math.hypot(cop.pos.x - this.playerPosV.x, cop.pos.z - this.playerPosV.z);
        if (d > 80) this.people.removeEnemy(cop);
      }
    }
  }

  updateMarker() {
    const target = this.missions.targetPos();
    const showAt = target || (this.missions.markerAvailable() ? new THREE.Vector3(GARAGE.x, 0, GARAGE.z) : null);
    const vis = !!showAt && this.state === 'play';
    this.markerRing.visible = vis;
    this.markerBeam.visible = vis;
    if (showAt) {
      this.markerRing.position.set(showAt.x, 0.15, showAt.z);
      this.markerBeam.position.set(showAt.x, 15, showAt.z);
      const s = 1 + Math.sin(this.time * 3) * 0.12;
      this.markerRing.scale.setScalar(s);
    }
  }

  updateHud(dt) {
    this.hud.setHealth(this.playerHp, CFG.player.maxHp);
    this.hud.setClock(this.time);
    this.hud.setCarHealth(this.playerCar ? this.playerCar.hp : null);
    this.hud.setSpeed(this.playerCar ? Math.abs(this.playerCar.speed) * 3.6 : 0, !!this.playerCar);
    const step = this.missions.stepDef();
    if (step && step.timer) this.hud.setTimer(this.missions.active.timer);
    else this.hud.setTimer(0);
    // Context prompt: nearest car, or the garage marker.
    let prompt = '';
    if (!this.playerCar) {
      let best = null, bd = 4.2;
      for (const car of this.traffic.cars) {
        if (car.dead) continue;
        const d = Math.hypot(car.pos.x - this.playerPosV.x, car.pos.z - this.playerPosV.z);
        if (d < bd) { bd = d; best = car; }
      }
      if (best) prompt = 'F — Steal car';
      else {
        const p = this.playerPos();
        if (!this.missions.active && this.missions.currentDef() && Math.hypot(p.x - GARAGE.x, p.z - GARAGE.z) < 9) {
          prompt = 'E — Start job: ' + this.missions.currentDef().title;
        }
      }
    } else prompt = 'F — Get out   •   W/S drive   •   A/D steer';
    this.hud.setPrompt(prompt);
    this.hud.drawMinimap(this);
  }

  updateCamera(dt) {
    if (this.state === 'title') return;
    const k = Math.min(1, dt * 6);
    if (this.playerCar) {
      const car = this.playerCar;
      const back = new THREE.Vector3(
        car.pos.x - Math.sin(car.heading) * CFG.camera.carDist,
        CFG.camera.carHeight,
        car.pos.z - Math.cos(car.heading) * CFG.camera.carDist,
      );
      this._camPos.lerp(back, k);
      this._camLook.lerp(new THREE.Vector3(car.pos.x, 1.6, car.pos.z), Math.min(1, dt * 8));
    } else {
      this.camYaw -= this.input.mouseDX * 0.004;
      const cx = this.playerPosV.x - Math.sin(this.camYaw) * CFG.camera.footDist;
      const cz = this.playerPosV.z - Math.cos(this.camYaw) * CFG.camera.footDist;
      const cy = CFG.camera.footHeight + this.camPitch * 6;
      this._camPos.lerp(new THREE.Vector3(cx, cy, cz), k);
      this._camLook.lerp(new THREE.Vector3(this.playerPosV.x, 1.6, this.playerPosV.z), Math.min(1, dt * 10));
    }
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);
  }
}

new Game();
