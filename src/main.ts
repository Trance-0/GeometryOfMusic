import { SynthEngine } from "./audio.js";
import {
  INTERVAL_NAMES,
  PITCH_NAMES,
  dyadInterval,
  dyadName,
  type Dyad,
  type PitchClass,
} from "./chord.js";
import { mountNavbar } from "./navbar.js";
import { mountResizer } from "./resizer.js";
import { applyTheme, getInitialTheme, mountThemeToggle } from "./theme.js";
import { TimelineView, type TrackRow } from "./timeline-view.js";
import { TorusView } from "./torus-view.js";
import { installTour, showTour } from "./tour.js";

interface AppState {
  currentDyad: Dyad;
  octave: number;
  bpm: number;
  meter: string;
  cellsPerBar: number;
  bars: number;
  playing: boolean;
  playheadIndex: number | null;
  schedulerId: number | null;
}

const DEFAULT_TRACKS: TrackRow[] = [
  { id: "lead", label: "Lead", instrument: "triangle", muted: false },
  { id: "bass", label: "Bass", instrument: "sine", muted: false },
  { id: "pad", label: "Pad", instrument: "sawtooth", muted: false },
];

const state: AppState = {
  currentDyad: { a: 0, b: 4 },
  octave: 4,
  bpm: 100,
  meter: "4/4",
  cellsPerBar: 8,
  bars: 4,
  playing: false,
  playheadIndex: null,
  schedulerId: null,
};

function meterBeats(meter: string): number {
  const top = Number.parseInt(meter.split("/")[0] ?? "4", 10);
  return Number.isFinite(top) && top > 0 ? top : 4;
}

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(
      `App bootstrap failed: main / dom layout — required #${id} element missing from index.html.`,
    );
  }
  return el as T;
}

function mountNotePickers(): {
  selA: HTMLSelectElement;
  selB: HTMLSelectElement;
} {
  const selA = requireEl<HTMLSelectElement>("note-a");
  const selB = requireEl<HTMLSelectElement>("note-b");
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
  title.textContent = "Interval class";
  title.style.gridColumn = "1 / -1";
  title.style.color = "var(--text)";
  title.style.fontWeight = "600";
  legend.appendChild(title);
  const entries = torus.legendEntries();
  for (let i = 0; i < Math.min(12, entries.length); i++) {
    const entry = entries[i];
    if (!entry) continue;
    const row = document.createElement("div");
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = entry.color;
    row.appendChild(sw);
    row.appendChild(document.createTextNode(entry.label));
    legend.appendChild(row);
  }
}

function progressionPath(timeline: TimelineView): readonly Dyad[] {
  const path: Dyad[] = [];
  const total = timeline.totalCells();
  for (let i = 0; i < total; i++) {
    for (let t = 0; t < timeline.trackCount(); t++) {
      const chord = timeline.getChords(t)[i];
      if (chord) {
        path.push(chord);
        break;
      }
    }
  }
  return path;
}

function hasAnyChord(timeline: TimelineView): boolean {
  for (let t = 0; t < timeline.trackCount(); t++) {
    for (const c of timeline.getChords(t)) if (c) return true;
  }
  return false;
}

function cellsPerBeatFrom(subdivision: number): number {
  // Subdivision values in the UI: 4 → quarter cells (1 per beat),
  // 8 → eighth cells (2 per beat), 16 → sixteenth cells (4 per beat).
  return Math.max(1, Math.round(subdivision / 4));
}

