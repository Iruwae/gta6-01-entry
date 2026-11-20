// daynight.js — the clock of SOLMAR BAY.
// Day 1 opens at sunset, 18:28. S.time counts game-minutes since then,
// so S.time = 200 lands the clock at 21:48, deep in the night phase.
// The night value ramps smoothly toward its target each frame, which is
// what the sky, the lamps, and the HUD all read.
// Written fresh for round 8 from the shared contract.
export function init(ctx) {
  const S = ctx.state;
  const cfg = ctx.config || {};
  const START_MINUTES = 18 * 60 + 28; // day 1 opens at sunset, 18:28
  const MINUTES_PER_SECOND = (cfg.minutesPerSecond !== undefined) ? cfg.minutesPerSecond : 1;
  const NIGHT_START = 21 * 60 + 30;
  const NIGHT_END = 5 * 60;

  S.dayNight = { phase: 'SUNSET', night: 0, clock: '18:28' };

  function phaseFor(clockMin) {
    if (clockMin >= NIGHT_START || clockMin < NIGHT_END) return 'NIGHT';
    if (clockMin >= 20 * 60) return 'DUSK';
    if (clockMin >= 17 * 60) return 'SUNSET';
    return 'DAY';
  }

  function nightTarget(clockMin) {
    if (clockMin >= NIGHT_START || clockMin < NIGHT_END) return 1;
    if (clockMin >= 19 * 60 + 30) return Math.min(1, (clockMin - (19 * 60 + 30)) / 120);
    if (clockMin < 7 * 60) return Math.max(0, 1 - (clockMin - NIGHT_END) / 120);
    return 0;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  ctx.updates.push((dt) => {
    if (S.mode === 'paused') return;
    S.time += dt * MINUTES_PER_SECOND;
    const total = START_MINUTES + S.time;
    const day = 1 + Math.floor(total / 1440);
    const clockMin = ((total % 1440) + 1440) % 1440;
    const hh = pad2(Math.floor(clockMin / 60));
    const mm = pad2(Math.floor(clockMin % 60));
    const phase = phaseFor(clockMin);
    const dn = S.dayNight;
    dn.phase = phase;
    dn.clock = hh + ':' + mm;
    const target = nightTarget(clockMin);
    const k = 1 - Math.exp(-dt * 0.9);
    dn.night += (target - dn.night) * k;
    if (dn.night < 0.001) dn.night = 0;
    if (dn.night > 0.999) dn.night = 1;
    S.day = day;
    const el = ctx.dom && ctx.dom['day-time'];
    if (el) {
      const text = 'DAY ' + day + ' ' + hh + ':' + mm + ' ' + phase;
      if (el.textContent !== text) el.textContent = text;
    }
  });
}
