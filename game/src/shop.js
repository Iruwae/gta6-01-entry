// The MART corner store. Press F near the store to open the shop
// panel; each row is one config item with a BUY button. Buying applies
// the item at once: food heals, the ammo box refills the magazine.
// Rows built by this module are NOT marked as fallback rows.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, api, dom } = ctx;

  function buildRows() {
    dom.shopItems.innerHTML = '';
    for (const item of CONFIG.shop) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `<span><span class="shop-name">${item.name}</span><br><span class="shop-desc">${item.desc}</span></span><span class="shop-price">$${item.price}</span>`;
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = 'BUY';
      btn.addEventListener('click', () => {
        if (S.cash < item.price) {
          api.toast('Not enough cash.');
          return;
        }
        S.cash -= item.price;
        if (item.ammo) {
          S.player.loadout.current().mag = S.player.loadout.current().def.mag;
          api.toast(`Bought ${item.name} — magazine refilled.`);
        } else {
          S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
          api.toast(`Bought ${item.name} — healed ${item.heal} HP.`);
        }
      });
      row.appendChild(btn);
      dom.shopItems.appendChild(row);
    }
  }

  function openShop() {
    buildRows();
    dom.shopPanel.classList.remove('hidden');
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyF')) {
      const dx = S.player.pos.x - CONFIG.shopPos.x;
      const dz = S.player.pos.z - CONFIG.shopPos.z;
      if (dx * dx + dz * dz < CONFIG.shopPos.radius * CONFIG.shopPos.radius) {
        openShop();
      }
    }
  });

  ctx.api.openShop = openShop;
}
