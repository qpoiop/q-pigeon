/** Difficulty presets. Each scales guard behaviour and starting equipment. */
export type DiffId = string;

export interface DiffDef {
  /** Display name (Korean). */
  name: string;
  /** Guard speed multiplier. */
  gs: number;
  /** Guard vision-range multiplier. */
  gr: number;
  /** Seconds of exposure before detection fills (lower = faster spotting). */
  dt: number;
  /** Starting inventory. */
  start: { decoy: number; smoke: number };
}

export const DIFFS: Record<DiffId, DiffDef> = {
  easy: { name: '쉬움', gs: 0.8, gr: 0.85, dt: 1.05, start: { decoy: 1, smoke: 1 } },
  normal: { name: '보통', gs: 1.0, gr: 1.0, dt: 0.75, start: { decoy: 1, smoke: 0 } },
  hard: { name: '어려움', gs: 1.22, gr: 1.15, dt: 0.55, start: { decoy: 0, smoke: 0 } },
};

export const DIFF_ORDER: DiffId[] = Object.keys(DIFFS);
