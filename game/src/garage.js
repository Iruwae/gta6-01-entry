// SOLMAR BAY — the garage: store a car (G while driving), spawn it back,
// and tune the current ride (engine, armor, paint, NOS).
import { CONFIG } from './config.js';
import { makeVehicle } from './vehicles.js';

const PAINTS = [0xffb347, 0xff7a9e, 0x5fb4c9, 0x7ec98a, 0xb48ce8, 0xe8a34c, 0xf2d492];

export function init(ctx) {
  const { THREE: T, scene } = ctx;
  const S = ctx.state;
  const input = ctx.input;
  const dom = ctx.dom;
  const panel = dom['garage-panel'];
  const list = dom['garage-list'];

  function nearDoor(pos) {
    return Math.hypot(pos.x - CONFIG.garage.x, pos.z - CONFIG.garage.z) <= CONFIG.garage.radius + 2;
  }

  function storeCar(car) {
    S.garageCars.push({
      kind: car.kind,
      tune: { ...car.tune },
      health: car.health,
      maxHealth: car.maxHealth,
      color: car.color,
    });
    const i = S.cars.indexOf(car);
    if (i >= 0) S.cars.splice(i, 1);
    if (car.mesh && car.mesh.parent) car.mesh.parent.remove(car.mesh);
    S.car = null;
    ctx.api.toast(`Stored the ${car.kind} in the garage.`);
  }

  function spawnCar(rec) {
    const car = makeVehicle(T, rec.kind, CONFIG.garage.x + 4, CONFIG.garage.z + 4, 0);
    car.tune = { ...rec.tune };
    car.health = rec.health ?? car.maxHealth;
    car.color = rec.color ?? car.color;
    if (car.mesh.userData.bodyMat) car.mesh.userData.bodyMat.color.setHex(car.color);
    S.cars.push(car);
    scene.add(car.mesh);
    const i = S.garageCars.indexOf(rec);
    if (i >= 0) S.garageCars.splice(i, 1);
    S.car = car;
    if (ctx.playerMesh) ctx.playerMesh.visible = false;
    ctx.api.toast(`Took the ${car.kind} out of the garage.`);
    buildPanel();
  }

  function tuneBtn(label, cost, apply, disabled) {
    const b = document.createElement('button');
    b.className = 'garage-tune';
    b.textContent = `${label} — $${cost}`;
    b.disabled = !!disabled;
    b.addEventListener('click', () => {
      if (!S.car) return;
      if (S.cash < cost) {
        ctx.api.toast('Not enough cash for that tune.');
        return;
      }
      S.cash -= cost;
      apply(S.car);
      ctx.api.toast(`${label} fitted.`);
      buildPanel();
    });
    return b;
  }

  function buildPanel() {
    list.innerHTML = '';
    if (S.garageCars.length === 0 && !S.car) {
      const empty = document.createElement('div');
      empty.className = 'garage-empty';
      empty.textContent = 'Garage is empty. Drive a car to the door and press G to store it.';
      list.appendChild(empty);
      return;
    }
    for (const rec of [...S.garageCars]) {
      const row = document.createElement('div');
      row.className = 'garage-row';
      const name = document.createElement('span');
      name.className = 'garage-name';
      name.textContent = `${rec.kind.toUpperCase()} — perf ${rec.tune.engine * 3 + (rec.tune.nos ? 8 : 0) + (CONFIG.vehicleStats[rec.kind]?.perf || 0)}`;
      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.addEventListener('click', () => spawnCar(rec));
      row.append(name, spawn);
      list.appendChild(row);
    }
    if (S.car) {
      const tuneRow = document.createElement('div');
      tuneRow.className = 'garage-tune-row';
      const title = document.createElement('div');
      title.className = 'garage-tune-title';
      title.textContent = `TUNE YOUR ${S.car.kind.toUpperCase()}`;
      tuneRow.appendChild(title);
      tuneRow.appendChild(tuneBtn(`ENGINE LV ${S.car.tune.engine + 1}`, 100, (c) => { c.tune.engine += 1; }, S.car.tune.engine >= 3));
      tuneRow.appendChild(tuneBtn(`ARMOR LV ${S.car.tune.armor + 1}`, 100, (c) => { c.tune.armor += 1; c.maxHealth += 20; c.health += 20; }, S.car.tune.armor >= 3));
      tuneRow.appendChild(tuneBtn(S.car.tune.nos ? 'REMOVE NOS' : 'FIT NOS', 200, (c) => { c.tune.nos = !c.tune.nos; }, false));
      tuneRow.appendChild(tuneBtn('REPAINT', 50, (c) => {
        c.tune.paint = (c.tune.paint + 1) % PAINTS.length;
        c.color = PAINTS[c.tune.paint];
        if (c.mesh.userData.bodyMat) c.mesh.userData.bodyMat.color.setHex(c.color);
      }, false));
      list.appendChild(tuneRow);
    }
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyG')) return;
    const pos = S.car ? S.car.pos : S.player.pos;
    if (!nearDoor(pos)) return;
    if (S.car) {
      storeCar(S.car);
    } else {
      buildPanel();
      panel.classList.remove('hidden');
    }
  });

  return { storeCar, spawnCar, buildPanel };
}

export default init;
