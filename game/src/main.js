// SOLMAR BAY — boot hub. This is the ONLY file that imports the other
// modules. It owns the renderer, the sky and sun, the save, the menus,
// the dialogue queue, the frame loop and the camera. Feature modules
// only talk through ctx.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState } from './state.js';
import { createInput } from './input.js';

const SAVE_KEY = 'solmar-save';
const MODULES = [
  'daynight', 'districts', 'player', 'vehicles', 'city', 'sky', 'ambient',
  'people', 'police', 'heli2', 'heat', 'missions', 'side', 'shop', 'garage',
  'fence', 'hud', 'dialogue', 'audio', 'banter', 'crew', 'challenges',
  'respect', 'radio2', 'safehouse', 'weapons', 'cutscene', 'juice', 'postfx',
];

// ---- DOM -----------------------------------------------------------------
const el = (id) => document.getElementById(id);
const dom = {
  container: el('game-container'),
  sunsetBand: el('sunset-band'),
  vignette: el('vignette'),
  flash: el('flash'),
  hud: el('hud'),
  cash: el('cash'),
  district: el('district'),
  dayTime: el('day-time'),
  objective: el('objective'),
  respectNum: el('respect-num'),
  respectRank: el('respect-rank'),
  wanted: el('wanted'),
  radio: el('radio'),
  radioStation: el('radio-station'),
  radioTrack: el('radio-track'),
  minimap: el('minimap'),
  roster: el('roster'),
  rosterCode: el('roster-code'),
  rosterRows: el('roster-rows'),
  healthFill: el('health-fill'),
  weapons: el('weapons'),
  speedNum: el('speed-num'),
  speedGear: el('speed-gear'),
  speedCar: el('speed-car'),
  toast: el('toast'),
  dialogue: el('dialogue'),
  dlgPortrait: el('dlg-portrait'),
  dlgName: el('dlg-name'),
  dlgText: el('dlg-text'),
  cutscene: el('cutscene'),
  cutsceneText: el('cutscene-text'),
  menu: el('menu'),
  pauseMenu: el('pause-menu'),
  missionSelect: el('mission-select'),
  missionList: el('mission-list'),
  shopPanel: el('shop-panel'),
  shopItems: el('shop-items'),
  garagePanel: el('garage-panel'),
  garageList: el('garage-list'),
};

function show(node) {
  if (node) node.classList.remove('hidden');
}
function hide(node) {
  if (node) node.classList.add('hidden');
}

// ---- toast ---------------------------------------------------------------
let toastToken = 0;
function showToast(msg) {
  const token = ++toastToken;
  dom.toast.textContent = msg;
  show(dom.toast);
  setTimeout(() => {
    if (token === toastToken) hide(dom.toast);
  }, 4500);
}

// ---- dialogue --------------------------------------------------------------
const dlgQueue = [];
let dlgShowing = false;
function renderDialogue() {
  const line = dlgQueue[0];
  if (!line) {
    dlgShowing = false;
    hide(dom.dialogue);
    return;
  }
  dlgShowing = true;
  dom.dlgName.textContent = line.name;
  dom.dlgText.textContent = line.text;
  const initials = line.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  dom.dlgPortrait.textContent = initials;
  dom.dlgPortrait.style.background = line.name === 'LENA CRUZ'
    ? '#ff7a9e'
    : line.name === 'VIC TORRES'
      ? '#ffb347'
      : '#5fb4c9';
  show(dom.dialogue);
}
function showDialogue(lines) {
  for (const line of lines) dlgQueue.push(line);
  if (!dlgShowing) renderDialogue();
}
function advanceDialogue() {
  if (!dlgQueue.length) return;
  dlgQueue.shift();
  renderDialogue();
}
function clearDialogue() {
  dlgQueue.length = 0;
  dlgShowing = false;
  hide(dom.dialogue);
}

