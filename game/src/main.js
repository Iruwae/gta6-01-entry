// SOLMAR BAY — boot hub. The ONLY file that imports the other modules.
// Owns: renderer/scene/camera, look (sun + sky dome), save/load, menu /
// pause / cutscene, job board, HUD / roster / minimap, day-night, camera,
// the frame loop, and the shop fallback (only if no shop module loads).
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG } from './config.js';
import { createState, V3 } from './state.js';
import { createInput } from './input.js';
import { clamp } from './random.js';

const $ = (id) => document.getElementById(id);
const dom = {};
['game-container', 'sunset-band', 'vignette', 'flash', 'hud', 'cash', 'district',
 'day-time', 'objective', 'respect-line', 'respect-num', 'respect-rank', 'wanted',
 'radio', 'radio-station', 'radio-track', 'minimap', 'roster', 'roster-code',
 'roster-rows', 'health-bar', 'health-fill', 'weapons', 'speedo', 'speed-num',
 'speed-gear', 'speed-car', 'toast', 'dialogue', 'dlg-portrait', 'dlg-name',
 'dlg-text', 'cutscene', 'cutscene-text', 'menu', 'pause-menu', 'mission-select',
 'mission-list', 'shop-panel', 'shop-items', 'garage-panel', 'garage-list',
 'btn-new', 'btn-resume', 'btn-missions', 'btn-close-jobs', 'btn-close-shop',
 'btn-close-garage'].forEach((id) => { dom[id] = $(id); });

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// ---- toast (a newer toast replaces an older one) ----
let toastTimer = 0;
let toastToken = 0;
function showToast(msg) {
  const token = ++toastToken;
  dom.toast.textContent = msg;
  show(dom.toast);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (token === toastToken) hide(dom.toast);
  }, 4500);
}

// ---- dialogue ----
let dlgQueue = [];
function renderDlgLine(line) {
  dom['dlg-name'].textContent = line.name;
  dom['dlg-text'].textContent = line.text;
  const initials = line.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  dom['dlg-portrait'].textContent = initials;
  dom['dlg-portrait'].style.background = line.name === 'LENA CRUZ' ? '#ff7a9e'
    : line.name === 'VIC TORRES' ? '#ffb347' : '#7ec8ff';
}
function showDialogue(lines) {
  dlgQueue = lines.slice();
  if (!dlgQueue.length) return;
  renderDlgLine(dlgQueue[0]);
  show(dom.dialogue);
}
function advanceDialogue() {
  dlgQueue.shift();
  if (!dlgQueue.length) { hide(dom.dialogue); return; }
  renderDlgLine(dlgQueue[0]);
}

function flash() {
  dom.flash.style.opacity = '0.55';
  window.setTimeout(() => { dom.flash.style.opacity = '0'; }, 90);
}

// ---- renderer / scene / camera ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(dom['game-container'].clientWidth || window.innerWidth,
  dom['game-container'].clientHeight || window.innerHeight);
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

// ---- look: warm sun, ambient, sky dome, ground ----
const sun = new THREE.DirectionalLight(0xffb347, 2.2);
sun.position.set(70, 38, -60);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x604a7a, 0.9));
scene.add(new THREE.HemisphereLight(0xffb347, 0x2a1a3a, 0.7));

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { uNight: { value: 0 } },
  vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'varying vec3 vPos; uniform float uNight;\n'
    + 'void main(){\n'
    + '  float h = normalize(vPos).y;\n'
    + '  vec3 day = mix(vec3(1.0,0.55,0.25), vec3(0.45,0.2,0.45), smoothstep(0.0,0.6,h));\n'
    + '  vec3 night = mix(vec3(0.02,0.03,0.10), vec3(0.05,0.05,0.18), smoothstep(0.0,0.6,h));\n'
    + '  gl_FragColor = vec4(mix(day, night, uNight), 1.0);\n'
    + '}',
  depthWrite: false,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 16), skyMat);
