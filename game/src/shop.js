// shop.js — SOLMAR BAY corner MART.
// F opens the shop near the MART. Food heals: the Burger costs $15 and
// restores 25 HP. Buying needs the cash on hand; healing never passes
// full health.
export function init(ctx) {
  const S = ctx.state || ctx.S;
  const dom = ctx.dom || {};
  const el = (id) => dom[id] || document.getElementById(id);

  const MART = { x: -72, z: -60 };
  const MART_RADIUS = 11;

  // name, price, heal
  const ITEMS = [
    { name: 'Burger', price: 15, heal: 25, desc: 'Double stack, extra pickles. Restores 25 HP.' },
    { name: 'Taco', price: 12, heal: 18, desc: 'Street taco, still sizzling. Restores 18 HP.' },
    { name: 'Cola', price: 5, heal: 10, desc: 'Ice-cold can. Restores 10 HP.' },
    { name: 'Churro', price: 8, heal: 12, desc: 'Sugar-dusted, warm. Restores 12 HP.' },
    { name: 'Bandage', price: 25, heal: 45, desc: 'Field dressing kit. Restores 45 HP.' },
  ];

  function toast(msg) {
    try {
      if (ctx.api && typeof ctx.api.toast === 'function') { ctx.api.toast(msg); return; }
    } catch (e) { /* fall through */ }
    const t = el('toast');
    if (t) t.textContent = msg;
  }

  function nearMart() {
    const p = S.player && S.player.pos;
    if (!p) return false;
    const dx = p.x - MART.x;
    const dz = p.z - MART.z;
    return Math.sqrt(dx * dx + dz * dz) < MART_RADIUS;
  }

  function heal(n) {
    if (!S.player) return;
    const next = Math.min(100, (S.player.health || 0) + n);
    S.player.health = next;
    S.health = next;
  }

  function buy(item) {
    if (typeof S.cash !== 'number' || S.cash < item.price) {
      toast('Not enough cash for a ' + item.name + '.');
      return false;
    }
    S.cash -= item.price;
    heal(item.heal);
    toast(item.name + '  •  -$' + item.price + '  •  +' + item.heal + ' HP');
    try {
      if (ctx.api && ctx.api.audio && typeof ctx.api.audio.pickup === 'function') ctx.api.audio.pickup();
    } catch (e) { /* audio is optional */ }
    return true;
  }

  function renderItems() {
    const host = el('shop-items');
    if (!host) return;
    host.innerHTML = '';
    ITEMS.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'shop-row';
      const nm = document.createElement('span');
      nm.className = 'shop-name';
      nm.textContent = item.name;
      const pr = document.createElement('span');
      pr.className = 'shop-price';
      pr.textContent = '$' + item.price;
      const ds = document.createElement('span');
      ds.className = 'shop-desc';
      ds.textContent = item.desc;
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = 'BUY';
      btn.addEventListener('click', () => buy(item));
      row.appendChild(nm);
      row.appendChild(pr);
      row.appendChild(ds);
      row.appendChild(btn);
      host.appendChild(row);
    });
  }

  function open() {
    renderItems();
    const p = el('shop-panel');
    if (p) p.classList.remove('hidden');
  }

  function close() {
    const p = el('shop-panel');
    if (p) p.classList.add('hidden');
  }

  function panelOpen() {
    const p = el('shop-panel');
    return !!(p && !p.classList.contains('hidden'));
  }

  const btnClose = el('btn-close-shop');
  if (btnClose) btnClose.addEventListener('click', close);

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code !== 'KeyF') return;
    if (!S.mode || S.mode !== 'playing') return;
    if (S.cutscene) return;
    if (panelOpen()) { close(); return; }
    if (nearMart()) open();
    else toast('The MART is the corner store on the south road.');
  });

  ctx.api.shop = { open, close, buy, items: ITEMS, nearMart, mart: MART };
}
