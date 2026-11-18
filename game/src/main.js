// SOLMAR BAY — main loop: wiring, camera, wanted system, police chase, save flow.
// Imports every system module and owns the frame: input -> player/cars/peds ->
// missions -> wanted/police -> camera -> HUD. All original code, written fresh.
import * as THREE from 'three';
import { CFG } from './config.js';
import { S, saveGame, loadGame, clearSave } from './state.js';
import { buildCity } from './city.js';
import { Input } from './input.js';
import { Car, spawnTraffic, makeParkedCars } from './vehicles.js';
import { spawnPeds, spawnCop } from './people.js';
import { Player } from './player.js';
import { FX } from './juice.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { AudioEngine } from './audio.js';

const canvas = document.getElementById('game-canvas');
const errBox = document.getElementById('err');
window.addEventListener('error', (e) => {
  errBox.textContent += `\nERR: ${e.message} @ ${e.filename}:${e.lineno}`;
});

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87bfe8);
scene.fog = new THREE.Fog(0x9fc8e8, 120, 420);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 30, 60);
S.camera = camera;

const sun = new THREE.DirectionalLight(0xfff2d8, 2.6);
sun.position.set(120, 180, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -170; sun.shadow.camera.right = 170;
sun.shadow.camera.top = 170; sun.shadow.camera.bottom = -170;
sun.shadow.camera.far = 500;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 1.1));

// ---------- world ----------
const world = buildCity(scene);
S.world = world;
S.fx = new FX(scene);
S.audio = new AudioEngine();
S.input = new Input(canvas);
S.missions = new Missions();
S.hud = new HUD({
  onNewGame: () => startGame(false),
  onContinue: () => startGame(true),
  onResume: () => setPaused(false),
  onSave: () => { saveGame(); S.hud.toast('Game saved.'); },
  onRestart: () => startGame(true),
  onMute: () => toggleMute(),
});

// ---------- actors ----------
const player = new Player(scene, world);
S.player = player;
spawnTraffic(scene, world, 14);
makeParkedCars(scene, world);
spawnPeds(scene, world, 24);

// Mission beacon: tall light pillar + bobbing diamond over the current target.
const beacon = new THREE.Group();
const beaconBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
);
beaconBeam.position.y = 30;
const beaconGem = new THREE.Mesh(
  new THREE.OctahedronGeometry(1.4),
  new THREE.MeshBasicMaterial({ color: 0xffd60a }),
);
beaconGem.position.y = 8;
beacon.add(beaconBeam, beaconGem);
beacon.visible = false;
scene.add(beacon);

// ---------- camera state ----------
// Camera forward is (-sin yaw, -cos yaw) (player.js convention): the camera
// sits behind the player at +back, looking back along -back.
let camYaw = 0.31; // spawn faces the Bayline garage (-90,-90) from (-84,-72)
let camPitch = 0.32;
let camPos = new THREE.Vector3(0, 30, 60);
S.camYaw = camYaw;

// ---------- wanted / police ----------
const policeCars = [];
let policeRamCooldown = 0;
let bustedTimer = 0;
let copSpawnCooldown = 0;

function wantedFromHeat(heat) {
  if (heat >= 90) return 5;
  if (heat >= 70) return 4;
  if (heat >= 50) return 3;
  if (heat >= 30) return 2;
  if (heat >= 12) return 1;
  return 0;
}

function spawnPoliceCar() {
  const a = Math.random() * Math.PI * 2;
  const d = 70 + Math.random() * 30;
  let x = player.pos.x + Math.sin(a) * d;
  let z = player.pos.z + Math.cos(a) * d;
  x = THREE.MathUtils.clamp(x, -world.bounds, world.bounds);
  z = THREE.MathUtils.clamp(z, -world.bounds, world.bounds);
  const car = new Car(scene, { x, z, heading: 0, color: 0x111418, kind: 'police' });
  car.aiPolice = true;
  car.ramCooldown = 0;
  S.cars.push(car);
  policeCars.push(car);
  return car;
}

