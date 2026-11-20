// SOLMAR BAY — HUD refresh (round 7 rebuild, builder D).
// Owns one frame of every on-screen readout: cash, district, clock,
// respect, health, radio, wanted stars, the police roster, the minimap,
// weapon slots, the speedometer and the current objective. Toast text is
// NOT rewritten here — other modules write toasts through
// ctx.api.showToast, and this module never clobbers them.

const DISTRICT_NAMES = {
  harbor: 'HARBOR', beach: 'BEACH', uptown: 'UPTOWN', strip: 'THE STRIP',
  downtown: 'DOWNTOWN', marina: 'MARINA', oldtown: 'OLD TOWN',
};

const MAP_SPOTS = [
  { x: 120, z: 120, label: 'HARBOR' },
  { x: 0, z: 165, label: 'BEACH' },
  { x: 120, z: -90, label: 'UPTOWN' },
  { x: 0, z: 135, label: 'STRIP' },
  { x: 0, z: 0, label: 'DOWNTOWN' },
  { x: -120, z: 60, label: 'MARINA' },
  { x: 60, z: -120, label: 'OLD TOWN' },
];

const MAP_MARKS = [
  { x: -72, z: -60, label: 'M' },
  { x: -90, z: -66, label: 'G' },
  { x: 120, z: -120, label: 'H' },
  { x: 68, z: 60, label: 'T' },
  { x: -60, z: -60, label: 'R' },
];

const SLOT_FALLBACK = ['PISTOL', 'SMG', 'SHOTGUN', 'RIFLE'];
const CLOCK_BASE_MINUTES = 18 * 60 + 28; // day 1 opens at sunset, 18:28

function pad2(n) {
  return String(n).padStart(2, '0');
}

function districtLabel(id) {
  if (!id) return 'SOLMAR BAY';
  const key = String(id).toLowerCase().replace(/[^a-z]/g, '');
  if (DISTRICT_NAMES[key]) return DISTRICT_NAMES[key];
  return String(id).toUpperCase();
}

