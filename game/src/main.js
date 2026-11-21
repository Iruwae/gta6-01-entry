// SOLMAR BAY — boot hub (round 9 rebuild).
// main.js is the ONLY file that imports the other modules. It builds the
// renderer, scene, camera and state, assembles ctx, loads every feature
// module it can find (probing with fetch first, so a missing file is a
// quiet skip and never a console error), runs the frame loop, owns the
// menu / pause / cutscene flow, the HUD refresh, the day-night sky and
// the follow camera, and exposes window.__solmar for the smoke test.

import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState } from './state.js';
import { createInput } from './input.js';

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const dom = {};
[
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
].forEach((id) => {
  dom[id] = $(id);
});

function show(el) {
  if (el) el.classList.remove('hidden');
}
function hide(el) {
  if (el) el.classList.add('hidden');
}

// ---------- Toast / dialogue (state hooks) ----------
let toastToken = '';
function showToast(msg) {
  toastToken = msg;
  const el = dom.toast;
  if (!el) return;
  el.textContent = msg;
  show(el);
  const token = msg;
  setTimeout(() => {
    // Only clear it if nobody else has written a newer toast since.
    if (toastToken === token && el.textContent === token) hide(el);
  }, 4500);
}

let dlgQueue = [];
function showDialogue(lines) {
  if (!lines || !lines.length) return;
  dlgQueue = lines.slice();
  renderDialogueLine();
}
function renderDialogueLine() {
  const line = dlgQueue[0];
  if (!line || !dom.dialogue) return;
  dom['dlg-name'].textContent = line.name || '???';
  dom['dlg-text'].textContent = line.text || '';
  const initials = (line.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
  dom['dlg-portrait'].textContent = initials;
  dom['dlg-portrait'].style.background =
    /LENA/i.test(line.name || '') ? '#ff7a9e' : /VIC/i.test(line.name || '') ? '#ffb347' : '#7ec8ff';
  show(dom.dialogue);
}
function advanceDialogue() {
  if (!dlgQueue.length) return false;
  dlgQueue.shift();
  if (dlgQueue.length) renderDialogueLine();
  else hide(dom.dialogue);
  return true;
}

// ---------- Renderer / scene / camera ----------
const container = dom['game-container'];
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1a3a);
scene.fog = new THREE.Fog(0x3a2340, 120, 520);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(-40, 26, 90);

