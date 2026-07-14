import { describe, it, expect } from 'vitest';
import { searchPoint, flankPoint } from './squad';

describe('searchPoint', () => {
  it('a lone searcher heads to the alarm centre', () => {
    expect(searchPoint(5, -3, 0, 1)).toEqual({ x: 5, z: -3 });
  });

  it('spreads searchers to distinct points within the radius', () => {
    const n = 4;
    const pts = Array.from({ length: n }, (_, i) => searchPoint(0, 0, i, n, 6));
    // all distinct
    const keys = new Set(pts.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`));
    expect(keys.size).toBe(n);
    // within the ring radius
    for (const p of pts) expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(6 + 1e-9);
  });

  it('is centred on the alarm point', () => {
    const n = 3;
    const pts = Array.from({ length: n }, (_, i) => searchPoint(10, 20, i, n, 6));
    const mx = pts.reduce((s, p) => s + p.x, 0) / n;
    const mz = pts.reduce((s, p) => s + p.z, 0) / n;
    expect(mx).toBeGreaterThan(5); // roughly around (10,20)
    expect(mz).toBeGreaterThan(15);
  });
});

describe('flankPoint', () => {
  it('the primary pursuer targets the player directly', () => {
    expect(flankPoint(4, 4, 1, 0, 0, 3)).toEqual({ x: 4, z: 4 });
  });

  it('leads ahead of a moving player', () => {
    // player moving +x; a lone... use count>1 so lead applies to slot 0? slot 0 is direct.
    const p = flankPoint(0, 0, 2, 0, 1, 3); // slot 1 → lead + side
    expect(p.x).toBeGreaterThan(0); // ahead of the player along +x
  });

  it('sends flankers to opposite sides', () => {
    const a = flankPoint(0, 0, 0, 2, 1, 3); // moving +z
    const b = flankPoint(0, 0, 0, 2, 2, 3);
    // perpendicular to +z is ±x → opposite signs
    expect(Math.sign(a.x)).toBe(-Math.sign(b.x));
    expect(a.x).not.toBeCloseTo(b.x, 1);
  });

  it('a still player yields no lateral fan (just the point)', () => {
    const p = flankPoint(3, 3, 0, 0, 2, 3);
    expect(p).toEqual({ x: 3, z: 3 });
  });
});
