// Glimmerwick — the screenshot scenes behind ?shot=cover|play|alert|win.
// One job: put a real world into a photogenic state by playing the real
// rules forward (guards patrol, the player walks a real route, detection
// fires for real), so each screenshot is what the game genuinely looks like.
import { STEP } from './config.js';
import { tileCentre } from './levels.js';
import { breadthFirstPath, pixelToTile } from './pathfind.js';

/** Walk the player along a real path for up to `maxSeconds` of game time. */
function walkPlayerTo(world, targetTx, targetTy, maxSeconds) {
  const from = pixelToTile(world.player.x, world.player.y);
  const route = breadthFirstPath(world.level, from.tx, from.ty, targetTx, targetTy);
  if (!route) return;
  let pointIndex = 0;
  const limit = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < limit; i += 1) {
    if (world.caught || world.levelComplete) break;
    if (pointIndex >= route.length) break;
    const target = route[pointIndex];
    const dx = target.x - world.player.x;
    const dy = target.y - world.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) {
      pointIndex += 1;
      continue;
    }
    world.step(STEP, { x: dx / distance, y: dy / distance }, true, false);
  }
}

/** Let the world idle (guards patrol, dust drifts) for a few seconds. */
function idle(world, seconds) {
  const limit = Math.floor(seconds / STEP);
  for (let i = 0; i < limit; i += 1) {
    if (world.caught || world.levelComplete) break;
    world.step(STEP, { x: 0, y: 0 }, false, false);
  }
}

/**
 * Stage the named scene on `game` (its world, screen and timers) and return
 * the screen to show. Any other name stages the cover.
 */
export function stageShot(name, game) {
  const world = game.world;
  if (name === 'play') {
    // Wren slips behind the centre shelves while a sentinel's cone sweeps past.
    walkPlayerTo(world, 10, 8, 14);
    world.player.facing = Math.PI / 4;
    world.guards[0].suspicion = 22;
    idle(world, 1.2);
    game.screen = 'play';
    return;
  }
  if (name === 'alert') {
    // Wren is caught in the open: the sentinel's cone finds her for real —
    // step the world until the chase fires, then freeze the near-miss.
    walkPlayerTo(world, 16, 7, 14);
    world.player.facing = 0;
    let steps = 0;
    while (!world.anyChase && steps < 900 && !world.caught) {
      world.step(STEP, { x: 0, y: 0 }, false, false);
      steps += 1;
    }
    game.screen = 'play';
    return;
  }
  if (name === 'win') {
    // All three charts recovered: Wren steps through the Archive Door and
    // the floor-clear screen rises over the level.
    for (const page of world.level.pages) page.taken = true;
    world.pagesTaken = world.level.pages.length;
    walkPlayerTo(world, 21, 2, 20);
    world.time = 87.4;
    game.screen = world.levelComplete ? 'leveldone' : 'play';
    return;
  }
  // Cover: the whole first floor at a glance — shelves, shadows, lanterns,
  // both sentinels with their cones, the charts and the Archive Door.
  walkPlayerTo(world, 8, 12, 12);
  world.player.facing = -Math.PI / 4;
  idle(world, 2.5);
  game.screen = 'play';
}
