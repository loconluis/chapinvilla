/**
 * Paleta Chapinvilla. Índices 0–7, un rol por color.
 * El arte se empaqueta a 3 bits por píxel en el build (scripts/pack.js),
 * así que el índice 7 también existe en los sprites.
 *   0 tinta      contornos y sombras
 *   1 verde      ciudad, árboles, camisetas
 *   2 ámbar      luces, reflejos, pintura vial
 *   3 naranja    luces traseras, chaquetas
 *   4 azul       vidrios, jeans
 *   5 crema      carrocerías, pintura, cascos
 *   6 asfalto    calle, llantas  (antes era el contorno: por eso nada se leía)
 * El índice 7 NO es un color: es la marca de aire en el empaquetado del build.
 */
export const PAL = [
  "#0D1216",
  "#1E5C4B",
  "#F5B324",
  "#E1532B",
  "#4A86B8",
  "#F1E3C6",
  "#333C49",
];

const S = (art) => art.trim().split("\n");

export const SPRITES = {
  // Vista de arriba: el frente mira hacia arriba de la pantalla.
  // El ancho y el largo son la identidad: moto 27, camioneta 24, taxi 18, bus 24 y largo.
  moto: S(`
..........0000000..........
..........0666660..........
..........0000000..........
............000............
............000............
....6666666666666666666....
......011111111111111......
......011111111111111......
........05555555555........
........05555555555........
........05555555555........
........05555555555........
........05555555555........
.......0111111111111.......
.......0111111111111.......
........01111111111........
........01111111111........
.........000000000.........
.........033333333.........
.........033333333.........
.........000000000.........
.........066666666.........
.........066666666.........
.........066666666.........
.........000000000.........
...........................
`),
  camioneta: S(`
.0000000000000000000000.
.0660000000000000000660.
.0544444444444444444450.
.0555555555555555555550.
.0555555555555555555550.
.0555222222222222255550.
.0555555555555555555550.
.0555555555555555555550.
.0555555555555555555550.
.0555555555555555555550.
.0555555555555555555550.
.0544444444444444444450.
.0555555555555555555550.
.0552222222222222222250.
.0555555555555555555550.
.0000000000000000000000.
.0000000000000000000000.
.0660000000000000000660.
.0660000000000000000660.
.0000000000000000000000.
........................
`),
  motorista: S(`
......0000......
......0660......
......0000......
.......000......
.66666666666666.
..04444444444440
..04444444444440
....0555555555..
....0555555555..
....0555555555..
...044444444440.
...044444444440.
....0444444440..
.....00000000...
....0333333330..
.....06666660...
.....00000000...
`),
  car: S(`
.......0000.......
......000000......
..00000000000000..
.0244444444444420.
.0222222222222220.
.0222255555222220.
.0222255555222220.
.0222222222222220.
.0222222222222220.
.0222222222222220.
.0244444444444420.
.0222222222222220.
.0000000000000000.
.0333333333333330.
.0000000000000000.
..0660000000000660
..0000000000000000
..................
`),
  hoyo: S(`
........................
...555555555555555555...
..50000000000000000005..
.5000000000000000000005.
500000000000000000000005
500000000000000000000005
500000000000000000000005
500000000000000000000005
500000000000000000000005
500000000000000000000005
500000000000000000000005
.5000000000000000000005.
..50000000000000000005..
...555555555555555555...
........................
........................
`),
  bus: S(`
.0000000000000000000000.
.0544444444444444444450.
.0555555555555555555550.
.0555555555555555555550.
.0555222222222222255550.
.0555555555555555555550.
.0555555555555555555550.
.0555222222222222255550.
.0555555555555555555550.
.0555555555555555555550.
.0555222222222222255550.
.0555555555555555555550.
.0555555555555555555550.
.0555222222222222255550.
.0555555555555555555550.
.0555555555555555555550.
.0544444444444444444450.
.0555555555555555555550.
.0000000000000000000000.
.0000000000000000000000.
.0660000000000000000660.
.0660000000000000000660.
.0000000000000000000000.
........................
........................
........................
`),
  gasolina: S(`
...000000...
...066660...
...033330...
.0333333330.
.0355555530.
.0353335530.
.0355555530.
.0333333330.
.0333333330.
.0333333330.
...000000...
............
`),
  cafe: S(`
.....00.....
...000000...
.0555555550.
.0444444440.
.0555555550.
.0555555550.
.0555555550.
.0555555550.
..00000000..
....3333....
..0000......
............
`),
  tamal: S(`
...000000...
.0111111110.
.0155555510.
.0153333510.
.0155555510.
.0111111110.
..00000000..
....0000....
............
............
............
............
`),
  columna: S(`
.0000000000.
.0444444440.
.0445555440.
.0445555440.
.0445555440.
.0445555440.
.0444444440.
.0000000000.
`),
  peaton: S(`
......000......
.....0555550...
....055555550..
......000......
....033333330..
...03333333330.
...0.3333333.0.
....033333330..
.....0444440...
....0440.0440..
....0440.0440..
...000....000..
...............
`),
};

