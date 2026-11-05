import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "fs";
import test from "node:test";
import { LEVELS, LINES, OBSTACLES, PICKUPS, RANKS, SPRITES } from "../src/data.js";
import { laneAt, occupied } from "../src/geom.js";
import { lineFor, resetHumor } from "../src/humor.js";
import { clockOf, createRun, deadlineOf, formatClock, rankOf, seedFromQuery, step } from "../src/sim.js";

test("sprites son matrices compactas", () => {
  for (const [name, rows] of Object.entries(SPRITES)) {
    assert.ok(rows.length >= 8, name);
    const w = rows[0].length;
    assert.ok(w >= 8 && w <= 32, name);
    for (const row of rows) {
      assert.equal(row.length, w, name + " [" + row + "]");
      assert.match(row, /^[0-7.]+$/);
    }
  }
});

test("nivel 1 es dato, no un caso especial", () => {
  assert.equal(LEVELS.length, 2);
  const level = LEVELS[0];
  assert.equal(level.name, "La hora pico");
  assert.equal(level.obstacles.length, 4);
  assert.equal(level.pickups.length, 3);
  assert.ok(level.pickups.includes("gasolina"));
  assert.equal(level.crossings, 10);
  assert.equal(level.crossBonus, 8);
  assert.equal(level.dodgePoint, 3);
  assert.equal(level.hitPenalty, 15);
  assert.equal(level.earlyPoint, 6);
  assert.equal(level.motoFactor, 0.5);
  assert.equal(RANKS.length, 4);
  assert.ok(RANKS[0][0] > RANKS[1][0] && RANKS[1][0] > RANKS[2][0] && RANKS[2][0] > RANKS[3][0]);
  assert.equal(RANKS[3][0], 0);
  assert.equal(level.boss.name, "El tráfico eterno");
  assert.equal(level.dest, "Build & Pitch");
  assert.equal(level.home, "tu casa");
  assert.equal(level.depart, 5 * 60);
  assert.equal(level.timeLimit, 180);
  assert.equal("origins" in level, false);
  for (const id of level.obstacles) assert.ok(OBSTACLES[id], id);
  for (const id of level.pickups) assert.ok(PICKUPS[id], id);
  assert.equal(level.rampEvery, 20);
  // el tráfico sube: los huecos se cierran con el recorrido
  assert.ok(level.gap1 < level.gap0 * 0.6);
});

test("frases pedidas y sin repetición seguida", () => {
  const all = Object.values(LINES).flat();
  for (const line of [
    "Ese ya estaba desde antes",
    "¡Hay campo todavía!",
    "Ya casi, vos",
    "Se está vaciando el tanque",
    "Hoy sí hubo suerte",
    "Llegaste. No preguntés cómo",
  ]) {
    assert.ok(all.includes(line), line);
  }
  resetHumor();
  let prev = "";
  const keys = Object.keys(LINES);
  for (let i = 0; i < 60; i++) {
    const s = lineFor(keys[i % keys.length]);
    if (!s) continue;
    assert.notEqual(s, prev);
    prev = s;
  }
});

test("el mismo viaje reconstruye la misma calle", () => {
  assert.equal(seedFromQuery("?viaje=4821"), 4821);
  assert.equal(seedFromQuery(""), null);
  const a = createRun(4821);
  const b = createRun(4821);
  assert.equal(a.origin.name, "tu casa");
  assert.equal(createRun(7).origin.name, "tu casa");
  assert.equal(a.origin.depart, createRun(7).origin.depart);
  assert.equal(sig(a), sig(b));
  let sa = a;
  let sb = b;
  for (let i = 0; i < 90; i++) {
    step(sa, { target: 0, boost: i === 10, brake: false }, 1 / 60);
    step(sb, { target: 0, boost: i === 10, brake: false }, 1 / 60);
  }
  assert.equal(sa.z, sb.z);
  assert.equal(sa.energy, sb.energy);
  assert.equal(sa.score, sb.score);
  assert.equal(sa.pd, sb.pd);
  assert.notEqual(sig(createRun(4821)), sig(createRun(4822)));
});

