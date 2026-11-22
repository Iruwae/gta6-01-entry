// The MART corner store. F near the store opens the shop panel.
import { CONFIG } from './config.js';

export function init(ctx) {
  const { state: S, input, dom } = ctx;
  ctx.shopLoaded = true;
  const panel = dom['shop-panel'];
  const list = dom['shop-items'];
  // Build one row per config item. These rows are NOT fallback rows.
  list.innerHTML = '';
  for (const item of CONFIG.shop.items) {
    const row = document.createElement('div');
    row.className = 'shop-row';
    const name = document.createElement('span');
    name.className = 'shop-name';
    name.textContent = item.name;
    const desc = document.createElement('span');
    desc.className = 'shop-desc';
    desc.textContent = item.desc;
    const price = document.createElement('span');
    price.className = 'shop-price';
    price.textContent = `$${item.price}`;
    const btn = document.createElement('button');
    btn.className = 'shop-buy';
    btn.textContent = 'BUY';
    btn.addEventListener('click', () => {
      if (S.cash < item.price) {
        if (ctx.api.toast) ctx.api.toast('Not enough cash.');
        return;
      }
      S.cash -= item.price;
      if (item.ammo) {
        S.player.loadout.current().mag = S.player.loadout.current().def.mag;
        if (ctx.api.toast) ctx.api.toast(`Ammo Box: magazine refilled. -$${item.price}`);
      } else {
        S.player.health = Math.min(CONFIG.maxHealth, S.player.health + item.heal);
        if (ctx.api.toast) ctx.api.toast(`${item.name}: +${item.heal} HP. -$${item.price}`);
      }
      if (ctx.audio) ctx.audio.cash();
    });
    row.append(name, desc, price, btn);
    list.appendChild(row);
  }
  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyF')) {
      const dx = S.player.pos.x - CONFIG.shop.x;
      const dz = S.player.pos.z - CONFIG.shop.z;
      if (Math.sqrt(dx * dx + dz * dz) < CONFIG.shop.radius + 3) {
        panel.classList.remove('hidden');
      }
    }
  });
}

export default init;
