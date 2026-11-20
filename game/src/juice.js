// SOLMAR BAY — juice: screen shake with trauma decay, and a flash
// helper for impacts and cutscene punches. The camera shake is
// applied by the main loop from the trauma value here.
export function init(S) {
  S.juice = {
    trauma: 0,
    add(amount) {
      this.trauma = Math.min(1, this.trauma + (amount || 0.3));
    },
    kick(amount) {
      this.add(amount || 0.45);
    },
    flash(color, ms) {
      const el = document.getElementById('flash');
      if (!el) return;
      el.style.background = color || 'rgba(255,240,200,0.85)';
      el.style.opacity = '0.85';
      window.setTimeout(() => {
        el.style.opacity = '0';
      }, ms || 130);
    },
    hit() {
      this.add(0.5);
      this.flash('rgba(255,60,40,0.55)', 160);
    },
  };
  S.shake = S.juice;

  const tick = (dt) => {
    if (S.juice.trauma > 0) {
      S.juice.trauma = Math.max(0, S.juice.trauma - dt * 1.5);
    }
  };
  S._tick.push(tick);
  return S.juice;
}
