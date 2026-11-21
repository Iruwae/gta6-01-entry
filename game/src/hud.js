// SOLMAR BAY — HUD. The boot hub runs the on-screen readouts (cash,
// district, clock, respect, health, radio, wanted stars, police roster,
// minimap, weapon slots, speedometer, objective); this module owns the
// small helpers the hub uses and stays live as the HUD's home module.
import { CONFIG } from './config.js';

export function formatCash(cash) {
  return '$' + Math.floor(cash).toLocaleString('en-US');
}

export function clockText(S) {
  const total = CONFIG.dayOpenHour * 60 + CONFIG.dayOpenMinute + S.time;
  const hh = Math.floor(total / 60) % 24;
  const mm = Math.floor(total % 60);
  return `DAY ${S.day} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${S.dayNight.phase}`;
}

export function gearFor(speed) {
  if (speed < 1) return 'N';
  return String(Math.min(5, 1 + Math.floor(speed / 15)));
}

export function init(ctx) {
  ctx.api.hud = { formatCash, clockText: (S) => clockText(S), gearFor };
}
