// SOLMAR BAY — boot hub (GTA6-01 round 8 rebuild).
// Creates the renderer, scene and camera, builds the state, assembles
// the shared context, calls every module's init in dependency order,
// runs the animation loop, and publishes window.__solmar.
// This is the only file that imports the other modules' init functions,
// and it is the only place the renderer is ever driven.

import * as THREE from '../vendor/three.module.min.js';
import { config, init as configInit } from './config.js';
import { init as randomInit } from './random.js';
import { createState, init as stateInit } from './state.js';
import { init as inputInit } from './input.js';

// Every HUD element id the game reads, in the order the page defines
// them. The dom map carries both the dashed id and a camelCase alias.
const HUD_IDS = [
  'game-container', 'sunset-band', 'vignette', 'flash', 'hud', 'cash',
  'district', 'day-time', 'respect-line', 'respect-num', 'respect-rank',
  'health-bar', 'health-fill', 'radio', 'radio-station', 'radio-track',
  'wanted', 'roster', 'roster-code', 'roster-rows', 'minimap', 'weapons',
  'speedo', 'speed-num', 'speed-gear', 'speed-car', 'objective', 'toast',
  'dialogue', 'dlg-portrait', 'dlg-name', 'dlg-text', 'cutscene',
  'cutscene-text', 'menu', 'btn-new', 'pause-menu', 'btn-missions',
  'btn-resume', 'mission-select', 'mission-list', 'btn-close-jobs',
  'shop-panel', 'shop-items', 'btn-close-shop', 'garage-panel',
  'garage-list', 'btn-close-garage',
];

// Feature modules in dependency order: world first, actors next,
// systems after that, UI last.
const MODULE_ORDER = [
  'city', 'districts', 'sky', 'daynight', 'people', 'ambient',
  'vehicles', 'player', 'police', 'heli2', 'weapons', 'missions',
  'challenges', 'respect', 'heat', 'crew', 'dialogue', 'banter',
  'hud', 'menu', 'cutscene', 'garage', 'shop', 'side', 'safehouse',
  'audio', 'radio2', 'fence', 'juice', 'postfx',
];

function camel(id) {
  return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function buildDom() {
  const dom = {};
  for (const id of HUD_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    dom[id] = el;
    dom[camel(id)] = el;
  }
  return dom;
}

function buildRenderer() {
  const host = document.getElementById('game-container') || document.body;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.id = 'game-canvas';
  host.appendChild(renderer.domElement);
  return renderer;
}

// Load one feature module and run its init. A module that fails to
// load or throws in init is warned about, never fatal: the rest of the
// city still boots and the loop still runs.
async function loadModule(name, ctx) {
  try {
    const mod = await import('./' + name + '.js');
    const fn = mod.init || mod.default;
    if (typeof fn === 'function') fn(ctx);
    else console.warn('[solmar] module ' + name + ' has no init export');
  } catch (err) {
    console.warn('[solmar] module ' + name + ' did not boot: ' + err.message);
  }
}

const state = createState();

// The debug handle the acceptance checks drive the game through.
// Published before any module init so the state exists even if a
// later module fails.
window.__solmar = { S: state };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1535);
scene.fog = new THREE.Fog(0x2a1535, 120, 420);

const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 1000,
);
camera.position.set(0, 26, 42);
camera.lookAt(0, 0, 0);

// The showcase screenshot tool frames its stills through this camera.
// Gameplay never reads it; it only lets the tool compose a shot.
window.__solmar.camera = camera;

const renderer = buildRenderer();

const ctx = {
  THREE,
  scene,
  camera,
  renderer,
  config,
  state,
  dom: buildDom(),
  updates: [],
  api: {},
  input: null,
};

// Core inits first, in order: config, random, state, input.
configInit(ctx);
randomInit(ctx);
stateInit(ctx);
inputInit(ctx);

// Then every feature module, in dependency order.
for (const name of MODULE_ORDER) {
  await loadModule(name, ctx);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop: fixed small dt cap so a slow headless frame cannot
// teleport the simulation, then every registered update, then render.
let last = performance.now();
let t = 0;
const warnedUpdates = new Set();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  t += dt;
  const ups = ctx.updates.slice();
  for (const u of ups) {
    try {
      u(dt, t);
    } catch (err) {
      if (!warnedUpdates.has(u)) {
        warnedUpdates.add(u);
        console.warn('[solmar] update failed: ' + err.message);
      }
    }
  }
  if (ctx.input && typeof ctx.input.endFrame === 'function') ctx.input.endFrame();
  renderer.render(scene, camera);
}

requestAnimationFrame(frame);
