// SOLMAR BAY — boot hub. The ONLY file that imports the other modules.
// Owns the renderer, the look, save/load, menu/pause/cutscene, the job
// board, the shop fallback, the frame loop, and window.__solmar.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState } from './state.js';
import { createInput } from './input.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'solmar-save';
const MODULES = [
  'daynight', 'districts', 'player', 'vehicles', 'city', 'sky', 'ambient',
  'people', 'police', 'heli2', 'heat', 'missions', 'side', 'shop', 'garage',
  'fence', 'hud', 'dialogue', 'audio', 'banter', 'crew', 'challenges',
  'respect', 'radio2', 'safehouse', 'weapons', 'cutscene', 'juice', 'postfx',
];
const CUTSCENE_LINES = [
  'The sun is going down over Solmar Bay — and the whole city is about to light up.',
  'You came here with $120 and a name nobody knows. Tonight, that changes.',
  "Vic Torres has work. Lena Cruz has the wheel. All you need is nerve.",
];

// ---------- DOM ----------
const dom = {};
for (const id of [
  'game-container', 'sunset-band', 'vignette', 'flash', 'hud', 'cash',
  'district', 'day-time', 'objective', 'respect-line', 'respect-num',
  'respect-rank', 'wanted', 'radio', 'radio-station', 'radio-track',
  'minimap', 'roster', 'roster-code', 'roster-rows', 'health-bar',
  'health-fill', 'weapons', 'speedo', 'speed-num', 'speed-gear',
  'speed-car', 'toast', 'dialogue', 'dlg-portrait', 'dlg-name', 'dlg-text',
  'cutscene', 'cutscene-text', 'menu', 'btn-new', 'pause-menu',
  'btn-missions', 'btn-resume', 'mission-select', 'mission-list',
  'btn-close-jobs', 'shop-panel', 'shop-items', 'btn-close-shop',
  'garage-panel', 'garage-list', 'btn-close-garage',
]) {
  dom[id] = $(id);
}
function show(el) {
  if (el) el.classList.remove('hidden');
}
function hide(el) {
  if (el) el.classList.add('hidden');
}

// ---------- State, input, context ----------
const S = createState({ toast: showToast });
const input = createInput();
input.attach();
const api = {};
const ctx = {
  THREE, scene: null, camera: null, renderer: null,
  config: CONFIG, state: S, dom, updates: [], api, input,
  shopLoaded: false,
};

// ---------- Toast ----------
let toastToken = 0;
function showToast(msg) {
  const token = ++toastToken;
  dom.toast.textContent = msg;
  show(dom.toast);
  setTimeout(() => {
    if (token === toastToken) hide(dom.toast);
  }, 4500);
}
api.toast = showToast;

// ---------- Dialogue ----------
let dlgQueue = [];
function renderDialogueLine() {
  const line = dlgQueue[0];
  if (!line) {
    hide(dom.dialogue);
    return;
  }
  dom['dlg-name'].textContent = line.name;
  dom['dlg-text'].textContent = line.text;
  const parts = line.name.split(' ');
  const initials = (parts[0][0] || 'S') + (parts[1] ? parts[1][0] : '');
  dom['dlg-portrait'].textContent = initials;
  dom['dlg-portrait'].style.background =
    line.name === 'LENA CRUZ' ? '#ff7a9e' : line.name === 'VIC TORRES' ? '#ffb347' : '#5fb4c9';
  show(dom.dialogue);
}
function showDialogue(lines) {
  dlgQueue = lines.slice();
  renderDialogueLine();
}
function advanceDialogue() {
  dlgQueue.shift();
  renderDialogueLine();
}
api.showDialogue = showDialogue;
api.advanceDialogue = advanceDialogue;

