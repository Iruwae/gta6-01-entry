// shop.js — SOLMAR BAY, round 8 rebuild.
// The MART corner store at (-72, -60). Press F nearby to open it. Every
// row shows a name, a price, and a buy button; buying takes the cash
// off the player and applies the effect at once. Food heals, the medkit
// heals a lot, and the ammo box refills the magazine of the weapon in
// hand.

const MART = { x: -72, z: -60, r: 9 };

const ITEMS = [
  { name: 'Burger', price: 15, heal: 25, note: 'Hot, greasy, worth it.' },
  { name: 'Soda', price: 5, heal: 8, note: 'Ice cold.' },
  { name: 'Snack', price: 8, heal: 12, note: 'Salt and sugar.' },
  { name: 'Coffee', price: 6, heal: 5, note: 'Keeps you awake.' },
  { name: 'Medkit', price: 60, heal: 60, note: 'Patches you right up.' },
  { name: 'Ammo Box', price: 40, ammo: true, note: 'A full magazine.' },
];

function el(ctx, id) {
  if (ctx.dom && ctx.dom[id]) return ctx.dom[id];
  return document.getElementById(id);
}

function keyDown(ctx, code) {
  const inp = ctx.input;
  if (!inp) return false;
  if (typeof inp.isDown === 'function') {
    try { return !!inp.isDown(code); } catch (e) { /* fall through */ }
  }
  const k = inp.keys;
  if (k) {
    if (typeof k.has === 'function') return k.has(code);
    if (Array.isArray(k)) return k.includes(code);
    if (typeof k === 'object') return !!k[code];
  }
  if (typeof inp[code] !== 'undefined') return !!inp[code];
  return false;
}

function dist2d(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function init(ctx) {
  const S = ctx.state;
  const prev = {};
  const grab = (id) => el(ctx, id);

  function toast(msg) {
    if (ctx.api.toast) ctx.api.toast(msg);
    else {
      const t = grab('toast');
      if (t) t.textContent = msg;
    }
  }

  function nearMart() {
    const p = S.player && S.player.pos;
    if (!p) return false;
    return dist2d(p, MART) < MART.r;
  }

  function healPlayer(amount) {
    if (!S.player) return;
    S.player.health = Math.min(100, (S.player.health || 0) + amount);
    if (typeof S.health === 'number') S.health = S.player.health;
  }

  function refillAmmo() {
    if (!S.player || !S.player.loadout) return 0;
    let mag = 12;
    try {
      const def = S.player.loadout.current().def;
      if (def) mag = def.magSize || def.mag || def.capacity || 12;
    } catch (e) { /* fall back to a pistol-sized mag */ }
    S.player.ammo = mag;
    return mag;
  }

  function buy(item) {
    if ((S.cash || 0) < item.price) {
      toast('Not enough cash for a ' + item.name + '.');
      return false;
    }
    S.cash -= item.price;
    if (item.heal) {
      healPlayer(item.heal);
      toast(item.name + ' — +' + item.heal + ' HP.');
    } else if (item.ammo) {
      const mag = refillAmmo();
      toast('Ammo Box — magazine refilled to ' + mag + '.');
    } else {
      toast('Bought a ' + item.name + '.');
    }
    if (ctx.api.audio && typeof ctx.api.audio.pickup === 'function') {
      try { ctx.api.audio.pickup(); } catch (e) { /* audio is best-effort */ }
    }
    return true;
  }

  function buildRows() {
    const box = grab('shop-items');
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
      price.textContent = '$' + item.price;
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
    buildRows();
    const panel = grab('shop-panel');
    if (panel) panel.classList.remove('hidden');
  }

  function closeShop() {
    const panel = grab('shop-panel');
    if (panel) panel.classList.add('hidden');
  }

  function shopOpen() {
    const panel = grab('shop-panel');
    return !!panel && !panel.classList.contains('hidden');
  }

  const btnClose = grab('btn-close-shop');
  if (btnClose) btnClose.addEventListener('click', closeShop);

  ctx.api.shop = { open: openShop, close: closeShop, buy, nearMart, items: ITEMS };

  ctx.updates.push(() => {
    const down = keyDown(ctx, 'KeyF');
    const was = !!prev.KeyF;
    prev.KeyF = down;
    if (!down || was) return;
    if (S.mode !== 'playing') return;
    if (shopOpen()) closeShop();
    else if (nearMart()) openShop();
  });
}
