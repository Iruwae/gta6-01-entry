// SOLMAR BAY — boot hub. The ONLY file that imports the other modules.
// Owns the renderer, the look, save/load, menu/pause/cutscene, HUD wiring.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import createState from './state.js';
import { createInput } from './input.js';

const $ = (id) => document.getElementById(id);
const DOM_IDS = [
  'game-container', 'sunset-band', 'vignette', 'flash', 'hud', 'cash', 'district',
  'day-time', 'objective', 'respect-line', 'respect-num', 'respect-rank', 'wanted',
  'radio', 'radio-station', 'radio-track', 'minimap', 'roster', 'roster-code',
  'roster-rows', 'health-bar', 'health-fill', 'weapons', 'speedo', 'speed-num',
  'speed-gear', 'speed-car', 'toast', 'dialogue', 'dlg-portrait', 'dlg-name',
  'dlg-text', 'cutscene', 'cutscene-text', 'menu', 'btn-new', 'pause-menu',
  'btn-missions', 'btn-resume', 'mission-select', 'mission-list', 'btn-close-jobs',
  'shop-panel', 'shop-items', 'btn-close-shop', 'garage-panel', 'garage-list',
  'btn-close-garage',
];
const dom = {};
for (const id of DOM_IDS) dom[id] = $(id);
function show(el) {
  if (el) el.classList.remove('hidden');
}
function hide(el) {
  if (el) el.classList.add('hidden');
}

// ---- toast ----
let toastToken = 0;
function showToast(msg) {
  const el = dom.toast;
  if (!el) return;
  const token = ++toastToken;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => {
    if (token === toastToken) el.classList.add('hidden');
  }, 4500);
}

// ---- dialogue fallback (dialogue.js replaces these when it loads) ----
let dlgQueue = [];
let dlgCurrent = null;
function dlgRender() {
  if (!dlgCurrent) {
    hide(dom.dialogue);
    return;
  }
  const name = dlgCurrent.name;
  let initials = '?';
  let color = '#7ea8ff';
  if (name === 'LENA CRUZ') { initials = 'LC'; color = '#ff7a9e'; }
  else if (name === 'VIC TORRES') { initials = 'VT'; color = '#ffb347'; }
  else if (name === 'MARCO SOLIS') { initials = 'MS'; color = '#5fb4c9'; }
  else {
    initials = name.split(' ').map((p) => p[0] || '').join('').slice(0, 2).toUpperCase() || '?';
  }
  dom['dlg-portrait'].textContent = initials;
  dom['dlg-portrait'].style.background = color;
  dom['dlg-name'].textContent = name;
  dom['dlg-text'].textContent = dlgCurrent.text;
  show(dom.dialogue);
}
function showDialogue(lines) {
  if (!lines || lines.length === 0) return;
  dlgQueue = lines.map((l) => ({ name: l.name, text: l.text }));
  dlgCurrent = dlgQueue.shift();
  dlgRender();
}
function advanceDialogue() {
  if (dlgQueue.length > 0) {
    dlgCurrent = dlgQueue.shift();
    dlgRender();
  } else {
    dlgCurrent = null;
    dlgQueue = [];
    dlgRender();
  }
}

