import { OBSTACLES, PICKUPS, LEVELS, RANKS } from "./data.js";
import { clamp, laneAt, occupied } from "./geom.js";

export { laneAt, occupied };
export { LEVELS };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeSeed(v) {
  const n = Number(v);
  if (Number.isFinite(n)) return Math.abs(Math.trunc(n)) >>> 0;
  const s = String(v ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function seedFromQuery(search) {
  const q = new URLSearchParams(search).get("viaje");
  if (q == null || q === "") return null;
  return normalizeSeed(q);
}

export function formatClock(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = ((mins % 60) + 60) % 60;
  return h + ":" + String(m).padStart(2, "0");
}

export function clockOf(run) {
  return formatClock(run.origin.depart + Math.floor(run.t));
}

export function deadlineOf(run) {
  return formatClock(run.origin.depart + run.level.timeLimit);
}

/** Rango del puntaje. De mayor a menor en RANKS. */
export function rankOf(score) {
  for (let i = 0; i < RANKS.length; i++) if (score >= RANKS[i][0]) return RANKS[i][1];
  return RANKS[RANKS.length - 1][1];
}

function weighted(ids, weights, rng) {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += weights[i];
  let r = rng() * sum;
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i];
    if (r <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}

function busy(ents, z, lanes, pad) {
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i];
    if (Math.abs(e.z - z) >= pad) continue;
    for (let j = 0; j < lanes.length; j++) {
      if (e.lanes.indexOf(lanes[j]) !== -1) return true;
    }
  }
  return false;
}

function makeSolid(id, lane, z, extra) {
  const s = OBSTACLES[id];
  const lanes = extra.lanes || [lane];
  return {
    id,
    lane,
    laneTo: extra.laneTo ?? null,
    lanes,
    z,
    h: s.h,
    dmg: s.dmg,
    stressHit: s.stress,
    pickup: false,
    wave: extra.wave ?? -1,
    hitFlag: false,
    dead: false,
    scored: false,
    seen: false,
  };
}

function makePickup(id, lane, z) {
  const s = PICKUPS[id];
  return {
    id,
    lane,
    laneTo: null,
    lanes: [lane],
    z,
    h: s.h,
    dmg: 0,
    stressHit: 0,
    energy: s.energy || 0,
    stressDelta: s.stress || 0,
    boostN: s.boost || 0,
    pickup: true,
    wave: -1,
    hitFlag: false,
    dead: false,
    scored: false,
    seen: false,
  };
}

function placeSolid(ents, id, z, rng) {
  const spec = OBSTACLES[id];
  const pad = 46 + spec.h * 0.35;
  if (spec.slides) {
    const dir = rng() < 0.5 ? -1 : 1;
    const start0 = (rng() * 3) | 0;
    for (let k = 0; k < 3; k++) {
      const a = (start0 + k) % 3;
      let b = a + dir;
      if (b < 0 || b > 2) b = a - dir;
      if (b < 0 || b > 2 || a === b) continue;
      if (!busy(ents, z, [a, b], pad)) {
        ents.push(makeSolid(id, a, z, { laneTo: b, lanes: [a, b] }));
        return true;
      }
    }
    return false;
  }
  const start0 = (rng() * 3) | 0;
  for (let k = 0; k < 3; k++) {
    const a = (start0 + k) % 3;
    if (!busy(ents, z, [a], pad)) {
      ents.push(makeSolid(id, a, z, {}));
      return true;
    }
  }
  return false;
}

function lanesNear(ents, z, pad) {
  const s = [];
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i];
    if (Math.abs(e.z - z) >= pad) continue;
    for (let j = 0; j < e.lanes.length; j++) {
      if (s.indexOf(e.lanes[j]) < 0) s.push(e.lanes[j]);
    }
  }
  return s;
}

function placePed(ents, z, rng) {
  const near = lanesNear(ents, z, 64);
  if (near.length >= 2) return false;
  const start = (rng() * 3) | 0;
  for (let k = 0; k < 3; k++) {
    const lane = (start + k) % 3;
    if (near.indexOf(lane) !== -1) continue;
    ents.push(makeSolid("peaton", lane, z, {}));
    return true;
  }
  return false;
}

function placePickup(ents, id, z, rng) {
  const start = (rng() * 3) | 0;
  for (let k = 0; k < 3; k++) {
    const lane = (start + k) % 3;
    if (!busy(ents, z, [lane], 30)) {
      ents.push(makePickup(id, lane, z));
      return true;
    }
  }
  return false;
}

