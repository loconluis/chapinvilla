import { follow, resetMusic, setMuted, sfx, unlock } from "./audio.js";
import { PY, laneX, worldY } from "./geom.js";
import { lineFor, resetHumor } from "./humor.js";
import { burst, clearFx, pop, punch, render } from "./render.js";
import {
  LEVELS,
  clockOf,
  createRun,
  deadlineOf,
  rankOf,
  seedFromQuery,
  step,
} from "./sim.js";

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: false });
const tag = document.getElementById("tag");
const joke = document.getElementById("joke");
const panel = document.getElementById("panel");
const pad = document.getElementById("pad");
const qEl = document.getElementById("q");
const clockEl = document.getElementById("clock");
const fillE = document.getElementById("fillE");
const fillS = document.getElementById("fillS");
const fillT = document.getElementById("fillT");
const fillB = document.getElementById("fillB");
const boostBtn = document.getElementById("bA");
const barS = document.getElementById("barS");
const muteBtn = document.getElementById("mute");
const pauseBtn = document.getElementById("pause");

const KEY = "chapinvilla.v1";
const STEP = 1 / 60;
const LOSE = {
  energy: "Se acabó la gasolina y la moto se paró.",
};
const FIRST = {
  gasolina: "Gasolina: llenó el tanque. Sin esto la moto se para.",
  cafe: "Café: te dio velocidad por un rato. Llegar antes vale más puntos.",
  tamal: "Tamal: bajó el estrés. Con el estrés alto el tanque se vacía más rápido.",
};
const SEE = {
  peaton: "Peatón en el paso. Frená en su carril y dejalo pasar: da puntos.",
};
const BOOST = "Turbo lleno. Esquivar lo recarga: ACELERA cuando esté listo.";
const HIT = {
  camioneta: "Camioneta: baja energía y sube estrés.",
  motorista: "Motorista: baja energía y sube estrés.",
  hoyo: "Hoyo: baja energía y sube mucho el estrés.",
  cambia: "Se mete a tu carril: baja energía y sube estrés.",
  bus: "Bus: tapa dos carriles, baja energía y sube estrés.",
  peaton: "Peatón: lo atropellaste. Sin puntos. Baja energía y sube estrés.",
};
const told = {};

let save = loadSave();
let mode = "start";
let run = null;
let targetLane = 1;
let boostPulse = false;
let brakePulse = false;
let acc = 0;
let last = 0;
let deco = 0;
let jokeLock = 0;
let nowT = 0;

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { best: s.best | 0, mute: s.mute === true };
  } catch {
    return { best: 0, mute: false };
  }
}

function writeSave() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* privado o lleno: el juego sigue */
  }
}

function fit() {
  const app = document.getElementById("app");
  for (let pass = 0; pass < 2; pass++) {
    let chrome = 12;
    const kids = app.children;
    for (let i = 0; i < kids.length; i++) {
      if (kids[i] !== canvas) chrome += kids[i].offsetHeight + 6;
    }
    const used = Math.min(chrome, innerHeight * 0.4);
    const sw = (innerWidth - 8) / 320;
    const sh = (innerHeight - used) / 180;
    let s = Math.min(sw, sh);
    if (s >= 2) s = Math.floor(s);
    else s = Math.max(s, Math.min(sw, 1.8));
    if (s < 1) s = 1;
    const px = Math.round(320 * s);
    canvas.style.width = px + "px";
    canvas.style.height = Math.round(180 * s) + "px";
    app.style.setProperty("--w", px + 8 + "px");
  }
}

function setJoke(text) {
  joke.textContent = text || "";
}

function say(key, force) {
  if (!force && nowT < jokeLock && key !== "win") return;
  const s = lineFor(key);
  if (!s) return;
  setJoke(s);
  jokeLock = nowT + 1.15;
}

const qTeach = [];

function showTeach(id, text) {
  told[id] = 1;
  setJoke(text);
  jokeLock = nowT + 2.2;
}

function teach(id, text) {
  if (!text || told[id]) return false;
  if (qTeach.some((p) => p.id === id)) return true;
  if (nowT < jokeLock || qTeach.length) {
    qTeach.push({ id, text });
    return true;
  }
  showTeach(id, text);
  return true;
}

