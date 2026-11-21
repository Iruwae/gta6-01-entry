// SOLMAR BAY — boot hub. The ONLY file that imports the other modules.
// Owns the renderer, the look, save/load, menu/pause/cutscene, the job
// board, the shop fallback, day/night, camera, and the frame loop.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState } from './state.js';
import { createInput } from './input.js';

const SAVE_KEY = 'solmar-save';
const $ = (id) => document.getElementById(id);
const dom = {
  gameContainer: $('game-container'),
  sunsetBand: $('sunset-band'),
  vignette: $('vignette'),
  flash: $('flash'),
  hud: $('hud'),
  cash: $('cash'),
  district: $('district'),
  dayTime: $('day-time'),
  objective: $('objective'),
  respectLine: $('respect-line'),
  respectNum: $('respect-num'),
  respectRank: $('respect-rank'),
  wanted: $('wanted'),
  radio: $('radio'),
  radioStation: $('radio-station'),
  radioTrack: $('radio-track'),
  minimap: $('minimap'),
  roster: $('roster'),
  rosterCode: $('roster-code'),
  rosterRows: $('roster-rows'),
  healthBar: $('health-bar'),
  healthFill: $('health-fill'),
  weapons: $('weapons'),
  speedo: $('speedo'),
  speedNum: $('speed-num'),
  speedGear: $('speed-gear'),
  speedCar: $('speed-car'),
  toast: $('toast'),
  dialogue: $('dialogue'),
  dlgPortrait: $('dlg-portrait'),
  dlgName: $('dlg-name'),
  dlgText: $('dlg-text'),
  cutscene: $('cutscene'),
  cutsceneText: $('cutscene-text'),
  menu: $('menu'),
  btnNew: $('btn-new'),
  pauseMenu: $('pause-menu'),
  btnMissions: $('btn-missions'),
  btnResume: $('btn-resume'),
  missionSelect: $('mission-select'),
  missionList: $('mission-list'),
  btnCloseJobs: $('btn-close-jobs'),
  shopPanel: $('shop-panel'),
  shopItems: $('shop-items'),
  btnCloseShop: $('btn-close-shop'),
  garagePanel: $('garage-panel'),
  garageList: $('garage-list'),
  btnCloseGarage: $('btn-close-garage'),
};
function show(el) {
  if (el) el.classList.remove('hidden');
}
function hide(el) {
  if (el) el.classList.add('hidden');
}

// ---- toast ----
let toastToken = 0;
function showToast(msg) {
  const token = ++toastToken;
  if (dom.toast) {
    dom.toast.textContent = msg;
    dom.toast.classList.remove('hidden');
    setTimeout(() => {
      if (token === toastToken) dom.toast.classList.add('hidden');
    }, 4500);
  }
}

// ---- state + input + ctx ----
const S = createState({ toast: showToast });
const input = createInput();
input.attach();
const dialogueQueue = [];
const api = {
  toast: showToast,
  flash: (el) => {
    if (!dom.flash) return;
    dom.flash.style.opacity = '0.55';
    setTimeout(() => {
      dom.flash.style.opacity = '0';
    }, 110);
  },
};
const ctx = { THREE, scene: null, camera: null, renderer: null, config: CONFIG, state: S, dom, updates: [], api, input, dialogueQueue };
api.showDialogue = null;
api.advanceDialogue = null;

// ---- dialogue fallback (dialogue.js replaces these when it loads) ----
const dlgColors = { 'LENA CRUZ': '#ff7a9e', 'VIC TORRES': '#ffb347' };
function renderDialogue() {
  const line = dialogueQueue[0];
  if (!line) {
    hide(dom.dialogue);
    return;
  }
  show(dom.dialogue);
  if (dom.dlgName) dom.dlgName.textContent = line.name;
  if (dom.dlgText) dom.dlgText.textContent = line.text;
  if (dom.dlgPortrait) {
    dom.dlgPortrait.textContent = line.name.split(' ').map((w) => w[0]).join('');
    dom.dlgPortrait.style.background = dlgColors[line.name] || '#5fb4c9';
  }
}
function fallbackShowDialogue(lines) {
  for (const l of lines) dialogueQueue.push(l);
  renderDialogue();
}
function fallbackAdvanceDialogue() {
  if (!dialogueQueue.length) return;
  dialogueQueue.shift();
  renderDialogue();
}
api.showDialogue = fallbackShowDialogue;
api.advanceDialogue = fallbackAdvanceDialogue;