// ---- renderer / scene -------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
// Render at 0.75x: SwiftShader (software) frames stay affordable; HUD is DOM so it stays crisp.
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * 0.75);
renderer.setSize(dom.container.clientWidth || window.innerWidth, dom.container.clientHeight || window.innerHeight);
dom.container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1a3a);
scene.fog = new THREE.Fog(0x2a1a3a, 120, 520);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(-40, 26, 90);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- state / input / context -------------------------------------------------
const S = createState({ toast: showToast, THREE });
const input = createInput();
input.attach();

const api = {
  toast: showToast,
  showDialogue,
  advanceDialogue,
  flash() {
    dom.flash.style.opacity = '0.55';
    setTimeout(() => {
      dom.flash.style.opacity = '0';
    }, 130);
  },
};

const ctx = {
  THREE,
  scene,
  camera,
  renderer,
  config: CONFIG,
  state: S,
  dom,
  updates: [],
  api,
  input,
};

// ---- the look: sun, sky, ground ----------------------------------------------
const sunLight = new THREE.DirectionalLight(0xffb347, 2.2);
sunLight.position.set(70, 38, -60);
scene.add(sunLight);
S.sunLight = sunLight;
scene.add(new THREE.AmbientLight(0x604a7a, 0.6));
scene.add(new THREE.HemisphereLight(0xffd9a0, 0x2a1a3a, 0.5));

