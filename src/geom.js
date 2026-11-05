export const W = 320;
export const H = 180;
export const ROAD_X = 106;
export const LANE_W = 36;
export const ROAD_W = 108;
export const PY = 142;

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function laneX(lane) {
  return ROAD_X + (lane + 0.5) * LANE_W;
}

export function worldY(viewZ, z) {
  return PY - (z - viewZ);
}

/** Lane the sprite currently occupies. Slides only for vehicles with laneTo. */
export function laneAt(e, pz) {
  if (e.laneTo == null) return e.lane;
  const dist = e.z - pz;
  const t = clamp((150 - dist) / 110, 0, 1);
  return e.lane + (e.laneTo - e.lane) * t;
}

export function occupied(lane) {
  return clamp(Math.round(lane), 0, 2);
}
