[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# SOLMAR BAY — A sunset crime story

**SOLMAR BAY** is an original open-world crime game in the spirit of GTA 6, built for the [make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01). One long golden-hour sunset slides into a lit-up night over a sun-soaked bay city. You start as a small-time hustler with $120, run jobs for Vic Torres with getaway driver Lena Cruz riding along, steal cars, outrun the Solmar PD, and build your respect from NOBODY to BAY LEGEND.

Everything is original: the city, the characters, the districts, the radio stations, the dialogue. No Rockstar assets, names, story, art, sound or music.

## How to play

```sh
node serve.ts
```

Then open http://127.0.0.1:8904/ in a browser. No build step, no installs, no dependencies — plain ES modules, with three.js vendored under `game/vendor/`.

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

- **A living bay city** with 7 districts — Downtown, Harbor, Beach, Uptown, The Strip, Old Town and Palm Row — traffic, pedestrians, gulls and a bay that glows at dusk.
- **10 story missions** with Vic Torres, Lena Cruz and Marco Solis — including the crew mission at job 5, where Lena rides with you.
- **Police that think** — a utility brain picks RAMMING, ROADBLOCK, PURSUIT or SEARCH, a dispatch roster tracks every unit, and a helicopter joins the chase at 3+ stars.
- **Side hustles** — checkpoint street races, taxi fares, 12 collectible packages, and Vic's fence yard where hot cars turn into cash.
- **A day/night cycle** — the sunset fades into neon night, windows light up, stars and the moon come out.
- **6 radio stations** — Sunset 88.5, Bayline FM, Dusk 96.7, Harbor Hits 104.3, Tropicana 107.9 and La Onda 92.1.
- **A respect ladder** from NOBODY to BAY LEGEND, **daily challenges** that pay out, a **garage** with engine/armor/paint/NOS tuning, a **shop**, a **safehouse**, and a **pay-n-spray** booth.
- Progress saves to localStorage; `window.__solmar` exposes the live game state for debugging.

## Tech notes

- Plain ES modules, no build step. `game/src/main.js` is the boot hub and the only file that imports the other modules; every module exports an `init` taking the shared context object `ctx`.
- 3D via three.js (r187), vendored under `game/vendor/` — nothing loads over the network at runtime.
- `serve.ts` serves the `game/` folder; `main.ts` mirrors the entry and writes `dossier.json`.
- `tools/shots.mjs` stages the four screenshots (police chase, garage briefing, street race, night ride) in headless Chrome.

## Originality

Everything in this entry is original — city, characters, districts, radio stations, dialogue, tuning and code — except the vendored three.js library (MIT), which is used as-is under `game/vendor/`.
