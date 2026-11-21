[![SOLMAR BAY — gta6-01](https://make.fun/c/gta6-01/badge.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/c/gta6-01/rank-badge.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/c/gta6-01/reward-badge.svg)](https://make.fun/c/gta6-01)

# SOLMAR BAY — A sunset crime story

An original open-world crime game in the spirit of GTA 6, built for the
make.fun **gta6-01** bounty. One long golden-hour sunset slides into a
lit-up night over a sun-soaked bay city. You start as a small-time
hustler with $120, run jobs for Vic Torres with getaway driver Lena Cruz
riding along, steal cars, outrun the Solmar PD, and build your respect
from NOBODY to BAY LEGEND.

Everything is original: the city, the characters, the districts, the
radio stations, the dialogue. No Rockstar assets, names, story, art,
sound or music.

## How to play

```sh
node serve.ts
```

Then open http://127.0.0.1:8904/ in desktop Chrome. Progress saves to
localStorage automatically.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk and drive |
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

- A living bay city with 7 districts — Downtown, Harbor, Beach, Uptown,
  The Strip, Old Town and Palm Row — with traffic, pedestrians, gulls and
  a bay at the east edge.
- 10 story missions with the crew mission at job 5, when Lena Cruz joins
  you and rides along.
- Police that think: a utility brain picks PURSUIT, RAMMING, ROADBLOCK
  or SEARCH, a wanted level from 0 to 5 stars, and a helicopter at 3+
  stars.
- Side hustles: checkpoint street races, taxi fares, 12 collectible
  packages, and selling stolen cars to Vic's fence.
- A day/night cycle: golden hour fades through dusk into neon night,
  with a shader sky, stars, a moon and windows that light up.
- 6 radio stations with their own tracks, a respect ladder from NOBODY
  to BAY LEGEND, daily challenges that pay out, a garage with tuning
  (engine, armor, paint, NOS), a corner-store shop and a pay-n-spray
  booth that wipes your heat clean.

## Tech notes

- Plain ES modules, no build step, no installs, no dependencies.
- 3D via three.js, vendored under `game/vendor/` (`three.module.min.js`).
- `game/src/main.js` is the boot hub and the only file that imports the
  other modules; every module exports an `init` taking the shared
  context object `ctx`.
- `node serve.ts` serves the `game/` folder on port 8904.
- `tools/shots.mjs` drives the game headless and takes the four
  screenshots in `screenshots/`.
- `window.__solmar` exposes the live game state for debugging and
  automated checks.

## Originality

Everything in this game — the city, the characters, the story, the
dialogue, the radio shows, the art and the code — is original work made
for this entry, except the vendored three.js library under `game/vendor/`,
which is MIT-licensed.
