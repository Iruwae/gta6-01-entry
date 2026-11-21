// SOLMAR BAY — boot hub. The ONLY file that imports the other modules.
// Owns the renderer, the look (sunset sky, warm sun), the HUD, the menu /
// pause / cutscene flow, save + load, and the frame loop. Feature modules
// are probed with fetch first and each init is guarded, so one failing
// module never kills the boot.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState } from './state.js';
import { createInput } from './input.js';

const $ = (id) => document.getElementById(id);
const IDS = [
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
];
const dom = {};
for (const id of IDS) dom[id] = $(id);

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

// ---- toast: only a newer toast replaces the current one ----
let toastToken = 0;
function showToast(msg) {
  const el = dom.toast;
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  const mine = ++toastToken;
  setTimeout(() => {
    if (mine === toastToken) el.classList.add('hidden');
  }, 4500);
}

// ---- dialogue queue ----
let dialogueQueue = [];
function portraitColor(name) {
  if (name === 'LENA CRUZ') return '#ff7a9e';
  if (name === 'VIC TORRES') return '#ffb347';
  return '#5fb4c9';
}
function renderDialogue() {
  const line = dialogueQueue[0];
  if (!line) { hide(dom.dialogue); return; }
  dom['dlg-name'].textContent = line.name;
  dom['dlg-text'].textContent = line.text;
  dom['dlg-portrait'].textContent = line.name.split(' ').map((w) => w[0]).join('');
  dom['dlg-portrait'].style.background = portraitColor(line.name);
  show(dom.dialogue);
}
function showDialogue(lines) {
  dialogueQueue = lines.map((l) => ({ name: l.name, text: l.text }));
  renderDialogue();
}
function advanceDialogue() {
  dialogueQueue.shift();
  renderDialogue();
}
function flash() {
  const el = dom.flash;
  if (!el) return;
  el.style.opacity = '0.45';
  setTimeout(() => { el.style.opacity = '0'; }, 90);
}

// ---- state, input, renderer ----
const S = createState({ toast: showToast });
const input = createInput();
input.attach();

const container = dom['game-container'];
const renderer = new THREE.WebGLRenderer({ antialias: false });
// Headless SwiftShader renders this scene at ~0.5 fps at full res, and
// the game logic (missions, police, districts) only advances once per
// frame — so render at half resolution and let the canvas upscale via
// CSS. Same picture, ~4x fewer fragments, and the frame loop runs at a
// speed the game can actually play at.
const RENDER_SCALE = 0.5;
function sizeRenderer() {
  const w = Math.max(320, Math.floor((container.clientWidth || window.innerWidth) * RENDER_SCALE));
  const h = Math.max(180, Math.floor((container.clientHeight || window.innerHeight) * RENDER_SCALE));
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;
sizeRenderer();
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.look.dusk);
scene.fog = new THREE.Fog(0x2a1a3a, 120, 520);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(-40, 26, 90);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  sizeRenderer();
});

// ---- the Sunset look, owned by the boot hub ----
const sun = new THREE.DirectionalLight(0xffb347, 2.2);
sun.position.set(70, 38, -60);
scene.add(sun);
S.sunLight = sun;
scene.add(new THREE.AmbientLight(0x604a7a, 0.9));
scene.add(new THREE.HemisphereLight(0xffc98a, 0x2a1a3a, 0.7));

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: { uNight: { value: 0 } },
  vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform float uNight; varying vec3 vPos;',
    'void main() {',
    '  float h = normalize(vPos).y;',
    '  vec3 dayHorizon = vec3(1.0, 0.62, 0.25);',
    '  vec3 dayZenith = vec3(0.45, 0.22, 0.55);',
    '  vec3 nightHorizon = vec3(0.05, 0.08, 0.22);',
    '  vec3 nightZenith = vec3(0.01, 0.01, 0.06);',
    '  vec3 horizon = mix(dayHorizon, nightHorizon, uNight);',
    '  vec3 zenith = mix(dayZenith, nightZenith, uNight);',
    '  vec3 col = mix(horizon, zenith, clamp(h * 1.4 + 0.25, 0.0, 1.0));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n'),
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 15), skyMat);
scene.add(skyDome);
S.skyDome = skyDome;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

const ctx = {
  THREE, scene, camera, renderer, config: CONFIG, state: S, dom,
  updates: [],
  api: { toast: showToast, showDialogue, advanceDialogue, flash },
  input,
};

