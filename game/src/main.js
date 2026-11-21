// SOLMAR BAY — boot hub. The ONLY file that imports the other modules.
// Owns the renderer, the look, menus, HUD, save/load and the frame loop.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState } from './state.js';
import { createInput } from './input.js';

const $ = (id) => document.getElementById(id);
const dom = {};
[
  'game-container', 'sunset-band', 'vignette', 'flash', 'hud', 'cash',
  'district', 'day-time', 'objective', 'respect-line', 'respect-num',
  'respect-rank', 'wanted', 'radio', 'radio-station', 'radio-track',
  'minimap', 'roster', 'roster-code', 'roster-rows', 'health-bar',
  'health-fill', 'weapons', 'speedo', 'speed-num', 'speed-gear',
  'speed-car', 'toast', 'dialogue', 'dlg-portrait', 'dlg-name',
  'dlg-text', 'cutscene', 'cutscene-text', 'menu', 'pause-menu',
  'btn-new', 'btn-resume', 'btn-missions', 'btn-close-jobs',
  'mission-select', 'mission-list', 'shop-panel', 'shop-items',
  'btn-close-shop', 'garage-panel', 'garage-list', 'btn-close-garage',
].forEach((id) => { dom[id] = $(id); });

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

// ---- toast: only a newer toast replaces the current one
let toastToken = 0;
function showToast(msg) {
  const my = ++toastToken;
  dom.toast.textContent = msg;
  show(dom.toast);
  setTimeout(() => { if (my === toastToken) hide(dom.toast); }, 4500);
}

// ---- dialogue queue
const dialogueQueue = [];
function portraitFor(name) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  let color = '#5fb4c9';
  if (name === 'LENA CRUZ') color = '#ff7a9e';
  else if (name === 'VIC TORRES') color = '#ffb347';
  return { initials, color };
}
function renderDialogueLine() {
  const line = dialogueQueue[0];
  if (!line) { hide(dom.dialogue); return; }
  const p = portraitFor(line.name);
  dom['dlg-portrait'].textContent = p.initials;
  dom['dlg-portrait'].style.background = p.color;
  dom['dlg-name'].textContent = line.name;
  dom['dlg-text'].textContent = line.text;
  show(dom.dialogue);
}
function showDialogue(lines) {
  dialogueQueue.length = 0;
  for (const l of lines) dialogueQueue.push(l);
  renderDialogueLine();
}
function advanceDialogue() {
  if (dialogueQueue.length === 0) return;
  dialogueQueue.shift();
  renderDialogueLine();
}

// ---- renderer / scene / camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(dom['game-container'].clientWidth || window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
dom['game-container'].appendChild(renderer.domElement);

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

// ---- state + input + shared context
const S = createState({ toast: showToast });
const input = createInput();
input.attach();

const api = {
  toast: showToast,
  showDialogue,
  advanceDialogue,
  flash() {
    dom.flash.style.opacity = '0.85';
    setTimeout(() => { dom.flash.style.opacity = '0'; }, 70);
  },
};
const ctx = { THREE, scene, camera, renderer, config: CONFIG, state: S, dom, updates: [], api, input };

// ---- the Sunset look, owned by the boot hub
const sunLight = new THREE.DirectionalLight(0xffb347, 2.2);
sunLight.position.set(70, 38, -60);
scene.add(sunLight);
S.sunLight = sunLight;
scene.add(new THREE.AmbientLight(0x8a6bb0, 0.7));
const hemi = new THREE.HemisphereLight(0xffb347, 0x2a1a3a, 0.65);
scene.add(hemi);

// Sky dome: orange horizon through purple dusk by day, deep night blue.
const skyMat = new THREE.ShaderMaterial({
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
      vec3 dayHorizon = vec3(1.0, 0.62, 0.25);
      vec3 dayZenith = vec3(0.45, 0.20, 0.45);
      vec3 nightHorizon = vec3(0.10, 0.08, 0.25);
      vec3 nightZenith = vec3(0.02, 0.02, 0.10);
      vec3 horizon = mix(dayHorizon, nightHorizon, uNight);
      vec3 zenith = mix(dayZenith, nightZenith, uNight);
      vec3 col = mix(horizon, zenith, smoothstep(-0.05, 0.65, h));
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 16), skyMat);
scene.add(skyDome);
S.skyDome = skyDome;

