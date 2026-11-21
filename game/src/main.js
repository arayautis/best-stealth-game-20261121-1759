// Glimmerwick — the game loop and the screens.
// One job: own the screens (title, play, paused, caught, floor cleared,
// victory), feed input into the world each frame, and hand frames to the
// renderer. In ?shot= mode it stages a screenshot scene instead of playing.
import { STEP } from './config.js';
import { LEVELS } from './levels.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { stageShot } from './shots.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.sound = new SoundEngine();
    this.levelIndex = 0;
    this.world = new World(0, this.sound);
    this.screen = 'title';
    this.totalTime = 0;
    this.timesCaught = 0;
    this.time = 0;
    this.shotMode = new URLSearchParams(window.location.search).get('shot');
    this.lastTimestamp = 0;
    this.status = document.getElementById('status');
  }

  start() {
    if (this.shotMode) {
      stageShot(this.shotMode, this);
      this.draw();
      // Keep drawing: the screenshot driver waits a beat before capturing.
      const loop = () => {
        this.time += STEP;
        this.draw();
        window.requestAnimationFrame(loop);
      };
      window.requestAnimationFrame(loop);
      return;
    }
    window.requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  frame(timestamp) {
    const dt = Math.min(0.05, this.lastTimestamp ? (timestamp - this.lastTimestamp) / 1000 : STEP);
    this.lastTimestamp = timestamp;
    this.time += dt;
    this.update(dt);
    this.draw();
    this.input.endFrame();
    window.requestAnimationFrame((next) => this.frame(next));
  }

  update(dt) {
    const input = this.input;
    if (input.wasPressed('m')) this.sound.setMuted(!this.sound.muted);

    if (this.screen === 'title') {
      if (input.wasPressed('enter') || this.clickedButton()) {
        this.sound.ensure();
        this.screen = 'play';
      }
      return;
    }
    if (this.screen === 'paused') {
      if (input.wasPressed('p') || input.wasPressed('escape')) this.screen = 'play';
      return;
    }
    if (this.screen === 'caught') {
      if (input.wasPressed('r') || input.consumeClick()) {
        this.world.reset();
        this.screen = 'play';
      }
      return;
    }
    if (this.screen === 'leveldone') {
      if (input.wasPressed('enter') || input.consumeClick()) {
        this.totalTime += this.world.time;
        this.levelIndex += 1;
        this.world = new World(this.levelIndex, this.sound);
        this.screen = 'play';
      }
      return;
    }
    if (this.screen === 'windone') {
      if (input.wasPressed('enter') || input.consumeClick()) {
        this.levelIndex = 0;
        this.totalTime = 0;
        this.timesCaught = 0;
        this.world = new World(0, this.sound);
        this.screen = 'play';
      }
      return;
    }

    // Playing.
    if (input.wasPressed('p') || input.wasPressed('escape')) {
      this.screen = 'paused';
      return;
    }
    if (input.wasPressed('r')) {
      this.world.reset();
      return;
    }
    const move = input.moveVector();
    const throwCog = input.wasPressed('e');
    this.world.step(dt, move, input.sneaking, throwCog);
    if (this.world.caught) {
      this.timesCaught += 1;
      this.screen = 'caught';
      this.announce('Caught! Press R to try the floor again.');
    } else if (this.world.levelComplete) {
      if (this.levelIndex >= LEVELS.length - 1) {
        this.totalTime += this.world.time;
        this.screen = 'windone';
        this.announce('The star-map is home. You win!');
      } else {
        this.screen = 'leveldone';
        this.announce('Floor cleared! Press Enter for the next floor.');
      }
    }
  }

  /** True when the title screen's button was clicked. */
  clickedButton() {
    const click = this.input.consumeClick();
    if (!click) return false;
    const button = this.renderer.titleButtonRect();
    return (
      click.x >= button.x &&
      click.x <= button.x + button.width &&
      click.y >= button.y &&
      click.y <= button.y + button.height
    );
  }

  announce(message) {
    if (this.status) this.status.textContent = message;
  }

  draw() {
    this.renderer.draw({
      world: this.world,
      screen: this.screen,
      time: this.time,
      totalTime: this.totalTime,
      timesCaught: this.timesCaught,
      mouse: this.input.mouse,
    });
  }
}

const game = new Game();
window.__glimmerwick = game; // play-test hook: read state from the console
game.start();
