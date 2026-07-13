/** Minimal WebAudio synth — every sound is a single ramped oscillator. */
type OscType = OscillatorType;

export class Sfx {
  ctx: AudioContext | null = null;
  muted = false;

  ensure(): void {
    if (!this.ctx) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      } catch {
        /* audio unavailable — game stays silent */
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  tone(f0: number, f1: number, dur: number, type: OscType = 'sine', gain = 0.08, when = 0): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  pickup(): void {
    this.tone(660, 990, 0.12, 'sine', 0.09);
    this.tone(990, 1480, 0.14, 'sine', 0.07, 0.09);
  }
  item(): void {
    this.tone(440, 660, 0.1, 'triangle', 0.08);
  }
  use(): void {
    this.tone(300, 520, 0.14, 'triangle', 0.07);
  }
  alert(): void {
    this.tone(340, 210, 0.16, 'square', 0.05);
  }
  spotted(): void {
    this.tone(520, 520, 0.09, 'square', 0.06);
    this.tone(520, 520, 0.09, 'square', 0.06, 0.12);
  }
  fail(): void {
    this.tone(330, 110, 0.5, 'sawtooth', 0.06);
  }
  clear(): void {
    const f = [523, 659, 784, 1046];
    for (let i = 0; i < 4; i++) this.tone(f[i], f[i], 0.16, 'sine', 0.08, i * 0.11);
  }
  dash(): void {
    this.tone(180, 420, 0.1, 'triangle', 0.05);
  }
  ui(): void {
    this.tone(880, 880, 0.05, 'sine', 0.05);
  }
}