scene.add(skyDome);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900),
  new THREE.MeshStandardMaterial({ color: 0x1a0f2e, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// ---- state / input / shared context ----
const S = createState({ toast: showToast });
S.sunLight = sun;
S.skyDome = skyDome;
const input = createInput();
input.attach();

const ctx = {
  THREE, scene, camera, renderer, config: CONFIG, state: S, dom,
  updates: [],
  api: {
    toast: showToast,
    showDialogue,
    advanceDialogue,
    flash,
    applyShopItem,
  },
  input,
};
window.__solmar = { S, player: S.player, camera };

// ---- shop item application (shared by the shop module + fallback) ----
function applyShopItem(item) {
  if (S.cash < item.price) { showToast('Not enough cash for that.'); return false; }
  S.cash -= item.price;
  if (item.ammo) {
    const cur = S.player.loadout.current();
    cur.mag = cur.def.mag;
    showToast(`Ammo Box bought — ${cur.def.name} magazine refilled.`);
  } else {
    S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
    showToast(`${item.name} bought (+${item.heal} HP).`);
  }
  return true;
}

// ---- save / load / reset ----
const SAVE_KEY = 'solmar-save';
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: S.cash, day: S.day, time: S.time, missionIndex: S.missionIndex,
      respect: S.respect, stats: S.stats, health: S.player.health,
      radioStation: S.radioStation, px: S.player.pos.x, pz: S.player.pos.z,
      garageCars: S.garageCars,
    }));
  } catch (e) { /* storage unavailable: fresh start each load */ }
}
function loadGame() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return; }
  if (!raw) return;
  let d = null;
  try { d = JSON.parse(raw); } catch (e) { return; } // corrupt save = fresh start
  if (!d || typeof d !== 'object') return;
  if (typeof d.cash === 'number') S.cash = d.cash;
  if (typeof d.day === 'number') S.day = d.day;
  if (typeof d.time === 'number') S.time = d.time;
  if (typeof d.missionIndex === 'number') S.missionIndex = d.missionIndex;
  if (typeof d.respect === 'number') {
    S.respect = d.respect;
    S.respectDirector.rank = CONFIG.respectLadder.reduce((acc, r) => (S.respect >= r.min ? r : acc), CONFIG.respectLadder[0]);
  }
  if (d.stats && typeof d.stats === 'object') Object.assign(S.stats, d.stats);
  if (typeof d.health === 'number') S.player.health = clamp(d.health, 0, CONFIG.maxHealth);
  if (typeof d.radioStation === 'number') S.radioStation = d.radioStation;
  if (typeof d.px === 'number' && typeof d.pz === 'number') S.player.pos.set(d.px, 0, d.pz);
  if (Array.isArray(d.garageCars)) S.garageCars = d.garageCars;
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
  S.mode = 'menu';
  S.cutscene = false;
  S.district = 'downtown';
  S.objective = 'Explore Solmar Bay — find work.';
  S.dayNight = { phase: 'SUNSET', night: 0 };
  S.stats = { packages: 0, racesWon: 0, fencesSold: 0, faresDone: 0 };
  S.sideActivities = {
    taxi: { active: false, dest: null, fare: 0 },
    race: { active: false, gates: [], next: 0 },
  };
  S.missions.current = null;
  S.challengesDirector.today = CONFIG.challenges.map((c) => ({ ...c }));
  S.challengesDirector._paid = [];
  S.crew.active = false;
  if (S.crew.mesh) S.crew.mesh.visible = false;
  S.heli = null;
  S.lastKnown = null;
  // Remove police cars from the world; parked cars stay where they are.
  for (let i = S.cars.length - 1; i >= 0; i--) {
    if (S.cars[i].aiPolice) {
      if (S.cars[i].mesh) scene.remove(S.cars[i].mesh);
      S.cars.splice(i, 1);
    }
  }
  S.cops = [];
  S.garageCars = [];
  S.car = null;
  S.player.pos.set(CONFIG.playerStart.x, 0, CONFIG.playerStart.z);
  S.player.vel.set(0, 0, 0);
  S.player.heading = 0;
  S.player.health = CONFIG.maxHealth;
  S.player.speed = 0;
  S.player.reloading = false;
  S.player.reloadT = 0;
  S.player.fireT = 0;
  S.player.loadout._equipped = 0;
  for (const slot of S.player.loadout.slots) slot.mag = slot.def.mag;
  dlgQueue = [];
  hide(dom.dialogue);
}

