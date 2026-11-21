// Glimmerwick — the three library floors.
// One job: describe each level (walls, shelves, shadows, lanterns, pages, exit,
// player start, guard patrols) and build the tile grid the world steps on.
//
// Tiles: '#' wall, '.' lit floor, ',' shadow floor (dark, hides you),
// 'S' bookshelf (blocks movement AND sight), 'D' reading desk (blocks
// movement only, low enough to see over).
import { COLS, ROWS } from './config.js';

function blankGrid() {
  const grid = [];
  for (let y = 0; y < ROWS; y += 1) {
    const row = [];
    for (let x = 0; x < COLS; x += 1) {
      row.push(x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? '#' : '.');
    }
    grid.push(row);
  }
  return grid;
}

function rect(grid, x, y, w, h, tile) {
  for (let j = y; j < y + h; j += 1) {
    for (let i = x; i < x + w; i += 1) {
      if (i > 0 && j > 0 && i < COLS - 1 && j < ROWS - 1) grid[j][i] = tile;
    }
  }
}

/**
 * Build a level from a compact description. Shelves, desks and shadow patches
 * are rectangles; everything else is a single tile.
 */
function buildLevel(def) {
  const grid = blankGrid();
  for (const [x, y, w, h] of def.shelves) rect(grid, x, y, w, h, 'S');
  for (const [x, y, w, h] of def.desks || []) rect(grid, x, y, w, h, 'D');
  for (const [x, y, w, h] of def.shadows || []) rect(grid, x, y, w, h, ',');
  return {
    name: def.name,
    subtitle: def.subtitle,
    grid,
    lanterns: def.lanterns || [],
    pages: def.pages.map(([x, y]) => ({ tx: x, ty: y, taken: false })),
    exit: { tx: def.exit[0], ty: def.exit[1] },
    playerStart: { tx: def.player[0], ty: def.player[1] },
    guards: def.guards.map((g) => ({
      tx: g[0],
      ty: g[1],
      waypoints: g[2],
      pause: g[3] ?? 1.4,
    })),
  };
}

export const LEVELS = [
  buildLevel({
    name: 'Floor I — The Reading Room',
    subtitle: 'Two sentinels. Learn their rounds, mind the lantern light.',
    shelves: [
      [5, 4, 5, 1],
      [14, 4, 5, 1],
      [5, 10, 5, 1],
      [14, 10, 5, 1],
      [11, 6, 2, 3],
    ],
    desks: [
      [2, 7, 2, 1],
      [20, 7, 2, 1],
    ],
    shadows: [
      [1, 1, 3, 2],
      [20, 12, 3, 2],
      [1, 12, 3, 2],
      [11, 13, 2, 1],
    ],
    lanterns: [
      [12, 1],
      [12, 14],
      [2, 8],
      [21, 8],
    ],
    pages: [
      [11, 2],
      [20, 8],
      [5, 7],
    ],
    exit: [21, 2],
    player: [2, 13],
    guards: [
      [4, 7, [[4, 7], [19, 7]]],
      [19, 2, [[19, 2], [19, 13]]],
    ],
  }),
  buildLevel({
    name: 'Floor II — The Clockwork Stacks',
    subtitle: 'Three sentinels, staggered aisles. The shadows are your friends.',
    shelves: [
      [4, 3, 5, 1],
      [11, 3, 5, 1],
      [18, 3, 4, 1],
      [2, 7, 5, 1],
      [9, 7, 5, 1],
      [16, 7, 5, 1],
      [4, 11, 5, 1],
      [11, 11, 5, 1],
      [18, 11, 4, 1],
    ],
    desks: [
      [11, 5, 2, 1],
      [11, 9, 2, 1],
    ],
    shadows: [
      [1, 1, 2, 3],
      [21, 1, 2, 3],
      [1, 12, 2, 2],
      [21, 12, 2, 2],
      [11, 13, 2, 1],
      [1, 5, 1, 5],
    ],
    lanterns: [
      [12, 1],
      [6, 9],
      [17, 9],
      [12, 14],
    ],
    pages: [
      [2, 2],
      [21, 13],
      [11, 8],
    ],
    exit: [21, 2],
    player: [2, 13],
    guards: [
      [4, 2, [[4, 2], [20, 2]]],
      [20, 13, [[20, 13], [4, 13]]],
      [11, 5, [[11, 5], [11, 12]]],
    ],
  }),
  buildLevel({
    name: 'Floor III — The Star Vault',
    subtitle: 'Four sentinels guard the vault. Patience wins. Hurry gets caught.',
    shelves: [
      [3, 3, 4, 1],
      [9, 3, 6, 1],
      [17, 3, 4, 1],
      [3, 6, 4, 1],
      [17, 6, 4, 1],
      [6, 8, 4, 1],
      [14, 8, 4, 1],
      [3, 10, 4, 1],
      [17, 10, 4, 1],
      [9, 12, 6, 1],
      [11, 4, 2, 2],
    ],
    desks: [
      [5, 12, 2, 1],
      [17, 12, 2, 1],
    ],
    shadows: [
      [1, 1, 2, 2],
      [21, 1, 2, 2],
      [1, 13, 2, 1],
      [21, 13, 2, 1],
      [11, 6, 2, 1],
      [1, 7, 1, 2],
      [22, 7, 1, 2],
    ],
    lanterns: [
      [12, 1],
      [5, 9],
      [18, 9],
      [12, 14],
      [1, 5],
      [22, 5],
    ],
    pages: [
      [2, 2],
      [21, 2],
      [12, 7],
    ],
    exit: [12, 1],
    player: [12, 14],
    guards: [
      [3, 5, [[3, 5], [20, 5]]],
      [20, 9, [[20, 9], [3, 9]]],
      [6, 2, [[6, 2], [6, 13]]],
      [17, 2, [[17, 2], [17, 13]]],
    ],
  }),
];

/** Tile at (tx, ty); outside the grid counts as wall. */
export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.grid[ty][tx];
}

/** True when a tile blocks movement (wall, shelf, desk). */
export function tileBlocksMove(level, tx, ty) {
  const tile = tileAt(level, tx, ty);
  return tile === '#' || tile === 'S' || tile === 'D';
}

/** True when a tile blocks a guard's sight (wall, shelf — desks are low). */
export function tileBlocksSight(level, tx, ty) {
  const tile = tileAt(level, tx, ty);
  return tile === '#' || tile === 'S';
}

/** True when a tile is shadow floor (dark, halves detection). */
export function tileIsShadow(level, tx, ty) {
  return tileAt(level, tx, ty) === ',';
}

/** Centre of a tile in pixels. */
export function tileCentre(tx, ty) {
  return { x: (tx + 0.5) * 40, y: (ty + 0.5) * 40 };
}
