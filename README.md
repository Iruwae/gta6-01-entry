[![gta6-01](https://make.fun/c/gta6-01/badge)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/c/gta6-01/rank-badge)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/c/gta6-01/reward-badge)](https://make.fun/c/gta6-01)

# SOLMAR BAY — A sunset crime story

An original open-world crime game in the spirit of GTA 6. One long golden-hour sunset slides into a lit-up night over a sun-soaked bay city. Start as a small-time hustler with $120, run jobs for Vic Torres with getaway driver Lena Cruz riding along, steal cars, outrun the police, and build respect from NOBODY to BAY LEGEND.

## How to play

```sh
node serve.ts
```

Then open http://127.0.0.1:8904/ in desktop Chrome.

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
- **G** — garage (store a car, spawn a stored car)
- **T** — start a street race at the start pad
- **Y** — pick up a taxi fare at the taxi stand
- **V** — sell a car to Vic's fence in his yard
- **P** — pause menu and job list

## What's inside

- A living bay city with **7 districts** — Downtown, Harbor, Beach, Uptown, The Strip, Old Town, Palm Row — traffic, pedestrians, gulls, and a day/night cycle that slides from golden hour into neon night
- **10 story missions** with Vic Torres, Lena Cruz and Marco Solis — including the crew mission at job 5, where Lena rides with you
- **Police that think**: a utility brain picks RAMMING, ROADBLOCK, PURSUIT or SEARCH, a wanted level from 0–5 stars, a police helicopter at 3+ stars, and a live dispatch roster on the HUD
- **Side hustles**: checkpoint street races, taxi fares, 12 collectible packages, and Vic's fence yard where hot cars turn into cash
- **Progression**: a respect ladder from NOBODY to BAY LEGEND, daily challenges that pay out, a garage with engine/armor/paint/NOS tuning, a corner-store shop, a safehouse to rest in, and a pay-n-spray booth to wipe your heat
- **6 radio stations** with their own tracks and banter from Lena and Vic
- HUD with minimap, wanted stars, health, weapon slots, speedometer and objective; progress saves to localStorage

## Tech notes

- Plain ES modules, no build step, no dependencies. `node serve.ts` serves `game/`.
- 3D via three.js, vendored under `game/vendor/` (`three.module.min.js`, r187).
- `game/src/main.js` is the boot hub and the only file that imports the other modules; every module exports an `init` taking the shared context object `ctx`, and modules only talk through it.
- `tools/shots.mjs` takes the four screenshots (headless Chrome); `window.__solmar` exposes the live game state for debugging and automated checks.

## Originality

Everything in SOLMAR BAY is original — the city, characters, districts, radio stations, dialogue and story — except the vendored three.js library, which is MIT licensed.
