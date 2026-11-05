import { PAL, SPRITES } from "./data.js";
import { H, LANE_PX, PY, ROAD_PX, ROAD_WPX, W, Z, laneAt, laneX, worldY } from "./geom.js";

const SCALE = 2;

function hash(n) {
  n = Math.imul((n ^ 0x9e3779b9) | 0, 0x85ebca6b);
  return (n ^ (n >>> 13)) >>> 0;
}

function blit(ctx, spr, cx, cy, shadow) {
  const h = spr.length;
  const w = spr[0].length;
  const x0 = Math.round(cx - (w * SCALE) / 2);
  const y0 = Math.round(cy - (h * SCALE) / 2);
  if (shadow) {
    ctx.fillStyle = PAL[0];
    ctx.fillRect(x0 + 6, y0 + h * SCALE - 4, w * SCALE - 12, 4);
  }
  let style = "";
  for (let r = 0; r < h; r++) {
    const row = spr[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row.charCodeAt(c);
      if (ch === 46) continue;
      const col = PAL[ch - 48];
      if (col !== style) {
        ctx.fillStyle = col;
        style = col;
      }
      ctx.fillRect(x0 + c * SCALE, y0 + r * SCALE, SCALE, SCALE);
    }
  }
  return { x0, y0, w: w * SCALE, h: h * SCALE };
}

const parts = [];
const floats = [];

/** Número que sube y se apaga. Feedback inmediato de cada punto. */
export function pop(x, y, txt, c) {
  if (floats.length > 14) floats.shift();
  floats.push({ x, y, txt, c, life: 0.75 });
}

function drawFloats(ctx, dt) {
  if (!floats.length) return;
  ctx.font = "700 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= dt;
    if (f.life <= 0) {
      floats.splice(i, 1);
      continue;
    }
    f.y -= dt * 30;
    ctx.fillStyle = PAL[f.c];
    ctx.fillText(f.txt, f.x | 0, f.y | 0);
  }
}

export function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    parts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 105,
      vy: (Math.random() - 0.5) * 105,
      life: 0.38,
      c: color,
    });
  }
}

export function clearFx() {
  parts.length = 0;
  floats.length = 0;
}

let shake = 0;
export function punch() {
  shake = 2.4;
}

function drawCity(ctx, z, seed) {
  const span = 63;
  for (let side = 0; side < 2; side++) {
    const base = Math.floor(z / span) - 1;
    for (let i = 0; i < 7; i++) {
      const idx = base + i;
      const wz = idx * span;
      const y = worldY(z, wz);
      if (y < -120 || y > H + 45) continue;
      const hsh = hash(idx * 17 + side * 131 + (seed & 255));
      const edge = side === 0 ? ROAD_PX - 18 : W - (ROAD_PX + ROAD_WPX + 18);
      const bw = 33 + (hsh % 42);
      const bh = 42 + (hsh % 60);
      const x = side === 0 ? 6 + (hsh % Math.max(1, edge - bw - 6)) : W - bw - 6 - (hsh % Math.max(1, edge - bw - 6));
      {
        const body = [4, 6, 5, 1][hsh % 4];
        ctx.fillStyle = PAL[body];
        ctx.fillRect(x, y - bh, bw, bh);
        ctx.fillStyle = PAL[body === 5 || body === 1 ? 6 : 2];
        for (let wy = y - bh + 6; wy < y - 9; wy += 12) {
          for (let wx = x + 4; wx < x + bw - 6; wx += 9) {
            if ((hsh + wx + wy) % 5 === 0) continue;
            ctx.fillRect(wx, wy, 4, 4);
          }
        }
      }
      if (hsh % 2 === 0) {
        const lx = side === 0 ? ROAD_PX - 24 : ROAD_PX + ROAD_WPX + 18;
        ctx.fillStyle = PAL[6];
        ctx.fillRect(lx, y - 27, 3, 27);
        ctx.fillStyle = PAL[2];
        ctx.fillRect(lx - 2, y - 30, 6, 4);
      }
    }
  }
}

