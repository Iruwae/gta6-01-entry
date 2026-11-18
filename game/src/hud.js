// SOLMAR BAY — hud.js
// DOM-only HUD. No three.js import: this file talks to the page, the game
// talks to this file through S. Every lookup is null-safe — if the
// integrator's index.html is missing an element, that widget is skipped
// silently instead of throwing mid-frame.
//
// Hierarchy (threejs-game-ui-designer): survival first (health, damage
// flash), then status (cash, wanted stars, speed), then the objective,
// then feedback (toasts). Minimap bottom-left, objective top-centre,
// vitals bottom-right — nothing covers the crosshair or the road ahead.

import { S } from './state.js';
import { CFG } from './config.js';
import { WEAPONS, CAR_NAMES } from './weapons.js';
import { SPEAKERS, drawPortrait } from './dialogue.js';
import { TACTICS } from './police.js';

function $(id) {
  const el = document.getElementById(id);
  return el || null;
}

export class HUD {
  constructor(callbacks) {
    this.cb = callbacks || {};
    this._toastTimer = null;
    this._flashTimer = null;

    // HUD cluster
    this.elHud = $('hud');
    this.elHealthFill = $('health-fill');
    this.elHealthNum = $('health-num');
    this.elCash = $('cash');
    this.elStars = $('stars');
    this.elSpeed = $('speed');
    this.elObjective = $('objective');
    this.elMissionTitle = $('mission-title');
    this.elMinimap = $('minimap');
    this.elToast = $('toast');
    this.elCrosshair = $('crosshair');
    this.elDamageFlash = $('damage-flash');
    this.elHint = $('hint');

    // Round 4: police roster, weapon slots, radio, speedo details, dialogue.
    this.elRoster = $('roster');
    this.elRosterCode = $('roster-code');
    this.elRosterRows = $('roster-rows');
    this.elWeapons = $('weapons');
    this.elRadio = $('radio');
    this.elRadioStation = $('radio-station');
    this.elRadioTrack = $('radio-track');
    this.elDayTime = $('day-time');
    this.elDistrict = $('district');
    this.elHeatFill = $('heat-fill');
    this.elHeatNum = $('heat-num');
    this.elHeatHint = $('heat-hint');
    this.elRespectFill = $('respect-fill');
    this.elRespectNum = $('respect-num');
    this.elRespectRank = $('respect-rank');
    this.elSpeedNum = $('speed-num');
    this.elSpeedGear = $('speed-gear');
    this.elSpeedCar = $('speed-car');
    this.elSpeedCondFill = $('speed-cond-fill');
    this.elDialogue = $('dialogue');
    this.elDlgPortrait = $('dlg-portrait');
    this.elDlgName = $('dlg-name');
    this.elDlgText = $('dlg-text');
    this._rosterT = 0;
    this._slotEls = [];
    this._buildWeaponSlots();
    // Dialogue box: click advances the line (visual-novel page-click).
    if (this.elDialogue) {
      this.elDialogue.addEventListener('click', () => {
        if (S && S.dialogue) S.dialogue.advance();
      });
    }

    // Title screen
    this.elTitle = $('title-screen');
    this.elBtnNew = $('btn-new');
    this.elBtnContinue = $('btn-continue');
    this.elContinueLabel = $('continue-label');
    this.elBtnMuteTitle = $('btn-mute-title');
    this.elTitleSaveInfo = $('title-save-info');

    // Pause menu
    this.elPause = $('pause-menu');
    this.elBtnResume = $('btn-resume');
    this.elBtnSave = $('btn-save');
    this.elBtnRestart = $('btn-restart');
    this.elBtnMute = $('btn-mute');
    this.elPauseStats = $('pause-stats');

    // End screen
    this.elEnd = $('end-screen');
    this.elEndTitle = $('end-title');
    this.elEndText = $('end-text');
    this.elBtnRetry = $('btn-retry');

    this._wire(this.elBtnNew, 'onNewGame');
    this._wire(this.elBtnContinue, 'onContinue');
    this._wire(this.elBtnResume, 'onResume');
    this._wire(this.elBtnSave, 'onSave');
    this._wire(this.elBtnRestart, 'onRestart');
    this._wire(this.elBtnRetry, 'onRestart');
    this._wire(this.elBtnMute, 'onMute');
    this._wire(this.elBtnMuteTitle, 'onMute');
  }

