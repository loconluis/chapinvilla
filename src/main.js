import { follow, setMuted, sfx, unlock } from "./audio.js";
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
  lot: "Se acabó la hilera y no te metiste. Frená en el espacio libre.",
};
const FIRST = {
  gasolina: "Gasolina: llena el tanque. Sin esto no arranca.",
  cafe: "Café: te da velocidad. Llegar antes vale más.",
  tamal: "Tamal: baja el estrés, y el estrés chupa el tanque.",
};
const SEE = {
  peaton: "Peatón en el paso. Frená en su carril: deja pasar y da puntos.",
  libre: PARK,
};
const PARK = "Espacio libre. Ponte en ese carril y frená para entrar.";
const BOOST = "Turbo lleno. Esquivar lo recarga: ACELERA cuando esté listo.";
const HIT = {
  hoyo: "baja energía y sube mucho el estrés",
  cambia: "se mete a tu carril; baja energía y sube estrés",
  bus: "tapa dos carriles; baja energía y sube estrés",
  peaton: "lo atropellaste. Sin puntos; baja energía y sube estrés",
};
/** El aviso sale del id: "Auto: baja energía y sube estrés." */
const hitText = (id) => id[0].toUpperCase() + id.slice(1) + ": " + (HIT[id] || "baja energía y sube estrés") + ".";
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
    // los guardados viejos tenían un solo número: era el del nivel 1
    return { best: typeof s.best === "number" ? { 1: s.best | 0 } : s.best || {}, mute: s.mute === true };
  } catch {
    return { best: {}, mute: false };
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
    const sw = (innerWidth - 8) / 480;
    const sh = (innerHeight - used) / 270;
    let s = Math.min(sw, sh);
    if (s >= 2) s = Math.floor(s);
    else s = Math.max(s, Math.min(sw, 1.8));
    if (s < 1) s = 1;
    const px = Math.round(480 * s);
    canvas.style.width = px + "px";
    canvas.style.height = Math.round(270 * s) + "px";
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

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = text;
  return e;
}

/** Fila de botones. */
function bar(...b) {
  const d = el("div", "row");
  d.append(...b);
  return d;
}

/** Todas las pantallas son lo mismo: título opcional, líneas y una fila de botones. */
function screen(title, lines, buttons) {
  clearPanel();
  if (title) panel.append(el("h2", null, title));
  for (const [c, t] of lines) panel.append(el("p", c, t));
  if (buttons) panel.append(buttons);
  openPanel();
  fit();
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
  if (panel.open) panel.close();
  panel.replaceChildren();
}

function openPanel() {
  if (!panel.open) panel.showModal();
}

function showStart() {
  mode = "start";
  const L = run.level;
  tag.textContent = L.name + " · Desde " + run.origin.name + " → " + L.dest;
  setJoke("Llegar es ganar. Frená para dejar pasar al peatón.");
  pauseBtn.hidden = true;
  screen(null, [
    ["", "Desde " + run.origin.name + " hasta " + L.dest + ". Llegá antes de las " + deadlineOf(run) + "."],
    ["bd", row("Esquivar", L.dodgePoint) + "\n" + row("Peatón", L.crossBonus) + "\n" + row("Chocar", -L.hitPenalty)],
    ["", "Llegar antes y con el tanque entero suma más."],
    ["", "Récord: " + bestOf(run.level) + " puntos"],
    ["hint", "Flechas o A D · Espacio acelera · S frena · Esc pausa."],
  ], btn("JUGAR", () => startPlay(LEVELS.indexOf(run.level))));
}

function startPlay(i = 0, arrived) {
  unlock();
  sfx("start");
  resetHumor();
  clearFx();
  run = createRun(run.seed, LEVELS[i], arrived);
  targetLane = 1;
  boostPulse = false;
  brakePulse = false;
  acc = 0;
  jokeLock = 0;
  mode = "play";
  tag.textContent = run.level.name + " · Desde " + run.origin.name + " → " + run.level.dest;
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
  setJoke("El tráfico espera. Más o menos.");
  pauseBtn.textContent = "SEGUIR";
  screen("Pausa", [], bar(btn("SEGUIR", resume), btn("OTRA VEZ", again, true)));
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

function bestOf(level) {
  return save.best[level.id] || 0;
}

function commitScore() {
  const s = Math.floor(run.score);
  const beat = s > bestOf(run.level);
  if (beat) {
    save.best[run.level.id] = s;
    writeSave();
  }
  return beat;
}

/** La hora a la que llegaste: con eso se decide qué tan lleno está el parqueo. */
function arrival() {
  return run.origin.depart + Math.floor(run.t);
}

function showWin(ev) {
  mode = "win";
  const beat = commitScore();
  sfx("win");
  say("win");
  pauseBtn.hidden = true;
  screen("Llegaste a " + run.level.dest + " a las " + clockOf(run), [
    ["bd", breakdown(ev.early)],
    ["total", run.score + " PUNTOS"],
    ["rank", rankOf(run.score)],
    ["hint", beat ? "¡Nuevo récord!" : "Récord: " + bestOf(run.level) + " puntos"],
  ], bar(
    run.level.id < LEVELS.length
      ? btn("AL PARQUEO", () => startPlay(run.level.id, arrival()))
      : btn("OTRA VEZ", again),
    btn("RETAR A UN CUATE", () => challenge(), true)
  ));
}

function showLose() {
  mode = "lose";
  const beat = commitScore();
  sfx("lose");
  say(run.reason === "energy" ? "energia" : "tiempo", true);
  pauseBtn.hidden = true;
  screen("No llegaste", [
    ["", run.reason === "time"
      ? "Se hizo la hora y " + run.level.dest + " sigue lejos."
      : LOSE[run.reason] || "El tráfico pudo más."],
    ["bd", breakdown(0)],
    ["total", run.score + " PUNTOS"],
    ["hint", (beat ? "¡Nuevo récord! " : "") + "Récord: " + bestOf(run.level) + " puntos"],
  ], bar(btn("OTRA VEZ", again), btn("RETAR A UN CUATE", () => challenge(), true)));
}

function again() {
  const level = run.level;
  unlock();
  run = createRun(run.seed, level);
  startPlay(LEVELS.indexOf(level));
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
    setJoke(full);
  }
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
      if (!teach(key, hitText(ev.id))) say(ev.id);
    } else if (ev.k === "pick") {
      sfx(ev.id);
      burst(laneX(ev.lane), worldY(run.z, ev.z), 5, 5);
      if (!teach(ev.id, FIRST[ev.id])) say(ev.id);
    } else if (ev.k === "seen") teach(ev.id, SEE[ev.id] || hitText(ev.id));
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
  const left = Math.max(0, 1 - run.t / run.limit);
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
  muteBtn.textContent = save.mute ? "MUDO" : "SONIDO";
  muteBtn.classList.toggle("off", save.mute);
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
document.getElementById("bB").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  brakePulse = true;
});
document.getElementById("info").addEventListener("click", () => {
  if (mode === "play" || mode === "pause") showStart();
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
