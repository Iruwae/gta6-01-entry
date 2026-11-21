// SOLMAR BAY — tuning constants for the round 9 rebuild.
// Every number the game balances on lives here so the modules stay dumb
// and the state stays honest. Original setting, original names.

export const CONFIG = {
  title: 'SOLMAR BAY',
  tagline: 'A sunset crime story',

  // Wallet / calendar
  startCash: 120,
  startDay: 1,
  // Minutes after 18:28 when a fresh day begins. S.time counts minutes
  // from this sunset; 200 minutes in, the clock reads 21:48 (night).
  dayStartClockMin: 18 * 60 + 28,
  minutesPerDay: 1440,
  // Game minutes that pass per real second while playing.
  timeRate: 0.5,
  nightStartMin: 150, // 21:00 — full night from here
  duskStartMin: 62, // 19:30 — sunset fades into dusk

  // Player
  playerSpeed: 9,
  playerSprint: 13,
  maxHealth: 100,

  // Radio — 6 stations. Index 1 must stay BAYLINE: the smoke test cycles
  // Q once from 0 and expects the HUD to show a BAYLINE name.
  stations: [
    {
      id: 'sunset', name: 'SUNSET 88.5', blurb: 'Golden hour, all day',
      tracks: [
        'Amber Skyline — The Dusk Riders',
        'Palms at Dusk — Marina Sol',
        'Last Light — Coral Club',
        'Sunset Strip — The Bayliners',
      ],
    },
    {
      id: 'bayline', name: 'BAYLINE FM', blurb: 'Bay talk and traffic',
      tracks: [
        'Bayline Morning — Dee Marsh',
        'The Tidal Report — Solmar Newsdesk',
        'Harbor Lights — The Ferries',
      ],
    },
    {
      id: 'dusk', name: 'DUSK 96.7', blurb: 'Slow jams after dark',
      tracks: [
        'Velvet Hour — Nico Palma',
        'Neon Palms — Sadie Volt',
        'Two A.M. — The Low Tides',
      ],
    },
    {
      id: 'harbor', name: 'HARBOR HITS 104.3', blurb: 'Dockside anthems',
      tracks: [
        'Container Blues — Big Ray Ketch',
        'Foghorn — The Cranes',
        'Salt Air — Lulu Marlin',
      ],
    },
    {
      id: 'tropicana', name: 'TROPICANA 107.9', blurb: 'Salsa and static',
      tracks: [
        'Mango Moon — Los Brillos',
        'Calle Ocho — Rosa Delgado',
        'Piña Colada Radio — DJ Fuego',
      ],
    },
    {
      id: 'onda', name: 'LA ONDA 92.1', blurb: 'Surf rock and static',
      tracks: [
        'Boardwalk — The Breakers',
        'Rip Current — Sandy Toes',
        'High Tide — The Undertows',
      ],
    },
  ],

  // Districts — 7 of them. The four the tests pin down are exact:
  // HARBOR (120,120), BEACH (0,165), UPTOWN (120,-90), THE STRIP (0,135).
  districts: [
    { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0, color: '#e8a34c' },
    { id: 'harbor', name: 'HARBOR', x: 120, z: 120, color: '#5fb4c9' },
    { id: 'beach', name: 'BEACH', x: 0, z: 165, color: '#f2d492' },
    { id: 'uptown', name: 'UPTOWN', x: 120, z: -90, color: '#b48ce8' },
    { id: 'strip', name: 'THE STRIP', x: 0, z: 135, color: '#ff7a9e' },
    { id: 'oldtown', name: 'OLD TOWN', x: -120, z: -60, color: '#c98a5f' },
    { id: 'palms', name: 'PALM ROW', x: -120, z: 120, color: '#7ec98a' },
  ],

  // Weapons — slot order is the 1-4 key order. needsMissions is the
  // missionIndex that unlocks the slot; the SMG opens after job 1.
  weapons: [
    { id: 'pistol', name: 'PISTOL', magSize: 12, damage: 26, fireInterval: 0.22, reloadTime: 1.2, needsMissions: 0, range: 60 },
    { id: 'smg', name: 'SMG', magSize: 30, damage: 14, fireInterval: 0.09, reloadTime: 1.4, needsMissions: 1, range: 55 },
    { id: 'shotgun', name: 'SHOTGUN', magSize: 6, damage: 55, fireInterval: 0.85, reloadTime: 2.0, needsMissions: 3, range: 28 },
    { id: 'rifle', name: 'RIFLE', magSize: 24, damage: 42, fireInterval: 0.14, reloadTime: 1.6, needsMissions: 5, range: 120 },
  ],

  // MART corner store. The Burger is the load-bearing row: $15, +25 HP.
  shopItems: [
    { id: 'burger', name: 'Burger', price: 15, heal: 25, desc: 'Double stack, extra pickles.' },
    { id: 'cola', name: 'Cola', price: 5, heal: 10, desc: 'Ice cold, bay classic.' },
    { id: 'sandwich', name: 'Sandwich', price: 10, heal: 15, desc: 'Deli fresh, toasted.' },
    { id: 'coffee', name: 'Coffee', price: 4, heal: 5, desc: 'Burnt, strong, honest.' },
    { id: 'bandage', name: 'Bandage', price: 20, heal: 40, desc: 'Patches you right up.' },
    { id: 'snack', name: 'Snack Bar', price: 3, heal: 5, desc: 'Mostly sugar, some hope.' },
    { id: 'ammo', name: 'Ammo Box', price: 30, heal: 0, desc: 'A full spare magazine.' },
  ],
  martPos: { x: -72, z: -60 },
  martRadius: 7,

  // Safehouse (the motel) and garage door.
  safehousePos: { x: 120, z: -120 },
  safehouseRadius: 8,
  garagePos: { x: -90, z: -66 },
  garageRadius: 10,

  // Pay-n-spray booth: drive a wanted car through, $150, heat to zero.
  paynspray: { x: -90, z: -58, cost: 150, radius: 9 },

  // Street race start pad and taxi stand.
  racePad: { x: -60, z: -60 },
  racePadRadius: 8,
  racePrize: 300,
  taxiStand: { x: 68, z: 60 },
  taxiStandRadius: 8,

  // Story jobs — 10 on the board. Mission 5 is the crew job.
  missions: [
    { id: 'm1', title: 'FIRST JOB', giver: 'LENA CRUZ', pay: 200, desc: 'Meet Lena at the garage. Vic has work.' },
    { id: 'm2', title: 'HOT WHEELS', giver: 'VIC TORRES', pay: 300, desc: 'Lift a ride and bring it to the yard.' },
    { id: 'm3', title: 'DEAD DROP', giver: 'MARCO SOLIS', pay: 350, desc: 'A package changes hands on the Strip.' },
    { id: 'm4', title: 'QUIET STREETS', giver: 'LENA CRUZ', pay: 400, desc: 'Lose the tail, then make the pickup.' },
    { id: 'm5', title: 'CREW UP', giver: 'VIC TORRES', pay: 600, desc: 'Lena rides with you. Hit the convoy together.' },
    { id: 'm6', title: 'HARBOR LIGHTS', giver: 'MARCO SOLIS', pay: 550, desc: 'Something is coming in on the night boat.' },
    { id: 'm7', title: 'THE LONG WAY', giver: 'LENA CRUZ', pay: 650, desc: 'Drive the long way. Do not get followed.' },
    { id: 'm8', title: 'PAYBACK', giver: 'VIC TORRES', pay: 800, desc: 'Somebody shorted Vic. Collect, politely.' },
    { id: 'm9', title: 'GOLDEN HOUR', giver: 'MARCO SOLIS', pay: 900, desc: 'One last score before the sun goes down.' },
    { id: 'm10', title: 'BAY LEGEND', giver: 'VIC TORRES', pay: 1500, desc: 'The whole bay is watching. Make it count.' },
  ],

  // Daily challenges — the board pays each one once per day.
  challenges: [
    { id: 'daily-packages', stat: 'packages', target: 3, reward: 100, text: 'Collect 3 packages' },
    { id: 'daily-race', stat: 'racesWon', target: 1, reward: 150, text: 'Win 1 street race' },
    { id: 'daily-fare', stat: 'faresDone', target: 1, reward: 120, text: 'Finish 1 taxi fare' },
  ],

  // Respect ladder. +200 from 0 must land on STREET HUSTLER.
  ranks: [
    { min: 0, title: 'NOBODY' },
    { min: 50, title: 'SMALL-TIME' },
    { min: 150, title: 'STREET HUSTLER' },
    { min: 400, title: 'CREW LEADER' },
    { min: 800, title: 'BAY BOSS' },
    { min: 1500, title: 'BAY LEGEND' },
  ],

  // Heat: wanted stars are heat / 20, capped at 5.
  heatPerStar: 20,
  maxWanted: 5,
  heliAtStars: 3,

  // Fence base quotes by vehicle kind (before condition / wanted bonus).
  fenceBase: { bike: 220, sedan: 420, pickup: 520, sport: 900 },

  // Vehicle base stats the smoke test pins down.
  vehicleBase: {
    bike: { maxHealth: 60, perf: 38 },
    pickup: { maxHealth: 130, perf: 28 },
    sedan: { maxHealth: 100, perf: 32 },
    sport: { maxHealth: 110, perf: 52 },
  },

  packageCount: 12,
  packageReward: 50,

  // Look
  colors: {
    amber: '#ffb347',
    ember: '#ff7a3d',
    pink: '#ff7a9e',
    dusk: '#2a1a3a',
    panel: 'rgba(22, 12, 34, 0.78)',
  },
};

export default CONFIG;
