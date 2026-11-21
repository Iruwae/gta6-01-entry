// hud.js — SOLMAR BAY live HUD.
// Owns the on-screen readouts only: cash, district, clock, respect,
// health, radio, wanted stars, police roster, minimap, weapon slots,
// speedometer and objective. It never writes a toast it did not set
// itself; other modules own their toast lines and this HUD only ever
// clears a toast that its own api.toast() created, after its timer runs out.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  const DISTRICT_NAMES = {
    harbor: 'HARBOR', beach: 'BEACH', uptown: 'UPTOWN', strip: 'THE STRIP',
    downtown: 'DOWNTOWN', marina: 'MARINA', palms: 'PALM ROW',
    oldtown: 'OLD TOWN', airport: 'AIRFIELD', hills: 'SUNSET HILLS',
  };
  const SLOT_NAMES = ['PISTOL', 'SMG', 'SHOTGUN', 'RIFLE'];
  const SLOT_MAGS = [12, 30, 6, 30];
  const FALLBACK_STATIONS = [
    'SUNSET FM', 'BAYLINE FM', 'PALM 98', 'STRIP TALK',
    'HARBOR NIGHTS', 'VICEROY CLASSICS',
  ];

  // Toast this HUD owns (set through ctx.api.toast). Anything else on
  // the toast element is another module's line: leave it alone.
  let ownedToast = null;
  ctx.api = ctx.api || {};
  ctx.api.toast = (msg, ms) => {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    ownedToast = { text: msg, until: Date.now() + (ms || 4500) };
  };

  function districtLabel(id) {
    if (!id) return 'DOWNTOWN';
    if (DISTRICT_NAMES[id]) return DISTRICT_NAMES[id];
    return String(id).replace(/[_-]+/g, ' ').toUpperCase();
  }

  // The in-game clock starts at sunset: 18:28, and S.time counts the
  // minutes that have passed since then.
  function clockText() {
    const total = 1128 + Math.floor(S.time || 0);
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }

  function phaseText() {
    if (S.dayNight && S.dayNight.phase) return S.dayNight.phase;
    const t = S.time || 0;
    if (t < 90) return 'SUNSET';
    if (t < 200) return 'DUSK';
    return 'NIGHT';
  }

  function wantedLevel() {
    if (typeof S.wanted === 'number') return S.wanted;
    return Math.max(0, Math.min(5, Math.floor((S.heat || 0) / 20)));
  }

  function policeList() {
    if (Array.isArray(S.cops) && S.cops.length) return S.cops;
    return (S.cars || []).filter((c) => c && c.aiPolice);
  }

  function copDistance(cop) {
    const p = S.player && S.player.pos;
    const q = cop && cop.pos;
    if (!p || !q) return 0;
    const dx = (q.x || 0) - (p.x || 0);
    const dz = (q.z || 0) - (p.z || 0);
    return Math.round(Math.sqrt(dx * dx + dz * dz));
  }

  function refreshRoster() {
    const panel = $('roster');
    const cops = policeList();
    const wanted = wantedLevel();
    if (panel) {
      if (wanted > 0 || cops.length > 0) panel.classList.remove('hidden');
      else panel.classList.add('hidden');
    }
    const codeEl = $('roster-code');
    if (codeEl) {
      codeEl.textContent = wanted > 0
        ? 'DISPATCH CODE ' + (wanted >= 3 ? '3' : '2') + ' · ' + cops.length + ' UNITS'
        : 'DISPATCH CLEAR';
    }
    const box = $('roster-rows') || panel;
    if (!box) return;
    const old = box.querySelectorAll('.roster-row');
    old.forEach((r) => r.remove());
    cops.forEach((cop) => {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const tactic = (cop.brain && cop.brain.tactic) || cop.tactic || 'PURSUIT';
      const call = cop.callsign || 'PD-??';
      const d = copDistance(cop);
      row.textContent = call + ' · ' + d + 'm · ' + tactic;
      box.appendChild(row);
    });
  }

  let mapCtx = null;
  function drawMinimap() {
    const cv = $('minimap');
    if (!cv || !cv.getContext) return;
    if (!mapCtx) mapCtx = cv.getContext('2d');
    const g = mapCtx;
    const W = cv.width || 180;
    const H = cv.height || 180;
    const px = (x) => W / 2 + x * 0.45;
    const py = (z) => H / 2 + z * 0.45;
    g.fillStyle = 'rgba(12, 8, 28, 0.92)';
    g.fillRect(0, 0, W, H);
    // District blocks.
    const spots = [
      ['HARBOR', 120, 120, '#2a6f7a'], ['BEACH', 0, 165, '#a8873c'],
      ['UPTOWN', 120, -90, '#5a4a8a'], ['STRIP', 0, 135, '#8a3a5a'],
      ['DOWNTOWN', 0, 0, '#3a3a5a'],
    ];
    g.font = '7px sans-serif';
    g.textAlign = 'center';
    for (const [label, x, z, color] of spots) {
      g.fillStyle = color;
      g.globalAlpha = 0.45;
      g.fillRect(px(x) - 16, py(z) - 10, 32, 20);
      g.globalAlpha = 1;
      g.fillStyle = '#ffd9a0';
      g.fillText(label, px(x), py(z) + 2);
    }
    // Search zone around the last known position while wanted.
    if (wantedLevel() > 0 && S.lastKnown) {
      g.strokeStyle = 'rgba(255, 80, 80, 0.8)';
      g.setLineDash([4, 3]);
      g.beginPath();
      g.arc(px(S.lastKnown.x || 0), py(S.lastKnown.z || 0), 26, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
    // Uncollected packages.
    if (Array.isArray(S.packages)) {
      g.fillStyle = '#ffe14d';
      for (const pk of S.packages) {
        if (!pk || pk.taken || pk.collected) continue;
        const x = pk.x != null ? pk.x : (pk.pos && pk.pos.x);
        const z = pk.z != null ? pk.z : (pk.pos && pk.pos.z);
        if (x == null || z == null) continue;
        g.fillRect(px(x) - 2, py(z) - 2, 4, 4);
      }
    }
    // Vehicles: police red, the rest pale.
    for (const car of (S.cars || [])) {
      if (!car || !car.pos) continue;
      g.fillStyle = car.aiPolice ? '#ff4444' : '#e8e8f0';
      g.beginPath();
      g.arc(px(car.pos.x || 0), py(car.pos.z || 0), car.aiPolice ? 3 : 2, 0, Math.PI * 2);
      g.fill();
    }
    // The player, always on top.
    if (S.player && S.player.pos) {
      g.fillStyle = '#ffb347';
      g.beginPath();
      g.arc(px(S.player.pos.x || 0), py(S.player.pos.z || 0), 4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fff2cc';
      g.beginPath();
      g.arc(px(S.player.pos.x || 0), py(S.player.pos.z || 0), 6, 0, Math.PI * 2);
      g.stroke();
    }
  }

  let lastObjective = null;
  let lastRosterAt = 0;
  let lastMapAt = 0;
  let prevCarPos = null;
  let prevCarAt = 0;

  function update(dt, t) {
    const now = Date.now();
    // Expire only a toast this HUD set itself.
    if (ownedToast && now > ownedToast.until) {
      const el = $('toast');
      if (el && el.textContent === ownedToast.text) el.textContent = '';
      ownedToast = null;
    }
    // Cash, always a whole-dollar figure.
    const cashEl = $('cash');
    if (cashEl) cashEl.textContent = '$' + Math.trunc(S.cash || 0);
    // District.
    const dEl = $('district');
    if (dEl) dEl.textContent = districtLabel(S.district);
    // Day and clock.
    const dtEl = $('day-time');
    if (dtEl) dtEl.textContent = 'DAY ' + (S.day || 1) + ' ' + clockText() + ' ' + phaseText();
    // Respect.
    const numEl = $('respect-num');
    if (numEl) numEl.textContent = String(S.respect || 0);
    const rankEl = $('respect-rank');
    const title = (S.respectDirector && S.respectDirector.rank && S.respectDirector.rank.title) || 'NOBODY';
    if (rankEl) rankEl.textContent = title;
    // Health: keep the mirrored S.health in step with the player.
    const hp = S.player ? (S.player.health != null ? S.player.health : 100) : (S.health != null ? S.health : 100);
    if (S.player) S.health = hp;
    const fill = $('health-fill');
    if (fill) fill.style.width = Math.max(0, Math.min(100, hp)) + '%';
    // Radio: the station NAME is what the HUD shows; S.radioStation
    // itself stays a numeric index into the station list.
    const names = (Array.isArray(S.radioStations) && S.radioStations.length)
      ? S.radioStations
      : FALLBACK_STATIONS;
    const idx = typeof S.radioStation === 'number' ? S.radioStation : 0;
    const stEl = $('radio-station');
    if (stEl) stEl.textContent = names[((idx % names.length) + names.length) % names.length] || '';
    // Wanted stars.
    const wEl = $('wanted');
    const w = wantedLevel();
    if (wEl) wEl.textContent = w > 0 ? '★'.repeat(Math.min(5, w)) : '';
    // Roster, at most four times a second.
    if (now - lastRosterAt > 250) {
      lastRosterAt = now;
      refreshRoster();
    }
    // Minimap, a few times a second.
    if (now - lastMapAt > 200) {
      lastMapAt = now;
      drawMinimap();
    }
    // Weapon slots.
    const slots = document.querySelectorAll('#weapons .slot');
    const equipped = S.player && S.player.loadout ? (S.player.loadout.equipped || 0) : 0;
    const smgLocked = (S.missionIndex || 0) < 1;
    slots.forEach((slot, i) => {
      const nameEl = slot.querySelector('.slot-name');
      const ammoEl = slot.querySelector('.slot-ammo');
      if (nameEl) nameEl.textContent = SLOT_NAMES[i] || '';
      if (ammoEl) {
        ammoEl.textContent = i === equipped
          ? String(S.player ? (S.player.ammo != null ? S.player.ammo : 0) : 0)
          : String(SLOT_MAGS[i] || 0);
      }
      slot.classList.toggle('active', i === equipped);
      slot.classList.toggle('locked', i === 1 && smgLocked);
    });
    // Speedometer.
    let speed = 0;
    if (S.car) {
      if (typeof S.car.speed === 'number') speed = S.car.speed;
      else if (S.car.pos && prevCarPos) {
        const dx = S.car.pos.x - prevCarPos.x;
        const dz = S.car.pos.z - prevCarPos.z;
        const span = Math.max(0.001, (t || 0) - prevCarAt);
        speed = Math.sqrt(dx * dx + dz * dz) / span;
      }
      if (S.car.pos) {
        prevCarPos = { x: S.car.pos.x, z: S.car.pos.z };
        prevCarAt = t || 0;
      }
    } else {
      prevCarPos = null;
    }
    const spEl = $('speed-num');
    if (spEl) spEl.textContent = String(Math.round(Math.abs(speed)));
    const gearEl = $('speed-gear');
    if (gearEl) {
      if (!S.car) gearEl.textContent = 'N';
      else if (typeof S.car.gear === 'number' || typeof S.car.gear === 'string') gearEl.textContent = String(S.car.gear);
      else {
        const s = Math.abs(speed);
        gearEl.textContent = s < 1 ? 'N' : s < 20 ? '1' : s < 40 ? '2' : s < 60 ? '3' : s < 85 ? '4' : '5';
      }
    }
    const carEl = $('speed-car');
    if (carEl) carEl.textContent = S.car ? String((S.car.name || S.car.kind || 'CAR')).toUpperCase() : 'ON FOOT';
    // Objective line.
    let objective = '';
    if (S.sideActivities && S.sideActivities.race && S.sideActivities.race.active) objective = 'RACE: hit every gate';
    else if (S.sideActivities && S.sideActivities.taxi && S.sideActivities.taxi.active) objective = 'TAXI: deliver the fare';
    else if (S.missions && S.missions.current) objective = S.missions.current.objective || S.missions.current.title || '';
    else objective = 'Explore Solmar Bay';
    if (objective !== lastObjective) {
      lastObjective = objective;
      const oEl = $('objective');
      if (oEl) oEl.textContent = objective;
    }
  }

  ctx.updates = ctx.updates || [];
  ctx.updates.push(update);
}