function removePoliceCar(car) {
  const i = S.cars.indexOf(car); if (i >= 0) S.cars.splice(i, 1);
  const j = policeCars.indexOf(car); if (j >= 0) policeCars.splice(j, 1);
  car.remove();
}

function updatePolice(dt) {
  const want = S.wanted;
  const desiredCars = want > 0 ? Math.min(want * 2, 6) : 0;
  while (policeCars.length < desiredCars) spawnPoliceCar();
  while (policeCars.length > desiredCars) {
    // Remove the farthest one first.
    let far = policeCars[0]; let farD = -1;
    for (const c of policeCars) {
      const d = c.pos.distanceToSquared(player.pos);
      if (d > farD) { farD = d; far = c; }
    }
    removePoliceCar(far);
  }
  // Foot cops when the player is on foot and wanted.
  if (want > 0 && player.onFoot && S.cops.length < Math.min(want, 3) && copSpawnCooldown <= 0) {
    copSpawnCooldown = 4;
    const a = Math.random() * Math.PI * 2;
    // spawnCop pushes to S.cops itself and returns the cop.
    spawnCop(scene, world,
      player.pos.x + Math.sin(a) * 25, player.pos.z + Math.cos(a) * 25);
  }
  copSpawnCooldown -= dt;
  if (want === 0) {
    for (const c of [...S.cops]) { c.remove(); S.cops.splice(S.cops.indexOf(c), 1); }
  }
  S.audio.siren(want > 0);

  // Police cars chase: steer toward the player, ram gently (~10 dps on contact).
  policeRamCooldown -= dt;
  for (const car of policeCars) {
    if (car.dead) continue;
    const dx = player.pos.x - car.pos.x;
    const dz = player.pos.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += THREE.MathUtils.clamp(dh, -1.6 * dt, 1.6 * dt);
    const targetSpeed = dist > 6 ? 26 : 14;
    car.speed += THREE.MathUtils.clamp(targetSpeed - car.speed, -20 * dt, 12 * dt);
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    if (car._flashLights) car._flashLights(dt);
    // Keep out of buildings.
    if (world.isInBuilding(car.pos.x, car.pos.z, 2.2)) {
      car.pos.x -= Math.sin(car.heading) * car.speed * dt;
      car.pos.z -= Math.cos(car.heading) * car.speed * dt;
      car.speed *= 0.5;
      car.heading += 0.6;
    }
    world.clampPos(car.pos);
    // Ram the player. Range must exceed the 4.0 m car-to-car separation
    // (vehicles.js _collideCars) — at 3.4 m the ram could never trigger
    // against a driven car, because the cars are always pushed 4.0 m apart.
    if (dist < 4.6 && policeRamCooldown <= 0) {
      policeRamCooldown = 0.9;
      player.damage(9, 'police');
      S.fx.addShake(0.45);
      S.audio.crash();
      if (!player.onFoot && S.car) S.car.damage(6);
    }
  }
  // Busted: a foot cop standing on the player for 2s while wanted.
  if (want > 0 && player.onFoot) {
    let near = false;
    for (const c of S.cops) {
      if (c.alive && c.pos.distanceTo(player.pos) < 1.8) { near = true; break; }
    }
    bustedTimer = near ? bustedTimer + dt : 0;
    if (bustedTimer > 2) { endRun('busted'); }
  } else {
    bustedTimer = 0;
  }
}