// Dark ground plane.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x352a44, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// ---- save / load (localStorage, primitives only)
const SAVE_KEY = 'solmar-save';
function saveGame() {
  try {
    const data = {
      cash: S.cash, day: S.day, time: S.time, missionIndex: S.missionIndex,
      respect: S.respect, stats: { ...S.stats }, health: S.player.health,
      radioStation: S.radioStation, px: S.player.pos.x, pz: S.player.pos.z,
      garageCars: S.garageCars.map((c) => ({ kind: c.kind, tune: { ...c.tune } })),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* storage unavailable: play on without saving */ }
}
function loadGame() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') return;
  try {
    if (typeof data.cash === 'number') S.cash = data.cash;
    if (typeof data.day === 'number' && data.day >= 1) S.day = data.day;
    if (typeof data.time === 'number' && data.time >= 0) S.time = data.time;
    if (typeof data.missionIndex === 'number') S.missionIndex = Math.min(10, Math.max(0, data.missionIndex));
    if (typeof data.respect === 'number') { S.respect = Math.max(0, data.respect); S.respectDirector.add(0, 'load'); }
    if (data.stats && typeof data.stats === 'object') {
      for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
        if (typeof data.stats[k] === 'number') S.stats[k] = data.stats[k];
      }
    }
    if (typeof data.health === 'number') S.player.health = Math.max(0, Math.min(100, data.health));
    if (typeof data.radioStation === 'number') S.radioStation = data.radioStation % 6;
    if (typeof data.px === 'number' && typeof data.pz === 'number') S.player.pos.set(data.px, 0, data.pz);
    if (Array.isArray(data.garageCars)) S.garageCars = data.garageCars.filter((c) => c && typeof c.kind === 'string');
  } catch (e) { /* corrupt save: fresh start */ }
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
  S.district = 'downtown';
  S.objective = 'Explore Solmar Bay — find work.';
  S.dayNight = { phase: 'SUNSET', night: 0 };
  if (S.car && S.car.mesh) scene.remove(S.car.mesh);
  S.car = null;
  for (const c of S.cops) if (c.mesh) scene.remove(c.mesh);
  S.cops = [];
  if (S.heli && S.heli.mesh) scene.remove(S.heli.mesh);
  S.heli = null;
  S.lastKnown = null;
  S.garageCars = [];
  S.missions.current = null;
  S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  S.sideActivities.taxi = { active: false, dest: null, fare: 0 };
  S.sideActivities.race = { active: false, gates: [], next: 0 };
  S.challengesDirector.today = CONFIG.challenges.map((c) => ({ ...c }));
  S.challengesDirector._paid = [];
  S.crew.active = false;
  if (S.crew.mesh) S.crew.mesh.visible = false;
  for (const p of S.packages) {
    p.taken = false;
    if (p.mesh) p.mesh.visible = true;
  }
  S.player.pos.set(-84, 0, -58);
  S.player.vel.set(0, 0, 0);
  S.player.heading = 0;
  S.player.health = CONFIG.maxHealth;
  S.player.reloading = false;
  S.player.reloadT = 0;
  S.player.fireT = 0;
  for (const slot of S.player.loadout.slots) slot.mag = slot.def.mag;
  S.player.loadout._equipped = 0;
  dialogueQueue.length = 0;
  hide(dom.dialogue);
}

// ---- mission briefing fallback (m1 Lena-then-Marco, m5 Lena-then-Vic)
const _origStart = S.missions.start.bind(S.missions);
S.missions.start = function (idOrIndex) {
  const job = _origStart(idOrIndex);
  if (!job) return job;
  if (job.id === 'm1') {
    showDialogue([
      { name: 'LENA CRUZ', text: 'You made it. Vic has work, and the sun is already going down — so listen fast.' },
      { name: 'MARCO SOLIS', text: 'First job is simple. Meet the contact, take the package, do not get followed. Welcome to Solmar Bay.' },
    ]);
    showToast('New job: FIRST JOB — meet Lena at the garage.');
  } else if (job.id === 'm5') {
    showDialogue([
      { name: 'LENA CRUZ', text: 'From here on we ride together. You drive, I watch the mirrors. Deal?' },
      { name: 'VIC TORRES', text: 'The convoy rolls at dusk. Hit it clean, split it fair, and nobody gets hurt who does not have to.' },
    ]);
    showToast('New job: CREW UP — Lena rides with you.');
  }
  return job;
};

// ---- cutscene
const CUTSCENE_LINES = [
  'The sun hangs low over Solmar Bay, and the whole city is turning gold.',
  'Somewhere below, Vic Torres is waiting — and Lena Cruz is already behind the wheel.',
  'One hundred and twenty dollars. One long sunset. Make it count.',
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
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyX' && S.cutscene) endCutscene();
});

