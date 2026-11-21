// SOLMAR BAY — the MART corner store. F near the store opens the shop
// panel with one .shop-row per config item (name, description, price,
// BUY button); buying applies the item — heal capped at max health,
// the Ammo Box refills the current magazine. Rows built by this module
// are never marked as fallback rows.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, dom } = ctx;
  const panel = dom['shop-panel'];
  const list = dom['shop-items'];

  function buy(item) {
    if (S.cash < item.price) {
      ctx.api.toast('Not enough cash.');
      return;
    }
    S.cash -= item.price;
    if (item.ammo) {
      const cur = S.player.loadout.current();
      cur.mag = cur.def.mag;
      ctx.api.toast(`${item.name} — magazine refilled.`);
    } else {
      S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
      ctx.api.toast(`${item.name} — +${item.heal} HP.`);
    }
  }

  function buildRows() {
    if (!list) return;
    list.innerHTML = '';
    for (const item of CONFIG.shop.items) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<span class="shop-name">${item.name}</span><span class="shop-desc">${item.desc}</span><span class="shop-price">$${item.price}</span>`;
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = 'BUY';
      btn.addEventListener('click', () => buy(item));
      row.appendChild(btn);
      list.appendChild(row);
    }
  }

  ctx.updates.push((dt) => {
    if (S.mode !== 'playing') return;
    if (!input.wasPressed('KeyF')) return;
    const dx = S.player.pos.x - CONFIG.shop.x;
    const dz = S.player.pos.z - CONFIG.shop.z;
    if (dx * dx + dz * dz <= CONFIG.shop.radius * CONFIG.shop.radius) {
      buildRows();
      if (panel) panel.classList.remove('hidden');
    }
  });
}