function pumpTeach() {
  if (!qTeach.length || nowT < jokeLock) return;
  const p = qTeach.shift();
  if (told[p.id]) return pumpTeach();
  showTeach(p.id, p.text);
}

function btn(label, fn, alt) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  if (alt) b.className = "alt";
  b.addEventListener("click", fn);
  return b;
}

function p(cls, text) {
  const e = document.createElement("p");
  if (cls) e.className = cls;
  e.textContent = text;
  return e;
}

/** Una línea por fuente, alineada en la columna 15 (la página es monoespaciada). */
function row(label, v) {
  const s = (v > 0 ? "+" : "") + v;
  return label + " ".repeat(Math.max(1, 15 - label.length - s.length)) + s;
}

/** El desglose del puntaje. Sin early, es lo que llevás cuando perdés. */
function breakdown(early) {
  const rows = [row("Esquives", run.pd), row("Peatones", run.pc)];
  if (early) {
    rows.push(row("Antes " + deadlineOf(run), run.pt), row("Moto entera", run.pm));
  }
  if (run.ph) rows.push(row("Choques", -run.ph));
  return rows.join("\n");
}

function clearPanel() {
  panel.replaceChildren();
}

function showStart() {
  mode = "start";
  clearPanel();
  const L = run.level;
  panel.append(
    p("", "Desde " + run.origin.name + " hasta " + run.level.dest + ". Llegá antes de las " + deadlineOf(run) + "."),
    p("bd", row("Esquivar", L.dodgePoint) + "\n" + row("Peatón", L.crossBonus) + "\n" + row("Chocar", -L.hitPenalty)),
    p("", "Salís a las 5:00 y el tráfico va subiendo. Llegá antes de las 8:00."),
    p("", "Llegar antes y con el tanque entero suma más."),
    p("", "Récord: " + save.best + " puntos"),
    btn("JUGAR", startPlay),
    p("hint", "Flechas o A D · Espacio acelera · S frena · Esc pausa. En el teléfono, deslizá.")
  );
  tag.textContent = run.level.name + " · Desde " + run.origin.name + " → " + run.level.dest;
  setJoke("Llegar es ganar. Frená para dejar pasar al peatón.");
  pauseBtn.hidden = true;
  fit();
}

function startPlay() {
  unlock();
  sfx("start");
  resetMusic();
  resetHumor();
  clearFx();
  run = createRun(run.seed, LEVELS[0]);
  targetLane = 1;
  boostPulse = false;
  brakePulse = false;
  acc = 0;
  jokeLock = 0;
  mode = "play";
  clearPanel();
  pauseBtn.hidden = false;
  pauseBtn.textContent = "PAUSA";
  setJoke("");
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  fit();
}

function showPause() {
  if (mode !== "play" && mode !== "pause") return;
  mode = "pause";
  clearPanel();
  const h = document.createElement("h2");
  h.textContent = "Pausa";
  const row = document.createElement("div");
  row.className = "row";
  row.append(btn("SEGUIR", resume), btn("OTRA VEZ", again, true));
  panel.append(h, row);
  setJoke("El tráfico espera. Más o menos.");
  pauseBtn.textContent = "SEGUIR";
  fit();
}

function resume() {
  if (mode !== "pause") return;
  mode = "play";
  clearPanel();
  pauseBtn.textContent = "PAUSA";
  setJoke("");
  acc = 0;
  last = 0;
  fit();
}

function togglePause() {
  if (mode === "play") showPause();
  else if (mode === "pause") resume();
}

function commitScore() {
  const s = Math.floor(run.score);
  const beat = s > save.best;
  if (beat) {
    save.best = s;
    writeSave();
  }
  return beat;
}

function endButtons() {
  const row = document.createElement("div");
  row.className = "row";
  row.append(btn("OTRA VEZ", again), btn("RETAR A UN CUATE", () => challenge(), true));
  return row;
}

function showWin(ev) {
  mode = "win";
  const beat = commitScore();
  sfx("win");
  clearPanel();
  const h = document.createElement("h2");
  h.textContent = "Llegaste a " + run.level.dest + " a las " + clockOf(run);
  panel.append(
    h,
    p("bd", breakdown(ev.early)),
    p("total", run.score + " PUNTOS"),
    p("rank", rankOf(run.score)),
    p("hint", beat ? "¡Nuevo récord!" : "Récord: " + save.best + " puntos"),
    endButtons()
  );
  say("win");
  pauseBtn.hidden = true;
  fit();
}

