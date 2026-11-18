// SOLMAR BAY — main loop: wiring, camera, wanted system, police chase, save flow.
// Imports every system module and owns the frame: input -> player/cars/peds ->
// missions -> wanted/police -> camera -> HUD. All original code, written fresh.
import * as THREE from 'three';
import { CFG } from './config.js';
import { S, saveGame, loadGame, clearSave } from './state.js';
import { buildCity } from './city.js';
import { Input } from './input.js';
import { Car, spawnTraffic, makeParkedCars, spawnBeachCruisers } from './vehicles.js';
import { spawnPeds, spawnCop } from './people.js';
import { Player } from './player.js';
import { FX } from './juice.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { AudioEngine } from './audio.js';
import { makeSkyDome, makeClouds, makeEnvironment, SUN_DIR } from './sky.js';
import { PostFX } from './postfx.js';
import { PoliceBrain, Helicopter, nextCallsign, ramHeatSpike } from './police.js';
import { Dialogue } from './dialogue.js';
import { SkyWatch } from './heli2.js';
import { HeatDirector } from './heat.js';
import { CityLife } from './ambient.js';
import { MenuDirector } from './menu.js';
import { RadioDirector } from './radio2.js';
import { ShopDirector } from './shop.js';
import { SafehouseDirector } from './safehouse.js';
import { GarageDirector } from './garage.js';
import { DistrictDirector } from './districts.js';
import { CrewMember } from './crew.js';
import { SideActivities } from './side.js';
import { DayNightDirector } from './daynight.js';
import { BanterDirector } from './banter.js';
import { RespectDirector } from './respect.js';
import { CutsceneDirector } from './cutscene.js';
import { FenceDirector } from './fence.js';
import { ChallengesDirector } from './challenges.js';

const canvas = document.getElementById('game-canvas');
const errBox = document.getElementById('err');
window.addEventListener('error', (e) => {
  errBox.textContent += `\nERR: ${e.message} @ ${e.filename}:${e.lineno}`;
});

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// Headless SwiftShader pays full price for every fullscreen pass; cap the
// ratio there so screenshots and smoke tests stay usable. Real browsers
// keep the sharper cap.
const headless = typeof navigator !== 'undefined' && !!navigator.webdriver;
renderer.setPixelRatio(headless ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Golden-hour grade: ACES filmic + a warm exposure lift.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
// Sunset sky dome replaces the flat background colour; warm haze fog.
const skyDome = makeSkyDome();
scene.add(skyDome);
S.skyDome = skyDome;
makeClouds(scene);
scene.fog = new THREE.Fog(0xe08a5e, 150, 520);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 30, 60);
S.camera = camera;

const sun = new THREE.DirectionalLight(0xffa04d, 3.0);
sun.position.copy(SUN_DIR).multiplyScalar(220);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -170; sun.shadow.camera.right = 170;
sun.shadow.camera.top = 170; sun.shadow.camera.bottom = -170;
sun.shadow.camera.far = 520;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
scene.add(sun);
scene.add(sun.target);
S.sunLight = sun;
// Warm sky bounce + cool violet ground bounce.
const hemi = new THREE.HemisphereLight(0xffd9a0, 0x4a3a30, 0.75);
scene.add(hemi);
S.hemiLight = hemi;