function generate(level, rng) {
  const ents = [];
  const bossAt = Math.floor(level.length * level.boss.at);
  let z = 300;
  let guard = 0;
  let first = true;
  while (guard++ < 600) {
    const d = z / level.length;
    const gap = level.gap0 + (level.gap1 - level.gap0) * d;
    if (z + gap > bossAt - 220) break;
    z += gap;
    const phase = d < 0.34 ? 0 : d < 0.67 ? 1 : 2;
    let id = weighted(level.obstacles, level.phases[phase], rng);
    if (first && id === "cambia") id = "camioneta";
    first = false;
    const ok = placeSolid(ents, id, z, rng);
    if (!ok) z += 40;
    else if (id === "cambia") z += 56;
    if (rng() < 0.36) {
      const pid = level.pickups[(rng() * level.pickups.length) | 0];
      placePickup(ents, pid, z - gap * 0.42, rng);
    }
  }
  const mins = level.minPick;
  const keys = Object.keys(mins);
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i];
    let have = 0;
    for (let j = 0; j < ents.length; j++) if (ents[j].id === id) have++;
    // Reparto parejo a lo largo de toda la ruta: con la calle larga, amontonarlos
    // al principio deja la cola sin gasolina y la partida se pierde sola.
    const span = (bossAt - 400) / (mins[id] + 1);
    let probe = 400 + span;
    let spins = 0;
    while (have < mins[id] && spins++ < 60) {
      if (placePickup(ents, id, probe, rng)) have++;
      probe += span;
      if (probe > bossAt - 200) probe = 400 + span * 0.5 + spins * 23;
    }
  }
  let placed = 0;
  let pz = 520;
  let spins = 0;
  const want = level.crossings || 0;
  while (placed < want && spins++ < 48) {
    if (placePed(ents, pz, rng)) placed++;
    pz += 640;
    if (pz > bossAt - 300) pz = 520 + spins * 29;
  }
  let bz = bossAt;
  let prev = -1;
  for (let w = 0; w < level.boss.waves; w++) {
    let open = (rng() * 3) | 0;
    if (open === prev) open = (open + 1) % 3;
    prev = open;
    for (let lane = 0; lane < 3; lane++) {
      if (lane === open) continue;
      ents.push(makeSolid("bus", lane, bz, { wave: w, lanes: [lane] }));
    }
    bz += level.boss.gap;
  }
  ents.sort((a, b) => a.z - b.z);
  return { ents, bossAt, finish: bz + 160 };
}

export function createRun(seed, level = LEVELS[0]) {
  const s = seed >>> 0;
  const rng = mulberry32(s);
  const origin = { name: level.home, depart: level.depart };
  const world = generate(level, rng);
  return {
    seed: s,
    level,
    origin,
    ents: world.ents,
    bossAt: world.bossAt,
    finish: world.finish,
    z: 0,
    lane: 1,
    laneT: 1,
    energy: level.startEnergy,
    turbo: 100,
    stress: 0,
    score: 0,
    pd: 0,
    pc: 0,
    ph: 0,
    pt: 0,
    pm: 0,
    t: 0,
    boost: 0,
    boostCd: 0,
    stun: 0,
    slow: 0,
    slowCd: 0,
    iframes: 0,
    spd: level.baseSpeed,
    mul: 1,
    alive: true,
    won: false,
    reason: "",
    warnedTime: false,
    warnedEnergy: false,
    bossSaid: false,
  };
}

function yOverlap(run, e) {
  return Math.abs(e.z - run.z) < e.h * 0.45 + 12;
}

