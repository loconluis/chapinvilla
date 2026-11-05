import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "fs";
import test from "node:test";
import { LEVELS, LINES, OBSTACLES, PICKUPS, SPRITES } from "../src/data.js";
import { laneAt, occupied } from "../src/geom.js";
import { lineFor, resetHumor } from "../src/humor.js";
import { clockOf, createRun, deadlineOf, formatClock, seedFromQuery, step } from "../src/sim.js";

test("sprites son matrices compactas", () => {
  for (const [name, rows] of Object.entries(SPRITES)) {
    assert.ok(rows.length >= 8, name);
    const w = rows[0].length;
    assert.ok(w >= 8 && w <= 32, name);
    for (const row of rows) {
      assert.equal(row.length, w, name + " [" + row + "]");
      assert.match(row, /^[0-6.]+$/);
    }
  }
});

test("nivel 1 es dato, no un caso especial", () => {
  assert.equal(LEVELS.length, 1);
  const level = LEVELS[0];
  assert.equal(level.name, "La hora pico");
  assert.equal(level.obstacles.length, 4);
  assert.equal(level.pickups.length, 3);
  assert.equal(level.boss.name, "El tráfico eterno");
  assert.equal(level.dest, "Build & Pitch");
  assert.equal(level.home, "tu casa");
  assert.equal(level.depart, 6 * 60 + 30);
  assert.equal("origins" in level, false);
  for (const id of level.obstacles) assert.ok(OBSTACLES[id], id);
  for (const id of level.pickups) assert.ok(PICKUPS[id], id);
  assert.equal(level.rampEvery, 15);
});

test("frases pedidas y sin repetición seguida", () => {
  const all = Object.values(LINES).flat();
  for (const line of [
    "Ese ya estaba desde antes",
    "¡Hay campo todavía!",
    "Ya casi, vos",
    "Necesitás un cafecito",
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
  assert.equal(sa.q, sb.q);
  assert.notEqual(sig(createRun(4821)), sig(createRun(4822)));
});

test("reloj y plazo", () => {
  assert.equal(formatClock(5 * 60 + 50), "5:50");
  assert.equal(formatClock(8 * 60), "8:00");
  const run = createRun(2);
  assert.equal(run.origin.name, "tu casa");
  assert.equal(clockOf(run), "6:30");
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
    assert.ok(run.ents.some((e) => e.id === "quetzal"));
  }
});

test("un piloto atento llega y quedarse quieto no", () => {
  let wins = 0;
  let times = 0;
  const seeds = [];
  for (let seed = 1; seed <= 16; seed++) seeds.push(seed);
  for (const seed of seeds) {
    const run = play(seed, choose);
    if (run.won) {
      wins++;
      times += run.t;
    } else {
      assert.fail("seed " + seed + " " + run.reason + " z " + Math.round(run.z) + " e " + run.energy.toFixed(1));
    }
  }
  const avg = times / wins;
  assert.ok(avg > 55 && avg < 90, "duración " + avg.toFixed(1));
  let afkLosses = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const run = play(seed, () => 1);
    if (!run.won) afkLosses++;
  }
  assert.ok(afkLosses >= 8, "afk losses " + afkLosses);
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

function play(seed, policy) {
  const run = createRun(seed);
  let guard = 0;
  while (run.alive && !run.won && guard++ < 60 * 130) {
    const want = policy(run);
    const target = Math.abs(want - run.laneT) > 1 ? run.laneT + Math.sign(want - run.laneT) : want;
    step(run, { target, boost: false, brake: false }, 1 / 60);
  }
  return run;
}
