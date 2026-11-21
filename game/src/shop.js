// SOLMAR BAY — the MART corner store. F near the store opens the panel
// with one .shop-row per config item; buying applies the item. Rows built
// here are real shop rows (never marked as fallback rows).
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, api, dom } = ctx;

  function buildRows() {
    dom['shop-items'].innerHTML = '';
    for (const item of CONFIG.shop.items) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<div><div class="shop-name">${item.name}</div><div class="shop-desc">${item.desc}</div></div><span class="shop-price">$${item.price}</span>`;
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = 'BUY';
      btn.addEventListener('click', () => {
        if (S.cash < item.price) { api.toast('Not enough cash for that.'); return; }
        S.cash -= item.price;
        if (item.id === 'ammo') {
          S.player.loadout.current().mag = S.player.loadout.current().def.mag;
          api.toast(`Ammo Box bought — magazine refilled (-$${item.price}).`);
        } else {
          S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
          api.toast(`${item.name} bought — healed ${item.heal} HP (-$${item.price}).`);
        }
      });
      row.appendChild(btn);
      dom['shop-items'].appendChild(row);
    }
  }

  function openShop() {
    buildRows();
    dom['shop-panel'].classList.remove('hidden');
  }

  ctx.api.shop = { open: openShop };

  ctx.updates.push(() => {
    if (input.wasPressed('KeyF') && S.mode === 'playing') {
      const d = Math.hypot(S.player.pos.x - CONFIG.shop.x, S.player.pos.z - CONFIG.shop.z);
      if (d <= CONFIG.shop.radius) openShop();
    }
  });
}
