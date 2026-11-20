// SOLMAR BAY — garage (round 7 rebuild, builder D).
// Park at the garage door and press G in a car to store it; press G on
// foot at the same door to open the garage panel, which lists every
// stored car with a spawn button and tuning buttons. Tuning costs cash
// and improves the car: engine, armor, paint, NOS.

const GARAGE = { x: -90, z: -66 };
const GARAGE_RADIUS = 16;
const PAINTS = ['Sunset Orange', 'Midnight Purple', 'Harbor Teal', 'Bay Cream', 'Crimson'];
const TUNE_COSTS = { engine: 250, armor: 200, paint: 100, nos: 300 };

function dist2d(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

function ensureTune(car) {
  if (!car.tune || typeof car.tune !== 'object') {
    car.tune = { engine: 0, armor: 0, paint: 0, nos: 0 };
  }
  if (typeof car.tune.engine !== 'number') car.tune.engine = 0;
  if (typeof car.tune.armor !== 'number') car.tune.armor = 0;
  if (typeof car.tune.nos !== 'number') car.tune.nos = 0;
  return car.tune;
}

function carLabel(car) {
  const kind = (car.kind || 'car').toUpperCase();
  const color = car.color || (typeof car.tune === 'object' && car.tune.paint !== undefined
    ? PAINTS[car.tune.paint % PAINTS.length] : '');
  return color ? kind + ' — ' + color : kind;
}

export function init(ctx) {
  const S = ctx.state;
  const pick = (id) => (ctx.dom && ctx.dom[id]) || document.getElementById(id);
  const show = (id) => { const el = pick(id); if (el) el.classList.remove('hidden'); };
  const hide = (id) => { const el = pick(id); if (el) el.classList.add('hidden'); };
  const toast = (msg) => { try { if (ctx.api.showToast) ctx.api.showToast(msg); } catch (e) { /* silent */ } };
  const click = () => { try { if (ctx.api.audio && ctx.api.audio.click) ctx.api.audio.click(); } catch (e) { /* silent */ } };

  function nearGarage(pos) {
    if (!pos) return false;
    return dist2d(pos.x, pos.z, GARAGE.x, GARAGE.z) < GARAGE_RADIUS;
  }

  function storeCar() {
    const car = S.car;
    if (!car) return false;
    ensureTune(car);
    if (!Array.isArray(S.garageCars)) S.garageCars = [];
    S.garageCars.push(car);
    try {
      if (Array.isArray(S.cars)) {
        const i = S.cars.indexOf(car);
        if (i >= 0) S.cars.splice(i, 1);
      }
    } catch (e) { /* the car is still stored either way */ }
    try { if (car.mesh) car.mesh.visible = false; } catch (e) { /* ignore */ }
    S.car = null;
    try {
      if (S.player && S.player.pos) S.player.pos.set(GARAGE.x + 2, 0, GARAGE.z + 2);
    } catch (e) { /* keep the player where they are */ }
    toast('Car stored in the garage.');
    return true;
  }

  function spawnCar(i) {
    if (!Array.isArray(S.garageCars)) return false;
    const car = S.garageCars[i];
    if (!car) return false;
    S.garageCars.splice(i, 1);
    ensureTune(car);
    try {
      if (car.pos && typeof car.pos.set === 'function') car.pos.set(GARAGE.x + 5, 0, GARAGE.z + 5);
    } catch (e) { /* keep its stored position */ }
    try { if (car.mesh) car.mesh.visible = true; } catch (e) { /* ignore */ }
    try {
      if (Array.isArray(S.cars) && !S.cars.includes(car)) S.cars.push(car);
    } catch (e) { /* ignore */ }
    S.car = car;
    hide('garage-panel');
    toast(carLabel(car) + ' is ready to roll.');
    return true;
  }

  function tuneCar(car, kind) {
    const cost = TUNE_COSTS[kind];
    if (typeof cost !== 'number') return false;
    if ((S.cash || 0) < cost) {
      toast('Not enough cash for that tune-up.');
      return false;
    }
    const tune = ensureTune(car);
    if (kind === 'engine') tune.engine += 1;
    else if (kind === 'armor') tune.armor += 1;
    else if (kind === 'nos') tune.nos = Math.min(3, tune.nos + 1);
    else if (kind === 'paint') {
      tune.paint = ((typeof tune.paint === 'number' ? tune.paint : 0) + 1) % PAINTS.length;
      car.color = PAINTS[tune.paint];
      try {
        if (car.mesh && car.mesh.material && car.mesh.material.color) {
          car.mesh.material.color.set(PAINTS[tune.paint] === 'Sunset Orange' ? 0xff7a2f
            : PAINTS[tune.paint] === 'Midnight Purple' ? 0x6b3fa0
            : PAINTS[tune.paint] === 'Harbor Teal' ? 0x2fa39a
            : PAINTS[tune.paint] === 'Bay Cream' ? 0xf2e3c6 : 0xc22430);
        }
      } catch (e) { /* paint is cosmetic only */ }
    }
    S.cash -= cost;
    toast('Tuned ' + kind.toUpperCase() + ' — $' + cost + '.');
    try { if (ctx.api.audio && ctx.api.audio.pickup) ctx.api.audio.pickup(); } catch (e) { /* silent */ }
    return true;
  }

  function buildPanel() {
    const list = pick('garage-list');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    const stored = Array.isArray(S.garageCars) ? S.garageCars : [];
    if (!stored.length) {
      const empty = document.createElement('div');
      empty.className = 'garage-empty';
      empty.textContent = 'No cars stored yet. Drive one to the garage door and press G.';
      list.appendChild(empty);
      return;
    }
    stored.forEach((car, i) => {
      ensureTune(car);
      const row = document.createElement('div');
      row.className = 'garage-row';
      const name = document.createElement('span');
      name.className = 'garage-name';
      name.textContent = carLabel(car);
      const tune = document.createElement('span');
      tune.className = 'garage-tune';
      tune.textContent = 'ENG ' + car.tune.engine + ' • ARM ' + car.tune.armor + ' • NOS ' + car.tune.nos;
      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.addEventListener('click', () => { click(); spawnCar(i); });
      row.appendChild(name);
      row.appendChild(tune);
      row.appendChild(spawn);
      for (const kind of ['engine', 'armor', 'paint', 'nos']) {
        const btn = document.createElement('button');
        btn.className = 'tune-btn tune-' + kind;
        btn.textContent = kind.toUpperCase() + ' $' + TUNE_COSTS[kind];
        btn.addEventListener('click', () => {
          click();
          if (tuneCar(car, kind)) buildPanel();
        });
        row.appendChild(btn);
      }
      list.appendChild(row);
    });
  }

  function openGarage() {
    buildPanel();
    show('garage-panel');
  }

  function closeGarage() {
    hide('garage-panel');
  }

  ctx.api.openGarage = openGarage;
  ctx.api.closeGarage = closeGarage;
  ctx.api.storeCar = storeCar;
  ctx.api.spawnCar = spawnCar;
  ctx.api.tuneCar = tuneCar;
  ctx.api.garagePos = GARAGE;

  const btnClose = pick('btn-close-garage');
  if (btnClose) btnClose.addEventListener('click', () => { click(); closeGarage(); });

  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.code !== 'KeyG') return;
    if (S.mode !== 'playing') return;
    const panel = pick('garage-panel');
    const panelOpen = panel && !panel.classList.contains('hidden');
    if (S.car) {
      if (nearGarage(S.car.pos)) {
        click();
        storeCar();
      }
      return;
    }
    const playerPos = S.player && S.player.pos;
    if (!nearGarage(playerPos)) {
      if (panelOpen) closeGarage();
      return;
    }
    click();
    if (panelOpen) closeGarage();
    else openGarage();
  });
}
