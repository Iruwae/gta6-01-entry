// SOLMAR BAY — save data in localStorage: cash, missions done, best score.
// Small and versioned so a future build can migrate it.
import { CFG } from './config.js';

export class SaveData {
  static load() {
    try {
      const raw = localStorage.getItem(CFG.saveKey);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || typeof d.cash !== 'number') return null;
      return d;
    } catch { return null; }
  }
  static store(data) {
    try { localStorage.setItem(CFG.saveKey, JSON.stringify(data)); } catch { /* private mode */ }
  }
  static clear() {
    try { localStorage.removeItem(CFG.saveKey); } catch { /* ignore */ }
  }
}