// ---------- world ----------
const world = buildCity(scene);
S.world = world;
S.fx = new FX(scene);
// Sunset environment map for paint / glass reflections (PMREM from a tiny
// gradient scene — no external HDR). Failure must never block the game.
try {
  scene.environment = makeEnvironment(renderer);
} catch (e) {
  console.warn('env map skipped:', e && e.message);
}
const postfx = new PostFX(renderer, scene, camera, headless);
S.audio = new AudioEngine();
S.input = new Input(canvas);
S.missions = new Missions();
S.dialogue = new Dialogue();
// Round 5 directors: heat depth, the visible news chopper, ambient life,
// mission-select menu, and the doubled radio dial.
S.heatDirector = new HeatDirector();
S.skyWatch = new SkyWatch(scene);
S.cityLife = new CityLife(scene, world);
S.cityLife.spawnCast();
S.menuDirector = new MenuDirector();
S.radioDirector = new RadioDirector();
// Round 5 commerce + world systems: the shop, the safehouse and the garage
// (real money/HP/heat systems), the named districts, Lena as a crew
// companion, the side activities, and the day/night cycle.
S.shopDirector = new ShopDirector();
S.safehouseDirector = new SafehouseDirector();
S.garageDirector = new GarageDirector(scene);
S.districtDirector = new DistrictDirector(scene);
S.crew = new CrewMember(scene);
S.sideActivities = new SideActivities(scene);
S.dayNight = new DayNightDirector();
// Round 5 life systems: the respect meter, the chatter, the opening and
// ending sweeps, Vic's fence, and the daily challenges board.
S.banterDirector = new BanterDirector();
S.respectDirector = new RespectDirector();
S.cutsceneDirector = new CutsceneDirector();
S.fenceDirector = new FenceDirector(scene);
S.challengesDirector = new ChallengesDirector();
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
spawnBeachCruisers(scene, world);
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
let heli = null;
// Previous player position for the velocity the police brain leads with.
let prevPX = 0;
let prevPZ = 0;

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
  car.callsign = nextCallsign();
  car.brain = new PoliceBrain(car);
  // The chase starts knowing where the crime happened: seed the
  // last-known position so the search zone + SEARCH state have evidence
  // from the first frame (not only after a unit closes to 45 m).
  if (!S.lastKnown) S.lastKnown = { x: player.pos.x, z: player.pos.z, seenAt: S.time };
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

  // Player velocity for the police brain (lead the target, roadblock math).
  const pvx = dt > 0 ? THREE.MathUtils.clamp((player.pos.x - prevPX) / dt, -40, 40) : 0;
  const pvz = dt > 0 ? THREE.MathUtils.clamp((player.pos.z - prevPZ) / dt, -40, 40) : 0;
  prevPX = player.pos.x;
  prevPZ = player.pos.z;
  const playerSpeed = S.car ? S.car.speed : Math.hypot(pvx, pvz);

  // Perception: last-known position refreshes while any unit is close
  // (enemy-perception). After 4 s unseen it goes stale and units SEARCH.
  if (want > 0) {
    let nearest = Infinity;
    for (const c of policeCars) {
      nearest = Math.min(nearest, Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z));
    }
    if (nearest < 45) {
      S.lastKnown = { x: player.pos.x, z: player.pos.z, seenAt: S.time };
    }
  }

  // Police cars: the brain decides the tactic at 5 Hz, movement runs
  // every frame (ai-behavior-trees-utility-ai: decision cadence vs motion).
  policeRamCooldown -= dt;
  for (const car of policeCars) {
    if (car.dead) continue;
    const intent = car.brain
      ? car.brain.decide(dt, player.pos, { x: pvx, z: pvz }, player.heading, playerSpeed)
      : { tx: player.pos.x, tz: player.pos.z, targetSpeed: 26, steerRate: 1.6 };
    const dx = intent.tx - car.pos.x;
    const dz = intent.tz - car.pos.z;
    const dist = Math.hypot(dx, dz);
    // ROADBLOCK hold: face across the road instead of the target point.
    const targetHeading = intent.holdHeading !== undefined
      ? intent.holdHeading
      : (dist > 0.5 ? Math.atan2(dx, dz) : car.heading);
    let dh = targetHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += THREE.MathUtils.clamp(dh, -intent.steerRate * dt, intent.steerRate * dt);
    car.speed += THREE.MathUtils.clamp(intent.targetSpeed - car.speed, -20 * dt, 12 * dt);
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
    // Ram the player (RAMMING just arrives faster; the contact rule is
    // the same gentle ~9 HP shove as before).
    const pDist = Math.hypot(player.pos.x - car.pos.x, player.pos.z - car.pos.z);
    if (pDist < 4.6 && policeRamCooldown <= 0) {
      policeRamCooldown = 0.9;
      player.damage(9, 'police');
      ramHeatSpike(); // a ram at 3+ stars spikes the heat (police.js)
      S.fx.addShake(0.45);
      S.audio.crash();
      if (!player.onFoot && S.car) S.car.damage(6);
    }
  }
  // Helicopter at 3+ stars — one heli, circling with its searchlight.
  if (want >= 3 && !heli) {
    heli = new Helicopter(scene);
    S.heli = heli;
  } else if (want < 3 && heli) {
    heli.remove();
    heli = null;
    S.heli = null;
  }
  if (heli) heli.update(dt, player.pos);
  // Rotor wash audio while any helicopter is up (PD bird or SKY-7).
  if (S.audio && typeof S.audio.rotor === 'function') {
    S.audio.rotor(!!heli || !!(S.skyWatch && S.skyWatch.active));
  }
  // SKY-7 news chopper: lower, closer, in-frame from 2 stars up.
  if (S.skyWatch) S.skyWatch.update(dt, player.pos, want);
  S.heliOverhead = S.skyWatch ? S.skyWatch.tiltBoost() : 0;
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
  S.stats = { kills: 0, carsStolen: 0, missionsDone: 0, shotsFired: 0, packages: 0, racesWon: 0, faresDone: 0 };
  Object.assign(S.stats, { heatShed: 0, crewKills: 0, fencesSold: 0, nightCash: 0, cleanJobs: 0, topSpeed: 0 });
  S.respect = 0;
  S.health = 100;
  if (fromSave) {
    const sv = loadGame();
    if (sv) {
      S.cash = sv.cash ?? 120;
      S.missionIndex = sv.missionIndex ?? 0;
      S.health = sv.health ?? 100;
      S.respect = sv.respect ?? 0;
      S.garageCars = Array.isArray(sv.garageCars) ? sv.garageCars : [];
      S.stats = { ...S.stats, ...(sv.stats || {}) };
      const sp = sv.player || {};
      player.reset(sp.x ?? world.spawn.x, sp.z ?? world.spawn.z, sp.heading ?? 0);
      player.health = S.health;
    } else {
      S.cash = 120; S.missionIndex = 0;
      S.garageCars = [];
      player.reset(world.spawn.x, world.spawn.z, 0);
    }
  } else {
    clearSave();
    S.cash = 120; S.missionIndex = 0;
    S.garageCars = [];
    player.reset(world.spawn.x, world.spawn.z, 0);
  }
  // Clear police.
  for (const c of [...policeCars]) removePoliceCar(c);
  for (const c of [...S.cops]) { c.remove(); S.cops.splice(S.cops.indexOf(c), 1); }
  if (heli) { heli.remove(); heli = null; S.heli = null; }
  if (S.skyWatch) S.skyWatch.reset();
  S.heatDirector.reset();
  S.menuDirector.reset();
  // Round 5 systems reset with the run: panels close, Lena leaves, the
  // race/taxi/packages restart, districts re-announce from the spawn.
  if (S.shopDirector) S.shopDirector.close();
  if (S.garageDirector) S.garageDirector.close();
  if (S.crew) S.crew.leaveMission();
  if (S.sideActivities) S.sideActivities.reset();
  if (S.districtDirector) S.districtDirector.reset();
  // Round 5 life systems reset too: chatter quiets, the daily board
  // re-rolls for the new day, and no ending sweep is pending.
  if (S.banterDirector) S.banterDirector.reset();
  if (S.respectDirector) S.respectDirector.reset();
  if (S.challengesDirector) S.challengesDirector.reset();
  if (S.challengesDirector) S.challengesDirector.roll(1);
  S.outroPending = false;
  if (S.cutsceneDirector) S.cutsceneDirector.finish();
  S.lastKnown = null;
  S.missions.reset();
  if (S.missionIndex < 10) S.missions.start(S.missionIndex);
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
  // A fresh run opens with the flyover; a continued run drops straight in.
  if (!fromSave && S.cutsceneDirector) S.cutsceneDirector.start();
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
  if (heli) { heli.remove(); heli = null; S.heli = null; }
  if (S.skyWatch) S.skyWatch.reset();
  if (S.crew) S.crew.leaveMission();
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
  if (e.code === 'KeyQ' && S.mode === 'playing') {
    // Radio station cycle (Q) through the merged six-station dial.
    const total = S.radioDirector ? S.radioDirector.count() : 3;
    if (total > 0) {
      S.radioStation = ((S.radioStation || 0) + 1) % total;
      if (S.radioDirector) S.radioDirector.announceSwitch();
    }
  }
  if (e.code === 'Enter' && S.mode === 'title') startGame(!!loadGame());
});