// ---------- Flash ----------
api.flash = (strength = 0.5) => {
  dom.flash.style.transition = 'none';
  dom.flash.style.opacity = String(Math.min(0.8, strength));
  requestAnimationFrame(() => {
    dom.flash.style.transition = 'opacity 0.25s';
    dom.flash.style.opacity = '0';
  });
};

// ---------- Renderer / scene / look ----------
const container = dom['game-container'];
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1a3a);
scene.fog = new THREE.Fog(0x2a1a3a, 120, 520);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(-40, 26, 90);
ctx.scene = scene;
ctx.camera = camera;
ctx.renderer = renderer;
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const sunLight = new THREE.DirectionalLight(0xffb347, 2.2);
sunLight.position.set(70, 38, -60);
scene.add(sunLight);
S.sunLight = sunLight;
scene.add(new THREE.AmbientLight(0x604a7a, 0.7));
scene.add(new THREE.HemisphereLight(0xffb347, 0x2a1a3a, 0.5));

// Shader sky dome: orange horizon through purple dusk by day, deep night blue.
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
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
      vec3 sunset = mix(vec3(1.0, 0.55, 0.2), vec3(0.35, 0.15, 0.45), clamp(h * 1.6 + 0.15, 0.0, 1.0));
      vec3 night = mix(vec3(0.02, 0.03, 0.12), vec3(0.08, 0.05, 0.2), clamp(h * 1.6 + 0.15, 0.0, 1.0));
      vec3 col = mix(sunset, night, uNight);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 15), skyMat);
scene.add(skyDome);
S.skyDome = skyDome;

// Dark ground plane.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// ---------- Save / load / reset ----------
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: S.cash, day: S.day, time: S.time, missionIndex: S.missionIndex,
      respect: S.respect, stats: S.stats, health: S.player.health,
      radioStation: S.radioStation, playerX: S.player.pos.x, playerZ: S.player.pos.z,
      garageCars: S.garageCars,
    }));
  } catch (e) {
    /* storage unavailable — play on without saving */
  }
}
function loadGame() {
  let data = null;
  try {
    data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch (e) {
    data = null;
  }
  if (!data || typeof data !== 'object') return;
  try {
    if (typeof data.cash === 'number') S.cash = data.cash;
    if (typeof data.day === 'number') S.day = data.day;
    if (typeof data.time === 'number') S.time = data.time;
    if (typeof data.missionIndex === 'number') S.missionIndex = data.missionIndex;
    if (typeof data.respect === 'number') {
      S.respect = data.respect;
      S.respectDirector.add(0, 'load');
    }
    if (data.stats && typeof data.stats === 'object') {
      for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
        if (typeof data.stats[k] === 'number') S.stats[k] = data.stats[k];
      }
    }
    if (typeof data.health === 'number') S.player.health = data.health;
    if (typeof data.radioStation === 'number') S.radioStation = data.radioStation;
    if (typeof data.playerX === 'number' && typeof data.playerZ === 'number') {
      S.player.pos.set(data.playerX, 0, data.playerZ);
    }
    if (Array.isArray(data.garageCars)) S.garageCars = data.garageCars;
  } catch (e) {
    /* corrupt save — fresh start */
  }
}
function resetState() {
  // Clear police from the world first (meshes included).
  for (const cop of S.cars.filter((c) => c.aiPolice)) {
    if (cop.mesh) scene.remove(cop.mesh);
  }
  S.cars = S.cars.filter((c) => !c.aiPolice);
  S.cops = [];
  if (S.heli && S.heli.mesh) scene.remove(S.heli.mesh);
  S.heli = null;
  S.lastKnown = null;
  S.cash = CONFIG.startCash;
  S.day = CONFIG.startDay;
  S.time = 0;
  S.missionIndex = 0;
  S.respect = 0;
  S.respectDirector.rank = { title: 'NOBODY', min: 0 };
  S.heat = 0;
  S.wanted = 0;
  S.radioStation = 0;
  S.district = 'downtown';
  S.dayNight.phase = 'SUNSET';
  S.dayNight.night = 0;
  S.car = null;
  S.garageCars = [];
  S.missions.current = null;
  S.objective = 'Explore Solmar Bay — find work.';
  S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  // Mutate the activity objects in place (never replace them): modules
  // hold live references to these objects from init time.
  S.sideActivities.taxi.active = false;
  S.sideActivities.taxi.dest = null;
  S.sideActivities.taxi.fare = 0;
  S.sideActivities.race.active = false;
  S.sideActivities.race.gates = [];
  S.sideActivities.race.next = 0;
  S.challengesDirector.today = CONFIG.challenges.map((c) => ({ ...c }));
  S.challengesDirector._paid = [];
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
  S.player.loadout.equipped = 0;
  dlgQueue = [];
  hide(dom.dialogue);
  S.cutscene = false;
}

