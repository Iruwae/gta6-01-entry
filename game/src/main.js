import * as THREE from '../vendor/three.module.min.js';
import { createState, init as stateInit } from './state.js';
import { init as configInit } from './config.js';
import { init as randomInit } from './random.js';
import { init as inputInit } from './input.js';
import { init as skyInit } from './sky.js';
import { init as postfxInit } from './postfx.js';
import { init as daynightInit } from './daynight.js';
import { init as cityInit } from './city.js';
import { init as districtsInit } from './districts.js';
import { init as peopleInit } from './people.js';
import { init as ambientInit } from './ambient.js';
import { init as juiceInit } from './juice.js';
import { init as playerInit } from './player.js';
import { init as vehiclesInit } from './vehicles.js';
import { init as weaponsInit } from './weapons.js';
import { init as policeInit } from './police.js';
import { init as heliInit } from './heli2.js';
import { init as heatInit } from './heat.js';
import { init as missionsInit } from './missions.js';
import { init as dialogueInit } from './dialogue.js';
import { init as crewInit } from './crew.js';
import { init as cutsceneInit } from './cutscene.js';
import { init as shopInit } from './shop.js';
import { init as safehouseInit } from './safehouse.js';
import { init as garageInit } from './garage.js';
import { init as sideInit } from './side.js';
import { init as fenceInit } from './fence.js';
import { init as challengesInit } from './challenges.js';
import { init as respectInit } from './respect.js';
import { init as banterInit } from './banter.js';
import { init as menuInit } from './menu.js';
import { init as audioInit } from './audio.js';
import { init as radioInit } from './radio2.js';
import { init as hudInit } from './hud.js';

// SOLMAR BAY — boot + main loop.
//
// The boot builds the renderer, scene and camera, then runs every
// module's init(S) in one fixed order. The order is the wiring
// contract: config and state first, the world (sky, city, districts)
// before anything that walks in it, the player before the vehicles
// that carry them, and the HUD last so it can read the finished
// state.
//
// The loop caps dt at 0.05, advances the clock while playing, runs
// the per-frame lists, drives the directors, derives the wanted
// level from heat, syncs health, refreshes the HUD, and chases the
// player with the camera. In the menu the camera slowly orbits the
// bay instead; during the intro flyover it sweeps the skyline.

const SAVE_KEY = 'solmar-save-v1';

// The one fixed init order. Do not reorder: later modules read what
// earlier ones put on S (the scene, the seeded rng, the glow
// texture, the player, the parked cars).
const MODULES = [
  ['config', configInit],
  ['state', stateInit],
  ['random', randomInit],
  ['input', inputInit],
  ['sky', skyInit],
  ['postfx', postfxInit],
  ['daynight', daynightInit],
  ['city', cityInit],
  ['districts', districtsInit],
  ['people', peopleInit],
  ['ambient', ambientInit],
  ['juice', juiceInit],
  ['player', playerInit],
  ['vehicles', vehiclesInit],
  ['weapons', weaponsInit],
  ['police', policeInit],
  ['heli2', heliInit],
  ['heat', heatInit],
  ['missions', missionsInit],
  ['dialogue', dialogueInit],
  ['crew', crewInit],
  ['cutscene', cutsceneInit],
  ['shop', shopInit],
  ['safehouse', safehouseInit],
  ['garage', garageInit],
  ['side', sideInit],
  ['fence', fenceInit],
  ['challenges', challengesInit],
  ['respect', respectInit],
  ['banter', banterInit],
  ['menu', menuInit],
  ['audio', audioInit],
  ['radio2', radioInit],
  ['hud', hudInit],
];

function wantedForHeat(heat) {
  const h = heat || 0;
  if (h >= 80) return 5;
  if (h >= 60) return 4;
  if (h >= 40) return 3;
  if (h >= 20) return 2;
  if (h >= 10) return 1;
  return 0;
}

// Drive one director for a frame: tick() wins, update() is the
// fallback. `already` holds the functions the per-frame lists just
// ran, so a director that registered itself there is never driven
// twice in the same frame.
function driveTick(obj, dt, already, fallback) {
  if (!obj) return;
  if (typeof obj.tick === 'function') {
    if (!already.has(obj.tick)) obj.tick(dt);
  } else if (typeof obj.update === 'function') {
    if (!already.has(obj.update)) obj.update(dt);
  } else if (typeof fallback === 'function') {
    fallback(dt);
  }
}

function loadSave(S) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const save = JSON.parse(raw);
    if (typeof save.cash === 'number') S.cash = save.cash;
    if (typeof save.respect === 'number') {
      S.respect = save.respect;
      if (S.respectDirector && typeof S.respectDirector._refresh === 'function') {
        S.respectDirector._refresh();
      }
    }
    if (typeof save.day === 'number' && save.day >= 1) S.day = save.day;
  } catch (e) { /* a corrupt save must never stop the boot */ }
}

function saveGame(S) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: S.cash,
      respect: S.respect,
      day: S.day,
    }));
  } catch (e) { /* storage can be full or blocked; the game goes on */ }
}