// ---------- camera ----------
function updateCamera(dt) {
  // A running cutscene owns the camera outright (intro / outro sweep).
  if (S.cutscene && S.cutsceneDirector && S.cutsceneDirector.active) {
    S.cutsceneDirector.update(dt, camera);
    return;
  }
  const m = S.input.takeMouse();
  camYaw -= m.dx * 0.0032;
  camPitch = THREE.MathUtils.clamp(camPitch + m.dy * 0.0022, -0.05, 0.85);
  S.camYaw = camYaw;
  // Round 5: when SKY-7 passes overhead, lift the camera pitch so the
  // news chopper reads in frame instead of hiding above the lens.
  const tiltUp = S.skyWatch ? S.skyWatch.tiltBoost() : 0;
  const effPitch = camPitch + tiltUp * (CFG.HELI ? CFG.HELI.tiltGain : 0.45);
  // Aiming: right mouse held, on foot, armed. Over-the-shoulder framing —
  // the camera closes in, drops to shoulder height and slides to the
  // player's right, so the crosshair lines up with the shoulder-origin
  // shot ray (player.js) instead of the wide third-person orbit.
  const aiming = player.onFoot && player.armed && S.input.aimDown;
  S.aiming = aiming;
  if (aiming) {
    // Face where the camera points so the shot leaves the body straight.
    const wantHeading = camYaw + Math.PI;
    let dh = wantHeading - player.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    player.heading += dh * Math.min(1, dt * 14);
    player.mesh.rotation.y = player.heading;
  }
  const target = player.onFoot ? player.pos : (S.car ? S.car.pos : player.pos);
  const dist = aiming ? 3.4 : (player.onFoot ? 7.5 : 11);
  const height = aiming ? 1.95 : (player.onFoot ? 3.1 : 4.2);
  const back = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
  const speed01 = S.car ? Math.min(Math.abs(S.car.speed) / CFG.CAR.maxSpeed, 1) : 0;
  const want = new THREE.Vector3(
    target.x + back.x * dist + (aiming ? right.x * 0.95 : 0),
    target.y + height + effPitch * (aiming ? 1.2 : 4),
    target.z + back.z * dist + (aiming ? right.z * 0.95 : 0),
  );
  const k = 1 - Math.exp(-7 * dt);
  camPos.lerp(want, k);
  // Keep the camera out of buildings (simple: lift it).
  if (world.isInBuilding(camPos.x, camPos.z, 0.5)) camPos.y = Math.max(camPos.y, 14);
  const shake = S.fx.shakeOffset(dt);
  camera.position.set(camPos.x + shake.x, camPos.y + shake.y, camPos.z);
  const look = new THREE.Vector3(
    target.x + back.x * (aiming ? -10 : -2.5),
    target.y + (aiming ? 1.5 : 1.6),
    target.z + back.z * (aiming ? -10 : -2.5),
  );
  camera.lookAt(look);
  const wantFov = aiming ? 50 : 62 + speed01 * 13;
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
  S.day = 1 + Math.floor((18.5 + S.time / 60) / 24);

  if (S.mode === 'playing') {
    // Wanted: the HeatDirector owns the drain now (lay-low triples it,
    // speeding halves it, hideouts + spray shed stars); stars follow.
    S.heatDirector.update(dt);
    S.wanted = wantedFromHeat(S.heat);
    S.health = player.health;

    // Auto-start the next job at the garage.
    if (!S.missions.current && S.missionIndex < 10) {
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
    if (S.dialogue) S.dialogue.update(dt);
    // Round 5 directors tick with the playing simulation.
    if (S.cityLife) S.cityLife.update(dt);
    if (S.radioDirector) S.radioDirector.update(dt);
    if (S.menuDirector) S.menuDirector.update();
    // Round 5 world systems: shop/safehouse/garage panels, districts,
    // Lena, side activities, and the day/night cycle.
    if (S.shopDirector) S.shopDirector.update(dt);
    if (S.safehouseDirector) S.safehouseDirector.update(dt);
    if (S.garageDirector) S.garageDirector.update(dt);
    if (S.districtDirector) S.districtDirector.update(dt);
    if (S.crew) S.crew.update(dt);
    if (S.sideActivities) S.sideActivities.update(dt);
    if (S.dayNight) S.dayNight.update(dt);
    // Round 5 life systems: chatter, the fence, the daily board.
    if (S.banterDirector) S.banterDirector.update(dt);
    if (S.fenceDirector) S.fenceDirector.update(dt);
    if (S.challengesDirector) S.challengesDirector.update();
    // Fastest speed this run (the speedster challenge reads it).
    if (S.car) S.stats.topSpeed = Math.max(S.stats.topSpeed || 0, Math.abs(S.car.speed));
    // The ending sweep, once the tenth job's done-line has cleared.
    if (S.outroPending && !(S.dialogue && S.dialogue.active) && S.cutsceneDirector && !S.cutscene) {
      S.outroPending = false;
      S.cutsceneDirector.startOutro();
    }

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

  // Death flips S.mode to 'wasted' inside player.damage(), which can fire
  // between frames — once mode has flipped, the playing block above is
  // skipped, so the in-block check never runs. Catch it here so the end
  // screen always shows. endRun() is guarded by runEnded, so this is safe
  // to evaluate every frame.
  if (S.mode === 'wasted') endRun('wasted');

  S.fx.update(rawDt);
  if (world.water) {
    world.water.position.y = 0.05 + Math.sin(S.time * 0.7) * 0.03;
    const wm = world.water.material;
    if (wm && wm.uniforms && wm.uniforms.uTime) wm.uniforms.uTime.value = S.time;
  }
  updateCamera(rawDt);
  S.hud.update(rawDt);
  // Heat pulse follows the wanted level: a slow red throb at 3 stars,
  // a fast hard pulse at 4+.
  postfx.setHeatPulse(S.wanted >= 4 ? 0.55 + 0.35 * Math.sin(S.time * 5) : (S.wanted >= 3 ? 0.3 : 0));
  postfx.render(S.time);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx.setSize();
});

// Title screen first; the world idles behind it.
S.hud.showTitle(!!loadGame());
S.hud.setMuted(S.muted);
animate();

// QA / automation hook (harmless in normal play).
window.__solmar = { S, world, player, startGame, setPaused, THREE, get heli() { return heli; } };