// ---------- Cutscene / menu / pause ----------
let cutsceneT = 0;
let cutsceneLine = -1;
function startCutscene() {
  S.mode = 'cutscene';
  S.cutscene = true;
  cutsceneT = 0;
  cutsceneLine = 0;
  dom['cutscene-text'].textContent = CUTSCENE_LINES[0];
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
  hide(dom['pause-menu']);
  hide(dom['mission-select']);
  hide(dom['shop-panel']);
  hide(dom['garage-panel']);
  show(dom.hud);
  startCutscene();
}
function pauseGame() {
  if (S.mode !== 'playing') return;
  S.mode = 'paused';
  show(dom['pause-menu']);
  hide(dom['shop-panel']);
  hide(dom['garage-panel']);
  saveGame();
}
function resumeGame() {
  S.mode = 'playing';
  hide(dom['pause-menu']);
  hide(dom['mission-select']);
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyX' && S.cutscene) endCutscene();
});

// ---------- Job board ----------
function buildJobBoard() {
  dom['mission-list'].innerHTML = '';
  CONFIG.missions.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'job-row';
    const title = document.createElement('span');
    title.className = 'job-title';
    title.textContent = `${i + 1}. ${m.title}`;
    const giver = document.createElement('span');
    giver.className = 'job-giver';
    giver.textContent = m.giver;
    const pay = document.createElement('span');
    pay.className = 'job-pay';
    if (i < S.missionIndex) {
      pay.textContent = '✓';
      pay.classList.add('job-done');
    } else if (S.missions.current && S.missions.current.index === i) {
      pay.textContent = 'ACTIVE';
      pay.classList.add('job-active');
    } else {
      pay.textContent = `$${m.pay}`;
    }
    row.append(title, giver, pay);
    row.addEventListener('click', () => {
      if (i < S.missionIndex) return;
      S.missions.start(i);
      hide(dom['mission-select']);
      resumeGame();
    });
    dom['mission-list'].appendChild(row);
  });
}

// ---------- Buttons ----------
dom['btn-new'].addEventListener('click', startNewGame);
dom['btn-resume'].addEventListener('click', resumeGame);
dom['btn-missions'].addEventListener('click', () => {
  buildJobBoard();
  show(dom['mission-select']);
});
dom['btn-close-jobs'].addEventListener('click', () => hide(dom['mission-select']));
dom['btn-close-shop'].addEventListener('click', () => hide(dom['shop-panel']));
dom['btn-close-garage'].addEventListener('click', () => hide(dom['garage-panel']));
dom.dialogue.addEventListener('click', advanceDialogue);
dom.cutscene.addEventListener('click', endCutscene);

