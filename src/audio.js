const MASTER = 0.9;
const SILENT =
  "data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

let ac = null;
let master = null;
let engine = null;
let engineGain = null;
let noiseBuf = null;
let muted = false;
let lastStep = -1;
let kickEl = null;
let kicked = false;

function ensureKick() {
  if (kickEl || typeof document === "undefined" || !document.body) return;
  kickEl = document.createElement("audio");
  kickEl.setAttribute("playsinline", "");
  kickEl.preload = "auto";
  kickEl.src = SILENT;
  kickEl.style.cssText = "position:fixed;width:0;height:0;opacity:0";
  document.body.appendChild(kickEl);
}

ensureKick();

function kickHtml() {
  if (kicked) return;
  ensureKick();
  if (!kickEl) return;
  const p = kickEl.play();
  if (p && p.then) {
    p.then(() => {
      kicked = true;
    }).catch(() => {});
  } else kicked = true;
}

function tone(freq, dur, type, gain, slide) {
  if (!ac) return;
  const t0 = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise() {
  if (!ac || !noiseBuf) return;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const g = ac.createGain();
  const f = ac.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 180;
  g.gain.value = 0.24;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

export function unlock() {
  kickHtml();
  if (!ac) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = muted ? 0 : MASTER;
    master.connect(ac.destination);
    engine = ac.createOscillator();
    engine.type = "sawtooth";
    engine.frequency.value = 52;
    engineGain = ac.createGain();
    engineGain.gain.value = 0;
    engine.connect(engineGain);
    engineGain.connect(master);
    engine.start();
    const n = ac.createBuffer(1, (ac.sampleRate * 0.25) | 0, ac.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    noiseBuf = n;
  }
  if (ac.state === "suspended") ac.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : MASTER;
}

export function resetMusic() {
  lastStep = -1;
}

export function sfx(kind) {
  if (!ac || muted) return;
  if (kind === "hit") noise();
  // Un solo sonido para los tres objetos: cambia el objeto, no el gesto de agarrar.
  else if (kind === "cafe" || kind === "tamal" || kind === "gasolina") {
    tone(523, 0.08, "square", 0.08);
    tone(784, 0.12, "square", 0.07);
  } else if (kind === "bonus") {
    tone(880, 0.06, "square", 0.08);
    tone(1320, 0.1, "square", 0.07);
  } else if (kind === "boost") tone(160, 0.18, "sawtooth", 0.07, 420);
  else if (kind === "start") tone(392, 0.1, "square", 0.09, 523);
  else if (kind === "win") {
    tone(523, 0.1, "square", 0.08);
    tone(659, 0.12, "square", 0.08);
    tone(784, 0.22, "square", 0.08);
  } else if (kind === "lose") tone(130, 0.32, "sawtooth", 0.08, 70);
}

const MEL = [0, 3, 7, 10, 7, 3, 5, 7];
const BASS = [0, 0, 3, 3, 5, 5, 7, 10];

export function follow(run, playing) {
  if (!ac) return;
  const go = playing && run && run.alive && !run.won && !muted;
  if (engineGain) engineGain.gain.value = go ? 0.05 : 0;
  if (engine && run) {
    engine.frequency.value = 46 + run.spd * 0.22 + (run.boost > 0 ? 28 : 0);
  }
  if (!go || !run) return;
  const rate = 1 + (run.stress / 100) * 0.85;
  const step = Math.floor((run.t * rate) / 0.18);
  if (step === lastStep) return;
  lastStep = step;
  const note = MEL[step % MEL.length];
  tone(220 * 2 ** (note / 12), 0.14, "square", 0.06);
  if (step % 2 === 0) {
    const b = BASS[step % BASS.length];
    tone(110 * 2 ** (b / 12), 0.16, "triangle", 0.055);
  }
}
