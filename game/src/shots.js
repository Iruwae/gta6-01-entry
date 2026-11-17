// SOLMAR BAY — screenshot scenes behind ?shot=title|chase|mission|drive.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps with scripted inputs, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import * as THREE from 'three';

function hideOverlay(game) {
  document.getElementById('overlay').style.display = 'none';
  game.state = 'play';
  game.hud.show();
  game.hud.setCash(game.cash);
  game.hud.setHealth(game.playerHp, 100);
}

function putPlayerInCar(game, x, z, heading) {
  // Take the nearest traffic car, move it onto the road, and get in.
  let best = null, bd = 1e9;
  for (const car of game.traffic.cars) {
    if (car.kind !== 'traffic' || car.dead) continue;
    const d = Math.hypot(car.pos.x - x, car.pos.z - z);
    if (d < bd) { bd = d; best = car; }
  }
  if (!best) return null;
  best.pos.set(x, 0, z);
  best.heading = heading;
  best.speed = 12;
  best.syncMesh();
  game.playerCar = best;
  best.kind = 'player';
  best.driver = 'player';
  best.owned = true;
  game.playerMesh.visible = false;
  return best;
}

function runSteps(game, n, keys) {
  if (keys) for (const k of keys) game.input.inject(k, true);
  for (let i = 0; i < n; i++) {
    game.update(1 / 60);
    game.updateCamera(1 / 60);
  }
  if (keys) for (const k of keys) game.input.inject(k, false);
}

function stageChase(game) {
  hideOverlay(game);
  game.missions.index = 1;
  game.missions.start(); // Courier Run: waypoint + timer on the HUD.
  game.hud.setMissionTitle('COURIER RUN');
  putPlayerInCar(game, -40, 40, Math.PI / 2);
  game.setWanted(3);
  // Two cruisers right on the player's tail.
  const p = game.playerPos();
  game.traffic.spawnPolice(p.x - 14, p.z - 8);
  game.traffic.spawnPolice(p.x - 18, p.z + 6);
  runSteps(game, 200, ['KeyW']);
  game.hud.showToast('WANTED — 3 stars! Lose the Solmar Bay PD!');
  game.hud.setObjective('Drop 1 of 3 — the pier kiosk');
}

function stageMission(game) {
  hideOverlay(game);
  game.missions.index = 2;
  game.missions.start(); // Harbor Heat: gang members spawn at the harbor.
  game.hud.setMissionTitle('HARBOR HEAT');
  // Stage the fight on the beach road facing the water: the player east,
  // the Dock Rats between the player and the harbor, waypoint beam behind them.
  game.playerPosV.set(-158, 0, 152);
  game.playerYaw = -Math.PI / 2; // face west, toward the water
  game.camYaw = -Math.PI / 2;
  game.setWanted(1);
  const gang = game.people.enemies.filter((e) => e.kind === 'gang');
  const spots = [[-170, 146], [-174, 152], [-170, 158], [-178, 149], [-176, 157], [-172, 162]];
  gang.forEach((e, i) => {
    const s = spots[i % spots.length];
    e.pos.set(s[0], 0, s[1]);
  });
  runSteps(game, 45, []);
  game.hud.setObjective('Clear out the Dock Rats at the harbor');
}

function stageDrive(game) {
  hideOverlay(game);
  game.missions.index = 0;
  game.missions.start(); // First Wheels: steal a car, drive to the garage.
  game.hud.setMissionTitle('FIRST WHEELS');
  putPlayerInCar(game, 0, -120, 0);
  game.playerCar.speed = 20;
  runSteps(game, 240, ['KeyW']);
  game.hud.setObjective('Drive the car to the Bayline garage');
}

export function stageShot(game, name) {
  if (name === 'chase') stageChase(game);
  else if (name === 'mission') stageMission(game);
  else if (name === 'drive') stageDrive(game);
  else {
    // Title: leave the title screen up over the orbiting city.
    game.state = 'title';
  }
  game.renderer.render(game.scene, game.camera);
}