// ---------- Mission briefing fallback (m1 / m5) ----------
const origStart = S.missions.start.bind(S.missions);
S.missions.start = function start(idOrIndex) {
  const job = origStart(idOrIndex);
  if (!job) return job;
  if (job.index === 0) {
    showDialogue([
      { name: 'LENA CRUZ', text: "Vic's got work for you, and I don't do waiting. Meet me at the garage — wheels up, the sunset's burning." },
      { name: 'MARCO SOLIS', text: 'Easy, kid. The package moves on the Strip. You don\'t see me, I don\'t see you.' },
    ]);
    showToast('New job: FIRST JOB — meet Lena at the garage.');
  } else if (job.index === 4) {
    showDialogue([
      { name: 'LENA CRUZ', text: "Convoy's rolling at dusk. You drive, I ride shotgun — literally." },
      { name: 'VIC TORRES', text: "Lena's with you on this one. Bring me the convoy and the bay is yours." },
    ]);
    showToast('New job: CREW UP — Lena rides with you.');
  }
  return job;
};

// ---------- Shop fallback (only if no shop module loaded) ----------
let shopFallbackActive = false;
function installShopFallback() {
  shopFallbackActive = true;
  dom['shop-items'].innerHTML = '';
  for (const item of CONFIG.shop.items) {
    const row = document.createElement('div');
    row.className = 'shop-row fallback-row';
    row.dataset.fallback = 'true';
    const name = document.createElement('span');
    name.className = 'shop-name';
    name.textContent = item.name;
    const desc = document.createElement('span');
    desc.className = 'shop-desc';
    desc.textContent = item.desc;
    const price = document.createElement('span');
    price.className = 'shop-price';
    price.textContent = `$${item.price}`;
    const btn = document.createElement('button');
    btn.className = 'shop-buy';
    btn.textContent = 'BUY';
    btn.addEventListener('click', () => {
      // The fallback buy handler ignores rows built by a real shop module.
      if (row.dataset.fallback !== 'true') return;
      if (S.cash < item.price) {
        showToast('Not enough cash.');
        return;
      }
      S.cash -= item.price;
      if (item.ammo) {
        S.player.loadout.current().mag = S.player.loadout.current().def.mag;
        showToast(`Ammo Box: magazine refilled. -$${item.price}`);
      } else {
        S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
        showToast(`${item.name}: +${item.heal} HP. -$${item.price}`);
      }
    });
    row.append(name, desc, price, btn);
    dom['shop-items'].appendChild(row);
  }
}

// ---------- Module loading ----------
async function loadModules() {
  for (const name of MODULES) {
    try {
      const url = new URL(`./${name}.js`, import.meta.url).href;
      const res = await fetch(url);
      if (!res.ok) continue;
      const mod = await import(url);
      if (typeof mod.init === 'function') mod.init(ctx);
      else if (typeof mod.default === 'function') mod.default(ctx);
    } catch (e) {
      /* missing or failing module is a quiet skip — never a console error */
    }
  }
  // De-duplicate parked cars: same kind at the same rounded position —
  // keep the first, remove later copies (mesh and all). Police untouched.
  const seen = new Set();
  for (const car of [...S.cars]) {
    if (car.aiPolice) continue;
    const key = `${car.kind}@${Math.round(car.pos.x)},${Math.round(car.pos.z)}`;
    if (seen.has(key)) {
      const i = S.cars.indexOf(car);
      if (i >= 0) S.cars.splice(i, 1);
      if (car.mesh) scene.remove(car.mesh);
    } else {
      seen.add(key);
    }
  }
  if (!ctx.shopLoaded) installShopFallback();
}

// ---------- Day / night ----------
function updateDayNight(dt) {
  let target = 0;
  let phase = 'SUNSET';
  if (S.time >= CONFIG.nightAt) {
    phase = 'NIGHT';
    target = 1;
  } else if (S.time >= CONFIG.duskAt) {
    phase = 'DUSK';
    target = (S.time - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt);
  }
  S.dayNight.phase = phase;
  const step = 0.6 * dt;
  if (S.dayNight.night < target) S.dayNight.night = Math.min(target, S.dayNight.night + step);
  else if (S.dayNight.night > target) S.dayNight.night = Math.max(target, S.dayNight.night - step);
  const night = S.dayNight.night;
  sunLight.intensity = 2.2 - night * 1.85;
  sunLight.color.setHex(night > 0.6 ? 0x8fb4ff : 0xffb347);
  skyMat.uniforms.uNight.value = night;
}

