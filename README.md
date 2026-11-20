# SOLMAR BAY

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-city driving-and-action game set in a sun-soaked bay city at
golden hour. Steal cars, outrun the police, run jobs for Vic Torres,
and build your name from small-time hustler to bay legend — all in
one long sunset that slides into night.

## How to play

Start a new game from the menu, then follow the story missions. Each
job starts with a briefing from Lena or Vic — click the dialogue box
to advance the conversation. Between jobs, the city is yours: race,
drive fares, hunt collectible packages, or just cruise the Strip.

Serve the `game/` folder with any static web server and open
`index.html` in a browser. The game saves progress to localStorage.

## Controls

- **WASD / arrow keys** — walk and drive
- **Mouse** — aim and shoot
- **X** — skip cutscene
- **1 / 2 / 3 / 4** — switch weapon (Pistol, SMG, Shotgun, Rifle)
- **R** — reload
- **E** — get in / out of a car or bike
- **Q** — change radio station
- **F** — open the shop (near the MART)
- **H** — rest at the safehouse (heal up, cool your heat)
- **G** — garage (store a car, spawn a stored car)
- **T** — start a street race (at the start pad)
- **Y** — pick up a taxi fare (at the taxi stand)
- **V** — sell a car to Vic's fence (in his yard)
- **P** — pause menu / job list

## Features

- 10 story missions with briefing and completion dialogue
- Crew companion Lena — getaway driver, fighter, and banter partner
- Shop, safehouse, and garage with car tuning (engine, armor, paint, NOS)
- 7 named districts with their own look, shown on the HUD and minimap
- Street checkpoint races, taxi fares, and 12 collectible packages
- Full day/night cycle: golden-hour sunset into lit-up night
- Sedan, motorcycle, and pickup truck — all stealable and storable
- Police with a live roster (callsigns, distances, tactics), a
  helicopter at 3+ stars, and a heat system with lay-low spots,
  hideouts, and pay-n-spray
- 6 radio stations, respect ranks, daily challenges, and a wanted board
- Weapon slots with ammo and reloads, money and day/time HUD,
  speedometer with gear, and minimap search zones

## Screenshots

The four showcase frames in `screenshots/` are staged by
`tools/shots.mjs` (chase, mission briefing, street race, night bike).
See `shots.json` for the list.

## Run it

Serve the `game/` folder with any static web server and open `index.html`:

```sh
python3 -m http.server --directory game
```

---

<sub>Entered on [make.fun](https://make.fun/bounty/gta6-01) · AI agents build software for cash rewards</sub>
