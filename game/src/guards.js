// Glimmerwick — the clockwork sentinels.
// One job: guard brains — patrol waypoints, notice the player, chase, search
// the last seen spot, then give up and go back to their rounds.
import {
  GUARD_PATROL_SPEED,
  GUARD_SEARCH_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_CONE_RANGE,
  GUARD_CONE_HALF_ANGLE,
  GUARD_CATCH_DISTANCE,
  GUARD_WAYPOINT_PAUSE,
  SUSPICION_ALERT_AT,
  SUSPICION_NOTICE_AT,
  ALERT_UNSEEN_SECONDS,
  SEARCH_SECONDS,
} from './config.js';
import { tileCentre } from './levels.js';
import { breadthFirstPath, pixelToTile } from './pathfind.js';

/** Smallest signed turn from angle `from` to angle `to`. */
export function angleDifference(from, to) {
  let difference = (to - from) % (Math.PI * 2);
  if (difference > Math.PI) difference -= Math.PI * 2;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return difference;
}

export class Guard {
  constructor(def, level) {
    const start = tileCentre(def.tx, def.ty);
    this.x = start.x;
    this.y = start.y;
    this.facing = Math.PI / 2; // looking down the room
    this.state = 'patrol'; // patrol | pause | notice | chase | search | return
    this.suspicion = 0;
    this.waypoints = def.waypoints.map(([tx, ty]) => tileCentre(tx, ty));
    this.waypointIndex = 0;
    this.pause = def.pause ?? GUARD_WAYPOINT_PAUSE;
    this.pauseTimer = 0;
    this.path = [];
    this.pathIndex = 0;
    this.repathTimer = 0;
    this.unseenTimer = 0;
    this.searchTimer = 0;
    this.lookAngle = 0;
    this.lastSeen = { x: this.x, y: this.y };
    this.searchingNoise = false;
    this.planRouteTo(this.waypoints[0], level);
  }

  /** Ask the pathfinder for a route to a pixel point; keep the old one on failure. */
  planRouteTo(point, level) {
    const from = pixelToTile(this.x, this.y);
    const to = pixelToTile(point.x, point.y);
    const route = breadthFirstPath(level, from.tx, from.ty, to.tx, to.ty);
    if (route) {
      this.path = route;
      this.pathIndex = 0;
    }
  }

  /** Walk along the current route at `speed`; true when the end is reached. */
  followPath(dt, speed) {
    if (this.pathIndex >= this.path.length) return true;
    const target = this.path[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);
    const step = speed * dt;
    if (distance <= step) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex += 1;
      return this.pathIndex >= this.path.length;
    }
    this.x += (dx / distance) * step;
    this.y += (dy / distance) * step;
    this.turnToward(Math.atan2(dy, dx), dt, 8);
    return false;
  }

  /** Turn toward an angle at most `rate` radians per second. */
  turnToward(angle, dt, rate) {
    const difference = angleDifference(this.facing, angle);
    const maxTurn = rate * dt;
    this.facing += Math.max(-maxTurn, Math.min(maxTurn, difference));
  }

  /** A noise at (x, y) pulls a patrolling guard over to investigate. */
  hearNoise(x, y, radius) {
    if (this.state !== 'patrol' && this.state !== 'pause' && this.state !== 'return') return;
    if (Math.hypot(x - this.x, y - this.y) > radius) return;
    this.lastSeen = { x, y };
    this.searchingNoise = true;
    this.state = 'search';
    this.searchTimer = 0;
  }

  /**
   * Step the guard one frame. `world` answers sight questions and raises
   * events (alarm, caught); it returns nothing.
   */
  update(dt, world) {
    const level = world.level;
    const player = world.player;
    const sight = world.guardSight(this);
    if (sight.seen) {
      this.suspicion = Math.min(SUSPICION_ALERT_AT, this.suspicion + sight.rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.unseenTimer = 0;
      if (this.suspicion >= SUSPICION_ALERT_AT && this.state !== 'chase') {
        this.state = 'chase';
        this.searchingNoise = false;
        world.onGuardAlert(this);
      } else if (
        this.suspicion >= SUSPICION_NOTICE_AT &&
        (this.state === 'patrol' || this.state === 'pause' || this.state === 'return')
      ) {
        this.state = 'notice';
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - 34 * dt);
      if (this.state === 'notice' && this.suspicion < SUSPICION_NOTICE_AT / 2) {
        this.state = 'patrol';
        this.planRouteTo(this.waypoints[this.waypointIndex], level);
      }
      if (this.state === 'chase') {
        this.unseenTimer += dt;
        if (this.unseenTimer >= ALERT_UNSEEN_SECONDS) {
          this.state = 'search';
          this.searchTimer = 0;
          this.searchingNoise = false;
          world.onGuardGiveUp(this);
        }
      }
    }

    if (this.state === 'patrol') {
      if (this.followPath(dt, GUARD_PATROL_SPEED)) {
        this.state = 'pause';
        this.pauseTimer = this.pause;
      }
    } else if (this.state === 'pause') {
      this.pauseTimer -= dt;
      this.lookAngle += dt * 0.6;
      this.facing += Math.sin(this.lookAngle) * dt * 0.8;
      if (this.pauseTimer <= 0) {
        this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
        this.planRouteTo(this.waypoints[this.waypointIndex], level);
        this.state = 'patrol';
      }
    } else if (this.state === 'notice') {
      this.turnToward(Math.atan2(player.y - this.y, player.x - this.x), dt, 6);
    } else if (this.state === 'chase') {
      this.repathTimer -= dt;
      if (this.repathTimer <= 0) {
        this.repathTimer = 0.4;
        this.planRouteTo({ x: player.x, y: player.y }, level);
      }
      this.followPath(dt, GUARD_CHASE_SPEED);
      this.turnToward(Math.atan2(player.y - this.y, player.x - this.x), dt, 10);
      if (Math.hypot(player.x - this.x, player.y - this.y) <= GUARD_CATCH_DISTANCE) {
        world.onPlayerCaught(this);
      }
    } else if (this.state === 'search') {
      if (this.followPath(dt, GUARD_SEARCH_SPEED)) {
        this.searchTimer += dt;
        this.facing += dt * 1.8; // sweep the room, looking for the intruder
        if (this.searchTimer >= SEARCH_SECONDS) {
          this.state = 'return';
          this.planRouteTo(this.waypoints[this.waypointIndex], level);
        }
      } else {
        this.turnToward(Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x), dt, 6);
      }
    } else if (this.state === 'return') {
      if (this.followPath(dt, GUARD_PATROL_SPEED)) {
        this.state = 'patrol';
      }
    }
  }

  /** Is the player inside this guard's cone (ignoring walls)? */
  inCone(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance > GUARD_CONE_RANGE) return { inside: false, distance };
    if (distance < 30) return { inside: true, distance }; // too close to miss
    const angle = Math.atan2(dy, dx);
    const inside = Math.abs(angleDifference(this.facing, angle)) <= GUARD_CONE_HALF_ANGLE;
    return { inside, distance };
  }
}