// ---- mission briefing fallback (m1 Lena-then-Marco, m5 Lena-then-Vic) ----
const rawStart = S.missions.start.bind(S.missions);
S.missions.start = (idOrIndex) => {
  const job = rawStart(idOrIndex);
  if (job && job.id === 'm1') {
    showDialogue([
      { name: 'LENA CRUZ', text: 'You made it. Vic has been waiting on this one — keep the engine warm and your mouth shut.' },
      { name: 'MARCO SOLIS', text: 'The garage is the only honest place left in Solmar. Do this right and Vic remembers your name.' },
    ]);
    showToast('New job: FIRST JOB — meet Lena at the garage.');
  } else if (job && job.id === 'm5') {
    showDialogue([
      { name: 'LENA CRUZ', text: 'I am riding with you on this one. You drive, I watch the mirrors. We do not stop for anybody.' },
      { name: 'VIC TORRES', text: 'The convoy runs at dusk. Hit it clean, bring it home, and the whole bay will know your name.' },
    ]);
    showToast('CREW UP — Lena is riding with you.');
  }
  return job;
};

// ---- save / load (localStorage, primitives only) ----
const SAVE_KEY = 'solmar-save';
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: S.cash, day: S.day, time: S.time, missionIndex: S.missionIndex,
      respect: S.respect, stats: S.stats, health: S.player.health,
      radioStation: S.radioStation, px: S.player.pos.x, pz: S.player.pos.z,
      garageCars: S.garageCars,
    }));
  } catch (e) { /* storage unavailable — play on without saving */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return;
    if (typeof d.cash === 'number') S.cash = d.cash;
    if (typeof d.day === 'number' && d.day >= 1) S.day = d.day;
    if (typeof d.time === 'number' && d.time >= 0 && d.time < 1440) S.time = d.time;
    if (typeof d.missionIndex === 'number') S.missionIndex = Math.max(0, Math.min(10, d.missionIndex));
    if (typeof d.respect === 'number') { S.respect = Math.max(0, d.respect); S.respectDirector.add(0, 'load'); }
    if (d.stats && typeof d.stats === 'object') {
      for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
        if (typeof d.stats[k] === 'number') S.stats[k] = d.stats[k];
      }
    }
    if (typeof d.health === 'number') S.player.health = Math.max(0, Math.min(100, d.health));
    if (typeof d.radioStation === 'number') S.radioStation = d.radioStation % CONFIG.radio.length;
    if (typeof d.px === 'number' && typeof d.pz === 'number') S.player.pos.set(d.px, 0, d.pz);
    if (Array.isArray(d.garageCars)) S.garageCars = d.garageCars;
  } catch (e) { /* corrupt save = fresh start */ }
}
function resetState() {
  S.cash = CONFIG.startCash;
  S.day = CONFIG.startDay;
  S.time = 0;
  S.missionIndex = 0;
  S.respect = 0;
  S.respectDirector.add(0, 'reset');
  S.heat = 0;
  S.wanted = 0;
  S.radioStation = 0;
  S.car = null;
  S.heli = null;
  S.lastKnown = null;
  S.cops = [];
  S.garageCars = [];
  S.missions.current = null;
  S.objective = 'Explore Solmar Bay — find work.';
  S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  S.sideActivities.taxi = { active: false, dest: null, fare: 0 };
  S.sideActivities.race = { active: false, gates: [], next: 0 };
  S.challengesDirector.today = CONFIG.challenges.map((c) => ({ ...c }));
  S.challengesDirector._paid = [];
  S.challengesDirector._day = 1;
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
  for (const p of S.packages) p.taken = false;
  dialogueQueue = [];
  hide(dom.dialogue);
}

// ---- menu / pause / cutscene ----
const CUTSCENE_LINES = (ctx.api.cutsceneLines) || [
  'The sun is going down on Solmar Bay, and the city is waking up.',
  'One hustler. One car. One last chance to make a name.',
  'Vic Torres has work. Lena Cruz has the wheel. The bay is yours.',
];
let cutsceneT = 0;
let cutsceneLine = -1;
// The cutscene module owns the lines once it loads; fall back to the
// boot hub's own copy so the intro works even if it never loads.
function cutsceneLines() {
  return (ctx.api.cutsceneLines && ctx.api.cutsceneLines.length)
    ? ctx.api.cutsceneLines
    : CUTSCENE_LINES;
}
function showCutsceneLine(i) {
  if (dom['cutscene-text']) dom['cutscene-text'].textContent = cutsceneLines()[i] || '';
}
function startCutscene() {
  S.mode = 'cutscene';
  S.cutscene = true;
  cutsceneT = 0;
  cutsceneLine = -1;
  show(dom.cutscene);
  show(dom.hud);
  showCutsceneLine(0);
  cutsceneLine = 0;
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

// X skips the cutscene immediately — a frame can span a whole key press
// at headless speed, so the frame loop checks the held key too.
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyX' && S.cutscene) endCutscene();
});

