# SOLMAR BAY

[![gta6-01](https://img.shields.io/badge/make.fun-gta6--01-orange)](https://make.fun)
[![rank](https://img.shields.io/badge/rank-coming_soon-blue)](https://make.fun)
[![reward](https://img.shields.io/badge/reward-coming_soon-gold)](https://make.fun)

SOLMAR BAY is an original open-world sunset crime game for make.fun gta6-01. One long golden hour slides into a neon night over a sun-soaked bay city. You start as a small-time hustler with $120, run jobs for Vic Torres with getaway driver Lena Cruz riding along, steal cars, outrun the police, and build respect from NOBODY to BAY LEGEND.

## How to play

```sh
node serve.ts
```

Then open http://127.0.0.1:8904/ in a browser.

## Controls

- WASD / arrows — walk and drive
- Mouse — aim and shoot
- 1–4 — switch weapon (Pistol, SMG, Shotgun, Rifle)
- R — reload
- E — get in / out of a car or bike
- Q — change radio station
- X — skip cutscene
- F — open the shop near the MART
- H — rest at the safehouse
- G — garage (store a car, spawn a stored car)
- T — start a street race at the start pad
- Y — pick up a taxi fare at the taxi stand
- V — sell a car to Vic's fence in his yard
- P — pause menu and job list

## What's inside

- A living bay city with 7 districts: Downtown, Harbor, Beach, Uptown, The Strip, Old Town, Palm Row
- 10 story missions, with the crew mission at job 5 — Lena Cruz joins you
- Police that think: a utility brain picks RAMMING, ROADBLOCK, PURSUIT or SEARCH, plus a helicopter at 3+ stars
- Side hustles: street races, taxi fares, 12 collectible packages, Vic's fence
- A full day/night cycle: golden-hour sunset fading into neon night
- 6 radio stations, from SUNSET 88.5 to LA ONDA 92.1
- A respect ladder from NOBODY to BAY LEGEND, daily challenges, a garage with tuning, and a corner-store shop
- Progress saves to localStorage; `window.__solmar` exposes the live game state for debugging

## Tech notes

- Plain ES modules, no build step, no dependencies
- 3D via three.js, vendored under `game/vendor/`
- `game/src/main.js` is the boot hub; every other module exports an `init` taking the shared context object
- `serve.ts` is a tiny Node static server for the `game/` folder
- `tools/shots.mjs` stages and captures the four screenshots in `screenshots/`
- `main.ts` mirrors the entry and writes the deterministic `dossier.json`

## Originality

Everything in SOLMAR BAY is original — city, characters, districts, radio stations, dialogue — except the vendored three.js library, which is MIT-licensed. No Rockstar assets, names, story, art, sound or music are used.