function showLose() {
  mode = "lose";
  const beat = commitScore();
  sfx("lose");
  clearPanel();
  const h = document.createElement("h2");
  h.textContent = "No llegaste";
  panel.append(
    h,
    p("", run.reason === "time"
      ? "Se hizo la hora y " + run.level.dest + " sigue lejos."
      : LOSE[run.reason] || "El tráfico pudo más."),
    p("bd", breakdown(0)),
    p("total", run.score + " PUNTOS"),
    p("hint", (beat ? "¡Nuevo récord! " : "") + "Récord: " + save.best + " puntos"),
    endButtons()
  );
  say(run.reason === "energy" ? "energia" : "tiempo", true);
  pauseBtn.hidden = true;
  fit();
}

function again() {
  unlock();
  run = createRun(run.seed, LEVELS[0]);
  startPlay();
}

async function challenge() {
  const url = location.href;
  const text =
    mode === "win"
      ? "Llegué a " + run.level.dest + " a las " + clockOf(run) + " con " + run.score + " puntos: " + rankOf(run.score) + ". ¿Me ganás?"
      : "No llegué a " + run.level.dest + ". Sumé " + run.score + " puntos saliendo desde mi casa. ¿Vos sí podés?";
  const data = { title: "Chapinvilla", text, url };
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  const full = text + " " + url;
  try {
    await navigator.clipboard.writeText(full);
    setJoke("Copiado. Mandáselo a tu cuate.");
    return;
  } catch {
    /* el navegador no prestó el portapapeles */
  }
  const ta = document.createElement("textarea");
  ta.value = full;
  ta.setAttribute("readonly", "");
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  setJoke(ok ? "Copiado. Mandáselo a tu cuate." : full);
}

function handle(events) {
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.k === "hit") {
      sfx("hit");
      punch();
      burst(laneX(ev.lane), worldY(run.z, ev.z), 3, 7);
      pop(laneX(ev.lane), worldY(run.z, ev.z) - 12, "-" + ev.n, 3);
      const key = ev.id === "peaton" ? "peaton-hit" : ev.id;
      if (!teach(key, HIT[ev.id])) say(ev.id);
    } else if (ev.k === "pick") {
      sfx(ev.id);
      burst(laneX(ev.lane), worldY(run.z, ev.z), 5, 5);
      if (!teach(ev.id, FIRST[ev.id])) say(ev.id);
    } else if (ev.k === "seen") teach(ev.id, SEE[ev.id] || HIT[ev.id]);
    else if (ev.k === "dodge") {
      pop(laneX(ev.lane), worldY(run.z, ev.z) - 12, "+" + ev.n, 2);
    } else if (ev.k === "yield") {
      sfx("bonus");
      burst(laneX(ev.lane), worldY(run.z, ev.z), 2, 6);
      pop(laneX(ev.lane), worldY(run.z, ev.z) - 12, "+" + ev.n, 2);
      if (!teach("yield", "Dejaste pasar al peatón. +" + ev.n + " puntos.")) {
        setJoke("+" + ev.n + " por dejarlo pasar.");
        jokeLock = nowT + 1.2;
      }
    }
    else if (ev.k === "block") say("camioneta");
    else if (ev.k === "luck") say("suerte");
    else if (ev.k === "boss") say("boss");
    else if (ev.k === "need") say("turbo");
    else if (ev.k === "low") say("energia");
    else if (ev.k === "time") say("tiempo");
    else if (ev.k === "boost") {
      sfx("boost");
      burst(laneX(run.lane), PY + 10, 2, 4);
    } else if (ev.k === "win") showWin(ev);
    else if (ev.k === "lose") showLose();
  }
}

function consume() {
  const input = { target: targetLane, boost: boostPulse, brake: brakePulse };
  boostPulse = false;
  brakePulse = false;
  return input;
}