test("reloj y plazo", () => {
  assert.equal(formatClock(5 * 60 + 50), "5:50");
  assert.equal(formatClock(8 * 60), "8:00");
  const run = createRun(2);
  assert.equal(run.origin.name, "tu casa");
  assert.equal(clockOf(run), "5:00");
  assert.equal(deadlineOf(run), "8:00");
  assert.equal(createRun(4821).origin.name, run.origin.name);
});

test("nunca se tapan los tres carriles", () => {
  for (let seed = 1; seed <= 24; seed++) {
    const run = createRun(seed);
    let worst = 0;
    const solids = run.ents.filter((e) => !e.pickup);
    for (let z = 0; z <= run.finish; z += 8) {
      const lanes = new Set();
      for (const e of solids) {
        if (Math.abs(e.z - z) > e.h * 0.5) continue;
        for (const lane of e.lanes) lanes.add(lane);
      }
      if (lanes.size > worst) worst = lanes.size;
    }
    assert.ok(worst <= 2, "seed " + seed + " tapa " + worst);
    assert.ok(run.ents.some((e) => e.id === "bus"));
    assert.ok(run.ents.some((e) => e.id === "cafe"));
    assert.ok(run.ents.some((e) => e.id === "tamal"));
    assert.ok(run.ents.some((e) => e.id === "peaton"));
    assert.equal(run.ents.some((e) => e.id === "quetzal"), false);
  }
});

test("frenar deja pasar al peatón y atropellarlo no suma", () => {
  const run = createRun(1);
  const ped = run.ents.find((e) => e.id === "peaton");
  assert.ok(ped);
  run.z = ped.z - 80;
  run.lane = ped.lane;
  run.laneT = ped.lane;
  let got = 0;
  for (let i = 0; i < 50; i++) {
    const ev = step(run, { target: ped.lane, boost: false, brake: i < 10 }, 1 / 60);
    if (ev.some((e) => e.k === "yield")) got++;
  }
  assert.equal(got, 1);
  assert.equal(run.pc, 8);
  assert.equal(run.score, 8);
  assert.equal(ped.dead, true);

  const run2 = createRun(1);
  const ped2 = run2.ents.find((e) => e.id === "peaton");
  run2.z = ped2.z - 28;
  run2.lane = ped2.lane;
  run2.laneT = ped2.lane;
  let hit = false;
  for (let i = 0; i < 50; i++) {
    const ev = step(run2, { target: ped2.lane, boost: false, brake: false }, 1 / 60);
    if (ev.some((e) => e.k === "hit" && e.id === "peaton")) hit = true;
  }
  assert.equal(hit, true);
  assert.equal(run2.pc, 0);
});

test("esquivar limpio suma y chocar resta", () => {
  const level = LEVELS[0];
  const run = createRun(1);
  const first = run.ents.find((e) => !e.pickup && e.id !== "peaton");
  assert.ok(first);
  // carril libre: el obstáculo queda atrás sin tocarnos
  run.lane = run.laneT = (first.lane + 1) % 3;
  run.z = first.z + 4;
  let dodges = 0;
  for (let i = 0; i < 40; i++) {
    for (const ev of step(run, { target: run.laneT, boost: false, brake: false }, 1 / 60)) {
      if (ev.k === "dodge") dodges += ev.n;
    }
    if (first.scored) break;
  }
  assert.equal(first.scored, true);
  assert.equal(first.hitFlag, false);
  assert.equal(dodges, level.dodgePoint);
  assert.equal(run.pd, level.dodgePoint);
  assert.equal(run.score, level.dodgePoint);

  // chocar resta y tiene piso en 0
  const run2 = createRun(1);
  const victim = run2.ents.find((e) => !e.pickup && e.id !== "peaton");
  run2.lane = run2.laneT = victim.lane;
  run2.z = victim.z - 8;
  run2.iframes = 0;
  let penalty = 0;
  for (let i = 0; i < 20; i++) {
    for (const ev of step(run2, { target: victim.lane, boost: false, brake: false }, 1 / 60)) {
      if (ev.k === "hit" && ev.id !== "peaton") penalty += ev.n;
    }
    if (victim.hitFlag) break;
  }
  assert.equal(victim.hitFlag, true);
  assert.equal(penalty, level.hitPenalty);
  // Con el marcador en 0 no hay nada que restar: el piso se respeta y el
  // desglose no inventa un castigo que no ocurrió.
  assert.equal(run2.score, 0);
  assert.equal(run2.ph, 0);

  // Con marcador de sobra, la resta entra completa y el desglose cuadra.
  const run3 = createRun(1);
  const victim3 = run3.ents.find((e) => !e.pickup && e.id !== "peaton");
  run3.lane = run3.laneT = victim3.lane;
  run3.z = victim3.z - 8;
  run3.iframes = 0;
  run3.score = 30;
  run3.pd = 30;
  for (let i = 0; i < 20 && !victim3.hitFlag; i++) {
    step(run3, { target: victim3.lane, boost: false, brake: false }, 1 / 60);
  }
  assert.equal(victim3.hitFlag, true);
  assert.equal(run3.ph, level.hitPenalty);
  assert.equal(run3.score, 30 - level.hitPenalty);
  assert.equal(run3.score, run3.pd + run3.pc - run3.ph + run3.pt + run3.pm);
});

