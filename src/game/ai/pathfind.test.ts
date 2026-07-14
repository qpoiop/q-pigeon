import { describe, it, expect } from 'vitest';
import { NavGrid } from './navgrid';
import { findPath } from './pathfind';
import type { Bounds } from '../types';

function rect(x: number, z: number, w: number, d: number): Bounds {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 };
}

describe('NavGrid', () => {
  it('marks wall interiors as blocked and open space as free', () => {
    const g = new NavGrid(20, 20, [rect(0, 0, 4, 4)], 1, 0.5);
    expect(g.isBlockedWorld(0, 0)).toBe(true); // inside the wall
    expect(g.isBlockedWorld(10, 10)).toBe(false); // open
    expect(g.isBlockedCell(-5, -5)).toBe(true); // out of bounds reads blocked
  });

  it('keeps a clearance border around the arena edge', () => {
    const g = new NavGrid(20, 20, [], 1, 1.2);
    expect(g.isBlockedWorld(19.5, 0)).toBe(true); // within an agent radius of the edge
    expect(g.isBlockedWorld(0, 0)).toBe(false); // centre is open
  });

  it('nearestFree escapes a blocked cell', () => {
    const g = new NavGrid(20, 20, [rect(0, 0, 4, 4)], 1, 0.5);
    const free = g.nearestFree(g.cellX(0), g.cellZ(0));
    expect(free).not.toBeNull();
    expect(g.isBlockedCell(free![0], free![1])).toBe(false);
  });
});

describe('findPath', () => {
  it('returns a short straight path across open space', () => {
    const g = new NavGrid(30, 30, [], 1, 0.5);
    const path = findPath(g, -20, 0, 20, 0);
    expect(path).not.toBeNull();
    // open field → string-pull collapses to a single goal waypoint
    expect(path!.length).toBeLessThanOrEqual(2);
    const last = path![path!.length - 1];
    expect(last.x).toBeCloseTo(20, 5);
    expect(last.z).toBeCloseTo(0, 5);
  });

  it('routes around a wall through the gap instead of straight through it', () => {
    // A vertical wall at x=0 spanning z∈[-14,6] leaves a gap for z>6.
    const wall = rect(0, -4, 1.4, 20);
    const g = new NavGrid(30, 30, [wall], 1, 0.55);
    const path = findPath(g, -12, -4, 12, -4);
    expect(path).not.toBeNull();
    // must detour: more than a single straight segment
    expect(path!.length).toBeGreaterThan(1);
    // every waypoint must be walkable
    for (const p of path!) expect(g.isBlockedWorld(p.x, p.z)).toBe(false);
    // the detour has to reach up past the wall's top (z≈6) to get around it
    const maxZ = Math.max(...path!.map((p) => p.z));
    expect(maxZ).toBeGreaterThan(5);
    // ends at the goal
    const last = path![path!.length - 1];
    expect(last.x).toBeCloseTo(12, 5);
  });

  it('snaps a goal that lands inside a wall to a reachable free cell', () => {
    const g = new NavGrid(20, 20, [rect(0, 0, 4, 4)], 1, 0.5);
    const path = findPath(g, -10, 0, 0, 0); // goal is inside the wall
    expect(path).not.toBeNull();
    for (const p of path!) expect(g.isBlockedWorld(p.x, p.z)).toBe(false);
  });

  it('returns null when the goal is fully walled off', () => {
    // A closed box around the goal region.
    const walls: Bounds[] = [
      rect(10, 6, 12, 1.4),
      rect(10, -6, 12, 1.4),
      rect(4, 0, 1.4, 12),
      rect(16, 0, 1.4, 12),
    ];
    const g = new NavGrid(30, 30, walls, 1, 0.55);
    const path = findPath(g, -12, 0, 10, 0);
    expect(path).toBeNull();
  });
});
