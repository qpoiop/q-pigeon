/**
 * Squad coordination for guards — pure geometry, no THREE, no state. Turns a
 * single alarm into believable group behaviour: searchers fan out to sweep
 * different parts of the area instead of clumping on one point, and multiple
 * pursuers flank rather than stack on the player's exact position.
 *
 * These only choose a *goal position*; the engine still handles pathing
 * (guardWaypoint/A*) and detection. Callers pass slot/count so the assignment
 * is deterministic and stable frame to frame.
 */
export interface Pt {
  x: number;
  z: number;
}

/**
 * Distinct search target for the `slot`-th of `count` searching guards, spread
 * on a ring around the alarm centre so the group sweeps the whole area.
 * A lone searcher just heads to the centre.
 */
export function searchPoint(cx: number, cz: number, slot: number, count: number, radius = 6): Pt {
  if (count <= 1) return { x: cx, z: cz };
  const ang = (slot / count) * Math.PI * 2;
  // alternate inner/outer ring so points don't sit on one circle
  const r = radius * (slot % 2 === 0 ? 1 : 0.55);
  return { x: cx + Math.sin(ang) * r, z: cz + Math.cos(ang) * r };
}

/**
 * Pursuit target for the `slot`-th of `count` chasing guards. Slot 0 (assign it
 * to the nearest guard) pursues the player directly; the rest aim slightly
 * ahead of the player and off to alternating sides to cut off escape routes.
 * `(vx,vz)` is the player's approximate velocity for the lead.
 */
export function flankPoint(
  px: number,
  pz: number,
  vx: number,
  vz: number,
  slot: number,
  count: number,
): Pt {
  if (slot <= 0 || count <= 1) return { x: px, z: pz };
  const lead = 0.8;
  const ax = px + vx * lead;
  const az = pz + vz * lead;
  const dl = Math.hypot(vx, vz);
  if (dl < 1e-3) return { x: ax, z: az }; // player still → no meaningful side
  const dirx = vx / dl;
  const dirz = vz / dl;
  const perpx = -dirz;
  const perpz = dirx;
  const side = slot % 2 === 1 ? 1 : -1;
  const mag = 3 + Math.floor((slot - 1) / 2) * 2; // 3, 3, 5, 5, …
  return { x: ax + perpx * side * mag, z: az + perpz * side * mag };
}
