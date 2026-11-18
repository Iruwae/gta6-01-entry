// SOLMAR BAY — daynight.js
// A full day cycle, driven by the HUD clock (day 1 starts 18:30, golden
// hour). One game hour is 60 seconds, so sunset slides into night after
// about five minutes of play, the city lights take over, and dawn breaks
// near 06:00. The director owns the light rig — sun intensity and colour,
// hemisphere bounce, fog colour (blended from the current district tint),
// the sky dome's night uniform, the water's night uniform, the emissive
// boost on lit windows and lamp halos, and the headlight-beam boost — so
// night reads as night instead of a darker sunset.

import * as THREE from 'three';
import { S } from './state.js';
import { setHeadlightBoost } from './vehicles.js';

export const HOUR_SECS = 60; // seconds per game hour (sunset -> night in ~5 min)

export function gameHours() {
  return 18.5 + (S.time || 0) / HOUR_SECS;
}

export function phaseNameFor(h) {
  if (h >= 20 || h < 5) return 'NIGHT';
  if (h >= 17 && h < 20) return 'SUNSET';
  if (h >= 5 && h < 8) return 'DAWN';
  return 'DAY';
}

export class DayNightDirector {
  constructor() {
    this.night = 0; // 0 = full sunset light, 1 = full night
    this.phase = 'SUNSET';
    this._fogTmp = new THREE.Color();
    this._nightFog = new THREE.Color(0x0a0e22);
  }

  update(dt) {
    const h = gameHours() % 24;
    this.phase = phaseNameFor(h);
    // Night target: full night 20:00–05:00, ramps across dusk and dawn.
    let target = 0;
    if (h >= 20 || h < 5) target = 1;
    else if (h >= 18.5 && h < 20) target = (h - 18.5) / 1.5;
    else if (h >= 5 && h < 7) target = 1 - (h - 5) / 2;
    this.night += (target - this.night) * Math.min(1, dt * 0.5);
    const n = this.night;

    // Sun: warm and strong at golden hour, a dim cool moon by night.
    const sun = S.sunLight;
    if (sun) {
      sun.intensity = 3.0 - n * 2.85;
      sun.color.setHex(n > 0.5 ? 0x8fa8ff : 0xffa04d);
    }
    const hemi = S.hemiLight;
    if (hemi) hemi.intensity = 0.75 - n * 0.5;

    // Fog: the current district tint, dragged toward deep night blue.
    const fog = S.world && S.world.scene ? S.world.scene.fog : null;
    if (fog) {
      this._fogTmp.setHex((S && S.districtFog) || 0xe08a5e);
      this._fogTmp.lerp(this._nightFog, n * 0.85);
      fog.color.copy(this._fogTmp);
    }

    // Sky dome + water shaders fade to night through their own uniforms.
    if (S.skyDome && S.skyDome.material.uniforms.uNight) {
      S.skyDome.material.uniforms.uNight.value = n;
    }
    const water = S.world && S.world.water;
    if (water && water.material.uniforms && water.material.uniforms.uNight) {
      water.material.uniforms.uNight.value = n;
    }

    // Lit windows and lamp halos burn brighter as the light dies.
    const gm = S.world && S.world.glowMats;
    if (gm) {
      for (const m of gm) {
        if (m.userData.dayI === undefined) m.userData.dayI = m.emissiveIntensity;
        m.emissiveIntensity = m.userData.dayI * (1 + n * 1.2);
      }
    }

    // Headlight beams matter at night: boost the shared cone opacity.
    setHeadlightBoost(n);
  }
}
