[![make.fun](https://make.fun/c/gta6-01/badge.svg)](https://make.fun/c/gta6-01) [![rank](https://make.fun/c/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/c/gta6-01) [![reward](https://make.fun/reward.svg)](https://make.fun/c/gta6-01)

# SOLMAR BAY — A sunset crime story

An original open-world crime game in the spirit of GTA 6, built for the make.fun gta6-01 bounty.

One long golden-hour sunset slides into a lit-up night over a sun-soaked bay city. You start as a
small-time hustler with $120, run jobs for Vic Torres with getaway driver Lena Cruz riding along,
steal cars, outrun the Solmar PD, and build respect from NOBODY to BAY LEGEND. Everything is
original: the city, the characters, the districts, the radio stations, the dialogue. No Rockstar
assets, names, story, art, sound or music.

## How to play

```sh
node serve.ts
```

Then open http://127.0.0.1:8904/ in desktop Chrome.

## Controls

- **WASD / arrows** — walk and drive
- **Mouse** — aim and shoot (hold to fire)
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

- A living bay city with 7 districts — Downtown, Harbor, Beach, Uptown, The Strip, Old Town, Palm Row
- 10 story missions, with the crew mission at job 5 (Lena rides with you)
- Police that think: a utility brain picks RAMMING, ROADBLOCK, PURSUIT or SEARCH, with a helicopter at 3+ stars and a live dispatch roster
- Side hustles: street races, taxi fares, 12 collectible packages, and Vic's fence
- A full day/night cycle — golden hour fading into neon night
- 6 radio stations, from SUNSET 88.5 to LA ONDA 92.1
- A respect ladder from NOBODY to BAY LEGEND, daily challenges, a garage with tuning, and a corner-store shop
- Progress saves to localStorage; `window.__solmar` exposes the live game state for debugging

## Tech notes

- Plain ES modules, no build step, no dependencies at runtime
- 3D via three.js, vendored under `game/vendor/`
- `game/src/main.js` is the boot hub; every module exports an `init` taking the shared context object
- `serve.ts` serves `game/` on 127.0.0.1:8904
- `tools/shots.mjs` takes the four screenshots in `screenshots/`
- `main.ts` mirrors `game/` and `screenshots/` into the output folder and writes `dossier.json`

## Originality

Everything in this game is original — city, characters, story, dialogue, radio, art — except the
vendored three.js library under `game/vendor/`, which is MIT-licensed.
