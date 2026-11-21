// Glimmerwick — the simulation.
// One job: the player, the cogs, the pages, the exit, line of sight and the
// detection maths; guards live in guards.js and ask this world what they see.
import {
  TILE,
  PLAYER_WALK_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_RADIUS,
  GUARD_CONE_RANGE,
  SUSPICION_CLOSE_RATE,
  SUSPICION_FAR_RATE,
  SUSPICION_SNEAK_FACTOR,
  SUSPICION_SHADOW_FACTOR,
  SUSPICION_RUN_FACTOR,
  NOISE_WALK_RADIUS,
  NOISE_STEP_SECONDS,
  COG_THROW_DISTANCE,
  COG_NOISE_RADIUS,
  COG_START_COUNT,
  STEP,
} from './config.js';
import { LEVELS, tileAt, tileBlocksMove, tileBlocksSight, tileIsShadow, tileCentre } from './levels.js';
import { Guard } from './guards.js';
import { makeRandom } from './random.js';
import { pixelToTile } from './pathfind.js';

export class World {
  constructor(levelIndex, sound) {
    this.sound = sound;
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.random = makeRandom(1000 + levelIndex * 77);
    this.reset();
  }

  reset() {
    // Fresh copies: pages are re-hidden, guards go back to their posts.
    this.level = LEVELS[this.levelIndex];
    this.level.pages.forEach((page) => {
      page.taken = false;
    });
    const start = tileCentre(this.level.playerStart.tx, this.level.playerStart.ty);
    this.player = {
      x: start.x,
      y: start.y,
      facing: -Math.PI / 2,
      moving: false,
      sneaking: false,
      speed: 0,
      stepTimer: 0,
      noiseTimer: 0,
    };
    this.guards = this.level.guards.map((def) => new Guard(def, this.level));
    this.cogs = [];
    this.cogCount = COG_START_COUNT;
    this.pagesTaken = 0;
    this.time = 0;
    this.caught = false;
    this.caughtBy = null;
    this.levelComplete = false;
    this.alerted = false;
    this.maxSuspicion = 0;
    this.dust = [];
    for (let i = 0; i < 42; i += 1) {
      this.dust.push({
        x: this.random() * 960,
        y: this.random() * 640,
        drift: 4 + this.random() * 8,
        phase: this.random() * Math.PI * 2,
        size: 1 + this.random() * 1.6,
      });
    }
    this.sparks = [];
  }

  /** Every page collected: the Archive Door swings open. */
  get exitOpen() {
    return this.pagesTaken >= this.level.pages.length;
  }

  /** Highest suspicion among the guards — the HUD's danger meter. */
  get danger() {
    let top = 0;
    for (const guard of this.guards) top = Math.max(top, guard.suspicion);
    return top;
  }

  /** A guard is actively chasing right now. */
  get anyChase() {
    return this.guards.some((guard) => guard.state === 'chase');
  }

  /** Step the whole world one frame. `move` is a normalised {x, y}. */
  step(dt, move, sneaking, throwCog) {
    if (this.caught || this.levelComplete) return;
    this.time += dt;
    this.stepPlayer(dt, move, sneaking);
    if (throwCog && this.cogCount > 0) this.throwCog();
    this.stepCogs(dt);
    for (const guard of this.guards) guard.update(dt, this);
    this.alerted = this.anyChase;
    this.maxSuspicion = this.danger;
    this.stepSparks(dt);
    this.stepDust(dt);
    this.checkPages();
    this.checkExit();
  }

  stepPlayer(dt, move, sneaking) {
    const player = this.player;
    const speed = sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    player.sneaking = sneaking;
    player.moving = move.x !== 0 || move.y !== 0;
    player.speed = player.moving ? speed : 0;
    if (player.moving) {
      player.facing = Math.atan2(move.y, move.x);
      this.moveCircle(player, move.x * speed * dt, 0);
      this.moveCircle(player, 0, move.y * speed * dt);
      player.stepTimer -= dt;
      if (player.stepTimer <= 0) {
        player.stepTimer = sneaking ? 0.55 : 0.34;
        this.sound.footstep(sneaking);
        this.sparks.push({
          x: player.x,
          y: player.y + 8,
          vx: 0,
          vy: -6,
          life: 0.4,
          maxLife: 0.4,
          kind: 'puff',
        });
      }
      if (!sneaking) {
        player.noiseTimer -= dt;
        if (player.noiseTimer <= 0) {
          player.noiseTimer = NOISE_STEP_SECONDS;
          this.emitNoise(player.x, player.y, NOISE_WALK_RADIUS);
        }
      }
    }
  }

  /** Move a circle with axis-separated collision against blocking tiles. */
  moveCircle(entity, dx, dy) {
    const nextX = entity.x + dx;
    if (!this.circleHitsWall(nextX, entity.y, PLAYER_RADIUS)) entity.x = nextX;
    const nextY = entity.y + dy;
    if (!this.circleHitsWall(entity.x, nextY, PLAYER_RADIUS)) entity.y = nextY;
  }