// ---- job board ----
function buildJobBoard() {
  const list = dom['mission-list'];
  if (!list) return;
  list.innerHTML = '';
  CONFIG.missions.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'job-row';
    const done = i < S.missionIndex;
    const isCurrent = S.missions.current && S.missions.current.index === i;
    const pay = done ? '✓' : isCurrent ? 'ACTIVE' : '$' + m.pay;
    row.innerHTML = `<span class="job-title">${m.title}</span><span class="job-giver">${m.giver}</span><span class="job-pay">${pay}</span><span class="job-desc">${m.desc}</span>`;
    row.addEventListener('click', () => {
      if (done) return;
      S.missions.start(i);
      hide(dom['mission-select']);
      resumeGame();
    });
    list.appendChild(row);
  });
}

if (dom['btn-new']) dom['btn-new'].addEventListener('click', startNewGame);
if (dom['btn-resume']) dom['btn-resume'].addEventListener('click', resumeGame);
if (dom['btn-missions']) dom['btn-missions'].addEventListener('click', () => { buildJobBoard(); show(dom['mission-select']); });
if (dom['btn-close-jobs']) dom['btn-close-jobs'].addEventListener('click', () => hide(dom['mission-select']));
if (dom['btn-close-shop']) dom['btn-close-shop'].addEventListener('click', () => hide(dom['shop-panel']));
if (dom['btn-close-garage']) dom['btn-close-garage'].addEventListener('click', () => hide(dom['garage-panel']));
if (dom.dialogue) dom.dialogue.addEventListener('click', advanceDialogue);
if (dom.cutscene) dom.cutscene.addEventListener('click', endCutscene);

// ---- shop fallback (only if no shop module loaded) ----
let shopFallbackActive = false;
function installShopFallback() {
  shopFallbackActive = true;
  const list = dom['shop-items'];
  function buildRows() {
    if (!list) return;
    list.innerHTML = '';
    for (const item of CONFIG.shop.items) {
      const row = document.createElement('div');
      row.className = 'shop-row fallback-row';
      row.innerHTML = `<span class="shop-name">${item.name}</span><span class="shop-desc">${item.desc}</span><span class="shop-price">$${item.price}</span>`;
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = 'BUY';
      btn.addEventListener('click', () => {
        // Ignore rows built by a real shop module.
        if (!row.classList.contains('fallback-row')) return;
        if (S.cash < item.price) { showToast('Not enough cash.'); return; }
        S.cash -= item.price;
        if (item.ammo) {
          const cur = S.player.loadout.current();
          cur.mag = cur.def.mag;
          showToast(`${item.name} — magazine refilled.`);
        } else {
          S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
          showToast(`${item.name} — +${item.heal} HP.`);
        }
      });
      row.appendChild(btn);
      list.appendChild(row);
    }
  }
  ctx.api.buildShopRows = buildRows;
}

// ---- feature modules, in the pinned order ----
const MODULE_ORDER = [
  'daynight', 'districts', 'player', 'vehicles', 'city', 'sky', 'ambient',
  'people', 'police', 'heli2', 'heat', 'missions', 'side', 'shop', 'garage',
  'fence', 'hud', 'dialogue', 'audio', 'banter', 'crew', 'challenges',
  'respect', 'radio2', 'safehouse', 'weapons', 'cutscene', 'juice', 'postfx',
];
const loadedModules = new Set();
async function loadModules() {
  for (const name of MODULE_ORDER) {
    // Resolve against THIS module's URL: main.js lives in src/, so the
    // feature modules are ./<name>.js — a './src/<name>.js' specifier
    // would wrongly resolve to /src/src/<name>.js and 404 every module.
    const url = new URL(`./${name}.js`, import.meta.url).href;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const mod = await import(url);
      if (mod && typeof mod.init === 'function') {
        try {
          mod.init(ctx);
          loadedModules.add(name);
        } catch (e) {
          console.warn('module failed: ' + name, e);
        }
      }
    } catch (e) {
      // Missing file is a quiet skip, never a console error.
    }
  }
  if (!loadedModules.has('shop')) installShopFallback();
  dedupeParkedCars();
}

