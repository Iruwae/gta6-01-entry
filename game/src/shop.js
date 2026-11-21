// shop.js — SOLMAR BAY corner MART.
// F opens the shop when the player is near the MART. Food heals: the
// Burger costs $15 and restores 25 HP, and the rest of the shelf works
// the same way — pay the price, get the health back.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const $ = (id) => dom[id] || document.getElementById(id);

  const MART = { x: -72, z: -60 };

  const ITEMS = [
    { name: 'Burger', price: 15, heal: 25 },
    { name: 'Soda', price: 5, heal: 10 },
    { name: 'Taco', price: 10, heal: 15 },
    { name: 'Energy Drink', price: 8, heal: 12 },
    { name: 'Snack Box', price: 20, heal: 40 },
  ];

  function toast(msg) {
    if (ctx.api && ctx.api.toast) ctx.api.toast(msg, 4000);
    else { const el = $('toast'); if (el) el.textContent = msg; }
  }

  function nearMart() {
    const p = S.player && S.player.pos;
    if (!p) return false;
    const dx = (p.x || 0) - MART.x;
    const dz = (p.z || 0) - MART.z;
    return Math.sqrt(dx * dx + dz * dz) < 12;
  }

  function buy(item) {
    if ((S.cash || 0) < item.price) { toast('Not enough cash for the ' + item.name + '.'); return; }
    S.cash -= item.price;
    if (S.player) {
      S.player.health = Math.min(100, (S.player.health != null ? S.player.health : 100) + item.heal);
      S.health = S.player.health;
    }
    toast(item.name + ' + ' + item.heal + ' HP');
    if (ctx.api && ctx.api.audio && typeof ctx.api.audio.pickup === 'function') {
      try { ctx.api.audio.pickup(); } catch (e) { /* quiet */ }
    }
  }

  function buildItems() {
    const box = $('shop-items');
    if (!box) return;
    box.innerHTML = '';
    for (const item of ITEMS) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      const name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = item.name;
      const price = document.createElement('span');
      price.className = 'shop-price';
      price.textContent = '$' + item.price + ' · +' + item.heal + ' HP';
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = 'BUY';
      btn.addEventListener('click', () => buy(item));
      row.appendChild(name);
      row.appendChild(price);
      row.appendChild(btn);
      box.appendChild(row);
    }
  }

  function openShop() {
    buildItems();
    const panel = $('shop-panel');
    if (panel) panel.classList.remove('hidden');
  }

  function closeShop() {
    const panel = $('shop-panel');
    if (panel) panel.classList.add('hidden');
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyF') return;
    if (S.mode !== 'playing') return;
    const panel = $('shop-panel');
    const isOpen = panel && !panel.classList.contains('hidden');
    if (isOpen) { closeShop(); return; }
    if (nearMart()) openShop();
    else toast('Find the MART to shop.');
  });

  const btnClose = $('btn-close-shop');
  if (btnClose) btnClose.addEventListener('click', closeShop);

  ctx.api = ctx.api || {};
  ctx.api.shop = { open: openShop, close: closeShop, buy, items: ITEMS };
  S.shopDirector = ctx.api.shop;
}