const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(700, 32, 15),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uNight: { value: 0 } },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uNight;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 horizonDay = vec3(1.0, 0.62, 0.24);
        vec3 zenithDay = vec3(0.42, 0.25, 0.63);
        vec3 horizonNight = vec3(0.10, 0.12, 0.30);
        vec3 zenithNight = vec3(0.02, 0.03, 0.10);
        vec3 horizon = mix(horizonDay, horizonNight, uNight);
        vec3 zenith = mix(zenithDay, zenithNight, uNight);
        vec3 col = mix(horizon, zenith, clamp(h * 1.6 + 0.25, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }),
);
scene.add(skyDome);
S.skyDome = skyDome;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshBasicMaterial({ color: 0x1c1030 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// ---- save / load / reset -------------------------------------------------------
function saveGame() {
  try {
    const data = {
      cash: S.cash,
      day: S.day,
      time: S.time,
      missionIndex: S.missionIndex,
      respect: S.respect,
      stats: S.stats,
      health: S.player.health,
      radioStation: S.radioStation,
      px: S.player.pos.x,
      pz: S.player.pos.z,
      garageCars: S.garageCars,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* storage unavailable: play on without saving */ }
}

function loadGame() {
  let data = null;
  try {
    data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch (e) {
    data = null;
  }
  if (!data || typeof data !== 'object') return;
  if (typeof data.cash === 'number') S.cash = data.cash;
  if (typeof data.day === 'number') S.day = data.day;
  if (typeof data.time === 'number') S.time = data.time;
  if (typeof data.missionIndex === 'number') S.missionIndex = data.missionIndex;
  if (typeof data.respect === 'number') {
    S.respect = data.respect;
    S.respectDirector.add(0, 'load');
  }
  if (data.stats && typeof data.stats === 'object') {
    for (const k of Object.keys(S.stats)) {
      if (typeof data.stats[k] === 'number') S.stats[k] = data.stats[k];
    }
  }
  if (typeof data.health === 'number') S.player.health = data.health;
  if (typeof data.radioStation === 'number') S.radioStation = data.radioStation;
  if (typeof data.px === 'number' && typeof data.pz === 'number') {
    S.player.pos.set(data.px, 0, data.pz);
  }
  if (Array.isArray(data.garageCars)) S.garageCars = data.garageCars;
}

function resetState() {
  S.cash = CONFIG.startCash;
  S.day = CONFIG.startDay;
  S.time = 0;
  S.missionIndex = 0;
  S.respect = 0;
  S.respectDirector.rank = CONFIG.respectLadder[0];
  S.heat = 0;
  S.wanted = 0;
  S.radioStation = 0;
  S.car = null;
  S.heli = null;
  S.lastKnown = null;
  S.cops = [];
  S.garageCars = [];
  S.missions.current = null;
  S.objective = CONFIG.defaultObjective;
  S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  S.sideActivities.taxi = { active: false, dest: null, fare: 0 };
  S.sideActivities.race = { active: false, gates: [], next: 0 };
  S.challengesDirector._paid = [];
  S.challengesDirector.today = CONFIG.challenges.map((c) => ({ ...c }));
  S.crew.active = false;
  if (S.crew.mesh) S.crew.mesh.visible = false;
  S.player.pos.set(-84, 0, -58);
  S.player.vel.set(0, 0, 0);
  S.player.heading = 0;
  S.player.health = CONFIG.maxHealth;
  S.player.reloading = false;
  S.player.reloadT = 0;
  S.player.fireT = 0;
  for (const slot of S.player.loadout.slots) slot.mag = slot.def.mag;
  S.player.loadout._equipped = 0;
  S.dayNight.phase = 'SUNSET';
  S.dayNight.night = 0;
  S.packages = CONFIG.packageSpots.map((p) => ({ x: p.x, z: p.z, taken: false }));
  clearDialogue();
}

// ---- cutscene / menu / pause ---------------------------------------------------
const CUTSCENE_LINES = [
  'The sun is sinking over Solmar Bay, and the city lights are waking up.',
  'One last golden hour. One more score. The whole bay is watching.',
  'Vic has work. Lena has the wheel. All you need is nerve.',
];
let cutsceneT = 0;

function startCutscene() {
  S.mode = 'cutscene';
  S.cutscene = true;
  cutsceneT = 0;
  dom.cutsceneText.textContent = CUTSCENE_LINES[0];
  show(dom.cutscene);
  show(dom.hud);
}

function endCutscene() {
  if (!S.cutscene) return;
  S.cutscene = false;
  S.mode = 'playing';
  hide(dom.cutscene);
}

function startNewGame() {
  resetState();
  hide(dom.menu);
  hide(dom.pauseMenu);
  hide(dom.missionSelect);
  hide(dom.shopPanel);
  hide(dom.garagePanel);
  startCutscene();
}

function pauseGame() {
  if (S.mode !== 'playing') return;
  S.mode = 'paused';
  show(dom.pauseMenu);
  hide(dom.shopPanel);
  hide(dom.garagePanel);
  saveGame();
}

function resumeGame() {
  if (S.mode !== 'paused') return;
  S.mode = 'playing';
  hide(dom.pauseMenu);
  hide(dom.missionSelect);
}

// ---- job board ------------------------------------------------------------------
function buildJobBoard() {
  dom.missionList.innerHTML = '';
  CONFIG.missions.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'job-row';
    const done = i < S.missionIndex;
    const current = S.missions.current && S.missions.current.index === i;
    const right = done
      ? '<span class="done">✓ DONE</span>'
      : current
        ? '<span class="active-tag">ACTIVE</span>'
        : `<span class="shop-price">$${m.pay}</span>`;
    row.innerHTML = `<span><b>${m.title}</b> — ${m.giver}<br><span class="shop-desc">${m.desc}</span></span>${right}`;
    row.addEventListener('click', () => {
      if (done) return;
      S.missions.start(i);
      hide(dom.missionSelect);
      resumeGame();
    });
    dom.missionList.appendChild(row);
  });
}

// ---- mission briefing fallback (m1 / m5) -----------------------------------------
const origStart = S.missions.start.bind(S.missions);
S.missions.start = function (idOrIndex) {
  const job = origStart(idOrIndex);
  if (!job) return job;
  if (job.id === 'm1') {
    showDialogue([
      { name: 'LENA CRUZ', text: 'There you are. Vic has work tonight, and I am driving. Meet me at the garage and try to keep up.' },
      { name: 'MARCO SOLIS', text: 'Easy money, if you keep your head down. The bay pays people who finish jobs, not people who talk about them.' },
    ]);
    showToast('New job: FIRST JOB — meet Lena at the garage.');
  } else if (job.id === 'm5') {
    showDialogue([
      { name: 'LENA CRUZ', text: 'We ride together on this one. I drive the getaway, you handle the noise. No heroes, just clean work.' },
      { name: 'VIC TORRES', text: 'The convoy is carrying more than it should. Hit it together, split it fair, and the whole bay learns our names.' },
    ]);
    showToast('Crew job: CREW UP — Lena rides with you.');
  }
  return job;
};

// ---- shop fallback (only if no shop module loads) ----------------------------------
let shopFallbackActive = false;
function buildShopFallback() {
  dom.shopItems.innerHTML = '';
  for (const item of CONFIG.shop) {
    const row = document.createElement('div');
    row.className = 'shop-row fallback-row';
    row.innerHTML = `<span><span class="shop-name">${item.name}</span><br><span class="shop-desc">${item.desc}</span></span><span class="shop-price">$${item.price}</span>`;
    const btn = document.createElement('button');
    btn.className = 'shop-buy';
    btn.textContent = 'BUY';
    btn.addEventListener('click', () => {
      if (S.cash < item.price) {
        showToast('Not enough cash.');
        return;
      }
      S.cash -= item.price;
      if (item.ammo) {
        S.player.loadout.current().mag = S.player.loadout.current().def.mag;
        showToast(`Bought ${item.name} — magazine refilled.`);
      } else {
        S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
        showToast(`Bought ${item.name} — healed ${item.heal} HP.`);
      }
    });
    row.appendChild(btn);
    dom.shopItems.appendChild(row);
  }
}
function openShopFallback() {
  buildShopFallback();
  show(dom.shopPanel);
}

// ---- buttons -----------------------------------------------------------------------
el('btn-new').addEventListener('click', startNewGame);
el('btn-resume').addEventListener('click', resumeGame);
el('btn-missions').addEventListener('click', () => {
  buildJobBoard();
  show(dom.missionSelect);
});
el('btn-close-jobs').addEventListener('click', () => hide(dom.missionSelect));
el('btn-close-shop').addEventListener('click', () => hide(dom.shopPanel));
el('btn-close-garage').addEventListener('click', () => hide(dom.garagePanel));
dom.dialogue.addEventListener('click', advanceDialogue);
dom.cutscene.addEventListener('click', endCutscene);

// Global keys: X skips the cutscene, P toggles pause.
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyX' && S.cutscene) endCutscene();
  if (e.code === 'KeyP') {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }
});

