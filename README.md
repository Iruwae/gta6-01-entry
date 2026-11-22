# SOLMAR BAY

[![SOLMAR BAY](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in the spirit of GTA 6, built for the
make.fun gta6-01 bounty. One long golden-hour sunset slides into a lit-up
night over a sun-soaked bay city. You start as a small-time hustler with
$120, run jobs for Vic Torres with getaway driver Lena Cruz riding along,
steal cars, outrun the police, and build respect from NOBODY to BAY LEGEND.
Everything is original: city, characters, districts, radio stations,
dialogue. No Rockstar assets, names, story, art, sound or music.

## How to play

```sh
node serve.ts
# open http://127.0.0.1:8904/
```

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

- A living bay city with 7 districts, traffic, pedestrians and gulls
- 10 story missions, with the crew mission at job 5 (Lena rides along)
- Police that think: a utility brain picks RAMMING, ROADBLOCK, PURSUIT or SEARCH, plus a helicopter at 3+ stars
- Side hustles: street races, taxi fares, collectible packages, fence sales
- A full day/night cycle: golden hour fades into neon night
- 6 radio stations with original tracks
- A respect ladder from NOBODY to BAY LEGEND
- Daily challenges that pay out the moment you hit the target
- Garage tuning (engine, armor, paint, NOS), a corner-store shop, a safehouse and a pay-n-spray booth

## Tech notes

- Plain ES modules, no build step, no dependencies at runtime
- three.js is vendored under `game/vendor/` (official r187 build)
- `game/src/main.js` is the boot hub; every module exports an `init(ctx)`
- `serve.ts` serves the `game/` folder; `tools/shots.mjs` takes the screenshots
- `window.__solmar` exposes the live game state for debugging and automated checks

## Originality

Everything in this entry is original — city, characters, districts, radio
stations, dialogue, missions — except the vendored three.js library, which
is the official open-source build.
