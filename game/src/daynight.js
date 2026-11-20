import * as THREE from '../vendor/three.module.min.js';

// SOLMAR BAY — the day/night clock. Game time runs from 18:28; night
// fades in between 20:30 and 22:00 (smoothstep), fades out again
// toward dawn, and the world follows: the sun dims and cools, the
// sky dome darkens, fog closes in, windows and lamps switch on.
// S.time is minutes since 18:28, so time=200 means 21:48.
function smooth01(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function init(S) {
  const sun = new THREE.DirectionalLight(0xffb36b, 2.2);
  sun.position.set(-90, 55, -40);
  S.sunLight = sun;
  S.scene.add(sun);
  S.scene.add(sun.target);

  const duskFog = new THREE.Color(0x4a2a44);
  const nightFog = new THREE.Color(0x0a0e1e);
  const duskSun = new THREE.Color(0xffb36b);
  const nightSun = new THREE.Color(0x8fb4ff);

  S.dayNight = S.dayNight || { phase: 'SUNSET', night: 0 };
  S.dayNight.phase = 'SUNSET';
  S.dayNight.night = 0;

  const tick = (dt) => {
    const totalMin = 18 * 60 + 28 + S.time;
    const clockMin = ((totalMin % 1440) + 1440) % 1440;
    const hh = Math.floor(clockMin / 60);
    const mm = Math.floor(clockMin % 60);

    let target = 0;
    if (clockMin >= 22 * 60 || clockMin <= 5 * 60 + 30) {
      target = 1;
    } else if (clockMin > 20 * 60 + 30 && clockMin < 22 * 60) {
      target = smooth01((clockMin - (20 * 60 + 30)) / 90);
    } else if (clockMin > 5 * 60 + 30 && clockMin < 6 * 60 + 30) {
      target = 1 - smooth01((clockMin - (5 * 60 + 30)) / 60);
    }

    const dn = S.dayNight;
    if (dn.night < target) dn.night = Math.min(target, dn.night + 0.03);
    else if (dn.night > target) dn.night = Math.max(target, dn.night - 0.03);
    const n = dn.night;

    if (n > 0.5) dn.phase = 'NIGHT';
    else if (hh >= 5 && hh < 8) dn.phase = 'MORNING';
    else if (hh >= 8 && hh < 17) dn.phase = 'DAY';
    else dn.phase = 'SUNSET';

    S.day = 1 + Math.floor(totalMin / 1440);
    S.clock = { hh, mm, totalMin };

    sun.intensity = 2.2 + (0.4 - 2.2) * n;
    sun.color.copy(duskSun).lerp(nightSun, n);
    if (S.hemi) S.hemi.intensity = 0.7 + (0.28 - 0.7) * n;
    if (S.ambient) S.ambient.intensity = 0.35 + (0.12 - 0.35) * n;
    if (S.scene.fog) S.scene.fog.color.copy(duskFog).lerp(nightFog, n);
    if (S.skyDome) {
      S.skyDome.material.uniforms.uNight.value = n;
      S.skyDome.material.uniforms.uTime.value += dt;
    }

    const mats = S._cityMats;
    if (mats) {
      for (const m of mats.buildings) m.emissiveIntensity = n * 1.15;
      if (mats.lampGlow) mats.lampGlow.opacity = n * 0.9;
      if (mats.lampHead) mats.lampHead.emissiveIntensity = n * 2.2;
      if (mats.trafficHead) mats.trafficHead.emissiveIntensity = n * 2.0;
      if (mats.billboards) {
        for (const b of mats.billboards) b.material.opacity = 0.55 + n * 0.45;
      }
    }
  };

  S._tick.push(tick);
  S.dayNightTick = tick;
  return tick;
}
