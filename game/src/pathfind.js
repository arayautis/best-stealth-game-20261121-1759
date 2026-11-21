// Glimmerwick — grid pathfinding.
// One job: breadth-first routes across the tile grid, so guards and the
// screenshot autopilot can walk around shelves instead of through them.
import { COLS, ROWS, TILE } from './config.js';
import { tileBlocksMove, tileCentre } from './levels.js';

/**
 * Shortest walkable route from one tile to another, as a list of pixel
 * centres (excluding the start tile). Empty list when already there, null
 * when no route exists.
 */
export function breadthFirstPath(level, fromTx, fromTy, toTx, toTy) {
  if (fromTx === toTx && fromTy === toTy) return [];
  if (tileBlocksMove(level, toTx, toTy)) return null;
  const visited = new Uint8Array(COLS * ROWS);
  const parent = new Int32Array(COLS * ROWS).fill(-1);
  const queue = [fromTy * COLS + fromTx];
  visited[fromTy * COLS + fromTx] = 1;
  const target = toTy * COLS + toTx;
  let found = false;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === target) {
      found = true;
      break;
    }
    const cx = current % COLS;
    const cy = Math.floor(current / COLS);
    for (const [dx, dy] of directions) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const index = ny * COLS + nx;
      if (visited[index] || tileBlocksMove(level, nx, ny)) continue;
      visited[index] = 1;
      parent[index] = current;
      queue.push(index);
    }
  }
  if (!found) return null;
  const tiles = [];
  let node = target;
  while (node !== fromTy * COLS + fromTx) {
    tiles.push(node);
    node = parent[node];
  }
  tiles.reverse();
  return tiles.map((index) => tileCentre(index % COLS, Math.floor(index / COLS)));
}

/** Pixel position to tile coordinates. */
export function pixelToTile(x, y) {
  return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
}
