[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01) [![rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/c/gta6-01) [![reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/c/gta6-01)

# SOLMAR BAY — A sunset crime story

An original open-world crime game in the spirit of GTA 6, built for the make.fun **gta6-01** bounty. One long golden-hour sunset slides into a lit-up night over a sun-soaked bay city. You start as a small-time hustler with $120, run jobs for Vic Torres with getaway driver Lena Cruz riding along, steal cars, outrun the Solmar PD, and build respect from NOBODY to BAY LEGEND.

## How to play

```sh
node serve.ts
```

Then open http://127.0.0.1:8904/ in desktop Chrome. No build step, no installs, no network loads at runtime — plain ES modules with three.js vendored under `game/vendor/`.

## Controls

- **WASD / arrows** — walk and drive
- **Mouse** — aim and shoot
- **1–4** — switch weapon (Pistol, SMG, Shotgun, Rifle)
- **R** — reload
- **E** — get in / out of a car or bike
- **Q** — change radio station
- **X** — skip cutscene
- **F** — open the shop near the MART
- **H** — rest at the safehouse
- **G** — garage (store a car, spawn a stored car)
- **T** — start a street race at the start pad
- **Y** — pick up a taxi fare at the taxi stand
- **V** — sell a car to Vic's fence in his yard
- **P** — pause menu and job list

## What's inside

- A living bay city with 7 districts (Downtown, Harbor, Beach, Uptown, The Strip, Old Town, Palm Row), traffic, pedestrians, gulls and palm trees
- 10 story missions with the crew mission at job 5 — Lena Cruz joins you, follows you on foot and talks
- Police that think: a utility brain picks RAMMING, ROADBLOCK, PURSUIT or SEARCH, plus a helicopter at 3+ stars and a live dispatch roster
- Side hustles: checkpoint street races, taxi fares, 12 collectible packages, and selling stolen cars to Vic's fence
- A full day/night cycle — golden hour fading into neon night, with stars, moon and lit windows
- 6 radio stations, a respect ladder, daily challenges, a garage with tuning (engine, armor, NOS, paint), a corner-store shop, a pay-n-spray booth and a safehouse
- A HUD with minimap, wanted stars, health, weapon slots, speedometer and objectives; progress saves to localStorage

## Tech notes

- Plain ES modules, no build step. `game/src/main.js` is the boot hub and the only file that imports the other modules; every module exports an `init(ctx)` and talks through the shared context.
- three.js (r187) is vendored under `game/vendor/` as a single-file ES module build.
- `serve.ts` serves `game/` on 127.0.0.1:8904. `tools/shots.mjs` takes the four screenshots in `screenshots/`.
- `window.__solmar` exposes the live game state for debugging and automated checks.
- `main.ts` (Node 22 stdlib only) mirrors `game/` and `screenshots/` into the output folder and writes a deterministic `dossier.json`.

## Originality

Everything in SOLMAR BAY is original — city, characters, districts, radio stations, dialogue and story. The only third-party code is the vendored three.js library (MIT), which is not the game's own source.
