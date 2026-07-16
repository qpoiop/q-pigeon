import type { LevelDef, LevelTheme, Rect, GuardSpawn, GuardType } from './levels';

/** Enemy classes the generator draws from, so mobs vary in HP / speed / reach /
 *  attack shape / size instead of all being identical grunts. */
const GUARD_CLASSES: {
  cls: string;
  hp: number;
  speed: number;
  range: number;
  type: GuardType;
  scale: number;
  tint: number;
}[] = [
  { cls: 'rusher', hp: 2, speed: 3.6, range: 5, type: 'radial', scale: 0.85, tint: 0xec3013 },
  { cls: 'rusher', hp: 2, speed: 3.4, range: 5.5, type: 'radial', scale: 0.85, tint: 0xec3013 },
  { cls: 'scout', hp: 2, speed: 2.9, range: 7, type: 'radial', scale: 0.95, tint: 0x3fae6b },
  { cls: 'guard', hp: 3, speed: 2.3, range: 8.5, type: 'line', scale: 1.1, tint: 0x8a8683 },
  { cls: 'heavy', hp: 5, speed: 1.7, range: 8, type: 'radial', scale: 1.35, tint: 0xb0532a },
  { cls: 'sniper', hp: 3, speed: 2.0, range: 13, type: 'line', scale: 1.05, tint: 0xe0a021 },
];

/**
 * Procedural corridor-maze generator. Produces a `LevelDef` compatible with the
 * hand-authored ones: a filled grid is carved into corridors (walls dominate,
 * paths are threaded through), with a cleared spawn safe-zone, a far exit door
 * tucked in a corner, and guards patrolling short corridor segments.
 *
 * Guaranteed connected: the base is a perfect maze (every room reachable); the
 * safe-zone carve + extra loop-openings only ever remove walls, and the exit /
 * guards sit on open cells — so spawn can always path to the exit and to every
 * guard waypoint. `src/game/ai/mapgen-nav.test.ts` asserts this across seeds.
 */
export interface GenOpts {
  seed: number;
  /** Grid cells (both must be odd; interior rooms sit on odd indices). */
  gw: number;
  gh: number;
  /** World size of one cell (m). */
  cell: number;
  guards: number;
  theme: LevelTheme;
  name: string;
  brief: string;
}

/** Deterministic mulberry32 PRNG so a seed reproduces a map (for tests). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function genLevel(o: GenOpts): LevelDef {
  const { cell } = o;
  const rand = mulberry32(o.seed);
  const gw = o.gw; // lane width (cells)
  const gh = o.gh + [0, 2, 4][Math.floor(rand() * 3)]; // corridor length varies per seed
  const W = gw * cell;
  const D = gh * cell;
  const cx = (x: number) => x * cell - W / 2 + cell / 2;
  const cz = (y: number) => y * cell - D / 2 + cell / 2;

  // A straight corridor (not a maze): mostly open, with scattered obstacle blocks
  // between a guaranteed ~3-wide weaving lane so it's always traversable end-to-end.
  const wall: boolean[][] = Array.from({ length: gh }, () => Array(gw).fill(false));
  const laneCol: number[] = new Array(gh);
  let pc = 1 + Math.floor(rand() * (gw - 2));
  for (let y = gh - 1; y >= 0; y--) {
    laneCol[y] = pc;
    pc = Math.max(1, Math.min(gw - 2, pc + [-1, 0, 0, 1][Math.floor(rand() * 4)]));
  }
  for (let y = 2; y < gh - 2; y++)
    for (let x = 1; x < gw - 1; x++)
      if (Math.abs(x - laneCol[y]) > 1 && rand() < 0.34) wall[y][x] = true;

  // player spawns at one end, exit at the far end (enemies stream from there)
  const sc: [number, number] = [laneCol[gh - 2], gh - 2];
  const ec: [number, number] = [laneCol[1], 1];

  // emit obstacle cells as short crate-height walls, merging horizontal runs
  const walls: Rect[] = [];
  for (let y = 0; y < gh; y++) {
    let run = 0;
    for (let x = 0; x <= gw; x++) {
      const solid = x < gw && wall[y][x];
      if (solid) run++;
      else if (run) {
        const x0 = x - run;
        walls.push({ x: (cx(x0) + cx(x - 1)) / 2, z: cz(y), w: run * cell, d: cell, h: 1.3 });
        run = 0;
      }
    }
  }

  const spawn: [number, number] = [cx(sc[0]), cz(sc[1])];
  const extract: [number, number, number, number] = [cx(ec[0]), cz(ec[1]), cell * 1.6, cell * 1.4];

  // initial enemies wait in the far third; the rest arrive as reinforcement waves
  const guards: GuardSpawn[] = [];
  const used = new Set<string>();
  const farRows = Math.max(2, Math.floor(gh * 0.35));
  for (let i = 0; i < o.guards; i++) {
    // sit on the guaranteed lane in the far third → always reachable, no pockets
    let gy = 2 + Math.floor(rand() * farRows);
    let gx = laneCol[gy] + [-1, 0, 1][Math.floor(rand() * 3)];
    for (let tries = 0; tries < 20 && used.has(gx + ',' + gy); tries++) {
      gy = 2 + Math.floor(rand() * farRows);
      gx = laneCol[gy] + [-1, 0, 1][Math.floor(rand() * 3)];
    }
    gx = Math.max(1, Math.min(gw - 2, gx));
    used.add(gx + ',' + gy);
    const k = GUARD_CLASSES[Math.floor(rand() * GUARD_CLASSES.length)];
    guards.push({
      path: [[cx(gx), cz(gy)]],
      speed: k.speed + rand() * 0.3,
      range: k.range,
      type: k.type,
      hp: k.hp,
      scale: k.scale,
      tint: k.tint,
      cls: k.cls,
    });
  }

  return {
    name: o.name,
    w: W,
    d: D,
    theme: o.theme,
    brief: o.brief,
    spawn,
    extract,
    walls,
    covers: [],
    films: [],
    items: [],
    guards,
  };
}

/** Per-stage generation presets (index 0..2; the boss stage stays hand-authored). */
export const STAGE_GEN: { gw: number; gh: number; cell: number; guards: number }[] = [
  { gw: 9, gh: 15, cell: 4, guards: 5 },
  { gw: 9, gh: 19, cell: 4, guards: 6 },
  { gw: 11, gh: 23, cell: 4, guards: 8 },
];