export function step(run, input, dt) {
  const events = [];
  if (run.won || !run.alive) return events;
  const level = run.level;

  if (input) {
    if (input.target != null) run.laneT = clamp(input.target, 0, 2);
    if (input.boost && run.boostCd <= 0 && run.boost <= 0) {
      if (run.turbo >= level.turboCost) {
        run.turbo -= level.turboCost;
        run.boost = level.boostTime;
        run.boostCd = 0.45;
        run.iframes = Math.max(run.iframes, 0.22);
        events.push({ k: "boost" });
      } else {
        events.push({ k: "need" });
      }
    }
    if (input.brake && run.slowCd <= 0 && run.slow <= 0) {
      run.slow = 0.32;
      run.slowCd = 1.2;
    }
  }

  if (run.boost > 0) run.boost -= dt;
  if (run.boostCd > 0) run.boostCd -= dt;
  if (run.stun > 0) run.stun -= dt;
  if (run.slow > 0) run.slow -= dt;
  if (run.slowCd > 0) run.slowCd -= dt;
  if (run.iframes > 0) run.iframes -= dt;

  const ramps = Math.floor(run.t / level.rampEvery);
  let mul = Math.min(level.rampCap, Math.pow(level.ramp, ramps));
  if (run.z >= run.bossAt - 30) mul = Math.min(mul, level.bossCap);
  let spd = level.baseSpeed * mul;
  if (run.boost > 0) spd *= level.boostMul;
  if (run.stun > 0) spd *= 0.42;
  if (run.slow > 0) spd *= 0.5;
  run.mul = mul;
  run.spd = spd;
  run.z += spd * dt;
  run.t += dt;
  run.lane += (run.laneT - run.lane) * Math.min(1, dt * 22);

  let drain = level.drain;
  if (run.stress > 75) drain *= 1.35;
  run.energy = Math.max(0, run.energy - drain * dt);
  run.stress = Math.max(0, run.stress - level.stressDecay * dt);
  if (run.boost <= 0) run.turbo = Math.min(100, run.turbo + level.turboGain * dt);

  const pLane = occupied(run.laneT);
  const ents = run.ents;
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i];
    if (e.dead) continue;
    const dz = e.z - run.z;
    if (dz > 240) break;
    if (!e.seen && dz < 168 && dz > 0 && !e.pickup) {
      e.seen = true;
      events.push({ k: "seen", id: e.id });
      if (e.id === "camioneta") events.push({ k: "block", id: e.id, lane: e.lane, z: e.z });
    }
    if (e.id === "peaton" && !e.paid && !e.hitFlag && dz > 16 && dz < 150 && run.slow > 0 && occupied(e.lane) === pLane) {
      e.paid = true;
      e.dead = true;
      run.pc += level.crossBonus;
      run.score += level.crossBonus;
      events.push({ k: "yield", n: level.crossBonus, lane: e.lane, z: e.z });
      continue;
    }
    if (dz < -e.h && !e.scored) {
      e.scored = true;
      if (!e.pickup && !e.hitFlag && e.id !== "peaton") {
        run.pd += level.dodgePoint;
        run.score += level.dodgePoint;
        run.turbo = Math.min(100, run.turbo + level.turboDodge);
        events.push({ k: "dodge", n: level.dodgePoint, lane: e.lane, z: e.z });
        if (e.id === "cambia") events.push({ k: "luck" });
      }
      continue;
    }
    if (dz < -8 || dz > 200) continue;
    const eLane = occupied(laneAt(e, run.z));
    if (eLane !== pLane || !yOverlap(run, e)) continue;
    if (e.pickup) {
      e.dead = true;
      if (e.energy) run.energy = Math.min(100, run.energy + e.energy);
      if (e.stressDelta) run.stress = clamp(run.stress + e.stressDelta, 0, 100);
      if (e.boostN) run.boost = Math.max(run.boost, e.boostN);
      events.push({ k: "pick", id: e.id, lane: e.lane, z: e.z });
      continue;
    }
    if (run.iframes > 0 || e.hitFlag) continue;
    e.hitFlag = true;
    run.energy = Math.max(0, run.energy - e.dmg);
    run.stress = Math.min(100, run.stress + e.stressHit);
    run.ph += level.hitPenalty;
    // Se registra lo que de verdad se restó: si el marcador estaba en 0, el piso
    // recorta el castigo y el desglose del final tiene que sumar exacto igual.
    const before = run.score;
    run.score = Math.max(0, before - level.hitPenalty);
    run.ph -= level.hitPenalty - (before - run.score);
    run.iframes = 0.9;
    run.stun = 0.38;
    events.push({ k: "hit", id: e.id, lane: eLane, z: e.z, n: level.hitPenalty });
  }

  if (!run.bossSaid && run.z >= run.bossAt - 200) {
    run.bossSaid = true;
    events.push({ k: "boss" });
  }
  if (!run.warnedTime && run.t >= level.timeLimit - 18) {
    run.warnedTime = true;
    events.push({ k: "time" });
  }
  if (run.energy < 24 && run.energy > 0 && !run.warnedEnergy) {
    run.warnedEnergy = true;
    events.push({ k: "low" });
  }
  if (run.energy > 42) run.warnedEnergy = false;

  if (run.z >= run.finish) {
    run.won = true;
    const early = Math.max(0, level.timeLimit - run.t);
    run.pt = Math.round(early * level.earlyPoint);
    run.pm = Math.round(run.energy * level.motoFactor);
    run.score += run.pt + run.pm;
    events.push({ k: "win", early: Math.round(early), timeGain: run.pt, motoGain: run.pm });
    return events;
  }
  if (run.energy <= 0) {
    run.alive = false;
    run.reason = "energy";
    events.push({ k: "lose", reason: "energy" });
    return events;
  }
  if (run.t >= level.timeLimit) {
    run.alive = false;
    run.reason = "time";
    events.push({ k: "lose", reason: "time" });
  }
  return events;
}
