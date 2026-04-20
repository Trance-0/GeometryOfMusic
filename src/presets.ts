import type { Dyad, PitchClass } from "./chord.js";

export interface PresetPlacement {
  readonly track: number; // 0 = lead, 1 = bass, 2 = pad
  readonly cell: number;
  readonly dyad: Dyad;
  readonly duration: number;
}

export interface Preset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly meter: string; // "3/4" | "4/4" | "6/8"
  readonly bars: number;
  readonly cellsPerBar: number;
  readonly placements: readonly PresetPlacement[];
}

// Helpers — make the preset tables readable instead of a wall of numbers.
const d = (a: number, b: number): Dyad => ({
  a: (((a % 12) + 12) % 12) as PitchClass,
  b: (((b % 12) + 12) % 12) as PitchClass,
});

/**
 * Each chord in a preset is voiced across three tracks:
 *   lead  = root + third
 *   bass  = root + fifth / seventh
 *   pad   = third + fifth / other inner interval
 * The goal is a recognizable color per chord while keeping dyad motion
 * musical (no third or fifth jumps larger than a perfect fourth in a
 * voice). Use `voice` to place one chord across all three tracks at the
 * same cell.
 */
interface ChordVoicing {
  readonly lead: Dyad;
  readonly bass: Dyad;
  readonly pad: Dyad;
}

function voice(
  cell: number,
  duration: number,
  v: ChordVoicing,
): PresetPlacement[] {
  return [
    { track: 0, cell, dyad: v.lead, duration },
    { track: 1, cell, dyad: v.bass, duration },
    { track: 2, cell, dyad: v.pad, duration },
  ];
}

// Common voicings reused across presets.
const C_MAJ: ChordVoicing = { lead: d(0, 4), bass: d(0, 7), pad: d(4, 7) };
const C_MAJ7: ChordVoicing = { lead: d(0, 4), bass: d(0, 7), pad: d(4, 11) };
const G_MAJ: ChordVoicing = { lead: d(7, 11), bass: d(7, 2), pad: d(11, 2) };
const G_DOM7: ChordVoicing = { lead: d(7, 11), bass: d(7, 5), pad: d(11, 2) };
const F_MAJ: ChordVoicing = { lead: d(5, 9), bass: d(5, 0), pad: d(9, 0) };
const F_DOM7: ChordVoicing = { lead: d(5, 9), bass: d(5, 3), pad: d(9, 0) };
const A_MIN: ChordVoicing = { lead: d(9, 0), bass: d(9, 4), pad: d(0, 4) };
const D_MIN: ChordVoicing = { lead: d(2, 5), bass: d(2, 9), pad: d(5, 9) };
const C_DOM7: ChordVoicing = { lead: d(0, 4), bass: d(0, 10), pad: d(4, 7) };

// D major family for Pachelbel.
const D_MAJ: ChordVoicing = { lead: d(2, 6), bass: d(2, 9), pad: d(6, 9) };
const A_MAJ: ChordVoicing = { lead: d(9, 1), bass: d(9, 4), pad: d(1, 4) };
const B_MIN: ChordVoicing = { lead: d(11, 2), bass: d(11, 6), pad: d(2, 6) };
const FS_MIN: ChordVoicing = { lead: d(6, 9), bass: d(6, 1), pad: d(9, 1) };
const G_MAJ_D: ChordVoicing = { lead: d(7, 11), bass: d(7, 2), pad: d(11, 2) };

/**
 * I–V–vi–IV ("axis of awesome" progression).
 * Pop songs that walk this path include "Let It Be", "Don't Stop Believin'",
 * "With or Without You", "No Woman, No Cry", and many, many others.
 * Four bars of 4/4, one chord per bar.
 */
const I_V_vi_IV: Preset = {
  id: "iVviIV",
  name: "I–V–vi–IV (C major)",
  description: "The 'axis' pop progression (Let It Be, Don't Stop Believin').",
  meter: "4/4",
  bars: 4,
  cellsPerBar: 8,
  placements: [
    ...voice(0, 8, C_MAJ),
    ...voice(8, 8, G_MAJ),
    ...voice(16, 8, A_MIN),
    ...voice(24, 8, F_MAJ),
  ],
};

/**
 * Pachelbel's Canon in D. The famous eight-bar ground bass compressed
 * into four bars of 4/4 with one chord every half note.
 *   D – A – Bm – F#m – G – D – G – A
 */
const PACHELBEL: Preset = {
  id: "pachelbel",
  name: "Pachelbel's Canon (D major)",
  description: "Eight-chord ground bass compressed to four bars.",
  meter: "4/4",
  bars: 4,
  cellsPerBar: 8,
  placements: [
    ...voice(0, 4, D_MAJ),
    ...voice(4, 4, A_MAJ),
    ...voice(8, 4, B_MIN),
    ...voice(12, 4, FS_MIN),
    ...voice(16, 4, G_MAJ_D),
    ...voice(20, 4, D_MAJ),
    ...voice(24, 4, G_MAJ_D),
    ...voice(28, 4, A_MAJ),
  ],
};

/**
 * Standard 12-bar blues in C:
 *   I I I I IV IV I I V IV I V
 * Dominant-seventh voicings where the form traditionally uses them.
 * Twelve bars of 4/4 at cellsPerBar = 2 so the grid stays ergonomic.
 */
const BLUES_12: Preset = {
  id: "blues12",
  name: "12-bar blues (C)",
  description: "Classic 12-bar form with dominant sevenths on IV and V.",
  meter: "4/4",
  bars: 12,
  cellsPerBar: 2,
  placements: [
    ...voice(0, 2, C_MAJ),
    ...voice(2, 2, C_MAJ),
    ...voice(4, 2, C_MAJ),
    ...voice(6, 2, C_DOM7),
    ...voice(8, 2, F_MAJ),
    ...voice(10, 2, F_DOM7),
    ...voice(12, 2, C_MAJ),
    ...voice(14, 2, C_MAJ),
    ...voice(16, 2, G_DOM7),
    ...voice(18, 2, F_DOM7),
    ...voice(20, 2, C_MAJ),
    ...voice(22, 2, G_DOM7),
  ],
};

/**
 * ii–V–I jazz turnaround in C, resolving to C major 7. Two bars of
 * ii–V then two bars sitting on I to emphasize the resolution.
 */
const II_V_I: Preset = {
  id: "iiVI",
  name: "ii–V–I (C major)",
  description: "Jazz turnaround: Dm7 – G7 – Cmaj7.",
  meter: "4/4",
  bars: 4,
  cellsPerBar: 8,
  placements: [
    ...voice(0, 8, D_MIN),
    ...voice(8, 8, G_DOM7),
    ...voice(16, 16, C_MAJ7),
  ],
};

export const PRESETS: readonly Preset[] = [
  I_V_vi_IV,
  PACHELBEL,
  BLUES_12,
  II_V_I,
];

export function findPreset(id: string): Preset | null {
  return PRESETS.find((p) => p.id === id) ?? null;
}