test("el peatón ignorado no paga como esquive", () => {
  const run = createRun(1);
  const ped = run.ents.find((e) => e.id === "peaton");
  run.lane = run.laneT = (ped.lane + 1) % 3;
  run.z = ped.z + 4;
  let paidForPed = 0;
  for (let i = 0; i < 40 && !ped.scored; i++) {
    for (const ev of step(run, { target: run.laneT, boost: false, brake: false }, 1 / 60)) {
      if (ev.k === "dodge" && ev.z === ped.z) paidForPed += ev.n;
    }
  }
  assert.equal(ped.scored, true);
  assert.equal(ped.hitFlag, false);
  assert.equal(paidForPed, 0);
});

test("llegar antes y con la moto entera suma", () => {
  const level = LEVELS[0];
  const a = createRun(5);
  a.z = a.finish - 4;
  a.t = level.timeLimit - 120;
  a.energy = 80;
  let win = null;
  for (let i = 0; i < 10 && !win; i++) {
    for (const ev of step(a, null, 1 / 60)) if (ev.k === "win") win = ev;
  }
  assert.ok(win);
  assert.equal(win.early, 120);
  assert.equal(win.timeGain, 120 * level.earlyPoint);
  assert.ok(win.motoGain >= 80 * level.motoFactor - 1 && win.motoGain <= 80 * level.motoFactor + 1);

  // misma semilla, misma energía, llegada más tarde ⇒ menos puntos
  const b = createRun(5);
  b.z = b.finish - 4;
  b.t = level.timeLimit - 40;
  b.energy = 80;
  let late = null;
  for (let i = 0; i < 10 && !late; i++) {
    for (const ev of step(b, null, 1 / 60)) if (ev.k === "win") late = ev;
  }
  assert.ok(late.timeGain < win.timeGain);
  assert.ok(a.score > b.score, a.score + " vs " + b.score);
});

test("rangos: umbrales, huecos y el de arriba solo con peatones", () => {
  for (let i = 0; i < RANKS.length; i++) {
    const [from, name] = RANKS[i];
    assert.equal(rankOf(from), name, "umbral " + from);
    // RANKS va de mayor a menor: un punto abajo del umbral cae al rango siguiente.
    if (i > 0) assert.equal(rankOf(from - 1), RANKS[i + 1] ? RANKS[i + 1][1] : name, "justo debajo de " + from);
  }
  assert.equal(rankOf(-5), RANKS[RANKS.length - 1][1]);
  assert.equal(rankOf(1e9), RANKS[0][1]);
});

