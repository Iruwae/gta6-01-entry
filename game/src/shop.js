// SOLMAR BAY — the MART corner store (round 7 rebuild, builder D).
// Press F near the MART to open the shop. Every row shows a name, a
// price and a buy button; buying deducts cash and applies the effect on
// the spot. The Burger is the cheap heal: $15 for 25 HP.

const MART = { x: -72, z: -60 };
const MART_RADIUS = 18;

const ITEMS = [
  { name: 'Burger', price: 15, heal: 25, blurb: 'Hot, greasy, fixes what hurts.' },
  { name: 'Soda', price: 5, heal: 10, blurb: 'Cold and sweet.' },
  { name: 'Tacos', price: 10, heal: 15, blurb: 'Three of them. No questions.' },
  { name: 'Energy Drink', price: 8, heal: 12, blurb: 'Tastes like a bad idea.' },
  { name: 'Snack Bar', price: 6, heal: 8, blurb: 'For the road.' },
  { name: 'Med Kit', price: 40, heal: 50, blurb: 'Bandages, pills, the works.' },
];

export function init(ctx) {
  const S = ctx.state;
  const pick = (id) => (ctx.dom && ctx.dom[id]) || document.getElementById(id);
  const show = (id) => { const el = pick(id); if (el) el.classList.remove('hidden'); };
  const hide = (id) => { const el = pick(id); if (el) el.classList.add('hidden'); };
  const toast = (msg) => { try { if (ctx.api.showToast) ctx.api.showToast(msg); } catch (e) { /* silent */ } };
  const click = () => { try { if (ctx.api.audio && ctx.api.audio.click) ctx.api.audio.click(); } catch (e) { /* silent */ } };

  function nearMart() {
    const p = S.player && S.player.pos;
    if (!p) return false;
    return Math.hypot(p.x - MART.x, p.z - MART.z) < MART_RADIUS;
  }

  function buyItem(item) {
    if ((S.cash || 0) < item.price) {
      toast('Not enough cash for a ' + item.name + '.');
      return false;
    }
    S.cash -= item.price;
    if (item.heal) {
      const hp = (S.player && typeof S.player.health === 'number') ? S.player.health : 100;
      const next = Math.min(100, hp + item.heal);
      if (S.player) S.player.health = next;
      S.health = next;
      toast(item.name + ' — +' + item.heal + ' HP.');
    } else {
      toast('Bought a ' + item.name + '.');
    }
    try { if (ctx.api.audio && ctx.api.audio.pickup) ctx.api.audio.pickup(); } catch (e) { /* silent */ }
    return true;
  }

  function buildShop() {
    const list = pick('shop-items');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    for (const item of ITEMS) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      const name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = item.name;
      const price = document.createElement('span');
      price.className = 'shop-price';
      price.textContent = '$' + item.price;
      const buy = document.createElement('button');
      buy.className = 'shop-buy';
      buy.textContent = 'BUY';
      buy.addEventListener('click', () => { click(); buyItem(item); });
      row.appendChild(name);
      row.appendChild(price);
      row.appendChild(buy);
      list.appendChild(row);
    }
  }

  function openShop() {
    buildShop();
    show('shop-panel');
  }

  function closeShop() {
    hide('shop-panel');
  }

  ctx.api.openShop = openShop;
  ctx.api.closeShop = closeShop;
  ctx.api.buyItem = buyItem;
  ctx.api.shopItems = ITEMS;
  ctx.api.martPos = MART;

  const btnClose = pick('btn-close-shop');
  if (btnClose) btnClose.addEventListener('click', () => { click(); closeShop(); });

  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.code !== 'KeyF') return;
    if (S.mode !== 'playing') return;
    const panel = pick('shop-panel');
    const open = panel && !panel.classList.contains('hidden');
    if (open) { click(); closeShop(); return; }
    if (!nearMart()) {
      toast('The MART is the corner store — get closer to shop.');
      return;
    }
    click();
    openShop();
  });
}