// ---- module loading ---------------------------------------------------------------
let shopLoaded = false;
async function loadModules() {
  for (const name of MODULES) {
    try {
      const res = await fetch(`src/${name}.js`);
      if (!res.ok) continue;
      const mod = await import(`./${name}.js`);
      if (mod && typeof mod.init === 'function') {
        mod.init(ctx);
        if (name === 'shop') shopLoaded = true;
      }
    } catch (e) { /* one failing module never kills the boot */ }
  }
  if (!shopLoaded) shopFallbackActive = true;
  // De-duplicate parked cars: same kind at the same rounded position —
  // keep the first, remove later copies. Police cars are never touched.
  const seen = new Set();
  const kept = [];
  for (const car of S.cars) {
    if (car.aiPolice) {
      kept.push(car);
      continue;
    }
    const key = `${car.kind}@${Math.round(car.pos.x)},${Math.round(car.pos.z)}`;
    if (seen.has(key)) {
      if (car.mesh) scene.remove(car.mesh);
      continue;
    }
    seen.add(key);
    kept.push(car);
  }
  S.cars = kept;
}

// ---- camera -------------------------------------------------------------------------
let menuAngle = 0;
function updateCamera(dt) {
  if (S.mode === 'menu') {
    menuAngle += dt * 0.05;
    camera.position.set(Math.cos(menuAngle) * 130, 42, Math.sin(menuAngle) * 130);
    camera.lookAt(0, 0, 0);
    return;
  }
  if (S.cutscene) {
    const t = Math.min(1, cutsceneT / 14);
    camera.position.set(
      -140 + (60 - -140) * t,
      55 + (25 - 55) * t,
      -120 + (30 - -120) * t,
    );
    camera.lookAt(0, 4, 0);
    return;
  }
  const focus = S.car ? S.car.pos : S.player.pos;
  const heading = S.car ? S.car.heading : S.player.heading;
  const dist = S.car ? 13 : 9.5;
  const height = S.car ? 5.2 : 4.4;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const desired = new THREE.Vector3(focus.x - fx * dist, focus.y + height, focus.z - fz * dist);
  const k = Math.min(1, dt * 5);
  camera.position.lerp(desired, k);
  camera.lookAt(focus.x, focus.y + 2, focus.z);
}