// ---- renderer / scene / look ----
const container = dom.gameContainer || document.body;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1a3a);
scene.fog = new THREE.Fog(0x2a1a3a, 120, 520);
const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 1200);
camera.position.set(-40, 26, 90);
ctx.scene = scene;
ctx.camera = camera;
ctx.renderer = renderer;
window.addEventListener('resize', () => {
  const w = container.clientWidth || 1280;
  const h = container.clientHeight || 720;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

const sun = new THREE.DirectionalLight(0xffb347, 2.2);
sun.position.set(70, 38, -60);
scene.add(sun);
S.sunLight = sun;
scene.add(new THREE.AmbientLight(0x664466, 0.9));
scene.add(new THREE.HemisphereLight(0xffb347, 0x2a1a3a, 0.7));
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: { uNight: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'varying vec3 vP; uniform float uNight;',
    'void main(){',
    '  float h = normalize(vP).y;',
    '  vec3 day = mix(vec3(1.0, 0.55, 0.25), vec3(0.45, 0.2, 0.5), clamp(h * 1.6 + 0.25, 0.0, 1.0));',
    '  vec3 night = mix(vec3(0.02, 0.03, 0.10), vec3(0.08, 0.10, 0.28), clamp(h * 1.6 + 0.25, 0.0, 1.0));',
    '  gl_FragColor = vec4(mix(day, night, uNight), 1.0);',
    '}',
  ].join('\n'),
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat);
scene.add(skyDome);
S.skyDome = skyDome;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x1c1426, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// ---- mission briefing fallback (m1 / m5) ----
const origStart = S.missions.start.bind(S.missions);
S.missions.start = (idOrIdx) => {
  const job = origStart(idOrIdx);
  if (!job) return job;
  // A new briefing supersedes any leftover dialogue lines.
  dialogueQueue.length = 0;
  if (job.id === 'm1') {
    api.showDialogue([
      { name: 'LENA CRUZ', text: 'There you are. Vic has work, and the sun is already going down.' },
      { name: 'MARCO SOLIS', text: 'First job is simple. Do it clean, do it quiet, and the bay starts to notice you.' },
    ]);
    showToast('New job: FIRST JOB — meet Lena at the garage.');
  } else if (job.id === 'm5') {
    api.showDialogue([
      { name: 'LENA CRUZ', text: 'Crew up. I am riding with you on this one — do not scratch my door.' },
      { name: 'VIC TORRES', text: 'The convoy runs tonight. Hit it together, split it fair, and nobody gets hurt.' },
    ]);
    showToast('New job: CREW UP — Lena rides with you.');
  }
  return job;
};

// ---- save / load / reset ----
function saveGame() {
  try {
    const data = {
      cash: S.cash,
      day: S.day,
      time: S.time,
      missionIndex: S.missionIndex,
      respect: S.respect,
      stats: { ...S.stats },
      health: S.player.health,
      radioStation: S.radioStation,
      px: S.player.pos.x,
      pz: S.player.pos.z,
      garageCars: S.garageCars.map((g) => ({ ...g, tune: { ...g.tune } })),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {}
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
    if (typeof data.missionIndex === 'number') S.missionIndex = Math.max(0, Math.min(10, data.missionIndex));
    if (typeof data.respect === 'number') {
      S.respect = data.respect;
      S.respectDirector.add(0, 'load');
    }
    if (data.stats && typeof data.stats === 'object') Object.assign(S.stats, data.stats);
    if (typeof data.health === 'number') S.player.health = data.health;
    if (typeof data.radioStation === 'number') S.radioStation = data.radioStation % 6;
    if (typeof data.px === 'number' && typeof data.pz === 'number') S.player.pos.set(data.px, 0, data.pz);
    if (Array.isArray(data.garageCars)) S.garageCars = data.garageCars;
  } catch (e) {}
}
function resetState() {
  S.cash = CONFIG.startCash;
  S.day = CONFIG.startDay;
  S.time = 0;
  S.missionIndex = 0;
  S.respect = 0;
  S.respectDirector.rank = { title: 'NOBODY', min: 0 };
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
  S.challengesDirector._paid.length = 0;
  S.crew.active = false;
  if (S.crew.mesh) S.crew.mesh.visible = false;
  S.player.pos.set(CONFIG.playerStart.x, 0, CONFIG.playerStart.z);
  S.player.heading = 0;
  S.player.health = CONFIG.maxHealth;
  S.player.reloading = false;
  S.player.reloadT = 0;
  S.player.fireT = 0;
  for (const slot of S.player.loadout.slots) slot.mag = slot.def.mag;
  S.player.loadout.equipped = 0;
  S.dayNight = { phase: 'SUNSET', night: 0 };
  S.district = 'downtown';
  S._cutT = 0;
  if (S.heatDirector) S.heatDirector.sprayBooth.armed = true;
  dialogueQueue.length = 0;
  hide(dom.dialogue);
  for (const p of S.packages) {
    p.taken = false;
    if (p.mesh) p.mesh.visible = true;
  }
}

// ---- menu / pause / cutscene ----
function startCutscene() {
  S._cutT = 0;
  S.mode = 'cutscene';
  S.cutscene = true;
  show(dom.cutscene);
  show(dom.hud);
  if (dom.cutsceneText) dom.cutsceneText.textContent = 'The sun is going down over Solmar Bay.';
}
function endCutscene() {
  S.cutscene = false;
  S._cutT = 0;
  S.mode = 'playing';
  hide(dom.cutscene);
}
api.endCutscene = endCutscene;
api.startCutscene = startCutscene;
function startNewGame() {
  resetState();
  hide(dom.menu);
  hide(dom.pauseMenu);
  hide(dom.missionSelect);
  hide(dom.shopPanel);
  hide(dom.garagePanel);
  show(dom.hud);
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
  S.mode = 'playing';
  hide(dom.pauseMenu);
  hide(dom.missionSelect);
}
api.pauseGame = pauseGame;
api.resumeGame = resumeGame;
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyX' && S.cutscene) endCutscene();
});

