// SOLMAR BAY — the MART corner store. F near the store opens the panel;
// buying applies the item (heal, or refill the current magazine).
export function init(ctx) {
  const { state: S, input, config, api } = ctx;
  const panel = document.getElementById('shop-panel');
  const list = document.getElementById('shop-items');
  let open = false;

  function applyItem(item) {
    if (S.cash < item.price) {
      api.toast('Not enough cash.');
      return;
    }
    S.cash -= item.price;
    if (item.ammo) {
      const slot = S.player.loadout.current();
      slot.mag = slot.def.mag;
      S.player.reloading = false;
      api.toast(`Ammo Box bought — ${slot.def.name} refilled.`);
    } else {
      S.player.health = Math.min(config.maxHealth, S.player.health + item.heal);
      api.toast(`${item.name} bought — healed ${item.heal} HP.`);
    }
  }

  function buildRows() {
    list.innerHTML = '';
    for (const item of config.shopItems) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.dataset.item = item.id;
      const name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = item.name;
      const desc = document.createElement('span');
      desc.className = 'shop-desc';
      desc.textContent = item.desc;
      const price = document.createElement('span');
      price.className = 'shop-price';
      price.textContent = '$' + item.price;
      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = 'BUY';
      btn.addEventListener('click', () => applyItem(item));
      row.append(name, desc, price, btn);
      list.appendChild(row);
    }
  }

  ctx.updates.push(() => {
    if (S.mode !== 'playing') return;
    if (input.wasPressed('KeyF')) {
      const d = Math.hypot(S.player.pos.x - config.shop.x, S.player.pos.z - config.shop.z);
      if (d < config.shop.radius + 2) {
        buildRows();
        panel.classList.remove('hidden');
        open = true;
      }
    }
  });
  ctx.api.shopLoaded = true;
  ctx.api.applyShopItem = applyItem;
  ctx.api.openShop = () => {
    buildRows();
    panel.classList.remove('hidden');
    open = true;
  };
  void open;
}

export default { init };