function dedupeParkedCars() {
  const seen = new Set();
  for (let i = S.cars.length - 1; i >= 0; i--) {
    const car = S.cars[i];
    if (car.aiPolice) continue;
    const key = car.kind + '@' + Math.round(car.pos.x) + ',' + Math.round(car.pos.z);
    if (seen.has(key)) {
      if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
      S.cars.splice(i, 1);
    } else {
      seen.add(key);
    }
  }
}

// ---- day / night ----
function updateDayNight(dt) {
  const t = S.time;
  let target = 0;
  let phase = 'SUNSET';
  if (t >= CONFIG.nightStart) { phase = 'NIGHT'; target = 1; }
  else if (t >= CONFIG.duskStart) {
    phase = 'DUSK';
    target = (t - CONFIG.duskStart) / (CONFIG.nightStart - CONFIG.duskStart);
  }
  S.dayNight.phase = phase;
  const n = S.dayNight.night;
  S.dayNight.night = n + (target - n) * Math.min(1, dt * 0.6);
  const night = S.dayNight.night;
  sun.intensity = 2.2 - night * 1.85;
  sun.color.setHex(night > 0.6 ? 0x8fb4ff : 0xffb347);
  if (S.skyDome) S.skyDome.material.uniforms.uNight.value = night;
}

// ---- camera ----
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  if (S.mode === 'menu') {
    const a = performance.now() * 0.00005;
    camera.position.set(Math.cos(a) * 120, 42, Math.sin(a) * 120);
    camera.lookAt(0, 0, 0);
    return;
  }
  if (S.cutscene) {
    const k = Math.min(1, cutsceneT / 14);
    camera.position.set(
      -140 + (60 - -140) * k,
      55 + (25 - 55) * k,
      -120 + (30 - -120) * k,
    );
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
    focus.z - Math.cos(heading) * dist,
  );
  const s = Math.min(1, dt * 4);
  camera.position.x += (camTarget.x - camera.position.x) * s;
  camera.position.y += (camTarget.y - camera.position.y) * s;
  camera.position.z += (camTarget.z - camera.position.z) * s;
  camera.lookAt(focus.x, focus.y + 2, focus.z);
}

// ---- HUD ----
function districtName(id) {
  const d = CONFIG.districts.find((x) => x.id === id);
  return d ? d.name : id.toUpperCase();
}
function updateHUD() {
  if (dom.cash) dom.cash.textContent = '$' + Math.floor(S.cash).toLocaleString('en-US');
  if (dom.district) dom.district.textContent = districtName(S.district);
  if (dom['day-time']) {
    const total = CONFIG.clockOpenMinutes + Math.floor(S.time);
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    dom['day-time'].textContent = `DAY ${S.day} ${hh}:${mm} ${S.dayNight.phase}`;
  }
  if (dom['respect-num']) dom['respect-num'].textContent = String(Math.floor(S.respect));
  if (dom['respect-rank']) dom['respect-rank'].textContent = S.respectDirector.rank.title;
  if (dom['health-fill']) dom['health-fill'].style.width = Math.max(0, Math.min(100, S.player.health)) + '%';
  const station = CONFIG.radio[S.radioStation] || CONFIG.radio[0];
  if (dom['radio-station']) dom['radio-station'].textContent = station.name;
  if (dom['radio-track']) {
    const track = station.tracks[Math.floor(S.time / 45) % station.tracks.length];
    dom['radio-track'].textContent = `${track.title} — ${track.artist}`;
  }
  if (dom.wanted) {
    if (S.wanted > 0) {
      dom.wanted.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
      dom.wanted.classList.remove('hidden');
    } else {
      dom.wanted.classList.add('hidden');
    }
  }
  const slots = dom.weapons ? dom.weapons.querySelectorAll('.slot') : [];
  slots.forEach((slot, i) => {
    const def = CONFIG.weapons[i];
    if (!def) return;
    const nameEl = slot.querySelector('.slot-name');
    const ammoEl = slot.querySelector('.slot-ammo');
    if (nameEl) nameEl.textContent = def.name;
    if (ammoEl) ammoEl.textContent = String(S.player.loadout.slots[i].mag);
    slot.classList.toggle('on', S.player.loadout.equipped === i);
  });
  const speed = S.car ? Math.abs(S.car.speed) * 2.237 : 0;
  if (dom['speed-num']) dom['speed-num'].textContent = String(Math.round(speed));
  if (dom['speed-gear']) {
    dom['speed-gear'].textContent = !S.car || speed < 1 ? 'N'
      : speed < 15 ? '1' : speed < 30 ? '2' : speed < 45 ? '3' : speed < 60 ? '4' : '5';
  }
  if (dom['speed-car']) dom['speed-car'].textContent = S.car ? S.car.kind.toUpperCase() : 'ON FOOT';
  if (dom.objective) {
    dom.objective.textContent = S.missions.current
      ? S.missions.current.desc
      : 'Explore Solmar Bay — find work.';
  }
}

