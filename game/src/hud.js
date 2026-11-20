// hud.js — the numbers on screen (round-5 rebuild, builder B2).
// Refreshes every tick: cash with thousand separators, DAY + clock +
// phase, speed / gear / ride, district name, respect points + rank,
// the police roster (only while wanted), and the four weapon slots.
// The dialogue panel belongs to dialogue.js and is left alone here.

const DISTRICT_NAMES = {
  beach: 'BEACH',
  oldtown: 'OLD TOWN',
  downtown: 'DOWNTOWN',
  harbor: 'HARBOR',
  industrial: 'INDUSTRIAL',
  uptown: 'UPTOWN',
  strip: 'THE STRIP',
};

const WEAPON_NAMES = ['PISTOL', 'SMG', 'SHOTGUN', 'RIFLE'];

function fmtCash(n) {
  return '$' + Math.floor(n || 0).toLocaleString('en-US');
}

function clockParts(S) {
  // Prefer the day/night module's own clock when it offers one.
  if (S.dayNight) {
    if (typeof S.dayNight.clock === 'string' && S.dayNight.clock) return { text: S.dayNight.clock, phase: S.dayNight.phase || 'DAY' };
    if (typeof S.dayNight.hour === 'number') {
      const hh = String(Math.floor(S.dayNight.hour) % 24).padStart(2, '0');
      const mm = String(Math.floor(((S.dayNight.hour % 1) * 60))).padStart(2, '0');
      return { text: hh + ':' + mm, phase: S.dayNight.phase || 'DAY' };
    }
  }
  // S.time runs 0..240 per day (6 game-minutes per unit).
  const totalMin = Math.floor(((S.time || 0) % 240) * 6);
  const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const mm = String(totalMin % 60).padStart(2, '0');
  let phase = 'DAY';
  const h = Math.floor(totalMin / 60);
  if (h >= 18 || h < 6) phase = 'NIGHT';
  else if (h >= 16) phase = 'SUNSET';
  if (S.dayNight && S.dayNight.phase) phase = S.dayNight.phase;
  return { text: hh + ':' + mm, phase };
}

function districtName(S) {
  const d = S.district;
  if (!d) return '';
  if (DISTRICT_NAMES[d]) return DISTRICT_NAMES[d];
  return String(d).toUpperCase();
}

function gearFor(S) {
  if (!S.car) return 'N';
  if (typeof S.car.gear !== 'undefined' && S.car.gear !== null) return String(S.car.gear);
  const kmh = Math.abs(S.car.speed || 0) * 3.6;
  if (kmh < 1) return 'N';
  if (kmh < 30) return '1';
  if (kmh < 55) return '2';
  if (kmh < 80) return '3';
  if (kmh < 110) return '4';
  return '5';
}

export function init(S) {
  let lastRosterAt = 0;

  function ensureWeaponSlots() {
    const box = document.getElementById('weapons');
    if (!box) return;
    if (box.querySelectorAll('.slot').length > 0) return;
    WEAPON_NAMES.forEach((name, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.index = String(i);
      slot.textContent = name;
      box.appendChild(slot);
    });
  }

  function refreshRoster(now) {
    const roster = document.getElementById('roster');
    if (!roster) return;
    const wanted = S.wanted || 0;
    if (wanted <= 0) {
      roster.classList.add('hidden');
      return;
    }
    roster.classList.remove('hidden');
    const codeEl = document.getElementById('roster-code');
    if (codeEl) codeEl.textContent = 'CODE ' + wanted;
    // Rebuild at most ~4 Hz; the rows carry live distances + tactics.
    if (now - lastRosterAt < 250) return;
    lastRosterAt = now;
    let cops = [];
    if (Array.isArray(S.cars)) cops = S.cars.filter((c) => c.aiPolice);
    if (!cops.length && Array.isArray(S.cops)) cops = S.cops;
    // Wipe only our own rows, then rebuild.
    roster.querySelectorAll('.roster-row').forEach((r) => r.remove());
    const px = S.player && S.player.pos ? S.player.pos.x : 0;
    const pz = S.player && S.player.pos ? S.player.pos.z : 0;
    for (const cop of cops) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      const call = (cop.callsign || 'PD-00');
      const d = cop.pos ? Math.round(Math.hypot(cop.pos.x - px, cop.pos.z - pz)) : 0;
      const tactic = (cop.brain && cop.brain.tactic) || 'PURSUIT';
      row.textContent = call + ' · ' + d + 'm · ' + tactic;
      roster.appendChild(row);
    }
  }

  function update(dt) {
    const cashEl = document.getElementById('cash');
    if (cashEl) cashEl.textContent = fmtCash(S.cash);

    const dayEl = document.getElementById('day-time');
    if (dayEl) {
      const c = clockParts(S);
      dayEl.textContent = 'DAY ' + (S.day || 1) + ' ' + c.text + ' ' + c.phase;
    }

    const speedNum = document.getElementById('speed-num');
    if (speedNum) {
      const v = S.car ? Math.abs(S.car.speed || 0) * 3.6 : 0;
      speedNum.textContent = String(Math.round(v));
    }
    const gearEl = document.getElementById('speed-gear');
    if (gearEl) gearEl.textContent = gearFor(S);
    const carEl = document.getElementById('speed-car');
    if (carEl) carEl.textContent = S.car && S.car.kind ? String(S.car.kind).toUpperCase() : 'ON FOOT';

    const distEl = document.getElementById('district');
    if (distEl) {
      const name = districtName(S);
      if (name) distEl.textContent = name;
    }

    const respNum = document.getElementById('respect-num');
    if (respNum) respNum.textContent = String(S.respect || 0);
    const respRank = document.getElementById('respect-rank');
    if (respRank) {
      const t = S.respectDirector && S.respectDirector.rank && S.respectDirector.rank.title;
      if (t) respRank.textContent = t;
    }

    refreshRoster(Date.now());

    // Weapon slots: highlight the equipped one, dim the locked ones.
    ensureWeaponSlots();
    const box = document.getElementById('weapons');
    if (box) {
      const equipped = S.player && S.player.loadout ? (S.player.loadout.equipped || 0) : 0;
      const jobs = S.missionIndex || 0;
      box.querySelectorAll('.slot').forEach((slot, i) => {
        slot.classList.toggle('active', i === equipped);
        if (slot.dataset.builtByHud === '1') {
          slot.classList.toggle('locked', jobs < i);
        }
      });
    }
  }

  // Mark slots we built ourselves so the locked styling only applies
  // to them; slots owned by the weapons module keep their own state.
  const weaponsBox = document.getElementById('weapons');
  if (weaponsBox && weaponsBox.querySelectorAll('.slot').length === 0) {
    ensureWeaponSlots();
    weaponsBox.querySelectorAll('.slot').forEach((s) => { s.dataset.builtByHud = '1'; });
  }

  S.hud = { update };

  setInterval(() => {
    try { update(0.2); } catch (e) { /* never break the page */ }
  }, 200);
  if (Array.isArray(S._moduleTicks)) S._moduleTicks.push((dt) => update(dt));

  update(0);
  return S.hud;
}

export default init;
