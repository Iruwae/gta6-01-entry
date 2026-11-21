// SOLMAR BAY — boot hub. The ONLY file that imports the other modules.
// Wires the renderer, state, HUD, menus, cutscene, save/load and the frame
// loop, then loads every feature module in order.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState } from './state.js';
import { createInput } from './input.js';

const $ = (id) => document.getElementById(id);
const IDS = ['game-container', 'sunset-band', 'vignette', 'flash', 'hud', 'cash', 'district', 'day-time', 'objective', 'respect-line', 'respect-num', 'respect-rank', 'wanted', 'radio', 'radio-station', 'radio-track', 'minimap', 'roster', 'roster-code', 'roster-rows', 'health-bar', 'health-fill', 'weapons', 'speedo', 'speed-num', 'speed-gear', 'speed-car', 'toast', 'dialogue', 'dlg-portrait', 'dlg-name', 'dlg-text', 'cutscene', 'cutscene-text', 'menu', 'pause-menu', 'mission-select', 'mission-list', 'btn-close-jobs', 'shop-panel', 'shop-items', 'btn-close-shop', 'garage-panel', 'garage-list', 'btn-close-garage', 'btn-new', 'btn-resume', 'btn-missions'];
const dom = {};
for (const id of IDS) dom[id] = $(id);

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

// ---------- Toast ----------
let toastToken = 0;
function showToast(msg) {
  const el = dom.toast;
  if (!el) return;
  const my = ++toastToken;
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => { if (my === toastToken) el.classList.add('hidden'); }, 4500);
}

// ---------- Dialogue ----------
let dlgQueue = [];
function portraitFor(name) {
  return (name || '?').split(' ').map((p) => p[0] || '').join('').slice(0, 2).toUpperCase();
}
function colorFor(name) {
  if (name === 'LENA CRUZ') return '#ff7a9e';
  if (name === 'VIC TORRES') return '#ffb347';
  return '#5fb4c9';
}
function renderDialogue(line) {
  if (!line) { hide(dom.dialogue); return; }
  show(dom.dialogue);
  if (dom['dlg-portrait']) {
    dom['dlg-portrait'].textContent = portraitFor(line.name);
    dom['dlg-portrait'].style.background = colorFor(line.name);
  }
  if (dom['dlg-name']) dom['dlg-name'].textContent = line.name;
  if (dom['dlg-text']) dom['dlg-text'].textContent = line.text;
}
function showDialogue(lines) {
  dlgQueue = (lines || []).slice();
  renderDialogue(dlgQueue[0] || null);
}
function advanceDialogue() {
  if (dlgQueue.length === 0) { hide(dom.dialogue); return; }
  dlgQueue.shift();
  renderDialogue(dlgQueue[0] || null);
}

// ---------- Renderer / scene ----------
const container = dom['game-container'] || document.body;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1a3a);
scene.fog = new THREE.Fog(0x2a1a3a, 120, 520);
const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 1200);
camera.position.set(-40, 26, 90);

// Look: warm directional sun, ambient + hemisphere, shader sky dome, ground.
const sun = new THREE.DirectionalLight(0xffb347, 2.2);
sun.position.set(70, 38, -60);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x664466, 0.6));
scene.add(new THREE.HemisphereLight(0xff9a5c, 0x2a1a3a, 0.5));
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(700, 32, 15),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uNight: { value: 0 } },
    vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uNight; varying vec3 vPos; void main(){ float h = normalize(vPos).y; vec3 day = mix(vec3(1.0,0.55,0.25), vec3(0.35,0.15,0.45), smoothstep(0.0,0.6,h)); vec3 night = mix(vec3(0.02,0.03,0.12), vec3(0.05,0.07,0.20), smoothstep(0.0,0.6,h)); gl_FragColor = vec4(mix(day, night, uNight), 1.0); }',
  }),
);
skyDome.frustumCulled = false;
scene.add(skyDome);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

