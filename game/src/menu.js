// SOLMAR BAY — menu.js
// MenuDirector: the pause menu grows up. Two new panels live inside it:
//
// - Mission select ("JOBS"): every story job as a row — title, payout,
//   status (DONE / NEXT / LOCKED). Completed jobs can be replayed from
//   here; replays pay half (a repeat rate — the first completion is the
//   one that counts toward the debt). Clicking a row starts that job
//   immediately and closes the menu.
// - Run stats ("STATS"): kills, cars stolen, shots fired, jobs done,
//   cash earned this run, best wanted level, time played, heat shed in
//   hideouts, heat spikes. Plus a controls reference so nobody has to
//   guess a key mid-chase.
//
// The director wires its own buttons (it does not go through the HUD
// callback table — the HUD only owns the pause menu's visibility). It is
// a pure DOM + S reader; it never touches the renderer.

import { S } from './state.js';

function $(id) {
  const el = document.getElementById(id);
  return el || null;
}

function fmtCash(n) {
  return '$' + Math.floor(n || 0).toLocaleString('en-US');
}

function fmtClock(seconds) {
  const s = Math.floor(seconds || 0);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
}

export class MenuDirector {
  constructor() {
    this.elPanel = $('mission-select');
    this.elList = $('mission-list');
    this.elStats = $('run-stats');
    this.elStatsList = $('run-stats-list');
    this.elBtnJobs = $('btn-missions');
    this.elBtnStats = $('btn-stats');
    this.elBtnClose = $('btn-close-jobs');
    this.elBtnCloseStats = $('btn-close-stats');
    this.bestWanted = 0;
    this.cashEarned = 0;
    this._lastCash = 120;
    this._jobsOpen = false;
    this._statsOpen = false;
    if (this.elBtnJobs) {
      this.elBtnJobs.addEventListener('click', () => this.toggleJobs());
    }
    if (this.elBtnStats) {
      this.elBtnStats.addEventListener('click', () => this.toggleStats());
    }
    if (this.elBtnClose) {
      this.elBtnClose.addEventListener('click', () => this.close());
    }
    if (this.elBtnCloseStats) {
      this.elBtnCloseStats.addEventListener('click', () => this.close());
    }
  }

  reset() {
    this.bestWanted = 0;
    this.cashEarned = 0;
    this._lastCash = 120;
    this._jobsOpen = false;
    this._statsOpen = false;
    this.close();
  }

  // ---- per-frame bookkeeping (cheap, runs inside the main loop) --------
  update() {
    if (!S) return;
    if (S.wanted > this.bestWanted) this.bestWanted = S.wanted;
    // Cash only ever grows from job payouts (spray booth spends it, and
    // busted fines take it) — count only upward moves as earnings.
    if (S.cash > this._lastCash) this.cashEarned += S.cash - this._lastCash;
    this._lastCash = S.cash;
  }

  // ---- mission select ----------------------------------------------------
  _rowState(i) {
    const done = S.missionIndex || 0;
    if (i < done) return 'DONE';
    if (i === done) return 'NEXT';
    return 'LOCKED';
  }

