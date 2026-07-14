/**
 * Coarse occupancy grid built from a level's wall rectangles, used for guard
 * pathfinding. Walls are inflated by an agent radius so path cells keep
 * clearance and agents don't clip corners. Pure data — no THREE dependency,
 * so it is trivially unit-testable.
 */
import type { Bounds } from '../types';

export interface Vec2 {
  x: number;
  z: number;
}

export class NavGrid {
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  readonly minX: number;
  readonly minZ: number;
  private readonly blocked: Uint8Array;

  /**
   * @param halfW  half the playfield width  (world spans [-halfW, halfW])
   * @param halfD  half the playfield depth   (world spans [-halfD, halfD])
   * @param walls  wall bounds in world space
   * @param cell   grid cell size in metres
   * @param inflate  radius (m) to grow walls / shrink the outer border by
   */
  constructor(halfW: number, halfD: number, walls: Bounds[], cell = 1, inflate = 0.55) {
    this.cell = cell;
    this.minX = -halfW;
    this.minZ = -halfD;
    this.cols = Math.max(1, Math.ceil((halfW * 2) / cell));
    this.rows = Math.max(1, Math.ceil((halfD * 2) / cell));
    this.blocked = new Uint8Array(this.cols * this.rows);

    for (let cz = 0; cz < this.rows; cz++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const wx = this.minX + (cx + 0.5) * cell;
        const wz = this.minZ + (cz + 0.5) * cell;
        let block = false;
        // outer border: keep a radius of clearance from the arena edge
        if (wx < -halfW + inflate || wx > halfW - inflate || wz < -halfD + inflate || wz > halfD - inflate) {
          block = true;
        }
        if (!block) {
          for (let i = 0; i < walls.length; i++) {
            const w = walls[i];
            if (
              wx > w.minX - inflate &&
              wx < w.maxX + inflate &&
              wz > w.minZ - inflate &&
              wz < w.maxZ + inflate
            ) {
              block = true;
              break;
            }
          }
        }
        if (block) this.blocked[cz * this.cols + cx] = 1;
      }
    }
  }

  cellX(x: number): number {
    return Math.floor((x - this.minX) / this.cell);
  }
  cellZ(z: number): number {
    return Math.floor((z - this.minZ) / this.cell);
  }
  worldX(cx: number): number {
    return this.minX + (cx + 0.5) * this.cell;
  }
  worldZ(cz: number): number {
    return this.minZ + (cz + 0.5) * this.cell;
  }
  inBounds(cx: number, cz: number): boolean {
    return cx >= 0 && cz >= 0 && cx < this.cols && cz < this.rows;
  }
  isBlockedCell(cx: number, cz: number): boolean {
    if (!this.inBounds(cx, cz)) return true;
    return this.blocked[cz * this.cols + cx] === 1;
  }
  isBlockedWorld(x: number, z: number): boolean {
    return this.isBlockedCell(this.cellX(x), this.cellZ(z));
  }

  /**
   * Nearest walkable cell to (cx,cz) via an expanding ring search. Returns the
   * cell itself if already free, or null if the whole grid is blocked.
   */
  nearestFree(cx: number, cz: number, maxRing = 8): [number, number] | null {
    if (this.inBounds(cx, cz) && !this.isBlockedCell(cx, cz)) return [cx, cz];
    for (let r = 1; r <= maxRing; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; // ring perimeter only
          const nx = cx + dx;
          const nz = cz + dz;
          if (this.inBounds(nx, nz) && !this.isBlockedCell(nx, nz)) return [nx, nz];
        }
      }
    }
    return null;
  }

  /** Grid-space line-of-sight (supercover) between two cells — no blocked cell crossed. */
  cellLineClear(x0: number, z0: number, x1: number, z1: number): boolean {
    let cx = x0;
    let cz = z0;
    const dx = Math.abs(x1 - x0);
    const dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;
    // guard against pathological loops
    let steps = dx + dz + 1;
    while (steps-- > 0) {
      if (this.isBlockedCell(cx, cz)) return false;
      if (cx === x1 && cz === z1) return true;
      const e2 = 2 * err;
      if (e2 > -dz) {
        err -= dz;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cz += sz;
      }
    }
    return true;
  }
}