  circleHitsWall(x, y, radius) {
    const left = Math.floor((x - radius) / TILE);
    const right = Math.floor((x + radius) / TILE);
    const top = Math.floor((y - radius) / TILE);
    const bottom = Math.floor((y + radius) / TILE);
    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        if (tileBlocksMove(this.level, tx, ty)) return true;
      }
    }
    return false;
  }

  /** A noise at (x, y): every guard in range comes to look. */
  emitNoise(x, y, radius) {
    for (const guard of this.guards) guard.hearNoise(x, y, radius);
  }

  throwCog() {
    const player = this.player;
    this.cogCount -= 1;
    // Walk the throw ray in small steps and stop at the last free point, so a
    // cog tossed at a shelf or a wall lands on the floor in front of it
    // instead of inside the furniture.
    const dx = Math.cos(player.facing);
    const dy = Math.sin(player.facing);
    let landX = player.x;
    let landY = player.y;
    for (let distance = 8; distance <= COG_THROW_DISTANCE; distance += 4) {
      const x = player.x + dx * distance;
      const y = player.y + dy * distance;
      const { tx, ty } = pixelToTile(x, y);
      if (tileBlocksMove(this.level, tx, ty)) break;
      landX = x;
      landY = y;
    }
    this.cogs.push({ x: landX, y: landY, timer: 0.4, landed: false });
  }

  stepCogs(dt) {
    for (const cog of this.cogs) {
      if (cog.landed) continue;
      cog.timer -= dt;
      if (cog.timer <= 0) {
        cog.landed = true;
        this.sound.cogClatter();
        this.emitNoise(cog.x, cog.y, COG_NOISE_RADIUS);
        for (let i = 0; i < 8; i += 1) {
          this.sparks.push({
            x: cog.x,
            y: cog.y,
            vx: (this.random() - 0.5) * 60,
            vy: (this.random() - 0.5) * 60,
            life: 0.5,
            maxLife: 0.5,
            kind: 'spark',
          });
        }
      }
    }
  }

  stepSparks(dt) {
    for (const spark of this.sparks) {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
    }
    this.sparks = this.sparks.filter((spark) => spark.life > 0);
  }

  stepDust(dt) {
    for (const mote of this.dust) {
      mote.phase += dt * 0.5;
      mote.x += Math.sin(mote.phase) * mote.drift * dt;
      mote.y -= mote.drift * 0.4 * dt;
      if (mote.y < -4) mote.y = 644;
      if (mote.x < -4) mote.x = 964;
      if (mote.x > 964) mote.x = -4;
    }
  }

  checkPages() {
    for (const page of this.level.pages) {
      if (page.taken) continue;
      const centre = tileCentre(page.tx, page.ty);
      if (Math.hypot(centre.x - this.player.x, centre.y - this.player.y) < 26) {
        page.taken = true;
        this.pagesTaken += 1;
        this.cogCount += 1; // a page's brass clasp becomes a spare cog
        this.sound.pageChime();
        for (let i = 0; i < 14; i += 1) {
          this.sparks.push({
            x: centre.x,
            y: centre.y,
            vx: (this.random() - 0.5) * 90,
            vy: (this.random() - 0.5) * 90,
            life: 0.7,
            maxLife: 0.7,
            kind: 'spark',
          });
        }
      }
    }
  }

  checkExit() {
    if (!this.exitOpen) return;
    const centre = tileCentre(this.level.exit.tx, this.level.exit.ty);
    if (Math.hypot(centre.x - this.player.x, centre.y - this.player.y) < 28) {
      this.levelComplete = true;
      this.sound.winArpeggio();
    }
  }

  /** Straight sample along the line: true when no shelf or wall is in the way. */
  hasLineOfSight(x0, y0, x1, y1) {
    const distance = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(distance / 6));
    for (let i = 1; i < steps; i += 1) {
      const x = x0 + ((x1 - x0) * i) / steps;
      const y = y0 + ((y1 - y0) * i) / steps;
      const { tx, ty } = pixelToTile(x, y);
      if (tileBlocksSight(this.level, tx, ty)) return false;
    }
    return true;
  }

  /**
   * What this guard sees of the player right now: whether the player is in
   * the cone with a clear line of sight, and how fast suspicion should rise.
   */
  guardSight(guard) {
    const player = this.player;
    const cone = guard.inCone(player.x, player.y);
    if (!cone.inside) return { seen: false, rate: 0 };
    if (!this.hasLineOfSight(guard.x, guard.y, player.x, player.y)) {
      return { seen: false, rate: 0 };
    }
    const closeness = 1 - cone.distance / GUARD_CONE_RANGE;
    let rate = SUSPICION_FAR_RATE + (SUSPICION_CLOSE_RATE - SUSPICION_FAR_RATE) * closeness;
    if (player.sneaking) rate *= SUSPICION_SNEAK_FACTOR;
    if (!player.sneaking && player.moving) rate *= SUSPICION_RUN_FACTOR;
    const { tx, ty } = pixelToTile(player.x, player.y);
    if (tileIsShadow(this.level, tx, ty)) rate *= SUSPICION_SHADOW_FACTOR;
    return { seen: true, rate };
  }

  // --- events the guards raise ------------------------------------------------
  onGuardAlert() {
    this.sound.alarm();
  }

  onGuardGiveUp() {
    this.sound.calmDown();
  }

  onPlayerCaught(guard) {
    if (this.caught) return;
    this.caught = true;
    this.caughtBy = guard;
    this.sound.caughtThud();
  }
}

export { STEP, tileAt };
