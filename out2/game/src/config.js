// SOLMAR BAY — central tuning knobs. One place to balance the whole game.
// All values are original to this project; nothing here comes from any other game.
export const CFG = {
  CITY: {
    size: 300,        // playable ground plane, x/z in [-150, 150]
    roadGap: 60,      // distance between adjacent road centre lines
    roadWidth: 12,    // road surface width (roadHalf = 6)
    blockHalf: 24,    // half-size of a city block (block spans centre +/- 24)
    bounds: 150,      // hard clamp for player / cars
  },

  PLAYER: {
    walkSpeed: 6,     // m/s on foot
    runSpeed: 9,      // m/s while sprinting
    health: 100,
  },

  CAR: {
    accel: 16,        // m/s^2 forward
    brake: 32,        // m/s^2 braking / reversing
    maxSpeed: 30,     // m/s, regular traffic cars
    sportMax: 36,     // m/s, sport cars
    steerMax: 0.55,   // radians of front-wheel steer at standstill
  },

  WANTED: {
    maxStars: 5,
    decayPerSec: 2.5, // heat drains this fast while laying low
    heatPerCrime: {
      steal: 25,      // jacking a car
      kill: 30,       // taking out a pedestrian
      shoot: 8,       // firing a shot in public
      hitPed: 20,     // running a pedestrian over
    },
  },

  // Cash paid out when each story mission is completed, in order.
  MISSIONS: [500, 800, 1200, 2500],

  COLORS: {
    sky: 0x87ceeb,
    sun: 0xfff2c0,
    asphalt: 0x3a3f46,
    sidewalk: 0xb8b2a4,
    sand: 0xe8d29a,
    water: 0x2e7fa8,
    // Sun-bleached pastel building facades.
    buildings: [
      0xf2c9a0, 0xf7e6c4, 0xd9a08c, 0xa8c8d8, 0xf0d060,
      0xc9b8d8, 0x9ac8a8, 0xe8a8b0, 0xd8d0c0, 0x88b8c8,
    ],
    // Traffic paint jobs.
    cars: [
      0xd83a2e, 0x2e6fd8, 0xf2c200, 0x2ed573, 0xf2f2f2,
      0x222226, 0xd86a1e, 0x7e3fd8, 0x20b8a8, 0xc0c8d0,
    ],
  },
};
