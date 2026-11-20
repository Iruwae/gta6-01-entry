import * as THREE from '../vendor/three.module.min.js';
import { init as initConfig } from './config.js';
import { createState, init as initState } from './state.js';
import { init as initRandom } from './random.js';
import { init as initInput } from './input.js';
import { init as initSky } from './sky.js';
import { init as initPostfx } from './postfx.js';
import { init as initDaynight } from './daynight.js';
import { init as initCity } from './city.js';
import { init as initDistricts } from './districts.js';
import { init as initPeople } from './people.js';
import { init as initAmbient } from './ambient.js';
import { init as initJuice } from './juice.js';
import { init as initPlayer } from './player.js';
import { init as initVehicles } from './vehicles.js';
import { init as initWeapons } from './weapons.js';
import { init as initPolice } from './police.js';
import { init as initHeli2 } from './heli2.js';
import { init as initHeat } from './heat.js';
import { init as initMissions } from './missions.js';
import { init as initDialogue } from './dialogue.js';
import { init as initCrew } from './crew.js';
import { init as initCutscene } from './cutscene.js';
import { init as initShop } from './shop.js';
import { init as initSafehouse } from './safehouse.js';
import { init as initGarage } from './garage.js';
import { init as initSide } from './side.js';
import { init as initFence } from './fence.js';
import { init as initChallenges } from './challenges.js';
import { init as initRespect } from './respect.js';
import { init as initBanter } from './banter.js';
import { init as initMenu } from './menu.js';
import { init as initAudio } from './audio.js';
import { init as initRadio2 } from './radio2.js';
import { init as initHud } from './hud.js';

// SOLMAR BAY — entrypoint. Builds the renderer, the shared state, then
// hands S to every module in the shared order. The loop below owns
// the clock, the wanted ladder, the core HUD text and the camera;
// modules that need per-frame work register on S._tick (or S.updates),
// and the few directors that expose a tick() are driven here too.

const S = createState();

const container = document.getElementById('game-container') || document.body;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1400);
camera.position.set(-40, 55, 120);
camera.lookAt(0, 0, 0);

S.renderer = renderer;
S.scene = scene;
S.camera = camera;

initConfig(S);
initState(S);
initRandom(S);
initInput(S);
initSky(S);
initPostfx(S);
initDaynight(S);
initCity(S);
initDistricts(S);
initPeople(S);
initAmbient(S);
initJuice(S);
initPlayer(S);
initVehicles(S);
initWeapons(S);
initPolice(S);
initHeli2(S);
initHeat(S);
initMissions(S);
initDialogue(S);
initCrew(S);
initCutscene(S);
initShop(S);
initSafehouse(S);
initGarage(S);
initSide(S);
initFence(S);
initChallenges(S);
initRespect(S);
initBanter(S);
initMenu(S);
initAudio(S);
initRadio2(S);
initHud(S);

window.__solmar = {
  S,
  get player() {
    return S.player;
  },
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- HUD text the loop owns (day/time, district, cash, respect) -----------
const elDayTime = document.getElementById('day-time');
const elDistrict = document.getElementById('district');
const elCash = document.getElementById('cash');
const elRespectNum = document.getElementById('respect-num');
const elRespectRank = document.getElementById('respect-rank');
let lastHud = '';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function refreshHud() {
  const totalMin = 18 * 60 + 28 + S.time;
  const day = 1 + Math.floor(totalMin / 1440);
  const clockMin = ((totalMin % 1440) + 1440) % 1440;
  const hh = Math.floor(clockMin / 60);
  const mm = Math.floor(clockMin % 60);
  const line = 'DAY ' + day + ' ' + pad2(hh) + ':' + pad2(mm) + ' ' + S.dayNight.phase;
  if (line !== lastHud) {
    lastHud = line;
    if (elDayTime) elDayTime.textContent = line;
  }
  const dName = S.districtName ? S.districtName(S.district) : S.district.toUpperCase();
  if (elDistrict && elDistrict.textContent !== dName) elDistrict.textContent = dName;
  const cashText = '$' + Math.floor(S.cash).toLocaleString('en-US');
  if (elCash && elCash.textContent !== cashText) elCash.textContent = cashText;
  if (elRespectNum && elRespectNum.textContent !== String(S.respect)) {
    elRespectNum.textContent = String(S.respect);
  }
  const rankTitle = S.respectDirector && S.respectDirector.rank ? S.respectDirector.rank.title : '';
  if (elRespectRank && elRespectRank.textContent !== rankTitle) {
    elRespectRank.textContent = rankTitle;
  }
}

// --- Chase camera ----------------------------------------------------------
const camTarget = new THREE.Vector3();
const camDesired = new THREE.Vector3();
const camLook = new THREE.Vector3();

function followCamera(dt) {
  const anchor = S.car ? S.car.pos : S.player.pos;
  const heading = S.car ? S.car.heading : S.player.heading;
  const inCar = !!S.car;
  const dist = inCar ? 12 : 8;
  const height = inCar ? 5 : 4.2;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  camDesired.set(anchor.x - fx * dist, anchor.y + height, anchor.z - fz * dist);
  const k = 1 - Math.exp(-dt * 5);
  camera.position.lerp(camDesired, k);
  camLook.set(anchor.x + fx * 4, anchor.y + 1.5, anchor.z + fz * 4);
  camera.lookAt(camLook);
}

function driveTick(obj, dt) {
  if (!obj) return;
  if (typeof obj.tick === 'function') obj.tick(dt);
  else if (typeof obj.update === 'function') obj.update(dt);
}

// --- Main loop ---------------------------------------------------------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (S.mode === 'playing') {
    S.time += dt * (S.config ? S.config.timeRate : 1);

    for (const fn of [...S._tick]) fn(dt);
    for (const fn of [...(S.updates || [])]) fn(dt);
    driveTick(S.challengesDirector, dt);
    driveTick(S.heatDirector, dt);
    driveTick(S.missions, dt);
    driveTick(S.player, dt);
    driveTick(S.police, dt);
    driveTick(S.crew, dt);

    const h = S.heat || 0;
    S.wanted = h >= 80 ? 5 : h >= 60 ? 4 : h >= 40 ? 3 : h >= 20 ? 2 : h >= 10 ? 1 : 0;
    if (S.player) S.health = S.player.health;

    refreshHud();

    if (S.cutscene) {
      driveTick(S.cutscene, dt);
    } else {
      followCamera(dt);
    }
  } else if (S.mode === 'menu') {
    const t = now / 1000;
    camera.position.set(Math.sin(t * 0.04) * 150, 72, Math.cos(t * 0.04) * 150);
    camera.lookAt(0, 0, 0);
    refreshHud();
  }

  if (S.juice && S.juice.trauma > 0) {
    const s = S.juice.trauma * S.juice.trauma * 0.7;
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s;
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