// ---- renderer / scene / camera ----
const container = dom['game-container'];
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1a3a);
scene.fog = new THREE.Fog(0x2a1a3a, 120, 520);
const camera = new THREE.PerspectiveCamera(62, (container.clientWidth || 1280) / (container.clientHeight || 720), 0.1, 1200);
camera.position.set(-40, 26, 90);
window.addEventListener('resize', () => {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ---- state / input / ctx ----
const S = createState({ toast: showToast });
const input = createInput();
input.attach();
const api = {
  toast: showToast,
  showDialogue,
  advanceDialogue,
  flash: (opacity = 80) => {
    const el = dom.flash;
    if (!el) return;
    el.style.opacity = String(Math.min(1, opacity / 100));
    setTimeout(() => { el.style.opacity = '0'; }, 90);
  },
  audio: () => {},
  shake: () => {},
};
const ctx = {
  THREE, scene, camera, renderer, config: CONFIG, state: S, dom,
  updates: [], api, input,
  shopLoaded: false,
  shopFallbackInstalled: false,
  cutsceneLines: null,
  playerMesh: null,
};
ctx.clearDialogue = () => {
  dlgQueue = [];
  dlgCurrent = null;
  dlgRender();
};

// ---- the look, owned by the boot hub ----
const sunLight = new THREE.DirectionalLight(0xffb347, 2.2);
sunLight.position.set(70, 38, -60);
scene.add(sunLight);
S.sunLight = sunLight;
scene.add(new THREE.AmbientLight(0x8a6a9a, 0.55));
const hemi = new THREE.HemisphereLight(0xffc890, 0x2a1a3a, 0.5);
scene.add(hemi);
// Shader sky dome: orange horizon through purple dusk by day, deep night blue.
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
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
      vec3 sunset = mix(vec3(1.0, 0.55, 0.25), vec3(0.45, 0.2, 0.5), clamp(h * 1.4 + 0.3, 0.0, 1.0));
      vec3 night = mix(vec3(0.02, 0.03, 0.1), vec3(0.08, 0.1, 0.25), clamp(h * 1.2 + 0.4, 0.0, 1.0));
      gl_FragColor = vec4(mix(sunset, night, uNight), 1.0);
    }`,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat);
scene.add(skyDome);
S.skyDome = skyDome;
// Dark ground plane.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x1a1426, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// ---- mission briefing fallback (m1 / m5) ----
const origStart = S.missions.start.bind(S.missions);
S.missions.start = (idOrIndex) => {
  const cur = origStart(idOrIndex);
  if (!cur) return cur;
  if (cur.id === 'm1') {
    api.showDialogue([
      { name: 'LENA CRUZ', text: 'You made it. Vic has been asking about you — says you drive like the bay owes you money.' },
      { name: 'MARCO SOLIS', text: 'Easy, Lena. Kid, the job is simple: take the package, do not get followed, do not get cute.' },
    ]);
    api.toast('JOB STARTED: FIRST JOB — meet Lena at the garage.');
  } else if (cur.id === 'm5') {
    api.showDialogue([
      { name: 'LENA CRUZ', text: 'I am riding with you on this one. Hit the convoy together, and do exactly what I say.' },
      { name: 'VIC TORRES', text: 'Lena knows the roads better than the cops do. Listen to her, and we all get paid.' },
    ]);
    api.toast('JOB STARTED: CREW UP — Lena rides with you.');
  }
  return cur;
};

// ---- save / load / reset ----
const SAVE_KEY = 'solmar-save';
function saveGame() {
  try {
    const data = {
      cash: S.cash, day: S.day, time: S.time, missionIndex: S.missionIndex,
      respect: S.respect, stats: { ...S.stats }, health: S.player.health,
      radioStation: S.radioStation, px: S.player.pos.x, pz: S.player.pos.z,
      garageCars: S.garageCars.map((c) => ({
        kind: c.kind, tune: { ...c.tune }, health: c.health, maxHealth: c.maxHealth, color: c.color,
      })),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* storage is best-effort */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return;
    if (typeof d.cash === 'number') S.cash = d.cash;
    if (typeof d.day === 'number') S.day = d.day;
    if (typeof d.time === 'number') S.time = d.time;
    if (typeof d.missionIndex === 'number') S.missionIndex = Math.max(0, Math.min(10, d.missionIndex));
    if (typeof d.respect === 'number') {
      S.respect = Math.max(0, d.respect);
      S.respectDirector.add(0, 'load');
    }
    if (d.stats && typeof d.stats === 'object') {
      for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
        if (typeof d.stats[k] === 'number') S.stats[k] = d.stats[k];
      }
    }
    if (typeof d.health === 'number') S.player.health = Math.max(0, Math.min(100, d.health));
    if (typeof d.radioStation === 'number') S.radioStation = d.radioStation % 6;
    if (typeof d.px === 'number' && typeof d.pz === 'number') S.player.pos.set(d.px, 0, d.pz);
    if (Array.isArray(d.garageCars)) S.garageCars = d.garageCars.filter((c) => c && typeof c.kind === 'string');
  } catch (e) { /* corrupt save = fresh start */ }
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
  S.district = 'downtown';
  S.objective = CONFIG.defaultObjective;
  S.dayNight.phase = 'SUNSET';
  S.dayNight.night = 0;
  // Clear police.
  for (const cop of [...S.cops]) {
    const i = S.cars.indexOf(cop);
    if (i >= 0) S.cars.splice(i, 1);
    if (cop.mesh && cop.mesh.parent) cop.mesh.parent.remove(cop.mesh);
  }
  S.cops = [];
  if (S.heli) {
    if (S.heli.mesh && S.heli.mesh.parent) S.heli.mesh.parent.remove(S.heli.mesh);
    S.heli = null;
  }
  S.lastKnown = null;
  S.car = null;
  S.garageCars = [];
  S.missions.current = null;
  S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  S.sideActivities.taxi = { active: false, dest: null, fare: 0 };
  S.sideActivities.race = { active: false, gates: [], next: 0 };
  S.challengesDirector.today = CONFIG.challenges.map((c) => ({ ...c }));
  S.challengesDirector._paid = [];
  S.crew.active = false;
  if (S.crew.mesh) S.crew.mesh.visible = false;
  S.player.pos.set(-84, 0, -58);
  S.player.vel.set(0, 0, 0);
  S.player.heading = 0;
  S.player.health = CONFIG.player.maxHealth;
  S.player.reloading = false;
  S.player.reloadT = 0;
  S.player.fireT = 0;
  for (const slot of S.player.loadout.slots) slot.mag = slot.def.mag;
  S.player.loadout.equipped = 0;
  S.packages.forEach((p) => { p.taken = false; });
  if (ctx.clearDialogue) ctx.clearDialogue();
  if (ctx.playerMesh) ctx.playerMesh.visible = true;
}

// ---- menu / pause / cutscene ----
const CUTSCENE_FALLBACK = [
  'The sun is going down over Solmar Bay — and the whole city is about to light up.',
  'You came here with $120 and a name nobody knows. Tonight, that changes.',
  'Vic Torres has work. Lena Cruz has the wheel. All you need is nerve.',
];
let cutsceneT = 0;
let cutsceneLineIdx = -1;
function startCutscene() {
  S.mode = 'cutscene';
  S.cutscene = true;
  cutsceneT = 0;
  cutsceneLineIdx = -1;
  show(dom.cutscene);
  show(dom.hud);
  dom['cutscene-text'].textContent = (ctx.cutsceneLines || CUTSCENE_FALLBACK)[0];
  cutsceneLineIdx = 0;
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
function buildJobBoard() {
  const list = dom['mission-list'];
  list.innerHTML = '';
  CONFIG.missions.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'job-row';
    const done = i < S.missionIndex;
    const isCurrent = S.missions.current && S.missions.current.index === i;
    const title = document.createElement('span');
    title.className = 'job-title';
    title.textContent = `${i + 1}. ${m.title}`;
    const giver = document.createElement('span');
    giver.className = 'job-giver';
    giver.textContent = m.giver;
    const pay = document.createElement('span');
    pay.className = 'job-pay';
    pay.textContent = done ? '✓' : isCurrent ? 'ACTIVE' : '$' + m.pay;
    const desc = document.createElement('span');
    desc.className = 'job-desc';
    desc.textContent = m.desc;
    row.append(title, giver, pay, desc);
    if (!done) {
      row.addEventListener('click', () => {
        S.missions.start(i);
        hide(dom['mission-select']);
        resumeGame();
      });
    }
    list.appendChild(row);
  });
}

// Buttons.
dom['btn-new'].addEventListener('click', startNewGame);
dom['btn-resume'].addEventListener('click', resumeGame);
dom['btn-missions'].addEventListener('click', () => {
  buildJobBoard();
  show(dom['mission-select']);
});
dom['btn-close-jobs'].addEventListener('click', () => hide(dom['mission-select']));
dom['btn-close-shop'].addEventListener('click', () => hide(dom['shop-panel']));
dom['btn-close-garage'].addEventListener('click', () => hide(dom['garage-panel']));
dom.dialogue.addEventListener('click', () => api.advanceDialogue());
dom.cutscene.addEventListener('click', () => endCutscene());
// X skips the cutscene — both a keydown listener (immediate) and the
// frame loop (held key), so a fast headless frame never misses it.
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyX' && S.cutscene) endCutscene();
});

// ---- shop fallback (only if no shop module loaded) ----
function installShopFallback() {
  const list = dom['shop-items'];
  list.innerHTML = '';
  for (const item of CONFIG.shop.items) {
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
    const buy = document.createElement('button');
    buy.className = 'shop-buy';
    buy.textContent = 'BUY';
    buy.addEventListener('click', () => {
      if (row.dataset.fallback !== '1') return; // never touch real shop rows
      if (S.cash < item.price) {
        api.toast('Not enough cash for that.');
        return;
      }
      S.cash -= item.price;
      if (item.id === 'ammo') {
        S.player.loadout.current().mag = S.player.loadout.current().def.mag;
      } else if (item.heal > 0) {
        S.player.health = Math.min(CONFIG.player.maxHealth, S.player.health + item.heal);
      }
      api.toast(`Bought ${item.name} for $${item.price}.`);
    });
    row.append(name, desc, price, buy);
    list.appendChild(row);
  }
  ctx.shopFallbackInstalled = true;
}

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
      const res = await fetch('./src/' + name + '.js');
      if (!res.ok) continue; // missing file is a quiet skip
      const mod = await import('./' + name + '.js');
      if (mod && typeof mod.init === 'function') {
        try {
          mod.init(ctx);
        } catch (e) {
          console.warn('module init failed: ' + name, e);
        }
      }
    } catch (e) { /* quiet skip */ }
  }
  if (!ctx.shopLoaded) installShopFallback();
  dedupeParkedCars();
}
function dedupeParkedCars() {
  const seen = new Set();
  for (const car of [...S.cars]) {
    if (car.aiPolice) continue;
    const key = car.kind + '@' + Math.round(car.pos.x) + ',' + Math.round(car.pos.z);
    if (seen.has(key)) {
      const i = S.cars.indexOf(car);
      if (i >= 0) S.cars.splice(i, 1);
      if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
      if (S.car === car) S.car = null;
    } else {
      seen.add(key);
    }
  }
}

// ---- day/night fallback (daynight.js owns it when loaded) ----
function daynightFallback(dt) {
  let target = 0;
  let phase = 'SUNSET';
  if (S.time >= CONFIG.nightAt) {
    target = 1;
    phase = 'NIGHT';
  } else if (S.time >= CONFIG.duskAt) {
    target = (S.time - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt);
    phase = 'DUSK';
  }
  S.dayNight.phase = phase;
  const night = S.dayNight.night;
  S.dayNight.night = target > night
    ? Math.min(target, night + 0.6 * dt)
    : Math.max(target, night - 0.6 * dt);
  const n = S.dayNight.night;
  if (S.sunLight) {
    S.sunLight.intensity = 2.2 - n * 1.85;
    S.sunLight.color.set(n > 0.6 ? 0x8fb4ff : 0xffb347);
  }
  if (S.skyDome) S.skyDome.material.uniforms.uNight.value = n;
}

// ---- HUD fallback (hud.js owns it when loaded) ----
function hudFallback() {
  dom.cash.textContent = '$' + Math.floor(S.cash).toLocaleString('en-US');
  const total = CONFIG.dayStartHour * 60 + CONFIG.dayStartMinute + Math.floor(S.time);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  dom['day-time'].textContent = `DAY ${S.day} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${S.dayNight.phase}`;
}

// ---- camera ----
const camTarget = new THREE.Vector3(-40, 26, 90);
let menuAngle = 0;
function updateCamera(dt, t) {
  if (S.mode === 'menu') {
    menuAngle += dt * 0.06;
    camera.position.set(Math.cos(menuAngle) * 130, 42, Math.sin(menuAngle) * 130);
    camera.lookAt(0, 4, 0);
    return;
  }
  if (S.cutscene) {
    const k = Math.min(1, cutsceneT / 14);
    const e = k * k * (3 - 2 * k); // smoothstep
    camera.position.set(
      -140 + (60 + 140) * e,
      55 + (25 - 55) * e,
      -120 + (30 + 120) * e,
    );
    camera.lookAt(0, 6, 20);
    return;
  }
  const focus = S.car ? S.car.pos : S.player.pos;
  const heading = S.car ? S.car.heading : S.player.heading;
  const dist = S.car ? 13 : 9.5;
  const height = S.car ? 5.2 : 4.4;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  camTarget.set(focus.x - fx * dist, height, focus.z - fz * dist);
  const lerpK = 1 - Math.exp(-4.5 * dt);
  camera.position.lerp(camTarget, lerpK);
  camera.lookAt(focus.x, focus.y + 2, focus.z);
}

// ---- frame loop ----
let lastTime = performance.now();
let elapsed = 0;
let lastAutosave = 0;
// Mission 1 auto-start, shared by the frame loop and a timer: at headless
// speed requestAnimationFrame can stall for seconds, so a plain interval
// makes the garage trigger fire promptly even when rendering lags.
function maybeAutoStartMission1() {
  if (S.mode !== 'playing' || S.missions.current || S.missionIndex !== 0) return;
  const d = Math.hypot(S.player.pos.x - CONFIG.garage.x, S.player.pos.z - CONFIG.garage.z);
  if (d < CONFIG.garage.radius) S.missions.start(0);
}
setInterval(maybeAutoStartMission1, 500);
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (!(dt > 0)) dt = 0.016;
  dt = Math.min(dt, 0.05);
  elapsed += dt;

  // Global keys.
  if (S.cutscene && input.isDown('KeyX')) endCutscene();
  if (input.wasPressed('KeyP')) {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }
  if (input.wasPressed('KeyF') && ctx.shopFallbackInstalled && S.mode === 'playing') {
    const d = Math.hypot(S.player.pos.x - CONFIG.shop.x, S.player.pos.z - CONFIG.shop.z);
    if (d <= CONFIG.shop.radius + 2) {
      if (dom['shop-panel'].classList.contains('hidden')) show(dom['shop-panel']);
      else hide(dom['shop-panel']);
    }
  }

  if (S.mode !== 'paused') {
    S.tick(dt);
    S.challengesDirector.tick();
    // Cutscene clock + line cycling.
    if (S.cutscene) {
      cutsceneT += dt;
      const lines = ctx.cutsceneLines || CUTSCENE_FALLBACK;
      const idx = Math.min(lines.length - 1, Math.floor(cutsceneT / 4.5));
      if (idx !== cutsceneLineIdx) {
        cutsceneLineIdx = idx;
        dom['cutscene-text'].textContent = lines[idx];
      }
      if (cutsceneT >= 14) endCutscene();
    }
    // Mission 1 auto-start at the garage door.
    maybeAutoStartMission1();
    // Feature updates, each guarded.
    for (const fn of ctx.updates) {
      try {
        fn(dt, elapsed);
      } catch (e) {
        console.warn('update failed', e);
      }
    }
    // Day/night.
    if (ctx.daynightUpdate) ctx.daynightUpdate(dt);
    else daynightFallback(dt);
    // Camera.
    updateCamera(dt, elapsed);
    // Autosave every 20 s while playing.
    if (S.mode === 'playing' && elapsed - lastAutosave > 20) {
      lastAutosave = elapsed;
      saveGame();
    }
  }

  // HUD + render every frame.
  if (ctx.hudUpdate) ctx.hudUpdate(dt);
  else hudFallback();
  renderer.render(scene, camera);
  input.endFrame();
}

// ---- boot ----
loadGame();
window.__solmar = { S, player: S.player, camera };
requestAnimationFrame(frame);
loadModules();