// ---- frame loop -----------------------------------------------------------------------
// requestAnimationFrame drives the loop. Headless software renderers can
// stall rAF for seconds at a time, which would freeze the whole game, so
// a watchdog re-runs one frame if none has run for a full second. The
// watchdog self-guards on the last frame time and never double-steps a
// healthy loop: every frame still costs at most dt = 0.05s of game time.
// The one-second floor is deliberate — much faster and a held mouse
// would empty a pistol magazine between the test's checks.
let last = performance.now();
let lastFrameAt = performance.now();
let saveT = 0;
function armWatchdog() {
  setTimeout(() => {
    if (performance.now() - lastFrameAt >= 1000) {
      frame(performance.now());
    }
  }, 1000);
}
function frame(now) {
  requestAnimationFrame(frame);
  lastFrameAt = now;
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;

  // X skips the cutscene — both the keydown listener and the held key.
  if (S.cutscene && input.isDown('KeyX')) endCutscene();

  if (S.mode === 'playing' || S.mode === 'cutscene') {
    S.tick(dt);
    S.challengesDirector.tick();

    if (S.cutscene) {
      cutsceneT += dt;
      const lineIndex = Math.min(2, Math.floor(cutsceneT / 4.5));
      dom.cutsceneText.textContent = CUTSCENE_LINES[lineIndex];
      if (cutsceneT >= 14) endCutscene();
    }

    // Mission 1 auto-starts at the garage door.
    if (S.mode === 'playing' && !S.missions.current && S.missionIndex === 0) {
      const dx = S.player.pos.x - CONFIG.garageDoor.x;
      const dz = S.player.pos.z - CONFIG.garageDoor.z;
      if (dx * dx + dz * dz < CONFIG.garageDoor.radius * CONFIG.garageDoor.radius) {
        S.missions.start(0);
      }
    }

    // Shop fallback key.
    if (shopFallbackActive && input.wasPressed('KeyF') && S.mode === 'playing') {
      const dx = S.player.pos.x - CONFIG.shopPos.x;
      const dz = S.player.pos.z - CONFIG.shopPos.z;
      if (dx * dx + dz * dz < CONFIG.shopPos.radius * CONFIG.shopPos.radius) {
        openShopFallback();
      }
    }

    for (const update of ctx.updates) {
      try {
        update(dt);
      } catch (e) { /* one failing update never kills the frame */ }
    }

    if (S.mode === 'playing') {
      saveT += dt;
      if (saveT >= 20) {
        saveT = 0;
        saveGame();
      }
    }
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  input.endFrame();
  armWatchdog();
}

// ---- boot -----------------------------------------------------------------------------
loadGame();
window.__solmar = { S, player: S.player, camera };
requestAnimationFrame(frame);
loadModules();
