// SOLMAR BAY — the MART corner store. F near the store opens the shop
// panel with one .shop-row per config item; buying applies the item
// (heal capped at max health, the Ammo Box refills the current magazine).
// Rows built by this module are real shop rows, never fallback rows.
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const { input, dom } = ctx;
  const toast = (m) => ctx.api.toast && ctx.api.toast(m);

  function buildRows() {
    const list = dom['shop-items'];
    if (!list) return;
    list.innerHTML = '';
    for (const item of CONFIG.shopItems) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.dataset.real = '1';
      const name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = item.name;
      const desc = document.createElement('span');
      desc.className = 'shop-desc';
      desc.textContent = item.desc;
      const price = document.createElement('span');
      price.className = 'shop-price';
      price.textContent = `$${item.price}`;
      const buy = document.createElement('button');
      buy.className = 'shop-buy';
      buy.textContent = 'BUY';
      buy.addEventListener('click', () => {
        if (S.cash < item.price) {
          toast('Not enough cash for that.');
          return;
        }
        S.cash -= item.price;
        if (item.ammo) {
          const cur = S.player.loadout.current();
          cur.mag = cur.def.mag;
          toast(`${item.name} bought — magazine refilled.`);
        } else {
          S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
          toast(`${item.name} bought — +${item.heal} health.`);
        }
      });
      row.append(name, desc, price, buy);
      list.appendChild(row);
    }
  }

  function openShop() {
    buildRows();
    dom['shop-panel'].classList.remove('hidden');
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing' || S.cutscene) return;
    if (input.justPressed('KeyF')) {
      const loc = CONFIG.locations.shop;
      const d = Math.hypot(S.player.pos.x - loc.x, S.player.pos.z - loc.z);
      if (d < loc.radius) openShop();
    }
  });

  ctx.api.openShop = openShop;
  ctx.flags.shop = true;
}