test("balance: limpio y generoso > apurado > golpeado", () => {
  const totals = { gen: [], rush: [], sloppy: [] };
  for (let seed = 1; seed <= 16; seed++) {
    const gen = play(seed, fueled(yielding(choose)));
    const rush = play(seed, fueled(choose));
    const sloppy = play(seed, sloppyOf(fueled(yielding(choose)), seed));
    assert.ok(gen.won, "generoso seed " + seed + " " + gen.reason);
    assert.ok(rush.won, "apurado seed " + seed + " " + rush.reason);
    totals.gen.push(gen.score);
    totals.rush.push(rush.score);
    if (sloppy.won) totals.sloppy.push(sloppy.score);
    // el desglose cuadra con el total
    assert.ok(gen.pd > 0 && gen.pc > 0, "seed " + seed);
    assert.equal(gen.score, gen.pd + gen.pc - gen.ph + gen.pt + gen.pm);
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(avg(totals.gen) > avg(totals.rush), avg(totals.gen) + " vs " + avg(totals.rush));
  assert.ok(totals.sloppy.length > 0, "el piloto golpeado tiene que llegar al menos una vez");
  assert.ok(avg(totals.rush) > avg(totals.sloppy), avg(totals.rush) + " vs " + avg(totals.sloppy));
  // y el rango de arriba es alcanzable jugando bien
  assert.equal(rankOf(Math.max(...totals.gen)), RANKS[0][1]);
});

test("un piloto atento llega y quedarse quieto no", () => {
  let wins = 0;
  let times = 0;
  const seeds = [];
  for (let seed = 1; seed <= 16; seed++) seeds.push(seed);
  for (const seed of seeds) {
    const run = play(seed, fueled(choose));
    if (run.won) {
      wins++;
      times += run.t;
    } else {
      assert.fail("seed " + seed + " " + run.reason + " z " + Math.round(run.z) + " e " + run.energy.toFixed(1));
    }
  }
  const avg = times / wins;
  assert.ok(avg > 140 && avg < 180, "duración " + avg.toFixed(1));
  let afkLosses = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const run = play(seed, () => 1);
    if (!run.won) afkLosses++;
  }
  assert.ok(afkLosses >= 8, "afk losses " + afkLosses);
});

test("el parqueo se llena según la hora a la que llegás", () => {
  const L = LEVELS[1];
  const solids = (run) => run.ents.filter((e) => !e.pickup).length;
  const temprano = createRun(7, L, 7 * 60 + 20);
  const medio = createRun(7, L, 7 * 60 + 50);
  const tarde = createRun(7, L, 8 * 60 + 15);
  assert.ok(solids(medio) > solids(temprano), "a las 7:50 hay más autos que a las 7:20");
  assert.ok(solids(tarde) > solids(medio), "a las 8:15 hay más autos que a las 7:50");
  // y cuanto más tarde, menos tiempo: el pitch arranca a las 9:00 igual para todos
  assert.ok(tarde.limit < medio.limit && medio.limit < temprano.limit, "el plazo se acorta");
  for (const run of [temprano, medio, tarde]) {
    assert.equal(run.origin.depart + run.limit, L.fixedUntil, "todos corren hasta las 9:00");
  }
  // misma semilla y misma hora, misma playa
  assert.equal(sig(createRun(7, L, 500)), sig(createRun(7, L, 500)));
  assert.notEqual(sig(createRun(7, L, 460)), sig(createRun(7, L, 500)));
});

test("el parqueo se puede ganar, incluso llegando tarde", () => {
  const L = LEVELS[1];
  for (const arrived of [7 * 60 + 30, 8 * 60, 8 * 60 + 20]) {
    let wins = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const run = play(seed, fueled(yielding(choose)), L, arrived);
      if (run.won) wins++;
      else assert.fail("llegando " + arrived + " seed " + seed + " " + run.reason + " z " + Math.round(run.z) + "/" + run.finish);
      assert.ok(run.t < run.limit, "seed " + seed + " se pasó del plazo");
    }
    assert.equal(wins, 10);
  }
});

