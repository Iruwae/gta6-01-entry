// SOLMAR BAY — the MART corner store. F near the store opens the shop.
import { CONFIG } from './config.js';

export function init(ctx) {
  const S = ctx.state;
  const input = ctx.input;
  const dom = ctx.dom;
  ctx.shopLoaded = true;

  const panel = dom['shop-panel'];
  const list = dom['shop-items'];

  function applyItem(item) {
    if (item.id === 'ammo') {
      S.player.loadout.current().mag = S.player.loadout.current().def.mag;
    } else if (item.heal > 0) {
      S.player.health = Math.min(CONFIG.player.maxHealth, S.player.health + item.heal);
    }
  }

  // Build one row per config item (real shop rows — never fallback rows).
  list.innerHTML = '';
  for (const item of CONFIG.shop.items) {
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.dataset.itemId = item.id;
    const name = document.createElement('span');
    name.className = 'shop-name';
    name.textContent = item.name;
    const desc = document.createElement('span');
    desc.className = 'shop-desc';
    desc.textContent = item.desc;
    const price = document.createElement('span');
    price.className = 'shop-price';
    price.textContent = '$' + item.price;
    const buy = document.createElement('button');
    buy.className = 'shop-buy';
    buy.textContent = 'BUY';
    buy.addEventListener('click', () => {
      if (S.cash < item.price) {
        ctx.api.toast('Not enough cash for that.');
        return;
      }
      S.cash -= item.price;
      applyItem(item);
      ctx.api.toast(`Bought ${item.name} for $${item.price}.`);
    });
    row.append(name, desc, price, buy);
    list.appendChild(row);
  }

  function openShop() {
    panel.classList.remove('hidden');
  }
  function closeShop() {
    panel.classList.add('hidden');
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyF')) {
      const d = Math.hypot(S.player.pos.x - CONFIG.shop.x, S.player.pos.z - CONFIG.shop.z);
      if (d <= CONFIG.shop.radius + 2) {
        if (panel.classList.contains('hidden')) openShop();
        else closeShop();
      }
    }
  });

  return { openShop, closeShop, applyItem };
}

export default init;
