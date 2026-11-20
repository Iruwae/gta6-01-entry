// shop.js — the MART corner store.
//
// F opens the panel when you are standing by the MART; the nine rows
// come straight from S.config.shopItems, so the shelf never drifts
// from the tuning table. Buying is cash-checked and applies at once:
// food and medkits heal, ammo feeds the named weapon, armor plates
// the player, and a repair tops up the car you are sitting in.

const MART_RADIUS = 7;

export function init(S) {
  const anchors = (S.config && S.config.anchors) || {};
  const mart = anchors.mart || { x: -72, z: -60 };
  const panel = document.getElementById('shop-panel');
  const itemsEl = document.getElementById('shop-items');

  let prevKeys = {};
  let open = false;

  const shop = {
    get open() { return open; },
    openPanel,
    closePanel,
    buy,
    rebuild,
  };

  function nearMart(pos) {
    if (!pos) return false;
    const dx = pos.x - mart.x;
    const dz = pos.z - mart.z;
    return dx * dx + dz * dz <= MART_RADIUS * MART_RADIUS;
  }

  function openPanel() {
    open = true;
    rebuild();
    if (panel) panel.classList.remove('hidden');
  }

  function closePanel() {
    open = false;
    if (panel) panel.classList.add('hidden');
  }

  // One row per item in the config shelf, in config order. The row
  // classes are the contract the smoke test clicks on.
  function rebuild() {
    if (!itemsEl) return;
    const shelf = (S.config && S.config.shopItems) || [];
    itemsEl.innerHTML = '';
    shelf.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.dataset.index = String(i);

      const name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = item.name;
      row.appendChild(name);

      const blurb = document.createElement('span');
      blurb.className = 'shop-blurb';
      blurb.textContent = item.blurb || '';
      row.appendChild(blurb);

      const price = document.createElement('span');
      price.className = 'shop-price';
      price.textContent = '$' + item.price;
      row.appendChild(price);

      const buyBtn = document.createElement('button');
      buyBtn.className = 'shop-buy';
      buyBtn.dataset.index = String(i);
      buyBtn.textContent = 'BUY';
      row.appendChild(buyBtn);

      itemsEl.appendChild(row);
    });
  }

  function say(text) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.remove('hidden');
  }

  // Apply one item's effect. Ammo goes into the live magazine when
  // that weapon is the one equipped, otherwise into the reserve bag
  // the player carries for later.
  function applyEffect(item) {
    const p = S.player;
    if (!p) return;
    if (typeof item.heal === 'number') {
      p.health = Math.min(100, (p.health || 0) + item.heal);
      S.health = p.health;
    }
    if (typeof item.armor === 'number') {
      p.armor = Math.min(100, (p.armor || 0) + item.armor);
    }
    if (typeof item.repair === 'number' && S.car) {
      S.car.health = Math.min(S.car.maxHealth || 100, (S.car.health || 0) + item.repair);
    }
    if (item.weapon && typeof item.ammo === 'number') {
      const current = p.loadout && p.loadout.current ? p.loadout.current() : null;
      if (current && current.def && current.def.name === item.weapon) {
        p.ammo = (p.ammo || 0) + item.ammo;
      } else {
        if (!p.ammoReserve) p.ammoReserve = {};
        p.ammoReserve[item.weapon] = (p.ammoReserve[item.weapon] || 0) + item.ammo;
      }
    }
  }

  function buy(i) {
    const shelf = (S.config && S.config.shopItems) || [];
    const item = shelf[i];
    if (!item) return false;
    if ((S.cash || 0) < item.price) {
      say('Not enough cash for ' + item.name + ' ($' + item.price + ')');
      return false;
    }
    S.cash -= item.price;
    applyEffect(item);
    say('Bought ' + item.name + ' -$' + item.price);
    return true;
  }

  // F, edge-triggered, only near the MART and only while playing.
  // Anywhere else it just tells you where the store is.
  function tick() {
    const keys = S.keys || {};
    const pressed = !!keys.KeyF && !prevKeys.KeyF;
    prevKeys = { ...keys };
    if (!pressed) return;
    if (S.mode !== 'playing' || S.cutscene) return;
    const anchor = S.car ? S.car.pos : (S.player && S.player.pos);
    if (open) {
      closePanel();
      return;
    }
    if (nearMart(anchor)) openPanel();
    else say('The MART corner store is downtown — follow the smell of burgers.');
  }

  // Delegated clicks: rows are rebuilt on every open, so the buttons
  // are never bound twice and never go stale. The close button rides
  // the same delegation — no second listener on it.
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest
      ? e.target.closest('.shop-buy, #btn-close-shop')
      : null;
    if (!t) return;
    if (t.id === 'btn-close-shop') {
      closePanel();
      return;
    }
    if (t.classList.contains('shop-buy')) buy(Number(t.dataset.index));
  });

  S._tick.push(tick);
  S.shop = shop;
  rebuild();
  return shop;
}

export default init;