function hud() {
  fillE.style.width = Math.max(0, Math.min(100, run.energy)) + "%";
  fillS.style.width = Math.max(0, Math.min(100, run.stress)) + "%";
  const left = Math.max(0, 1 - run.t / run.level.timeLimit);
  fillT.style.width = left * 100 + "%";
  clockEl.textContent = clockOf(run);
  qEl.textContent = String(run.score | 0);
  fillB.style.width = Math.min(100, run.turbo) + "%";
  boostBtn.classList.toggle("ready", run.turbo >= run.level.turboCost);
  barS.classList.toggle("hot", run.stress >= 76);
}

function frame(ts) {
  requestAnimationFrame(frame);
  if (!last) last = ts;
  let dt = (ts - last) / 1000;
  last = ts;
  if (dt > 0.25) dt = 0.25;
  nowT += dt;
  if (mode === "start") {
    deco += dt * 48;
    if (run && deco > run.finish + 120) deco = 0;
  }
  if (document.hidden && mode === "play") showPause();
  if (mode === "play") {
    acc += dt;
    if (acc > STEP * 5) acc = STEP * 5;
    let guard = 0;
    while (acc >= STEP && mode === "play" && guard++ < 6) {
      const events = step(run, consume(), STEP);
      acc -= STEP;
      handle(events);
    }
    pumpTeach();
  }
  render(ctx, run, dt, mode, deco);
  hud();
  follow(run, mode === "play");
}

function boot() {
  ctx.imageSmoothingEnabled = false;
  let seed = seedFromQuery(location.search);
  if (seed == null) {
    seed = (Math.random() * 1e9) >>> 0;
    try {
      history.replaceState(null, "", "?viaje=" + seed);
    } catch {
      /* el link igual se arma al compartir si el historial no deja */
    }
  }
  run = createRun(seed, LEVELS[0]);
  setMuted(save.mute);
  paintMute();
  showStart();
  armAudio();
  requestAnimationFrame(frame);
}

function paintMute() {
  muteBtn.textContent = save.mute ? "EN MUDO" : "CON SONIDO";
  muteBtn.setAttribute("aria-pressed", save.mute ? "true" : "false");
}

function armAudio() {
  const go = () => {
    unlock();
    removeEventListener("pointerdown", go, true);
    removeEventListener("touchstart", go, true);
    removeEventListener("keydown", go, true);
  };
  addEventListener("pointerdown", go, true);
  addEventListener("touchstart", go, true);
  addEventListener("keydown", go, true);
}

muteBtn.addEventListener("click", () => {
  unlock();
  save.mute = !save.mute;
  setMuted(save.mute);
  paintMute();
  writeSave();
});

pauseBtn.addEventListener("click", () => {
  unlock();
  togglePause();
});

document.getElementById("bL").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  targetLane = Math.max(0, targetLane - 1);
});
document.getElementById("bR").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  targetLane = Math.min(2, targetLane + 1);
});
document.getElementById("bA").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (mode === "start") startPlay();
  else boostPulse = true;
});

let px = 0;
let py = 0;
canvas.addEventListener("pointerdown", (e) => {
  px = e.clientX;
  py = e.clientY;
});
canvas.addEventListener("pointerup", (e) => {
  const dx = e.clientX - px;
  const dy = e.clientY - py;
  if (mode === "start") return;
  if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
    targetLane = Math.max(0, Math.min(2, targetLane + (dx > 0 ? 1 : -1)));
  } else if (dy < -32) boostPulse = true;
  else if (dy > 32) brakePulse = true;
});

addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  const move = k === "arrowleft" || k === "arrowright" || k === "arrowup" || k === "arrowdown" || k === "a" || k === "d" || k === "w" || k === "s" || e.key === " ";
  if (move || e.key === "Escape") e.preventDefault();
  if (e.repeat) return;
  if (k === "arrowleft" || k === "a") targetLane = Math.max(0, targetLane - 1);
  else if (k === "arrowright" || k === "d") targetLane = Math.min(2, targetLane + 1);
  else if (k === " " || k === "arrowup" || k === "w") {
    if (mode === "start") startPlay();
    else boostPulse = true;
  } else if (k === "arrowdown" || k === "s") brakePulse = true;
  else if (e.key === "Escape") togglePause();
});

addEventListener("resize", fit);
boot();