// ---- mission briefing fallback (m1 Lena-then-Marco, m5 Lena-then-Vic) ----
const origStart = S.missions.start.bind(S.missions);
S.missions.start = (idx) => {
  const job = origStart(idx);
  if (!job) return job;
  if (job.id === 'm1') {
    showDialogue([
      { name: 'LENA CRUZ', text: "Vic's got work, and the garage is where it starts. Stick with me and you'll eat tonight." },
      { name: 'MARCO SOLIS', text: 'Easy money, if you keep your head down. The Strip is waiting, friend.' },
    ]);
    showToast('New job: FIRST JOB');
  } else if (job.id === 'm5') {
    if (S.crew.mesh) S.crew.mesh.visible = true;
    showDialogue([
      { name: 'LENA CRUZ', text: "Convoy job. I'm riding with you this time — don't scratch my car." },
      { name: 'VIC TORRES', text: 'Hit them together, split it clean. Make the bay remember this one.' },
    ]);
    showToast('Crew up: Lena rides with you');
  }
  return job;
};

// ---- cutscene ----
const CUTSCENE_LINES = [
  'The sun hangs low over Solmar Bay, and the whole city is gold for one more hour.',
  'Vic Torres has work. Lena Cruz has the wheel. All you have is $120 and a name nobody knows.',
  'By midnight the bay will know it. If you make it that far.',
];
let cutsceneT = 0;
let cutsceneLine = -1;
function startCutscene() {
  S.mode = 'cutscene';
  S.cutscene = true;
  cutsceneT = 0;
  cutsceneLine = -1;
  dom['cutscene-text'].textContent = CUTSCENE_LINES[0];
  cutsceneLine = 0;
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

// ---- menu / pause / job board ----
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
    const active = S.missions.current && S.missions.current.index === i;
    const payHtml = active ? '<span class="job-pay">ACTIVE</span>'
      : done ? '<span class="job-pay">✓</span>'
      : `<span class="job-pay">$${m.pay}</span>`;
    row.innerHTML = `<span><span class="job-title">${m.title}</span><br><span class="job-giver">${m.giver}</span> — ${m.desc}</span>${payHtml}`;
    if (!done && !active) {
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
dom.cutscene.addEventListener('click', endCutscene);

// ---- shop fallback (only if no shop module loads) ----
let shopLoaded = false;
function openShopFallback() {
  dom['shop-items'].innerHTML = '';
  for (const item of CONFIG.shop.items) {
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.dataset.fallback = '1';
    row.innerHTML = `<span class="shop-name">${item.name}</span><span class="shop-desc">${item.desc}</span><span class="shop-price">$${item.price}</span>`;
    const btn = document.createElement('button');
    btn.className = 'shop-buy';
    btn.textContent = 'BUY';
    btn.addEventListener('click', () => {
      if (row.dataset.fallback !== '1') return; // never touch a real shop module's rows
      applyShopItem(item);
    });
    row.appendChild(btn);
    dom['shop-items'].appendChild(row);
  }
  show(dom['shop-panel']);
}

// ---- feature modules (exact order; a missing file is a quiet skip) ----
const MODULE_ORDER = ['daynight', 'districts', 'player', 'vehicles', 'city', 'sky',
  'ambient', 'people', 'police', 'heli2', 'heat', 'missions', 'side', 'shop',
  'garage', 'fence', 'hud', 'dialogue', 'audio', 'banter', 'crew', 'challenges',
  'respect', 'radio2', 'safehouse', 'weapons', 'cutscene', 'juice', 'postfx'];

async function loadModules() {
  for (const name of MODULE_ORDER) {
    try {
      const url = new URL('./' + name + '.js', import.meta.url);
      const res = await fetch(url);
      if (!res.ok) continue;
      const mod = await import(url);
      if (mod && typeof mod.init === 'function') {
        mod.init(ctx);
        if (name === 'shop') shopLoaded = true;
      }
    } catch (e) { /* one failing module never kills the boot */ }
  }
  // De-duplicate parked cars: same kind at the same rounded position —
  // keep the first, remove later copies (mesh and all). Police never touched.
  const seen = new Set();
  for (let i = S.cars.length - 1; i >= 0; i--) {
    const c = S.cars[i];
    if (c.aiPolice) continue;
    const key = c.kind + '|' + Math.round(c.pos.x) + '|' + Math.round(c.pos.z);
    if (seen.has(key)) {
      if (c.mesh) scene.remove(c.mesh);
      S.cars.splice(i, 1);
    } else {
      seen.add(key);
    }
  }
}

// ---- day / night ----
function updateDayNight(dt) {
  const t = S.time;
  let target;
  let phase;
  if (t >= CONFIG.nightAtMinutes) { phase = 'NIGHT'; target = 1; }
  else if (t >= CONFIG.duskAtMinutes) {
    phase = 'DUSK';
    target = (t - CONFIG.duskAtMinutes) / (CONFIG.nightAtMinutes - CONFIG.duskAtMinutes);
  } else { phase = 'SUNSET'; target = 0; }
  S.dayNight.phase = phase;
  const step = 0.6 * dt;
  S.dayNight.night += clamp(target - S.dayNight.night, -step, step);
  const night = S.dayNight.night;
  sun.intensity = 2.2 - night * 1.85;
  sun.color.setHex(night > 0.6 ? 0x8fb4ff : 0xffb347);
  if (S.skyDome) S.skyDome.material.uniforms.uNight.value = night;
}

// ---- camera ----
const camTarget = new THREE.Vector3();
const camDesired = new THREE.Vector3();
let menuAngle = 0;
function updateCamera(dt) {
  if (S.mode === 'menu') {
    menuAngle += dt * 0.05;
    camera.position.set(Math.cos(menuAngle) * 120, 42, Math.sin(menuAngle) * 120);
    camera.lookAt(0, 0, 0);
    return;
  }
  if (S.mode === 'cutscene') {
    const k = clamp(cutsceneT / 14, 0, 1);
    camera.position.set(-140 + (60 + 140) * k, 55 - 30 * k, -120 + (30 + 120) * k);
    camera.lookAt(0, 5, 0);
    return;
  }
  const focus = S.car ? S.car.pos : S.player.pos;
  const heading = S.car ? S.car.heading : S.player.heading;
  const dist = S.car ? 13 : 9.5;
  const height = S.car ? 5.2 : 4.4;
  camDesired.set(
    focus.x - Math.sin(heading) * dist,
    height,
    focus.z - Math.cos(heading) * dist,
  );
  const f = 1 - Math.exp(-4 * dt);
  camera.position.lerp(camDesired, f);
  camTarget.set(focus.x, focus.y + 2, focus.z);
  camera.lookAt(camTarget);
}

// ---- HUD ----
function updateHUD() {
  dom.cash.textContent = '$' + S.cash.toLocaleString('en-US');
  const d = CONFIG.districts.find((x) => x.id === S.district);
  dom.district.textContent = d ? d.name : S.district.toUpperCase();
  const total = CONFIG.clockStartHour * 60 + CONFIG.clockStartMin + S.time;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(total % 60)).padStart(2, '0');
  dom['day-time'].textContent = `DAY ${S.day} ${hh}:${mm} ${S.dayNight.phase}`;
  dom['respect-num'].textContent = String(S.respect);
  dom['respect-rank'].textContent = S.respectDirector.rank.title;
  dom['health-fill'].style.width = S.player.health + '%';
  const st = CONFIG.radio[S.radioStation] || CONFIG.radio[0];
  dom['radio-station'].textContent = st.name;
  const track = st.tracks[Math.floor(S.time / 45) % st.tracks.length];
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
  const speed = S.car ? Math.abs(S.car.speed) : Math.abs(S.player.speed);
  dom['speed-num'].textContent = String(Math.round(speed));
  dom['speed-gear'].textContent = speed <= 0.5 ? 'N' : String(Math.min(5, 1 + Math.floor(speed / 12)));
  dom['speed-car'].textContent = S.car ? S.car.kind.toUpperCase() : 'ON FOOT';
  dom.objective.textContent = S.missions.current ? S.missions.current.desc : 'Explore Solmar Bay — find work.';
}

// ---- police roster ----
function updateRoster() {
  const cops = S.cops.length ? S.cops : S.cars.filter((c) => c.aiPolice);
  if (!cops.length) { hide(dom.roster); return; }
  show(dom.roster);
  dom['roster-code'].textContent = `DISPATCH 10-80 — ${S.wanted} STAR(S)`;
  dom['roster-rows'].innerHTML = '';
  for (const c of cops) {
    const dist = Math.round(Math.hypot(c.pos.x - S.player.pos.x, c.pos.z - S.player.pos.z));
    const row = document.createElement('div');
    row.className = 'roster-row';
    row.innerHTML = `<b>${c.callsign}</b><span>${(c.brain && c.brain.tactic) || 'PURSUIT'}</span><span>${dist}m</span>`;
    dom['roster-rows'].appendChild(row);
  }
}

// ---- minimap ----
const mm = dom.minimap.getContext('2d');
function drawMinimap() {
  mm.fillStyle = 'rgba(10,4,20,0.9)';
  mm.fillRect(0, 0, 180, 180);
  const mx = (x) => 90 + x * 0.45;
  const mz = (z) => 90 + z * 0.45;
  for (const d of CONFIG.districts) {
    mm.fillStyle = d.color;
    mm.beginPath();
    mm.arc(mx(d.x), mz(d.z), 3, 0, Math.PI * 2);
    mm.fill();
  }
  if (S.wanted > 0 && S.lastKnown) {
    mm.strokeStyle = '#ff5a5a';
    mm.beginPath();
    mm.arc(mx(S.lastKnown.x), mz(S.lastKnown.z), 10, 0, Math.PI * 2);
    mm.stroke();
  }
  for (const p of S.packages) {
    if (p.taken) continue;
    mm.fillStyle = '#ffe066';
    mm.fillRect(mx(p.x) - 2, mz(p.z) - 2, 4, 4);
  }
  for (const c of S.cars) {
    mm.fillStyle = c.aiPolice ? '#7ec8ff' : '#ffe9c9';
    mm.fillRect(mx(c.pos.x) - 2, mz(c.pos.z) - 2, 4, 4);
  }
  if (S.heli) {
    mm.fillStyle = '#ff5a5a';
    mm.beginPath();
    mm.arc(mx(S.heli.pos.x), mz(S.heli.pos.z), 4, 0, Math.PI * 2);
    mm.fill();
  }
  mm.fillStyle = '#ffb347';
  mm.beginPath();
  mm.arc(mx(S.player.pos.x), mz(S.player.pos.z), 4, 0, Math.PI * 2);
  mm.fill();
}

// ---- frame loop ----
let last = performance.now();
let saveT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;

  if (input.wasPressed('KeyP')) {
    if (S.mode === 'playing') pauseGame();
    else if (S.mode === 'paused') resumeGame();
  }

  if (S.mode !== 'paused') {
    // The clock does not advance on the menu screen — the game starts
    // at 18:28 on day 1 when the player presses NEW GAME.
    if (S.mode !== 'menu') S.tick(dt);
    if (S.mode === 'cutscene') {
      cutsceneT += dt;
      const li = Math.min(2, Math.floor(cutsceneT / 4.5));
      if (li !== cutsceneLine) {
        cutsceneLine = li;
        dom['cutscene-text'].textContent = CUTSCENE_LINES[li];
      }
      if (cutsceneT >= 14) endCutscene();
      else if (input.isDown('KeyX')) endCutscene();
    }
    if (S.mode === 'playing') {
      S.challengesDirector.tick();
      // Mission 1 auto-starts when the player reaches the garage door.
      if (!S.missions.current && S.missionIndex === 0) {
        const dx = S.player.pos.x - CONFIG.garage.x;
        const dz = S.player.pos.z - CONFIG.garage.z;
        if (dx * dx + dz * dz < CONFIG.garage.radius * CONFIG.garage.radius) {
          S.missions.start(0);
        }
      }
      // F opens the shop near the MART when the shop fallback is active.
      if (!shopLoaded && input.wasPressed('KeyF')) {
        const dx = S.player.pos.x - CONFIG.shop.x;
        const dz = S.player.pos.z - CONFIG.shop.z;
        if (dx * dx + dz * dz < CONFIG.shop.radius * CONFIG.shop.radius) openShopFallback();
      }
      saveT += dt;
      if (saveT >= 20) { saveT = 0; saveGame(); }
    }
    for (const u of ctx.updates) {
      try { u(dt); } catch (e) { /* one failing module never kills the boot */ }
    }
    updateDayNight(dt);
    updateCamera(dt);
  }

  updateHUD();
  updateRoster();
  drawMinimap();
  renderer.render(scene, camera);
  input.endFrame();
}

// ---- boot ----
loadGame();
requestAnimationFrame(frame);
loadModules();
