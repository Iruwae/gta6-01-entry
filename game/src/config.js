// SOLMAR BAY — shared tuning constants. One clear job: every number the
// other systems agree on lives here, so a balance pass touches one file.
export const CFG = {
  world: { size: 420, half: 210, roadEvery: 40, roadHalf: 5.5, block: 29 },
  player: {
    walkSpeed: 7, runSpeed: 11, accel: 40, radius: 0.7, maxHp: 100,
    jumpSpeed: 8, gravity: 22,
  },
  car: {
    accel: 16, brake: 30, reverseMax: 10, maxSpeed: 34, steerMax: 0.55,
    grip: 6, length: 4.4, width: 2.0, maxHp: 100,
  },
  wanted: { maxStars: 5, decaySeconds: 45, copCarsPerStar: 1, footCopsPerStar: 1 },
  combat: { pistolDamage: 34, pistolRate: 0.22, pistolRange: 90, enemyHp: 60, copHp: 80 },
  traffic: { cars: 14, peds: 22 },
  camera: { footDist: 9, footHeight: 4.2, carDist: 12, carHeight: 5, fov: 62 },
  money: { startCash: 120, missionReward: [400, 650, 900, 1500] },
  saveKey: 'solmarbay-save-v1',
};

// The four story missions. Names, people and places are all original.
export const MISSIONS = [
  {
    id: 'm1', title: 'FIRST WHEELS', giver: 'Lena Cruz',
    brief: 'Lena needs wheels. Steal any car on the street and bring it to the Bayline garage.',
    steps: [
      { kind: 'steal', text: 'Steal a car — walk up to one and press F' },
      { kind: 'goto', text: 'Drive the car to the Bayline garage', target: [100, -100] },
    ],
  },
  {
    id: 'm2', title: 'COURIER RUN', giver: 'Lena Cruz',
    brief: 'Hot packages, three drops, one clock. The cops are already sniffing around.',
    steps: [
      { kind: 'goto', text: 'Drop 1 of 3 — the pier kiosk', target: [-180, 160], timer: 150 },
      { kind: 'goto', text: 'Drop 2 of 3 — the neon motel', target: [180, 140] },
      { kind: 'goto', text: 'Drop 3 of 3 — back at the garage', target: [100, -100] },
    ],
  },
  {
    id: 'm3', title: 'HARBOR HEAT', giver: 'Marco Solis',
    brief: 'The Dock Rats jumped our crew at the harbor. Clear them out, then lose the heat.',
    steps: [
      { kind: 'fight', text: 'Clear out the Dock Rats at the harbor', target: [-180, 160], count: 6 },
      { kind: 'escape', text: 'Lose the cops — get your wanted level to zero' },
    ],
  },
  {
    id: 'm4', title: 'THE BIG SCORE', giver: 'Lena Cruz',
    brief: 'One job, one vault, one clean getaway. Grab the cash and reach the safehouse.',
    steps: [
      { kind: 'goto', text: 'Reach the Meridian Bank', target: [20, -20] },
      { kind: 'grab', text: 'Grab the cash inside the bank', target: [20, -20] },
      { kind: 'escape', text: 'Escape to the safehouse with the cash', target: [-180, -180], wantedAtStart: 3 },
    ],
  },
];

export const PALETTE = {
  sky: 0x87bfe8, fog: 0xa8c8e0, sun: 0xfff2d8, ground: 0x3d3a35,
  road: 0x2c2c30, sidewalk: 0x8a8578, sand: 0xd9b380, water: 0x2a7fa8,
  building: [0xcf9a6a, 0xb8b0a0, 0x9ab8c8, 0xd8c090, 0xa88a90, 0x88a890, 0xc8b8d8, 0x708090],
  car: [0xc03030, 0x3060c0, 0xd8b020, 0x30a060, 0xe8e8e8, 0x202020, 0x8040c0, 0xe08030],
  pedShirt: [0xe05050, 0x50a0e0, 0x50c080, 0xe0c050, 0xc050c0, 0x808080, 0xffffff],
};
