# SOLMAR BAY

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, playable in a desktop browser from static files. Solmar Bay is a sun-soaked bay city at golden hour: one long sunset slides into a lit-up night while you run jobs for Vic Torres, steal cars, outrun the police, and build respect from NOBODY to bay legend — with your crew companion Lena Cruz riding shotgun, talking, and fighting beside you.

## How to play

Serve the `game/` folder with any static server and open `index.html`. No build step, no installs, no network requests. Progress saves to localStorage.

```sh
npx serve game
# or: python3 -m http.server --directory game 8000
```

Start a new game, watch the intro flyover (X skips it), then take the first job at the garage. Jobs pay cash, cash buys food, tuning, and respect, and respect opens the bay.

## Controls

- **WASD / arrow keys** — walk and drive
- **Mouse** — aim and shoot
- **X** — skip cutscene
- **1–4** — switch weapon (Pistol, SMG, Shotgun, Rifle)
- **R** — reload
- **E** — get in or out of a car or bike
- **Q** — change radio station
- **F** — open the shop when near the MART
- **H** — rest at the safehouse (heal up, cool heat)
- **G** — garage (store a car, spawn a stored car)
- **T** — start a street race at the start pad
- **Y** — pick up a taxi fare at the taxi stand
- **V** — sell a car to Vic's fence in his yard
- **P** — pause menu and job list

## Features

- A complete open world: seven named districts to explore on foot and by car, traffic cars and pedestrians, cars to steal and drive (sedan, motorcycle, pickup truck, plus a sport car)
- A wanted level with police who respond, a live police roster with callsigns and tactics, a helicopter at 3+ stars, lay-low spots, hideouts, and a pay-n-spray booth
- 10 story missions on the job board, with briefing dialogue from Lena Cruz and Marco Solis; mission 5 is the crew mission, with Lena joining as a visible companion
- Crew companion Lena Cruz: getaway driver, fighter, and banter partner
- Combat with four weapon slots, ammo, and reloads; the SMG unlocks after job 1
- Shop (the MART corner store) with food that heals, a safehouse that restores full HP and cools heat, and a garage with car tuning (engine, armor, paint, NOS)
- Street checkpoint races, taxi fares, and 12 collectible packages scattered across the city
- A full day/night cycle: golden-hour sunset sliding into a lit-up night
- 6 radio stations, respect ranks, daily challenges with cash payouts, and a wanted board
- A HUD with a minimap, speedometer with gear, wanted stars, and a start screen with a localStorage save

## Showcase screenshots

The four showcase screenshots in `screenshots/` are staged by `tools/shots.mjs`: a police chase with the helicopter, a mission briefing with dialogue, a street race, and a night scene on a bike.

## Credits

SOLMAR BAY — GTA6-01 round 7 rebuild, by Iruwae, 2026. All names, characters, districts, stations, and dialogue are original inventions. No Rockstar assets, names, story, art, sound, or music are used.
