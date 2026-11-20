// SOLMAR BAY — boot hub for the GTA6-01 round 7 rebuild.
//
// This is the only file that imports the other game modules. It builds
// the renderer, the scene and the camera, builds the shared state and
// the context object, calls every module's init in dependency order,
// and runs the animation loop that calls every registered update.
// Modules never import each other; they only talk through ctx.

import * as THREE from '../vendor/three.module.min.js';
import { config, init as configInit } from './config.js';
import { init as randomInit } from './random.js';
import { createState, init as stateInit } from './state.js';
import { init as inputInit } from './input.js';
import { init as cityInit } from './city.js';
import { init as districtsInit } from './districts.js';
import { init as skyInit } from './sky.js';
import { init as daynightInit } from './daynight.js';
import { init as peopleInit } from './people.js';
import { init as ambientInit } from './ambient.js';
import { init as vehiclesInit } from './vehicles.js';
import { init as playerInit } from './player.js';
import { init as policeInit } from './police.js';
import { init as heliInit } from './heli2.js';
import { init as weaponsInit } from './weapons.js';
import { init as missionsInit } from './missions.js';
import { init as challengesInit } from './challenges.js';
import { init as respectInit } from './respect.js';
import { init as heatInit } from './heat.js';
import { init as crewInit } from './crew.js';
import { init as dialogueInit } from './dialogue.js';
import { init as banterInit } from './banter.js';
import { init as hudInit } from './hud.js';
import { init as menuInit } from './menu.js';
import { init as cutsceneInit } from './cutscene.js';
import { init as garageInit } from './garage.js';
import { init as shopInit } from './shop.js';
import { init as sideInit } from './side.js';
import { init as safehouseInit } from './safehouse.js';
import { init as audioInit } from './audio.js';
import { init as radioInit } from './radio2.js';
import { init as fenceInit } from './fence.js';
import { init as juiceInit } from './juice.js';
import { init as postfxInit } from './postfx.js';

// Every HUD element id the game touches. The dom map below is built
// from this list so a module can read ctx.dom.cash and friends.
const DOM_IDS = [
  'game-container', 'sunset-band', 'vignette', 'flash', 'hud',
  'cash', 'district', 'day-time', 'respect-line', 'respect-num',
  'respect-rank', 'health-bar', 'health-fill', 'radio', 'radio-station',
  'radio-track', 'wanted', 'roster', 'roster-code', 'roster-rows',
  'minimap', 'weapons', 'speedo', 'speed-num', 'speed-gear',
  'speed-car', 'objective', 'toast', 'dialogue', 'dlg-portrait',
  'dlg-name', 'dlg-text', 'cutscene', 'cutscene-text', 'menu',
  'btn-new', 'pause-menu', 'btn-missions', 'btn-resume',
  'mission-select', 'mission-list', 'btn-close-jobs', 'shop-panel',
  'shop-items', 'btn-close-shop', 'garage-panel', 'garage-list',
  'btn-close-garage',
];

function buildDom() {
  const dom = {};
  for (const id of DOM_IDS) dom[id] = document.getElementById(id);
  return dom;
}

function boot() {
  const container = document.getElementById('game-container');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b1540);
  scene.fog = new THREE.Fog(0x2b1540, 120, 420);

  const camera = new THREE.PerspectiveCamera(
    62, window.innerWidth / window.innerHeight, 0.1, 1200,
  );
  camera.position.set(0, 9, -16);
  camera.lookAt(0, 1.5, 0);

  const state = createState();

  const ctx = {
    THREE,
    scene,
    camera,
    renderer,
    config,
    state,
    S: state,
    dom: buildDom(),
    updates: [],
    api: {},
    input: null,
    random: null,
    clock: 0,
  };

  // Init order is dependency order: tuning and state first, then the
  // world, then the actors and systems, then the UI last.
  const inits = [
    ['config', configInit],
    ['random', randomInit],
    ['state', stateInit],
    ['input', inputInit],
    ['city', cityInit],
    ['districts', districtsInit],
    ['sky', skyInit],
    ['daynight', daynightInit],
    ['people', peopleInit],
    ['ambient', ambientInit],
    ['vehicles', vehiclesInit],
    ['player', playerInit],
    ['police', policeInit],
    ['heli2', heliInit],
    ['weapons', weaponsInit],
    ['missions', missionsInit],
    ['challenges', challengesInit],
    ['respect', respectInit],
    ['heat', heatInit],
    ['crew', crewInit],
    ['dialogue', dialogueInit],
    ['banter', banterInit],
    ['hud', hudInit],
    ['menu', menuInit],
    ['cutscene', cutsceneInit],
    ['garage', garageInit],
    ['shop', shopInit],
    ['side', sideInit],
    ['safehouse', safehouseInit],
    ['audio', audioInit],
    ['radio2', radioInit],
    ['fence', fenceInit],
    ['juice', juiceInit],
    ['postfx', postfxInit],
  ];

  for (const [name, fn] of inits) {
    try {
      fn(ctx);
    } catch (err) {
      console.warn('[solmar] init failed: ' + name, err);
    }
  }

  // The debug handle the acceptance test drives the game through.
  window.__solmar = { S: state, state, player: state.player, config, ctx };

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let last = performance.now();
  let t = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0.016;
    if (dt > 0.05) dt = 0.05;
    t += dt;
    ctx.clock = t;
    const updates = ctx.updates.slice();
    for (const update of updates) {
      try {
        update(dt, t);
      } catch (err) {
        console.warn('[solmar] update failed', err);
      }
    }
    renderer.render(scene, camera);
  }

  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