window.addEventListener('resize', () => {
  const w = container.clientWidth || 1280;
  const h = container.clientHeight || 720;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ---------- State / input / ctx ----------
const S = createState({ toast: showToast });
S.sunLight = sun;
S.skyDome = skyDome;
const input = createInput();
input.attach();

const api = {
  toast: showToast,
  showDialogue,
  advanceDialogue,
  renderDialogue,
  flash(strength) {
    if (!dom.flash) return;
    dom.flash.style.opacity = String(Math.min(0.6, (strength || 80) / 200));
    setTimeout(() => { dom.flash.style.opacity = '0'; }, 90);
  },
  shake() {},
  audio: {
    blip() {}, click() {}, shot() {}, reload() {}, cash() {},
  },
  openShop() {},
  paintRoster,
  paintMinimap,
};
const ctx = { THREE, scene, camera, renderer, config: CONFIG, state: S, dom, updates: [], api, input };

// ---------- Mission briefing fallback (m1 / m5) ----------
const rawStart = S.missions.start.bind(S.missions);
S.missions.start = function wrappedStart(idOrIndex) {
  const job = rawStart(idOrIndex);
  if (!job) return job;
  if (job.id === 'm1') {
    showDialogue([
      { name: 'LENA CRUZ', text: "Vic's got work, and you're the one doing it. Meet me at the garage — we move at sunset." },
      { name: 'MARCO SOLIS', text: 'Keep it quiet on the Strip. The package changes hands at dusk, no witnesses.' },
    ]);
    showToast('New job: FIRST JOB — meet Lena at the garage.');
  } else if (job.id === 'm5') {
    showDialogue([
      { name: 'LENA CRUZ', text: "I'm riding with you on this one. Don't get us killed, alright?" },
      { name: 'VIC TORRES', text: 'Hit the convoy together. Everybody walks away rich — or nobody walks away.' },
    ]);
    showToast('New job: CREW UP — Lena rides with you.');
  }
  return job;
};

// ---------- Save / load / reset ----------
const SAVE_KEY = 'solmar-save';
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: S.cash, day: S.day, time: S.time, missionIndex: S.missionIndex,
      respect: S.respect, stats: { ...S.stats }, health: S.player.health,
      radioStation: S.radioStation, px: S.player.pos.x, pz: S.player.pos.z,
      garageCars: S.garageCars,
    }));
  } catch (e) { /* storage unavailable: play on without saving */ }
}
function loadGame() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') return;
  try {
    if (typeof data.cash === 'number') S.cash = data.cash;
    if (typeof data.day === 'number') S.day = data.day;
    if (typeof data.time === 'number') S.time = data.time;
    if (typeof data.missionIndex === 'number') S.missionIndex = Math.max(0, Math.min(10, data.missionIndex));
    if (typeof data.respect === 'number') S.respect = Math.max(0, data.respect);
    if (data.stats && typeof data.stats === 'object') {
      for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
        if (typeof data.stats[k] === 'number') S.stats[k] = data.stats[k];
      }
    }
    if (typeof data.health === 'number') S.player.health = Math.max(0, Math.min(100, data.health));
    if (typeof data.radioStation === 'number') S.radioStation = data.radioStation % CONFIG.radio.length;
    if (typeof data.px === 'number' && typeof data.pz === 'number') S.player.pos.set(data.px, 0, data.pz);
    if (Array.isArray(data.garageCars)) S.garageCars = data.garageCars;
    S.respectDirector.add(0, 'load');
  } catch (e) { /* corrupt save = fresh start */ }
}
function resetState() {
  for (const c of S.cars.filter((c) => c.aiPolice)) {
    if (c.mesh) scene.remove(c.mesh);
  }
  if (S.heli && S.heli.mesh) scene.remove(S.heli.mesh);
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
  S.cops = [];
  S.garageCars = [];
  S.heli = null;
  S.lastKnown = null;
  S.missions.current = null;
  S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  S.sideActivities.taxi = { active: false, dest: null, fare: 0 };
  S.sideActivities.race = { active: false, gates: [], next: 0 };
  S.challengesDirector._paid = [];
  S.challengesDirector.today = CONFIG.challenges.map((c) => ({ ...c }));
  S.crew.active = false;
  if (S.crew.mesh) S.crew.mesh.visible = false;
  S.player.pos.set(CONFIG.playerStart.x, 0, CONFIG.playerStart.z);
  S.player.heading = 0;
  S.player.health = CONFIG.maxHealth;
  S.player.reloading = false;
  S.player.reloadT = 0;
  S.player.fireT = 0;
  for (const slot of S.player.loadout.slots) slot.mag = slot.def.mag;
  S.player.loadout._equipped = 0;
  S.dayNight = { phase: 'SUNSET', night: 0 };
  S.district = 'downtown';
  S.objective = CONFIG.defaultObjective;
  for (const p of S.packages) { p.taken = false; if (p.mesh) p.mesh.visible = true; }
  dlgQueue = [];
  hide(dom.dialogue);
}