window.addEventListener('resize', () => {
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ---------- State ----------
const S = createState({ toast: showToast });
const input = createInput();
input.attach();

const ctx = {
  THREE,
  scene,
  camera,
  renderer,
  config: CONFIG,
  state: S,
  dom,
  updates: [],
  api: {},
  input,
};
ctx.api.toast = showToast;
ctx.api.showDialogue = showDialogue;
ctx.api.advanceDialogue = advanceDialogue;
ctx.api.flash = () => {
  const el = dom.flash;
  if (!el) return;
  el.style.opacity = '1';
  requestAnimationFrame(() => {
    el.style.opacity = '0';
  });
};

// Mission briefings live here as a fallback: the missions module wraps
// S.missions.start and shows its own lines, but if it is absent (or it
// calls through to this wrap) the player still gets the Lena / Marco
// briefing for job 1 and the crew briefing for job 5.
const baseMissionStart = S.missions.start.bind(S.missions);
S.missions.start = (id) => {
  const cur = baseMissionStart(id);
  if (!cur) return cur;
  if (cur.id === 'm1') {
    ctx.api.showDialogue([
      { name: 'LENA CRUZ', text: 'Vic has a job with your name on it, hustler. Meet me at the garage — bring wheels if you have them, feet if you don’t.' },
      { name: 'MARCO SOLIS', text: 'Easy money, if you don’t get cute. Keys are in the car. Don’t scratch it — Vic counts the scratches.' },
    ]);
    ctx.api.toast('New job: FIRST JOB — meet Lena at the garage');
  } else if (cur.id === 'm5') {
    ctx.api.showDialogue([
      { name: 'LENA CRUZ', text: 'Crew’s all here, baby. We hit the convoy together or not at all — I drive, you shoot, nobody plays hero.' },
      { name: 'VIC TORRES', text: 'Lena drives, you shoot. Nobody plays hero. We clear? Good. The bay is watching — make it count.' },
    ]);
    ctx.api.toast('New job: CREW UP — Lena is riding with you');
  }
  return cur;
};

// ---------- Sky, sun, ground (the boot hub owns the look) ----------
const sunLight = new THREE.DirectionalLight(0xffb347, 2.2);
sunLight.position.set(70, 38, -60);
scene.add(sunLight);
S.sunLight = sunLight;
scene.add(new THREE.AmbientLight(0x8a6a9a, 0.55));
scene.add(new THREE.HemisphereLight(0xff9a5c, 0x2a1a3a, 0.5));

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: { uNight: { value: 0 } },
  vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'varying vec3 vPos; uniform float uNight;',
    'void main(){',
    '  float h = normalize(vPos).y;',
    '  vec3 day = mix(vec3(0.42,0.22,0.42), vec3(0.98,0.55,0.32), smoothstep(-0.08, 0.55, h));',
    '  vec3 night = mix(vec3(0.10,0.08,0.18), vec3(0.02,0.04,0.12), smoothstep(-0.08, 0.55, h));',
    '  gl_FragColor = vec4(mix(day, night, uNight), 1.0);',
    '}',
  ].join('\n'),
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 16), skyMat);
scene.add(skyDome);
S.skyDome = skyDome;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// ---------- Save / load (localStorage, primitives only) ----------
const SAVE_KEY = 'solmar-save';
function saveGame() {
  try {
    const data = {
      cash: S.cash, day: S.day, time: S.time, missionIndex: S.missionIndex,
      respect: S.respect, stats: S.stats, health: S.player.health,
      radioStation: S.radioStation,
      pos: [S.player.pos.x, S.player.pos.z],
      garageCars: S.garageCars,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* storage unavailable — the game still runs */ }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (typeof d.cash === 'number') S.cash = d.cash;
    if (typeof d.day === 'number') S.day = d.day;
    if (typeof d.time === 'number') S.time = d.time;
    if (typeof d.missionIndex === 'number') S.missionIndex = d.missionIndex;
    if (typeof d.respect === 'number') {
      S.respect = d.respect;
      S.respectDirector.add(0);
    }
    if (d.stats) Object.assign(S.stats, d.stats);
    if (typeof d.health === 'number') S.player.health = d.health;
    if (typeof d.radioStation === 'number') S.radioStation = d.radioStation;
    if (Array.isArray(d.pos)) S.player.pos.set(d.pos[0], 0, d.pos[1]);
    if (Array.isArray(d.garageCars)) S.garageCars = d.garageCars;
  } catch (e) { /* corrupt save — start fresh */ }
}
function resetState() {
  S.cash = CONFIG.startCash;
  S.day = CONFIG.startDay;
  S.time = 0;
  S.missionIndex = 0;
  S.respect = 0;
  S.respectDirector.rank.title = 'NOBODY';
  S.respectDirector.rank.min = 0;
  S.heat = 0;
  S.wanted = 0;
  S.radioStation = 0;
  S.car = null;
  S.heli = null;
  S.lastKnown = null;
  S.cops.length = 0;
  S.garageCars = [];
  S.missions.current = null;
  S.stats.packages = 0;
  S.stats.racesWon = 0;
  S.stats.fencesSold = 0;
  S.stats.faresDone = 0;
  S.sideActivities.taxi.active = false;
  S.sideActivities.taxi.dest = null;
  S.sideActivities.race.active = false;
  S.challengesDirector._paid.length = 0;
  S.challengesDirector.today = CONFIG.challenges.map((c) => ({ ...c }));
  S.crew.active = false;
  if (S.crew.mesh) S.crew.mesh.visible = false;
  S.player.pos.set(-84, 0, -58);
  S.player.heading = 0;
  S.player.health = CONFIG.maxHealth;
  S.player.reloading = false;
  S.player.reloadT = 0;
  for (const slot of S.player.loadout.slots) slot.mag = slot.def.magSize;
  S.player.loadout._equipped = 0;
  dlgQueue = [];
  hide(dom.dialogue);
}

// ---------- Menu / pause / cutscene ----------
const CUTSCENE_LINES = [
  'The sun is going down on Solmar Bay.',
  'Vic Torres has work. Lena Cruz has a plan. You have $120 and a fast mouth.',
  'From NOBODY to BAY LEGEND — it starts tonight.',
];
let cutsceneT = 0;
let cutsceneLine = -1;

