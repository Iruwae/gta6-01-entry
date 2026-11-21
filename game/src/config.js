// SOLMAR BAY — all tuning data lives here. Plain data, no logic.
// Sunset crime story: golden hour fading into neon night over a bay city.
export const CONFIG = {
  title: 'SOLMAR BAY',
  tagline: 'A sunset crime story',
  startCash: 120,
  startDay: 1,
  // The clock opens at 18:28 on day 1; S.time counts minutes after that.
  clockOpenMinutes: 18 * 60 + 28,
  minutesPerDay: 1440,
  // Game minutes that pass per real second.
  minutesPerSecond: 0.5,
  nightStart: 150,
  duskStart: 62,
  walkSpeed: 9,
  sprintSpeed: 13,
  maxHealth: 100,

  radio: [
    { name: 'SUNSET 88.5', tagline: 'Golden hour, all day', tracks: [
      { title: 'Amber Skyline', artist: 'The Dusk Riders' },
      { title: 'Palms at Dusk', artist: 'Marina Sol' },
      { title: 'Last Light', artist: 'Coral Club' },
      { title: 'Sunset Strip', artist: 'The Bayliners' } ] },
    { name: 'BAYLINE FM', tagline: 'Bay talk and traffic', tracks: [
      { title: 'Bayline Morning', artist: 'Dee Marsh' },
      { title: 'The Tidal Report', artist: 'Solmar Newsdesk' },
      { title: 'Harbor Lights', artist: 'The Ferries' } ] },
    { name: 'DUSK 96.7', tagline: 'Slow jams after dark', tracks: [
      { title: 'Velvet Hour', artist: 'Nico Palma' },
      { title: 'Neon Palms', artist: 'Sadie Volt' },
      { title: 'Two A.M.', artist: 'The Low Tides' } ] },
    { name: 'HARBOR HITS 104.3', tagline: 'Dockside anthems', tracks: [
      { title: 'Container Blues', artist: 'Big Ray Ketch' },
      { title: 'Foghorn', artist: 'The Cranes' },
      { title: 'Salt Air', artist: 'Lulu Marlin' } ] },
    { name: 'TROPICANA 107.9', tagline: 'Salsa and static', tracks: [
      { title: 'Mango Moon', artist: 'Los Brillos' },
      { title: 'Calle Ocho', artist: 'Rosa Delgado' },
      { title: 'Piña Colada Radio', artist: 'DJ Fuego' } ] },
    { name: 'LA ONDA 92.1', tagline: 'Surf rock and static', tracks: [
      { title: 'Boardwalk', artist: 'The Breakers' },
      { title: 'Rip Current', artist: 'Sandy Toes' },
      { title: 'High Tide', artist: 'The Undertows' } ] },
  ],

  districts: [
    { id: 'downtown', name: 'DOWNTOWN', x: 0, z: 0, color: '#e8a34c' },
    { id: 'harbor', name: 'HARBOR', x: 120, z: 120, color: '#5fb4c9' },
    { id: 'beach', name: 'BEACH', x: 0, z: 165, color: '#f2d492' },
    { id: 'uptown', name: 'UPTOWN', x: 120, z: -90, color: '#b48ce8' },
    { id: 'strip', name: 'THE STRIP', x: 0, z: 135, color: '#ff7a9e' },
    { id: 'oldtown', name: 'OLD TOWN', x: -120, z: -60, color: '#c98a5f' },
    { id: 'palmrow', name: 'PALM ROW', x: -120, z: 120, color: '#7ec98a' },
  ],

  // Slot order is the 1-4 key order. unlock = jobs that must be done first.
  weapons: [
    { name: 'PISTOL', mag: 12, damage: 26, interval: 0.22, reload: 1.2, unlock: 0, range: 60 },
    { name: 'SMG', mag: 30, damage: 14, interval: 0.09, reload: 1.4, unlock: 1, range: 55 },
    { name: 'SHOTGUN', mag: 6, damage: 55, interval: 0.85, reload: 2.0, unlock: 3, range: 28 },
    { name: 'RIFLE', mag: 24, damage: 42, interval: 0.14, reload: 1.6, unlock: 5, range: 120 },
  ],

  shop: {
    x: -72, z: -60, radius: 7,
    items: [
      { name: 'Burger', price: 15, heal: 25, desc: 'Double-stacked, still warm from the grill.' },
      { name: 'Cola', price: 5, heal: 10, desc: 'Ice cold, fizzes like the bay at noon.' },
      { name: 'Sandwich', price: 10, heal: 15, desc: 'Deli classic. Extra pickles, no questions.' },
      { name: 'Coffee', price: 4, heal: 5, desc: 'Bitter, black, and strong enough to wake the dead.' },
      { name: 'Bandage', price: 20, heal: 40, desc: 'Patches you up right. Stings a little.' },
      { name: 'Snack Bar', price: 3, heal: 5, desc: 'Mostly sugar. Gets the job done.' },
      { name: 'Ammo Box', price: 30, heal: 0, ammo: true, desc: 'A fresh box of rounds for whatever you carry.' },
    ],
  },
  safehouse: { x: 120, z: -120, radius: 8 },
  garage: { x: -90, z: -66, radius: 10 },
  spray: { x: -90, z: -58, cost: 150, radius: 9 },
  racePad: { x: -60, z: -60, radius: 8, prize: 300 },
  raceGates: [[60, -60], [60, 60], [-60, 60], [-60, -60]],
  taxiStand: { x: 68, z: 60, radius: 8 },
  // Taxi destinations are fixed landmarks — never a package spot.
  taxiDests: [[0, 0], [120, 120], [-120, -60], [120, -90], [0, 135]],
  fenceYard: { x: 110, z: 138, radius: 12 },

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

  challenges: [
    { id: 'packages', text: 'Collect 3 packages', target: 3, reward: 100, stat: 'packages' },
    { id: 'race', text: 'Win 1 street race', target: 1, reward: 150, stat: 'racesWon' },
    { id: 'taxi', text: 'Finish 1 taxi fare', target: 1, reward: 120, stat: 'faresDone' },
  ],

  respectLadder: [
    { min: 0, title: 'NOBODY' },
    { min: 50, title: 'SMALL-TIME' },
    { min: 150, title: 'STREET HUSTLER' },
    { min: 400, title: 'CREW LEADER' },
    { min: 800, title: 'BAY BOSS' },
    { min: 1500, title: 'BAY LEGEND' },
  ],

  fenceBase: { bike: 220, sedan: 420, pickup: 520, sport: 900 },
  vehicleStats: {
    bike: { maxHealth: 60, perf: 38 },
    pickup: { maxHealth: 130, perf: 28 },
    sedan: { maxHealth: 100, perf: 32 },
    sport: { maxHealth: 110, perf: 52 },
  },

  // 12 collectible packages, $50 each.
  packages: [
    [-120, 120], [120, -120], [-120, -120], [90, 30], [-30, 150], [150, -30],
    [-150, 90], [60, -120], [-60, 150], [150, 60], [0, -150], [-150, -30],
  ],
  packageValue: 50,

  look: {
    amber: '#ffb347',
    ember: '#ff7a3d',
    pink: '#ff7a9e',
    dusk: '#2a1a3a',
    panel: 'rgba(22,12,34,0.78)',
  },
};

export default CONFIG;
