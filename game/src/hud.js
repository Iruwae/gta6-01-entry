// SOLMAR BAY — on-screen readouts: cash, district, clock, respect, health,
// radio, wanted stars, police roster, minimap, weapon slots, speedometer,
// objective. Runs from the boot hub's frame loop via ctx.updates.
export function init(ctx) {
  const { state: S, config, dom } = ctx;
  const mapCanvas = dom.minimap;
  const mapCtx = mapCanvas ? mapCanvas.getContext('2d') : null;
  let rosterT = 0;
  let mapT = 0;

  function districtName(id) {
    const d = config.districts.find((x) => x.id === id);
    return d ? d.name : id.toUpperCase();
  }

  function updateHud() {
    if (dom.cash) dom.cash.textContent = '$' + Math.floor(S.cash).toLocaleString('en-US');
    if (dom.district) dom.district.textContent = districtName(S.district);
    if (dom.dayTime) {
      const total = config.dayStartMinutes + Math.floor(S.time);
      const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
      const mm = String(total % 60).padStart(2, '0');
      dom.dayTime.textContent = `DAY ${S.day} ${hh}:${mm} ${S.dayNight.phase}`;
    }
    if (dom.respectNum) dom.respectNum.textContent = String(Math.floor(S.respect));
    if (dom.respectRank) dom.respectRank.textContent = S.respectDirector.rank.title;
    if (dom.healthFill) dom.healthFill.style.width = Math.max(0, Math.min(100, S.player.health)) + '%';
    if (dom.radioStation) dom.radioStation.textContent = config.radioStations[S.radioStation].name;
    if (dom.radioTrack) {
      const st = config.radioStations[S.radioStation];
      const track = st.tracks[Math.floor(S.time / 45) % st.tracks.length];
      dom.radioTrack.textContent = `${track.title} — ${track.artist}`;
    }
    if (dom.wanted) {
      dom.wanted.classList.toggle('hidden', S.wanted === 0);
      dom.wanted.textContent = '★'.repeat(S.wanted) + '☆'.repeat(5 - S.wanted);
    }
    if (dom.weapons) {
      const slots = dom.weapons.querySelectorAll('.slot');
      slots.forEach((slot, i) => {
        const def = config.weapons[i];
        const nameEl = slot.querySelector('.slot-name');
        const ammoEl = slot.querySelector('.slot-ammo');
        if (nameEl) nameEl.textContent = def.name;
        if (ammoEl) ammoEl.textContent = String(S.player.loadout.slots[i].mag);
        slot.classList.toggle('on', S.player.loadout.equipped === i);
      });
    }
    const speed = S.car ? Math.abs(S.car.speed) : Math.hypot(S.player.vel.x, S.player.vel.z);
    if (dom.speedNum) dom.speedNum.textContent = String(Math.round(speed));
    if (dom.speedGear) {
      const v = Math.abs(speed);
      dom.speedGear.textContent = v < 0.5 ? 'N' : v < 10 ? '1' : v < 20 ? '2' : v < 30 ? '3' : v < 45 ? '4' : '5';
    }
    if (dom.speedCar) dom.speedCar.textContent = S.car ? S.car.kind.toUpperCase() : 'ON FOOT';
    if (dom.objective) dom.objective.textContent = S.missions.current ? S.missions.current.desc : config.defaultObjective;
  }

  function updateRoster(dt) {
    rosterT += dt;
    if (rosterT < 0.25) return;
    rosterT = 0;
    if (!dom.roster) return;
    const cops = S.cops && S.cops.length ? S.cops : S.cars.filter((c) => c.aiPolice);
    if (!cops.length) {
      dom.roster.classList.add('hidden');
      return;
    }
    dom.roster.classList.remove('hidden');
    if (dom.rosterCode) dom.rosterCode.textContent = `DISPATCH 10-80 — ${S.wanted} STAR(S)`;
    if (dom.rosterRows) {
      dom.rosterRows.innerHTML = '';
      for (const c of cops) {
        const row = document.createElement('div');
        row.className = 'roster-row';
        const cs = document.createElement('b');
        cs.textContent = c.callsign || 'PD-??';
        const tac = document.createElement('span');
        tac.textContent = (c.brain && c.brain.tactic) || 'PURSUIT';
        const dist = Math.round(Math.hypot(c.pos.x - S.player.pos.x, c.pos.z - S.player.pos.z));
        const dEl = document.createElement('span');
        dEl.textContent = dist + ' m';
        row.append(cs, tac, dEl);
        dom.rosterRows.appendChild(row);
      }
    }
  }

  function updateMinimap(dt) {
    mapT += dt;
    if (mapT < 0.14 || !mapCtx) return;
    mapT = 0;
    const W = 180;
    const H = 180;
    const sx = (x) => 90 + x * 0.45;
    const sy = (z) => 90 + z * 0.45;
    mapCtx.fillStyle = '#160d26';
    mapCtx.fillRect(0, 0, W, H);
    for (const d of config.districts) {
      mapCtx.fillStyle = d.color;
      mapCtx.beginPath();
      mapCtx.arc(sx(d.x), sy(d.z), 3, 0, Math.PI * 2);
      mapCtx.fill();
    }
    if (S.wanted > 0 && S.lastKnown) {
      mapCtx.strokeStyle = '#ff4444';
      mapCtx.beginPath();
      mapCtx.arc(sx(S.lastKnown.x), sy(S.lastKnown.z), 12, 0, Math.PI * 2);
      mapCtx.stroke();
    }
    for (const p of S.packages) {
      if (p.taken) continue;
      mapCtx.fillStyle = '#ffd24d';
      mapCtx.fillRect(sx(p.x) - 2, sy(p.z) - 2, 4, 4);
    }
    for (const c of S.cars) {
      mapCtx.fillStyle = c.aiPolice ? '#4488ff' : '#dddddd';
      mapCtx.fillRect(sx(c.pos.x) - 2, sy(c.pos.z) - 2, 4, 4);
    }
    if (S.heli) {
      mapCtx.fillStyle = '#ff2222';
      mapCtx.beginPath();
      mapCtx.arc(sx(S.heli.pos.x), sy(S.heli.pos.z), 4, 0, Math.PI * 2);
      mapCtx.fill();
    }
    mapCtx.fillStyle = '#ffb347';
    mapCtx.beginPath();
    mapCtx.arc(sx(S.player.pos.x), sy(S.player.pos.z), 4, 0, Math.PI * 2);
    mapCtx.fill();
  }

  ctx.updates.push((dt) => {
    updateHud();
    updateRoster(dt);
    updateMinimap(dt);
  });
  ctx.api.hudLoaded = true;
}

export default { init };