test("el fuente no pide nada por la red", () => {
  for (const file of readdirSync("src")) {
    if (!file.endsWith(".js")) continue;
    const text = readFileSync("src/" + file, "utf8");
    assert.equal(/https?:\/\//.test(text), false, file);
  }
  const shell = readFileSync("src/shell.html", "utf8");
  assert.equal(/<(script|link|img)[^>]+src=["']https?:/i.test(shell), false);
  assert.equal(/url\((['"]?)https?:/i.test(shell), false);
});

function sig(run) {
  return run.ents.map((e) => e.id + ":" + e.lane + ":" + (e.laneTo ?? "-") + ":" + Math.round(e.z)).join("|");
}

function hazard(run, lane) {
  let score = 0;
  for (const e of run.ents) {
    if (e.dead || e.pickup) continue;
    const dz = e.z - run.z;
    if (dz < -12 || dz > 220) continue;
    const now = occupied(laneAt(e, run.z));
    if (now === lane) score += (240 - dz) * (e.id === "bus" ? 4 : 1);
    else if (e.laneTo === lane && dz < 160 && dz > 36) score += (200 - dz) * 0.85;
  }
  return score;
}

function contact(run, lane) {
  let score = 0;
  for (const e of run.ents) {
    if (e.dead || e.pickup) continue;
    const dz = e.z - run.z;
    if (dz < -12 || dz > 28) continue;
    if (occupied(laneAt(e, run.z)) === lane) score += 800;
  }
  return score;
}

function choose(run) {
  const from = run.laneT;
  let bestL = from;
  let best = Infinity;
  for (let lane = 0; lane < 3; lane++) {
    let score = hazard(run, lane) + Math.abs(lane - from) * 18;
    const dir = Math.sign(lane - from);
    for (let mid = from + dir; dir !== 0 && mid !== lane + dir; mid += dir) {
      score += contact(run, mid);
    }
    if (score < best) {
      best = score;
      bestL = lane;
    }
  }
  return bestL;
}

function pedAhead(run, maxDz = 150) {
  let best = null;
  let bd = Infinity;
  for (const e of run.ents) {
    if (e.id !== "peaton" || e.dead || e.paid) continue;
    const dz = e.z - run.z;
    if (dz < 16 || dz > maxDz || dz >= bd) continue;
    bd = dz;
    best = e;
  }
  return best;
}

/** La gasolina más cercana adelante, si hay. */
function gasAhead(run, maxDz = 240) {
  let best = null;
  let bd = Infinity;
  for (const e of run.ents) {
    if (e.id !== "gasolina" || e.dead) continue;
    const dz = e.z - run.z;
    if (dz < 12 || dz > maxDz || dz >= bd) continue;
    bd = dz;
    best = e;
  }
  return best;
}

/** Un piloto de verdad carga gasolina cuando el tanque baja. */
function fueled(inner) {
  return (run) => {
    if (run.energy > 46) return inner(run);
    const gas = gasAhead(run);
    if (gas && hazard(run, gas.lane) < 260) return { lane: gas.lane, brake: false };
    return inner(run);
  };
}

/** Envuelve un piloto: si hay un peatón cerca y el carril es seguro, frená y dejalo pasar. */
function yielding(inner) {
  return (run) => {
    const ped = pedAhead(run);
    if (ped && hazard(run, ped.lane) < 200) {
      return { lane: ped.lane, brake: occupied(run.laneT) === ped.lane && ped.z - run.z < 120 };
    }
    return inner(run);
  };
}

/** Piloto descuidado: de tanto en tanto elige mal el carril. */
function sloppyOf(inner, seed) {
  let a = (seed * 7919) >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let errUntil = 0;
  return (run) => {
    const want = inner(run);
    const lane = typeof want === "number" ? want : want.lane;
    const brake = typeof want === "number" ? false : want.brake;
    if (run.t > errUntil && rnd() < 0.012) {
      errUntil = run.t + 0.35;
      return { lane: (lane + 1 + ((rnd() * 2) | 0)) % 3, brake: false };
    }
    return { lane, brake };
  };
}

function play(seed, policy) {
  const run = createRun(seed);
  let guard = 0;
  while (run.alive && !run.won && guard++ < 60 * 200) {
    const want = policy(run);
    const lane = typeof want === "number" ? want : want.lane;
    const brake = typeof want === "number" ? false : !!want.brake;
    const target = Math.abs(lane - run.laneT) > 1 ? run.laneT + Math.sign(lane - run.laneT) : lane;
    step(run, { target, boost: false, brake }, 1 / 60);
  }
  return run;
}
