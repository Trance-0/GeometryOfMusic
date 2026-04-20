import { DyadSynth } from "./audio.js";
import {
  PITCH_NAMES,
  dyadInterval,
  dyadName,
  INTERVAL_NAMES,
  type Dyad,
  type PitchClass,
} from "./chord.js";
import { mountNavbar } from "./navbar.js";
import { TimelineView } from "./timeline-view.js";
import { TorusView } from "./torus-view.js";

interface AppState {
  currentDyad: Dyad;
  octave: number;
  bpm: number;
  meter: string; // "3/4" | "4/4" | "6/8"
  cellsPerBar: number;
  bars: number;
  playing: boolean;
  playheadIndex: number | null;
  schedulerId: number | null;
}

const state: AppState = {
  currentDyad: { a: 0, b: 4 }, // C–E major third
  octave: 4,
  bpm: 100,
  meter: "4/4",
  cellsPerBar: 8,
  bars: 4,
  playing: false,
  playheadIndex: null,
  schedulerId: null,
};

const meterBeats = (meter: string): number => {
  const top = Number.parseInt(meter.split("/")[0] ?? "4", 10);
  return Number.isFinite(top) && top > 0 ? top : 4;
};

function mountNotePickers(): { selA: HTMLSelectElement; selB: HTMLSelectElement } {
  const selA = document.getElementById("note-a") as HTMLSelectElement;
  const selB = document.getElementById("note-b") as HTMLSelectElement;
  for (let i = 0; i < 12; i++) {
    const optA = document.createElement("option");
    optA.value = String(i);
    optA.textContent = PITCH_NAMES[i] ?? String(i);
    const optB = optA.cloneNode(true) as HTMLOptionElement;
    selA.appendChild(optA);
    selB.appendChild(optB);
  }
  selA.value = String(state.currentDyad.a);
  selB.value = String(state.currentDyad.b);
  return { selA, selB };
}

function updateChordLabel(): void {
  const el = document.getElementById("chord-name");
  if (!el) return;
  const ic = dyadInterval(state.currentDyad);
  el.textContent = `${dyadName(state.currentDyad)}  ·  ${INTERVAL_NAMES[ic] ?? ""}`;
}

function buildLegend(torus: TorusView): void {
  const legend = document.getElementById("lattice-legend");
  if (!legend) return;
  legend.textContent = "";
  const title = document.createElement("div");
  title.textContent = "Interval class (color)";
  title.style.gridColumn = "1 / -1";
  title.style.color = "var(--text)";
  title.style.fontWeight = "600";
  legend.appendChild(title);
  for (const [i, entry] of torus.legendEntries().entries()) {
    if (i >= 12) break;
    const row = document.createElement("div");
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = entry.color;
    row.appendChild(sw);
    row.appendChild(document.createTextNode(INTERVAL_NAMES[i] ?? entry.label));
    legend.appendChild(row);
  }
}

function firstScheduledChord(timeline: TimelineView): Dyad | null {
  const chords = timeline.getChords();
  for (const c of chords) if (c) return c;
  return null;
}

function progressionPath(timeline: TimelineView): readonly Dyad[] {
  const out: Dyad[] = [];
  for (const c of timeline.getChords()) if (c) out.push(c);
  return out;
}

