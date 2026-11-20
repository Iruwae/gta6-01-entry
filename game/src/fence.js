// fence.js — Vic Torres' price board (round-5 rebuild, builder B2).
// S.fenceDirector = { priceFor(car), wantedBonus(car) }.
// Prices are deterministic from kind + engine tune, so a quote never
// drifts between the board and the sale: bike 400, sedan 600, sport
// 1200, pickup 800, plus $100 per engine level. With heat on the car
// Vic pays a 10% danger bonus. KeyV in a car in Vic's yard (110,138)
// sells it on the spot.

const VIC_YARD = { x: 110, z: 138 };
const YARD_RADIUS = 8;

const BASE_PRICE = { bike: 400, sedan: 600, sport: 1200, pickup: 800 };
const ENGINE_STEP = 100;
const WANTED_BONUS_RATE = 0.10;

export function init(S) {
  function priceFor(car) {
    if (!car) return 0;
    const base = BASE_PRICE[car.kind] || 500;
    const engine = (car.tune && typeof car.tune.engine === 'number') ? car.tune.engine : 0;
    return base + engine * ENGINE_STEP;
  }

  function wantedBonus(car) {
    if (!car) return 0;
    if ((S.wanted || 0) <= 0) return 0;
    return Math.round(priceFor(car) * WANTED_BONUS_RATE);
  }

  function sell() {
    if (!S.car) return false;
    const car = S.car;
    const total = priceFor(car) + wantedBonus(car);
    S.cash = (S.cash || 0) + total;
    if (!S.stats) S.stats = {};
    S.stats.fencesSold = (S.stats.fencesSold || 0) + 1;
    if (Array.isArray(S.cars)) {
      const at = S.cars.indexOf(car);
      if (at >= 0) S.cars.splice(at, 1);
    }
    S.car = null;
    // Step out in the yard.
    if (S.player && S.player.pos && S.player.pos.set) S.player.pos.set(VIC_YARD.x, 0, VIC_YARD.z);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'Vic bought the ' + car.kind + ' for $' + total + '.';
      toast.classList.remove('hidden');
    }
    if (S.banterDirector && typeof S.banterDirector.fenceSale === 'function') {
      S.banterDirector.fenceSale();
    }
    return true;
  }

  S.fenceDirector = { priceFor, wantedBonus, sell };

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyV' || e.repeat) return;
    if (S.mode === 'paused') return;
    if (!S.car || !S.car.pos) return;
    const d = Math.hypot(S.car.pos.x - VIC_YARD.x, S.car.pos.z - VIC_YARD.z);
    if (d <= YARD_RADIUS) sell();
  });

  return S.fenceDirector;
}

export default init;