function drawRoad(ctx, viewZ, park) {
  ctx.fillStyle = PAL[5];
  ctx.fillRect(ROAD_PX - 12, 0, 12, H);
  ctx.fillRect(ROAD_PX + ROAD_WPX, 0, 12, H);
  ctx.fillStyle = PAL[6];
  ctx.fillRect(ROAD_PX, 0, ROAD_WPX, H);
  ctx.fillStyle = PAL[2];
  ctx.fillRect(ROAD_PX, 0, 3, H);
  ctx.fillRect(ROAD_PX + ROAD_WPX - 3, 0, 3, H);
  ctx.fillStyle = PAL[5];
  const first = Math.floor((viewZ - 200) / 32) * 32;
  // En el parqueo las rayas son divisiones de espacios (perpendiculares);
  // en la calle son líneas de carril. Un bucle, dos lecturas.
  for (let dz = first; dz < viewZ + 40; dz += 32) {
    const y = worldY(viewZ, dz);
    if (y < -30 || y > H) continue;
    for (let l = park ? 0 : 1; l < 3; l++) {
      if (park) ctx.fillRect(ROAD_PX + LANE_PX * l + 3, y, LANE_PX - 6, 3);
      else ctx.fillRect(ROAD_PX + LANE_PX * l - 2, y, 3, 18);
    }
  }
}

function drawParts(ctx, dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      parts.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx.fillStyle = PAL[p.c];
    ctx.fillRect(p.x | 0, p.y | 0, 3, 3);
  }
}

const SPR = {
  camioneta: "camioneta",
  motorista: "motorista",
  hoyo: "hoyo",
  auto: "car",
  columna: "columna",
  cambia: "car",
  bus: "bus",
  gasolina: "gasolina",
  cafe: "cafe",
  tamal: "tamal",
  peaton: "peaton",
};

/** Lo que se agarra lleva marco: así se distingue de lo que te choca. */
function frame(ctx, b) {
  const x = b.x0 - 3;
  const y = b.y0 - 3;
  ctx.fillStyle = PAL[2];
  ctx.fillRect(x, y, b.w + 6, 2);
  ctx.fillRect(x, y + b.h + 4, b.w + 6, 2);
  ctx.fillRect(x, y, 2, b.h + 6);
  ctx.fillRect(x + b.w + 4, y, 2, b.h + 6);
}

/** Paso peatonal: sin las rayas, el peatón flota en medio del asfalto y no se entiende. */
function drawCrosswalks(ctx, run, viewZ) {
  ctx.fillStyle = PAL[5];
  for (let i = 0; i < run.ents.length; i++) {
    const e = run.ents[i];
    if (e.id !== "peaton" || e.dead) continue;
    const dz = e.z - viewZ;
    if (dz < -40 || dz > 140) continue;
    const y = worldY(viewZ, e.z);
    for (let s = 0; s < 5; s++) ctx.fillRect(ROAD_PX + 8, y - 24 + s * 10, ROAD_WPX - 16, 6);
  }
}

/** De las 5:00 a las 8:00 la luz pasa de azul de madrugada a sol de mañana. */
function drawDawn(ctx, run, mode) {
  if (mode !== "play" && mode !== "pause") return;
  const p = Math.min(1, run.t / run.level.timeLimit);
  ctx.fillStyle =
    "rgba(" + (16 + 26 * p | 0) + "," + (34 + 46 * p | 0) + "," + (74 - 26 * p | 0) + "," + (0.1 - 0.04 * p).toFixed(3) + ")";
  ctx.fillRect(0, 0, W, H);
}

