[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/competitions/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/competitions/gta6-01)

# SOLMAR BAY

**A sunset crime story.** An original open-world crime game in the spirit of GTA 6, built for the make.fun gta6-01 bounty. One long golden-hour sunset slides into a lit-up neon night over a sun-soaked bay city. You start as a small-time hustler with $120, run jobs for Vic Torres with getaway driver Lena Cruz riding along, steal cars, outrun the Solmar PD, and build respect from NOBODY to BAY LEGEND.

## How to play

```sh
node serve.ts
```

Then open http://127.0.0.1:8904/ in a browser. No build step, no installs, no dependencies — plain ES modules with three.js vendored under `game/vendor/`.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Walk and drive |
| Mouse | Aim and shoot |
| 1–4 | Switch weapon (Pistol, SMG, Shotgun, Rifle) |
| R | Reload |
| E | Get in / out of a car or bike |
| Q | Change radio station |
| X | Skip cutscene |
| F | Open the shop near the MART |
| H | Rest at the safehouse |
| G | Garage (store a car, spawn a stored car) |
| T | Start a street race at the start pad |
| Y | Pick up a taxi fare at the taxi stand |
| V | Sell a car to Vic's fence in his yard |
| P | Pause menu and job list |

## What's inside

- A living bay city with 7 districts — Downtown, Old Town, Palm Row, Harbor, Beach, Uptown and The Strip — plus traffic, pedestrians, gulls and a bay that catches the last light.
- 10 story missions with the crew mission at job 5, where Lena Cruz joins you for the convoy hit.
- Police that think: a utility brain picks RAMMING, ROADBLOCK, PURSUIT or SEARCH, with a helicopter overhead at 3+ stars and a roster that tracks every unit.
- Side hustles: checkpoint street races, taxi fares, 12 collectible packages, and Vic's fence yard where hot cars turn into cash.
- A full day/night cycle — the sunset fades to dusk at 19:30 and full night at 21:00, windows light up and the stars come out.
- 6 radio stations, a respect ladder from NOBODY to BAY LEGEND, daily challenges, garage tuning, and a corner-store shop.
- Progress saves to localStorage; `window.__solmar` exposes the live game state for debugging.

## Tech notes

- Plain JavaScript ES modules, no build step. `game/src/main.js` is the boot hub and the only file that imports the other modules; every module exports an `init` taking the shared context object `ctx`.
- three.js is vendored under `game/vendor/` (r187, single-file module build).
- `serve.ts` serves the `game/` folder. `tools/shots.mjs` stages and captures the four screenshots in `screenshots/`. `main.ts` mirrors the entry into an output folder and writes a deterministic `dossier.json`.

## Originality

Everything in SOLMAR BAY is original — city, characters, districts, radio stations, dialogue — except the vendored three.js library, which is MIT-licensed. No Rockstar assets, names, story, art, sound or music are used.
