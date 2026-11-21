// Glimmerwick — everything the player sees.
// One job: draw the library (floor, shelves, lanterns, shadows), the actors
// (Wren, the sentinels, their vision cones), the night lighting that shows
// what is safe, the HUD, and every screen.
import { TILE, COLS, ROWS, WORLD_W, WORLD_H, COLORS, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE } from './config.js';
import { tileCentre } from './levels.js';
import { makeRandom } from './random.js';

const HUD_HEIGHT = 60;
const VIEW_W = WORLD_W;
const VIEW_H = WORLD_H + HUD_HEIGHT;

/** Deterministic colour pick from integer coordinates (book spines). */
function hashPick(x, y, items) {
  let hash = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  hash = (hash ^ (hash >> 13)) * 1274126177;
  hash = (hash ^ (hash >> 16)) >>> 0;
  return items[hash % items.length];
}

const SPINE_COLORS = ['#a34d3f', '#4d7a5a', '#5a6b9e', '#c9a227', '#7a4d8a', '#3f8a8a', '#b06a2e'];
const TITLE_FONT = 'Georgia, "Times New Roman", serif';
const UI_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nightCanvas = document.createElement('canvas');
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.scale = Math.min(width / VIEW_W, height / VIEW_H);
    this.offsetX = (width - VIEW_W * this.scale) / 2;
    this.offsetY = (height - VIEW_H * this.scale) / 2;
    this.nightCanvas.width = width;
    this.nightCanvas.height = height;
  }

  /** World (x, y) to screen pixels. */
  toScreen(x, y) {
    return {
      x: this.offsetX + x * this.scale,
      y: this.offsetY + HUD_HEIGHT * this.scale + y * this.scale,
    };
  }

  /** Screen pixels to world coordinates. */
  toWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY - HUD_HEIGHT * this.scale) / this.scale,
    };
  }

  /** The clickable title-screen button, in screen pixels. */
  titleButtonRect() {
    const width = 260 * this.scale;
    const height = 54 * this.scale;
    return {
      x: (this.canvas.width - width) / 2,
      y: this.canvas.height * 0.68,
      width,
      height,
    };
  }

  // --- frame -----------------------------------------------------------------
  draw(state) {
    const { ctx } = this;
    ctx.fillStyle = '#14101c';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const world = state.world;
    this.drawFloor(world);
    this.drawDesks(world);
    this.drawShelves(world);
    this.drawPages(world);
    this.drawExitDoor(world);
    this.drawCogs(world);
    this.drawPlayer(world);
    this.drawDust(world);
    this.drawSparks(world);
    this.drawNight(world);
    for (const guard of world.guards) this.drawVisionCone(guard);
    for (const guard of world.guards) this.drawGuard(guard, state.time);
    if (state.screen === 'play') this.drawHud(state);
    if (state.screen === 'title') this.drawTitleScreen(state);
    if (state.screen === 'paused') this.drawPausedScreen();
    if (state.screen === 'caught') this.drawCaughtScreen(state);
    if (state.screen === 'leveldone') this.drawLevelDoneScreen(state);
    if (state.screen === 'windone') this.drawWinScreen(state);
  }

  // --- the library -----------------------------------------------------------
  drawFloor(world) {
    const { ctx } = this;
    const random = makeRandom(42);
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        const tile = world.level.grid[ty][tx];
        const p = this.toScreen(tx * TILE, ty * TILE);
        const size = TILE * this.scale;
        if (tile === '#') {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(p.x, p.y, size, size);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(p.x, p.y, size, size * 0.18);
          continue;
        }
        const shadow = tile === ',';
        ctx.fillStyle = shadow ? COLORS.shadowFloor : (ty + tx) % 2 === 0 ? COLORS.floorLight : COLORS.floorDark;
        ctx.fillRect(p.x, p.y, size, size);
        ctx.strokeStyle = shadow ? COLORS.shadowFloorLine : COLORS.floorLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + size);
        ctx.lineTo(p.x + size, p.y + size);
        ctx.moveTo(p.x + size / 2, p.y);
        ctx.lineTo(p.x + size / 2, p.y + size);
        ctx.stroke();
        if (shadow && random() < 0.5) {
          // A faint crescent marks the dark corners where sentinels cannot see well.
          ctx.fillStyle = 'rgba(180, 200, 255, 0.16)';
          ctx.beginPath();
          ctx.arc(p.x + size * 0.72, p.y + size * 0.3, size * 0.12, 0.4, Math.PI * 1.5);
          ctx.fill();
        }
      }
    }
    for (const [tx, ty] of world.level.lanterns) {
      const p = this.toScreen((tx + 0.5) * TILE, (ty + 0.5) * TILE);
      const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 90 * this.scale);
      glow.addColorStop(0, 'rgba(255, 205, 110, 0.35)');
      glow.addColorStop(1, 'rgba(255, 205, 110, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 90 * this.scale, p.y - 90 * this.scale, 180 * this.scale, 180 * this.scale);
      ctx.fillStyle = '#2a1c0e';
      ctx.fillRect(p.x - 3 * this.scale, p.y - 10 * this.scale, 6 * this.scale, 14 * this.scale);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 4 * this.scale, 5 * this.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawShelves(world) {
    const { ctx } = this;
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        if (world.level.grid[ty][tx] !== 'S') continue;
        const p = this.toScreen(tx * TILE, ty * TILE);
        const size = TILE * this.scale;
        ctx.fillStyle = COLORS.shelf;
        ctx.fillRect(p.x, p.y, size, size);
        ctx.fillStyle = COLORS.shelfEdge;
        ctx.fillRect(p.x, p.y, size, size * 0.14);
        ctx.fillRect(p.x, p.y + size * 0.86, size, size * 0.14);
        // Book spines: a row of coloured stripes, seeded by tile.
        const spineCount = 6;
        for (let i = 0; i < spineCount; i += 1) {
          ctx.fillStyle = hashPick(tx * 7 + i, ty * 3 + i, SPINE_COLORS);
          const sx = p.x + size * (0.08 + (i * 0.84) / spineCount);
          ctx.fillRect(sx, p.y + size * 0.22, size * 0.1, size * 0.56);
        }
      }
    }
  }

  drawDesks(world) {
    const { ctx } = this;
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        if (world.level.grid[ty][tx] !== 'D') continue;
        const p = this.toScreen(tx * TILE, ty * TILE);
        const size = TILE * this.scale;
        ctx.fillStyle = COLORS.desk;
        ctx.fillRect(p.x + size * 0.06, p.y + size * 0.1, size * 0.88, size * 0.8);
        ctx.fillStyle = 'rgba(255, 240, 200, 0.25)';
        ctx.fillRect(p.x + size * 0.2, p.y + size * 0.28, size * 0.5, size * 0.34);
        ctx.strokeStyle = 'rgba(40, 26, 12, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x + size * 0.06, p.y + size * 0.1, size * 0.88, size * 0.8);
      }
    }
  }

  drawPages(world) {
    const { ctx } = this;
    for (const page of world.level.pages) {
      if (page.taken) continue;
      const centre = tileCentre(page.tx, page.ty);
      const p = this.toScreen(centre.x, centre.y);
      const size = 22 * this.scale;
      const pulse = 0.7 + Math.sin(world.time * 3 + page.tx) * 0.3;
      const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 30 * this.scale);
      glow.addColorStop(0, `rgba(255, 233, 168, ${0.5 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 233, 168, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 30 * this.scale, p.y - 30 * this.scale, 60 * this.scale, 60 * this.scale);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-0.25);
      ctx.fillStyle = COLORS.page;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.strokeStyle = '#b89a4a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.fillStyle = '#7a5c14';
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const px = Math.cos(angle) * size * 0.3;
        const py = Math.sin(angle) * size * 0.3;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawExitDoor(world) {
    const { ctx } = this;
    const centre = tileCentre(world.level.exit.tx, world.level.exit.ty);
    const p = this.toScreen(centre.x, centre.y);
    const open = world.exitOpen;
    const w = 34 * this.scale;
    const h = 40 * this.scale;
    const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, (open ? 90 : 40) * this.scale);
    glow.addColorStop(0, open ? 'rgba(255, 215, 106, 0.55)' : 'rgba(140, 150, 170, 0.2)');
    glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - 90 * this.scale, p.y - 90 * this.scale, 180 * this.scale, 180 * this.scale);
    ctx.fillStyle = open ? '#3a2a10' : '#20242e';
    ctx.beginPath();
    ctx.moveTo(p.x - w / 2, p.y + h / 2);
    ctx.lineTo(p.x - w / 2, p.y - h * 0.1);
    ctx.quadraticCurveTo(p.x, p.y - h * 0.75, p.x + w / 2, p.y - h * 0.1);
    ctx.lineTo(p.x + w / 2, p.y + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = open ? COLORS.exitOpen : COLORS.exitLocked;
    ctx.lineWidth = 2.5 * this.scale;
    ctx.stroke();
    if (!open) {
      ctx.strokeStyle = '#6a6f7e';
      ctx.lineWidth = 2 * this.scale;
      ctx.beginPath();
      ctx.moveTo(p.x - w / 2, p.y);
      ctx.lineTo(p.x + w / 2, p.y);
      ctx.moveTo(p.x - w / 2, p.y + h * 0.22);
      ctx.lineTo(p.x + w / 2, p.y + h * 0.22);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff3c4';
      ctx.font = `bold ${11 * this.scale}px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('ARCHIVE DOOR', p.x, p.y - h * 0.85);
    }
  }

  drawCogs(world) {
    const { ctx } = this;
    for (const cog of world.cogs) {
      const p = this.toScreen(cog.x, cog.y);
      const r = 7 * this.scale;
      ctx.fillStyle = '#c8a24a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6420';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (!cog.landed) {
        ctx.strokeStyle = 'rgba(255, 220, 130, 0.7)';
        ctx.lineWidth = 1.5 * this.scale;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 4 * this.scale, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawPlayer(world) {
    const { ctx } = this;
    const player = world.player;
    const p = this.toScreen(player.x, player.y);
    const r = 12 * this.scale;
    // A soft pool of light follows Wren, the archivist.
    const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 46 * this.scale);
    glow.addColorStop(0, 'rgba(120, 230, 210, 0.18)');
    glow.addColorStop(1, 'rgba(120, 230, 210, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - 46 * this.scale, p.y - 46 * this.scale, 92 * this.scale, 92 * this.scale);
    ctx.fillStyle = COLORS.playerDark;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.78, 0, Math.PI * 2);
    ctx.fill();
    // Hood point and eyes, facing the direction of travel.
    const fx = Math.cos(player.facing);
    const fy = Math.sin(player.facing);
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(p.x + fx * r * 1.25, p.y + fy * r * 1.25);
    ctx.lineTo(p.x - fy * r * 0.55 + fx * r * 0.3, p.y + fx * r * 0.55 + fy * r * 0.3);
    ctx.lineTo(p.x + fy * r * 0.55 + fx * r * 0.3, p.y - fx * r * 0.55 + fy * r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0f2a26';
    ctx.beginPath();
    ctx.arc(p.x + fx * r * 0.35 - fy * r * 0.28, p.y + fy * r * 0.35 + fx * r * 0.28, r * 0.12, 0, Math.PI * 2);
    ctx.arc(p.x + fx * r * 0.35 + fy * r * 0.28, p.y + fy * r * 0.35 - fx * r * 0.28, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    if (player.sneaking) {
      ctx.strokeStyle = 'rgba(63, 201, 184, 0.9)';
      ctx.lineWidth = 1.5 * this.scale;
      ctx.setLineDash([4 * this.scale, 4 * this.scale]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6 * this.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawDust(world) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(255, 240, 200, 0.35)';
    for (const mote of world.dust) {
      const p = this.toScreen(mote.x, mote.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, mote.size * this.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSparks(world) {
    const { ctx } = this;
    for (const spark of world.sparks) {
      const p = this.toScreen(spark.x, spark.y);
      const alpha = Math.max(0, spark.life / spark.maxLife);
      ctx.fillStyle = spark.kind === 'puff' ? `rgba(200, 180, 140, ${alpha * 0.5})` : `rgba(255, 230, 150, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (spark.kind === 'puff' ? 4 : 2.5) * this.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- night lighting ----------------------------------------------------------
  drawNight(world) {
    const { ctx, nightCanvas } = this;
    const nctx = nightCanvas.getContext('2d');
    nctx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
    nctx.fillStyle = COLORS.night;
    const worldTop = this.offsetY + HUD_HEIGHT * this.scale;
    nctx.fillRect(this.offsetX, worldTop, WORLD_W * this.scale, WORLD_H * this.scale);
    nctx.globalCompositeOperation = 'destination-out';
    const punch = (wx, wy, radius, strength) => {
      const p = this.toScreen(wx, wy);
      const gradient = nctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, radius * this.scale);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      nctx.fillStyle = gradient;
      nctx.beginPath();
      nctx.arc(p.x, p.y, radius * this.scale, 0, Math.PI * 2);
      nctx.fill();
    };
    punch(world.player.x, world.player.y, 150, 0.85);
    for (const [tx, ty] of world.level.lanterns) {
      const centre = tileCentre(tx, ty);
      punch(centre.x, centre.y, 120, 0.75);
    }
    const exitCentre = tileCentre(world.level.exit.tx, world.level.exit.ty);
    punch(exitCentre.x, exitCentre.y, world.exitOpen ? 150 : 70, 0.8);
    for (const page of world.level.pages) {
      if (page.taken) continue;
      const centre = tileCentre(page.tx, page.ty);
      punch(centre.x, centre.y, 55, 0.6);
    }
    nctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(nightCanvas, 0, 0);
  }

  // --- sentinels ---------------------------------------------------------------
  drawVisionCone(guard) {
    const { ctx } = this;
    const p = this.toScreen(guard.x, guard.y);
    const range = GUARD_CONE_RANGE * this.scale;
    const alert = guard.state === 'chase' || guard.state === 'search';
    const gradient = ctx.createRadialGradient(p.x, p.y, 6, p.x, p.y, range);
    gradient.addColorStop(0, alert ? 'rgba(255, 84, 64, 0.5)' : 'rgba(255, 205, 92, 0.42)');
    gradient.addColorStop(1, alert ? 'rgba(255, 84, 64, 0.02)' : 'rgba(255, 205, 92, 0.02)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, range, guard.facing - GUARD_CONE_HALF_ANGLE, guard.facing + GUARD_CONE_HALF_ANGLE);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = alert ? COLORS.coneAlertEdge : COLORS.coneEdge;
    ctx.lineWidth = 1.5 * this.scale;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(guard.facing - GUARD_CONE_HALF_ANGLE) * range, p.y + Math.sin(guard.facing - GUARD_CONE_HALF_ANGLE) * range);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(guard.facing + GUARD_CONE_HALF_ANGLE) * range, p.y + Math.sin(guard.facing + GUARD_CONE_HALF_ANGLE) * range);
    ctx.stroke();
  }

  drawGuard(guard, time) {
    const { ctx } = this;
    const p = this.toScreen(guard.x, guard.y);
    const r = 14 * this.scale;
    const alert = guard.state === 'chase';
    // Lantern light spilling from the sentinel.
    const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 60 * this.scale);
    glow.addColorStop(0, alert ? 'rgba(255, 90, 60, 0.3)' : 'rgba(255, 205, 110, 0.25)');
    glow.addColorStop(1, 'rgba(255, 205, 110, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - 60 * this.scale, p.y - 60 * this.scale, 120 * this.scale, 120 * this.scale);
    // Brass body with rivets.
    ctx.fillStyle = COLORS.guardDark;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a4d16';
    for (let i = 0; i < 6; i += 1) {
      const angle = (i * Math.PI * 2) / 6 + 0.3;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(angle) * r * 0.62, p.y + Math.sin(angle) * r * 0.62, 1.4 * this.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    // Winding key on its back, turning slowly — it is clockwork, after all.
    const keyAngle = time * 1.5;
    const bx = p.x - Math.cos(guard.facing) * r * 0.9;
    const by = p.y - Math.sin(guard.facing) * r * 0.9;
    ctx.strokeStyle = '#e8c268';
    ctx.lineWidth = 2 * this.scale;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - Math.cos(guard.facing) * 8 * this.scale, by - Math.sin(guard.facing) * 8 * this.scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      bx - Math.cos(guard.facing) * 11 * this.scale,
      by - Math.sin(guard.facing) * 11 * this.scale,
      3.5 * this.scale,
      keyAngle,
      keyAngle + Math.PI * 1.5,
    );
    ctx.stroke();
    // Glowing eyes, looking where it faces.
    const fx = Math.cos(guard.facing);
    const fy = Math.sin(guard.facing);
    ctx.fillStyle = alert ? '#ff3b2d' : '#ffe9a8';
    ctx.beginPath();
    ctx.arc(p.x + fx * r * 0.4 - fy * r * 0.3, p.y + fy * r * 0.4 + fx * r * 0.3, 2.4 * this.scale, 0, Math.PI * 2);
    ctx.arc(p.x + fx * r * 0.4 + fy * r * 0.3, p.y + fy * r * 0.4 - fx * r * 0.3, 2.4 * this.scale, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion arc above the sentinel: it fills as it grows sure of you.
    if (guard.suspicion > 4) {
      const arcR = (r + 8) * this.scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 3 * this.scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, arcR, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = guard.suspicion >= 100 ? '#ff3b2d' : guard.suspicion >= 35 ? '#ffb13b' : '#ffe9a8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, arcR, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
      ctx.stroke();
      if (guard.state === 'notice') {
        ctx.fillStyle = '#ffb13b';
        ctx.font = `bold ${16 * this.scale}px ${UI_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('?', p.x, p.y - (r + 14) * this.scale);
      }
      if (alert) {
        ctx.fillStyle = '#ff3b2d';
        ctx.font = `bold ${16 * this.scale}px ${UI_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('!', p.x, p.y - (r + 14) * this.scale);
      }
    }
  }

  // --- HUD and screens ---------------------------------------------------------
  drawHud(state) {
    const { ctx } = this;
    const world = state.world;
    const barH = HUD_HEIGHT * this.scale;
    ctx.fillStyle = 'rgba(16, 12, 24, 0.92)';
    ctx.fillRect(0, 0, this.canvas.width, barH);
    ctx.fillStyle = 'rgba(255, 215, 106, 0.25)';
    ctx.fillRect(0, barH - 2, this.canvas.width, 2);
    const pad = 18 * this.scale;
    ctx.fillStyle = '#ffe9a8';
    ctx.font = `bold ${15 * this.scale}px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(world.level.name, pad, barH / 2);
    // Pages collected.
    const pages = world.level.pages.length;
    const pageX = this.canvas.width * 0.42;
    ctx.textAlign = 'left';
    for (let i = 0; i < pages; i += 1) {
      const taken = world.level.pages[i].taken;
      ctx.fillStyle = taken ? '#ffd76a' : 'rgba(255, 233, 168, 0.25)';
      ctx.beginPath();
      const cx = pageX + i * 26 * this.scale;
      const cy = barH / 2;
      for (let k = 0; k < 5; k += 1) {
        const angle = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        const px = cx + Math.cos(angle) * 8 * this.scale;
        const py = cy + Math.sin(angle) * 8 * this.scale;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#c9c2b2';
    ctx.font = `${13 * this.scale}px ${UI_FONT}`;
    ctx.fillText(`${world.pagesTaken}/${pages} star-charts`, pageX + pages * 26 * this.scale + 6, barH / 2);
    // Detection meter.
    const meterW = 190 * this.scale;
    const meterX = this.canvas.width - meterW - pad - 120 * this.scale;
    const danger = world.danger;
    const label = world.anyChase ? 'SPOTTED!' : danger >= 35 ? 'SUSPICIOUS' : 'UNSEEN';
    ctx.fillStyle = world.anyChase ? '#ff6a55' : danger >= 35 ? '#ffb13b' : '#7ee2c8';
    ctx.font = `bold ${13 * this.scale}px ${UI_FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(label, meterX - 10 * this.scale, barH / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(meterX, barH / 2 - 7 * this.scale, meterW, 14 * this.scale);
    ctx.fillStyle = world.anyChase ? '#ff3b2d' : danger >= 35 ? '#ffb13b' : '#7ee2c8';
    ctx.fillRect(meterX, barH / 2 - 7 * this.scale, meterW * (danger / 100), 14 * this.scale);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(meterX, barH / 2 - 7 * this.scale, meterW, 14 * this.scale);
    // Cogs and time, far right.
    ctx.fillStyle = '#e8c268';
    ctx.textAlign = 'right';
    ctx.font = `${13 * this.scale}px ${UI_FONT}`;
    const minutes = Math.floor(world.time / 60);
    const seconds = Math.floor(world.time % 60).toString().padStart(2, '0');
    ctx.fillText(`⚙ ${world.cogCount}   ${minutes}:${seconds}`, this.canvas.width - pad, barH / 2);
    ctx.textBaseline = 'alphabetic';
    if (world.anyChase) {
      ctx.fillStyle = '#ff3b2d';
      ctx.font = `bold ${13 * this.scale}px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('— BREAK LINE OF SIGHT TO LOSE THEM —', this.canvas.width / 2, barH + 18 * this.scale);
    }
  }

  dimWorld(alpha) {
    const { ctx } = this;
    ctx.fillStyle = `rgba(8, 8, 18, ${alpha})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawTitleScreen(state) {
    this.dimWorld(0.62);
    const { ctx } = this;
    const cx = this.canvas.width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = `bold ${64 * this.scale}px ${TITLE_FONT}`;
    ctx.fillText('GLIMMERWICK', cx, this.canvas.height * 0.26);
    ctx.fillStyle = '#e8ddc0';
    ctx.font = `${19 * this.scale}px ${TITLE_FONT}`;
    ctx.fillText('Return the stolen star-map to the Archive Door — unseen.', cx, this.canvas.height * 0.33);
    ctx.fillStyle = '#c9c2b2';
    ctx.font = `${15 * this.scale}px ${UI_FONT}`;
    const lines = [
      'WASD / Arrows — move      Shift — sneak (slow, quiet, harder to see)',
      'E — toss a brass cog to lure a sentinel      R — restart the floor      M — mute',
      'Stay out of the lantern cones. Hide behind shelves. Linger in the dark.',
      'Collect all three star-charts and the Archive Door opens.',
    ];
    lines.forEach((line, i) => {
      ctx.fillText(line, cx, this.canvas.height * (0.44 + i * 0.05));
    });
    const button = this.titleButtonRect();
    const hover = state.mouse.x >= button.x && state.mouse.x <= button.x + button.width
      && state.mouse.y >= button.y && state.mouse.y <= button.y + button.height;
    ctx.fillStyle = hover ? '#ffd76a' : '#c9a227';
    ctx.fillRect(button.x, button.y, button.width, button.height);
    ctx.fillStyle = '#241a12';
    ctx.font = `bold ${19 * this.scale}px ${UI_FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('BEGIN THE SNEAK', cx, button.y + button.height / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(201, 194, 178, 0.75)';
    ctx.font = `${13 * this.scale}px ${UI_FONT}`;
    ctx.fillText('or press Enter', cx, button.y + button.height + 26 * this.scale);
  }

  drawPausedScreen() {
    this.dimWorld(0.55);
    const { ctx } = this;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = `bold ${44 * this.scale}px ${TITLE_FONT}`;
    ctx.fillText('Paused', this.canvas.width / 2, this.canvas.height * 0.45);
    ctx.fillStyle = '#c9c2b2';
    ctx.font = `${16 * this.scale}px ${UI_FONT}`;
    ctx.fillText('Press P or Esc to keep sneaking.', this.canvas.width / 2, this.canvas.height * 0.53);
  }

  drawCaughtScreen(state) {
    this.dimWorld(0.55);
    const { ctx } = this;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6a55';
    ctx.font = `bold ${54 * this.scale}px ${TITLE_FONT}`;
    ctx.fillText('CAUGHT!', this.canvas.width / 2, this.canvas.height * 0.4);
    ctx.fillStyle = '#e8ddc0';
    ctx.font = `${18 * this.scale}px ${UI_FONT}`;
    ctx.fillText('The sentinel’s lantern found you. The star-map stays hidden — for now.', this.canvas.width / 2, this.canvas.height * 0.48);
    ctx.fillStyle = '#c9c2b2';
    ctx.font = `${15 * this.scale}px ${UI_FONT}`;
    ctx.fillText(`Floor ${state.world.levelIndex + 1} · ${state.world.pagesTaken} of 3 star-charts recovered`, this.canvas.width / 2, this.canvas.height * 0.55);
    ctx.fillText('Press R or click to try the floor again.', this.canvas.width / 2, this.canvas.height * 0.62);
  }

  drawLevelDoneScreen(state) {
    this.dimWorld(0.5);
    const { ctx } = this;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = `bold ${48 * this.scale}px ${TITLE_FONT}`;
    ctx.fillText('Floor cleared!', this.canvas.width / 2, this.canvas.height * 0.38);
    ctx.fillStyle = '#e8ddc0';
    ctx.font = `${18 * this.scale}px ${UI_FONT}`;
    ctx.fillText('The Archive Door closes behind you. The next floor hums with clockwork.', this.canvas.width / 2, this.canvas.height * 0.46);
    ctx.fillStyle = '#c9c2b2';
    ctx.font = `${15 * this.scale}px ${UI_FONT}`;
    ctx.fillText(`Time on this floor: ${formatTime(state.world.time)}`, this.canvas.width / 2, this.canvas.height * 0.54);
    ctx.fillText('Press Enter or click for the next floor.', this.canvas.width / 2, this.canvas.height * 0.61);
  }

  drawWinScreen(state) {
    this.dimWorld(0.55);
    const { ctx } = this;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = `bold ${52 * this.scale}px ${TITLE_FONT}`;
    ctx.fillText('The Star-Map is Home', this.canvas.width / 2, this.canvas.height * 0.36);
    ctx.fillStyle = '#e8ddc0';
    ctx.font = `${19 * this.scale}px ${TITLE_FONT}`;
    ctx.fillText('Three floors, three charts, not a single alarm that kept you.', this.canvas.width / 2, this.canvas.height * 0.44);
    ctx.fillStyle = '#c9c2b2';
    ctx.font = `${15 * this.scale}px ${UI_FONT}`;
    ctx.fillText(`Total time: ${formatTime(state.totalTime)} · Times caught: ${state.timesCaught}`, this.canvas.width / 2, this.canvas.height * 0.52);
    ctx.fillText('Press Enter or click to sneak it all again.', this.canvas.width / 2, this.canvas.height * 0.6);
  }
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}
