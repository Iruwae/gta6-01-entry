// SOLMAR BAY — boot hub. The ONLY file that imports the other modules.
// Owns the renderer, the look (sun, sky dome, ground), the HUD, the
// dialogue queue, the menu/pause/cutscene flow, save/load, the mission
// briefing fallback and the frame loop. Feature modules load in a fixed
// order, probed with fetch first; one failing module never kills the boot.
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState } from './state.js';
import { createInput } from './input.js';
import { clamp } from './random.js';

// ---------- DOM ----------
const dom = {};
for (const id of [
  'game-container', 'sunset-band', 'vignette', 'flash', 'hud', 'cash',
  'district', 'day-time', 'objective', 'respect-line', 'respect-num',
  'respect-rank', 'wanted', 'radio', 'radio-station', 'radio-track',
  'minimap', 'roster', 'roster-code', 'roster-rows', 'health-bar',
  'health-fill', 'weapons', 'speedo', 'speed-num', 'speed-gear',
  'speed-car', 'toast', 'dialogue', 'dlg-portrait', 'dlg-name',
  'dlg-text', 'cutscene', 'cutscene-text', 'menu', 'pause-menu',
  'mission-select', 'mission-list', 'btn-new', 'btn-resume',
  'btn-missions', 'btn-close-jobs', 'shop-panel', 'shop-items',
  'btn-close-shop', 'garage-panel', 'garage-list', 'btn-close-garage',
]) {
  dom[id] = document.getElementById(id);
}
function show(el) {
  if (el) el.classList.remove('hidden');
}
function hide(el) {
  if (el) el.classList.add('hidden');
}

// ---------- Toast ----------
let toastTimer = 0;
function showToast(msg) {
  const el = dom.toast;
  if (!el) return;
  el.textContent = msg;
  show(el);
  const stamp = ++toastTimer;
  setTimeout(() => {
    if (stamp === toastTimer) hide(el);
  }, 4500);
}

// ---------- Dialogue ----------
let dialogueQueue = [];
function portraitFor(name) {
  if (name === 'LENA CRUZ') return { initials: 'LC', color: '#ff7a9e' };
  if (name === 'VIC TORRES') return { initials: 'VT', color: '#ffb347' };
  const parts = String(name || '?').split(' ');
  return { initials: parts.map((p) => p[0] || '').join('').slice(0, 2) || '?', color: '#5fb4c9' };
}
function renderDialogueLine(line) {
  if (dom['dlg-name']) dom['dlg-name'].textContent = line.name;
  if (dom['dlg-text']) dom['dlg-text'].textContent = line.text;
  const p = portraitFor(line.name);
  if (dom['dlg-portrait']) {
    dom['dlg-portrait'].textContent = p.initials;
    dom['dlg-portrait'].style.background = p.color;
  }
}
function showDialogue(lines) {
  dialogueQueue = (lines || []).map((l) => ({ name: l.name, text: l.text }));
  if (dialogueQueue.length === 0) return;
  renderDialogueLine(dialogueQueue[0]);
  show(dom.dialogue);
}
function advanceDialogue() {
  dialogueQueue.shift();
  if (dialogueQueue.length === 0) {
    hide(dom.dialogue);
    return;
  }
  renderDialogueLine(dialogueQueue[0]);
}
function flash(strength) {
  const el = dom.flash;
  if (!el) return;
  el.style.opacity = String(strength || 0.25);
  setTimeout(() => {
    el.style.opacity = '0';
  }, 120);
}

// ---------- Renderer / scene / look ----------
const container = dom['game-container'] || document.body;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a1a3a);
scene.fog = new THREE.Fog(0x2a1a3a, 120, 520);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(-40, 26, 90);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
});

// ---------- State / input / context ----------
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
  flags: {},
  cutsceneLines: null,
};
ctx.api.toast = showToast;
ctx.api.showDialogue = showDialogue;
ctx.api.advanceDialogue = advanceDialogue;
ctx.api.flash = flash;

// Warm directional sun + ambient + hemisphere.
const sun = new THREE.DirectionalLight(0xffb347, 2.2);
sun.position.set(70, 38, -60);
scene.add(sun);
S.sunLight = sun;
scene.add(new THREE.AmbientLight(0x8a6a9a, 0.7));
scene.add(new THREE.HemisphereLight(0xffc98a, 0x2a1a3a, 0.55));