// ---------- game flow ----------
function resetRunState(fromSave) {
  S.time = 0;
  S.heat = 0;
  S.wanted = 0;
  S.car = null;
  runEnded = false;
  S.stats = { kills: 0, carsStolen: 0, missionsDone: 0, shotsFired: 0 };
  S.health = 100;
  if (fromSave) {
    const sv = loadGame();
    if (sv) {
      S.cash = sv.cash ?? 120;
      S.missionIndex = sv.missionIndex ?? 0;
      S.health = sv.health ?? 100;
      S.stats = { ...S.stats, ...(sv.stats || {}) };
      const sp = sv.player || {};
      player.reset(sp.x ?? world.spawn.x, sp.z ?? world.spawn.z, sp.heading ?? 0);
      player.health = S.health;
    } else {
      S.cash = 120; S.missionIndex = 0;
      player.reset(world.spawn.x, world.spawn.z, 0);
    }
  } else {
    clearSave();
    S.cash = 120; S.missionIndex = 0;
    player.reset(world.spawn.x, world.spawn.z, 0);
  }
  // Clear police.
  for (const c of [...policeCars]) removePoliceCar(c);
  for (const c of [...S.cops]) { c.remove(); S.cops.splice(S.cops.indexOf(c), 1); }
  S.missions.reset();
  if (S.missionIndex < 4) S.missions.start(S.missionIndex);
}

function startGame(fromSave) {
  resetRunState(fromSave);
  S.mode = 'playing';
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('end-screen').classList.add('hidden');
  document.getElementById('pause-menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  S.audio.ensure();
  S.audio.startMusic();
  S.hud.toast(fromSave ? 'Welcome back to Solmar Bay.' : 'Marco Solis — $120 and a debt. Get to work.');
}

function setPaused(paused) {
  if (S.mode !== 'playing' && S.mode !== 'paused') return;
  S.mode = paused ? 'paused' : 'playing';
  S.hud.showPause(paused);
  if (paused) { document.exitPointerLock?.(); saveGame(); }
}

let runEnded = false;

function endRun(kind) {
  if (runEnded || (S.mode !== 'playing' && S.mode !== kind)) return;
  runEnded = true;
  S.mode = kind; // 'wasted' | 'busted'
  document.exitPointerLock?.();
  S.audio.siren(false);
  S.audio.setEngine(false, 0);
  if (kind === 'busted') {
    const fine = Math.min(S.cash, 100);
    S.cash -= fine;
    S.hud.showEnd('busted');
  } else {
    S.hud.showEnd('wasted');
  }
  saveGame();
}

function toggleMute() {
  S.muted = !S.muted;
  S.audio.setMuted(S.muted);
  S.hud.setMuted(S.muted);
}

// ---------- input shortcuts ----------
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' && (S.mode === 'playing' || S.mode === 'paused')) {
    setPaused(S.mode === 'playing');
  }
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'Enter' && S.mode === 'title') startGame(!!loadGame());
});

// ---------- camera ----------
function updateCamera(dt) {
  const m = S.input.takeMouse();
  camYaw -= m.dx * 0.0032;
  camPitch = THREE.MathUtils.clamp(camPitch + m.dy * 0.0022, -0.05, 0.85);
  S.camYaw = camYaw;
  const target = player.onFoot ? player.pos : (S.car ? S.car.pos : player.pos);
  // Shoulder-aim framing on foot while armed: a closer, lower camera
  // looking further out at chest height, so the crosshair stays near
  // targets instead of diving at the ground a few metres ahead.
  const aiming = player.onFoot && player.armed;
  const dist = player.onFoot ? (aiming ? 5.5 : 7.5) : 11;
  const height = player.onFoot ? (aiming ? 2.4 : 3.1) : 4.2;
  const back = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const speed01 = S.car ? Math.min(Math.abs(S.car.speed) / CFG.CAR.maxSpeed, 1) : 0;
  const want = new THREE.Vector3(
    target.x + back.x * dist,
    target.y + height + camPitch * (aiming ? 1.0 : 4),
    target.z + back.z * dist,
  );
  const k = 1 - Math.exp(-7 * dt);
  camPos.lerp(want, k);
  // Keep the camera out of buildings (simple: lift it).
  if (world.isInBuilding(camPos.x, camPos.z, 0.5)) camPos.y = Math.max(camPos.y, 14);
  const shake = S.fx.shakeOffset(dt);
  camera.position.set(camPos.x + shake.x, camPos.y + shake.y, camPos.z);
  const lookDist = aiming ? 12 : 2.5;
  const lookY = aiming ? 1.3 : 1.6;
  const look = new THREE.Vector3(
    target.x + back.x * -lookDist,
    target.y + lookY,
    target.z + back.z * -lookDist,
  );
  camera.lookAt(look);
  const wantFov = 62 + speed01 * 13;
  camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 3);
  camera.updateProjectionMatrix();
}