function startCutscene() {
  S.mode = 'cutscene';
  S.cutscene = true;
  cutsceneT = 0;
  cutsceneLine = -1;
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
  startCutscene();
}
function pauseGame() {
  if (S.mode !== 'playing') return;
  S.mode = 'paused';
  show(dom['pause-menu']);
  // The shop and garage sheets sit above the pause menu; leaving one
  // open would cover the pause buttons and swallow their clicks.
  hide(dom['shop-panel']);
  hide(dom['garage-panel']);
  saveGame();
}
function resumeGame() {
  if (S.mode !== 'paused') return;
  S.mode = 'playing';
  hide(dom['pause-menu']);
  hide(dom['mission-select']);
}

dom['btn-new'].addEventListener('click', startNewGame);
dom['btn-resume'].addEventListener('click', resumeGame);
dom['btn-missions'].addEventListener('click', () => {
  buildJobBoard();
  show(dom['mission-select']);
});
dom['btn-close-jobs'].addEventListener('click', () => hide(dom['mission-select']));
dom['btn-close-shop'].addEventListener('click', () => hide(dom['shop-panel']));
dom['btn-close-garage'].addEventListener('click', () => hide(dom['garage-panel']));
dom.dialogue.addEventListener('click', () => {
  // Advance our own queue if we own the dialogue; a feature module that
  // registered its own dialogue advances its own queue on the same click.
  advanceDialogue();
});
dom.cutscene.addEventListener('click', endCutscene);
// Skip on a raw key press too, not only on the next rendered frame: at
// headless speed a frame can span the whole key hold, so the frame loop
// alone can miss the skip window entirely.
window.addEventListener('keydown', (e) => {
  if (!e.repeat && e.code === 'KeyX' && S.cutscene) endCutscene();
});

// Job board: 10 rows, built here so the pause menu works even if the
// missions module rebuilds the list later with its own handlers.
function buildJobBoard() {
  const list = dom['mission-list'];
  if (!list) return;
  list.innerHTML = '';
  CONFIG.missions.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'job-row';
    const done = i < S.missionIndex;
    const current = S.missions.current && S.missions.current.id === m.id;
    row.innerHTML =
      `<span class="t">${done ? '✓ ' : ''}${m.title}</span>` +
      `<span class="g">${m.giver}</span>` +
      `<span class="pay">${current ? 'ACTIVE' : '$' + m.pay}</span>`;
    row.addEventListener('click', () => {
      if (!done && !current) {
        S.missions.start(i);
        hide(dom['mission-select']);
        resumeGame();
      }
    });
    list.appendChild(row);
  });
}

// ---------- Shop fallback (only if no shop module loaded) ----------
// The MART is a self-contained fallback: F near the store opens the
// panel, a buy applies the item. Rows are marked data-fallback so the
// delegated buy handler never touches rows a real shop module built.
let shopFallback = false;
function buildShopRows() {
  const box = dom['shop-items'];
  if (!box) return;
  box.innerHTML = '';
  for (const item of CONFIG.shopItems) {
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.dataset.fallback = '1';
    row.dataset.item = item.id;
    row.innerHTML =
      `<span><span class="shop-name">${item.name}</span><br><span class="shop-desc">${item.desc}</span></span>` +
      `<span class="shop-price">$${item.price}</span>` +
      `<button class="mini-btn shop-buy">BUY</button>`;
    box.appendChild(row);
  }
}
function buyShopItem(itemId) {
  const item = CONFIG.shopItems.find((x) => x.id === itemId);
  if (!item) return;
  if (S.cash < item.price) {
    showToast('Not enough cash for a ' + item.name + '.');
    return;
  }
  S.cash -= item.price;
  if (item.heal > 0) {
    S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
  } else if (item.id === 'ammo') {
    S.player.loadout.current().mag = S.player.loadout.current().def.magSize;
  }
  showToast(item.name + ' — $' + item.price + (item.heal > 0 ? ` (+${item.heal} HP)` : ' (magazine refilled)'));
}
function installShopFallback() {
  shopFallback = true;
  buildShopRows();
  dom['shop-items'].addEventListener('click', (e) => {
    const btn = e.target.closest('.shop-buy');
    if (!btn) return;
    const row = btn.closest('.shop-row');
    if (!row || row.dataset.fallback !== '1') return;
    buyShopItem(row.dataset.item);
  });
  dom['btn-close-shop'].addEventListener('click', () => hide(dom['shop-panel']));
}

