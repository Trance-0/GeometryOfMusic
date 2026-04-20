import { midiToFrequency, pitchClassToMidi, type Dyad } from "./chord.js";

export type InstrumentId = "triangle" | "sine" | "sawtooth" | "square";

export interface InstrumentDef {
  readonly label: string;
  readonly wave: OscillatorType;
  readonly baseGain: number;
  readonly attack: number;
  readonly release: number;
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentDef> = {
  triangle: {
    label: "Triangle lead",
    wave: "triangle",
    baseGain: 0.32,
    attack: 0.008,
    release: 0.08,
  },
  sine: {
    label: "Sine bass",
    wave: "sine",
    baseGain: 0.42,
    attack: 0.012,
    release: 0.12,
  },
  sawtooth: {
    label: "Saw pad",
    wave: "sawtooth",
    baseGain: 0.14,
    attack: 0.05,
    release: 0.18,
  },
  square: {
    label: "Square pluck",
    wave: "square",
    baseGain: 0.14,
    attack: 0.004,
    release: 0.05,
  },
};

export const INSTRUMENT_IDS: readonly InstrumentId[] = [
  "triangle",
  "sine",
  "sawtooth",
  "square",
];

interface ActiveVoice {
  osc: OscillatorNode;
  env: GainNode;
}

/**
 * Multi-track Web Audio synth. Each track owns a gain bus so tracks can be
 * muted / mixed independently; voices scheduled on a track go through
 * `track.out -> master -> destination`.
 */
export class SynthEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private trackBuses: GainNode[] = [];
  private trackInstruments: InstrumentId[] = [];
  private trackMuted: boolean[] = [];
  private active: ActiveVoice[] = [];
  private readonly trackCount: number;

  constructor(trackCount: number, defaults: readonly InstrumentId[]) {
    this.trackCount = trackCount;
    for (let i = 0; i < trackCount; i++) {
      this.trackInstruments.push(defaults[i] ?? "triangle");
      this.trackMuted.push(false);
    }
  }

  private ensureContext(): { ctx: AudioContext; master: GainNode } {
    if (this.ctx && this.master) {
      return { ctx: this.ctx, master: this.master };
    }
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    for (let i = 0; i < this.trackCount; i++) {
      const bus = ctx.createGain();
      bus.gain.value = this.trackMuted[i] ? 0 : 1;
      bus.connect(master);
      this.trackBuses.push(bus);
    }
    return { ctx, master };
  }

  async resume(): Promise<void> {
    const { ctx } = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
  }

  setInstrument(trackIndex: number, inst: InstrumentId): void {
    if (trackIndex < 0 || trackIndex >= this.trackCount) return;
    this.trackInstruments[trackIndex] = inst;
  }

  getInstrument(trackIndex: number): InstrumentId {
    return this.trackInstruments[trackIndex] ?? "triangle";
  }

  setMuted(trackIndex: number, muted: boolean): void {
    if (trackIndex < 0 || trackIndex >= this.trackCount) return;
    this.trackMuted[trackIndex] = muted;
    const bus = this.trackBuses[trackIndex];
    if (bus && this.ctx) {
      bus.gain.cancelScheduledValues(this.ctx.currentTime);
      bus.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.01);
    }
  }

  isMuted(trackIndex: number): boolean {
    return this.trackMuted[trackIndex] ?? false;
  }

  /**
   * Trigger a short, enveloped dyad on one track. Each of the two pitches
   * becomes its own oscillator; both share the track bus. Duration in
   * seconds is the total envelope length, attack+release are baked into it.
   */
  playDyad(
    trackIndex: number,
    dyad: Dyad,
    octave: number,
    durationSec: number,
  ): void {
    const { ctx } = this.ensureContext();
    const bus = this.trackBuses[trackIndex];
    if (!bus) return;
    const inst = INSTRUMENTS[this.trackInstruments[trackIndex] ?? "triangle"];
    const now = ctx.currentTime;
    const attack = Math.min(inst.attack, durationSec * 0.4);
    const release = Math.min(inst.release, durationSec * 0.5);
    const sustainEnd = Math.max(attack + 0.001, durationSec - release);

    for (const pc of [dyad.a, dyad.b]) {
      const osc = ctx.createOscillator();
      osc.type = inst.wave;
      osc.frequency.value = midiToFrequency(pitchClassToMidi(pc, octave));
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(inst.baseGain, now + attack);
      env.gain.setValueAtTime(inst.baseGain, now + sustainEnd);
      env.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      osc.connect(env);
      env.connect(bus);
      osc.start(now);
      osc.stop(now + durationSec + 0.02);
      this.active.push({ osc, env });
    }
  }

  stopAll(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const { osc, env } of this.active) {
      try {
        env.gain.cancelScheduledValues(now);
        env.gain.setValueAtTime(Math.max(env.gain.value, 0.0001), now);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      } catch {
        /* node already disconnected — ignore */
      }
      try {
        osc.stop(now + 0.04);
      } catch {
        /* already stopped — ignore */
      }
    }
    this.active = [];
  }
}