// ---------- Camera ----------
let menuAngle = 0;
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  if (S.mode === 'menu') {
    menuAngle += dt * 0.05;
    camera.position.set(Math.cos(menuAngle) * 120, 42, Math.sin(menuAngle) * 120);
    camera.lookAt(0, 8, 0);
    return;
  }
  if (S.mode === 'cutscene') {
    const t = Math.min(1, cutsceneT / 14);
    camera.position.set(
      -140 + (60 - -140) * t,
      55 + (25 - 55) * t,
      -120 + (30 - -120) * t
    );
    camera.lookAt(0, 8, 0);
    return;
  }
  const inCar = !!S.car;
  const focus = inCar ? S.car.pos : S.player.pos;
  const heading = inCar ? S.car.heading : S.player.heading;
  const dist = inCar ? 13 : 9.5;
  const height = inCar ? 5.2 : 4.4;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  camTarget.set(focus.x - fx * dist, height, focus.z - fz * dist);
  const k = Math.min(1, 5 * dt);
  camera.position.lerp(camTarget, k);
  camera.lookAt(focus.x, focus.y + 2, focus.z);
}

// ---------- Frame loop ----------
let last = performance.now();
let saveAcc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000 || 0.016));
  last = now;
  // Snapshot edge presses BEFORE any update reads them, so a press that
  // lands mid-frame survives into this frame's updates.
  input.beginFrame();
  // Global keys (work even when paused).
  if (input.wasPressed('KeyP')) {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }
  if (S.cutscene && input.isDown('KeyX')) endCutscene();
  if (S.mode !== 'paused' && S.mode !== 'menu') {
    S.tick(dt);
    S.challengesDirector.tick();
    if (S.mode === 'cutscene') {
      cutsceneT += dt;
      const lineIdx = Math.min(CUTSCENE_LINES.length - 1, Math.floor(cutsceneT / 4.5));
      if (lineIdx !== cutsceneLine) {
        cutsceneLine = lineIdx;
        dom['cutscene-text'].textContent = CUTSCENE_LINES[lineIdx];
      }
      if (cutsceneT >= 14) endCutscene();
    }
    // Mission 1 auto-start at the garage.
    if (S.mode === 'playing' && !S.missions.current && S.missionIndex === 0) {
      const dx = S.player.pos.x - CONFIG.garageDoor.x;
      const dz = S.player.pos.z - CONFIG.garageDoor.z;
      if (Math.sqrt(dx * dx + dz * dz) < CONFIG.garageDoor.radius) {
        S.missions.start(0);
      }
    }
    for (const update of ctx.updates) {
      try {
        update(dt);
      } catch (e) {
        /* one failing module never kills the frame */
      }
    }
    updateDayNight(dt);
    updateCamera(dt);
    if (S.mode === 'playing') {
      saveAcc += dt;
      if (saveAcc >= 20) {
        saveAcc = 0;
        saveGame();
      }
    }
    // Shop fallback key (F near the MART) — only when the fallback is live.
    if (S.mode === 'playing' && shopFallbackActive && input.wasPressed('KeyF')) {
      const dx = S.player.pos.x - CONFIG.shop.x;
      const dz = S.player.pos.z - CONFIG.shop.z;
      if (Math.sqrt(dx * dx + dz * dz) < CONFIG.shop.radius + 3) {
        show(dom['shop-panel']);
      }
    }
  } else if (S.mode === 'menu') {
    updateCamera(dt);
  }
  renderer.render(scene, camera);
}

// ---------- Boot ----------
loadGame();
window.__solmar = { S, player: S.player, camera };
requestAnimationFrame(frame);
loadModules();
