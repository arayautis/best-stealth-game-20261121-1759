// Glimmerwick — shared constants: tile size, speeds, detection tuning, palette.
// One job: every number the rest of the game agrees on lives here.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const WORLD_W = COLS * TILE; // 960
export const WORLD_H = ROWS * TILE; // 640

export const PLAYER_WALK_SPEED = 132; // px per second
export const PLAYER_SNEAK_SPEED = 72;
export const PLAYER_RADIUS = 12;

export const GUARD_PATROL_SPEED = 58;
export const GUARD_SEARCH_SPEED = 78;
export const GUARD_CHASE_SPEED = 108;
export const GUARD_RADIUS = 14;
export const GUARD_CONE_RANGE = 215;
export const GUARD_CONE_HALF_ANGLE = 0.66; // radians, ~38 degrees
export const GUARD_CATCH_DISTANCE = 20;
export const GUARD_WAYPOINT_PAUSE = 1.4; // seconds standing at a waypoint

// Suspicion 0..100. Rates per second while the player is seen.
export const SUSPICION_CLOSE_RATE = 62; // nearer than 70px
export const SUSPICION_FAR_RATE = 26; // at the cone's edge
export const SUSPICION_DECAY_RATE = 34;
export const SUSPICION_SNEAK_FACTOR = 0.45;
export const SUSPICION_SHADOW_FACTOR = 0.5;
export const SUSPICION_RUN_FACTOR = 1.5;
export const SUSPICION_ALERT_AT = 100;
export const SUSPICION_NOTICE_AT = 35; // guard pauses and stares
export const ALERT_UNSEEN_SECONDS = 2.5; // unseen this long -> give up the chase
export const SEARCH_SECONDS = 3.2; // poke around the last seen spot, then patrol again

export const NOISE_WALK_RADIUS = 95; // running footsteps carry this far
export const NOISE_STEP_SECONDS = 0.38;
export const COG_THROW_DISTANCE = 150;
export const COG_NOISE_RADIUS = 240;
export const COG_START_COUNT = 2;

export const STEP = 1 / 60;

export const COLORS = {
  floorLight: '#7a5a38',
  floorDark: '#6b4c2d',
  floorLine: '#5d3f24',
  shadowFloor: '#3d3a55',
  shadowFloorLine: '#33304a',
  wall: '#241a12',
  wallTop: '#3a2c1e',
  shelf: '#4a2f1c',
  shelfEdge: '#6b4a2a',
  desk: '#5c4326',
  lanternGlow: 'rgba(255, 196, 90, 0.20)',
  cone: 'rgba(255, 205, 92, 0.20)',
  coneEdge: 'rgba(255, 214, 120, 0.45)',
  coneAlert: 'rgba(255, 84, 64, 0.26)',
  coneAlertEdge: 'rgba(255, 110, 80, 0.55)',
  player: '#3fc9b8',
  playerDark: '#1d7a6e',
  guard: '#d9a441',
  guardDark: '#8a6420',
  page: '#ffe9a8',
  exitLocked: '#8a8f9e',
  exitOpen: '#ffd76a',
  night: 'rgba(10, 12, 30, 0.46)',
};
