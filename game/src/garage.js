// garage.js — SOLMAR BAY garage.
// G is the garage key. Driving a car to the garage door and pressing G
// stores it; pressing G on foot near the door opens the panel, where a
// stored car can be spawned back and the current car can be tuned
// (engine, armor, paint, NOS). Stored records stay plain data — the
// live car objects live in a module-local list alongside them.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  const DOOR = { x: -90, z: -66 };
  const PAINTS = ['red', 'orange', 'gold', 'teal', 'purple', 'white'];

  if (!Array.isArray(S.garageCars)) S.garageCars = [];
  const storedCars = [];

  function toast(msg) {
    if (ctx.api && ctx.api.toast) ctx.api.toast(msg, 4000);
    else { const el = $('toast'); if (el) el.textContent = msg; }
  }

  function dist2(ax, az, bx, bz) {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function nearDoor(pos, r) {
    if (!pos) return false;
    return dist2(pos.x || 0, pos.z || 0, DOOR.x, DOOR.z) < r;
  }

  function defaultTune(car) {
    return {
      engine: 0,
      armor: 0,
      paint: (car && (car.tune && car.tune.paint)) || (car && car.color) || 'red',
      nos: !!(car && car.tune && car.tune.nos),
    };
  }

  function storeCar() {
    const car = S.car;
    if (!car) return;
    if (!nearDoor(car.pos, 16)) { toast('Drive to the garage door to store this car.'); return; }
    const rec = {
      kind: car.kind || 'car',
      name: car.name || car.kind || 'car',
      color: car.color || 'red',
      tune: car.tune ? { ...car.tune } : defaultTune(car),
    };
    if (rec.tune.paint == null) rec.tune.paint = rec.color;
    S.garageCars.push(rec);
    storedCars.push(car);
    if (Array.isArray(S.cars)) {
      const i = S.cars.indexOf(car);
      if (i >= 0) S.cars.splice(i, 1);
    }
    if (car.mesh) car.mesh.visible = false;
    S.car = null;
    toast('Stored the ' + rec.kind + ' in the garage.');
    openPanel();
  }

  function spawnCar(i) {
    const rec = S.garageCars[i];
    if (!rec) return;
    const car = storedCars[i];
    if (!car) { toast('That car is gone.'); return; }
    const p = S.player && S.player.pos;
    if (car.pos && typeof car.pos.set === 'function') {
      car.pos.set((p ? p.x : DOOR.x) + 3, 0, (p ? p.z : DOOR.z) + 3);
    } else if (car.pos) {
      car.pos.x = (p ? p.x : DOOR.x) + 3;
      car.pos.z = (p ? p.z : DOOR.z) + 3;
    }
    if (car.mesh) car.mesh.visible = true;
    if (Array.isArray(S.cars) && !S.cars.includes(car)) S.cars.push(car);
    S.car = car;
    S.garageCars.splice(i, 1);
    storedCars.splice(i, 1);
    toast('Spawned the ' + rec.kind + '.');
    buildList();
  }

  function tuneLabel(car) {
    const t = (car && car.tune) || {};
    return 'ENG ' + (t.engine || 0) + ' · ARM ' + (t.armor || 0)
      + ' · ' + (t.paint || car.color || 'red') + (t.nos ? ' · NOS' : '');
  }

  function buyTune(kind) {
    const car = S.car;
    if (!car) { toast('Get in a car to tune it.'); return; }
    if (!car.tune) car.tune = defaultTune(car);
    const costs = { engine: 200, armor: 150, paint: 50, nos: 300 };
    const cost = costs[kind] || 0;
    if ((S.cash || 0) < cost) { toast('Not enough cash for that tune.'); return; }
    if (kind === 'engine' && car.tune.engine >= 3) { toast('Engine is already maxed.'); return; }
    if (kind === 'armor' && car.tune.armor >= 3) { toast('Armor is already maxed.'); return; }
    if (kind === 'nos' && car.tune.nos) { toast('NOS is already fitted.'); return; }
    S.cash -= cost;
    if (kind === 'engine') car.tune.engine = (car.tune.engine || 0) + 1;
    else if (kind === 'armor') car.tune.armor = (car.tune.armor || 0) + 1;
    else if (kind === 'nos') car.tune.nos = true;
    else if (kind === 'paint') {
      const cur = PAINTS.indexOf(car.tune.paint || car.color || 'red');
      const next = PAINTS[(cur + 1) % PAINTS.length];
      car.tune.paint = next;
      car.color = next;
    }
    toast('Tuned: ' + tuneLabel(car));
    buildList();
  }

  function buildList() {
    const list = $('garage-list');
    if (!list) return;
    list.innerHTML = '';
    S.garageCars.forEach((rec, i) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      const label = document.createElement('span');
      label.className = 'garage-name';
      const t = rec.tune || {};
      label.textContent = (rec.name || rec.kind) + ' · ENG ' + (t.engine || 0)
        + ' · ARM ' + (t.armor || 0) + (t.nos ? ' · NOS' : '');
      const btn = document.createElement('button');
      btn.className = 'garage-spawn';
      btn.textContent = 'SPAWN';
      btn.addEventListener('click', () => spawnCar(i));
      row.appendChild(label);
      row.appendChild(btn);
      list.appendChild(row);
    });
    if (!S.garageCars.length) {
      const empty = document.createElement('div');
      empty.className = 'garage-row';
      empty.textContent = 'Garage is empty — store a car at the door with G.';
      list.appendChild(empty);
    }
    // Tuning bench for the car the player is sitting in.
    const panel = $('garage-panel');
    if (panel) {
      const old = panel.querySelector('.garage-tune');
      if (old) old.remove();
      if (S.car) {
        const bench = document.createElement('div');
        bench.className = 'garage-tune';
        const head = document.createElement('div');
        head.textContent = 'TUNING — ' + tuneLabel(S.car);
        bench.appendChild(head);
        const jobs = [
          ['engine', 'ENGINE $200'], ['armor', 'ARMOR $150'],
          ['paint', 'PAINT $50'], ['nos', 'NOS $300'],
        ];
        for (const [kind, label] of jobs) {
          const b = document.createElement('button');
          b.className = 'garage-tune-' + kind;
          b.textContent = label;
          b.addEventListener('click', () => buyTune(kind));
          bench.appendChild(b);
        }
        panel.appendChild(bench);
      }
    }
  }

  function openPanel() {
    buildList();
    const panel = $('garage-panel');
    if (panel) panel.classList.remove('hidden');
  }

  function closePanel() {
    const panel = $('garage-panel');
    if (panel) panel.classList.add('hidden');
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyG') return;
    if (S.mode !== 'playing') return;
    if (S.car) { storeCar(); return; }
    const panel = $('garage-panel');
    const isOpen = panel && !panel.classList.contains('hidden');
    if (isOpen) { closePanel(); return; }
    if (nearDoor(S.player && S.player.pos, 20)) openPanel();
    else toast('Go to the garage door to open the garage.');
  });

  const btnClose = $('btn-close-garage');
  if (btnClose) btnClose.addEventListener('click', closePanel);

  ctx.api = ctx.api || {};
  ctx.api.garage = { storeCar, spawnCar, openPanel, closePanel, buildList, buyTune };
  S.garageDirector = ctx.api.garage;
}
