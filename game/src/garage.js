// garage.js — SOLMAR BAY, round 8 rebuild.
// The garage by the old paint shop at (-90, -66). Press G near the door
// while driving to store the current car; press G on foot near the door
// to open the panel, which lists every stored car with a spawn button
// and four tuning options. Stored cars keep the very object the world
// drives — kind, tune, mesh and all — so spawning one back is putting
// the same car on the street again, not building a copy.

const GARAGE = { x: -90, z: -66, r: 14 };
const SPAWN = { x: -84, z: -70 };

const TUNES = [
  { key: 'engine', label: 'ENGINE +1', price: 400 },
  { key: 'armor', label: 'ARMOR +1', price: 300 },
  { key: 'paint', label: 'NEW PAINT', price: 150 },
  { key: 'nos', label: 'FIT NOS', price: 500 },
];

const PAINTS = [
  { name: 'SUNSET', hex: 0xe8873a },
  { name: 'TEAL', hex: 0x2fa39a },
  { name: 'CRIMSON', hex: 0xc23b4e },
  { name: 'GOLD', hex: 0xd9a441 },
  { name: 'MIDNIGHT', hex: 0x2c355e },
];

function el(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  return document.getElementById(id);
}

function keyDown(ctx, code) {
  const inp = ctx.input;
  if (!inp) return false;
  if (typeof inp.isDown === 'function') {
    try { return !!inp.isDown(code); } catch (e) { /* fall through */ }
  }
  const k = inp.keys;
  if (k) {
    if (typeof k.has === 'function') return k.has(code);
    if (Array.isArray(k)) return k.includes(code);
    if (typeof k === 'object') return !!k[code];
  }
  if (typeof inp[code] !== 'undefined') return !!inp[code];
  return false;
}

