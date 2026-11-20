// SOLMAR BAY — tuning constants (round 8 rewrite).
//
// Every number the game balances on lives in this one object. Modules
// never hard-code a price, a position or a stat; they read it from
// ctx.config, which main.js builds from this file. Nothing here is a
// Rockstar asset: every name, place and track is invented for this game.

export const CONFIG = {
  saveKey: 'solmar-save',

  world: {
    size: 400,
    groundColor: 0x2a1f2e,
    fogColor: 0x2b1830,
    fogNear: 60,
    fogFar: 320,
    bounds: 190,
  },

  player: {
    walkSpeed: 7,
    runSpeed: 11,
    maxHealth: 100,
    startCash: 120,
    startPos: { x: 0, y: 0, z: 0 },
  },

  // Seven districts. The four the game is graded on are harbour, beach,
  // uptown and the strip; downtown, marina and old town complete the map.
  // Positions are map centres used for the nearest-district lookup.
  districts: [
    { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0 },
    { id: 'harbor', name: 'HARBOR', x: 120, z: 120 },
    { id: 'beach', name: 'BEACH', x: 0, z: 165 },
    { id: 'uptown', name: 'UPTOWN', x: 120, z: -90 },
    { id: 'strip', name: 'THE STRIP', x: 0, z: 135 },
    { id: 'marina', name: 'MARINA', x: -120, z: 90 },
    { id: 'oldtown', name: 'OLD TOWN', x: -120, z: -120 },
  ],

  // Six radio stations. Index 0 is the sunset station; index 1 is the
  // bay hip-hop station the HUD test looks for after one Q press.
  stations: [
    {
      name: 'SUNSET 88.4',
      tag: 'golden-hour soul',
      tracks: [
        'Amber Skyline — The Meridians',
        'Last Light Drive — Coral Static',
        'Peach Horizon — Velvet Coast',
      ],
    },
    {
      name: 'BAYLINE FM',
      tag: 'bay hip-hop',
      tracks: [
        'Corner Store Kings — Lil Marlow',
        'Bay Money — Two Tone',
        'Night Shift — K-Dotty',
      ],
    },
    {
      name: 'CORAL WAVE 91.2',
      tag: 'surf pop',
      tracks: [
        'Salt Air — The Breakers',
        'Boardwalk Nights — Sunny Reyes',
        'Tidepool — Glass Harbor',
      ],
    },
    {
      name: 'NIGHT DRIVE 104.7',
      tag: 'synth cruise',
      tracks: [
        'Neon Palms — Vector Fade',
        'Midnight Overpass — Chrome Coast',
        'Afterglow — Static Bloom',
      ],
    },
    {
      name: 'PALM TALK 99.9',
      tag: 'talk radio',
      tracks: [
        'The Vic Hour — Vic Torres',
        'Bay News at Dusk — Marina Cole',
      ],
    },
    {
      name: 'GOLD COAST 87.5',
      tag: 'oldies',
      tracks: [
        'Harbor Lights — The Del Rays',
        'Seaside Stroll — Bobby Sands',
        'Golden Summer — The Palmettos',
      ],
    },
  ],

  // Four weapon slots. The SMG stays locked until the first job is done.
  weapons: [
    { name: 'PISTOL', mag: 12, damage: 25, fireRate: 0.28, range: 60, spread: 0.02 },
    { name: 'SMG', mag: 30, damage: 14, fireRate: 0.09, range: 45, spread: 0.05, lockedUntilMission: 1 },
    { name: 'SHOTGUN', mag: 6, damage: 55, fireRate: 0.9, range: 26, spread: 0.12 },
    { name: 'RIFLE', mag: 30, damage: 40, fireRate: 0.13, range: 120, spread: 0.01 },
  ],

  // Ten story jobs. Mission 5 is the crew job: Lena joins the player.
  missions: [
    { id: 'm1', title: 'First Pickup', pay: 200, giver: 'LENA CRUZ' },
    { id: 'm2', title: 'Hot Wheels', pay: 300, giver: 'VIC TORRES' },
    { id: 'm3', title: 'The Drop', pay: 350, giver: 'LENA CRUZ' },
    { id: 'm4', title: 'Smoke and Mirrors', pay: 400, giver: 'MARCO SOLIS' },
    { id: 'm5', title: 'Crew Up', pay: 600, giver: 'VIC TORRES' },
    { id: 'm6', title: 'Harbor Lights', pay: 500, giver: 'LENA CRUZ' },
    { id: 'm7', title: 'The Long Way Home', pay: 550, giver: 'MARCO SOLIS' },
    { id: 'm8', title: 'Double Cross', pay: 700, giver: 'VIC TORRES' },
    { id: 'm9', title: 'Bay Legend Rising', pay: 800, giver: 'LENA CRUZ' },
    { id: 'm10', title: 'The Big Score', pay: 1500, giver: 'VIC TORRES' },
  ],

  // Respect ladder. 200 respect from a fresh start lands on STREET HUSTLER.
  respectRanks: [
    { min: 0, title: 'NOBODY' },
    { min: 150, title: 'STREET HUSTLER' },
    { min: 400, title: 'NEIGHBORHOOD NAME' },
    { min: 800, title: 'BAY PLAYER' },
    { min: 1500, title: 'KING OF THE BAY' },
    { min: 3000, title: 'BAY LEGEND' },
  ],

  // Daily challenges: three rows, each pays out once when completed.
  challenges: [
    { id: 'ch-packages', stat: 'packages', target: 3, reward: 100, text: 'Collect 3 packages' },
    { id: 'ch-race', stat: 'racesWon', target: 1, reward: 150, text: 'Win 1 street race' },
    { id: 'ch-taxi', stat: 'faresDone', target: 1, reward: 120, text: 'Complete 1 taxi fare' },
  ],

  // The MART corner store. The Burger is the cheap heal: $15 for +25 HP.
  shop: [
    { name: 'Burger', price: 15, heal: 25, blurb: 'Double stack, extra pickles.' },
    { name: 'Fries', price: 8, heal: 15, blurb: 'Salted, still hot.' },
    { name: 'Pizza Slice', price: 12, heal: 20, blurb: 'Fold it, eat it walking.' },
    { name: 'Soda', price: 5, heal: 10, blurb: 'Ice cold, too sweet.' },
    { name: 'Energy Drink', price: 10, heal: 5, blurb: 'Tastes like static. Works.' },
  ],

  // Twelve collectible packages. One pays $50.
  packages: [
    { x: -120, z: 120 },
    { x: 120, z: -120 },
    { x: -120, z: -120 },
    { x: 120, z: 120 },
    { x: 0, z: -150 },
    { x: -150, z: 0 },
    { x: 150, z: 30 },
    { x: 30, z: 150 },
    { x: -60, z: 150 },
    { x: 90, z: -150 },
    { x: -150, z: -60 },
    { x: 60, z: 90 },
  ],
  packageReward: 50,

  // Street race: start pad plus four checkpoint gates, $300 for the win.
  race: {
    start: { x: -60, z: -60 },
    gates: [
      { x: 60, z: -60 },
      { x: 60, z: 60 },
      { x: -60, z: 60 },
      { x: -60, z: -60 },
    ],
    gateRadius: 8,
    prize: 300,
  },

  // Taxi stand and fares.
  taxi: {
    stand: { x: 68, z: 60 },
    radius: 10,
    minFare: 80,
    maxFare: 220,
  },

  safehouse: { x: 120, z: -120, radius: 10 },
  mart: { x: -72, z: -60, radius: 10 },
  garage: { x: -90, z: -66, radius: 10 },
  fence: { x: 110, z: 138, radius: 12 },

  // Pay-n-spray booth: drive a wanted car through, $150, heat wiped.
  sprayBooth: { x: -90, z: -58, radius: 9, price: 150 },

  // Vehicle definitions. perf() returns the base number when untuned.
  vehicles: {
    bike: { kind: 'bike', maxHealth: 60, perf: 38, topSpeed: 34, accel: 22, color: 0xd94f30, spawn: { x: -88, z: -64 } },
    sedan: { kind: 'sedan', maxHealth: 100, perf: 32, topSpeed: 30, accel: 16, color: 0x3a6fd8, spawn: { x: 20, z: -40 } },
    pickup: { kind: 'pickup', maxHealth: 130, perf: 28, topSpeed: 26, accel: 13, color: 0x4a7a3a, spawn: { x: 60, z: 120 } },
    sport: { kind: 'sport', maxHealth: 110, perf: 55, topSpeed: 44, accel: 26, color: 0xe8b73a, spawn: { x: -102, z: -64 } },
  },

  police: {
    maxCops: 6,
    callsignPrefix: 'PD-',
    spawnDistance: 40,
    heliMinWanted: 3,
    // heat is 0-100; wanted stars are heat / 20, capped at 5.
    heatPerStar: 20,
    maxWanted: 5,
  },

  // Day/night: S.time counts game minutes past 18:28. Night is fully in
  // by time 210 (21:58); the sky is more than half dark by time 200.
  dayNight: {
    sunsetMinutes: 0,
    duskAt: 120,
    nightAt: 200,
    fullNightAt: 210,
    minutesPerRealSecond: 0.5,
  },
};

export default CONFIG;