  _wire(el, name) {
    if (!el) return;
    el.addEventListener('click', () => {
      const fn = this.cb[name];
      if (typeof fn === 'function') fn();
    });
  }

  _setText(el, text) {
    if (el) el.textContent = text;
  }

  _show(el, show) {
    if (!el) return;
    // Visibility is class-driven: .hidden carries `display:none !important`,
    // which beats any inline style.display, so toggle the class and clear
    // any stale inline display left by the old inline-style approach.
    el.classList.toggle('hidden', !show);
    el.style.display = '';
  }

  // ---- round 4 widgets ---------------------------------------------------

  _buildWeaponSlots() {
    if (!this.elWeapons) return;
    this.elWeapons.innerHTML = '';
    this._slotEls = [];
    for (let i = 0; i < WEAPONS.length; i++) {
      const w = WEAPONS[i];
      const slot = document.createElement('div');
      slot.className = 'slot';
      const key = document.createElement('span');
      key.className = 'slot-key';
      key.textContent = String(i + 1);
      const name = document.createElement('span');
      name.className = 'slot-name';
      name.textContent = w.name;
      const ammo = document.createElement('span');
      ammo.className = 'slot-ammo';
      slot.appendChild(key);
      slot.appendChild(name);
      slot.appendChild(ammo);
      this.elWeapons.appendChild(slot);
      this._slotEls.push(slot);
    }
  }

  // Police roster (refreshed at 4 Hz): callsign, distance, tactic badge.
  _updateRoster() {
    if (!this.elRoster) return;
    const want = S ? (S.wanted || 0) : 0;
    const cops = (S && Array.isArray(S.cars))
      ? S.cars.filter((c) => c && c.aiPolice && !c.dead)
      : [];
    this._show(this.elRoster, want > 0 && cops.length > 0);
    if (want === 0 || cops.length === 0) return;
    this._setText(this.elRosterCode, 'CODE ' + want + ' · ' + cops.length + ' UNIT' + (cops.length > 1 ? 'S' : ''));
    this.elRosterRows.innerHTML = '';
    const px = S.player ? S.player.pos.x : 0;
    const pz = S.player ? S.player.pos.z : 0;
    for (const c of cops) {
      const d = Math.round(Math.hypot(c.pos.x - px, c.pos.z - pz));
      const tac = (c.brain && c.brain.tactic) || 'PURSUIT';
      const t = TACTICS[tac] || TACTICS.PURSUIT;
      const row = document.createElement('div');
      row.className = 'roster-row';
      const name = document.createElement('span');
      name.className = 'roster-name';
      name.textContent = c.callsign || 'PD-??';
      const dist = document.createElement('span');
      dist.className = 'roster-dist';
      dist.textContent = d + 'm';
      const badge = document.createElement('span');
      badge.className = 'tactic';
      badge.style.color = t.color;
      badge.style.borderColor = t.color;
      badge.textContent = t.label;
      row.appendChild(name);
      row.appendChild(dist);
      row.appendChild(badge);
      this.elRosterRows.appendChild(row);
    }
  }

  _updateWeaponSlots() {
    if (!this._slotEls || !S.player || !S.player.loadout) return;
    const loadout = S.player.loadout;
    const done = S.missionIndex || 0;
    for (let i = 0; i < this._slotEls.length; i++) {
      const el = this._slotEls[i];
      const slot = loadout.slots[i];
      const unlocked = loadout.unlocked(i, done);
      el.classList.toggle('active', i === loadout.equipped);
      el.classList.toggle('locked', !unlocked);
      const ammoEl = el.querySelector('.slot-ammo');
      if (ammoEl) {
        ammoEl.textContent = unlocked
          ? slot.ammo + ' / ∞'
          : WEAPONS[i].unlockText;
      }
    }
  }

  // ---- dialogue ----------------------------------------------------------

