// The MART corner store. F near the store opens #shop-panel with one
// .shop-row per config item; buying applies the item. Rows built by this
// module are NOT marked as fallback rows.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, dom } = ctx;

  function openShop() {
    dom['shop-items'].innerHTML = '';
    for (const item of CONFIG.shop.items) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<span class="shop-name">${item.name}</span><span class="shop-desc">${item.desc}</span><span class="shop-price">$${item.price}</span>`;
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = 'BUY';
      btn.addEventListener('click', () => ctx.api.applyShopItem(item));
      row.appendChild(btn);
      dom['shop-items'].appendChild(row);
    }
    dom['shop-panel'].classList.remove('hidden');
  }

  ctx.updates.push(() => {
    if (input.wasPressed('KeyF')) {
      const dx = S.player.pos.x - CONFIG.shop.x;
      const dz = S.player.pos.z - CONFIG.shop.z;
      if (dx * dx + dz * dz < CONFIG.shop.radius * CONFIG.shop.radius) openShop();
    }
  });
}