export function init(ctx) {
  const S = ctx.state;
  const pick = (id) => (ctx.dom && ctx.dom[id]) || document.getElementById(id);
  let mapCtx = null;
  let lastRosterAt = -10;
  let lastRosterKey = '';
  let toastTimer = null;

  ctx.api.showToast = (msg, ms) => {
    try {
      const el = pick('toast');
      if (!el) return;
      el.textContent = String(msg);
      el.classList.remove('hidden');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        try { el.textContent = ''; } catch (e) { /* ignore */ }
      }, ms || 2800);
    } catch (e) { /* never break the loop for a toast */ }
  };

  function wantedLevel() {
    if (typeof S.wanted === 'number') return Math.max(0, Math.min(5, Math.round(S.wanted)));
    const heat = typeof S.heat === 'number' ? S.heat : 0;
    return Math.max(0, Math.min(5, Math.floor(heat / 20)));
  }

  function policeList() {
    try {
      if (Array.isArray(S.cops) && S.cops.length) return S.cops;
    } catch (e) { /* fall through */ }
    try {
      if (Array.isArray(S.cars)) return S.cars.filter((c) => c && c.aiPolice);
    } catch (e) { /* fall through */ }
    return [];
  }

  function vehicleSpeed() {
    const car = S.car;
    if (!car) return 0;
    if (typeof car.speed === 'number') return car.speed;
    if (car.vel && typeof car.vel.length === 'function') return car.vel.length();
    if (car.velocity && typeof car.velocity.length === 'function') return car.velocity.length();
    const vx = car.vx || 0;
    const vz = car.vz || 0;
    return Math.hypot(vx, vz);
  }

  function slotInfo(i) {
    let name = SLOT_FALLBACK[i] || 'WEAPON';
    let ammo = '';
    try {
      const lo = S.player && S.player.loadout;
      const w = lo && lo.weapons && lo.weapons[i];
      if (w) {
        if (w.def && w.def.name) name = w.def.name;
        else if (w.name) name = w.name;
        if (typeof w.ammo === 'number') ammo = String(w.ammo);
      } else if (lo && typeof lo.current === 'function' && i === lo.equipped) {
        const cur = lo.current();
        if (cur && cur.def && cur.def.name) name = cur.def.name;
      }
      if (ammo === '' && lo && i === lo.equipped && S.player && typeof S.player.ammo === 'number') {
        ammo = String(S.player.ammo);
      }
    } catch (e) { /* keep the fallback */ }
    return { name, ammo };
  }

  function drawMinimap() {
    const canvas = pick('minimap');
    if (!canvas || typeof canvas.getContext !== 'function') return;
    if (!mapCtx) mapCtx = canvas.getContext('2d');
    const g = mapCtx;
    if (!g) return;
    const W = canvas.width || 180;
    const H = canvas.height || 180;
    const px = (x) => ((x + 180) / 360) * W;
    const py = (z) => ((z + 180) / 360) * H;

    g.clearRect(0, 0, W, H);
    g.fillStyle = '#1d1230';
    g.fillRect(0, 0, W, H);
    // sea along the top edge
    g.fillStyle = '#274b63';
    g.fillRect(0, 0, W, H * 0.08);
    // road grid
    g.strokeStyle = 'rgba(255, 190, 120, 0.18)';
    g.lineWidth = 1;
    for (let v = -120; v <= 120; v += 60) {
      g.beginPath(); g.moveTo(px(v), 0); g.lineTo(px(v), H); g.stroke();
      g.beginPath(); g.moveTo(0, py(v)); g.lineTo(W, py(v)); g.stroke();
    }
    // district dots + labels
    g.font = '6px sans-serif';
    g.textAlign = 'center';
    for (const d of MAP_SPOTS) {
      g.fillStyle = 'rgba(255, 190, 120, 0.55)';
      g.beginPath(); g.arc(px(d.x), py(d.z), 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255, 220, 170, 0.75)';
      g.fillText(d.label, px(d.x), py(d.z) - 4);
    }
    // place markers (mart, garage, safehouse, taxi, race)
    g.font = 'bold 7px sans-serif';
    for (const m of MAP_MARKS) {
      g.fillStyle = '#ffd166';
      g.fillText(m.label, px(m.x), py(m.z));
    }
    // search zone around the last known position
    if (S.lastKnown && (S.heat || 0) > 0) {
      g.strokeStyle = 'rgba(255, 80, 80, 0.8)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(px(S.lastKnown.x || 0), py(S.lastKnown.z || 0), 13, 0, Math.PI * 2);
      g.stroke();
    }
    // uncollected packages
    try {
      if (Array.isArray(S.packages)) {
        g.fillStyle = '#ffe066';
        for (const p of S.packages) {
          if (p && !p.taken) {
            g.fillRect(px(p.x) - 1.5, py(p.z) - 1.5, 3, 3);
          }
        }
      }
    } catch (e) { /* minimap must not die on packages */ }
    // traffic + police
    try {
      if (Array.isArray(S.cars)) {
        for (const c of S.cars) {
          if (!c || !c.pos) continue;
          if (c.aiPolice) {
            g.fillStyle = '#ff5252';
            g.fillRect(px(c.pos.x) - 2, py(c.pos.z) - 2, 4, 4);
          } else {
            g.fillStyle = 'rgba(255, 255, 255, 0.75)';
            g.beginPath(); g.arc(px(c.pos.x), py(c.pos.z), 1.6, 0, Math.PI * 2); g.fill();
          }
        }
      }
    } catch (e) { /* keep drawing */ }
    // the player, always on top
    try {
      const p = S.player && S.player.pos;
      if (p) {
        g.fillStyle = '#ffb703';
        g.beginPath(); g.arc(px(p.x), py(p.z), 3.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff3d6';
        g.lineWidth = 1;
        g.beginPath(); g.arc(px(p.x), py(p.z), 5.5, 0, Math.PI * 2); g.stroke();
      }
    } catch (e) { /* keep drawing */ }
  }

  function refreshRoster(t) {
    const rosterEl = pick('roster');
    const rowsEl = pick('roster-rows');
    const codeEl = pick('roster-code');
    if (!rosterEl || !rowsEl) return;
    const cops = policeList();
    const w = wantedLevel();
    const key = w + '|' + cops.map((c) => (c.callsign || '?') + ':' + ((c.brain && c.brain.tactic) || '')).join(',');
    const visible = w > 0 || cops.length > 0;
    rosterEl.classList.toggle('hidden', !visible);
    if (!visible) return;
    if (t - lastRosterAt < 0.25 && key === lastRosterKey) return;
    lastRosterAt = t;
    lastRosterKey = key;
    if (codeEl) codeEl.textContent = 'CODE 10-90 — ' + cops.length + ' UNIT' + (cops.length === 1 ? '' : 'S') + ' RESPONDING';
    const playerPos = S.player && S.player.pos;
    while (rowsEl.firstChild) rowsEl.removeChild(rowsEl.firstChild);
    for (const cop of cops) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      let dist = '?';
      try {
        if (cop.pos && playerPos) dist = Math.round(Math.hypot(cop.pos.x - playerPos.x, cop.pos.z - playerPos.z)) + 'm';
      } catch (e) { /* keep ? */ }
      const tactic = (cop.brain && (cop.brain.tactic || cop.brain.state)) || 'PURSUIT';
      row.textContent = (cop.callsign || 'PD-??') + ' • ' + dist + ' • ' + tactic;
      rowsEl.appendChild(row);
    }
  }

  function objectiveText() {
    try {
      const race = S.sideActivities && S.sideActivities.race;
      if (race && race.active) {
        const total = (race.gates && race.gates.length) || 4;
        return 'STREET RACE — hit gate ' + ((race.gateIndex || 0) + 1) + ' of ' + total;
      }
      const taxi = S.sideActivities && S.sideActivities.taxi;
      if (taxi && taxi.active) return 'TAXI FARE — drive your passenger to the destination';
      const cur = S.missions && S.missions.current;
      if (cur) return cur.objective || cur.title || ('JOB: ' + String(cur.id || '').toUpperCase());
      if ((S.missionIndex || 0) > 0) return 'Job done — press P and pick the next job';
      return 'New in town — press P to see the job board';
    } catch (e) {
      return 'Explore Solmar Bay';
    }
  }

  ctx.updates.push((dt, t) => {
    try {
      // cash, formatted like $120
      const cashEl = pick('cash');
      if (cashEl) cashEl.textContent = '$' + Math.round(typeof S.cash === 'number' ? S.cash : 0);

      // district
      const distEl = pick('district');
      if (distEl) distEl.textContent = districtLabel(S.district);

      // day / time — the clock starts at 18:28 and S.time counts minutes
      const clockEl = pick('day-time');
      if (clockEl) {
        const total = CLOCK_BASE_MINUTES + (typeof S.time === 'number' ? S.time : 0);
        const hh = Math.floor(total / 60) % 24;
        const mm = Math.floor(total) % 60;
        let label = 'SUNSET';
        try {
          if (S.dayNight && S.dayNight.phase) label = S.dayNight.phase;
          else if (S.dayNight && typeof S.dayNight.night === 'number' && S.dayNight.night > 0.5) label = 'NIGHT';
        } catch (e) { /* keep SUNSET */ }
        clockEl.textContent = 'DAY ' + (S.day || 1) + ' ' + pad2(hh) + ':' + pad2(mm) + ' ' + label;
      }

      // respect points + rank — the spans carry the numbers; never write
      // textContent onto #respect-line itself, it would wipe those spans
      // out of the DOM and the HUD numbers would vanish.
      const rankTitle = (S.respectDirector && S.respectDirector.rank && S.respectDirector.rank.title) || 'NOBODY';
      const numEl = pick('respect-num');
      if (numEl) numEl.textContent = String(typeof S.respect === 'number' ? S.respect : 0);
      const rankEl = pick('respect-rank');
      if (rankEl) rankEl.textContent = rankTitle;

      // health bar
      const hp = (S.player && typeof S.player.health === 'number')
        ? S.player.health
        : (typeof S.health === 'number' ? S.health : 100);
      const fillEl = pick('health-fill');
      if (fillEl) fillEl.style.width = Math.max(0, Math.min(100, hp)) + '%';
      const barEl = pick('health-bar');
      if (barEl) barEl.setAttribute('data-hp', String(Math.round(hp)));

      // radio station + track
      const stationEl = pick('radio-station');
      const trackEl = pick('radio-track');
      let stationName = '';
      let trackName = '';
      try {
        const stations = ctx.api.radioStations;
        if (Array.isArray(stations) && typeof S.radioStation === 'number' && stations[S.radioStation]) {
          stationName = stations[S.radioStation].name || '';
          trackName = (ctx.api.currentTrack && ctx.api.currentTrack()) || '';
        } else if (typeof S.radioStation === 'string') {
          stationName = S.radioStation;
        }
      } catch (e) { /* keep blank */ }
      if (stationEl && stationName) stationEl.textContent = stationName;
      if (trackEl && trackName) trackEl.textContent = trackName;

      // wanted stars
      const wantedEl = pick('wanted');
      const w = wantedLevel();
      if (wantedEl) wantedEl.textContent = '★'.repeat(w) + '☆'.repeat(5 - w);

      // police roster
      refreshRoster(t);

      // minimap
      drawMinimap();

      // weapon slots
      try {
        const slots = document.querySelectorAll('#weapons .slot');
        const equipped = (S.player && S.player.loadout && typeof S.player.loadout.equipped === 'number')
          ? S.player.loadout.equipped : 0;
        slots.forEach((slot, i) => {
          const info = slotInfo(i);
          const nameEl = slot.querySelector('.slot-name');
          if (nameEl) nameEl.textContent = info.name;
          const ammoEl = slot.querySelector('.slot-ammo');
          if (ammoEl) ammoEl.textContent = info.ammo;
          slot.classList.toggle('active', i === equipped);
        });
      } catch (e) { /* slots are optional per frame */ }

      // speedometer
      const speed = vehicleSpeed();
      const speedEl = pick('speed-num');
      if (speedEl) speedEl.textContent = String(Math.round(speed));
      const gearEl = pick('speed-gear');
      if (gearEl) {
        let gear = 'N';
        if (S.car) {
          if (speed >= 1 && speed < 25) gear = '1';
          else if (speed < 50) gear = '2';
          else if (speed < 75) gear = '3';
          else if (speed < 100) gear = '4';
          else if (speed >= 100) gear = '5';
          else gear = '1';
        }
        gearEl.textContent = gear;
      }
      const carEl = pick('speed-car');
      if (carEl) {
        if (S.car) {
          carEl.textContent = (S.car.displayName || S.car.name || ((S.car.kind || 'CAR').toUpperCase())).trim();
        } else {
          carEl.textContent = 'ON FOOT';
        }
      }

      // objective
      const objEl = pick('objective');
      if (objEl) objEl.textContent = objectiveText();
    } catch (e) {
      // A HUD read must never throw into the main loop.
    }
  });
}