// ---- job board ----
function buildJobBoard() {
  if (!dom.missionList) return;
  dom.missionList.innerHTML = '';
  CONFIG.missions.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'job-row';
    const done = i < S.missionIndex;
    const current = S.missions.current && S.missions.current.index === i;
    const next = !S.missions.current && i === S.missionIndex;
    const title = document.createElement('b');
    title.textContent = m.title;
    const giver = document.createElement('span');
    giver.textContent = m.giver;
    const pay = document.createElement('span');
    pay.textContent = done ? '✓' : current || next ? 'ACTIVE' : '$' + m.pay;
    const desc = document.createElement('span');
    desc.textContent = m.desc;
    row.append(title, giver, pay, desc);
    if (i === S.missionIndex) {
      row.classList.add('job-available');
      row.addEventListener('click', () => {
        S.missions.start(i);
        hide(dom.missionSelect);
        resumeGame();
      });
    }
    dom.missionList.appendChild(row);
  });
}

// ---- shop fallback (only if no shop module loaded) ----
let shopFallbackActive = false;
function installShopFallback() {
  shopFallbackActive = true;
  const list = dom.shopItems;
  if (!list) return;
  list.innerHTML = '';
  for (const item of CONFIG.shopItems) {
    const row = document.createElement('div');
    row.className = 'shop-row fallback-row';
    row.dataset.fallback = '1';
    const name = document.createElement('span');
    name.className = 'shop-name';
    name.textContent = item.name;
    const desc = document.createElement('span');
    desc.className = 'shop-desc';
    desc.textContent = item.desc;
    const price = document.createElement('span');
    price.className = 'shop-price';
    price.textContent = '$' + item.price;
    const btn = document.createElement('button');
    btn.className = 'shop-buy';
    btn.textContent = 'BUY';
    btn.addEventListener('click', () => {
      if (row.dataset.shopReal) return;
      if (S.cash < item.price) {
        showToast('Not enough cash.');
        return;
      }
      S.cash -= item.price;
      if (item.ammo) {
        const slot = S.player.loadout.current();
        slot.mag = slot.def.mag;
        S.player.reloading = false;
        showToast(`Ammo Box bought — ${slot.def.name} refilled.`);
      } else {
        S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
        showToast(`${item.name} bought — healed ${item.heal} HP.`);
      }
    });
    row.append(name, desc, price, btn);
    list.appendChild(row);
  }
}
function openShopFallback() {
  show(dom.shopPanel);
}

// ---- buttons ----
if (dom.btnNew) dom.btnNew.addEventListener('click', startNewGame);
if (dom.btnResume) dom.btnResume.addEventListener('click', resumeGame);
if (dom.btnMissions) dom.btnMissions.addEventListener('click', () => {
  buildJobBoard();
  show(dom.missionSelect);
});
if (dom.btnCloseJobs) dom.btnCloseJobs.addEventListener('click', () => hide(dom.missionSelect));
if (dom.btnCloseShop) dom.btnCloseShop.addEventListener('click', () => hide(dom.shopPanel));
if (dom.btnCloseGarage) dom.btnCloseGarage.addEventListener('click', () => hide(dom.garagePanel));
if (dom.cutscene) dom.cutscene.addEventListener('click', () => endCutscene());