export const OBSTACLES = {
  camioneta: { h: 28, dmg: 22, stress: 14 },
  motorista: { h: 24, dmg: 16, stress: 12 },
  hoyo: { h: 22, dmg: 18, stress: 22 },
  cambia: { h: 24, dmg: 18, stress: 14, slides: true },
  bus: { h: 34, dmg: 30, stress: 18 },
  peaton: { h: 20, dmg: 12, stress: 16 },
  // Del parqueo: nadie se mueve, el castigo es por tamaño.
  auto: { h: 24, dmg: 18, stress: 14 },
  columna: { h: 13, dmg: 22, stress: 18 },
};

/** gasolina llena el tanque; el café da velocidad, no combustible. */
export const PICKUPS = {
  gasolina: { h: 16, energy: 34 },
  cafe: { h: 16, boost: 2.2 },
  tamal: { h: 16, stress: -40 },
};

export const LINES = {
  hoyo: [
    "Ese ya estaba desde antes",
    "Ese hoyo ya es parte del mapa",
  ],
  camioneta: [
    "¡Hay campo todavía!",
    "Esa camioneta trae el día entero",
  ],
  motorista: [
    "Ese calcula en milímetros",
    "Te pasó rozando el espejo",
  ],
  cambia: [
    "Ni puso direccional",
    "Decidió tu carril por vos",
  ],
  bus: [
    "El bus ocupa lo que quiere",
    "Dos carriles, cero disculpas",
  ],
  tiempo: [
    "Ya casi, vos",
    "El reloj no pide permiso",
  ],
  energia: [
    "Se está vaciando el tanque",
    "Buscá gasolina, ya mismo",
  ],
  turbo: [
    "Todavía no hay turbo",
    "Dejá que cargue, vos",
  ],
  gasolina: ["Tanque lleno, otra vez"],
  cafe: ["Café chapín. Ahora sí"],
  tamal: ["Tamal de emergencia"],
  boss: [
    "El tráfico eterno",
    "Ahí vienen, ocupando dos carriles",
  ],
  suerte: ["Hoy sí hubo suerte"],
  win: ["Llegaste. No preguntés cómo"],
};

/**
 * Niveles como datos. El motor no duplica reglas por nivel.
 * Salís a las 5:00 y el tráfico va subiendo: los huecos se cierran de 250 a 92
 * y los peatones aparecen más seguido. El plazo es a las 8:00.
 */
export const LEVELS = [
  {
    id: 1,
    name: "La hora pico",
    dest: "Build & Pitch",
    home: "tu casa",
    depart: 5 * 60,
    timeLimit: 180,
    rampEvery: 20,
    ramp: 1.05,
    rampCap: 1.3,
    bossCap: 1.06,
    baseSpeed: 76,
    drain: 0.5,
    stressDecay: 1.15,
    turboCost: 40,
    turboGain: 9,
    turboDodge: 10,
    boostMul: 1.7,
    boostTime: 0.8,
    startEnergy: 84,
    length: 16400,
    gap0: 250,
    gap1: 92,
    boss: { name: "El tráfico eterno", at: 0.78, waves: 8, gap: 205 },
    obstacles: ["camioneta", "motorista", "hoyo", "cambia"],
    pickups: ["gasolina", "cafe", "tamal"],
    crossings: 10,
    crossBonus: 8,
    dodgePoint: 3,
    hitPenalty: 15,
    earlyPoint: 6,
    motoFactor: 0.5,
    phases: [
      [5, 2, 4, 2],
      [4, 3, 3, 3],
      [2, 4, 2, 5],
    ],
    minPick: { gasolina: 8, cafe: 3, tamal: 3 },
  },
  {
    id: 2,
    name: "El parqueo",
    dest: "un espacio libre",
    home: "Build & Pitch",
    depart: 8 * 60,
    // el pitch arranca a las 9:00 en punto: si llegás tarde, te queda menos tiempo
    fixedUntil: 9 * 60,
    timeLimit: 60,
    // cuánto se llena: de las 7:20 a las 8:20 el estacionamiento se va tapando
    fillFrom: 7 * 60 + 20,
    fillSpan: 60,
    rampEvery: 20,
    ramp: 1.04,
    rampCap: 1.15,
    bossCap: 1.05,
    baseSpeed: 62,
    drain: 0.4,
    stressDecay: 1.1,
    turboCost: 40,
    turboGain: 11,
    turboDodge: 10,
    boostMul: 1.7,
    boostTime: 0.8,
    startEnergy: 84,
    length: 5200,
    gap0: 235,
    gap1: 130,
    boss: { name: "La última hilera", at: 0.78, waves: 3, gap: 200 },
    obstacles: ["camioneta", "auto", "columna"],
    pickups: ["gasolina", "cafe", "tamal"],
    crossings: 6,
    crossBonus: 12,
    dodgePoint: 3,
    hitPenalty: 15,
    earlyPoint: 6,
    motoFactor: 0.5,
    phases: [
      [4, 3, 3],
      [3, 3, 4],
      [2, 4, 4],
    ],
    minPick: { gasolina: 4, cafe: 2, tamal: 2 },
    park: 1,
  },
];

/**
 * Rangos de mayor a menor, calibrados con pilotos reales.
 * El de arriba exige haber dejado pasar peatones: manejar rápido solo llega
 * a «Chapín apurado».
 */
export const RANKS = [
  [460, "Leyenda de la hora pico"],
  [405, "Chapín apurado"],
  [300, "Trafiqueado"],
  [0, "Peatón con moto"],
];