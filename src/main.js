import { follow, resetMusic, setMuted, sfx, unlock } from "./audio.js";
import { PY, laneX, worldY } from "./geom.js";
import { lineFor, resetHumor } from "./humor.js";
import { burst, clearFx, punch, render } from "./render.js";
import {
  LEVELS,
  clockOf,
  createRun,
  deadlineOf,
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
const barS = document.getElementById("barS");
const muteBtn = document.getElementById("mute");
const pauseBtn = document.getElementById("pause");

const KEY = "chapinvilla.v1";
const STEP = 1 / 60;
const LOSE = {
  energy: "La moto se quedó sin café.",
};
const FIRST = {
  cafe: "Café: subió la energía.",
  tamal: "Tamal: bajó el estrés y dio energía. Con el estrés alto se gasta más.",
  quetzal: "Quetzales: suman al puntaje. No deciden si llegás.",
};
const HIT = {
  camioneta: "Camioneta: baja energía y sube estrés.",
  motorista: "Motorista: baja energía y sube estrés.",
  hoyo: "Hoyo: baja energía y sube mucho el estrés.",
  cambia: "Se mete a tu carril: baja energía y sube estrés.",
  bus: "Bus: tapa dos carriles, baja energía y sube estrés.",
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
  let chrome = 24;
  const kids = document.getElementById("app").children;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i] !== canvas) chrome += kids[i].offsetHeight + 8;
  }
  const s = Math.max(
    1,
    Math.min(
      Math.floor((innerWidth - 20) / 320),
      Math.floor((innerHeight - chrome) / 180),
    ),
  );
  const px = 320 * s;
  canvas.style.width = px + "px";
  canvas.style.height = 180 * s + "px";
  document.getElementById("app").style.setProperty("--w", px + 8 + "px");
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

function clearPanel() {
  panel.replaceChildren();
}

function showStart() {
  mode = "start";
  clearPanel();
  const goal = document.createElement("p");
  goal.textContent =
    "Desde " + run.origin.name + " hasta " + run.level.dest +
    ". Llegá antes de las " + deadlineOf(run) + ".";
  const rec = document.createElement("p");
  rec.textContent = "Récord: Q" + save.best;
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "Flechas o A D · Espacio acelera · S frena · Esc pausa. En el teléfono, deslizá.";
  panel.append(goal, rec, btn("JUGAR", startPlay), hint);
  tag.textContent = run.level.name + " · Desde " + run.origin.name + " → " + run.level.dest;
  setJoke("Llegar es ganar. Los Q son el puntaje.");
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
  const q = Math.floor(run.q);
  const beat = q > save.best;
  if (beat) {
    save.best = q;
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

function showWin() {
  mode = "win";
  const beat = commitScore();
  sfx("win");
  clearPanel();
  const h = document.createElement("h2");
  h.textContent = "Llegaste a " + run.level.dest + " a las " + clockOf(run);
  const sub = document.createElement("p");
  sub.textContent = "Puntaje Q" + Math.floor(run.q) + ". Llegar es ganar; los Q son el reto.";
  const rec = document.createElement("p");
  rec.textContent = beat ? "¡Nuevo récord!" : "Récord: Q" + save.best;
  panel.append(h, sub, rec, endButtons());
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
  const sub = document.createElement("p");
  sub.textContent =
    run.reason === "time"
      ? "Se hizo la hora y " + run.level.dest + " sigue lejos."
      : LOSE[run.reason] || "El tráfico pudo más.";
  const rec = document.createElement("p");
  rec.textContent = (beat ? "¡Nuevo récord! " : "") + "Puntaje Q" + Math.floor(run.q) + " · récord Q" + save.best;
  panel.append(h, sub, rec, endButtons());
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
      ? "Llegué a " + run.level.dest + " a las " + clockOf(run) + ". Puntaje Q" + Math.floor(run.q) + ". ¿Llegás con más?"
      : "No llegué a " + run.level.dest + ". Puntaje Q" + Math.floor(run.q) + ". Salí desde mi casa. ¿Vos sí podés?";
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
      if (!teach(ev.id, HIT[ev.id])) say(ev.id);
    } else if (ev.k === "pick") {
      sfx(ev.id);
      burst(laneX(ev.lane), worldY(run.z, ev.z), ev.id === "quetzal" ? 2 : 5, 5);
      if (!teach(ev.id, FIRST[ev.id])) say(ev.id);
    } else if (ev.k === "seen") teach(ev.id, HIT[ev.id]);
    else if (ev.k === "block") say("camioneta");
    else if (ev.k === "luck") say("suerte");
    else if (ev.k === "boss") say("boss");
    else if (ev.k === "need" || ev.k === "low") say("energia");
    else if (ev.k === "time") say("tiempo");
    else if (ev.k === "boost") {
      sfx("boost");
      burst(laneX(run.lane), PY + 10, 2, 4);
    } else if (ev.k === "win") showWin();
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
  qEl.textContent = "Q" + Math.floor(run.q);
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
