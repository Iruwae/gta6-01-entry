// SOLMAR BAY — tuning constants for the GTA6-01 round 7 rebuild.
// One place for every number the game balances on, so a tweak here
// retunes the whole bay without hunting through the modules.

export const config = {
  // The city is a square of streets, 360 units across, centred on 0,0.
  citySize: 360,
  worldBound: 180,
  blockSize: 30,
  roadWidth: 10,

  // On-foot movement, units per second.
  walkSpeed: 6,
  runSpeed: 9.5,
  playerTurnSpeed: 7,

  // Driving. Top speeds are units per second; accel is units/s^2.
  carTopSpeed: 34,
  bikeTopSpeed: 38,
  pickupTopSpeed: 30,
  sportTopSpeed: 46,
  carAccel: 16,
  carBrake: 30,
  carReverseSpeed: 12,

  // Clock. The game opens at golden hour and the clock counts minutes
  // forward from that sunset moment.
  sunsetStartMinutes: 1108, // 18:28
  nightStartOffset: 200, // 200 minutes after sunset -> 21:48
  dayLengthMinutes: 1440,
  minutesPerSecond: 0.12,

  // Money.
  startCash: 120,
  packageReward: 50,
  racePrize: 300,
  taxiFareMin: 80,
  taxiFareMax: 160,
  missionPay: [250, 300, 350, 400, 600, 450, 500, 550, 700, 1200],
  sprayCost: 150,
  burgerPrice: 15,
  burgerHeal: 25,

  // Wanted / heat. Heat runs 0-100; every 20 heat is one star.
  heatPerStar: 20,
  maxHeat: 100,
  maxWanted: 5,
  heatDecayPerSecond: 0.6,
  heliStars: 3,
  maxCops: 6,

  // Health and combat.
  maxHealth: 100,
  reloadSeconds: 1.2,
  pistolMag: 12,
  smgMag: 30,
  shotgunMag: 6,
  rifleMag: 30,

  // Respect ranks. Titles unlock at these point totals.
  respectRanks: [
    { min: 0, title: 'NOBODY' },
    { min: 200, title: 'STREET HUSTLER' },
    { min: 500, title: 'BAY RUNNER' },
    { min: 900, title: 'CREW BOSS' },
    { min: 1500, title: 'BAY LEGEND' },
  ],

  // Daily challenges: stat, target, cash reward.
  challenges: [
    { id: 'ch-packages', stat: 'packages', target: 3, reward: 100, text: 'Collect 3 packages' },
    { id: 'ch-race', stat: 'racesWon', target: 1, reward: 150, text: 'Win 1 street race' },
    { id: 'ch-taxi', stat: 'faresDone', target: 1, reward: 120, text: 'Finish 1 taxi fare' },
  ],

  // Radio stations, in cycle order. The first one is the sunset station.
  radioStations: [
    { name: 'SUNSET 88', track: 'Golden Hour — The Palms' },
    { name: 'BAYLINE FM', track: 'Neon Tide — Coastline Drive' },
    { name: 'PALM TALK', track: 'Evening Call — Marina Nights' },
    { name: 'CORAL 104', track: 'Salt Air — The Breakers' },
    { name: 'DUSK ROCK', track: 'Red Light Run — V8 Sunset' },
    { name: 'TIDE HOUSE', track: 'Low Tide — Sunset Set' },
  ],

  // Fixed map spots the game and the screenshot staging rely on.
  sprayBooth: { x: -90, z: -58, radius: 9, cost: 150 },
  garageDoor: { x: -90, z: -66 },
  martDoor: { x: -72, z: -60 },
  safehouse: { x: 120, z: -120 },
  racePad: { x: -60, z: -60 },
  taxiStand: { x: 68, z: 60 },
  fenceYard: { x: 110, z: 138 },
  sportParked: { x: -102, z: -64 },
  bikeParked: { x: -88, z: -64 },
  packageSpot: { x: -120, z: 120 },

  // Districts: id, display name, and the map point that defines them.
  districts: [
    { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0 },
    { id: 'harbor', name: 'HARBOR', x: 120, z: 120 },
    { id: 'beach', name: 'BEACH', x: 0, z: 165 },
    { id: 'uptown', name: 'UPTOWN', x: 120, z: -90 },
    { id: 'strip', name: 'THE STRIP', x: 0, z: 135 },
    { id: 'marina', name: 'MARINA', x: -120, z: 60 },
    { id: 'oldtown', name: 'OLD TOWN', x: -120, z: -120 },
  ],

  packageCount: 12,
  saveKey: 'solmar-save',
};

export default config;

// Called first by the boot hub so every later module can read ctx.config.
export function init(ctx) {
  ctx.config = config;
}
