// garage.js — store stolen rides, spawn them back (round-5 rebuild, B2).
// KeyG by the garage door (-90,-66, 8 m): in a car it STORES the car
// (kind + tune + colour go into S.garageCars, S.car becomes null, the
// player steps out at the door); on foot it opens #garage-panel with
// one row per stored car and a .garage-spawn button each. Spawning
// rebuilds the same kind with the same tune and puts the player in it.

const DOOR = { x: -90, z: -66 };
const DOOR_RADIUS = 8;

const PERF_BASE = { bike: 38, sedan: 32, sport: 46, pickup: 28 };
const HEALTH_BASE = { bike: 60, sedan: 100, sport: 90, pickup: 130 };

function distTo(pos, x, z) {
  if (!pos) return Infinity;
  return Math.hypot(pos.x - x, pos.z - z);
}

function makePos(x, z) {
  return {
    x, y: 0, z,
    set(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; },
  };
}

function buildCar(kind, tune, color, x, z) {
  const t = tune ? { ...tune } : { engine: 0, armor: 0, nos: false };
  const car = {
    kind,
    tune: t,
    color: color || '#c0c0c0',
    pos: makePos(x, z),
    heading: 0,
    speed: 0,
    health: HEALTH_BASE[kind] || 100,
    maxHealth: HEALTH_BASE[kind] || 100,
    aiPolice: false,
    brain: null,
    perf() {
      return (PERF_BASE[this.kind] || 30) + (this.tune.engine || 0) * 2;
    },
    update() { /* driven by the vehicle loop when present */ },
  };
  return car;
}

export function init(S) {
  if (!Array.isArray(S.garageCars)) S.garageCars = [];
  const panel = document.getElementById('garage-panel');
  const listEl = document.getElementById('garage-list');

  const garage = {
    open: false,

    build() {
      if (!listEl) return;
      listEl.innerHTML = '';
      S.garageCars.forEach((rec, i) => {
        const row = document.createElement('div');
        row.className = 'garage-row';
        row.dataset.index = String(i);
        const label = document.createElement('span');
        label.className = 'garage-name';
        label.textContent = (rec.kind || 'car').toUpperCase() + ' · tune ' + ((rec.tune && rec.tune.engine) || 0);
        const btn = document.createElement('button');
        btn.className = 'garage-spawn';
        btn.type = 'button';
        btn.textContent = 'SPAWN';
        row.appendChild(label);
        row.appendChild(btn);
        listEl.appendChild(row);
      });
    },

    show() {
      garage.build();
      if (panel) panel.classList.remove('hidden');
      garage.open = true;
    },

    hide() {
      if (panel) panel.classList.add('hidden');
      garage.open = false;
    },

    store() {
      if (!S.car) return false;
      const rec = {
        kind: S.car.kind,
        tune: S.car.tune ? { ...S.car.tune } : { engine: 0, armor: 0, nos: false },
        color: S.car.color || '#c0c0c0',
      };
      S.garageCars.push(rec);
      if (Array.isArray(S.cars)) {
        const at = S.cars.indexOf(S.car);
        if (at >= 0) S.cars.splice(at, 1);
      }
      S.car = null;
      // Step out at the garage door so the panel opens right away.
      if (S.player && S.player.pos && S.player.pos.set) S.player.pos.set(DOOR.x, 0, DOOR.z);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Stored the ' + rec.kind + ' in the garage.';
        toast.classList.remove('hidden');
      }
      return true;
    },

    spawn(i) {
      const rec = S.garageCars[i];
      if (!rec) return false;
      let car = null;
      if (typeof S.spawnCar === 'function') {
        try { car = S.spawnCar(rec.kind, { ...rec.tune }, rec.color); } catch (e) { car = null; }
      }
      if (!car) car = buildCar(rec.kind, rec.tune, rec.color, DOOR.x, DOOR.z);
      if (car.pos && car.pos.set) car.pos.set(DOOR.x, 0, DOOR.z);
      if (Array.isArray(S.cars) && !S.cars.includes(car)) S.cars.push(car);
      S.car = car;
      garage.hide();
      return true;
    },
  };

  S.garage = garage;

  if (panel) {
    let closeBtn = panel.querySelector('.garage-close, #garage-close, [data-close]');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.id = 'garage-close';
      closeBtn.className = 'garage-close';
      closeBtn.type = 'button';
      closeBtn.textContent = 'CLOSE';
      panel.appendChild(closeBtn);
    }
    closeBtn.addEventListener('click', () => garage.hide());
  }

  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest ? e.target.closest('.garage-spawn') : null;
      if (!btn) return;
      const row = btn.closest('.garage-row');
      if (!row) return;
      garage.spawn(Number(row.dataset.index));
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyG' || e.repeat) return;
    if (S.mode === 'paused') return;
    if (S.car) {
      if (distTo(S.car.pos, DOOR.x, DOOR.z) <= DOOR_RADIUS) garage.store();
      return;
    }
    if (garage.open) { garage.hide(); return; }
    if (distTo(S.player && S.player.pos, DOOR.x, DOOR.z) <= DOOR_RADIUS) garage.show();
  });

  return garage;
}

export default init;