// ---------- Cutscene / menu / pause ----------
const CUTSCENE_LINES = [
  'The sun is going down over Solmar Bay — and the city is just waking up.',
  'Vic Torres has work. Lena Cruz has the wheel. All you need is nerve.',
  'One sunset. Ten jobs. The whole bay is watching.',
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
  if (dom['cutscene-text']) dom['cutscene-text'].textContent = CUTSCENE_LINES[0];
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

// X skips the cutscene — BOTH a keydown listener (immediate) and the
// frame loop (held key) can end it, because at headless speed a frame
// can span a whole key press.
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyX' && !e.repeat && S.cutscene) endCutscene();
});

// ---------- Job board ----------
function buildJobBoard() {
  const list = dom['mission-list'];
  if (!list) return;
  list.innerHTML = '';
  CONFIG.missions.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'job-row';
    const done = i < S.missionIndex;
    const isCurrent = S.missions.current && S.missions.current.index === i;
    const right = done ? '✓' : isCurrent ? 'ACTIVE' : `$${m.pay}`;
    row.innerHTML = `<span class="job-title">${m.title}</span>` +
      `<span class="job-giver">${m.giver}</span>` +
      `<span class="job-pay">${right}</span>` +
      `<span class="job-desc">${m.desc}</span>`;
    if (!done && !isCurrent && i >= S.missionIndex) {
      row.addEventListener('click', () => {
        S.missions.start(i);
        hide(dom['mission-select']);
        resumeGame();
      });
    }
    list.appendChild(row);
  });
}

// ---------- Buttons ----------
if (dom['btn-new']) dom['btn-new'].addEventListener('click', startNewGame);
if (dom['btn-resume']) dom['btn-resume'].addEventListener('click', resumeGame);
if (dom['btn-missions']) dom['btn-missions'].addEventListener('click', () => { buildJobBoard(); show(dom['mission-select']); });
if (dom['btn-close-jobs']) dom['btn-close-jobs'].addEventListener('click', () => hide(dom['mission-select']));
if (dom['btn-close-shop']) dom['btn-close-shop'].addEventListener('click', () => hide(dom['shop-panel']));
if (dom['btn-close-garage']) dom['btn-close-garage'].addEventListener('click', () => hide(dom['garage-panel']));
if (dom.dialogue) dom.dialogue.addEventListener('click', advanceDialogue);
if (dom.cutscene) dom.cutscene.addEventListener('click', endCutscene);