// ---------- Feature modules (probe first, import what exists) ----------
// Every name here is a real file under game/src/. Names that do not
// exist would 404 on the probe and log a console error, so the list
// holds exactly the modules that ship. menu.js is left out on purpose:
// the boot hub already owns pause, resume and the job board, and a
// second P-key handler would toggle pause twice on one press. banter.js
// loads just before crew.js so the crew module's banter director (the
// one the smoke test exercises) is the one that stays live.
const MODULE_ORDER = [
  'daynight.js', 'districts.js', 'player.js', 'vehicles.js', 'city.js',
  'sky.js', 'ambient.js', 'people.js', 'police.js', 'heli2.js', 'heat.js',
  'missions.js', 'side.js', 'shop.js', 'garage.js', 'fence.js',
  'hud.js', 'dialogue.js', 'audio.js', 'banter.js', 'crew.js',
  'challenges.js', 'respect.js', 'radio2.js', 'safehouse.js', 'weapons.js',
  'cutscene.js', 'juice.js', 'postfx.js',
];
const loadedModules = new Set();

async function loadModules() {
  for (const name of MODULE_ORDER) {
    try {
      // Probe with fetch: a 404 is a quiet skip, never a console error.
      const res = await fetch(new URL(name, import.meta.url));
      if (!res.ok) continue;
      const mod = await import('./' + name);
      if (mod && typeof mod.init === 'function') {
        try {
          mod.init(ctx);
          loadedModules.add(name);
        } catch (e) {
          console.warn('[solmar] init failed: ' + name, e);
        }
      }
    } catch (e) {
      // Absent or unloadable — the fallbacks in state.js cover the gap.
    }
  }
  if (!loadedModules.has('shop.js') && !loadedModules.has('store.js') && !loadedModules.has('mart.js')) {
    installShopFallback();
  }
}

// ---------- Day / night ----------
function updateDayNight(dt) {
  const totalMin = CONFIG.dayStartClockMin + S.time;
  let phase = 'SUNSET';
  let target = 0;
  if (totalMin >= CONFIG.dayStartClockMin + CONFIG.nightStartMin) {
    phase = 'NIGHT';
    target = 1;
  } else if (totalMin >= CONFIG.dayStartClockMin + CONFIG.duskStartMin) {
    phase = 'DUSK';
    target = (totalMin - CONFIG.dayStartClockMin - CONFIG.duskStartMin) /
      (CONFIG.nightStartMin - CONFIG.duskStartMin);
  }
  S.dayNight.phase = phase;
  const n = S.dayNight.night;
  const step = dt * 0.6;
  S.dayNight.night = n < target ? Math.min(target, n + step) : Math.max(target, n - step);
  if (S.sunLight) {
    S.sunLight.intensity = 2.2 - S.dayNight.night * 1.85;
    S.sunLight.color.setHex(S.dayNight.night > 0.6 ? 0x8fb4ff : 0xffb347);
  }
  if (S.skyDome && S.skyDome.material && S.skyDome.material.uniforms) {
    S.skyDome.material.uniforms.uNight.value = S.dayNight.night;
  }
}

// ---------- Camera ----------
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  if (S.mode === 'menu') {
    const a = performance.now() / 1000 * 0.03;
    camera.position.set(Math.cos(a) * 130, 62, Math.sin(a) * 130);
    camera.lookAt(0, 0, 0);
    return;
  }
  if (S.mode === 'cutscene') {
    const k = Math.min(cutsceneT / 14, 1);
    camera.position.set(-140 + k * 200, 55 - k * 30, -120 + k * 150);
    camera.lookAt(0, 4, 0);
    return;
  }
  const focus = S.car ? S.car.pos : S.player.pos;
  const heading = S.car ? (S.car.heading || 0) : S.player.heading;
  const dist = S.car ? 13 : 9.5;
  const height = S.car ? 5.2 : 4.4;
  camTarget.set(
    focus.x - Math.sin(heading) * dist,
    focus.y + height,
    focus.z - Math.cos(heading) * dist
  );
  const blend = 1 - Math.pow(0.002, dt);
  camera.position.lerp(camTarget, blend);
  camera.lookAt(focus.x, focus.y + 2, focus.z);
}

