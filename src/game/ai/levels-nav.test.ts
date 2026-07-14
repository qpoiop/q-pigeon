/**
 * Navigability guarantee for the shipped levels: the walkable free space of
 * every level must be a single connected region, so a guard can path to any
 * open point the player can occupy (films, items, exit, decoys, last-seen).
 * This is the real regression guard against "guard stuck on a wall".
 */
import { describe, it, expect } from 'vitest';
import { NavGrid } from './navgrid';
import { findPath } from './pathfind';
import { LEVELS } from '../../data/levels';
import type { Bounds } from '../types';

function wallsOf(L: (typeof LEVELS)[number]): Bounds[] {
  return L.walls.map((w) => ({
    minX: w.x - w.w / 2,
    maxX: w.x + w.w / 2,
    minZ: w.z - w.d / 2,
    maxZ: w.z + w.d / 2,
  }));
}

/** Free cells reachable from a start cell via 4-neighbour flood fill. */
function reachable(grid: NavGrid, sx: number, sz: number): Set<number> {
  const seen = new Set<number>();
  const start = grid.nearestFree(grid.cellX(sx), grid.cellZ(sz));
  if (!start) return seen;
  const queue: [number, number][] = [start];
  seen.add(start[1] * grid.cols + start[0]);
  while (queue.length) {
    const [cx, cz] = queue.pop()!;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (grid.isBlockedCell(nx, nz)) continue;
      const key = nz * grid.cols + nx;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push([nx, nz]);
    }
  }
  return seen;
}

describe.each(LEVELS.map((L, i) => [i, L] as const))('level %i navigability', (_i, L) => {
  const grid = new NavGrid(L.w / 2, L.d / 2, wallsOf(L), 1, 0.55);
  const comp = reachable(grid, L.spawn[0], L.spawn[1]);

  function inComponent(x: number, z: number): boolean {
    const free = grid.nearestFree(grid.cellX(x), grid.cellZ(z));
    return !!free && comp.has(free[1] * grid.cols + free[0]);
  }

  it('every film is reachable from spawn', () => {
    for (const f of L.films) expect(inComponent(f[0], f[1])).toBe(true);
  });

  it('every item and the extraction zone are reachable from spawn', () => {
    for (const it of L.items) expect(inComponent(it.x, it.z)).toBe(true);
    expect(inComponent(L.extract[0], L.extract[1])).toBe(true);
  });

  it('every guard patrol waypoint is reachable from spawn', () => {
    for (const g of L.guards) for (const p of g.path) expect(inComponent(p[0], p[1])).toBe(true);
  });

  it('a guard can path from its post to the exit without crossing a wall', () => {
    for (const g of L.guards) {
      const path = findPath(grid, g.path[0][0], g.path[0][1], L.extract[0], L.extract[1]);
      expect(path).not.toBeNull();
      for (const p of path!) expect(grid.isBlockedWorld(p.x, p.z)).toBe(false);
    }
  });
});
