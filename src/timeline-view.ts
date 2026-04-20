import { dyadName, type Dyad } from "./chord.js";
import { INSTRUMENTS, INSTRUMENT_IDS, type InstrumentId } from "./audio.js";

export interface TrackRow {
  id: string;
  label: string;
  instrument: InstrumentId;
  muted: boolean;
}

export interface TimelineSettings {
  bars: number;
  beatsPerBar: number;
  cellsPerBar: number;
  tracks: TrackRow[];
}

export interface TimelineCallbacks {
  onCellClick(trackIndex: number, cellIndex: number, shift: boolean): void;
  onCellHover(trackIndex: number, cellIndex: number | null): void;
  onSelectionChange(trackIndex: number, cellIndex: number): void;
  onInstrumentChange(trackIndex: number, instrument: InstrumentId): void;
  onMuteChange(trackIndex: number, muted: boolean): void;
  onPlacePressed(): void;
  onClearPressed(): void;
}

export interface Selection {
  track: number;
  cell: number;
}

export class TimelineView {
  private readonly root: HTMLElement;
  private readonly callbacks: TimelineCallbacks;
  private settings: TimelineSettings;
  private chords: (Dyad | null)[][] = [];
  private activeCell: number | null = null;
  private selection: Selection = { track: 0, cell: 0 };

  constructor(
    root: HTMLElement,
    cb: TimelineCallbacks,
    initial: TimelineSettings,
  ) {
    this.root = root;
    this.callbacks = cb;
    this.settings = initial;
    this.chords = this.settings.tracks.map(() => []);
    this.root.tabIndex = 0;
    this.root.setAttribute("role", "grid");
    this.installKeyboard();
    this.rebuild();
  }

  configure(partial: Partial<TimelineSettings>): void {
    const prev = this.settings;
    this.settings = { ...prev, ...partial };
    if (this.settings.tracks.length !== prev.tracks.length) {
      const nextChords: (Dyad | null)[][] = [];
      for (let i = 0; i < this.settings.tracks.length; i++) {
        nextChords.push(this.chords[i] ?? []);
      }
      this.chords = nextChords;
    }
    this.clampSelection();
    this.rebuild();
  }

  totalCells(): number {
    return this.settings.bars * this.settings.cellsPerBar;
  }

  trackCount(): number {
    return this.settings.tracks.length;
  }

  getChords(trackIndex: number): ReadonlyArray<Dyad | null> {
    return this.chords[trackIndex] ?? [];
  }

  getAllChords(): ReadonlyArray<ReadonlyArray<Dyad | null>> {
    return this.chords;
  }

  getSelection(): Selection {
    return { ...this.selection };
  }

  setChord(trackIndex: number, cellIndex: number, chord: Dyad | null): void {
    if (trackIndex < 0 || trackIndex >= this.settings.tracks.length) return;
    if (cellIndex < 0 || cellIndex >= this.totalCells()) return;
    const row = this.chords[trackIndex];
    if (!row) return;
    row[cellIndex] = chord;
    const cell = this.cellAt(trackIndex, cellIndex);
    if (!cell) return;
    if (chord) {
      cell.classList.add("filled");
      cell.textContent = dyadName(chord);
      cell.title = dyadName(chord);
    } else {
      cell.classList.remove("filled");
      cell.textContent = "";
      cell.removeAttribute("title");
    }
  }

  setActiveCell(cellIndex: number | null): void {
    if (this.activeCell !== null) {
      for (let t = 0; t < this.settings.tracks.length; t++) {
        this.cellAt(t, this.activeCell)?.classList.remove("active");
      }
    }
    this.activeCell = cellIndex;
    if (cellIndex !== null) {
      for (let t = 0; t < this.settings.tracks.length; t++) {
        this.cellAt(t, cellIndex)?.classList.add("active");
      }
    }
  }

  setSelection(sel: Partial<Selection>): void {
    const next = { ...this.selection, ...sel };
    next.track = Math.max(0, Math.min(this.settings.tracks.length - 1, next.track));
    next.cell = Math.max(0, Math.min(this.totalCells() - 1, next.cell));
    if (next.track === this.selection.track && next.cell === this.selection.cell) {
      this.renderSelection();
      return;
    }
    this.selection = next;
    this.renderSelection();
    this.callbacks.onSelectionChange(next.track, next.cell);
  }

  private clampSelection(): void {
    const track = Math.max(
      0,
      Math.min(this.settings.tracks.length - 1, this.selection.track),
    );
    const cell = Math.max(0, Math.min(this.totalCells() - 1, this.selection.cell));
    this.selection = { track, cell };
  }

  private renderSelection(): void {
    this.root.querySelectorAll(".selected").forEach((el) => {
      el.classList.remove("selected");
    });
    const cell = this.cellAt(this.selection.track, this.selection.cell);
    cell?.classList.add("selected");
  }