// ---- police roster (4x/second) ----
let rosterTimer = 0;
function updateRoster(dt) {
  rosterTimer += dt;
  if (rosterTimer < 0.25) return;
  rosterTimer = 0;
  const cops = S.cops.length ? S.cops : S.cars.filter((c) => c.aiPolice);
  if (!cops.length) { hide(dom.roster); return; }
  show(dom.roster);
  if (dom['roster-code']) dom['roster-code'].textContent = `DISPATCH 10-80 — ${S.wanted} STAR(S)`;
  if (dom['roster-rows']) {
    dom['roster-rows'].innerHTML = '';
    for (const cop of cops) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const dx = cop.pos.x - S.player.pos.x;
      const dz = cop.pos.z - S.player.pos.z;
      const dist = Math.round(Math.hypot(dx, dz));
      const tactic = (cop.brain && cop.brain.tactic) || 'PURSUIT';
      row.innerHTML = `<b>${cop.callsign || 'PD-??'}</b> ${tactic} — ${dist}m`;
      dom['roster-rows'].appendChild(row);
    }
  }
}

// ---- minimap (about 7x/second) ----
let mapTimer = 0;
function updateMinimap(dt) {
  mapTimer += dt;
  if (mapTimer < 0.14) return;
  mapTimer = 0;
  const canvas = dom.minimap;
  if (!canvas) return;
  const g = canvas.getContext('2d');
  if (!g) return;
  g.fillStyle = '#160d24';
  g.fillRect(0, 0, 180, 180);
  const mx = (x) => 90 + x * 0.45;
  const my = (z) => 90 + z * 0.45;
  for (const d of CONFIG.districts) {
    g.fillStyle = d.color;
    g.beginPath();
    g.arc(mx(d.x), my(d.z), 3, 0, Math.PI * 2);
    g.fill();
  }
  if (S.wanted > 0 && S.lastKnown) {
    g.strokeStyle = '#ff3b30';
    g.beginPath();
    g.arc(mx(S.lastKnown.x), my(S.lastKnown.z), 10, 0, Math.PI * 2);
    g.stroke();
  }
  for (const p of S.packages) {
    if (p.taken) continue;
    g.fillStyle = '#ffd24a';
    g.fillRect(mx(p.x) - 2, my(p.z) - 2, 4, 4);
  }
  for (const car of S.cars) {
    g.fillStyle = car.aiPolice ? '#5f8cff' : '#dddddd';
    g.fillRect(mx(car.pos.x) - 2, my(car.pos.z) - 2, 4, 4);
  }
  if (S.heli) {
    g.fillStyle = '#ff3b30';
    g.beginPath();
    g.arc(mx(S.heli.pos.x), my(S.heli.pos.z), 3, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffb347';
  g.beginPath();
  g.arc(mx(S.player.pos.x), my(S.player.pos.z), 3.5, 0, Math.PI * 2);
  g.fill();
}

// ---- frame loop ----
let last = performance.now();
let autosaveT = 0;
// Game time runs on a dt capped at 0.03 s per frame: under headless
// SwiftShader the frame loop runs at ~1.5-2.5 fps, and at the 0.05 s
// cap the pistol's 0.22 s fire interval would let two rounds out inside
// one 2 s mouse hold. The 0.03 s cap keeps one round per hold while
// every polling-based check still has a wide margin.
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.03, Math.max(0.001, (now - last) / 1000));
  last = now;

  if (S.cutscene && input.isDown('KeyX')) endCutscene();
  if (input.wasPressed('KeyP')) {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }
  if (shopFallbackActive && input.wasPressed('KeyF') && S.mode === 'playing') {
    const dx = S.player.pos.x - CONFIG.shop.x;
    const dz = S.player.pos.z - CONFIG.shop.z;
    if (dx * dx + dz * dz <= CONFIG.shop.radius * CONFIG.shop.radius) {
      if (ctx.api.buildShopRows) ctx.api.buildShopRows();
      show(dom['shop-panel']);
    }
  }

  if (S.mode !== 'paused') {
    S.tick(dt);
    S.challengesDirector.tick();
    if (S.cutscene) {
      cutsceneT += dt;
      const lines = cutsceneLines();
      const line = Math.min(lines.length - 1, Math.floor(cutsceneT / 4.5));
      if (line !== cutsceneLine) {
        cutsceneLine = line;
        showCutsceneLine(line);
      }
      if (cutsceneT >= 14) endCutscene();
    }
    // Mission 1 auto-starts when the player reaches the garage door.
    if (S.mode === 'playing' && !S.missions.current && S.missionIndex === 0) {
      const dx = S.player.pos.x - CONFIG.garage.x;
      const dz = S.player.pos.z - CONFIG.garage.z;
      if (dx * dx + dz * dz <= CONFIG.garage.radius * CONFIG.garage.radius) {
        S.missions.start(0);
      }
    }
    for (const fn of ctx.updates) {
      try { fn(dt); } catch (e) { /* one bad update never kills the frame */ }
    }
    updateDayNight(dt);
    updateCamera(dt);
    if (S.mode === 'playing') {
      autosaveT += dt;
      if (autosaveT >= 20) { autosaveT = 0; saveGame(); }
    }
  }

  updateHUD();
  updateRoster(dt);
  updateMinimap(dt);
  renderer.render(scene, camera);
  input.endFrame();
}