  showDialogueLine(who, expr, text) {
    if (!this.elDialogue) return;
    const sp = SPEAKERS[who] || { name: String(who).toUpperCase(), color: '#ffffff' };
    this._setText(this.elDlgName, sp.name);
    if (this.elDlgName) this.elDlgName.style.color = sp.color;
    this._setText(this.elDlgText, text);
    drawPortrait(this.elDlgPortrait, who, expr);
    this._show(this.elDialogue, true);
  }

  hideDialogue() {
    this._show(this.elDialogue, false);
  }

  // ---- per-frame ---------------------------------------------------------

  update(dt) {
    if (!S) return;

    // Health — bar width + number, colour shifts green -> amber -> red.
    const hp = Math.max(0, Math.min(100, S.health || 0));
    if (this.elHealthFill) {
      this.elHealthFill.style.width = hp + '%';
      this.elHealthFill.style.background = hp > 50 ? '#2ecc71' : hp > 25 ? '#f39c12' : '#e74c3c';
    }
    this._setText(this.elHealthNum, String(Math.round(hp)));

    // Cash — thousands separators, champion style ($38,420).
    this._setText(this.elCash, '$' + Math.floor(S.cash || 0).toLocaleString('en-US'));

    // In-game clock: day 1 starts 18:30 (sunset); 1 game hour = 60 s
    // (CFG.DAY) — the same clock drives the day/night cycle, so the HUD
    // time and the sky always agree. The phase tag names the light.
    if (this.elDayTime) {
      const hours = 18.5 + (S.time || 0) / 60;
      const day = 1 + Math.floor(hours / 24);
      const hh = Math.floor(hours % 24);
      const mm = Math.floor((hours % 1) * 60);
      const phase = (S.dayNight && S.dayNight.phase) || 'SUNSET';
      this.elDayTime.textContent = 'DAY ' + day + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ' · ' + phase;
    }

    // Wanted stars — filled gold, empty dim; red tint at 3+ stars.
    const wanted = Math.max(0, Math.min(5, S.wanted || 0));
    if (this.elStars) {
      this.elStars.textContent = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
      this.elStars.style.color = wanted >= 3 ? '#ff5252' : wanted > 0 ? '#ffd54f' : '#546e7a';
    }

    // Heat meter: raw 0..100 heat under the stars, with a lay-low hint
    // from the heat director (nearest ready hideout / triple drain).
    const heat = Math.max(0, Math.min(100, S.heat || 0));
    if (this.elHeatFill) this.elHeatFill.style.width = heat + '%';
    this._setText(this.elHeatNum, String(Math.round(heat)));
    if (this.elHeatHint) {
      let hint = '';
      if (wanted > 0) {
        const hd = S.heatDirector;
        if (hd && hd.layLow) hint = 'Laying low — heat draining 3×.';
        else if (hd && S.player && typeof hd.nearestHideout === 'function') {
          const near = hd.nearestHideout(S.player.pos.x, S.player.pos.z);
          hint = near ? 'Hideout ' + Math.round(near.dist) + 'm away — hold 3s to shed a star.' : 'Lay low to cool off — slow down, hide out.';
        } else hint = 'Lay low to cool off — slow down, hide out.';
      }
      this.elHeatHint.textContent = hint;
    }
    // District name under the clock: where in the city Marco stands.
    this._setText(this.elDistrict, S.districtName || 'DOWNTOWN');

    // Respect meter: the name Marco earns, with the rank title.
    const respect = (S.respectDirector && S.respectDirector.points) || S.respect || 0;
    const rank = S.respectDirector ? S.respectDirector.rank : null;
    if (this.elRespectFill) this.elRespectFill.style.width = Math.min(100, (respect / 1000) * 100) + '%';
    this._setText(this.elRespectNum, String(Math.round(respect)));
    this._setText(this.elRespectRank, rank ? rank.title : 'WHEELMAN');

    // Speedometer (racing-feel: number + gear + vehicle + condition):
    // big km/h, gear from speed band, vehicle name, condition bar.
    let kmh = 0;
    let gear = 'N';
    let carName = 'ON FOOT';
    let cond = null;
    if (S.car && typeof S.car.speed === 'number') {
      kmh = Math.abs(S.car.speed) * 3.6;
      const sp = S.car.speed;
      gear = sp < -0.5 ? 'R' : sp < 1 ? 'N' : String(Math.min(5, 1 + Math.floor(Math.abs(sp) / 7)));
      carName = CAR_NAMES[S.car.kind] || 'CAR';
      cond = Math.max(0, Math.min(100, S.car.health || 0));
    } else if (S.player && typeof S.player.speed === 'number') {
      kmh = Math.abs(S.player.speed) * 3.6;
    }
    this._setText(this.elSpeedNum, String(Math.round(kmh)));
    this._setText(this.elSpeedGear, gear);
    this._setText(this.elSpeedCar, carName);
    if (this.elSpeedCondFill) {
      this.elSpeedCondFill.style.width = (cond === null ? 100 : cond) + '%';
      this.elSpeedCondFill.style.background = cond === null ? '#2ecc71' : cond > 50 ? '#2ecc71' : cond > 25 ? '#f39c12' : '#e74c3c';
    }

    // Radio: station + track (track rotates every 45 s, deterministic).
    // The merged six-station dial (radio2.js) wins when it exists; the
    // original three stations are its first three, indices never move.
    const rd = S.radioDirector;
    if (rd && typeof rd.stationAt === 'function' && this.elRadioStation) {
      const stn = rd.stationAt(S.radioStation || 0);
      if (stn) {
        this._setText(this.elRadioStation, '♪ ' + stn.name + ' · ' + stn.genre);
        this._setText(this.elRadioTrack, rd.trackAt(S.radioStation || 0, S.time || 0));
      }
    } else {
      const stations = (CFG && CFG.RADIO) || [];
      if (stations.length > 0 && this.elRadioStation) {
        const stn = stations[(S.radioStation || 0) % stations.length];
        this._setText(this.elRadioStation, '♪ ' + stn.name + ' · ' + stn.genre);
        const track = stn.tracks[Math.floor((S.time || 0) / 45) % stn.tracks.length];
        this._setText(this.elRadioTrack, track);
      }
    }

    // Police roster (4 Hz) + weapon slots (every frame, cheap).
    this._rosterT -= dt;
    if (this._rosterT <= 0) {
      this._rosterT = 0.25;
      this._updateRoster();
    }
    this._updateWeaponSlots();

    // Objective + mission title. A live side job (race / taxi) owns the
    // objective line while it runs; otherwise the story mission does.
    const sideLine = (S.sideActivities && typeof S.sideActivities.objectiveLine === 'function')
      ? S.sideActivities.objectiveLine()
      : null;
    if (sideLine) {
      this._setText(this.elObjective, sideLine);
      this._setText(this.elMissionTitle, 'SIDE HUSTLE');
    } else if (S.missions) {
      this._setText(this.elObjective, S.missions.objectiveText());
      const title = S.missions.current
        ? S.missions.current.title
        : (S.missionIndex >= 10 ? 'SOLMAR BAY' : 'FREE ROAM');
      this._setText(this.elMissionTitle, title);
    }

    // Crosshair only when armed and on foot. Class-driven: the element
    // starts with .hidden (display:none !important), so inline style
    // alone can never reveal it.
    if (this.elCrosshair) {
      const show = !!(S.player && S.player.armed && S.player.onFoot && S.mode === 'playing');
      this._show(this.elCrosshair, show);
    }

    this.drawMinimap();
  }

