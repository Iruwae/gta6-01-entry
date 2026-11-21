// SOLMAR BAY — garage. G with a car at the door stores it; G on foot near
// the door opens the panel, where a stored car can be spawned back and the
// current car can be tuned (engine, armor, paint, NOS change perf()).
export function init(ctx) {
  const { state: S, input, config, api } = ctx;
  const panel = document.getElementById('garage-panel');
  const list = document.getElementById('garage-list');
  const paints = ['#ff2e63', '#ffb347', '#5fb4c9', '#7ec98a', '#b48ce8', '#e8e8e8'];

  function buildList() {
    list.innerHTML = '';
    if (S.garageCars.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'garage-row';
      empty.textContent = 'Garage is empty — drive a car to the door and press G.';
      list.appendChild(empty);
      return;
    }
    S.garageCars.forEach((rec, i) => {
      const row = document.createElement('div');
      row.className = 'garage-row';
      const name = document.createElement('span');
      name.className = 'garage-name';
      name.textContent = `${rec.kind.toUpperCase()} — perf ${Math.round(
        (config.vehicleKinds[rec.kind].perf || 0) + (rec.tune.engine || 0) * 2 + (rec.tune.nos || 0) * 4
      )}`;
      row.appendChild(name);
      const spawn = document.createElement('button');
      spawn.className = 'garage-spawn';
      spawn.textContent = 'SPAWN';
      spawn.addEventListener('click', () => {
        const car = ctx.api.createVehicle(rec.kind, config.garage.x + 4, config.garage.z, 0);
        car.tune = { ...rec.tune };
        car.health = rec.health ?? car.maxHealth;
        S.cars.push(car);
        S.car = car;
        panel.classList.add('hidden');
        api.toast(`Spawned your ${rec.kind} from the garage.`);
      });
      row.appendChild(spawn);
      for (const attr of ['engine', 'armor', 'nos', 'paint']) {
        const b = document.createElement('button');
        b.className = 'garage-tune';
        b.dataset.attr = attr;
        b.textContent = `${attr.toUpperCase()} ${(attr === 'paint' ? rec.tune.paint : '+' + (rec.tune[attr] || 0))}`;
        b.addEventListener('click', () => {
          if (attr === 'paint') {
            const idx = paints.indexOf(rec.tune.paint);
            rec.tune.paint = paints[(idx + 1) % paints.length];
          } else {
            rec.tune[attr] = (rec.tune[attr] || 0) + 1;
          }
          if (S.car) S.car.tune = { ...rec.tune };
          api.toast(`${rec.kind} ${attr} upgraded.`);
          buildList();
        });
        row.appendChild(b);
      }
      list.appendChild(row);
      void i;
    });
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyG')) return;
    const px = S.car ? S.car.pos.x : S.player.pos.x;
    const pz = S.car ? S.car.pos.z : S.player.pos.z;
    const d = Math.hypot(px - config.garage.x, pz - config.garage.z);
    if (d > config.garage.radius + 2) return;
    if (S.car) {
      const car = S.car;
      S.garageCars.push({
        kind: car.kind,
        tune: { ...car.tune },
        health: car.health,
        maxHealth: car.maxHealth,
      });
      const idx = S.cars.indexOf(car);
      if (idx >= 0) S.cars.splice(idx, 1);
      if (car.mesh) ctx.scene.remove(car.mesh);
      S.car = null;
      api.toast(`Stored the ${car.kind} in your garage.`);
    } else {
      buildList();
      panel.classList.remove('hidden');
    }
  });
  ctx.api.garageLoaded = true;
  ctx.api.openGarage = () => {
    buildList();
    panel.classList.remove('hidden');
  };
}

export default { init };
