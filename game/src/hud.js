// hud.js — SOLMAR BAY heads-up display.
// Owns every HUD readout: cash, clock, district, respect, health,
// radio, wanted stars, police roster, weapon slots, speedometer,
// objective line, toast messages and the minimap canvas.
// It only READS shared state and never drives gameplay.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const el = (id) => dom[id] || document.getElementById(id);

  // Station names, in the same order as the radio module cycles them.
  // Index 0 is the sunset station; index 1 is BAYLINE.
  const STATIONS = ['SUNSET FM', 'BAYLINE 101', 'PALM TALK', 'DUSK ROCK', 'MARINA BEATS', 'NIGHT DRIVE'];
  const DISTRICT_NAMES = {
    harbor: 'HARBOR', beach: 'BEACH', uptown: 'UPTOWN', strip: 'THE STRIP',
    downtown: 'DOWNTOWN', marina: 'MARINA', palms: 'PALM HEIGHTS',
    eastside: 'EASTSIDE', oldtown: 'OLD TOWN', docks: 'THE DOCKS',
  };

  // ---- toast ownership -------------------------------------------------
  // The HUD only ever clears a toast that it set itself through api.toast.
  // A toast written by any other module (banter, missions, police) is
  // left completely alone.
  let toastOwned = false;
  let toastUntil = 0;

  function showToast(msg, ms) {
    const t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    toastOwned = true;
    toastUntil = Date.now() + (ms || 4000);
  }

  // ---- small helpers ---------------------------------------------------
  function stationName() {
    const idx = S.radioStation;
    if (typeof idx === 'number') return STATIONS[((idx % 6) + 6) % 6] || STATIONS[0];
    if (typeof idx === 'string' && idx) return idx;
    const api = ctx.api && ctx.api.radio;
    if (api && typeof api.name === 'function') {
      try { return api.name(); } catch (e) { /* fall through */ }
    }
    return STATIONS[0];
  }

  function trackName() {
    const api = ctx.api && ctx.api.radio;
    if (api && typeof api.track === 'function') {
      try { return api.track(); } catch (e) { /* fall through */ }
    }
    return null;
  }

  function clockText() {
    // S.time counts minutes since the 18:28 sunset start of day 1.
    const total = 18 * 60 + 28 + (typeof S.time === 'number' ? S.time : 0);
    const mins = ((total % 1440) + 1440) % 1440;
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    const pad = (n) => String(n).padStart(2, '0');
    let phase = S.dayNight && S.dayNight.phase;
    if (!phase) {
      if (hh >= 21 || hh < 5) phase = 'NIGHT';
      else if (hh >= 18) phase = 'SUNSET';
      else if (hh >= 6) phase = 'DAY';
      else phase = 'DAWN';
    }
    const day = S.day || 1;
    return 'DAY ' + day + ' ' + pad(hh) + ':' + pad(mm) + ' ' + phase;
  }

  function wantedLevel() {
    if (typeof S.wanted === 'number') return Math.max(0, Math.min(5, Math.round(S.wanted)));
    if (typeof S.heat === 'number') return Math.max(0, Math.min(5, Math.floor(S.heat / 20)));
    return 0;
  }

  function weaponSlots() {
    const L = S.player && S.player.loadout;
    const fallback = ['PISTOL', 'SMG', 'SHOTGUN', 'RIFLE'];
    const out = [];
    for (let i = 0; i < 4; i++) {
      let name = fallback[i];
      let ammo = null;
      let locked = false;
      const src = (L && L.weapons && L.weapons[i]) || (L && L.slots && L.slots[i]) || null;
      if (src) {
        if (src.def && src.def.name) name = src.def.name;
        else if (src.name) name = src.name;
        if (typeof src.ammo === 'number') ammo = src.ammo;
        else if (typeof src.mag === 'number') ammo = src.mag;
      }
      if (L && typeof L.current === 'function') {
        try {
          const cur = L.current();
          if (cur && cur.def && cur.def.name === name && typeof S.player.ammo === 'number') ammo = S.player.ammo;
        } catch (e) { /* ignore */ }
      }
      if (i === 1 && typeof S.missionIndex === 'number' && S.missionIndex < 1) locked = true;
      if (L && L.equipped === i && typeof S.player.ammo === 'number') ammo = S.player.ammo;
      out.push({ name, ammo, locked, equipped: !!(L && L.equipped === i) });
    }
    return out;
  }

  // ---- roster ----------------------------------------------------------
  function renderRoster() {
    const panel = el('roster');
    if (!panel) return;
    let cops = [];
    if (Array.isArray(S.cops) && S.cops.length) cops = S.cops;
    else if (Array.isArray(S.cars)) cops = S.cars.filter((c) => c && c.aiPolice);
    const wanted = wantedLevel();
    if (!cops.length && wanted === 0) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');
    const code = el('roster-code');
    if (code) code.textContent = 'DISPATCH 10-80  •  HEAT ' + wanted + '  •  UNITS ' + cops.length;
    const host = el('roster-rows') || panel;
    // Rebuild rows from scratch each refresh so stale officers vanish.
    const rows = host.querySelectorAll('.roster-row');
    rows.forEach((r) => r.remove());
    const px = S.player && S.player.pos ? S.player.pos.x : 0;
    const pz = S.player && S.player.pos ? S.player.pos.z : 0;
    cops.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const dx = c.pos ? c.pos.x - px : 0;
      const dz = c.pos ? c.pos.z - pz : 0;
      const dist = Math.round(Math.sqrt(dx * dx + dz * dz));
      const tactic = (c.brain && c.brain.tactic) || 'PURSUIT';
      row.textContent = (c.callsign || 'PD-??') + '  •  ' + tactic + '  •  ' + dist + 'm';
      host.appendChild(row);
    });
  }

  // ---- minimap ---------------------------------------------------------
  let lastMap = 0;
  function drawMinimap(now) {
    if (now - lastMap < 250) return;
    lastMap = now;
    const cv = el('minimap');
    if (!cv || !cv.getContext) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const W = cv.width || 180;
    const H = cv.height || 180;
    const span = 400; // world units across the map
    const px = (x) => ((x + span / 2) / span) * W;
    const pz = (z) => ((z + span / 2) / span) * H;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#241335';
    g.fillRect(0, 0, W, H);
    // Street grid.
    g.strokeStyle = 'rgba(255,190,120,0.14)';
    g.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      g.beginPath(); g.moveTo((W / 8) * i, 0); g.lineTo((W / 8) * i, H); g.stroke();
      g.beginPath(); g.moveTo(0, (H / 8) * i); g.lineTo(W, (H / 8) * i); g.stroke();
    }
    // Bay water along the top edge.
    g.fillStyle = 'rgba(70,130,180,0.35)';
    g.fillRect(0, 0, W, 14);
    // Search zone around the last known position.
    if (S.lastKnown && typeof S.lastKnown.x === 'number') {
      g.strokeStyle = 'rgba(255,80,80,0.8)';
      g.beginPath();
      g.arc(px(S.lastKnown.x), pz(S.lastKnown.z), 14, 0, Math.PI * 2);
      g.stroke();
    }
    // Packages.
    const pkgs = S.packages || S.packageSpots || [];
    g.fillStyle = '#ffd34d';
    pkgs.forEach((p) => {
      if (p && !p.collected && typeof p.x === 'number') {
        g.fillRect(px(p.x) - 2, pz(p.z) - 2, 4, 4);
      }
    });
    // Traffic and parked cars.
    if (Array.isArray(S.cars)) {
      S.cars.forEach((c) => {
        if (!c || !c.pos) return;
        g.fillStyle = c.aiPolice ? '#ff5252' : 'rgba(255,255,255,0.75)';
        g.fillRect(px(c.pos.x) - 2, pz(c.pos.z) - 2, 4, 4);
      });
    }
    // Player arrow dot.
    if (S.player && S.player.pos) {
      g.fillStyle = '#ffb347';
      g.beginPath();
      g.arc(px(S.player.pos.x), pz(S.player.pos.z), 4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fff2d9';
      g.stroke();
    }
  }

  // ---- main refresh ----------------------------------------------------
  let lastText = 0;
  let lastSpeedPos = null;
  let lastSpeedAt = 0;
  let smoothedSpeed = 0;

  function refresh(dt) {
    const now = Date.now();
    // Toast expiry — only for toasts this HUD set itself.
    if (toastOwned && now > toastUntil) {
      const t = el('toast');
      if (t) { t.textContent = ''; t.classList.add('hidden'); }
      toastOwned = false;
    }
    if (now - lastText < 120) { drawMinimap(now); return; }
    lastText = now;

    const cashEl = el('cash');
    if (cashEl && typeof S.cash === 'number') cashEl.textContent = '$' + Math.round(S.cash).toLocaleString('en-US');

    const distEl = el('district');
    if (distEl && S.district) {
      distEl.textContent = DISTRICT_NAMES[S.district] || String(S.district).toUpperCase();
    }

    const clockEl = el('day-time');
    if (clockEl) clockEl.textContent = clockText();

    if (S.player) {
      const hp = Math.max(0, Math.min(100, S.player.health == null ? 100 : S.player.health));
      const fill = el('health-fill');
      if (fill) fill.style.width = hp + '%';
    }

    const rNum = el('respect-num');
    if (rNum && typeof S.respect === 'number') rNum.textContent = String(S.respect);
    const rank = S.respectDirector && S.respectDirector.rank;
    if (rank && rank.title) {
      const rRank = el('respect-rank');
      if (rRank) rRank.textContent = rank.title;
      // #respect-line holds the #respect-num / #respect-rank spans:
      // writing textContent here would destroy them, so the line's
      // text is left to those two spans (set just above).
    }

    const rs = el('radio-station');
    if (rs) rs.textContent = stationName();
    const rt = el('radio-track');
    if (rt) {
      const tr = trackName();
      if (tr) rt.textContent = tr;
    }

    const wantedEl = el('wanted');
    if (wantedEl) {
      const w = wantedLevel();
      wantedEl.textContent = w > 0 ? '★'.repeat(w) + '☆'.repeat(5 - w) : '';
    }

    // Weapon slots.
    const slots = weaponSlots();
    const host = el('weapons');
    if (host) {
      let slotEls = host.querySelectorAll('.slot');
      slots.forEach((s, i) => {
        let slot = slotEls[i];
        if (!slot) {
          slot = document.createElement('div');
          slot.className = 'slot';
          const nm = document.createElement('div'); nm.className = 'slot-name';
          const am = document.createElement('div'); am.className = 'slot-ammo';
          slot.appendChild(nm); slot.appendChild(am);
          host.appendChild(slot);
        }
        const nm = slot.querySelector('.slot-name');
        const am = slot.querySelector('.slot-ammo');
        if (nm) nm.textContent = s.name;
        if (am) am.textContent = s.locked ? 'LOCKED' : (s.ammo == null ? '—' : String(s.ammo));
        slot.classList.toggle('active', s.equipped);
        slot.classList.toggle('locked', s.locked);
      });
    }

    // Speedometer: prefer the car's own speed, fall back to position delta.
    let speed = 0;
    let gear = 'P';
    let carName = 'ON FOOT';
    if (S.car) {
      carName = (S.car.name || S.car.kind || 'CAR').toString().toUpperCase();
      if (typeof S.car.speed === 'number') speed = Math.abs(S.car.speed);
      else if (S.car.pos && lastSpeedPos) {
        const dx = S.car.pos.x - lastSpeedPos.x;
        const dz = S.car.pos.z - lastSpeedPos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (dt > 0) speed = d / dt;
      }
      if (S.car.pos) lastSpeedPos = { x: S.car.pos.x, z: S.car.pos.z };
      if (typeof S.car.gear === 'string') gear = S.car.gear;
      else if (speed < 1) gear = 'N';
      else if (speed < 25) gear = '1';
      else if (speed < 50) gear = '2';
      else if (speed < 80) gear = '3';
      else gear = '4';
    } else {
      lastSpeedPos = null;
      if (S.player && S.player.pos) {
        // On foot the player still moves; show a gentle walking speed.
        speed = 0;
      }
    }
    smoothedSpeed = smoothedSpeed * 0.6 + speed * 0.4;
    const sn = el('speed-num');
    if (sn) sn.textContent = String(Math.round(smoothedSpeed));
    const sg = el('speed-gear');
    if (sg) sg.textContent = gear;
    const sc = el('speed-car');
    if (sc) sc.textContent = carName;

    // Objective line.
    const obj = el('objective');
    if (obj) {
      const cur = S.missions && S.missions.current;
      if (cur) obj.textContent = cur.objective || cur.desc || cur.title || '';
      else if (typeof S.missionIndex === 'number' && S.missionIndex === 0) obj.textContent = 'Head to the garage — Vic has work.';
      else obj.textContent = 'Explore Solmar Bay. Build respect.';
    }

    renderRoster();
    drawMinimap(now);
  }

  ctx.api.toast = showToast;
  ctx.api.showToast = showToast;
  ctx.api.setObjective = (text) => {
    const obj = el('objective');
    if (obj && text) obj.textContent = text;
  };
  ctx.api.hud = { refresh, toast: showToast, stations: STATIONS.slice() };

  if (Array.isArray(ctx.updates)) ctx.updates.push((dt) => { try { refresh(dt || 0.016); } catch (e) { /* HUD must never crash the loop */ } });
}