  _buildList() {
    if (!this.elList || !S.missions) return;
    this.elList.innerHTML = '';
    const defs = S.missions.defs || [];
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const state = this._rowState(i);
      const row = document.createElement('div');
      row.className = 'job-row ' + state.toLowerCase();
      const title = document.createElement('span');
      title.className = 'job-title';
      title.textContent = (i + 1) + '. ' + def.title;
      const pay = document.createElement('span');
      pay.className = 'job-pay';
      const reward = (S.missions && typeof S.missions.rewardOf === 'function')
        ? S.missions.rewardOf(i)
        : 0;
      pay.textContent = state === 'DONE' ? fmtCash(reward / 2) + ' replay' : fmtCash(reward);
      const badge = document.createElement('span');
      badge.className = 'job-badge';
      badge.textContent = state;
      row.appendChild(title);
      row.appendChild(pay);
      row.appendChild(badge);
      if (def.flavor) {
        const fl = document.createElement('div');
        fl.className = 'job-flavor';
        fl.textContent = def.flavor;
        row.appendChild(fl);
      }
      if (state !== 'LOCKED') {
        row.addEventListener('click', () => this.startReplay(i));
      }
      this.elList.appendChild(row);
    }
    const note = document.createElement('div');
    note.className = 'job-note';
    note.textContent = 'Replays pay half. The first run of a job pays full.';
    this.elList.appendChild(note);
    // Daily challenges: the three for today, with live progress.
    // (extra-row, not job-row — the job count stays 10.)
    if (S.challengesDirector) {
      const head = document.createElement('div');
      head.className = 'job-section';
      head.textContent = 'DAILY CHALLENGES — DAY ' + (S.day || 1);
      this.elList.appendChild(head);
      for (const ch of S.challengesDirector.rows()) {
        const crow = document.createElement('div');
        crow.className = 'extra-row challenge' + (ch.done ? ' done' : '');
        const ctitle = document.createElement('span');
        ctitle.className = 'job-title';
        ctitle.textContent = ch.text;
        const cpay = document.createElement('span');
        cpay.className = 'job-pay';
        cpay.textContent = ch.done ? 'DONE' : ch.progress + ' · ' + fmtCash(ch.reward);
        crow.appendChild(ctitle);
        crow.appendChild(cpay);
        this.elList.appendChild(crow);
      }
    }
    // Vic's wanted board: the three rides he pays a bonus for today.
    if (S.fenceDirector) {
      const fhead = document.createElement('div');
      fhead.className = 'job-section';
      fhead.textContent = "VIC'S WANTED BOARD — sell at the harbor fence (V)";
      this.elList.appendChild(fhead);
      for (const w of S.fenceDirector.boardRows()) {
        const wrow = document.createElement('div');
        wrow.className = 'extra-row wanted';
        const wtitle = document.createElement('span');
        wtitle.className = 'job-title';
        wtitle.textContent = w.label;
        const wpay = document.createElement('span');
        wpay.className = 'job-pay';
        wpay.textContent = 'bonus ' + fmtCash(w.bonus);
        wrow.appendChild(wtitle);
        wrow.appendChild(wpay);
        this.elList.appendChild(wrow);
      }
    }
  }

  startReplay(i) {
    if (!S || !S.missions) return;
    const state = this._rowState(i);
    if (state === 'LOCKED') return;
    // Replaying an old job rewinds the story pointer to it; the next
    // auto-start then continues from there.
    S.missionIndex = i;
    S.replayPay = state === 'DONE' ? 0.5 : 1;
    S.missions.start(i);
    this.close();
    // Close the pause menu and resume play (the HUD owns the menu).
    if (S.mode === 'paused' && S.hud && typeof S.hud.showPause === 'function') {
      S.hud.showPause(false);
    }
    S.mode = 'playing';
    if (S.hud && typeof S.hud.toast === 'function') {
      S.hud.toast('Job replay: ' + (S.missions.defs[i] ? S.missions.defs[i].title : 'job') +
        (state === 'DONE' ? ' (replay rate — half pay)' : ''));
    }
  }

  toggleJobs() {
    if (this._jobsOpen) { this.close(); return; }
    this._jobsOpen = true;
    this._statsOpen = false;
    this._buildList();
    if (this.elPanel) this.elPanel.classList.remove('hidden');
    if (this.elStats) this.elStats.classList.add('hidden');
  }

  // ---- run stats ---------------------------------------------------------
  _statsLines() {
    const st = (S && S.stats) || {};
    const hd = S && S.heatDirector;
    return [
      ['Time played', fmtClock(S.time)],
      ['Cash earned', fmtCash(this.cashEarned)],
      ['Cash on hand', fmtCash(S.cash)],
      ['Jobs done', String(st.missionsDone || 0) + ' / ' + ((S.missions && S.missions.defs) ? S.missions.defs.length : 4)],
      ['Best wanted', (this.bestWanted || 0) + ' ★'],
      ['Kills', String(st.kills || 0)],
      ['Cars stolen', String(st.carsStolen || 0)],
      ['Shots fired', String(st.shotsFired || 0)],
      ['Packages found', String(st.packages || 0) + ' / 12'],
      ['Street races won', String(st.racesWon || 0) + ((S.sideActivities && S.sideActivities.bestLap) ? ' · best ' + S.sideActivities.bestLap.toFixed(1) + 's' : '')],
      ['Taxi fares done', String(st.faresDone || 0)],
      ['Respect', String(S.respect || 0) + ' · ' + (S.respectDirector ? S.respectDirector.rank.title : 'WHEELMAN')],
      ['Cars fenced', String(st.fencesSold || 0)],
      ['Crew kills (Lena)', String(st.crewKills || 0)],
      ['Heat shed (hideouts + spray)', String(hd ? Math.round(hd.shedTotal || 0) : 0)],
      ['Heat spikes', String(hd ? (hd.spikes || 0) : 0)],
    ];
  }

  toggleStats() {
    if (this._statsOpen) { this.close(); return; }
    this._statsOpen = true;
    this._jobsOpen = false;
    // Rows render into the inner list so the screen title and CLOSE button
    // survive the rebuild (the screen itself is only shown/hidden).
    const list = this.elStatsList || this.elStats;
    if (list) {
      list.innerHTML = '';
      for (const [k, v] of this._statsLines()) {
        const row = document.createElement('div');
        row.className = 'stat-row';
        const key = document.createElement('span');
        key.className = 'stat-key';
        key.textContent = k;
        const val = document.createElement('span');
        val.className = 'stat-val';
        val.textContent = v;
        row.appendChild(key);
        row.appendChild(val);
        list.appendChild(row);
      }
    }
    if (this.elStats) this.elStats.classList.remove('hidden');
    if (this.elPanel) this.elPanel.classList.add('hidden');
  }

  close() {
    this._jobsOpen = false;
    this._statsOpen = false;
    if (this.elPanel) this.elPanel.classList.add('hidden');
    if (this.elStats) this.elStats.classList.add('hidden');
  }
}
