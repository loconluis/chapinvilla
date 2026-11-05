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
  // Vista de arriba para todo: el frente mira hacia arriba de la pantalla.
  // La silueta y el ancho son lo que distingue cada cosa:
  // moto angosta (12), camioneta ancha (16), taxi mediano (14), bus muy largo (16x20).
  moto: S(`
.......0000.......
.......0660.......
.....00000000.....
....0333333330....
...033333333330...
...0.05555550.0...
....0055555500....
.....05555550.....
.....01111110.....
......011110......
.......0000.......
.......0660.......
.......0660.......
......033330......
.......0000.......
.......0660.......
......066660......
.......0000.......
`),
  moto2: S(`
.......0000.......
.......0660.......
.....00000000.....
....0333333330....
...033333333330...
...0.05555550.0...
....0055555500....
.....05555550.....
.....01111110.....
......011110......
.......0000.......
.......0660.......
.......0660.......
......033330......
.......0000.......
......066660......
.......0660.......
.......0000.......
`),
  camioneta: S(`
................
..000000000000..
..066000000660..
..054444444450..
..055555555550..
..055522225550..
..055555555550..
..055555555550..
..054444444450..
..055555555550..
..000000000000..
..066000000660..
..000000000000..
................
`),
  motorista: S(`
....0000....
...000000...
..03333330..
..04444440..
..05555550..
..05555550..
...044440...
....0000....
....0660....
...033330...
....0000....
....0660....
.....00.....
`),
  car: S(`
...00000000...
...02222220...
...02444420...
..0022222200..
..0222222220..
..0222222220..
..0222222220..
..0022222200..
...03333330...
...00000000...
`),
  hoyo: S(`
................
....55555555....
...5000000005...
..500000000005..
.50000000000005.
.50000000000005.
.50000000000005.
..500000000005..
...5000000005...
....55555555....
................
................
`),
  bus: S(`
..000000000000..
..054444444450..
..055555555550..
..055226622550..
..055555555550..
..055555555550..
..055226622550..
..055555555550..
..055555555550..
..055226622550..
..055555555550..
..054444444450..
..000000000000..
..066000000660..
..000000000000..
................
`),
  gasolina: S(`
...000000...
...066660...
...033330...
..03333330..
..03555530..
..03533530..
..03555530..
..03333330..
..03333330..
...000000...
............
............
`),
  cafe: S(`
...000000...
..05555550..
..04444440..
..05555550..
..05555550..
..05555550..
...000000...
....3333....
............
............
`),
  tamal: S(`
...000000...
..01111110..
..01555510..
..01533510..
..01555510..
..01111110..
...000000...
.....00.....
............
............
`),
  peaton: S(`
....0000....
...055550...
....0000....
...033330...
..03333330..
..0.3333.0..
....4444....
...44..44...
...4....4...
..00....00..
`),
};

export const OBSTACLES = {
  camioneta: { h: 28, dmg: 22, stress: 14 },
  motorista: { h: 24, dmg: 16, stress: 12 },
  hoyo: { h: 22, dmg: 18, stress: 22 },
  cambia: { h: 24, dmg: 18, stress: 14, slides: true },
  bus: { h: 34, dmg: 30, stress: 18 },
  peaton: { h: 20, dmg: 12, stress: 16 },
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
    "Casi lo saludás otra vez",
  ],
  camioneta: [
    "¡Hay campo todavía!",
    "Esa camioneta trae el día entero",
    "Por la orilla, con fe",
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
    "Se nos va la mañana",
  ],
  energia: [
    "Se está vaciando el tanque",
    "Buscá gasolina, ya mismo",
  ],
  turbo: [
    "Todavía no hay turbo",
    "Dejá que cargue, vos",
  ],
  suerte: [
    "Hoy sí hubo suerte",
    "Pasaste. Seguí, seguí",
  ],
  gasolina: [
    "Tanque lleno, otra vez",
    "Gasolina y fe, lo único que hace falta",
  ],
  cafe: [
    "Café chapín. Ahora sí",
    "Eso despierta hasta el tráfico",
  ],
  tamal: [
    "Tamal de emergencia",
    "Volvió un poco de paciencia",
  ],
  boss: [
    "El tráfico eterno",
    "Ahí vienen, ocupando dos carriles",
  ],
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