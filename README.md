# gta6-01-entry

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Iruwae/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLMAR BAY** — an original open-world crime game in the spirit of GTA 6, built
for the make.fun gta6-01 bounty. Marco Solis is back in Solmar Bay with $120 in
his pocket and a debt on his name. Lena Cruz runs the Bayline garage — and she
has work for a driver who asks no questions. Steal cars, outrun the Bayline PD,
and pull the four story jobs that pay off the debt.

The city is fully procedural (deterministic seed, same streets every load):
a 300×300 m grid of roads, blocks and towers, a beach, a pier and a harbor,
with traffic, pedestrians, a day-lit sun-soaked look, and synthesized WebAudio
music and effects — no audio files, no network at runtime, everything under
`game/`.

What is in the game:

- **Open city, on foot and by car** — walk, sprint, steal any parked or
  traffic car (E) and drive it with arcade handling, collisions, damage,
  smoke and explosions.
- **Traffic + pedestrians** — 14 traffic cars on the road grid, 24 wandering
  pedestrians who flee gunfire, parked cars to steal.
- **Wanted level + police** — 5 stars driven by a heat system (stealing,
  shooting, running people over); police cars chase and ram, foot cops chase
  and arrest (BUSTED) when they hold you.
- **Missions + story** — 4 sequential jobs from Lena: move the sport car to
  the bank, a timed two-drop courier run, clear the harbor crew, and the big
  score: steal the bank van and escape a 3-star dragnet to the garage.
- **Combat** — pistol with crosshair aim, raycast hits, damage numbers,
  hit-stop, trauma shake, muzzle flash and particles.
- **HUD + minimap** — health, cash, wanted stars, speed, mission objective,
  a live circular minimap with roads, landmarks, cops and the mission marker.
- **Screens + save** — title screen with continue, pause menu (P) with save,
  WASTED / BUSTED end screens with retry; progress autosaves to localStorage.
- **Polish** — start/pause/end menus, toasts, damage flash, synthesized
  engine, siren, shots and a chill Am–F–C–G music loop (M mutes).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome and click NEW GAME.
Controls: **WASD** move / drive · **Mouse** look · **Click** shoot ·
**E** enter & steal cars · **Shift** sprint · **R** reload · **P** pause ·
**M** mute.

## Tech

- Three.js 0.187, vendored minified under `game/vendor/`; static files only,
  no build step, no network at runtime.
- Source split by system under `game/src/`: `city`, `vehicles`, `people`,
  `player`, `missions`, `hud`, `audio`, `juice`, `input`, `state`, `config`.
- `main.ts` hands the game in: it copies `game/` + `screenshots/` to the
  output dir and writes `dossier.json` with the vendored make.fun library.
  Local check: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=817k0hr2&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
