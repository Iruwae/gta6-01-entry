// garage.js — the garage at the downtown lock-up.
//
// G does two things, depending on where you are:
//   - in a car, parked by the garage door: the car goes into storage
//     and the panel opens so you can see it listed;
//   - anywhere else: the panel opens or closes so you can browse
//     stored cars, spawn one back out, sell one, or tune one.
//
// A stored car keeps its kind, its paint, its health and its whole
// tune, so spawning it back is the same car you put away. Tuning is
// bought per stored car: engine and armor in three steps, a paint
// cycle, and a one-off NOS kit.

const TUNE_COST = { engine: 150, armor: 120, paint: 80, nos: 200 };
const TUNE_MAX = 3;

// Paints the garage can spray, by kind. The first entry is the
// factory colour a car spawns with most often; cycling wraps around.
const PAINT_SHOP = {
  sport: [0xc22e2e, 0xe8a33d, 0x27408b, 0x222222, 0x0e7490],
  bike: [0x1d1d22, 0xc22e2e, 0x2e6f73, 0xe8a33d],
  pickup: [0x7a5a34, 0x4a5a3a, 0x8a97a8, 0xc22e2e],
  sedan: [0x8a97a8, 0x5b6b7a, 0xb8b0a0, 0x3f4a3a, 0xc22e2e],
};

function tuneSummary(tune) {
  const t = tune || {};
  const bits = [];
  if (t.engine > 0) bits.push('ENG ' + t.engine);
  if (t.armor > 0) bits.push('ARM ' + t.armor);
  if (t.nos) bits.push('NOS');
  return bits.length > 0 ? bits.join(' · ') : 'STOCK';
}

function labelFor(kind, S) {
  const spec = S.config && S.config.vehicles && S.config.vehicles[kind];
  if (spec && spec.label) return spec.label;
  return String(kind || 'CAR').toUpperCase();
}

