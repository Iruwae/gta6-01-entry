// The garage (G). Driving a car to the garage door and pressing G stores
// it; pressing G on foot near the door opens #garage-panel, where a stored
// car can be spawned back (button class garage-spawn) and tuned.
import { CONFIG } from './config.js';
import { createCar } from './vehicles.js';

export function init(ctx) {
  const { state: S, input, dom, scene } = ctx;

  function nearDoor(ref) {
    const dx = ref.pos.x - CONFIG.garage.x;
    const dz = ref.pos.z - CONFIG.garage.z;
    return dx * dx + dz * dz < CONFIG.garage.radius * CONFIG.garage.radius;
  }

  function openPanel() {
    dom['garage-list'].innerHTML = '';
    S.garageCars.forEach((rec) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      row.innerHTML = `<span><b>${rec.kind.toUpperCase()}</b> — perf ${rec.perf || ''}</span>`;
      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.addEventListener('click', () => {
        const car = createCar(ctx, rec.kind, CONFIG.garage.x, CONFIG.garage.z - 4);
        car.tune = { ...(rec.tune || { nos: 0, engine: 0, armor: 0, paint: 0 }) };
        car.health = rec.health ?? car.maxHealth;
        S.cars.push(car);
        S.car = car;
        S.player.pos.set(car.pos.x, 0, car.pos.z);
        ctx.api.toast(`${rec.kind} is back on the street.`);
      });
      row.appendChild(spawn);
      const tune = document.createElement('button');
      tune.className = 'tune-btn';
      tune.textContent = 'TUNE +ENGINE';
      tune.addEventListener('click', () => {
        rec.tune.engine = (rec.tune.engine || 0) + 1;
        ctx.api.toast(`${rec.kind} tuned: engine ${rec.tune.engine}.`);
      });
      row.appendChild(tune);
      dom['garage-list'].appendChild(row);
    });
    dom['garage-panel'].classList.remove('hidden');
  }

  ctx.updates.push(() => {
    if (!input.wasPressed('KeyG')) return;
    if (S.car && nearDoor(S.car)) {
      const car = S.car;
      S.garageCars.push({
        kind: car.kind,
        tune: { ...car.tune },
        health: car.health,
        maxHealth: car.maxHealth,
        perf: car.perf(),
      });
      const i = S.cars.indexOf(car);
      if (i >= 0) S.cars.splice(i, 1);
      if (car.mesh) scene.remove(car.mesh);
      S.car = null;
      ctx.api.toast(`${car.kind} stored in the garage.`);
    } else if (!S.car && nearDoor(S.player)) {
      openPanel();
    }
  });
}