// ---------- HUD ----------
const slotEls = Array.from(document.querySelectorAll('#weapons .slot'));
let lastObjective = '';
function fmtClock() {
  const totalMin = CONFIG.dayStartClockMin + S.time;
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = Math.floor(totalMin) % 60;
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
function updateHUD() {
  dom.cash.textContent = '$' + Math.floor(S.cash).toLocaleString('en-US');
  const dist = CONFIG.districts.find((d) => d.id === S.district);
  dom.district.textContent = dist ? dist.name : S.district.toUpperCase();
  dom['day-time'].textContent = `DAY ${S.day} ${fmtClock()} ${S.dayNight.phase}`;
  dom['respect-num'].textContent = String(S.respect);
  dom['respect-rank'].textContent = S.respectDirector.rank.title;
  dom['health-fill'].style.width = Math.max(0, Math.min(100, S.player.health)) + '%';
  // Radio: station name + current track come from CONFIG.stations.
  const st = CONFIG.stations[S.radioStation] || CONFIG.stations[0];
  dom['radio-station'].textContent = st.name;
  dom['radio-track'].textContent = st.tracks[Math.floor(S.time / 45) % st.tracks.length];
  // Wanted stars.
  if (S.wanted > 0) {
    dom.wanted.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
    show(dom.wanted);
  } else {
    hide(dom.wanted);
  }
  // Weapon slots.
  slotEls.forEach((el, i) => {
    const slot = S.player.loadout.slots[i];
    if (!slot) return;
    el.querySelector('.slot-name').textContent = slot.def.name;
    el.querySelector('.slot-ammo').textContent = String(slot.mag);
    el.classList.toggle('on', i === S.player.loadout.equipped);
  });
  // Speedo.
  const speed = S.car ? Math.round(Math.abs(S.car.speed || 0)) : 0;
  dom['speed-num'].textContent = String(speed);
  dom['speed-gear'].textContent = !S.car
    ? 'N'
    : speed < 1 ? 'N' : speed < 20 ? '1' : speed < 40 ? '2' : speed < 60 ? '3' : speed < 80 ? '4' : '5';
  dom['speed-car'].textContent = S.car ? String(S.car.kind || 'CAR').toUpperCase() : 'ON FOOT';
  // Objective.
  const obj = S.missions.current
    ? (S.missions.current.objective || S.missions.current.desc)
    : 'Explore Solmar Bay — find work.';
  if (obj !== lastObjective) {
    lastObjective = obj;
    S.objective = obj;
    dom.objective.textContent = obj;
  }
}
function updateRoster() {
  const cops = S.cops.length ? S.cops : S.cars.filter((c) => c.aiPolice);
  if (!cops.length) {
    hide(dom.roster);
    return;
  }
  show(dom.roster);
  dom['roster-code'].textContent = `DISPATCH 10-80 — ${S.wanted} STAR${S.wanted === 1 ? '' : 'S'}`;
  const rows = dom['roster-rows'];
  rows.innerHTML = '';
  for (const cop of cops) {
    const dx = cop.pos.x - S.player.pos.x;
    const dz = cop.pos.z - S.player.pos.z;
    const d = Math.round(Math.hypot(dx, dz));
    const tactic = (cop.brain && cop.brain.tactic) || 'PURSUIT';
    const row = document.createElement('div');
    row.className = 'roster-row';
    row.innerHTML = `<b>${cop.callsign || 'PD-??'}</b><span>${tactic}</span><span>${d}m</span>`;
    rows.appendChild(row);
  }
}
function drawMinimap() {
  const cv = dom.minimap;
  if (!cv) return;
  const g = cv.getContext('2d');
  if (!g) return;
  const W = 180;
  const px = (x) => 90 + x * 0.45;
  const pz = (z) => 90 + z * 0.45;
  g.fillStyle = '#12081f';
  g.fillRect(0, 0, W, W);
  for (const d of CONFIG.districts) {
    g.fillStyle = d.color;
    g.beginPath();
    g.arc(px(d.x), pz(d.z), 3, 0, Math.PI * 2);
    g.fill();
  }
  if (S.wanted > 0 && S.lastKnown) {
    g.strokeStyle = 'rgba(255, 80, 80, 0.8)';
    g.beginPath();
    g.arc(px(S.lastKnown.x), pz(S.lastKnown.z), 14, 0, Math.PI * 2);
    g.stroke();
  }
  for (const p of S.packages) {
    if (p.taken) continue;
    g.fillStyle = '#ffd94c';
    g.fillRect(px(p.x) - 2, pz(p.z) - 2, 4, 4);
  }
  for (const c of S.cars) {
    g.fillStyle = c.aiPolice ? '#5fb4ff' : '#e8e0d0';
    g.fillRect(px(c.pos.x) - 2, pz(c.pos.z) - 2, 4, 4);
  }
  if (S.heli) {
    g.fillStyle = '#ff5a5a';
    g.beginPath();
    g.arc(px(S.heli.pos.x), pz(S.heli.pos.z), 4, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffb347';
  g.beginPath();
  g.arc(px(S.player.pos.x), pz(S.player.pos.z), 4, 0, Math.PI * 2);
  g.fill();
}

// ---------- Frame loop ----------
let lastNow = performance.now();
let rosterT = 0;
let mapT = 0;
let saveT = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastNow) / 1000, 0.05);
  lastNow = now;

  // Global keys owned by the boot hub.
  // X skips the cutscene on a press OR a hold: at headless speed a frame
  // can span a whole short press, so the held-key state is the reliable
  // signal while the cutscene is up.
  if ((input.wasPressed('KeyX') || input.isDown('KeyX')) && S.cutscene) endCutscene();
  if (input.wasPressed('KeyP')) {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }
  // Shop fallback key (only when no shop module is running).
  if (shopFallback && input.wasPressed('KeyF') && S.mode === 'playing') {
    const dx = S.player.pos.x - CONFIG.martPos.x;
    const dz = S.player.pos.z - CONFIG.martPos.z;
    if (Math.hypot(dx, dz) < CONFIG.martRadius) {
      buildShopRows();
      show(dom['shop-panel']);
    }
  }

  if (S.mode !== 'paused') {
    try {
      S.tick(dt);
    } catch (e) {
      console.warn('[solmar] state tick failed', e);
    }
    if (S.challengesDirector && typeof S.challengesDirector.tick === 'function') {
      try {
        S.challengesDirector.tick(dt);
      } catch (e) {
        console.warn('[solmar] challenges tick failed', e);
      }
    }
    // Cutscene clock + line cycling.
    if (S.mode === 'cutscene') {
      cutsceneT += dt;
      const li = Math.min(CUTSCENE_LINES.length - 1, Math.floor(cutsceneT / 4.5));
      if (li !== cutsceneLine) {
        cutsceneLine = li;
        dom['cutscene-text'].textContent = CUTSCENE_LINES[li];
      }
      if (cutsceneT > 14) endCutscene();
    }
    // Mission 1 auto-starts at the garage.
    if (S.mode === 'playing' && !S.missions.current && S.missionIndex === 0) {
      const dx = S.player.pos.x - CONFIG.garagePos.x;
      const dz = S.player.pos.z - CONFIG.garagePos.z;
      if (Math.hypot(dx, dz) < CONFIG.garageRadius) S.missions.start(0);
    }
    // Feature-module updates.
    const updates = ctx.updates.slice();
    for (const u of updates) {
      try {
        u(dt, now / 1000);
      } catch (e) {
        console.warn('[solmar] update failed', e);
      }
    }
    updateDayNight(dt);
    updateCamera(dt);
    // Autosave while playing.
    saveT += dt;
    if (S.mode === 'playing' && saveT > 20) {
      saveT = 0;
      saveGame();
    }
  }

  updateHUD();
  rosterT += dt;
  if (rosterT > 0.25) {
    rosterT = 0;
    updateRoster();
  }
  mapT += dt;
  if (mapT > 0.15) {
    mapT = 0;
    drawMinimap();
  }

  renderer.render(scene, camera);
  input.endFrame();
}

// The city builder and the vehicles module both park a bike, a sport
// car and a pickup at the same spots. Keep the first car of each kind
// at a spot and drop the later copy, mesh and all, so the world never
// shows two cars occupying the same parking space. Police cars are
// never touched: they spawn and leave on their own.
function removeDuplicateParkedCars() {
  const seen = new Set();
  for (let i = 0; i < S.cars.length; i++) {
    const car = S.cars[i];
    if (!car || !car.pos || car.aiPolice) continue;
    const key = car.kind + '@' + Math.round(car.pos.x) + ',' + Math.round(car.pos.z);
    if (seen.has(key)) {
      if (car.mesh) scene.remove(car.mesh);
      S.cars.splice(i, 1);
      i--;
    } else {
      seen.add(key);
    }
  }
}

// ---------- Boot ----------
loadGame();
window.__solmar = { S, player: S.player, camera };
// The frame loop starts at once; the module load runs alongside it and
// the parked-car dedupe follows when the load finishes.
loadModules().then(removeDuplicateParkedCars);
requestAnimationFrame(frame);