function main(): void {
  applyTheme(getInitialTheme());

  const nav = requireEl<HTMLElement>("space-nav");
  const canvasHost = requireEl<HTMLElement>("lattice-canvas");
  const timelineHost = requireEl<HTMLElement>("timeline");
  const app = requireEl<HTMLElement>("app");
  const resizeHandle = requireEl<HTMLElement>("resize-handle");
  const resetViewBtn = requireEl<HTMLButtonElement>("reset-view-btn");
  const themeBtn = requireEl<HTMLButtonElement>("theme-btn");
  const helpBtn = requireEl<HTMLButtonElement>("help-btn");

  mountNavbar(nav, (id) => {
    console.info(`[nav] selected space: ${id}`);
  });

  const torus = new TorusView(canvasHost, {
    onNodeSelect(dyad: Dyad) {
      state.currentDyad = dyad;
      selA.value = String(dyad.a);
      selB.value = String(dyad.b);
      updateChordLabel();
      torus.highlightDyad(dyad);
    },
  });
  torus.highlightDyad(state.currentDyad);
  buildLegend(torus);

  resetViewBtn.addEventListener("click", () => torus.resetCamera());

  mountThemeToggle(themeBtn, () => {
    torus.applySceneTheme();
  });

  helpBtn.addEventListener("click", () => showTour());

  mountResizer({
    app,
    handle: resizeHandle,
    storageKey: "gom.upper.fraction",
    minFraction: 0.2,
    maxFraction: 0.85,
    defaultFraction: 0.58,
  });

  const synth = new SynthEngine(
    DEFAULT_TRACKS.length,
    DEFAULT_TRACKS.map((t) => t.instrument),
  );

  const timeline = new TimelineView(
    timelineHost,
    {
      onCellClick(trackIndex, cellIndex, shift) {
        const current = timeline.getChords(trackIndex)[cellIndex];
        if (current && !shift) {
          timeline.setChord(trackIndex, cellIndex, null);
        } else {
          timeline.setChord(trackIndex, cellIndex, { ...state.currentDyad });
        }
        torus.setProgressionPath(progressionPath(timeline));
      },
      onCellHover(trackIndex, cellIndex) {
        if (cellIndex === null) return;
        const chord = timeline.getChords(trackIndex)[cellIndex];
        if (chord) torus.highlightDyad(chord);
      },
      onSelectionChange() {
        /* selection state lives in the timeline view; nothing else needs it */
      },
      onInstrumentChange(trackIndex, instrument) {
        synth.setInstrument(trackIndex, instrument);
      },
      onMuteChange(trackIndex, muted) {
        synth.setMuted(trackIndex, muted);
      },
      onPlacePressed() {
        const { track, cell } = timeline.getSelection();
        timeline.setChord(track, cell, { ...state.currentDyad });
        torus.setProgressionPath(progressionPath(timeline));
      },
      onClearPressed() {
        const { track, cell } = timeline.getSelection();
        timeline.setChord(track, cell, null);
        torus.setProgressionPath(progressionPath(timeline));
      },
    },
    {
      bars: state.bars,
      beatsPerBar: meterBeats(state.meter),
      cellsPerBar: state.cellsPerBar,
      tracks: DEFAULT_TRACKS.map((t) => ({ ...t })),
    },
  );

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

  const bpmInput = requireEl<HTMLInputElement>("bpm");
  const bpmOut = requireEl<HTMLOutputElement>("bpm-out");
  bpmInput.addEventListener("input", () => {
    state.bpm = Number.parseInt(bpmInput.value, 10);
    bpmOut.value = String(state.bpm);
  });

  const meterSel = requireEl<HTMLSelectElement>("meter");
  meterSel.addEventListener("change", () => {
    state.meter = meterSel.value;
    const beats = meterBeats(state.meter);
    const cellsPerBeat = cellsPerBeatFrom(
      Number.parseInt(subSel.value, 10),
    );
    state.cellsPerBar = cellsPerBeat * beats;
    timeline.configure({
      beatsPerBar: beats,
      cellsPerBar: state.cellsPerBar,
    });
    torus.setProgressionPath(progressionPath(timeline));
  });

  const subSel = requireEl<HTMLSelectElement>("subdivision");
  subSel.addEventListener("change", () => {
    const sub = Number.parseInt(subSel.value, 10);
    const beats = meterBeats(state.meter);
    state.cellsPerBar = cellsPerBeatFrom(sub) * beats;
    timeline.configure({ cellsPerBar: state.cellsPerBar });
    torus.setProgressionPath(progressionPath(timeline));
  });

  const barsInput = requireEl<HTMLInputElement>("bars");
  barsInput.addEventListener("change", () => {
    const v = Number.parseInt(barsInput.value, 10);
    state.bars = Math.max(1, Math.min(16, Number.isFinite(v) ? v : 4));
    barsInput.value = String(state.bars);
    timeline.configure({ bars: state.bars });
    torus.setProgressionPath(progressionPath(timeline));
  });

  const octaveInput = requireEl<HTMLInputElement>("octave");
  octaveInput.addEventListener("change", () => {
    const v = Number.parseInt(octaveInput.value, 10);
    state.octave = Math.max(2, Math.min(6, Number.isFinite(v) ? v : 4));
    octaveInput.value = String(state.octave);
  });

  const playBtn = requireEl<HTMLButtonElement>("play-btn");
  const stopBtn = requireEl<HTMLButtonElement>("stop-btn");

  const stop = (): void => {
    if (state.schedulerId !== null) {
      window.clearTimeout(state.schedulerId);
      state.schedulerId = null;
    }
    state.playing = false;
    state.playheadIndex = null;
    timeline.setActiveCell(null);
    synth.stopAll();
    playBtn.textContent = "Play";
    playBtn.classList.remove("playing");
  };

  const stepMs = (): number => {
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
    timeline.setActiveCell(idx);
    const durationSec = stepMs() / 1000;
    let lastPlayed: Dyad | null = null;
    for (let t = 0; t < timeline.trackCount(); t++) {
      if (synth.isMuted(t)) continue;
      const chord = timeline.getChords(t)[idx];
      if (!chord) continue;
      synth.playDyad(t, chord, state.octave, durationSec);
      lastPlayed = chord;
    }
    if (lastPlayed) torus.highlightDyad(lastPlayed);
    state.schedulerId = window.setTimeout(
      () => playStep(idx + 1),
      stepMs(),
    );
  };

  playBtn.addEventListener("click", async () => {
    if (state.playing) {
      stop();
      return;
    }
    if (!hasAnyChord(timeline)) {
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

  // Transport-level keyboard: space / P outside the timeline triggers play.
  document.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName ?? "";
    const insideTimeline = timelineHost.contains(target);
    if (insideTimeline) return;
    if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(tag)) return;
    if (e.key === " " || e.key.toLowerCase() === "p") {
      e.preventDefault();
      playBtn.click();
    }
  });

  // Preset progressions so Play has something to do out of the box.
  const lead: Dyad[] = [
    { a: 0, b: 4 }, // C–E
    { a: 5, b: 9 }, // F–A
    { a: 7, b: 11 }, // G–B
    { a: 0, b: 4 }, // C–E
  ];
  const bass: Dyad[] = [
    { a: 0, b: 7 }, // C–G
    { a: 5, b: 0 }, // F–C
    { a: 7, b: 2 }, // G–D
    { a: 0, b: 7 }, // C–G
  ];
  const cellsPerBar = state.cellsPerBar;
  for (let i = 0; i < lead.length; i++) {
    timeline.setChord(0, i * cellsPerBar, lead[i] ?? null);
    timeline.setChord(1, i * cellsPerBar, bass[i] ?? null);
  }
  torus.setProgressionPath(progressionPath(timeline));

  // Hook up the first-run tour after everything else is ready so the
  // welcome modal shows over a fully rendered app.
  installTour();
}

main();
