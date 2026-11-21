// SOLMAR BAY — all tuning data lives here. One source of truth for the
// city, the radio, the weapons, the shop, the story jobs and the ranks.
export const CONFIG = {
  title: 'SOLMAR BAY',
  tagline: 'A sunset crime story',
  startCash: 120,
  startDay: 1,
  // The clock opens at 18:28 on day 1. S.time counts game minutes from
  // there; 1440 minutes make a full day. Minutes pass at 0.5 per second.
  clockStartHour: 18,
  clockStartMinute: 28,
  minutesPerDay: 1440,
  minutesPerSecond: 0.5,
  duskAt: 62, // 19:30 — the sky starts turning
  nightAt: 150, // 21:00 — full night from here
  walkSpeed: 9,
  sprintSpeed: 13,
  maxHealth: 100,

  look: {
    amber: '#ffb347',
    ember: '#ff7a3d',
    pink: '#ff7a9e',
    dusk: '#2a1a3a',
    panel: 'rgba(22,12,34,0.78)',
  },

  radio: [
    {
      name: 'SUNSET 88.5',
      desc: 'Golden hour, all day',
      tracks: [
        { title: 'Amber Skyline', artist: 'The Dusk Riders' },
        { title: 'Palms at Dusk', artist: 'Marina Sol' },
        { title: 'Last Light', artist: 'Coral Club' },
        { title: 'Sunset Strip', artist: 'The Bayliners' },
      ],
    },
    {
      name: 'BAYLINE FM',
      desc: 'Bay talk and traffic',
      tracks: [
        { title: 'Bayline Morning', artist: 'Dee Marsh' },
        { title: 'The Tidal Report', artist: 'Solmar Newsdesk' },
        { title: 'Harbor Lights', artist: 'The Ferries' },
      ],
    },
    {
      name: 'DUSK 96.7',
      desc: 'Slow jams after dark',
      tracks: [
        { title: 'Velvet Hour', artist: 'Nico Palma' },
        { title: 'Neon Palms', artist: 'Sadie Volt' },
        { title: 'Two A.M.', artist: 'The Low Tides' },
      ],
    },
    {
      name: 'HARBOR HITS 104.3',
      desc: 'Dockside anthems',
      tracks: [
        { title: 'Container Blues', artist: 'Big Ray Ketch' },
        { title: 'Foghorn', artist: 'The Cranes' },
        { title: 'Salt Air', artist: 'Lulu Marlin' },
      ],
    },
    {
      name: 'TROPICANA 107.9',
      desc: 'Salsa and static',
      tracks: [
        { title: 'Mango Moon', artist: 'Los Brillos' },
        { title: 'Calle Ocho', artist: 'Rosa Delgado' },
        { title: 'Piña Colada Radio', artist: 'DJ Fuego' },
      ],
    },
    {
      name: 'LA ONDA 92.1',
      desc: 'Surf rock and static',
      tracks: [
        { title: 'Boardwalk', artist: 'The Breakers' },
        { title: 'Rip Current', artist: 'Sandy Toes' },
        { title: 'High Tide', artist: 'The Undertows' },
      ],
    },
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

  weapons: [
    { name: 'PISTOL', mag: 12, damage: 26, interval: 0.22, reload: 1.2, unlock: 0, range: 60 },
    { name: 'SMG', mag: 30, damage: 14, interval: 0.09, reload: 1.4, unlock: 1, range: 55 },
    { name: 'SHOTGUN', mag: 6, damage: 55, interval: 0.85, reload: 2.0, unlock: 3, range: 28 },
    { name: 'RIFLE', mag: 24, damage: 42, interval: 0.14, reload: 1.6, unlock: 5, range: 120 },
  ],

  shop: [
    { name: 'Burger', desc: 'Double stack, extra pickles.', price: 15, heal: 25 },
    { name: 'Cola', desc: 'Ice cold, bay fizz.', price: 5, heal: 10 },
    { name: 'Sandwich', desc: 'Deli fresh, wrapped twice.', price: 10, heal: 15 },
    { name: 'Coffee', desc: 'Bitter, black, keeps you up.', price: 4, heal: 5 },
    { name: 'Bandage', desc: 'Field dressing, quick fix.', price: 20, heal: 40 },
    { name: 'Snack Bar', desc: 'Peanut crunch, pocket sized.', price: 3, heal: 5 },
    { name: 'Ammo Box', desc: 'A fresh magazine for your gun.', price: 30, heal: 0, ammo: true },
  ],
  shopPos: { x: -72, z: -60, radius: 7 },

  safehouse: { x: 120, z: -120, radius: 8 },
  garageDoor: { x: -90, z: -66, radius: 10 },
  sprayBooth: { x: -90, z: -58, cost: 150, radius: 9 },
  racePad: { x: -60, z: -60, radius: 8, prize: 300 },
  taxiStand: { x: 68, z: 60, radius: 8 },
  fenceYard: { x: 110, z: 138, radius: 12 },

  raceGates: [
    { x: 60, z: -60 },
    { x: 60, z: 60 },
    { x: -60, z: 60 },
    { x: -60, z: -60 },
  ],

  taxiDests: [
    { x: 0, z: 0, name: 'Downtown Plaza' },
    { x: 120, z: -90, name: 'Uptown Towers' },
    { x: 0, z: 135, name: 'The Strip' },
    { x: -120, z: -60, name: 'Old Town Square' },
    { x: 120, z: 120, name: 'Harbor Pier' },
  ],

  packageSpots: [
    { x: -120, z: 120 },
    { x: 120, z: -120 },
    { x: -120, z: -120 },
    { x: -60, z: 120 },
    { x: 60, z: 165 },
    { x: 150, z: 0 },
    { x: -150, z: 60 },
    { x: 90, z: -150 },
    { x: -150, z: -120 },
    { x: 0, z: -150 },
    { x: -90, z: 150 },
    { x: 150, z: -60 },
  ],
  packageValue: 50,

  missions: [
    { id: 'm1', title: 'FIRST JOB', giver: 'LENA CRUZ', pay: 200, desc: 'Meet Lena at the garage. Vic has work.', target: { x: 150, z: -150 } },
    { id: 'm2', title: 'HOT WHEELS', giver: 'VIC TORRES', pay: 300, desc: 'Lift a ride and bring it to the yard.', target: { x: 110, z: 138 } },
    { id: 'm3', title: 'DEAD DROP', giver: 'MARCO SOLIS', pay: 350, desc: 'A package changes hands on the Strip.', target: { x: 0, z: 135 } },
    { id: 'm4', title: 'QUIET STREETS', giver: 'LENA CRUZ', pay: 400, desc: 'Lose the tail, then make the pickup.', target: { x: -150, z: 150 } },
    { id: 'm5', title: 'CREW UP', giver: 'VIC TORRES', pay: 600, desc: 'Lena rides with you. Hit the convoy together.', target: { x: 150, z: 60 } },
    { id: 'm6', title: 'HARBOR LIGHTS', giver: 'MARCO SOLIS', pay: 550, desc: 'Something is coming in on the night boat.', target: { x: 120, z: 120 } },
    { id: 'm7', title: 'THE LONG WAY', giver: 'LENA CRUZ', pay: 650, desc: 'Drive the long way. Do not get followed.', target: { x: -150, z: -60 } },
    { id: 'm8', title: 'PAYBACK', giver: 'VIC TORRES', pay: 800, desc: 'Somebody shorted Vic. Collect, politely.', target: { x: 90, z: 90 } },
    { id: 'm9', title: 'GOLDEN HOUR', giver: 'MARCO SOLIS', pay: 900, desc: 'One last score before the sun goes down.', target: { x: -60, z: -150 } },
    { id: 'm10', title: 'BAY LEGEND', giver: 'VIC TORRES', pay: 1500, desc: 'The whole bay is watching. Make it count.', target: { x: 0, z: 165 } },
  ],

  challenges: [
    { id: 'pkg', text: 'Collect 3 packages', stat: 'packages', target: 3, reward: 100 },
    { id: 'race', text: 'Win 1 street race', stat: 'racesWon', target: 1, reward: 150 },
    { id: 'taxi', text: 'Finish 1 taxi fare', stat: 'faresDone', target: 1, reward: 120 },
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

  defaultObjective: 'Explore Solmar Bay — find work.',
};

export default CONFIG;