// ---- feature modules ----
const MODULE_ORDER = [
  'daynight', 'districts', 'player', 'vehicles', 'city', 'sky', 'ambient',
  'people', 'police', 'heli2', 'heat', 'missions', 'side', 'shop', 'garage',
  'fence', 'hud', 'dialogue', 'audio', 'banter', 'crew', 'challenges',
  'respect', 'radio2', 'safehouse', 'weapons', 'cutscene', 'juice', 'postfx',
];
async function loadModules() {
  for (const name of MODULE_ORDER) {
    try {
      // Resolve against THIS module's URL: fetch() resolves against the
      // document base, which would point at /src/ instead of /src under
      // the game folder, so anchor both probe and import on import.meta.
      const url = new URL('./' + name + '.js', import.meta.url);
      const res = await fetch(url);
      if (!res.ok) continue;
      const mod = await import(url.href);
      if (mod && typeof mod.init === 'function') mod.init(ctx);
    } catch (e) {
      // Missing or failing module is a quiet skip, never a console error.
    }
  }
  // De-duplicate parked cars: same kind at the same rounded position —
  // keep the first, remove later copies (mesh and all). Police untouched.
  const seen = new Set();
  for (let i = S.cars.length - 1; i >= 0; i--) {
    const c = S.cars[i];
    if (c.aiPolice) continue;
    const key = c.kind + ':' + Math.round(c.pos.x) + ':' + Math.round(c.pos.z);
    if (seen.has(key)) {
      if (c.mesh) scene.remove(c.mesh);
      S.cars.splice(i, 1);
    } else {
      seen.add(key);
    }
  }
  if (!api.dialogueLoaded) {
    if (dom.dialogue) dom.dialogue.addEventListener('click', fallbackAdvanceDialogue);
  }
  if (!api.shopLoaded) installShopFallback();
}

// ---- day/night ----
const amberCol = new THREE.Color(0xffb347);
const coolCol = new THREE.Color(0x8fb4ff);
function updateDayNight(dt) {
  const t = S.time;
  let target = 0;
  if (t >= CONFIG.nightAt) target = 1;
  else if (t >= CONFIG.duskAt) target = (t - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt);
  S.dayNight.night += (target - S.dayNight.night) * Math.min(1, 0.6 * dt);
  S.dayNight.night = Math.max(0, Math.min(1, S.dayNight.night));
  if (S.sunLight) {
    S.sunLight.intensity = 2.2 - S.dayNight.night * 1.85;
    S.sunLight.color.copy(S.dayNight.night > 0.6 ? coolCol : amberCol);
  }
  if (S.skyDome && S.skyDome.material.uniforms) {
    S.skyDome.material.uniforms.uNight.value = S.dayNight.night;
  }
}

// ---- camera ----
let menuAngle = 0;
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  if (S.mode === 'menu') {
    menuAngle += dt * 0.05;
    camera.position.set(Math.cos(menuAngle) * 130, 42, Math.sin(menuAngle) * 130);
    camera.lookAt(0, 0, 0);
    return;
  }
  if (S.mode === 'cutscene' || S.cutscene) {
    const t = Math.min(1, (S._cutT || 0) / 14);
    camera.position.set(-140 + (60 + 140) * t, 55 - 30 * t, -120 + (30 + 120) * t);
    camera.lookAt(0, 5, 0);
    return;
  }
  const focus = S.car ? S.car.pos : S.player.pos;
  const heading = S.car ? S.car.heading : S.player.heading;
  const dist = S.car ? 13 : 9.5;
  const height = S.car ? 5.2 : 4.4;
  camTarget.set(
    focus.x - Math.sin(heading) * dist,
    height,
    focus.z - Math.cos(heading) * dist
  );
  camera.position.lerp(camTarget, Math.min(1, 5 * dt));
  camera.lookAt(focus.x, focus.y + 2, focus.z);
}

// ---- frame loop ----
let last = performance.now();
let saveTimer = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  if (input.wasPressed('KeyX') && S.cutscene) endCutscene();
  if (input.wasPressed('KeyP')) {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }
  if (shopFallbackActive && input.wasPressed('KeyF') && S.mode === 'playing') {
    const d = Math.hypot(S.player.pos.x - CONFIG.shop.x, S.player.pos.z - CONFIG.shop.z);
    if (d < CONFIG.shop.radius + 2) openShopFallback();
  }
  if (S.mode !== 'paused') {
    S.tick(dt);
    S.challengesDirector.tick();
    if (api.cutsceneTick) api.cutsceneTick(dt);
    if (
      S.mode === 'playing' &&
      !S.missions.current &&
      S.missionIndex === 0
    ) {
      const d = Math.hypot(S.player.pos.x - CONFIG.garage.x, S.player.pos.z - CONFIG.garage.z);
      if (d < CONFIG.garage.radius) S.missions.start(0);
    }
    for (const update of ctx.updates) {
      try {
        update(dt);
      } catch (e) {}
    }
    updateDayNight(dt);
    updateCamera(dt);
    if (S.mode === 'playing') {
      saveTimer += dt;
      if (saveTimer > 20) {
        saveTimer = 0;
        saveGame();
      }
    }
  }
  renderer.render(scene, camera);
  input.endFrame();
}

// ---- boot ----
loadGame();
window.__solmar = { S, player: S.player, camera };
requestAnimationFrame(frame);
loadModules();