// ---------- Shop fallback (only if no shop module loaded) ----------
let shopFallback = false;
function installShopFallback() {
  if (ctx.shopLoaded || shopFallback) return;
  shopFallback = true;
  ctx.shopFallback = true;
}
function openShopFallback() {
  const list = dom['shop-items'];
  if (!list) return;
  list.innerHTML = '';
  for (const item of CONFIG.shop) {
    const row = document.createElement('div');
    row.className = 'shop-row fallback-row';
    row.innerHTML = `<span class="shop-name">${item.name}</span>` +
      `<span class="shop-desc">${item.desc}</span>` +
      `<span class="shop-price">$${item.price}</span>` +
      `<button class="shop-buy" type="button">BUY</button>`;
    row.querySelector('.shop-buy').addEventListener('click', () => {
      if (!row.classList.contains('fallback-row')) return; // never touch real shop rows
      if (S.cash < item.price) { showToast('Not enough cash.'); return; }
      S.cash -= item.price;
      if (item.ammo) {
        S.player.loadout.current().mag = S.player.loadout.current().def.mag;
        showToast(`${item.name} bought — magazine refilled.`);
      } else {
        S.player.health = Math.min(100, S.player.health + item.heal);
        showToast(`${item.name} bought — +${item.heal} HP.`);
      }
    });
    list.appendChild(row);
  }
  show(dom['shop-panel']);
}

// ---------- Feature modules ----------
const MODULE_ORDER = ['daynight', 'districts', 'player', 'vehicles', 'city', 'sky', 'ambient', 'people', 'police', 'heli2', 'heat', 'missions', 'side', 'shop', 'garage', 'fence', 'hud', 'dialogue', 'audio', 'banter', 'crew', 'challenges', 'respect', 'radio2', 'safehouse', 'weapons', 'cutscene', 'juice', 'postfx'];
async function loadModules() {
  for (const name of MODULE_ORDER) {
    try {
      const url = new URL(`./${name}.js`, import.meta.url);
      const res = await fetch(url);
      if (!res.ok) continue; // missing file is a quiet skip
      const mod = await import(url);
      if (mod && typeof mod.init === 'function') mod.init(ctx);
    } catch (e) {
      // One failing module never kills the boot.
      console.warn(`module ${name} failed:`, e);
    }
  }
  // De-duplicate parked cars: same kind at the same rounded position —
  // keep the first, remove later copies (mesh and all). Police never touched.
  const seen = new Set();
  for (const car of [...S.cars]) {
    if (car.aiPolice) continue;
    const key = `${car.kind}@${Math.round(car.pos.x)},${Math.round(car.pos.z)}`;
    if (seen.has(key)) {
      if (car.mesh) scene.remove(car.mesh);
      const i = S.cars.indexOf(car);
      if (i >= 0) S.cars.splice(i, 1);
      if (S.car === car) S.car = null;
    } else {
      seen.add(key);
    }
  }
  installShopFallback();
  ctx.modulesLoaded = true;
}

// ---------- Day / night ----------
function updateDayNight(dt) {
  const t = S.time;
  let target;
  if (t >= CONFIG.nightAt) { S.dayNight.phase = 'NIGHT'; target = 1; }
  else if (t >= CONFIG.duskAt) {
    S.dayNight.phase = 'DUSK';
    target = (t - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt);
  } else { S.dayNight.phase = 'SUNSET'; target = 0; }
  const n = S.dayNight.night;
  const step = 0.6 * dt;
  S.dayNight.night = n < target ? Math.min(target, n + step) : n > target ? Math.max(target, n - step) : n;
  const night = S.dayNight.night;
  sun.intensity = 2.2 - night * 1.85;
  sun.color.setHex(night > 0.6 ? 0x8ab4ff : 0xffb347);
  if (S.skyDome) S.skyDome.material.uniforms.uNight.value = night;
}

// ---------- Camera ----------
let menuAngle = 0;
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  if (S.mode === 'menu') {
    menuAngle += dt * 0.06;
    camera.position.set(Math.cos(menuAngle) * 120, 42, Math.sin(menuAngle) * 120);
    camera.lookAt(0, 8, 0);
    return;
  }
  if (S.mode === 'cutscene') {
    const t = Math.min(1, cutsceneT / 14);
    camera.position.set(-140 + (60 + 140) * t, 55 + (25 - 55) * t, -120 + (30 + 120) * t);
    camera.lookAt(0, 10, 0);
    return;
  }
  const focus = S.car ? S.car.pos : S.player.pos;
  const dist = S.car ? 13 : 9.5;
  const height = S.car ? 5.2 : 4.4;
  const h = S.player.heading;
  camTarget.set(
    focus.x - Math.sin(h) * dist,
    height,
    focus.z - Math.cos(h) * dist,
  );
  const k = 1 - Math.exp(-dt * 5);
  camera.position.lerp(camTarget, k);
  camera.lookAt(focus.x, focus.y + 2, focus.z);
}

