/**
 * 8-directional A* over a NavGrid, with corner-cut prevention and a
 * line-of-sight string-pull pass so the returned path is a short list of
 * natural waypoints rather than a jagged per-cell staircase.
 *
 * Pure and THREE-free: inputs and outputs are plain world coordinates.
 */
import { NavGrid, type Vec2 } from './navgrid';

const SQRT2 = Math.SQRT2;
// 8 neighbours: 4 orthogonal first, then diagonals.
const NEIGHBORS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

/**
 * Find a walkable path from (sx,sz) to (gx,gz) in world space.
 * Returns an ordered list of world-space waypoints ending at the goal, or
 * null if no route exists. Start/goal that land in a wall snap to the nearest
 * free cell. The returned list excludes the start position.
 */
export function findPath(grid: NavGrid, sx: number, sz: number, gx: number, gz: number): Vec2[] | null {
  const start = grid.nearestFree(grid.cellX(sx), grid.cellZ(sz));
  const goal = grid.nearestFree(grid.cellX(gx), grid.cellZ(gz));
  if (!start || !goal) return null;
  const [scx, scz] = start;
  const [gcx, gcz] = goal;
  // If the goal fell inside a wall it was snapped; steer to the free cell
  // centre instead of the (blocked) exact goal so guards never path into a wall.
  const goalReachable = grid.cellX(gx) === gcx && grid.cellZ(gz) === gcz;
  const endX = goalReachable ? gx : grid.worldX(gcx);
  const endZ = goalReachable ? gz : grid.worldZ(gcz);
  if (scx === gcx && scz === gcz) return [{ x: endX, z: endZ }];

  const cols = grid.cols;
  const rows = grid.rows;
  const total = cols * rows;
  const g = new Float64Array(total).fill(Infinity);
  const f = new Float64Array(total).fill(Infinity);
  const came = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const startIdx = scz * cols + scx;
  const goalIdx = gcz * cols + gcx;

  const h = (cx: number, cz: number) => {
    const dx = Math.abs(cx - gcx);
    const dz = Math.abs(cz - gcz);
    // octile distance
    return Math.max(dx, dz) + (SQRT2 - 1) * Math.min(dx, dz);
  };

  g[startIdx] = 0;
  f[startIdx] = h(scx, scz);
  // Simple binary-less open set: linear scan is fine at these grid sizes and
  // avoids a heap dependency. Grids here are a few thousand cells.
  const open: number[] = [startIdx];

  while (open.length) {
    // pop lowest f
    let bestI = 0;
    for (let i = 1; i < open.length; i++) {
      if (f[open[i]] < f[open[bestI]]) bestI = i;
    }
    const current = open[bestI];
    if (current === goalIdx) break;
    open[bestI] = open[open.length - 1];
    open.pop();
    if (closed[current]) continue;
    closed[current] = 1;

    const ccx = current % cols;
    const ccz = (current - ccx) / cols;
    for (let n = 0; n < NEIGHBORS.length; n++) {
      const [dx, dz, cost] = NEIGHBORS[n];
      const nx = ccx + dx;
      const nz = ccz + dz;
      if (grid.isBlockedCell(nx, nz)) continue;
      // prevent cutting through a wall corner on a diagonal move
      if (dx !== 0 && dz !== 0) {
        if (grid.isBlockedCell(ccx + dx, ccz) || grid.isBlockedCell(ccx, ccz + dz)) continue;
      }
      const ni = nz * cols + nx;
      if (closed[ni]) continue;
      const tentative = g[current] + cost;
      if (tentative < g[ni]) {
        came[ni] = current;
        g[ni] = tentative;
        f[ni] = tentative + h(nx, nz);
        open.push(ni);
      }
    }
  }

  if (came[goalIdx] === -1 && goalIdx !== startIdx) return null;

  // reconstruct cell path (start -> goal)
  const cells: [number, number][] = [];
  let cur = goalIdx;
  while (cur !== -1) {
    const cx = cur % cols;
    const cz = (cur - cx) / cols;
    cells.push([cx, cz]);
    if (cur === startIdx) break;
    cur = came[cur];
  }
  cells.reverse();

  // string-pull: keep a waypoint only where line-of-sight to the next-next
  // cell is broken, collapsing straight runs into single segments.
  const kept: [number, number][] = [];
  let anchor = 0;
  kept.push(cells[anchor]);
  for (let i = 2; i < cells.length; i++) {
    const a = cells[anchor];
    const c = cells[i];
    if (!grid.cellLineClear(a[0], a[1], c[0], c[1])) {
      anchor = i - 1;
      kept.push(cells[anchor]);
    }
  }
  kept.push(cells[cells.length - 1]);

  // to world; pin the final waypoint to the (possibly snapped) goal position
  const out: Vec2[] = [];
  for (let i = 1; i < kept.length; i++) {
    out.push({ x: grid.worldX(kept[i][0]), z: grid.worldZ(kept[i][1]) });
  }
  if (out.length) out[out.length - 1] = { x: endX, z: endZ };
  else out.push({ x: endX, z: endZ });
  return out;
}
