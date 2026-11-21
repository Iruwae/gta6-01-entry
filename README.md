[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR BAY — A sunset crime story

An original open-world crime game in the spirit of GTA 6, built for the
make.fun **gta6-01** bounty. One long golden-hour sunset slides into a
lit-up night over a sun-soaked bay city. You start as a small-time
hustler with $120, run jobs for Vic Torres with getaway driver Lena Cruz
riding along, steal cars, outrun the Solmar PD, and build respect from
NOBODY to BAY LEGEND.

Everything is original: the city, the characters, the districts, the
radio stations, the dialogue. No Rockstar assets, names, story, art,
sound or music.

## How to play

```sh
node serve.ts
# open http://127.0.0.1:8904/
```

## Controls

- **WASD / arrows** — walk and drive (Shift sprints on foot)
- **Mouse** — aim and shoot
- **1–4** — switch weapon (Pistol, SMG, Shotgun, Rifle)
- **R** — reload
- **E** — get in / out of a car or bike
- **Q** — change radio station
- **X** — skip cutscene
- **F** — open the shop near the MART
- **H** — rest at the safehouse
- **G** — garage (store a car, spawn a stored car, tune it)
- **T** — start a street race at the start pad
- **Y** — pick up a taxi fare at the taxi stand
- **V** — sell a car to Vic's fence in his yard
- **P** — pause menu and job list

## What's inside

- A living bay city with **7 districts** — Downtown, Harbor, Beach, Uptown, The Strip, Old Town, Palm Row — traffic, pedestrians, gulls and a bay that catches the last light.
- **10 story missions** with a crew mission at job 5, where Lena Cruz joins you, plus briefing dialogues with Lena, Vic Torres and Marco Solis.
- **Police that think** — a utility brain picks RAMMING, ROADBLOCK, PURSUIT or SEARCH, a wanted level from 0–5 stars, a roster on the HUD, and a helicopter at 3+ stars.
- **Side hustles** — checkpoint street races, taxi fares, 12 collectible packages, and selling stolen cars to Vic's fence.
- **Day/night cycle** — the clock opens at 18:28 and the sunset slides into neon night; windows light up, stars come out, the sun cools blue.
- **6 radio stations** with their own tracks, a **respect ladder** from NOBODY to BAY LEGEND, **daily challenges**, a **garage** with engine/armor/NOS tuning, a **corner-store shop**, a **safehouse**, and a **pay-n-spray** booth.
- Progress saves to localStorage; `window.__solmar` exposes the live game state for debugging.

## Tech notes

- Plain ES modules, no build step, no dependencies. 3D via three.js, vendored under `game/vendor/`.
- `game/src/main.js` is the boot hub and the only file that imports the other modules; every module exports an `init` taking the shared context object `ctx`, and modules only talk through it.
- `serve.ts` serves `game/` on 127.0.0.1:8904. `tools/shots.mjs` stages and shoots the four screenshots. `main.ts` mirrors `game/` + `screenshots/` into the output folder and writes `dossier.json`.

## Originality note

Everything in this entry is original — city, characters, districts, radio stations, dialogue, story — except the vendored three.js library under `game/vendor/`, which is the official three.js build under its MIT license.
