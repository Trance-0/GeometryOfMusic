export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const PITCH_NAMES: readonly string[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const INTERVAL_NAMES: readonly string[] = [
  "unison",
  "min 2nd",
  "maj 2nd",
  "min 3rd",
  "maj 3rd",
  "P 4th",
  "tritone",
  "P 5th",
  "min 6th",
  "maj 6th",
  "min 7th",
  "maj 7th",
];

export interface Dyad {
  readonly a: PitchClass;
  readonly b: PitchClass;
}

export function dyadKey(d: Dyad): string {
  return `${d.a}-${d.b}`;
}

export function dyadFromKey(key: string): Dyad {
  const [a, b] = key.split("-").map((s) => Number.parseInt(s, 10));
  return { a: a as PitchClass, b: b as PitchClass };
}

export function dyadInterval(d: Dyad): number {
  return (((d.b - d.a) % 12) + 12) % 12;
}

export function dyadName(d: Dyad): string {
  return `${PITCH_NAMES[d.a]}–${PITCH_NAMES[d.b]}`;
}

// MIDI note 60 = C4. Equal-tempered frequency in Hz.
export function pitchClassToMidi(pc: PitchClass, octave: number): number {
  return 12 * (octave + 1) + pc;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 12 interval classes, distinguishable colors. Order matches INTERVAL_NAMES.
// Picked for perceptual spread on a dark background; avoids pure red/green.
export const INTERVAL_COLORS: readonly string[] = [
  "#6b7687", // unison — muted grey (rare / self-edge)
  "#ff6b7a", // min 2nd
  "#ff9f43", // maj 2nd
  "#ffd166", // min 3rd
  "#a0e86f", // maj 3rd
  "#4ecdc4", // P 4th
  "#9b6bff", // tritone
  "#4ea1ff", // P 5th
  "#f78ae0", // min 6th
  "#ffb454", // maj 6th
  "#7adcc0", // min 7th
  "#d4bfff", // maj 7th
];