export function init(S) {
  const anchors = (S.config && S.config.anchors) || {};
  const door = anchors.garage || { x: -90, z: -66 };
  const panel = document.getElementById('garage-panel');
  const listEl = document.getElementById('garage-list');
  const closeBtn = document.getElementById('btn-close-garage');

  if (!Array.isArray(S.garageCars)) S.garageCars = [];

  let prevKeys = {};
  let open = false;

  const garage = {
    get open() { return open; },
    storeCurrent,
    spawnStored,
    sellStored,
    tuneStored,
    openPanel,
    closePanel,
    rebuild,
  };

  function nearDoor(pos) {
    if (!pos) return false;
    const dx = pos.x - door.x;
    const dz = pos.z - door.z;
    return dx * dx + dz * dz <= 10 * 10;
  }

  function openPanel() {
    open = true;
    rebuild();
    if (panel) panel.classList.remove('hidden');
  }

  function closePanel() {
    open = false;
    if (panel) panel.classList.add('hidden');
  }

  function valueOf(rec) {
    if (S.fenceDirector && typeof S.fenceDirector.priceFor === 'function') {
      return S.fenceDirector.priceFor({ kind: rec.kind, tune: rec.tune || {} });
    }
    const base = { bike: 220, sport: 480, pickup: 350, sedan: 300 };
    return base[rec.kind] || 200;
  }

  // One row per stored car: name, value, tune summary, and the four
  // actions — spawn, sell, and the tuning buttons.
  function rebuild() {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (S.garageCars.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'garage-row';
      empty.textContent = 'No cars stored — park by the garage door and press G.';
      listEl.appendChild(empty);
      return;
    }
    S.garageCars.forEach((rec, i) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      row.dataset.index = String(i);

      const name = document.createElement('span');
      name.className = 'garage-name';
      name.textContent = labelFor(rec.kind, S) + ' — ' + tuneSummary(rec.tune);
      row.appendChild(name);

      const price = document.createElement('span');
      price.className = 'garage-price';
      price.textContent = '$' + valueOf(rec);
      row.appendChild(price);

      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.dataset.index = String(i);
      row.appendChild(spawn);

      const sell = document.createElement('button');
      sell.className = 'garage-sell';
      sell.textContent = 'SELL';
      sell.dataset.index = String(i);
      row.appendChild(sell);

      const tuneBox = document.createElement('span');
      tuneBox.className = 'garage-tune';
      const mkTune = (kind, label) => {
        const b = document.createElement('button');
        b.className = 'garage-tune-' + kind;
        b.dataset.index = String(i);
        b.dataset.tune = kind;
        b.textContent = label + ' $' + TUNE_COST[kind];
        tuneBox.appendChild(b);
      };
      mkTune('engine', 'ENGINE');
      mkTune('armor', 'ARMOR');
      mkTune('paint', 'PAINT');
      mkTune('nos', 'NOS');
      row.appendChild(tuneBox);

      listEl.appendChild(row);
    });
  }

  // Park the car you are sitting in. The car leaves S.cars (and the
  // street), its mesh leaves the scene, and you end up on foot by the
  // door with the panel open.
  function storeCurrent() {
    const car = S.car;
    if (!car) return false;
    const rec = {
      kind: car.kind,
      color: car.color,
      health: car.health,
      maxHealth: car.maxHealth,
      tune: {
        engine: (car.tune && car.tune.engine) || 0,
        armor: (car.tune && car.tune.armor) || 0,
        paint: (car.tune && car.tune.paint) || 0,
        nos: !!(car.tune && car.tune.nos),
      },
    };
    const at = S.cars.indexOf(car);
    if (at >= 0) S.cars.splice(at, 1);
    if (car.mesh && S.scene && typeof S.scene.remove === 'function') {
      S.scene.remove(car.mesh);
    }
    S.car = null;
    S.garageCars.push(rec);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'STORED: ' + labelFor(rec.kind, S) + ' in the garage';
      toast.classList.remove('hidden');
    }
    openPanel();
    return true;
  }

  // Bring a stored car back out beside the garage door, tune and all.
  // The car factory is S.spawnCar(kind, tune, color, x, z) — it
  // builds the ride, puts its mesh in the scene and registers it in
  // S.cars, and returns it. (The older S.makeCar(kind, x, z) factory
  // is kept as a fallback for the same job.)
  function spawnStored(i) {
    const rec = S.garageCars[i];
    if (!rec) return false;
    const tune = {
      engine: (rec.tune && rec.tune.engine) || 0,
      armor: (rec.tune && rec.tune.armor) || 0,
      nos: !!(rec.tune && rec.tune.nos),
    };
    let car = null;
    if (typeof S.spawnCar === 'function') {
      car = S.spawnCar(rec.kind, tune, rec.color, door.x + 4, door.z);
      if (car) {
        car.heading = 0.4;
        if (typeof rec.health === 'number') car.health = rec.health;
        if (typeof rec.maxHealth === 'number') car.maxHealth = rec.maxHealth;
      }
    } else if (typeof S.makeCar === 'function') {
      car = S.makeCar(rec.kind, door.x + 4, door.z, 0.4);
      car.tune = {
        engine: tune.engine,
        armor: tune.armor,
        paint: (rec.tune && rec.tune.paint) || 0,
        nos: tune.nos,
      };
      if (rec.color !== undefined) car.color = rec.color;
      if (typeof rec.health === 'number') car.health = rec.health;
      if (typeof rec.maxHealth === 'number') car.maxHealth = rec.maxHealth;
      if (!S.cars.includes(car)) S.cars.push(car);
    }
    if (!car) return false;
    S.car = car;
    if (S.player && S.player.pos) {
      S.player.pos.set(car.pos.x, 0, car.pos.z);
      S.player.heading = car.heading;
    }
    S.garageCars.splice(i, 1);
    closePanel();
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'SPAWNED: ' + labelFor(rec.kind, S);
      toast.classList.remove('hidden');
    }
    return true;
  }

  function sellStored(i) {
    const rec = S.garageCars[i];
    if (!rec) return false;
    const price = valueOf(rec);
    S.cash = (S.cash || 0) + price;
    S.garageCars.splice(i, 1);
    rebuild();
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'SOLD: ' + labelFor(rec.kind, S) + ' +$' + price;
      toast.classList.remove('hidden');
    }
    return true;
  }

  // One tuning step on a stored car. Engine and armor cap at three,
  // paint cycles the shop palette, NOS is a single fit.
  function tuneStored(i, kind) {
    const rec = S.garageCars[i];
    if (!rec || !TUNE_COST[kind]) return false;
    if (!rec.tune) rec.tune = { engine: 0, armor: 0, paint: 0, nos: false };
    const cost = TUNE_COST[kind];
    if ((S.cash || 0) < cost) {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Not enough cash for that tune ($' + cost + ')';
        toast.classList.remove('hidden');
      }
      return false;
    }
    if (kind === 'engine' || kind === 'armor') {
      if (rec.tune[kind] >= TUNE_MAX) return false;
      rec.tune[kind] += 1;
    } else if (kind === 'paint') {
      const palette = PAINT_SHOP[rec.kind] || PAINT_SHOP.sedan;
      const next = ((rec.tune.paint || 0) + 1) % palette.length;
      rec.tune.paint = next;
      rec.color = palette[next];
    } else if (kind === 'nos') {
      if (rec.tune.nos) return false;
      rec.tune.nos = true;
    }
    S.cash -= cost;
    rebuild();
    return true;
  }

  // G, edge-triggered: store the car when parked at the door, otherwise
  // just toggle the panel. Never fires while paused or mid-cutscene.
  function tick() {
    const keys = S.keys || {};
    const pressed = !!keys.KeyG && !prevKeys.KeyG;
    prevKeys = { ...keys };
    if (!pressed) return;
    if (S.mode !== 'playing' || S.cutscene) return;
    if (S.car && nearDoor(S.car.pos)) {
      storeCurrent();
      return;
    }
    if (open) closePanel();
    else openPanel();
  }

  // One delegated listener for every button the rows build, so rows
  // rebuilt by tune/sell keep working without rebinding.
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest
      ? e.target.closest('.garage-spawn, .garage-sell, [data-tune], #btn-close-garage')
      : null;
    if (!t) return;
    if (t.id === 'btn-close-garage') {
      closePanel();
      return;
    }
    const i = Number(t.dataset.index);
    if (t.classList.contains('garage-spawn')) spawnStored(i);
    else if (t.classList.contains('garage-sell')) sellStored(i);
    else if (t.dataset.tune) tuneStored(i, t.dataset.tune);
  });

  S._tick.push(tick);
  S.garage = garage;
  return garage;
}

export default init;