  private cellAt(trackIndex: number, cellIndex: number): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(
      `[data-track="${trackIndex}"][data-cell-index="${cellIndex}"]`,
    );
  }

  private installKeyboard(): void {
    this.root.addEventListener("keydown", (e) => {
      const { track, cell } = this.selection;
      switch (e.key) {
        case "ArrowLeft":
          this.setSelection({ cell: cell - 1 });
          e.preventDefault();
          break;
        case "ArrowRight":
          this.setSelection({ cell: cell + 1 });
          e.preventDefault();
          break;
        case "ArrowUp":
          this.setSelection({ track: track - 1 });
          e.preventDefault();
          break;
        case "ArrowDown":
          this.setSelection({ track: track + 1 });
          e.preventDefault();
          break;
        case "Enter":
        case " ":
          this.callbacks.onPlacePressed();
          e.preventDefault();
          break;
        case "Backspace":
        case "Delete":
          this.callbacks.onClearPressed();
          e.preventDefault();
          break;
        default:
          break;
      }
    });
  }

  private rebuild(): void {
    const total = this.totalCells();
    // Pad / trim per-track arrays without losing user data.
    for (let t = 0; t < this.settings.tracks.length; t++) {
      const row = this.chords[t] ?? [];
      const next: (Dyad | null)[] = [];
      for (let i = 0; i < total; i++) next.push(row[i] ?? null);
      this.chords[t] = next;
    }

    this.root.textContent = "";
    this.root.style.setProperty("--cells", String(total));
    this.root.style.setProperty("--tracks", String(this.settings.tracks.length));

    // Header row (beat numbers).
    const header = document.createElement("div");
    header.className = "tl-row tl-header";
    const headerSpacer = document.createElement("div");
    headerSpacer.className = "tl-track-head tl-track-head-spacer";
    header.appendChild(headerSpacer);
    const headerCells = document.createElement("div");
    headerCells.className = "tl-cells";
    for (let i = 0; i < total; i++) {
      const c = document.createElement("div");
      c.className = "tl-cell tl-cell-header";
      const cellInBar = i % this.settings.cellsPerBar;
      const cellsPerBeat =
        this.settings.cellsPerBar / this.settings.beatsPerBar;
      if (cellInBar === 0) {
        const barIdx = Math.floor(i / this.settings.cellsPerBar) + 1;
        c.textContent = `${barIdx}`;
        c.classList.add("tl-cell-bar-start");
      } else if (cellsPerBeat >= 1 && cellInBar % cellsPerBeat === 0) {
        c.textContent = `${Math.floor(cellInBar / cellsPerBeat) + 1}`;
      }
      headerCells.appendChild(c);
    }
    header.appendChild(headerCells);
    this.root.appendChild(header);

    // Track rows.
    for (let t = 0; t < this.settings.tracks.length; t++) {
      const track = this.settings.tracks[t];
      if (!track) continue;
      const row = document.createElement("div");
      row.className = "tl-row";
      row.dataset.track = String(t);

      const head = document.createElement("div");
      head.className = "tl-track-head";
      const label = document.createElement("span");
      label.className = "tl-track-label";
      label.textContent = track.label;
      head.appendChild(label);

      const instSelect = document.createElement("select");
      instSelect.className = "tl-track-inst";
      instSelect.setAttribute("aria-label", `${track.label} instrument`);
      for (const id of INSTRUMENT_IDS) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = INSTRUMENTS[id].label;
        instSelect.appendChild(opt);
      }
      instSelect.value = track.instrument;
      instSelect.addEventListener("change", () => {
        const next = instSelect.value as InstrumentId;
        if (!(next in INSTRUMENTS)) return;
        this.settings.tracks[t] = { ...track, instrument: next };
        this.callbacks.onInstrumentChange(t, next);
      });
      head.appendChild(instSelect);

      const muteBtn = document.createElement("button");
      muteBtn.type = "button";
      muteBtn.className = "tl-track-mute";
      muteBtn.textContent = track.muted ? "unmute" : "mute";
      muteBtn.setAttribute("aria-pressed", String(track.muted));
      muteBtn.addEventListener("click", () => {
        const muted = !track.muted;
        this.settings.tracks[t] = { ...track, muted };
        muteBtn.textContent = muted ? "unmute" : "mute";
        muteBtn.setAttribute("aria-pressed", String(muted));
        row.classList.toggle("muted", muted);
        this.callbacks.onMuteChange(t, muted);
      });
      head.appendChild(muteBtn);
      if (track.muted) row.classList.add("muted");
      row.appendChild(head);

      const cells = document.createElement("div");
      cells.className = "tl-cells";
      const cellsPerBeat =
        this.settings.cellsPerBar / this.settings.beatsPerBar;
      for (let i = 0; i < total; i++) {
        const cell = document.createElement("div");
        cell.className = "tl-cell";
        cell.dataset.track = String(t);
        cell.dataset.cellIndex = String(i);
        cell.setAttribute("role", "gridcell");
        if (i % this.settings.cellsPerBar === 0) {
          cell.classList.add("downbeat");
        } else if (cellsPerBeat >= 1 && i % cellsPerBeat === 0) {
          cell.classList.add("beat");
        }
        const chord = this.chords[t]?.[i] ?? null;
        if (chord) {
          cell.classList.add("filled");
          cell.textContent = dyadName(chord);
          cell.title = dyadName(chord);
        }
        cell.addEventListener("click", (ev) => {
          this.setSelection({ track: t, cell: i });
          this.callbacks.onCellClick(t, i, ev.shiftKey);
        });
        cell.addEventListener("mouseenter", () => {
          this.callbacks.onCellHover(t, i);
        });
        cell.addEventListener("mouseleave", () => {
          this.callbacks.onCellHover(t, null);
        });
        cells.appendChild(cell);
      }
      row.appendChild(cells);
      this.root.appendChild(row);
    }

    this.renderSelection();
    if (this.activeCell !== null) this.setActiveCell(this.activeCell);
  }
}