// ---------- main loop ----------
const clock = new THREE.Clock();
let autoSaveT = 0;

function animate() {
  requestAnimationFrame(animate);
  let dt = Math.min(clock.getDelta(), 0.05);
  const rawDt = dt;
  dt *= S.fx.timeScale;
  S.time += dt;

  if (S.mode === 'playing') {
    // Wanted: heat decays, stars follow.
    S.heat = Math.max(0, S.heat - CFG.WANTED.decayPerSec * dt);
    S.wanted = wantedFromHeat(S.heat);
    S.health = player.health;

    // Auto-start the next job at the garage.
    if (!S.missions.current && S.missionIndex < 4) {
      const gd = world.garageDoor;
      if (Math.hypot(player.pos.x - gd.x, player.pos.z - gd.z) < 14) {
        S.missions.start(S.missionIndex);
      }
    }

    player.update(dt, S.input);
    // Player death flips S.mode to 'wasted' inside player.damage().
    if (S.mode === 'wasted') endRun('wasted');

    // Car-vs-pedestrian: running someone over is a crime.
    if (!player.onFoot && S.car) {
      for (const ped of S.peds) {
        if (ped.alive && Math.abs(S.car.speed) > 4 &&
            ped.pos.distanceTo(S.car.pos) < 2.4) {
          if (ped.damage(100)) {
            S.stats.kills++;
            S.heat = Math.min(100, S.heat + CFG.WANTED.heatPerCrime.hitPed);
            S.hud.toast('You ran someone over! The PD noticed.');
          }
        }
      }
    }

    for (const car of [...S.cars]) {
      if (car.dead) continue;
      if (car.aiPolice) continue; // driven by updatePolice
      if (car === S.car) continue; // driven by player
      car.updateTraffic(dt);
    }
    for (const car of [...S.cars]) {
      if (car.dead) { car.remove(); S.cars.splice(S.cars.indexOf(car), 1); }
    }
    for (const ped of S.peds) {
      if (ped.alive) ped.update(dt, player.pos, S.lastDanger || null);
    }
    for (const cop of S.cops) {
      if (cop.alive) cop.update(dt, player.pos);
    }
    S.missions.update(dt);
    updatePolice(dt);

    // Engine sound follows the driven car.
    S.audio.setEngine(!!S.car, S.car ? Math.abs(S.car.speed) / CFG.CAR.maxSpeed : 0);

    // Mission beacon.
    const marker = S.missions.marker();
    if (marker) {
      beacon.visible = true;
      beacon.position.set(marker.x, 0, marker.z);
      beaconGem.position.y = 8 + Math.sin(S.time * 3) * 1.2;
      beaconGem.rotation.y += dt * 2;
    } else {
      beacon.visible = false;
    }

    autoSaveT += rawDt;
    if (autoSaveT > 60) { autoSaveT = 0; saveGame(); }
  }

  S.fx.update(rawDt);
  if (world.water) world.water.position.y = 0.05 + Math.sin(S.time * 0.7) * 0.03;
  updateCamera(rawDt);
  S.hud.update(rawDt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Title screen first; the world idles behind it.
S.hud.showTitle(!!loadGame());
S.hud.setMuted(S.muted);
animate();

// QA / automation hook (harmless in normal play).
window.__solmar = { S, world, player, startGame, setPaused, THREE };
