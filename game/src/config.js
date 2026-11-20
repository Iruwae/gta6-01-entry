// SOLMAR BAY — shared tuning table for the round-5 rebuild.
// Every number the game balances on lives here so the other modules
// stay small and read the same truth: prices, map anchors, radio,
// vehicle specs, the story spine and the daily-challenge pool.
export function init(S) {
  const shopItems = [
    { id: 'burger', name: 'Burger', price: 15, heal: 25, blurb: 'Double stack, extra pickles.' },
    { id: 'soda', name: 'Soda', price: 5, heal: 8, blurb: 'Ice cold, too sweet.' },
    { id: 'pistol-ammo', name: 'Pistol Ammo', price: 20, weapon: 'PISTOL', ammo: 12, blurb: 'A fresh box of 9mm.' },
    { id: 'smg-ammo', name: 'SMG Ammo', price: 35, weapon: 'SMG', ammo: 30, blurb: 'Spray now, ask later.' },
    { id: 'shotgun-shells', name: 'Shotgun Shells', price: 30, weapon: 'SHOTGUN', ammo: 6, blurb: 'Six ways to end a talk.' },
    { id: 'rifle-ammo', name: 'Rifle Ammo', price: 45, weapon: 'RIFLE', ammo: 20, blurb: 'Long reach, clean groups.' },
    { id: 'medkit', name: 'Medkit', price: 40, heal: 60, blurb: 'Bandages, pills, stubborn hope.' },
    { id: 'armor', name: 'Body Armor', price: 60, armor: 50, blurb: 'Stops more than harsh words.' },
    { id: 'repair', name: 'Car Repair', price: 50, repair: 100, blurb: 'Full service, no questions.' },
  ];

  const radioStations = [
    { name: 'SUNSET 88', tracks: ['Golden Hour — The Palms', 'Last Light — Coral Drive', 'Amber Sky — Rio Mesa'] },
    { name: 'BAYLINE FM', tracks: ['Neon Tide — Marina Lights', 'Cruise Control — Velvet Static', 'Boardwalk — The Gulls'] },
    { name: 'VICE 101', tracks: ['Hot Asphalt — Chrome Hearts', 'Night Shift — Dollar Bill', 'Redline — Foxy'] },
    { name: 'PIER RADIO', tracks: ['Salt Air — The Bait Shop', 'Tide Out — Old Marlin', 'Gull Song — Harbor Choir'] },
    { name: 'STATIC AGE', tracks: ['Faded Posters — The Rewinds', 'Cassette Summer — Tapedeck', 'Dial Tone — Rotary'] },
    { name: 'NIGHT DRIVE', tracks: ['Midnight Merge — Low Beam', 'Headlight Hymn — The Offramp', 'Empty Freeway — Ghost Lane'] },
  ];

  const districts = [
    { id: 'beach', name: 'BEACH' },
    { id: 'strip', name: 'THE STRIP' },
    { id: 'harbor', name: 'HARBOR' },
    { id: 'uptown', name: 'UPTOWN' },
    { id: 'downtown', name: 'DOWNTOWN' },
    { id: 'oldtown', name: 'OLD TOWN' },
    { id: 'industrial', name: 'INDUSTRIAL' },
  ];

  const missions = [
    { id: 'm1', title: 'First Wheels', giver: 'LENA CRUZ', brief: 'Borrow the garage sport car and shake it down on the strip.' },
    { id: 'm2', title: "Marco's Errand", giver: 'MARCO SOLIS', brief: 'Run a package across town before the sun is fully down.' },
    { id: 'm3', title: 'Harbor Lights', giver: 'LENA CRUZ', brief: 'Scout the docks and photograph the night shift roster.' },
    { id: 'm4', title: 'The Long Way Home', giver: 'MARCO SOLIS', brief: 'Lose a tail through Old Town without firing a shot.' },
    { id: 'm5', title: 'Payday at the Pier', giver: 'VIC TORRES', brief: 'Hit the pier job with Lena riding shotgun. Do not miss.' },
    { id: 'm6', title: "Vic's First Job", giver: 'VIC TORRES', brief: 'Boost a ride and bring it to the yard. Clean, no heat.' },
    { id: 'm7', title: 'The Interceptor', giver: 'VIC TORRES', brief: 'Outrun the PD interceptor unit across the harbor bridge.' },
    { id: 'm8', title: 'Crew Escort', giver: 'LENA CRUZ', brief: 'Drive the crew through a roadblock and keep everyone breathing.' },
    { id: 'm9', title: 'The Big Score', giver: 'VIC TORRES', brief: 'The uptown vault job. Everything rides on this one.' },
    { id: 'm10', title: 'Solmar Nights', giver: 'LENA CRUZ', brief: 'One last run at dawn. Leave the bay or own it.' },
  ];

  const vehicles = {
    sedan: { kind: 'sedan', maxHealth: 100, perf: 26, topSpeed: 26, accel: 9, label: 'Sedan' },
    sport: { kind: 'sport', maxHealth: 100, perf: 32, topSpeed: 34, accel: 13, label: 'Sport Coupe' },
    bike: { kind: 'bike', maxHealth: 60, perf: 38, topSpeed: 38, accel: 16, label: 'Street Bike' },
    pickup: { kind: 'pickup', maxHealth: 130, perf: 28, topSpeed: 28, accel: 10, label: 'Pickup Truck' },
  };

  S.config = {
    startCash: 120,
    startHealth: 100,
    clockStartMinutes: 18 * 60 + 28,
    timeRate: 1,
    nightStartMinutes: 122,
    nightFullMinutes: 212,
    sprayBooth: { x: -90, z: -58, r: 9, price: 150 },
    payNSprayPrice: 150,
    shopItems,
    radioStations,
    districts,
    missions,
    vehicles,
    race: {
      start: { x: -60, z: -60 },
      gates: [
        { x: 60, z: -60 },
        { x: 60, z: 60 },
        { x: -60, z: 60 },
        { x: -60, z: -60 },
      ],
      prize: 300,
    },
    taxi: {
      stand: { x: 68, z: 60 },
      minFare: 80,
      destinations: [
        { x: 120, z: 120 },
        { x: -120, z: -120 },
        { x: 0, z: 150 },
        { x: -140, z: 40 },
        { x: 140, z: -100 },
      ],
    },
    packages: [
      { x: -120, z: 120 },
      { x: 120, z: -120 },
      { x: -120, z: -120 },
      { x: 150, z: 30 },
      { x: -150, z: 30 },
      { x: 30, z: 150 },
      { x: -30, z: -150 },
      { x: 150, z: -30 },
      { x: -150, z: -90 },
      { x: 90, z: 150 },
      { x: -90, z: 150 },
      { x: 0, z: -150 },
    ],
    packageReward: 50,
    anchors: {
      garage: { x: -90, z: -66 },
      mart: { x: -72, z: -60 },
      safehouse: { x: 120, z: -120 },
      fenceYard: { x: 110, z: 138 },
      bikePark: { x: -88, z: -64 },
      sportPark: { x: -102, z: -64 },
      pier: { x: 0, z: 165 },
    },
    fenceBase: { bike: 220, sport: 480, pickup: 350, sedan: 300 },
    respectRanks: [
      { min: 0, title: 'NOBODY' },
      { min: 100, title: 'STREET HUSTLER' },
      { min: 400, title: 'SHOT CALLER' },
      { min: 900, title: 'BAY LEGEND' },
    ],
    challenges: [
      { id: 'ch-race', stat: 'racesWon', target: 1, reward: 150, text: 'Win a street race' },
      { id: 'ch-fare', stat: 'faresDone', target: 2, reward: 120, text: 'Finish 2 taxi fares' },
      { id: 'ch-pack', stat: 'packages', target: 3, reward: 100, text: 'Collect 3 packages' },
    ],
  };

  // Seed the mission spine so start(i) works even before the mission
  // module replaces the list with its live definitions.
  if (S.missions && Array.isArray(S.missions.list) && S.missions.list.length === 0) {
    S.missions.list = missions.map((m) => ({ ...m }));
  }
  return S.config;
}