export function render(ctx, run, dt, mode, deco) {
  shake = Math.max(0, shake - dt * 8);
  const stressAmp = run.stress > 50 ? ((run.stress - 50) / 50) * 1.5 : 0;
  const amp = stressAmp + shake;
  let sx = 0;
  let sy = 0;
  if (amp > 0.25 && mode === "play") {
    sx = Math.round(Math.sin(run.t * 57) * amp);
    sy = Math.round(Math.cos(run.t * 49) * amp * 0.6);
  }
  const viewZ = mode === "start" ? deco : run.z;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PAL[0];
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(sx, sy);
  drawCity(ctx, viewZ, run.seed);
  drawRoad(ctx, viewZ, run.level.park);
  drawCrosswalks(ctx, run, viewZ);

  const ents = run.ents;
  const list = [];
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i];
    if (e.dead && (e.pickup || e.id === "peaton")) continue;
    const y = worldY(viewZ, e.z);
    if (y < -90 || y > H + 70) continue;
    list.push(e);
  }
  list.sort((a, b) => b.z - a.z);
  let drewPlayer = false;
  const drawPlayer = () => {
    if (drewPlayer) return;
    drewPlayer = true;
    const blink = run.iframes > 0 && ((run.t * 16) | 0) % 2 === 0 && mode === "play";
    if (!blink) {
      const anim = mode === "start" ? deco * 0.08 : run.t;
      const frame = SPRITES.moto;
      const py = PY * Z + (mode === "start" ? Math.sin(deco * 0.05) * 1.5 : Math.cos(run.t * 22) * 1.2);
      blit(ctx, frame, laneX(mode === "play" || mode === "pause" ? run.lane : 1), py, true);
      if (run.boost > 0) {
        ctx.fillStyle = PAL[3];
        ctx.fillRect(laneX(run.lane) - 3, py + 24, 3, 9);
        ctx.fillStyle = PAL[2];
        ctx.fillRect(laneX(run.lane) + 2, py + 27, 3, 6);
      }
    }
  };
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!drewPlayer && e.z < viewZ) drawPlayer();
    const bob = e.pickup || e.id === "peaton" ? Math.sin(run.t * 5 + e.z) * 1.4 : 0;
    const x = laneX(laneAt(e, viewZ));
    const y = worldY(viewZ, e.z) + bob;
    const key = SPR[e.id];
    if (!key) continue;
    const box = blit(ctx, SPRITES[key], x, y, e.id !== "hoyo");
    if (e.pickup) frame(ctx, box);
    if (e.id === "cambia" && ((run.t * 8) | 0) % 2 === 0 && e.laneTo != null) {
      const dir = e.laneTo > e.lane ? 1 : -1;
      ctx.fillStyle = PAL[3];
      ctx.fillRect(x + dir * 18 - 2, y - 15, 5, 5);
    }
  }

  if (!drewPlayer) drawPlayer();

  const near = run.finish - viewZ;
  if (near < 145 && near > -30) {
    const gy = worldY(viewZ, run.finish);
    const park = run.level.park;
    // En el parqueo no hay meta: hay un espacio pintado en el piso.
    ctx.fillStyle = park ? PAL[5] : PAL[1];
    ctx.fillRect(ROAD_PX + 10, gy - 40, 6, 46);
    ctx.fillRect(ROAD_PX + ROAD_WPX - 16, gy - 40, 6, 46);
    ctx.fillStyle = park ? PAL[5] : PAL[2];
    ctx.fillRect(ROAD_PX + (park ? 10 : 0), gy + (park ? 4 : 0), ROAD_WPX - (park ? 20 : 0), 5);
    if (!park) {
      ctx.fillStyle = PAL[5];
      ctx.font = "700 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(run.level.dest, ROAD_PX + ROAD_WPX / 2, gy - 6);
    }
  }

  if (run.boost > 0 && mode === "play") {
    ctx.fillStyle = PAL[2];
    const o = (run.t * 220) % 36;
    for (let y = o; y < H; y += 36) {
      ctx.fillRect(ROAD_PX + 12, y, 3, 12);
      ctx.fillRect(ROAD_PX + ROAD_WPX - 15, y, 3, 12);
    }
  }

  drawParts(ctx, dt);
  drawFloats(ctx, dt);
  ctx.restore();
  drawDawn(ctx, run, mode);

  const prog = mode === "start" ? 0 : Math.max(0, Math.min(1, run.z / run.finish));
  ctx.fillStyle = PAL[6];
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = PAL[2];
  ctx.fillRect(0, H - 6, Math.round(W * prog), 6);
}
