import { midiToFrequency, pitchClassToMidi, type Dyad } from "./chord.js";

// Minimal Web Audio synth. Two sine voices with a soft envelope so successive
// chords do not click. No external dep.
export class DyadSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices: OscillatorNode[] = [];
  private envelopes: GainNode[] = [];

  private ensureContext(): { ctx: AudioContext; master: GainNode } {
    if (this.ctx && this.master) return { ctx: this.ctx, master: this.master };
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return { ctx, master };
  }

  async resume(): Promise<void> {
    const { ctx } = this.ensureContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  playDyad(dyad: Dyad, octave: number, durationSec: number): void {
    const { ctx, master } = this.ensureContext();
    this.stopAll();

    const now = ctx.currentTime;
    const attack = 0.01;
    const release = Math.min(0.08, durationSec * 0.35);
    const sustainEnd = Math.max(attack + 0.001, durationSec - release);

    for (const pc of [dyad.a, dyad.b]) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      const midi = pitchClassToMidi(pc, octave);
      osc.frequency.value = midiToFrequency(midi);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(0.9, now + attack);
      env.gain.setValueAtTime(0.9, now + sustainEnd);
      env.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      osc.connect(env);
      env.connect(master);
      osc.start(now);
      osc.stop(now + durationSec + 0.02);
      this.voices.push(osc);
      this.envelopes.push(env);
    }
  }

  stopAll(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const env of this.envelopes) {
      try {
        env.gain.cancelScheduledValues(now);
        env.gain.setValueAtTime(env.gain.value, now);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      } catch {
        // Node may already be disconnected — ignore.
      }
    }
    for (const osc of this.voices) {
      try {
        osc.stop(now + 0.04);
      } catch {
        // Already stopped — ignore.
      }
    }
    this.voices = [];
    this.envelopes = [];
  }
}
