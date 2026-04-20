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
import { PRESETS, findPreset, type Preset } from "./presets.js";
import { mountResizer } from "./resizer.js";
import { applyTheme, getInitialTheme, mountThemeToggle } from "./theme.js";
import {
  TimelineView,
  type Placement,
  type TrackRow,
} from "./timeline-view.js";
import { TorusView, type TrackPath } from "./torus-view.js";
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
  currentPresetId: string | null;
  loadingPreset: boolean;
}

const TRACK_COLORS: readonly string[] = [
  "#ffd166", // Lead — gold
  "#4ea1ff", // Bass — sky blue
  "#f78ae0", // Pad  — pink
];

const DEFAULT_TRACKS: TrackRow[] = [
  {
    id: "lead",
    label: "Lead",
    color: TRACK_COLORS[0] ?? "#ffd166",
    instrument: "triangle",
    muted: false,
  },
  {
    id: "bass",
    label: "Bass",
    color: TRACK_COLORS[1] ?? "#4ea1ff",
    instrument: "sine",
    muted: false,
  },
  {
    id: "pad",
    label: "Pad",
    color: TRACK_COLORS[2] ?? "#f78ae0",
    instrument: "sawtooth",
    muted: false,
  },
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
  currentPresetId: null,
  loadingPreset: false,
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

function buildLegend(torus: TorusView, tracks: readonly TrackRow[]): void {
  const legend = document.getElementById("lattice-legend");
  if (!legend) return;
  legend.textContent = "";

  const tracksTitle = document.createElement("div");
  tracksTitle.textContent = "Track curves";
  tracksTitle.className = "legend-title";
  tracksTitle.style.gridColumn = "1 / -1";
  legend.appendChild(tracksTitle);
  for (const track of tracks) {
    const row = document.createElement("div");
    row.style.gridColumn = "1 / -1";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = track.color;
    row.appendChild(sw);
    row.appendChild(
      document.createTextNode(
        `${track.label} — ${track.instrument}`,
      ),
    );
    legend.appendChild(row);
  }

  const intervalsTitle = document.createElement("div");
  intervalsTitle.textContent = "Interval class";
  intervalsTitle.className = "legend-title";
  intervalsTitle.style.gridColumn = "1 / -1";
  legend.appendChild(intervalsTitle);
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

function placementsToDyads(placements: ReadonlyArray<Placement | null>): Dyad[] {
  const out: Dyad[] = [];
  for (const p of placements) if (p) out.push(p.dyad);
  return out;
}

function trackPaths(timeline: TimelineView): readonly TrackPath[] {
  const paths: TrackPath[] = [];
  for (let t = 0; t < timeline.trackCount(); t++) {
    const track = timeline.getTrack(t);
    if (!track) continue;
    paths.push({
      color: track.color,
      dyads: placementsToDyads(timeline.getChords(t)),
    });
  }
  return paths;
}

function hasAnyChord(timeline: TimelineView): boolean {
  for (let t = 0; t < timeline.trackCount(); t++) {
    for (const c of timeline.getChords(t)) if (c) return true;
  }
  return false;
}

function cellsPerBeatFrom(subdivision: number): number {
  return Math.max(1, Math.round(subdivision / 4));
}

function subdivisionFromCellsPerBar(
  cellsPerBar: number,
  beatsPerBar: number,
): number {
  const cellsPerBeat = Math.max(1, cellsPerBar / beatsPerBar);
  return Math.round(cellsPerBeat * 4);
}

function main(): void {
  applyTheme(getInitialTheme());

  const nav = requireEl<HTMLElement>("space-nav");
  const canvasHost = requireEl<HTMLElement>("lattice-canvas");
  const timelineHost = requireEl<HTMLElement>("timeline");
  const app = requireEl<HTMLElement>("app");
  const resizeHandle = requireEl<HTMLElement>("resize-handle");
  const resetViewBtn = requireEl<HTMLButtonElement>("reset-view-btn");
  const hideTorusChk = requireEl<HTMLInputElement>("hide-torus-chk");
  const themeBtn = requireEl<HTMLButtonElement>("theme-btn");
  const helpBtn = requireEl<HTMLButtonElement>("help-btn");
  const presetSel = requireEl<HTMLSelectElement>("preset-select");
  const navToggle = requireEl<HTMLButtonElement>("nav-toggle");

  const closeNav = (): void => {
    nav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  // Close the mobile nav dropdown on outside click.
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("open")) return;
    const target = e.target as Node | null;
    if (!target) return;
    if (nav.contains(target) || navToggle.contains(target)) return;
    closeNav();
  });

  mountNavbar(nav, (id) => {
    console.info(`[nav] selected space: ${id}`);
    // Selecting a space on mobile should dismiss the dropdown.
    closeNav();
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
  buildLegend(torus, DEFAULT_TRACKS);

  resetViewBtn.addEventListener("click", () => torus.resetCamera());

  const HIDE_TORUS_KEY = "gom.hideTorus";
  const storedHide = localStorage.getItem(HIDE_TORUS_KEY) === "1";
  hideTorusChk.checked = storedHide;
  torus.setMinimalMode(storedHide);
  hideTorusChk.addEventListener("change", () => {
    torus.setMinimalMode(hideTorusChk.checked);
    localStorage.setItem(HIDE_TORUS_KEY, hideTorusChk.checked ? "1" : "0");
  });

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

  const markCustom = (): void => {
    if (state.loadingPreset) return;
    if (state.currentPresetId !== null) {
      state.currentPresetId = null;
      presetSel.value = "";
    }
  };

  const refreshPaths = (): void => {
    torus.setTrackPaths(trackPaths(timeline));
    markCustom();
  };

  const timeline = new TimelineView(
    timelineHost,
    {
      onCellClick(trackIndex, cellIndex, shift) {
        const owner = timeline.placementCovering(trackIndex, cellIndex);
        const anchor = owner ?? cellIndex;
        const existing = owner !== null ? timeline.getChords(trackIndex)[owner] ?? null : null;
        if (existing && !shift) {
          timeline.setChord(trackIndex, anchor, null);
        } else {
          timeline.setChord(trackIndex, cellIndex, { ...state.currentDyad });
        }
      },
      onCellHover(trackIndex, cellIndex) {
        if (cellIndex === null) return;
        const owner = timeline.placementCovering(trackIndex, cellIndex);
        const idx = owner ?? cellIndex;
        const placement = timeline.getChords(trackIndex)[idx];
        if (placement) torus.highlightDyad(placement.dyad);
      },
      onSelectionChange() {
        /* no-op */
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
      },
      onClearPressed() {
        const { track, cell } = timeline.getSelection();
        timeline.setChord(track, cell, null);
      },
      onPlacementChanged() {
        refreshPaths();
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
  const subSel = requireEl<HTMLSelectElement>("subdivision");
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
    refreshPaths();
  });
  subSel.addEventListener("change", () => {
    const sub = Number.parseInt(subSel.value, 10);
    const beats = meterBeats(state.meter);
    state.cellsPerBar = cellsPerBeatFrom(sub) * beats;
    timeline.configure({ cellsPerBar: state.cellsPerBar });
    refreshPaths();
  });

  const barsInput = requireEl<HTMLInputElement>("bars");
  barsInput.addEventListener("change", () => {
    const v = Number.parseInt(barsInput.value, 10);
    state.bars = Math.max(1, Math.min(16, Number.isFinite(v) ? v : 4));
    barsInput.value = String(state.bars);
    timeline.configure({ bars: state.bars });
    refreshPaths();
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
    torus.setPlayhead([]);
    torus.highlightDyad(state.currentDyad);
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
    const oneStepSec = stepMs() / 1000;
    // Trigger audio only for placements that START at this cell — held
    // chords from earlier cells are already sounding.
    for (let t = 0; t < timeline.trackCount(); t++) {
      if (synth.isMuted(t)) continue;
      const placement = timeline.getChords(t)[idx];
      if (!placement) continue;
      const durationSec = placement.duration * oneStepSec;
      synth.playDyad(t, placement.dyad, state.octave, durationSec);
    }
    // Build the list of dyads actually sounding right now — includes any
    // placement whose span covers idx, not just those starting at idx.
    // Used for both the emissive highlight and the red playhead indicator.
    const active: Dyad[] = [];
    for (let t = 0; t < timeline.trackCount(); t++) {
      const owner = timeline.placementCovering(t, idx);
      if (owner === null) continue;
      const p = timeline.getChords(t)[owner];
      if (p) active.push(p.dyad);
    }
    torus.highlightDyads(active);
    torus.setPlayhead(active);
    state.schedulerId = window.setTimeout(() => playStep(idx + 1), stepMs());
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

  // -------- Presets ---------------------------------------------------------
  const populatePresets = (): void => {
    presetSel.textContent = "";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "— Starter templates —";
    blank.disabled = true;
    blank.selected = true;
    presetSel.appendChild(blank);
    for (const preset of PRESETS) {
      const opt = document.createElement("option");
      opt.value = preset.id;
      opt.textContent = preset.name;
      opt.title = preset.description;
      presetSel.appendChild(opt);
    }
  };
  populatePresets();

  const loadPreset = (preset: Preset): void => {
    stop();
    state.loadingPreset = true;
    state.meter = preset.meter;
    state.bars = preset.bars;
    state.cellsPerBar = preset.cellsPerBar;
    const beats = meterBeats(preset.meter);
    meterSel.value = preset.meter;
    barsInput.value = String(preset.bars);
    subSel.value = String(subdivisionFromCellsPerBar(preset.cellsPerBar, beats));
    timeline.clearAll();
    timeline.configure({
      bars: preset.bars,
      cellsPerBar: preset.cellsPerBar,
      beatsPerBar: beats,
    });
    for (const p of preset.placements) {
      timeline.setChord(p.track, p.cell, p.dyad, p.duration);
    }
    state.loadingPreset = false;
    state.currentPresetId = preset.id;
    presetSel.value = preset.id;
    // Re-run refresh so the torus paths reflect the new placements; the
    // markCustom guard inside refreshPaths is a no-op while loadingPreset
    // was true, so we need this trailing call to actually paint.
    torus.setTrackPaths(trackPaths(timeline));
  };

  presetSel.addEventListener("change", () => {
    const preset = findPreset(presetSel.value);
    if (!preset) return;
    loadPreset(preset);
    // Do NOT reset the select to "" — it should display the loaded
    // preset's name until the user edits something.
  });

  // -------- Initial content -------------------------------------------------
  loadPreset(PRESETS[0] ?? {
    id: "empty",
    name: "Empty",
    description: "",
    meter: state.meter,
    bars: state.bars,
    cellsPerBar: state.cellsPerBar,
    placements: [],
  });

  installTour();
}

main();
