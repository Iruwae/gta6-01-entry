# SOLMAR BAY

[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, playable in a desktop
browser from static files — no build step, no installs, no network
requests. One long golden-hour sunset slides into a lit-up night over a
sun-soaked bay city. You start as a small-time hustler running jobs for
Vic Torres with getaway driver Lena Cruz at your side: steal cars,
outrun the police, win street races, and build your respect from
NOBODY to BAY LEGEND.

## How to play

Serve the `game/` folder with any static server and open `index.html`:

```sh
npx serve game
# or
python3 -m http.server --directory game 8904
```

Then click **NEW GAME**. The intro flyover plays first — press **X** to
skip it. Progress saves to `localStorage` under the key `solmar-save`.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrow keys | Walk and drive |
| Mouse | Aim and shoot |
| X | Skip cutscene |
| 1 – 4 | Switch weapon (Pistol, SMG, Shotgun, Rifle) |
| R | Reload |
| E | Get in or out of a car or bike |
| Q | Change radio station |
| F | Open the shop when near the MART |
| H | Rest at the safehouse (heal up, cool heat) |
| G | Garage (store a car, spawn a stored car) |
| T | Start a street race at the start pad |
| Y | Pick up a taxi fare at the taxi stand |
| V | Sell a car to Vic's fence in his yard |
| P | Pause menu and job list |

## Features

- A complete open world: seven named districts to explore on foot and
  by car, with traffic cars and pedestrians, cars to steal and drive
  (sedan, motorcycle, pickup truck, plus a sport car).
- A wanted level with police who respond, a live officer roster with
  callsigns and tactics, a helicopter at three or more stars, lay-low
  spots, hideouts, and a pay-n-spray booth.
- 10 story missions on the job board, with briefing dialogue from
  Lena Cruz, Marco Solis and Vic Torres. Mission 5 is the crew mission:
  Lena joins as a visible companion who follows, fights and talks.
- Combat with four weapon slots, ammo and reloads; the SMG unlocks
  after the first job.
- A shop (the MART corner store) with food that heals, a safehouse
  that restores full health and cools heat, and a garage with car
  tuning (engine, armor, paint, NOS).
- Street checkpoint races, taxi fares, and 12 collectible packages
  scattered across the city.
- A full day/night cycle: golden-hour sunset sliding into a lit-up
  night, with six radio stations to cycle through.
- Respect ranks, daily challenges with cash payouts, a minimap with
  search zones, a speedometer with gear and vehicle name, and a fence
  who buys your stolen cars.

## Screenshots

The four showcase screenshots in `screenshots/` are staged by
`tools/shots.mjs`: a police chase with the helicopter, a mission
briefing with dialogue, a street race, and a night scene on a bike.

## Tech

Plain JavaScript ES modules, 3D via the vendored three.js build in
`game/vendor/`. The entry point for the submission build is `main.ts`
(run it with `node main.ts`); it mirrors `game/` and `screenshots/`
into the output folder and writes `dossier.json`.

## License

MIT — see `LICENSE`.