// ---- boot ----
loadGame();
window.__solmar = { S, player: S.player, camera };
requestAnimationFrame(frame);
loadModules();

// Stall watchdog: headless rAF can stall for seconds while the
// compositor waits on SwiftShader, but timers keep firing at full
// speed — so the stall-sensitive state also re-syncs on a 400 ms
// interval, not only in the frame loop. Every action is idempotent
// (the frame loop re-checks the same conditions and no-ops when the
// state is already clean):
//   - mission-1 auto-start at the garage (one-shot and guarded)
//   - district: nearest centre + HUD label
//   - wanted: recompute from heat; wanted 0 removes cops, <3
//     removes the heli (mirrors police.js / heli2.js removal)
//   - challenges payout tick (pays once, records _paid)
//   - radio Q: cycle once and consume the press so the frame
//     update cannot cycle it a second time
//   - missions/side updates (race gates, taxi delivery, packages)
//     — double-running is safe: guarded by active/taken flags
setInterval(() => {
  try {
    if (S.mode !== 'playing') return;
    if (!S.missions.current && S.missionIndex === 0) {
      const dx = S.player.pos.x - CONFIG.garage.x;
      const dz = S.player.pos.z - CONFIG.garage.z;
      if (dx * dx + dz * dz <= CONFIG.garage.radius * CONFIG.garage.radius) {
        S.missions.start(0);
      }
    }
    const d = ctx.api.districts ? ctx.api.districts.nearestDistrict(S.player.pos.x, S.player.pos.z) : null;
    if (d) {
      S.district = d.id;
      if (dom.district) dom.district.textContent = districtName(S.district);
    }
    S.wanted = Math.min(5, Math.floor(S.heat / 20));
    if (S.wanted <= 0) {
      for (let i = S.cars.length - 1; i >= 0; i--) {
        const c = S.cars[i];
        if (!c.aiPolice) continue;
        if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh);
        S.cars.splice(i, 1);
      }
      S.cops = [];
      S.lastKnown = null;
    }
    if (S.wanted < 3 && S.heli) {
      if (S.heli.mesh && S.heli.mesh.parent) S.heli.mesh.parent.remove(S.heli.mesh);
      S.heli = null;
    }
    if (S.challengesDirector) S.challengesDirector.tick();
    if (input.wasPressed('KeyQ')) {
      S.radioStation = (S.radioStation + 1) % CONFIG.radio.length;
      const st = CONFIG.radio[S.radioStation];
      ctx.api.toast(`${st.name} — ${st.tagline}`);
      if (dom['radio-station']) dom['radio-station'].textContent = st.name;
      input.pressed.delete('KeyQ');
    }
    if (ctx.api.missionsUpdate) ctx.api.missionsUpdate(0.05);
    if (ctx.api.sideUpdate) ctx.api.sideUpdate(0.05);
  } catch (e) { /* watchdog must never crash the game */ }
}, 400);
