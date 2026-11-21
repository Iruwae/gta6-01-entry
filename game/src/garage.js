// SOLMAR BAY — the garage. G stores the car you drove to the door;
// G on foot near the door opens the panel, where a stored car can be
// spawned back (button class garage-spawn) and the current car tuned
// (engine, armor, paint, NOS — tuning changes perf() and is kept on the
// stored record).
import { CONFIG } from './config.js';

const PAINTS = ['#ffb347', '#ff7a9e', '#5fb4c9', '#7ec98a', '#e8a34c', '#b48ce8'];

export function init(ctx) {
  const { scene, state: S, input, api, dom } = ctx;

  function storeCurrentCar() {
    const car = S.car;
    if (!car) return;
    const record = {
      kind: car.kind,
      health: car.health,
      maxHealth: car.maxHealth,
      tune: { ...car.tune },
      color: car.color,
    };
    scene.remove(car.mesh);
    S.cars = S.cars.filter((c) => c !== car);
    S.car = null;
    S.garageCars.push(record);
    api.toast(`Stored the ${record.kind} in the garage.`);
  }

  function buildPanel() {
    dom['garage-list'].innerHTML = '';
    if (S.garageCars.length === 0 && !S.car) {
      const empty = document.createElement('div');
      empty.className = 'garage-row';
      empty.textContent = 'Garage is empty — drive a car to the door and press G to store it.';
      dom['garage-list'].appendChild(empty);
    }
    S.garageCars.forEach((rec, i) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      row.innerHTML = `<div><div class="shop-name">${rec.kind.toUpperCase()}</div><div class="shop-desc">Engine ${rec.tune.engine || 0} · Armor ${rec.tune.armor || 0} · NOS ${rec.tune.nos ? 'yes' : 'no'}</div></div>`;
      const btn = document.createElement('button');
      btn.className = 'garage-spawn';
      btn.textContent = 'SPAWN';
      btn.addEventListener('click', () => {
        const car = ctx.api.makeVehicle(rec.kind, CONFIG.garageDoor.x + 4, CONFIG.garageDoor.z + 4, rec.tune);
        car.health = rec.health ?? car.maxHealth;
        S.garageCars.splice(i, 1);
        S.car = car;
        S.player.pos.copy(car.pos);
        S.player.heading = car.heading;
        dom['garage-panel'].classList.add('hidden');
        api.toast(`Spawned the ${rec.kind} from the garage.`);
      });
      row.appendChild(btn);
      dom['garage-list'].appendChild(row);
    });
    // Tuning for the current car.
    if (S.car) {
      const car = S.car;
      const row = document.createElement('div');
      row.className = 'garage-row';
      row.innerHTML = `<div><div class="shop-name">TUNE — ${car.kind.toUpperCase()}</div><div class="shop-desc">Engine ${car.tune.engine || 0} · Armor ${car.tune.armor || 0} · NOS ${car.tune.nos ? 'yes' : 'no'} · Perf ${car.perf()}</div></div>`;
      const mkBtn = (label, fn) => {
        const b = document.createElement('button');
        b.className = 'garage-tune';
        b.textContent = label;
        b.addEventListener('click', () => { fn(); buildPanel(); });
        row.appendChild(b);
      };
      mkBtn('ENGINE +', () => { car.tune.engine = Math.min(3, (car.tune.engine || 0) + 1); api.toast(`Engine tuned to ${car.tune.engine}. Perf ${car.perf()}.`); });
      mkBtn('ARMOR +', () => {
        car.tune.armor = Math.min(3, (car.tune.armor || 0) + 1);
        car.maxHealth = (CONFIG.vehicleStats[car.kind] || {}).maxHealth + car.tune.armor * 20;
        car.health = Math.min(car.maxHealth, car.health + 20);
        api.toast(`Armor tuned to ${car.tune.armor}.`);
      });
      mkBtn('NOS', () => { car.tune.nos = !car.tune.nos; api.toast(car.tune.nos ? 'NOS installed.' : 'NOS removed.'); });
      mkBtn('PAINT', () => {
        const idx = PAINTS.indexOf(car.tune.paint);
        car.tune.paint = PAINTS[(idx + 1) % PAINTS.length];
        car.color = car.tune.paint;
        api.toast('New paint job.');
      });
      dom['garage-list'].appendChild(row);
    }
  }

  ctx.updates.push(() => {
    if (!input.wasPressed('KeyG') || S.mode !== 'playing') return;
    const door = CONFIG.garageDoor;
    if (S.car) {
      if (Math.hypot(S.car.pos.x - door.x, S.car.pos.z - door.z) <= door.radius) {
        storeCurrentCar();
      }
    } else {
      if (Math.hypot(S.player.pos.x - door.x, S.player.pos.z - door.z) <= door.radius) {
        buildPanel();
        dom['garage-panel'].classList.remove('hidden');
      }
    }
  });
}
