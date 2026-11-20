// shop.js — the MART corner store (round-5 rebuild, builder B2).
// KeyF within 6 m of the MART (-72,-60) opens #shop-panel with nine
// rows; each row has .shop-name and a .shop-buy button. Buying checks
// the wallet first, then applies the effect immediately: food heals,
// ammo tops up the reserve, the repair kit fixes the ride, armor pads
// the player. F again (or the close button) shuts the panel.

const MART = { x: -72, z: -60 };
const MART_RADIUS = 6;

const STOCK = [
  { name: 'Burger', price: 15, kind: 'food', heal: 25, blurb: 'Hot, greasy, perfect.' },
  { name: 'Cola', price: 8, kind: 'food', heal: 10, blurb: 'Ice cold sugar rush.' },
  { name: 'Pizza Slice', price: 20, kind: 'food', heal: 35, blurb: 'Two slices, no regrets.' },
  { name: 'Pistol Ammo', price: 40, kind: 'ammo', ammo: 24, blurb: 'Box of 24 rounds.' },
  { name: 'SMG Ammo', price: 60, kind: 'ammo', ammo: 30, blurb: 'Spray now, ask later.' },
  { name: 'Shotgun Shells', price: 70, kind: 'ammo', ammo: 12, blurb: 'Twelve ways to say no.' },
  { name: 'Rifle Rounds', price: 90, kind: 'ammo', ammo: 20, blurb: 'Long-range manners.' },
  { name: 'Repair Kit', price: 120, kind: 'repair', blurb: 'Wrench, tape, hope.' },
  { name: 'Body Armor', price: 150, kind: 'armor', armor: 50, blurb: 'Kevlar, one size fits most.' },
];

function distTo(S, x, z) {
  let best = Infinity;
  if (S.player && S.player.pos) {
    best = Math.min(best, Math.hypot(S.player.pos.x - x, S.player.pos.z - z));
  }
  if (S.car && S.car.pos) {
    best = Math.min(best, Math.hypot(S.car.pos.x - x, S.car.pos.z - z));
  }
  return best;
}

function toast(S, msg) {
  const el = document.getElementById('toast');
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

export function init(S) {
  const panel = document.getElementById('shop-panel');
  const listEl = document.getElementById('shop-items');

  const shop = {
    items: STOCK,
    open: false,

    build() {
      if (!listEl) return;
      listEl.innerHTML = '';
      STOCK.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'shop-row';
        row.dataset.index = String(i);
        const name = document.createElement('span');
        name.className = 'shop-name';
        name.textContent = item.name;
        const price = document.createElement('span');
        price.className = 'shop-price';
        price.textContent = '$' + item.price;
        const buy = document.createElement('button');
        buy.className = 'shop-buy';
        buy.type = 'button';
        buy.textContent = 'BUY $' + item.price;
        row.appendChild(name);
        row.appendChild(price);
        row.appendChild(buy);
        listEl.appendChild(row);
      });
    },

    buy(i) {
      const item = STOCK[i];
      if (!item) return false;
      if ((S.cash || 0) < item.price) {
        toast(S, 'Not enough cash for ' + item.name + '.');
        return false;
      }
      S.cash = (S.cash || 0) - item.price;
      if (item.kind === 'food') {
        const p = S.player;
        if (p) {
          p.health = Math.min(100, (p.health || 0) + item.heal);
          S.health = p.health;
        }
      } else if (item.kind === 'ammo') {
        const p = S.player;
        if (p) {
          p.ammoReserve = (p.ammoReserve || 0) + item.ammo;
          p.reserveAmmo = (p.reserveAmmo || 0) + item.ammo;
        }
      } else if (item.kind === 'repair') {
        if (S.car) S.car.health = S.car.maxHealth || 100;
        if (S.player) {
          S.player.health = Math.min(100, (S.player.health || 0) + 10);
          S.health = S.player.health;
        }
      } else if (item.kind === 'armor') {
        const p = S.player;
        if (p) p.armor = Math.min(100, (p.armor || 0) + item.armor);
      }
      toast(S, 'Bought ' + item.name + ' for $' + item.price + '.');
      return true;
    },

    show() {
      shop.build();
      if (panel) panel.classList.remove('hidden');
      shop.open = true;
    },

    hide() {
      if (panel) panel.classList.add('hidden');
      shop.open = false;
    },
  };

  S.shop = shop;

  // Close button: wire the page's own one, or add one if absent.
  if (panel) {
    let closeBtn = panel.querySelector('.shop-close, #shop-close, [data-close]');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.id = 'shop-close';
      closeBtn.className = 'shop-close';
      closeBtn.type = 'button';
      closeBtn.textContent = 'CLOSE';
      panel.appendChild(closeBtn);
    }
    closeBtn.addEventListener('click', () => shop.hide());
  }

  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest ? e.target.closest('.shop-buy') : null;
      if (!btn) return;
      const row = btn.closest('.shop-row');
      if (!row) return;
      shop.buy(Number(row.dataset.index));
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyF' || e.repeat) return;
    if (S.mode === 'paused') return;
    if (shop.open) { shop.hide(); return; }
    if (distTo(S, MART.x, MART.z) <= MART_RADIUS) shop.show();
  });

  return shop;
}

export default init;
