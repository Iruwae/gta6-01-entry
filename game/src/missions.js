// SOLMAR BAY — the story: four missions with objectives, waypoints, timers
// and rewards. The manager owns the current mission + step, spawns what a
// step needs (gang members, wanted heat), and reports completions.
import * as THREE from 'three';
import { MISSIONS, CFG } from './config.js';

export class Missions {
  constructor(game) {
    this.game = game;
    this.index = 0; // next mission to start
    this.active = null; // {def, step, timer, spawned, kills}
    this.doneCount = 0;
  }
  currentDef() { return MISSIONS[this.index] || null; }
  start() {
    const def = this.currentDef();
    if (!def) return false;
    this.active = { def, step: 0, timer: 0, spawned: false, kills: 0, done: false };
    this.enterStep();
    return true;
  }
  stepDef() { return this.active ? this.active.def.steps[this.active.step] : null; }
  enterStep() {
    const g = this.game;
    const step = this.stepDef();
    if (!step) return;
    this.active.timer = step.timer || 0;
    this.active.spawned = false;
    this.active.kills = 0;
    if (step.kind === 'fight') {
      for (let i = 0; i < step.count; i++) {
        const a = (i / step.count) * Math.PI * 2;
        g.people.spawnEnemy(step.target[0] + Math.cos(a) * 12, step.target[1] + Math.sin(a) * 12, 'gang');
      }
      this.active.spawned = true;
    }
    if (step.wantedAtStart) g.setWanted(step.wantedAtStart);
    g.hud.setObjective(step.text);
    g.hud.showToast(this.active.def.title + ' — ' + this.active.def.brief);
    g.audio.sirenBlip();
  }
  // Returns 'complete' | 'failed' | null.
  update(dt) {
    if (!this.active) return null;
    const g = this.game;
    const step = this.stepDef();
    if (!step) return null;
    if (step.timer) {
      this.active.timer -= dt;
      if (this.active.timer <= 0) {
        this.fail('Time ran out.');
        return 'failed';
      }
    }
    const p = g.playerPos();
    switch (step.kind) {
      case 'steal':
        if (g.playerCar) this.advance();
        break;
      case 'goto': {
        const d = Math.hypot(p.x - step.target[0], p.z - step.target[1]);
        if (d < 7) this.advance();
        break;
      }
      case 'grab': {
        const d = Math.hypot(p.x - step.target[0], p.z - step.target[1]);
        if (d < 7) {
          g.addCash(500);
          g.hud.showToast('Cash grabbed! Get to the safehouse — fast.');
          this.advance();
        }
        break;
      }
      case 'fight': {
        const gangLeft = g.people.enemies.filter((e) => e.kind === 'gang').length;
        if (gangLeft === 0 && this.active.spawned) {
          g.setWanted(2);
          this.advance();
        }
        break;
      }
      case 'escape': {
        const d = step.target ? Math.hypot(p.x - step.target[0], p.z - step.target[1]) : 0;
        if (step.target) {
          if (g.wanted === 0 && d < 8) this.advance();
          else if (g.wanted === 0) g.hud.setObjective('Wanted level clear — now reach the safehouse');
        } else if (g.wanted === 0) this.advance();
        break;
      }
      default: break;
    }
    return null;
  }
  advance() {
    const g = this.game;
    this.active.step++;
    if (this.active.step >= this.active.def.steps.length) {
      this.complete();
    } else {
      g.audio.pickup();
      this.enterStep();
    }
  }
  complete() {
    const g = this.game;
    const reward = CFG.money.missionReward[this.index] || 500;
    g.addCash(reward);
    g.audio.missionDone();
    g.hud.showBanner('MISSION COMPLETE', this.active.def.title + '  •  +$' + reward);
    g.hud.setObjective('Mission complete — press E at the marker to start the next job');
    this.doneCount++;
    this.index++;
    this.active = null;
    g.saveGame();
  }
  fail(reason) {
    const g = this.game;
    g.audio.busted();
    g.hud.showBanner('MISSION FAILED', reason);
    g.hud.setObjective('Mission failed — press E at the marker to retry');
    this.active = null;
  }
  // Where the current objective points, for the waypoint arrow + minimap.
  targetPos() {
    const step = this.stepDef();
    if (!step || !step.target) return null;
    return new THREE.Vector3(step.target[0], 0, step.target[1]);
  }
  markerAvailable() {
    // The mission start marker sits at the Bayline garage.
    return !this.active && this.currentDef() !== null;
  }
}
