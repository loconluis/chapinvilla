import { LINES } from "./data.js";

let last = "";
const idx = {};

export function resetHumor() {
  last = "";
  for (const k of Object.keys(idx)) delete idx[k];
}

/** Next line for an event. Never returns the same string twice in a row. */
export function lineFor(key) {
  const pool = LINES[key];
  if (!pool || !pool.length) return "";
  let i = idx[key] || 0;
  let s = pool[i % pool.length];
  let guard = 0;
  while (s === last && guard++ < pool.length) {
    i++;
    s = pool[i % pool.length];
  }
  idx[key] = i + 1;
  if (s === last) return "";
  last = s;
  return s;
}