// ---- menu / pause / job board
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
  dom['mission-list'].innerHTML = '';
  CONFIG.missions.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'job-row';
    const done = i < S.missionIndex;
    const current = S.missions.current && S.missions.current.index === i;
    const right = done ? '<span class="job-done">✓ DONE</span>'
      : current ? '<span class="job-pay">ACTIVE</span>'
      : `<span class="job-pay">$${m.pay}</span>`;
    row.innerHTML = `<div><div class="job-title">${m.title}</div><div class="job-giver">${m.giver} — ${m.desc}</div></div>${right}`;
    if (!done && !current) {
      row.addEventListener('click', () => {
        S.missions.start(i);
        hide(dom['mission-select']);
        resumeGame();
      });
    }
    dom['mission-list'].appendChild(row);
  });
}
dom['btn-new'].addEventListener('click', startNewGame);
dom['btn-resume'].addEventListener('click', resumeGame);
dom['btn-missions'].addEventListener('click', () => { buildJobBoard(); show(dom['mission-select']); });
dom['btn-close-jobs'].addEventListener('click', () => hide(dom['mission-select']));
dom['btn-close-shop'].addEventListener('click', () => hide(dom['shop-panel']));
dom['btn-close-garage'].addEventListener('click', () => hide(dom['garage-panel']));
dom.dialogue.addEventListener('click', advanceDialogue);
dom.cutscene.addEventListener('click', () => endCutscene());

// ---- shop fallback (only installed if no shop module loads)
let shopFallbackActive = false;
function buildShopFallbackRows() {
  dom['shop-items'].innerHTML = '';
  for (const item of CONFIG.shop.items) {
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.dataset.fallback = '1';
    row.innerHTML = `<div><div class="shop-name">${item.name}</div><div class="shop-desc">${item.desc}</div></div><span class="shop-price">$${item.price}</span>`;
    const btn = document.createElement('button');
    btn.className = 'shop-buy';
    btn.textContent = 'BUY';
    btn.addEventListener('click', () => {
      if (row.dataset.fallback !== '1') return; // never touch real shop rows
      if (S.cash < item.price) { showToast('Not enough cash for that.'); return; }
      S.cash -= item.price;
      if (item.id === 'ammo') {
        S.player.loadout.current().mag = S.player.loadout.current().def.mag;
        showToast(`Ammo Box bought — magazine refilled (-$${item.price}).`);
      } else {
        S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
        showToast(`${item.name} bought — healed ${item.heal} HP (-$${item.price}).`);
      }
    });
    row.appendChild(btn);
    dom['shop-items'].appendChild(row);
  }
}
function openShopFallback() {
  buildShopFallbackRows();
  show(dom['shop-panel']);
}

// ---- feature modules (exact order; missing file = quiet skip)
const MODULE_ORDER = [
  'daynight', 'districts', 'player', 'vehicles', 'city', 'sky', 'ambient',
  'people', 'police', 'heli2', 'heat', 'missions', 'side', 'shop', 'garage',
  'fence', 'hud', 'dialogue', 'audio', 'banter', 'crew', 'challenges',
  'respect', 'radio2', 'safehouse', 'weapons', 'cutscene', 'juice', 'postfx',
];
let shopLoaded = false;
async function loadModules() {
  for (const name of MODULE_ORDER) {
    try {
      const url = new URL(`./${name}.js`, import.meta.url);
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) continue; // missing file: quiet skip, never a console error
      const mod = await import(url.href);
      if (mod && typeof mod.init === 'function') {
        await mod.init(ctx);
        if (name === 'shop') shopLoaded = true;
      }
    } catch (e) { /* one failing module never kills the boot */ }
  }
  if (!shopLoaded) {
    shopFallbackActive = true;
    ctx.shopFallback = { open: openShopFallback };
  }
  dedupeParkedCars();
}
function dedupeParkedCars() {
  const seen = new Set();
  const kept = [];
  for (const car of S.cars) {
    if (car.aiPolice) { kept.push(car); continue; }
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

// ---- day / night
function updateDayNight(dt) {
  const t = S.time;
  let target = 0;
  let phase = 'SUNSET';
  if (t >= CONFIG.nightAt) { target = 1; phase = 'NIGHT'; }
  else if (t >= CONFIG.duskAt) { target = (t - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt); phase = 'DUSK'; }
  S.dayNight.phase = phase;
  const n = S.dayNight.night;
  const step = 0.6 * dt;
  S.dayNight.night = target > n ? Math.min(target, n + step) : Math.max(target, n - step);
  const night = S.dayNight.night;
  sunLight.intensity = 2.2 - night * 1.85;
  sunLight.color.setHex(night > 0.6 ? 0x7a9fd4 : 0xffb347);
  skyMat.uniforms.uNight.value = night;
}

// ---- camera
const camTarget = new THREE.Vector3(-40, 26, 90);
let menuAngle = 0;
function updateCamera(dt) {
  if (S.mode === 'menu') {
    menuAngle += dt * 0.05;
    camTarget.set(Math.cos(menuAngle) * 70, 30, Math.sin(menuAngle) * 70);
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 2));
    camera.lookAt(0, 4, 0);
    return;
  }
  if (S.cutscene) {
    const p = Math.min(1, cutsceneT / 14);
    camTarget.set(
      -140 + (60 - -140) * p,
      55 + (25 - 55) * p,
      -120 + (30 - -120) * p,
    );
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 3));
    camera.lookAt(0, 2, 0);
    return;
  }
  const focus = S.car ? S.car.pos : S.player.pos;
  const heading = S.car ? S.car.heading : S.player.heading;
  const dist = S.car ? 13 : 9.5;
  const height = S.car ? 5.2 : 4.4;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  camTarget.set(focus.x - fx * dist, height, focus.z - fz * dist);
  // Snap when the target jumps far (teleport / load) instead of
  // lerping across the whole city.
  if (camera.position.distanceTo(camTarget) > 25) camera.position.copy(camTarget);
  camera.position.lerp(camTarget, 1 - Math.exp(-dt * 5));
  camera.lookAt(focus.x, focus.y + 2, focus.z);
}