// ---------- HUD ----------
const slotEls = [...document.querySelectorAll('#weapons .slot')];
function updateHUD() {
  if (dom.cash) dom.cash.textContent = `$${Math.floor(S.cash).toLocaleString('en-US')}`;
  const d = CONFIG.districts.find((x) => x.id === S.district) || CONFIG.districts[0];
  if (dom.district) dom.district.textContent = d.name;
  const total = CONFIG.clockOpenMinutes + S.time;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(total % 60)).padStart(2, '0');
  if (dom['day-time']) dom['day-time'].textContent = `DAY ${S.day} ${hh}:${mm} ${S.dayNight.phase}`;
  if (dom['respect-num']) dom['respect-num'].textContent = String(S.respect);
  if (dom['respect-rank']) dom['respect-rank'].textContent = S.respectDirector.rank.title;
  if (dom['health-fill']) dom['health-fill'].style.width = `${Math.max(0, Math.min(100, S.player.health))}%`;
  const st = CONFIG.radio[S.radioStation] || CONFIG.radio[0];
  if (dom['radio-station']) dom['radio-station'].textContent = st.name;
  if (dom['radio-track']) {
    const track = st.tracks[Math.floor(S.time / 45) % st.tracks.length];
    dom['radio-track'].textContent = `${track.title} — ${track.artist}`;
  }
  if (dom.wanted) {
    dom.wanted.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
    if (S.wanted === 0) dom.wanted.classList.add('hidden');
    else dom.wanted.classList.remove('hidden');
  }
  slotEls.forEach((el, i) => {
    const slot = S.player.loadout.slots[i];
    if (!slot) return;
    const name = el.querySelector('.slot-name');
    const ammo = el.querySelector('.slot-ammo');
    if (name) name.textContent = slot.def.name;
    if (ammo) ammo.textContent = String(slot.mag);
    el.classList.toggle('on', S.player.loadout.equipped === i);
  });
  const speedMs = S.car ? Math.abs(S.car.speed) : Math.hypot(S.player.vel.x, S.player.vel.z);
  const mph = Math.round(speedMs * 2.237);
  if (dom['speed-num']) dom['speed-num'].textContent = String(mph);
  if (dom['speed-gear']) {
    dom['speed-gear'].textContent = speedMs < 0.5 ? 'N' : String(Math.min(5, 1 + Math.floor(speedMs / 7)));
  }
  if (dom['speed-car']) dom['speed-car'].textContent = S.car ? S.car.kind.toUpperCase() : 'ON FOOT';
  if (dom.objective) {
    dom.objective.textContent = S.missions.current ? S.missions.current.desc : CONFIG.defaultObjective;
  }
}