function main(): void {
  const nav = document.getElementById("space-nav");
  const canvasHost = document.getElementById("lattice-canvas");
  const timelineHost = document.getElementById("timeline");
  if (!nav || !canvasHost || !timelineHost) {
    throw new Error(
      "App bootstrap failed: main / dom layout — required #space-nav / #lattice-canvas / #timeline elements missing from index.html.",
    );
  }

  mountNavbar(nav, (id) => {
    // Only torus-dyad is enabled in this prototype; future spaces hook here.
    console.info(`[nav] selected space: ${id}`);
  });

  const torus = new TorusView(canvasHost);
  torus.highlightDyad(state.currentDyad);
  buildLegend(torus);

  const synth = new DyadSynth();

  const timeline = new TimelineView(timelineHost, {
    onCellClick(index, shift) {
      const current = timeline.getChords()[index];
      if (current && !shift) {
        timeline.setChord(index, null);
      } else {
        timeline.setChord(index, { ...state.currentDyad });
      }
      torus.setProgressionPath(progressionPath(timeline));
    },
    onCellHover(index) {
      if (index === null) return;
      const chord = timeline.getChords()[index];
      if (chord) torus.highlightDyad(chord);
    },
  });

  const { selA, selB } = mountNotePickers();
  updateChordLabel();

  const updateDyadFromPickers = (): void => {
    const a = Number.parseInt(selA.value, 10);
    const b = Number.parseInt(selB.value, 10);
    state.currentDyad = { a: a as PitchClass, b: b as PitchClass };
    updateChordLabel();
    torus.highlightDyad(state.currentDyad);
  };
  selA.addEventListener("change", updateDyadFromPickers);
  selB.addEventListener("change", updateDyadFromPickers);

  const bpmInput = document.getElementById("bpm") as HTMLInputElement;
  const bpmOut = document.getElementById("bpm-out") as HTMLOutputElement;
  bpmInput.addEventListener("input", () => {
    state.bpm = Number.parseInt(bpmInput.value, 10);
    bpmOut.value = String(state.bpm);
  });

  const meterSel = document.getElementById("meter") as HTMLSelectElement;
  meterSel.addEventListener("change", () => {
    state.meter = meterSel.value;
    const beats = meterBeats(state.meter);
    timeline.configure({ beatsPerBar: beats });
    torus.setProgressionPath(progressionPath(timeline));
  });

  const subSel = document.getElementById("subdivision") as HTMLSelectElement;
  subSel.addEventListener("change", () => {
    const sub = Number.parseInt(subSel.value, 10);
    // Cells per bar = subdivision for 4/4 where subdivision is "notes per
    // whole note"; simpler: cells per beat = sub / 4.
    const cellsPerBeat = Math.max(1, Math.round(sub / 4));
    const beatsPerBar = meterBeats(state.meter);
    state.cellsPerBar = cellsPerBeat * beatsPerBar;
    timeline.configure({ cellsPerBar: state.cellsPerBar });
    torus.setProgressionPath(progressionPath(timeline));
  });

  const barsInput = document.getElementById("bars") as HTMLInputElement;
  barsInput.addEventListener("change", () => {
    const v = Number.parseInt(barsInput.value, 10);
    state.bars = Math.max(1, Math.min(16, Number.isFinite(v) ? v : 4));
    barsInput.value = String(state.bars);
    timeline.configure({ bars: state.bars });
    torus.setProgressionPath(progressionPath(timeline));
  });

  const octaveInput = document.getElementById("octave") as HTMLInputElement;
  octaveInput.addEventListener("change", () => {
    const v = Number.parseInt(octaveInput.value, 10);
    state.octave = Math.max(2, Math.min(6, Number.isFinite(v) ? v : 4));
    octaveInput.value = String(state.octave);
  });

  const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
  const stopBtn = document.getElementById("stop-btn") as HTMLButtonElement;

  const stop = (): void => {
    if (state.schedulerId !== null) {
      window.clearTimeout(state.schedulerId);
      state.schedulerId = null;
    }
    state.playing = false;
    state.playheadIndex = null;
    timeline.setActive(null);
    synth.stopAll();
    playBtn.textContent = "Play";
    playBtn.classList.remove("playing");
  };

  const stepMs = (): number => {
    // cellsPerBar cells span beatsPerBar quarter-note beats (for X/4 meters).
    // For 6/8 we treat the 6 "beats" as eighths so the math stays consistent.
    const beats = meterBeats(state.meter);
    const cellsPerBeat = state.cellsPerBar / beats;
    const beatMs = 60000 / state.bpm;
    return beatMs / cellsPerBeat;
  };

  const playStep = (i: number): void => {
    if (!state.playing) return;
    const total = timeline.totalCells();
    const idx = i % total;
    state.playheadIndex = idx;
    timeline.setActive(idx);
    const chord = timeline.getChords()[idx];
    if (chord) {
      torus.highlightDyad(chord);
      synth.playDyad(chord, state.octave, stepMs() / 1000);
    }
    state.schedulerId = window.setTimeout(() => playStep(idx + 1), stepMs());
  };

  playBtn.addEventListener("click", async () => {
    if (state.playing) {
      stop();
      return;
    }
    if (!firstScheduledChord(timeline)) {
      // Nothing to play; focus the timeline to hint the user.
      timelineHost.focus({ preventScroll: true });
      return;
    }
    await synth.resume();
    state.playing = true;
    playBtn.textContent = "Pause";
    playBtn.classList.add("playing");
    playStep(0);
  });
  stopBtn.addEventListener("click", stop);

  // Initial preset: insert a simple 4-cell progression so Play has something
  // to do out of the box.
  const preset: Dyad[] = [
    { a: 0, b: 4 }, // C–E
    { a: 5, b: 9 }, // F–A
    { a: 7, b: 11 }, // G–B
    { a: 0, b: 4 }, // C–E
  ];
  for (let i = 0; i < preset.length; i++) {
    const cellIndex = i * (state.cellsPerBar / meterBeats(state.meter)) *
      meterBeats(state.meter);
    timeline.setChord(Math.floor(cellIndex), preset[i] ?? null);
  }
  torus.setProgressionPath(progressionPath(timeline));
}

main();
