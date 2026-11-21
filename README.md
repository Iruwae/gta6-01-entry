[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR BAY

An open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). One long
golden-hour sunset slides into a lit-up night over a sun-soaked bay
city. You start as a small-time hustler, run jobs for Vic Torres with
getaway driver Lena Cruz riding along, steal cars, outrun the police,
and build respect from NOBODY to bay legend.

Everything in the game is original: the city, the characters, the
districts, the radio stations, the dialogue. No Rockstar assets, names,
story, art, sound, or music appear anywhere.

## Play it

No build step, no installs — just static files and a browser:

```sh
node serve.ts
```

Then open http://127.0.0.1:8904/ in a desktop browser. Progress saves
to localStorage, so you can pick up where you left off.

## Controls

- **WASD / arrows** — walk and drive
- **Mouse** — aim and shoot
- **1–4** — switch weapon (Pistol, SMG, Shotgun, Rifle)
- **R** — reload, **E** — get in / out of a car or bike
- **Q** — change radio station, **X** — skip cutscene
- **F** — open the shop near the MART, **H** — rest at the safehouse
- **G** — garage (store a car, spawn a stored car)
- **T** — start a street race at the start pad
- **Y** — pick up a taxi fare at the taxi stand
- **V** — sell a car to Vic's fence in his yard
- **P** — pause menu and job list

## What's inside

- **A living bay city** — seven named districts (Harbor, Beach,
  Uptown, The Strip, and three more), traffic, pedestrians, and cars
  to steal: sedan, motorcycle, pickup, and a sport car.
- **10 story missions** on the job board, starting with a briefing
  from Lena at the garage. Job 5 is the crew mission: Lena joins you
  in the field, fights beside you, and talks back.
- **Police that think** — a wanted level from 0 to 5 stars, a live
  officer roster with callsigns and tactics (pursuit, ramming,
  roadblocks, search), a helicopter at 3+ stars, lay-low spots,
  hideouts, and a pay-n-spray booth that wipes your heat for $150.
- **Side hustles** — checkpoint street races ($300 a win), taxi fares,
  12 collectible packages ($50 each), and a fence who buys hot cars.
- **A full day/night cycle** — golden hour fading into neon-lit night,
  with the HUD clock and the sky following along.
- **Six radio stations**, a respect ladder with ranks to climb, daily
  challenges with cash payouts, a garage with engine, armor, paint,
  and NOS tuning, and a shop where a $15 burger restores 25 HP.

## Tech notes

- Plain JavaScript ES modules, no build step. 3D via three.js,
  vendored under `game/vendor/` so the game runs fully offline.
- `game/src/main.js` is the boot hub; every module exports an `init`
  taking the shared context object, and modules only talk through it.
- `node serve.ts` serves the `game/` folder. `node tools/shots.mjs`
  regenerates the four dossier screenshots (1280x720 JPEG, each under
  256 KiB) with headless Chrome.
- `window.__solmar` exposes the live game state for debugging and
  automated checks.

## Originality

SOLMAR BAY was written from scratch for this bounty. The city layout,
story, characters (Vic Torres, Lena Cruz, Marco Solis), districts,
vehicles, radio stations, and every line of dialogue are inventions of
this entry. The only third-party code is the vendored three.js library
(see the headers in `game/vendor/`), which is included unmodified.