// ---------- Roster / minimap ----------
function paintRoster() {
  const roster = dom.roster;
  if (!roster) return;
  const cops = (S.cops && S.cops.length > 0) ? S.cops : S.cars.filter((c) => c.aiPolice);
  if (cops.length === 0) { roster.classList.add('hidden'); return; }
  roster.classList.remove('hidden');
  if (dom['roster-code']) dom['roster-code'].textContent = `DISPATCH 10-80 — ${S.wanted} STAR(S)`;
  const rows = dom['roster-rows'];
  if (rows) {
    rows.innerHTML = '';
    for (const cop of cops) {
      const dist = Math.round(Math.hypot(cop.pos.x - S.player.pos.x, cop.pos.z - S.player.pos.z));
      const row = document.createElement('div');
      row.className = 'roster-row';
      const b = document.createElement('b');
      b.textContent = cop.callsign || 'PD-??';
      row.appendChild(b);
      const span = document.createElement('span');
      span.textContent = ` ${(cop.brain && cop.brain.tactic) || 'PURSUIT'} · ${dist}m`;
      row.appendChild(span);
      rows.appendChild(row);
    }
  }
}
function paintMinimap() {
  const cv = dom.minimap;
  if (!cv) return;
  const g = cv.getContext('2d');
  if (!g) return;
  const scale = 0.45;
  const mx = (x) => 90 + x * scale;
  const my = (z) => 90 + z * scale;
  g.fillStyle = 'rgba(12,8,24,0.85)';
  g.fillRect(0, 0, 180, 180);
  for (const dd of CONFIG.districts) {
    g.fillStyle = dd.color;
    g.beginPath();
    g.arc(mx(dd.x), my(dd.z), 4, 0, Math.PI * 2);
    g.fill();
  }
  if (S.wanted > 0 && S.lastKnown) {
    g.strokeStyle = '#ff2244';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(mx(S.lastKnown.x), my(S.lastKnown.z), 10, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = '#ffd24d';
  for (const p of S.packages) {
    if (!p.taken) g.fillRect(mx(p.x) - 3, my(p.z) - 3, 6, 6);
  }
  for (const c of S.cars) {
    g.fillStyle = c.aiPolice ? '#4da6ff' : '#dddddd';
    g.fillRect(mx(c.pos.x) - 3, my(c.pos.z) - 3, 6, 6);
  }
  if (S.heli) {
    g.fillStyle = '#ff2244';
    g.beginPath();
    g.arc(mx(S.heli.pos.x), my(S.heli.pos.z), 4, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffb347';
  g.beginPath();
  g.arc(mx(S.player.pos.x), my(S.player.pos.z), 4, 0, Math.PI * 2);
  g.fill();
}

// ---------- Frame loop ----------
let last = performance.now();
let rosterT = 0;
let mapT = 0;
let saveT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;

  // Global keys.
  if (S.cutscene && (input.isDown('KeyX') || input.wasPressed('KeyX'))) endCutscene();
  if (input.wasPressed('KeyP')) {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }
  if (shopFallback && input.wasPressed('KeyF') && S.mode === 'playing') {
    const d = Math.hypot(S.player.pos.x - CONFIG.shopPos.x, S.player.pos.z - CONFIG.shopPos.z);
    if (d <= CONFIG.shopPos.radius) openShopFallback();
  }

  if (S.mode !== 'paused') {
    S.tick(dt);
    S.challengesDirector.tick();
    if (S.cutscene) {
      cutsceneT += dt;
      const li = Math.min(2, Math.floor(cutsceneT / 4.5));
      if (li !== cutsceneLine) {
        cutsceneLine = li;
        if (dom['cutscene-text']) dom['cutscene-text'].textContent = CUTSCENE_LINES[li];
      }
      if (cutsceneT >= 14) endCutscene();
    }
    // Mission 1 auto-start at the garage.
    if (S.mode === 'playing' && !S.missions.current && S.missionIndex === 0) {
      const d = Math.hypot(S.player.pos.x - CONFIG.garageDoor.x, S.player.pos.z - CONFIG.garageDoor.z);
      if (d <= CONFIG.garageDoor.radius) S.missions.start(0);
    }
    for (const fn of ctx.updates) {
      try { fn(dt); } catch (e) { console.warn('update failed:', e); }
    }
    updateDayNight(dt);
    updateCamera(dt);
    if (S.mode === 'playing') {
      saveT += dt;
      if (saveT >= 20) { saveT = 0; saveGame(); }
    }
  }

  updateHUD();
  rosterT += dt;
  if (rosterT >= 0.25) { rosterT = 0; if (typeof ctx.api.paintRoster === 'function') ctx.api.paintRoster(); }
  mapT += dt;
  if (mapT >= 0.14) { mapT = 0; if (typeof ctx.api.paintMinimap === 'function') ctx.api.paintMinimap(); }
  renderer.render(scene, camera);
  input.endFrame();
}

// ---------- Boot ----------
loadGame();
window.__solmar = { S, player: S.player, camera };
requestAnimationFrame(frame);
loadModules();