function dist2d(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function init(ctx) {
  const S = ctx.state;
  const prev = {};
  const grab = (id) => el(ctx, id);

  function toast(msg) {
    if (ctx.api.toast) ctx.api.toast(msg);
    else {
      const t = grab('toast');
      if (t) t.textContent = msg;
    }
  }

  function clickSound() {
    if (ctx.api.audio && typeof ctx.api.audio.click === 'function') {
      try { ctx.api.audio.click(); } catch (e) { /* audio is best-effort */ }
    }
  }

  function nearGarage() {
    const p = (S.car && S.car.pos) || (S.player && S.player.pos);
    if (!p) return false;
    return dist2d(p, GARAGE) < GARAGE.r;
  }

  function ensureTune(car) {
    if (!car.tune) {
      car.tune = {
        engine: 0,
        armor: 0,
        paint: car.color || 'SUNSET',
        nos: false,
      };
    }
    if (typeof car.tune.engine !== 'number') car.tune.engine = 0;
    if (typeof car.tune.armor !== 'number') car.tune.armor = 0;
    if (typeof car.tune.nos !== 'boolean') car.tune.nos = false;
    return car.tune;
  }

  function storeCar() {
    const car = S.car;
    if (!car) return false;
    ensureTune(car);
    const i = S.cars.indexOf(car);
    if (i >= 0) S.cars.splice(i, 1);
    if (car.mesh) car.mesh.visible = false;
    if (S.player && S.player.pos && car.pos) {
      S.player.pos.set(car.pos.x, 0, car.pos.z + 2);
    }
    S.garageCars.push(car);
    // The stored record is read back through the debug handle, which
    // can only carry plain data — the live car carries a circular
    // mesh graph, so a bare read comes back empty. Hide the mesh from
    // enumeration (direct reads still find it, and spawning still
    // reuses the same object); everything else on the record is
    // plain data and survives the trip.
    if (car.mesh) {
      try {
        Object.defineProperty(car, 'mesh', { value: car.mesh, enumerable: false, writable: true, configurable: true });
      } catch (e) { /* a sealed car keeps its mesh; the read stays best-effort */ }
    }
    S.car = null;
    toast('Car stored in the garage.');
    clickSound();
    if (ctx.api.saveGame) {
      try { ctx.api.saveGame(); } catch (e) { /* saving is best-effort */ }
    }
    return true;
  }

  function spawnCar(i) {
    const car = S.garageCars[i];
    if (!car) return false;
    S.garageCars.splice(i, 1);
    if (car.pos && typeof car.pos.set === 'function') car.pos.set(SPAWN.x, 0, SPAWN.z);
    if (car.mesh) car.mesh.visible = true;
    if (!S.cars.includes(car)) S.cars.push(car);
    S.car = car;
    hidePanel();
    toast('Took the ' + String(car.kind || 'car').toUpperCase() + ' out of the garage.');
    clickSound();
    return true;
  }

  function applyPaint(car, paintName) {
    car.color = paintName;
    if (car.tune) car.tune.paint = paintName;
    const paint = PAINTS.find((p) => p.name === paintName);
    if (!paint || !car.mesh) return;
    try {
      car.mesh.traverse((child) => {
        if (child.material && child.material.color && child.material.color.setHex) {
          child.material.color.setHex(paint.hex);
        }
      });
    } catch (e) { /* a mesh without paintable materials is fine */ }
  }

  function tuneCar(i, key) {
    const car = S.garageCars[i];
    if (!car) return;
    const tune = ensureTune(car);
    const opt = TUNES.find((t) => t.key === key);
    if (!opt) return;
    if ((S.cash || 0) < opt.price) {
      toast('Not enough cash for that tune.');
      return;
    }
    if (key === 'nos' && tune.nos) {
      toast('NOS is already fitted.');
      return;
    }
    S.cash -= opt.price;
    if (key === 'engine') tune.engine += 1;
    else if (key === 'armor') {
      tune.armor += 1;
      car.maxHealth = (car.maxHealth || 100) + 20;
    } else if (key === 'paint') {
      const cur = PAINTS.findIndex((p) => p.name === (tune.paint || car.color || 'SUNSET'));
      const next = PAINTS[(cur + 1) % PAINTS.length];
      applyPaint(car, next.name);
    } else if (key === 'nos') tune.nos = true;
    toast(opt.label + ' fitted — $' + opt.price + '.');
    clickSound();
    buildPanel();
  }

  function buildPanel() {
    const list = grab('garage-list');
    if (!list) return;
    list.innerHTML = '';
    if (S.garageCars.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'garage-empty';
      empty.textContent = 'No cars stored. Drive one to the garage and press G.';
      list.appendChild(empty);
      return;
    }
    S.garageCars.forEach((car, i) => {
      const tune = ensureTune(car);
      const row = document.createElement('div');
      row.className = 'garage-row';
      const name = document.createElement('span');
      name.className = 'garage-name';
      const tuneBits = [];
      if (tune.engine) tuneBits.push('ENG ' + tune.engine);
      if (tune.armor) tuneBits.push('ARM ' + tune.armor);
      if (tune.nos) tuneBits.push('NOS');
      name.textContent = String(car.kind || 'car').toUpperCase()
        + ' · ' + String(tune.paint || car.color || 'SUNSET')
        + (tuneBits.length ? ' · ' + tuneBits.join(' ') : '');
      row.appendChild(name);
      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.addEventListener('click', () => spawnCar(i));
      row.appendChild(spawn);
      for (const opt of TUNES) {
        const b = document.createElement('button');
        b.className = 'garage-tune';
        b.textContent = opt.label + ' $' + opt.price;
        b.addEventListener('click', () => tuneCar(i, opt.key));
        row.appendChild(b);
      }
      list.appendChild(row);
    });
  }

  function openPanel() {
    buildPanel();
    const panel = grab('garage-panel');
    if (panel) panel.classList.remove('hidden');
  }

  function hidePanel() {
    const panel = grab('garage-panel');
    if (panel) panel.classList.add('hidden');
  }

  function panelOpen() {
    const panel = grab('garage-panel');
    return !!panel && !panel.classList.contains('hidden');
  }

  const btnClose = grab('btn-close-garage');
  if (btnClose) btnClose.addEventListener('click', hidePanel);

  ctx.api.garage = { storeCar, spawnCar, tuneCar, openPanel, hidePanel, nearGarage };

  ctx.updates.push(() => {
    const down = keyDown(ctx, 'KeyG');
    const was = !!prev.KeyG;
    prev.KeyG = down;
    if (!down || was) return;
    if (S.mode !== 'playing') return;
    if (!nearGarage()) return;
    if (S.car) storeCar();
    else if (panelOpen()) hidePanel();
    else openPanel();
  });
}