// ---- HUD
function clockText() {
  const total = CONFIG.dayOpenHour * 60 + CONFIG.dayOpenMinute + S.time;
  const hh = Math.floor(total / 60) % 24;
  const mm = Math.floor(total % 60);
  return `DAY ${S.day} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${S.dayNight.phase}`;
}
function updateHUD() {
  dom.cash.textContent = '$' + Math.floor(S.cash).toLocaleString('en-US');
  const d = CONFIG.districts.find((x) => x.id === S.district) || CONFIG.districts[0];
  dom.district.textContent = d.name;
  dom['day-time'].textContent = clockText();
  dom['respect-num'].textContent = String(Math.floor(S.respect));
  dom['respect-rank'].textContent = S.respectDirector.rank.title;
  dom['health-fill'].style.width = `${Math.max(0, Math.min(100, S.player.health))}%`;
  const station = CONFIG.radio[S.radioStation];
  dom['radio-station'].textContent = station.name;
  const track = station.tracks[Math.floor(S.time / 45) % station.tracks.length];
  dom['radio-track'].textContent = `${track.title} — ${track.artist}`;
  if (S.wanted > 0) {
    dom.wanted.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
    show(dom.wanted);
  } else {
    hide(dom.wanted);
  }
  const slots = dom.weapons.querySelectorAll('.slot');
  S.player.loadout.slots.forEach((slot, i) => {
    const el = slots[i];
    if (!el) return;
    el.querySelector('.slot-name').textContent = slot.def.name;
    el.querySelector('.slot-ammo').textContent = String(slot.mag);
    el.classList.toggle('on', i === S.player.loadout.equipped);
  });
  const speed = S.car ? Math.abs(S.car.speed) : Math.hypot(S.player.vel.x, S.player.vel.z);
  dom['speed-num'].textContent = String(Math.round(speed * 2.237));
  dom['speed-gear'].textContent = speed < 1 ? 'N' : String(Math.min(5, 1 + Math.floor(speed / 15)));
  dom['speed-car'].textContent = S.car ? S.car.kind.toUpperCase() : 'ON FOOT';
  dom.objective.textContent = S.missions.current ? S.missions.current.desc : 'Explore Solmar Bay — find work.';
  S.objective = dom.objective.textContent;
}

// ---- police roster (4x/second)
let rosterTimer = 0;
function updateRoster(dt) {
  rosterTimer += dt;
  if (rosterTimer < 0.25) return;
  rosterTimer = 0;
  const cops = S.cops.length > 0 ? S.cops : S.cars.filter((c) => c.aiPolice);
  if (cops.length === 0) { hide(dom.roster); return; }
  show(dom.roster);
  dom['roster-code'].textContent = `DISPATCH 10-80 — ${S.wanted} STAR(S)`;
  dom['roster-rows'].innerHTML = '';
  for (const cop of cops) {
    const dist = Math.round(Math.hypot(cop.pos.x - S.player.pos.x, cop.pos.z - S.player.pos.z));
    const row = document.createElement('div');
    row.className = 'roster-row';
    const tactic = (cop.brain && cop.brain.tactic) || 'PURSUIT';
    row.innerHTML = `<b>${cop.callsign || 'PD-??'}</b> — ${tactic} — ${dist}m`;
    dom['roster-rows'].appendChild(row);
  }
}