  // ---- minimap -----------------------------------------------------------
  // North = -z up. World bounds +/-150 map onto the 180x180 canvas.

  drawMinimap() {
    const cv = this.elMinimap;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width || 180;
    const H = cv.height || 180;
    const cx = W / 2;
    const cy = H / 2;
    const scale = W / 300; // bounds 150 -> half canvas
    const px = (x) => cx + x * scale;
    const py = (z) => cy + z * scale;

    // Dusk ground (deep violet), water strip along the south edge.
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#16232b';
    ctx.fillRect(0, 0, W, H);

    // Water strip along the south edge (harbor side, high +z).
    ctx.fillStyle = '#155e7d';
    ctx.fillRect(0, py(132), W, H - py(132));
    ctx.fillStyle = '#c8b98a';
    ctx.fillRect(0, py(132) - 2, W, 2);

    const world = S ? S.world : null;
    if (world) {
      // Roads as warm grey bands.
      ctx.fillStyle = '#55555e';
      const half = (world.roadHalf || 6) * scale;
      const roadXs = Array.isArray(world.roadXs) ? world.roadXs : [];
      const roadZs = Array.isArray(world.roadZs) ? world.roadZs : [];
      for (const x of roadXs) ctx.fillRect(px(x) - half, 0, half * 2, H);
      for (const z of roadZs) ctx.fillRect(0, py(z) - half, W, half * 2);
      // Centre dashes, warm amber.
      ctx.strokeStyle = '#c8b98a';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      for (const x of roadXs) { ctx.moveTo(px(x), 0); ctx.lineTo(px(x), H); }
      for (const z of roadZs) { ctx.moveTo(0, py(z)); ctx.lineTo(W, py(z)); }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Landmarks: garage G (green), bank $ (gold), harbor H (blue).
    const landmark = (x, z, ch, color) => {
      ctx.fillStyle = color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, px(x), py(z));
    };
    if (world) {
      if (world.garage) landmark(world.garage.x, world.garage.z, 'G', '#2ecc71');
      if (world.bank) landmark(world.bank.x, world.bank.z, '$', '#ffd54f');
      if (world.harbor) landmark(world.harbor.x, world.harbor.z, 'H', '#4fc3f7');
      // Round 5 commerce: shop M (green) and safehouse S (teal).
      if (world.shop) landmark(world.shop.x, world.shop.z, 'M', '#8affc1');
      if (world.safehouse) landmark(world.safehouse.x, world.safehouse.z, 'S', '#2ec4b6');
      // Vic's fence V (gold) at the harbor yard.
      if (S && S.fenceDirector) landmark(S.fenceDirector.pos.x, S.fenceDirector.pos.z, 'V', '#f2c200');
    }
    // District name along the bottom of the minimap.
    if (S && S.districtName) {
      ctx.fillStyle = '#ffd9a0';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(S.districtName, cx, H - 4);
    }

    // Wanted search zone (enemy-perception: last-known position + stale
    // growth). Red translucent disk + dashed ring at the LKP.
    if (S && (S.wanted || 0) > 0 && S.lastKnown) {
      const lk = S.lastKnown;
      const staleFor = Math.max(0, (S.time || 0) - lk.seenAt);
      const radius = Math.min(70, 25 + (staleFor > 4 ? (staleFor - 4) * 4 : 0));
      ctx.fillStyle = 'rgba(255,60,60,0.13)';
      ctx.beginPath();
      ctx.arc(px(lk.x), py(lk.z), radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,80,0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(px(lk.x), py(lk.z), radius * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Helicopter blip (yellow H).
    if (S && S.heli && S.heli.pos) {
      ctx.fillStyle = '#ffd60a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', px(S.heli.pos.x), py(S.heli.pos.z));
    }

    // Traffic dots.
    if (S && Array.isArray(S.cars)) {
      ctx.fillStyle = '#9aa0a6';
      for (const car of S.cars) {
        if (!car || !car.pos || car.dead) continue;
        ctx.fillRect(px(car.pos.x) - 1, py(car.pos.z) - 1, 2, 2);
      }
    }

    // Cop dots — flashing blue while wanted.
    if (S && Array.isArray(S.cops)) {
      const flash = (S.wanted || 0) > 0 ? (Math.floor(performance.now() / 300) % 2 === 0) : true;
      ctx.fillStyle = flash ? '#2196f3' : '#0d47a1';
      for (const cop of S.cops) {
        if (!cop || !cop.pos) continue;
        ctx.beginPath();
        ctx.arc(px(cop.pos.x), py(cop.pos.z), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mission marker — pulsing yellow diamond.
    if (S && S.missions && typeof S.missions.marker === 'function') {
      const m = S.missions.marker();
      if (m) {
        const pulse = 4 + Math.sin(performance.now() / 200) * 1.5;
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.moveTo(px(m.x), py(m.z) - pulse);
        ctx.lineTo(px(m.x) + pulse, py(m.z));
        ctx.lineTo(px(m.x), py(m.z) + pulse);
        ctx.lineTo(px(m.x) - pulse, py(m.z));
        ctx.closePath();
        ctx.fill();
      }
    }

    // Player — white triangle rotated by heading.
    if (S && S.player && S.player.pos) {
      const p = S.player.pos;
      ctx.save();
      ctx.translate(px(p.x), py(p.z));
      // Triangle points up (-z) at rotate 0; heading h faces (sin h, cos h)
      // in (x, z), which needs rotate (PI - h) on this y-down canvas.
      ctx.rotate(Math.PI - (S.player.heading || 0));
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---- feedback ----------------------------------------------------------

  toast(text) {
    if (!this.elToast || !text) return;
    this.elToast.textContent = text;
    this.elToast.style.opacity = '1';
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      if (this.elToast) this.elToast.style.opacity = '0';
    }, 3500);
  }

  flashDamage() {
    if (!this.elDamageFlash) return;
    this.elDamageFlash.style.opacity = '0.45';
    if (this._flashTimer) clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      if (this.elDamageFlash) this.elDamageFlash.style.opacity = '0';
    }, 120);
  }

  setMuted(m) {
    const label = m ? '🔇 Muted' : '🔊 Sound';
    if (this.elBtnMute) this.elBtnMute.textContent = label;
    if (this.elBtnMuteTitle) this.elBtnMuteTitle.textContent = label;
  }

  // ---- screens -----------------------------------------------------------

  showGame() {
    this._show(this.elTitle, false);
    this._show(this.elPause, false);
    this._show(this.elEnd, false);
    this._show(this.elHud, true);
  }

  showTitle(hasSave) {
    this._show(this.elHud, false);
    this._show(this.elPause, false);
    this._show(this.elEnd, false);
    this._show(this.elTitle, true);
    this._show(this.elBtnContinue, !!hasSave);
    if (this.elContinueLabel && hasSave && S) {
      this.elContinueLabel.textContent =
        'Cash $' + Math.floor(S.cash || 0).toLocaleString('en-US') +
        ' · Jobs done: ' + (S.stats ? (S.stats.missionsDone || 0) : 0);
    }
    if (this.elTitleSaveInfo) {
      if (hasSave && S) {
        const jobs = S.stats ? (S.stats.missionsDone || 0) : 0;
        this.elTitleSaveInfo.textContent =
          'Saved game — Cash $' + Math.floor(S.cash || 0).toLocaleString('en-US') +
          ' · Jobs done: ' + jobs +
          ' · Health: ' + Math.round(S.health || 0);
        this.elTitleSaveInfo.style.display = '';
      } else {
        this.elTitleSaveInfo.textContent = '';
        this.elTitleSaveInfo.style.display = 'none';
      }
    }
  }

  showPause(show) {
    this._show(this.elPause, !!show);
    // Pausing also closes the job list / stats screens (menu.js) so the
    // pause menu never stacks on top of them.
    if (show && S && S.menuDirector && typeof S.menuDirector.close === 'function') {
      S.menuDirector.close();
    }
    if (show && this.elPauseStats && S) {
      const st = S.stats || {};
      this.elPauseStats.textContent =
        'Cash: $' + Math.floor(S.cash || 0).toLocaleString('en-US') +
        '  ·  Jobs done: ' + (st.missionsDone || 0) +
        '  ·  Kills: ' + (st.kills || 0) +
        '  ·  Cars stolen: ' + (st.carsStolen || 0) +
        '  ·  Health: ' + Math.round(S.health || 0);
    }
  }

  showEnd(kind) {
    const busted = kind === 'busted';
    if (this.elEndTitle) this.elEndTitle.textContent = busted ? 'BUSTED' : 'WASTED';
    if (this.elEndText) {
      this.elEndText.textContent = busted
        ? 'The Solmar Bay PD caught up with Marco. Lena is already working on bail — the city is still yours to take back.'
        : 'Marco went down in Solmar Bay. The debt doesn\'t die with him — get up and finish the jobs.';
    }
    this._show(this.elEnd, true);
  }

  hideEnd() {
    this._show(this.elEnd, false);
  }
}
