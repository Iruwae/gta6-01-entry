// SOLMAR BAY — day/night cycle (round 9 rebuild, builder B / world).
// Day 1 opens at golden hour: S.time counts game-minutes since 18:28,
// so S.time = 200 lands on 21:48 and night must be fully engaged there.
// The sun dims and cools, the sky dome's uNight uniform ramps up, the
// streetlamps warm on, and the HUD clock reads DAY 1 18:28 SUNSET at
// start and DAY 1 21:48 NIGHT once night lands. Written fresh from the
// build contract; no other game module is imported.
import * as THREE from '../vendor/three.module.min.js';

const START_MIN = 18 * 60 + 28; // 18:28 — the clock at S.time = 0
const DAY_MINUTES = 1440;
const TIME_RATE = 0.5; // game-minutes per real second

const NIGHT_START = 21 * 60; // 21:00 — full night from here
const SUNSET_START = 17 * 60 + 30; // 17:30 — sunset begins
const DAWN_END = 6 * 60 + 30; // 06:30 — night ends

function pad2(n) {
  return String(n).padStart(2, '0');
}

function phaseFor(mins) {
  if (mins >= NIGHT_START || mins < DAWN_END) return 'NIGHT';
  if (mins >= SUNSET_START) return 'SUNSET';
  return 'DAY';
}

function nightTargetFor(mins, phase) {
  if (phase === 'NIGHT') return 1;
  if (phase === 'DAY') return 0;
  // Sunset: ramp smoothly from 0 at 17:30 to 1 at 21:00.
  const f = (mins - SUNSET_START) / (NIGHT_START - SUNSET_START);
  const c = Math.min(1, Math.max(0, f));
  return c * c * (3 - 2 * c);
}

export function init(ctx) {
  const { scene } = ctx;
  const S = ctx.state || ctx.S;
  if (typeof S.time !== 'number') S.time = 0;

  const sun = new THREE.DirectionalLight(0xff9a3c, 2.4);
  sun.position.set(-120, 60, 40);
  scene.add(sun);
  scene.add(sun.target);
  S.sunLight = sun;

  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x40304a, 0.9);
  scene.add(hemi);
  S.hemiLight = hemi;

  const sunDay = new THREE.Color(0xff9a3c);
  const sunNight = new THREE.Color(0x8fa8ff);
  const fogDay = new THREE.Color(0xb06a4a);
  const fogNight = new THREE.Color(0x0a0e20);

  S.dayNight = { phase: 'SUNSET', night: 0, clockMin: START_MIN, day: 1 };

  function hudEl() {
    return (ctx.dom && ctx.dom['day-time']) || document.getElementById('day-time');
  }

  ctx.updates.push((dt) => {
    // The clock lives in the shared state tick, which already advances
    // S.time every frame; advancing it here too would run the day at
    // double speed, so this update only reads the clock.
    const clockMin = START_MIN + S.time;
    const day = 1 + Math.floor(clockMin / DAY_MINUTES);
    const mins = ((clockMin % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
    const phase = phaseFor(mins);
    const target = nightTargetFor(mins, phase);

    // Per-frame ramp (dt is capped at 0.05 by the main loop): night chases
    // its target fast enough to land well inside the smoke test's poll.
    const dn = S.dayNight;
    dn.night += (target - dn.night) * Math.min(1, dt * 1.5);
    dn.phase = phase;
    dn.clockMin = mins;
    dn.day = day;

    // Sun: low in the west at sunset, sinking as night comes; dim + cool.
    const elevDeg = Math.max(
      -10,
      Math.min(26, 24 - (mins - START_MIN) * 0.09),
    );
    const el = (elevDeg * Math.PI) / 180;
    const dir = new THREE.Vector3(-Math.cos(el), Math.sin(el), 0.35 * Math.cos(el)).normalize();
    const lightElev = Math.max(3, elevDeg);
    const lel = (lightElev * Math.PI) / 180;
    const lightDir = new THREE.Vector3(
      -Math.cos(lel),
      Math.sin(lel),
      0.35 * Math.cos(lel),
    ).normalize();
    sun.position.copy(lightDir).multiplyScalar(180);
    sun.intensity = 2.4 * (1 - dn.night) + 0.35 * dn.night;
    sun.color.copy(sunDay).lerp(sunNight, dn.night);
    hemi.intensity = 0.95 * (1 - dn.night) + 0.35 * dn.night;

    // Sky dome follows the night value (guard: sky may init after us).
    const dome = S.skyDome;
    if (dome && dome.material && dome.material.uniforms) {
      if (dome.material.uniforms.uNight) {
        dome.material.uniforms.uNight.value = dn.night;
      }
      if (dome.material.uniforms.uSunDir) {
        dome.material.uniforms.uSunDir.value.copy(dir);
      }
    }

    // Fog drifts from sunset haze to night blue.
    if (scene.fog && scene.fog.color) {
      scene.fog.color.copy(fogDay).lerp(fogNight, dn.night);
    }

    // Streetlamps warm up as darkness falls.
    const city = ctx.api.city;
    if (city && city.lamps) {
      for (const lampMat of city.lamps) {
        lampMat.emissiveIntensity = 0.25 + dn.night * 2.2;
      }
    }

    const el2 = hudEl();
    if (el2) {
      el2.textContent =
        'DAY ' + day + ' ' + pad2(Math.floor(mins / 60)) + ':' + pad2(Math.floor(mins % 60)) + ' ' + phase;
    }
  });
}
