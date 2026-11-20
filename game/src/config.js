// SOLMAR BAY — tuning constants (GTA6-01 round 8 rebuild).
// One place for every number the game balances on: city size, movement,
// money, timings and wanted thresholds. Values here are the single source
// of truth; modules read them through ctx.config, never hard-code them.

export const config = {
  // The city is a square centred on (0, 0); halfExtent is the distance
  // from the centre to each edge in metres.
  cityHalfExtent: 180,
  citySize: 360,
  streetSpacing: 30,
  blockSize: 24,

  // Movement (metres per second).
  walkSpeed: 6,
  runSpeed: 9,
  driveAccel: 14,
  driveTopSpeed: 34,
  driveReverseSpeed: 10,
  driveBrake: 26,
  driveTurn: 2.1,
  bikeTopSpeed: 38,
  heliSpeed: 22,

  // The player.
  startCash: 120,
  startHealth: 100,
  startDay: 1,
  // Clock starts at sunset: time counts minutes since 18:28.
  startClockMinutes: 18 * 60 + 28,
  minutesPerSecond: 0.45,
  nightHour: 21,
  dawnHour: 5,

  // Money.
  packageReward: 50,
  raceWinReward: 300,
  taxiFareMin: 80,
  taxiFareMax: 160,
  sprayCost: 150,
  burgerPrice: 15,
  burgerHeal: 25,
  challengePackageReward: 100,
  challengeRaceReward: 150,
  challengeTaxiReward: 120,

  // Wanted / heat. One star per 20 heat, capped at five stars.
  heatPerStar: 20,
  maxWanted: 5,
  heliMinWanted: 3,
  heatDecayPerSecond: 0.6,
  heatPerCrime: 25,
  maxCops: 6,

  // Weapons: magazine sizes.
  magPistol: 12,
  magSmg: 30,
  magShotgun: 6,
  magRifle: 30,
  reloadSeconds: 1.2,

  // Timings (seconds).
  banterCooldown: 9,
  rosterRefresh: 0.25,
  copDecideInterval: 0.4,
  lastKnownStaleSeconds: 8,
  cutsceneLength: 14,
  toastSeconds: 4,
  saveKey: 'solmar-save',

  // World anchors (map x, z in metres).
  garage: { x: -90, z: -66 },
  mart: { x: -72, z: -60 },
  safehouse: { x: 120, z: -120 },
  sprayBooth: { x: -90, z: -58, radius: 9 },
  fenceYard: { x: 110, z: 138 },
  taxiStand: { x: 68, z: 60 },
  racePad: { x: -60, z: -60 },
  sportParked: { x: -102, z: -64 },
  bikeParked: { x: -88, z: -64 },

  // Radio stations, in Q-cycle order. Station 0 is the sunset station.
  stations: [
    { name: 'SUNSET 88', track: 'Golden Hour — The Palms' },
    { name: 'BAYLINE FM', track: 'Neon Coast — Mira Sol' },
    { name: 'PALM TALK', track: 'Bay Voices — Evening Call' },
    { name: 'TIDE 101', track: 'Low Tide — The Breakers' },
    { name: 'DUST RADIO', track: 'Dusty Miles — Roamer' },
    { name: 'NIGHT DRIVE', track: 'Afterglow — Cassie Vale' },
  ],

  // Respect ranks: first rank whose minimum the player has reached wins.
  respectRanks: [
    { min: 0, title: 'NOBODY' },
    { min: 100, title: 'STREET HUSTLER' },
    { min: 300, title: 'CREW LEADER' },
    { min: 600, title: 'BAY BOSS' },
    { min: 1000, title: 'BAY LEGEND' },
  ],

  // The seven districts: id, HUD name, centre and radius.
  districts: [
    { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0, radius: 55 },
    { id: 'harbor', name: 'HARBOR', x: 120, z: 120, radius: 45 },
    { id: 'beach', name: 'BEACH', x: 0, z: 165, radius: 40 },
    { id: 'uptown', name: 'UPTOWN', x: 120, z: -90, radius: 45 },
    { id: 'strip', name: 'THE STRIP', x: 0, z: 135, radius: 30 },
    { id: 'marina', name: 'MARINA', x: -120, z: 90, radius: 40 },
    { id: 'oldtown', name: 'OLD TOWN', x: -120, z: -90, radius: 45 },
  ],
};

export default config;

// Every game/src module exports an init(ctx). The config module just
// publishes the tuning object onto the shared context.
export function init(ctx) {
  ctx.config = config;
}
