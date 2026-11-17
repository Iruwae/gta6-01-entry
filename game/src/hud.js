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
    el.style.display = show ? '' : 'none';
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

    // Cash.
    this._setText(this.elCash, '$' + Math.floor(S.cash || 0));

    // Wanted stars — filled gold, empty dim; red tint at 3+ stars.
    const wanted = Math.max(0, Math.min(5, S.wanted || 0));
    if (this.elStars) {
      this.elStars.textContent = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
      this.elStars.style.color = wanted >= 3 ? '#ff5252' : wanted > 0 ? '#ffd54f' : '#546e7a';
    }

    // Speed — km/h from car speed (m/s), on foot from player speed if present.
    let kmh = 0;
    if (S.car && typeof S.car.speed === 'number') {
      kmh = Math.abs(S.car.speed) * 3.6;
    } else if (S.player && typeof S.player.speed === 'number') {
      kmh = Math.abs(S.player.speed) * 3.6;
    }
    this._setText(this.elSpeed, Math.round(kmh) + ' km/h');

    // Objective + mission title.
    if (S.missions) {
      this._setText(this.elObjective, S.missions.objectiveText());
      const title = S.missions.current
        ? S.missions.current.title
        : (S.missionIndex >= 4 ? 'SOLMAR BAY' : 'FREE ROAM');
      this._setText(this.elMissionTitle, title);
    }

    // Crosshair only when armed and on foot.
    if (this.elCrosshair) {
      const show = !!(S.player && S.player.armed && S.player.onFoot && S.mode === 'playing');
      this.elCrosshair.style.display = show ? '' : 'none';
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

    // Dark ground.
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1b12';
    ctx.fillRect(0, 0, W, H);

    // Water strip along the south edge (harbor side, high +z).
    ctx.fillStyle = '#0e4a6e';
    ctx.fillRect(0, py(132), W, H - py(132));
    ctx.fillStyle = '#c2a878';
    ctx.fillRect(0, py(132) - 2, W, 2);

    const world = S ? S.world : null;
    if (world) {
      // Roads as grey bands.
      ctx.fillStyle = '#3a3f44';
      const half = (world.roadHalf || 6) * scale;
      const roadXs = Array.isArray(world.roadXs) ? world.roadXs : [];
      const roadZs = Array.isArray(world.roadZs) ? world.roadZs : [];
      for (const x of roadXs) ctx.fillRect(px(x) - half, 0, half * 2, H);
      for (const z of roadZs) ctx.fillRect(0, py(z) - half, W, half * 2);
      // Centre dashes.
      ctx.strokeStyle = '#8a9299';
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
        'Cash $' + Math.floor(S.cash || 0) +
        ' · Jobs done: ' + (S.stats ? (S.stats.missionsDone || 0) : 0);
    }
    if (this.elTitleSaveInfo) {
      if (hasSave && S) {
        const jobs = S.stats ? (S.stats.missionsDone || 0) : 0;
        this.elTitleSaveInfo.textContent =
          'Saved game — Cash $' + Math.floor(S.cash || 0) +
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
    if (show && this.elPauseStats && S) {
      const st = S.stats || {};
      this.elPauseStats.textContent =
        'Cash: $' + Math.floor(S.cash || 0) +
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