// ---- minimap (~7x/second)
let mapTimer = 0;
function updateMinimap(dt) {
  mapTimer += dt;
  if (mapTimer < 0.14) return;
  mapTimer = 0;
  const cv = dom.minimap;
  const g = cv.getContext('2d');
  const toMap = (x, z) => [90 + x * 0.45, 90 + z * 0.45];
  g.fillStyle = '#0d0518';
  g.fillRect(0, 0, 180, 180);
  for (const d of CONFIG.districts) {
    const [mx, my] = toMap(d.x, d.z);
    g.fillStyle = d.color;
    g.beginPath(); g.arc(mx, my, 3, 0, Math.PI * 2); g.fill();
  }
  if (S.wanted > 0 && S.lastKnown) {
    const [mx, my] = toMap(S.lastKnown.x, S.lastKnown.z);
    g.strokeStyle = '#ff5a5a';
    g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, 7, 0, Math.PI * 2); g.stroke();
  }
  for (const p of S.packages) {
    if (p.taken) continue;
    const [mx, my] = toMap(p.x, p.z);
    g.fillStyle = '#ffd27a';
    g.fillRect(mx - 2, my - 2, 4, 4);
  }
  for (const car of S.cars) {
    const [mx, my] = toMap(car.pos.x, car.pos.z);
    g.fillStyle = car.aiPolice ? '#4d8dff' : '#ffe9c9';
    g.fillRect(mx - 2, my - 2, 4, 4);
  }
  if (S.heli) {
    const [mx, my] = toMap(S.heli.pos.x, S.heli.pos.z);
    g.fillStyle = '#ff3b3b';
    g.beginPath(); g.arc(mx, my, 3, 0, Math.PI * 2); g.fill();
  }
  const [px, py] = toMap(S.player.pos.x, S.player.pos.z);
  g.fillStyle = '#ffb347';
  g.beginPath(); g.arc(px, py, 3.5, 0, Math.PI * 2); g.fill();
}

// ---- frame loop
let lastT = performance.now();
let saveTimer = 0;
function dist2d(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (!(dt > 0)) dt = 0.016;
  dt = Math.min(dt, 0.05);

  // X skips the cutscene — press or hold, checked every frame.
  if (S.cutscene && (input.isDown('KeyX') || input.wasPressed('KeyX'))) endCutscene();
  if (input.wasPressed('KeyP')) {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }

  if (S.mode !== 'paused') {
    S.tick(dt);
    S.challengesDirector.tick();
    if (S.cutscene) {
      cutsceneT += dt;
      const lineIdx = Math.min(2, Math.floor(cutsceneT / 4.5));
      if (lineIdx !== cutsceneLine) {
        cutsceneLine = lineIdx;
        dom['cutscene-text'].textContent = CUTSCENE_LINES[lineIdx];
      }
      if (cutsceneT >= 14) endCutscene();
    }
    // Mission 1 auto-starts at the garage door.
    if (S.mode === 'playing' && !S.missions.current && S.missionIndex === 0) {
      if (dist2d(S.player.pos.x, S.player.pos.z, CONFIG.garageDoor.x, CONFIG.garageDoor.z) <= CONFIG.garageDoor.radius) {
        S.missions.start(0);
      }
    }
    // F opens the shop near the MART — only while the shop fallback is live.
    if (shopFallbackActive && S.mode === 'playing' && input.wasPressed('KeyF')) {
      if (dist2d(S.player.pos.x, S.player.pos.z, CONFIG.shop.x, CONFIG.shop.z) <= CONFIG.shop.radius) {
        openShopFallback();
      }
    }
    for (const update of ctx.updates) {
      try { update(dt); } catch (e) { /* one bad update never kills the frame */ }
    }
    // Pay out any challenge earned by this frame's updates on the same
    // frame, so a payout never lands a frame late relative to the stat
    // change that earned it.
    S.challengesDirector.tick();
    updateDayNight(dt);
    updateCamera(dt);
    if (S.mode === 'playing') {
      saveTimer += dt;
      if (saveTimer >= 20) { saveTimer = 0; saveGame(); }
    }
  }

  updateHUD();
  updateRoster(dt);
  updateMinimap(dt);
  renderer.render(scene, camera);
  input.endFrame();
}

// ---- boot
loadGame();
window.__solmar = { S, player: S.player, camera };
requestAnimationFrame(frame);
loadModules();