export function boot() {
  const S = createState();

  // ---- renderer, scene, camera (before any module init) ------------
  const container = document.getElementById('game-container') || document.body;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a1638);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1400);
  camera.position.set(-40, 30, 90);
  camera.lookAt(0, 0, 0);

  S.renderer = renderer;
  S.scene = scene;
  S.camera = camera;
  S.updates = S.updates || [];
  // Modules that hook themselves into the loop (vehicles, heat,
  // police) register here so the main loop drives them exactly once
  // per frame; their own fallback drivers stay idle while we run.
  S.addUpdater = (fn) => {
    if (typeof fn === 'function' && !S.updates.includes(fn)) S.updates.push(fn);
  };

  // A save from an earlier session restores cash, respect and day.
  // Fresh players (and the smoke test, which clears storage) start
  // at the defaults from createState().
  loadSave(S);

  // ---- run every module init, in the fixed order --------------------
  for (const [name, fn] of MODULES) {
    try {
      fn(S);
    } catch (err) {
      console.error('[solmar] init failed: ' + name, err);
    }
  }

  // ---- camera rig ----------------------------------------------------
  const camPos = new THREE.Vector3(-40, 30, 90);
  const camLook = new THREE.Vector3(0, 0, 0);
  let menuAngle = 0.6;
  const tmpLook = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();

  function chaseCamera(dt) {
    const anchor = S.car ? S.car.pos : S.player.pos;
    const heading = S.car ? S.car.heading : S.player.heading;
    const inCar = !!S.car;
    const dist = inCar ? 12 : 8;
    const height = inCar ? 5 : 4.2;
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    tmpTarget.set(anchor.x - fx * dist, height, anchor.z - fz * dist);
    const blend = 1 - Math.exp(-5 * dt);
    camPos.lerp(tmpTarget, blend);
    tmpLook.set(anchor.x + fx * 5, 1.4, anchor.z + fz * 5);
    camLook.lerp(tmpLook, 1 - Math.exp(-8 * dt));
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  function orbitCamera(dt) {
    menuAngle += dt * 0.07;
    const r = 95;
    camPos.set(Math.cos(menuAngle) * r, 52, Math.sin(menuAngle) * r);
    camera.position.copy(camPos);
    camera.lookAt(0, 2, 0);
  }

  function flyoverCamera(dt) {
    const t = (S.cutscene && S.cutscene.t) || 0;
    const a = t * 0.12;
    const r = 78;
    camPos.set(Math.cos(a) * r, 26 + Math.sin(t * 0.25) * 6, Math.sin(a) * r);
    camera.position.copy(camPos);
    const anchor = S.player ? S.player.pos : tmpTarget.set(0, 0, 0);
    camera.lookAt(anchor.x, 4, anchor.z);
  }

  function applyShake() {
    const trauma = (S.juice && S.juice.trauma) || 0;
    if (trauma <= 0.001) return;
    const amp = trauma * trauma * 0.55;
    camera.position.x += (Math.random() - 0.5) * amp;
    camera.position.y += (Math.random() - 0.5) * amp;
    camera.rotation.z += (Math.random() - 0.5) * amp * 0.02;
  }

  // ---- the loop ------------------------------------------------------
  let last = performance.now();
  let frames = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    frames += 1;

    if (S.mode === 'playing') {
      S.time += dt * (S.config ? S.config.timeRate : 1);

      const tickFns = S._tick ? [...S._tick] : [];
      const updateFns = S.updates ? [...S.updates] : [];
      const already = new Set([...tickFns, ...updateFns]);
      for (const fn of tickFns) {
        try { fn(dt); } catch (e) { console.error('[solmar] tick error', e); }
      }
      for (const fn of updateFns) {
        try { fn(dt); } catch (e) { console.error('[solmar] update error', e); }
      }

      // Directors: the loop's own drive call.
      driveTick(S.challengesDirector, dt, already);
      driveTick(S.heatDirector, dt, already, (d) => {
        if (typeof S.heatDirector.decay === 'function') S.heatDirector.decay(d);
      });
      driveTick(S.missions, dt, already);
      driveTick(S.player, dt, already);
      if (S.police && (typeof S.police.tick === 'function' || typeof S.police.update === 'function')) {
        driveTick(S.police, dt, already);
      } else if (typeof S.policeUpdate === 'function' && !already.has(S.policeUpdate)) {
        try { S.policeUpdate(dt); } catch (e) { console.error('[solmar] police error', e); }
      }
      driveTick(S.crew, dt, already);

      // Wanted level is derived from heat, on the five-star scale.
      S.wanted = wantedForHeat(S.heat);
      if (S.player) S.health = S.player.health;

      if (S.cutsceneDirector && S.cutscene) {
        try { S.cutsceneDirector.update(dt); } catch (e) { /* flyover ends itself */ }
      }

      if (S.hud && typeof S.hud.update === 'function') {
        try { S.hud.update(dt); } catch (e) { console.error('[solmar] hud error', e); }
      }

      if (S.cutscene) flyoverCamera(dt);
      else chaseCamera(dt);
      applyShake();
    } else if (S.mode === 'menu') {
      orbitCamera(dt);
      if (S.hud && typeof S.hud.update === 'function') {
        try { S.hud.update(dt); } catch (e) { /* hud must not break the menu */ }
      }
    }
    // Paused: freeze the world, keep rendering the last frame.

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Autosave while playing; never on the menu screen.
  window.setInterval(() => {
    if (S.mode === 'playing') saveGame(S);
  }, 5000);
  window.addEventListener('beforeunload', () => {
    if (S.mode === 'playing') saveGame(S);
  });

  window.__solmar = {
    S,
    get player() { return S.player; },
  };

  requestAnimationFrame(frame);
  return S;
}

boot();
