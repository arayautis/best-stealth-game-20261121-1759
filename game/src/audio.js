// Glimmerwick — every sound is synthesized with WebAudio: no audio files.
// One job: footsteps, chimes, the alarm sting, the cog clatter and the
// clockwork ambience, all from oscillators and filtered noise.
export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.ambientNodes = null;
  }

  /** Create the context on the first user gesture (browsers demand one). */
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
    this.startAmbient();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  /** A low clockwork drone with a soft tick, so the library feels alive. */
  startAmbient() {
    const ctx = this.context;
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.035;
    drone.connect(droneGain);
    droneGain.connect(this.master);
    drone.start();
    const tickGain = ctx.createGain();
    tickGain.gain.value = 0;
    tickGain.connect(this.master);
    const tick = () => {
      if (!this.muted && this.context) {
        this.blip(1900, 0.03, 0.05, 'square');
      }
      this.ambientTimer = window.setTimeout(tick, 1200);
    };
    this.ambientTimer = window.setTimeout(tick, 1200);
    this.ambientNodes = { drone, droneGain };
  }

  /** One short tone. */
  blip(frequency, duration, volume, type = 'sine') {
    if (!this.context || this.muted) return;
    const ctx = this.context;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  /** A burst of filtered noise (footsteps, clatter). */
  noiseBurst(duration, volume, filterFrequency) {
    if (!this.context || this.muted) return;
    const ctx = this.context;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  /** Soft wooden footstep; quieter and higher when sneaking. */
  footstep(sneaking) {
    this.noiseBurst(0.07, sneaking ? 0.05 : 0.13, sneaking ? 900 : 500);
  }

  /** A brass cog bounces: two metallic pings. */
  cogClatter() {
    this.blip(1320, 0.12, 0.16, 'square');
    window.setTimeout(() => this.blip(990, 0.15, 0.12, 'square'), 90);
    this.noiseBurst(0.1, 0.1, 3000);
  }

  /** Page collected: a bright little chime. */
  pageChime() {
    this.blip(660, 0.18, 0.16);
    window.setTimeout(() => this.blip(990, 0.25, 0.16), 90);
  }

  /** Spotted: a harsh two-tone alarm sting. */
  alarm() {
    this.blip(392, 0.16, 0.22, 'sawtooth');
    window.setTimeout(() => this.blip(311, 0.22, 0.22, 'sawtooth'), 140);
  }

  /** Guard loses you: a low settling note. */
  calmDown() {
    this.blip(220, 0.3, 0.12, 'triangle');
  }

  /** Level done: a rising arpeggio. */
  winArpeggio() {
    [523, 659, 784, 1047].forEach((frequency, index) => {
      window.setTimeout(() => this.blip(frequency, 0.3, 0.16), index * 110);
    });
  }

  /** Caught: a dull descending thud. */
  caughtThud() {
    this.blip(180, 0.4, 0.22, 'sawtooth');
    window.setTimeout(() => this.blip(120, 0.5, 0.2, 'sawtooth'), 160);
  }
}
