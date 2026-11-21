[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR BAY

An open-world crime game in the spirit of GTA 6, playable in a desktop
browser from static files. A sun-soaked bay city at golden hour: one long
sunset that slides into a lit-up night. You start as a small-time hustler,
run jobs for Vic Torres with getaway driver Lena Cruz, steal cars, outrun
the police, and build respect from NOBODY to BAY LEGEND.

Everything here is original: the city, the characters, the districts, the
radio stations, the dialogue, the art and the music are invented for this
game. No Rockstar assets, names or story are used.

## How to run

No build step, no installs. Serve the `game/` folder with any static
server and open `index.html`:

```sh
cd game
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Or from the repo root (if the repo server is present):

```sh
node serve.ts
```

Progress saves to `localStorage` under the key `solmar-save`.

## Controls

| Keys | Action |
| ---- | ------ |
| WASD / arrows | Walk and drive |
| Mouse | Aim and shoot |
| X | Skip cutscene |
| 1–4 | Switch weapon (Pistol, SMG, Shotgun, Rifle) |
| R | Reload |
| E | Get in / out of a car or bike |
| Q | Change radio station |
| F | Open the shop near the MART |
| H | Rest at the safehouse (heal up, cool heat) |
| G | Garage (store a car, spawn a stored car) |
| T | Start a street race at the start pad |
| Y | Pick up a taxi fare at the taxi stand |
| V | Sell a car to Vic's fence in his yard |
| P | Pause menu and job list |

## Features

- A complete open world: seven districts (Downtown, Harbor, Beach,
  Uptown, The Strip, Marina, Old Town) to explore on foot and by car,
  with traffic, pedestrians, and cars to steal — sedan, motorcycle,
  pickup truck and a sport car.
- 10 story missions on the job board. Mission 1 starts at the garage
  with a briefing from Lena; mission 5 is the crew job, where Lena joins
  as a visible companion who follows, fights and talks.
- A wanted level with police who respond — a live roster with callsigns,
  distances and tactics (pursuit, ramming, roadblock, search), a
  helicopter at 3+ stars, lay-low spots and a pay-n-spray booth.
- Combat with four weapon slots, ammo and reloads. The SMG unlocks after
  the first job.
- The MART corner store (food heals), a safehouse, and a garage with car
  tuning (engine, armor, paint, NOS).
- Street checkpoint races ($300 a win), taxi fares, and 12 collectible
  packages ($50 each).
- A full day/night cycle: golden-hour sunset sliding into a lit-up
  night, with 6 radio stations to cycle through.
- Respect ranks, daily challenges with cash payouts, and a wanted board.

## Layout

- `game/index.html` — page shell and HUD.
- `game/src/main.js` — boot hub: renderer, state, context, module
  loading, animation loop.
- `game/src/config.js` — tuning constants (districts, stations,
  weapons, missions, prices, positions).
- `game/src/state.js` — game state plus the working fallback directors
  (respect, challenges, banter, fence, heat).
- `game/src/input.js` — keyboard and mouse state.
- `game/src/random.js` — small random helpers.
- `game/vendor/` — vendored three.js (unmodified).
- `main.ts` — the make.fun entrypoint: builds the submission dossier
  from this file's own location, never from the working directory.

## License

MIT — see `LICENSE`.