// Shader sky dome: orange horizon through purple dusk by day, deep night blue.
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: { uNight: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform float uNight;',
    'varying vec3 vP;',
    'void main(){',
    '  float h = normalize(vP).y;',
    '  float t = clamp(h * 1.6 + 0.25, 0.0, 1.0);',
    '  vec3 day = mix(vec3(1.0, 0.55, 0.25), vec3(0.45, 0.20, 0.45), t);',
    '  vec3 night = mix(vec3(0.02, 0.03, 0.10), vec3(0.05, 0.07, 0.18), t);',
    '  gl_FragColor = vec4(mix(day, night, uNight), 1.0);',
    '}',
  ].join('\n'),
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 16), skyMat);
scene.add(skyDome);
S.skyDome = skyDome;

// Dark ground plane.
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshLambertMaterial({ color: 0x1a1226 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// ---------- Mission briefing fallback (m1 / m5) ----------
const origStart = S.missions.start.bind(S.missions);
S.missions.start = (idOrIndex) => {
  const job = origStart(idOrIndex);
  if (!job) return job;
  if (job.id === 'm1') {
    showDialogue([
      { name: 'LENA CRUZ', text: 'You made it. Vic has work, and it pays — if you can drive.' },
      { name: 'MARCO SOLIS', text: 'Keep it clean, kid. The bay watches everything after dark.' },
    ]);
    showToast('New job: FIRST JOB');
  } else if (job.id === 'm5') {
    showDialogue([
      { name: 'LENA CRUZ', text: 'I am riding with you on this one. Do not get us killed.' },
      { name: 'VIC TORRES', text: 'The convoy rolls at dusk. Hit it together, split it even.' },
    ]);
    showToast('New job: CREW UP — Lena rides with you');
  }
  return job;
};

// ---------- Save / load ----------
const SAVE_KEY = 'solmar-save';
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
      garageCars: S.garageCars.map((c) => ({ ...c, tune: { ...c.tune } })),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // Storage may be unavailable; the game plays on regardless.
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
  if (typeof data.cash === 'number') S.cash = data.cash;
  if (typeof data.day === 'number' && data.day >= 1) S.day = data.day;
  if (typeof data.time === 'number' && data.time >= 0 && data.time < 1440) S.time = data.time;
  if (typeof data.missionIndex === 'number') S.missionIndex = clamp(data.missionIndex, 0, 10);
  if (typeof data.respect === 'number') {
    S.respect = Math.max(0, data.respect);
    if (S.respectDirector) S.respectDirector.rank = rankForRespect(S.respect);
  }
  if (data.stats && typeof data.stats === 'object') {
    for (const k of ['packages', 'racesWon', 'fencesSold', 'faresDone']) {
      if (typeof data.stats[k] === 'number') S.stats[k] = data.stats[k];
    }
  }
  if (typeof data.health === 'number') S.player.health = clamp(data.health, 0, 100);
  if (typeof data.radioStation === 'number') S.radioStation = clamp(data.radioStation, 0, 5);
  if (typeof data.px === 'number' && typeof data.pz === 'number') {
    S.player.pos.set(data.px, 0, data.pz);
  }
  if (Array.isArray(data.garageCars)) S.garageCars = data.garageCars;
}
function rankForRespect(points) {
  let rank = CONFIG.respectLadder[0];
  for (const entry of CONFIG.respectLadder) {
    if (points >= entry.min) rank = entry;
  }
  return rank;
}
function resetState() {
  S.cash = CONFIG.startCash;
  S.day = CONFIG.startDay;
  S.time = 0;
  S.missionIndex = 0;
  S.respect = 0;
  if (S.respectDirector) S.respectDirector.rank = rankForRespect(0);
  S.heat = 0;
  S.wanted = 0;
  S.radioStation = 0;
  S.car = null;
  S.heli = null;
  S.lastKnown = null;
  // Remove police cars only; parked cars stay where they are.
  for (const cop of S.cars.filter((c) => c.aiPolice)) {
    if (cop.mesh) scene.remove(cop.mesh);
  }
  S.cars = S.cars.filter((c) => !c.aiPolice);
  S.cops = [];
  S.garageCars = [];
  S.missions.current = null;
  S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  S.sideActivities.taxi = { active: false, dest: null, fare: 0 };
  S.sideActivities.race = { active: false, gates: [], next: 0 };
  S.packages = CONFIG.packages.map((p) => ({ x: p.x, z: p.z, taken: false }));
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
  S.player.loadout._equipped = 0;
  S.dayNight = { phase: 'SUNSET', night: 0 };
  S.district = 'downtown';
  S.objective = 'Explore Solmar Bay — find work.';
  dialogueQueue = [];
  hide(dom.dialogue);
}

// ---------- Menu / pause / cutscene ----------
const CUTSCENE_LINES = [
  'The sun is going down over Solmar Bay — and the whole city is about to light up.',
  'One hustler. One borrowed car. One shot at the crew that runs this town.',
  'Vic has work. Lena has the wheel. All you need is nerve.',
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
  const list = dom['mission-list'];
  if (!list) return;
  list.innerHTML = '';
  CONFIG.missions.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'job-row';
    const done = i < S.missionIndex;
    const current = S.missions.current && S.missions.current.index === i;
    const tag = done ? '✓' : current || i === S.missionIndex ? 'ACTIVE' : `$${m.pay}`;
    row.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = `${m.title} — ${m.giver}`;
    const meta = document.createElement('span');
    meta.textContent = `${m.desc}  ${tag}`;
    row.append(title, document.createElement('br'), meta);
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

// ---------- Shop fallback (only if no shop module loaded) ----------
function installShopFallback() {
  const list = dom['shop-items'];
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
    price.textContent = `$${item.price}`;
    const buy = document.createElement('button');
    buy.className = 'shop-buy';
    buy.textContent = 'BUY';
    buy.addEventListener('click', () => {
      // The fallback handler only ever serves its own fallback rows.
      if (row.dataset.fallback !== '1') return;
      if (S.cash < item.price) {
        showToast('Not enough cash for that.');
        return;
      }
      S.cash -= item.price;
      if (item.ammo) {
        const cur = S.player.loadout.current();
        cur.mag = cur.def.mag;
        showToast(`${item.name} bought — magazine refilled.`);
      } else {
        S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
        showToast(`${item.name} bought — +${item.heal} health.`);
      }
    });
    row.append(name, desc, price, buy);
    list.appendChild(row);
  }
  ctx.flags.shopFallback = true;
}

// ---------- Buttons ----------
if (dom['btn-new']) dom['btn-new'].addEventListener('click', startNewGame);
if (dom['btn-resume']) dom['btn-resume'].addEventListener('click', resumeGame);
if (dom['btn-missions']) {
  dom['btn-missions'].addEventListener('click', () => {
    buildJobBoard();
    show(dom['mission-select']);
  });
}
if (dom['btn-close-jobs']) dom['btn-close-jobs'].addEventListener('click', () => hide(dom['mission-select']));
if (dom['btn-close-shop']) dom['btn-close-shop'].addEventListener('click', () => hide(dom['shop-panel']));
if (dom['btn-close-garage']) dom['btn-close-garage'].addEventListener('click', () => hide(dom['garage-panel']));
if (dom.dialogue) dom.dialogue.addEventListener('click', advanceDialogue);
if (dom.cutscene) dom.cutscene.addEventListener('click', endCutscene);

// ---------- Module loading ----------
const MODULES = [
  'daynight', 'districts', 'player', 'vehicles', 'city', 'sky', 'ambient',
  'people', 'police', 'heli2', 'heat', 'missions', 'side', 'shop', 'garage',
  'fence', 'hud', 'dialogue', 'audio', 'banter', 'crew', 'challenges',
  'respect', 'radio2', 'safehouse', 'weapons', 'cutscene', 'juice', 'postfx',
];
function dedupeParkedCars() {
  const seen = new Set();
  const keep = [];
  for (const car of S.cars) {
    if (car.aiPolice) {
      keep.push(car);
      continue;
    }
    const key = `${car.kind}@${Math.round(car.pos.x)},${Math.round(car.pos.z)}`;
    if (seen.has(key)) {
      if (car.mesh) scene.remove(car.mesh);
      continue;
    }
    seen.add(key);
    keep.push(car);
  }
  S.cars = keep;
}
// Day/night fallback, used only if the daynight module never loaded.
// Mirrors the module: dusk at +62 min, night at +150, night eases at 0.6/s.
function dayNightFallback(dt) {
  const t = S.time;
  let target = 0;
  let phase = 'SUNSET';
  if (t >= CONFIG.nightAt) {
    target = 1;
    phase = 'NIGHT';
  } else if (t >= CONFIG.duskAt) {
    target = (t - CONFIG.duskAt) / (CONFIG.nightAt - CONFIG.duskAt);
    phase = 'DUSK';
  }
  S.dayNight.phase = phase;
  S.dayNight.night += (target - S.dayNight.night) * Math.min(1, 0.6 * dt);
  if (S.sunLight) {
    S.sunLight.intensity = 2.2 - S.dayNight.night * 1.85;
    S.sunLight.color.set(S.dayNight.night > 0.6 ? 0x8fb4ff : 0xffb347);
  }
  if (S.skyDome) S.skyDome.material.uniforms.uNight.value = S.dayNight.night;
}
async function loadModules() {
  for (const name of MODULES) {
    try {
      const res = await fetch(`src/${name}.js`);
      if (!res.ok) continue;
      const mod = await import(`./${name}.js`);
      if (mod && typeof mod.init === 'function') {
        try {
          mod.init(ctx);
          ctx.flags[name] = true;
        } catch (e) {
          // One failing module never kills the boot.
        }
      }
    } catch (e) {
      // Missing file is a quiet skip, never a console error.
    }
  }
  dedupeParkedCars();
  if (!ctx.flags.shop) installShopFallback();
  if (!ctx.flags.daynight) ctx.updates.push(dayNightFallback);
}

// ---------- HUD ----------
function districtName(id) {
  const d = CONFIG.districts.find((x) => x.id === id);
  return d ? d.name : 'DOWNTOWN';
}
function updateHUD() {
  if (dom.cash) dom.cash.textContent = `$${S.cash.toLocaleString('en-US')}`;
  if (dom.district) dom.district.textContent = districtName(S.district);
  if (dom['day-time']) {
    const total = CONFIG.clockStartMinutes + S.time;
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(Math.floor(total % 60)).padStart(2, '0');
    dom['day-time'].textContent = `DAY ${S.day} ${hh}:${mm} ${S.dayNight.phase}`;
  }
  if (dom.objective) {
    dom.objective.textContent = S.missions.current ? S.missions.current.desc : S.objective;
  }
  if (dom['respect-num']) dom['respect-num'].textContent = String(S.respect);
  if (dom['respect-rank']) {
    dom['respect-rank'].textContent = S.respectDirector ? S.respectDirector.rank.title : 'NOBODY';
  }
  if (dom['health-fill']) dom['health-fill'].style.width = `${clamp(S.player.health, 0, 100)}%`;
  const station = CONFIG.radio[S.radioStation] || CONFIG.radio[0];
  if (dom['radio-station']) dom['radio-station'].textContent = station.name;
  if (dom['radio-track']) {
    const track = station.tracks[Math.floor(S.time / 45) % station.tracks.length];
    dom['radio-track'].textContent = `${track.title} — ${track.artist}`;
  }
  if (dom.wanted) {
    if (S.wanted > 0) {
      show(dom.wanted);
      dom.wanted.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
    } else {
      hide(dom.wanted);
    }
  }
  const slots = dom.weapons ? dom.weapons.querySelectorAll('.slot') : [];
  S.player.loadout.slots.forEach((slot, i) => {
    const el = slots[i];
    if (!el) return;
    const nameEl = el.querySelector('.slot-name');
    const ammoEl = el.querySelector('.slot-ammo');
    if (nameEl) nameEl.textContent = slot.def.name;
    if (ammoEl) ammoEl.textContent = String(slot.mag);
    el.classList.toggle('on', i === S.player.loadout.equipped);
  });
  const speed = S.car ? Math.abs(S.car.speed) * 2.2 : 0;
  if (dom['speed-num']) dom['speed-num'].textContent = String(Math.round(speed));
  if (dom['speed-gear']) {
    dom['speed-gear'].textContent =
      speed < 1 ? 'N' : speed < 12 ? '1' : speed < 24 ? '2' : speed < 36 ? '3' : speed < 48 ? '4' : '5';
  }
  if (dom['speed-car']) dom['speed-car'].textContent = S.car ? S.car.kind.toUpperCase() : 'ON FOOT';
}

// ---------- Roster / minimap ----------
let rosterT = 1;
let minimapT = 1;
function updateRoster(dt) {
  rosterT += dt;
  if (rosterT < 0.25) return;
  rosterT = 0;
  if (ctx.api.paintRoster) ctx.api.paintRoster();
}
function updateMinimap(dt) {
  minimapT += dt;
  if (minimapT < 0.14) return;
  minimapT = 0;
  if (ctx.api.paintMinimap) ctx.api.paintMinimap();
}

// ---------- Camera ----------
let menuOrbit = 0;
function updateCamera(dt) {
  if (S.mode === 'menu') {
    menuOrbit += dt * 0.05;
    camera.position.set(Math.sin(menuOrbit) * 120, 60, Math.cos(menuOrbit) * 120);
    camera.lookAt(0, 0, 0);
    return;
  }
  if (S.cutscene) {
    const k = clamp(cutsceneT / 14, 0, 1);
    camera.position.set(-140 + (60 + 140) * k, 55 - 30 * k, -120 + (30 + 120) * k);
    camera.lookAt(0, 4, 0);
    return;
  }
  const focus = S.car ? S.car.pos : S.player.pos;
  const heading = S.car ? S.car.heading : S.player.heading;
  const dist = S.car ? 13 : 9.5;
  const height = S.car ? 5.2 : 4.4;
  const bx = focus.x - Math.sin(heading) * dist;
  const bz = focus.z - Math.cos(heading) * dist;
  const k = Math.min(1, dt * 4);
  camera.position.x += (bx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (bz - camera.position.z) * k;
  camera.lookAt(focus.x, focus.y + 2, focus.z);
}

// ---------- Frame loop ----------
let last = performance.now();
let saveT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000 || 0.016, 0, 0.05);
  last = now;

  // X skips the cutscene — both the keydown listener and the held key here.
  if (S.cutscene && (input.isDown('KeyX') || input.wasPressed('KeyX'))) endCutscene();
  if (input.justPressed('KeyP')) {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }

  if (S.mode !== 'paused') {
    S.tick(dt);
    if (S.challengesDirector) S.challengesDirector.tick();
    if (S.cutscene) {
      cutsceneT += dt;
      const lineIdx = Math.min(2, Math.floor(cutsceneT / 4.5));
      if (lineIdx !== cutsceneLine) {
        cutsceneLine = lineIdx;
        const lines = ctx.cutsceneLines || CUTSCENE_LINES;
        if (dom['cutscene-text']) dom['cutscene-text'].textContent = lines[lineIdx];
      }
      if (cutsceneT >= 14) endCutscene();
    }
    // Mission 1 auto-starts at the garage door.
    if (S.mode === 'playing' && !S.missions.current && S.missionIndex === 0) {
      const g = CONFIG.locations.garage;
      if (Math.hypot(S.player.pos.x - g.x, S.player.pos.z - g.z) < g.radius) {
        S.missions.start(0);
      }
    }
    // F opens the shop near the MART when the fallback is active.
    if (ctx.flags.shopFallback && S.mode === 'playing' && input.justPressed('KeyF')) {
      const loc = CONFIG.locations.shop;
      if (Math.hypot(S.player.pos.x - loc.x, S.player.pos.z - loc.z) < loc.radius) {
        show(dom['shop-panel']);
      }
    }
    for (const u of ctx.updates) {
      try {
        u(dt);
      } catch (e) {
        // One failing update never kills the frame.
      }
    }
    updateCamera(dt);
    if (S.mode === 'playing') {
      saveT += dt;
      if (saveT > 20) {
        saveT = 0;
        saveGame();
      }
    }
  }
  updateHUD();
  updateRoster(dt);
  updateMinimap(dt);
  renderer.render(scene, camera);
  input.endFrame();
}

// ---------- Boot ----------
loadGame();
window.__solmar = { S, player: S.player, camera };
requestAnimationFrame(frame);
loadModules();
