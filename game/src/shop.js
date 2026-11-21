// SOLMAR BAY — the MART corner store. F near the store opens the panel;
// buying applies the item (heal, or refill the current magazine).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, dom } = ctx;
  ctx.shopLoaded = true;

  function buildRows() {
    const list = dom['shop-items'];
    if (!list) return;
    list.innerHTML = '';
    for (const item of CONFIG.shop) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<span class="shop-name">${item.name}</span>` +
        `<span class="shop-desc">${item.desc}</span>` +
        `<span class="shop-price">$${item.price}</span>` +
        `<button class="shop-buy" type="button">BUY</button>`;
      row.querySelector('.shop-buy').addEventListener('click', () => buy(item, row));
      list.appendChild(row);
    }
  }

  function buy(item, row) {
    if (S.cash < item.price) {
      ctx.api.toast('Not enough cash.');
      return;
    }
    S.cash -= item.price;
    if (item.ammo) {
      S.player.loadout.current().mag = S.player.loadout.current().def.mag;
      ctx.api.toast(`${item.name} bought — magazine refilled.`);
    } else {
      S.player.health = Math.min(100, S.player.health + item.heal);
      ctx.api.toast(`${item.name} bought — +${item.heal} HP.`);
    }
    if (row) row.classList.add('bought');
  }

  ctx.api.openShop = function openShop() {
    buildRows();
    dom['shop-panel'].classList.remove('hidden');
  };

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyF')) {
      const d = Math.hypot(S.player.pos.x - CONFIG.shopPos.x, S.player.pos.z - CONFIG.shopPos.z);
      if (d <= CONFIG.shopPos.radius) ctx.api.openShop();
    }
  });
  ctx.shopReady = true;
}
