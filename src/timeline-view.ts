import { dyadName, type Dyad } from "./chord.js";
import { INSTRUMENTS, INSTRUMENT_IDS, type InstrumentId } from "./audio.js";

export interface TrackRow {
  id: string;
  label: string;
  color: string;
  instrument: InstrumentId;
  muted: boolean;
}

export interface TimelineSettings {
  bars: number;
  beatsPerBar: number;
  cellsPerBar: number;
  tracks: TrackRow[];
}

export interface Placement {
  readonly dyad: Dyad;
  readonly duration: number;
}

export interface TimelineCallbacks {
  onCellClick(trackIndex: number, cellIndex: number, shift: boolean): void;
  onCellHover(trackIndex: number, cellIndex: number | null): void;
  onSelectionChange(trackIndex: number, cellIndex: number): void;
  onInstrumentChange(trackIndex: number, instrument: InstrumentId): void;
  onMuteChange(trackIndex: number, muted: boolean): void;
  onPlacePressed(): void;
  onClearPressed(): void;
  onPlacementChanged(): void;
}

export interface Selection {
  track: number;
  cell: number;
}

export class TimelineView {
  private readonly root: HTMLElement;
  private readonly callbacks: TimelineCallbacks;
  private settings: TimelineSettings;
  // Per-track arrays. Each entry is either a Placement that starts at
  // that cell or null (empty / continuation of a preceding placement).
  private chords: (Placement | null)[][] = [];
  private activeCell: number | null = null;
  private selection: Selection = { track: 0, cell: 0 };
  private dragState: {
    track: number;
    startCell: number;
    startDuration: number;
    pointerStartX: number;
    cellPx: number;
    pointerId: number;
  } | null = null;

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
      const nextChords: (Placement | null)[][] = [];
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

  /**
   * Return all chord placements for a track as an array of Placement|null
   * indexed by start-cell. Cells covered by a placement's span are null;
   * use `iteratePlacements` when you want the span boundaries.
   */
  getChords(trackIndex: number): ReadonlyArray<Placement | null> {
    return this.chords[trackIndex] ?? [];
  }

  iteratePlacements(
    trackIndex: number,
  ): ReadonlyArray<{ cell: number; placement: Placement }> {
    const row = this.chords[trackIndex] ?? [];
    const out: { cell: number; placement: Placement }[] = [];
    for (let i = 0; i < row.length; i++) {
      const p = row[i];
      if (p) out.push({ cell: i, placement: p });
    }
    return out;
  }

  clearAll(): void {
    for (let t = 0; t < this.settings.tracks.length; t++) {
      this.chords[t] = [];
    }
    this.rebuild();
    this.callbacks.onPlacementChanged();
  }

  getTrack(trackIndex: number): TrackRow | null {
    return this.settings.tracks[trackIndex] ?? null;
  }

  /**
   * Max duration a placement starting at `cell` on `track` can occupy,
   * respecting both the timeline end and the next placement's start on
   * the same track. `ignoreOwnStart` excludes a placement that starts at
   * `cell` itself (useful while dragging).
   */
  private maxDurationAt(
    track: number,
    cell: number,
    ignoreOwnStart: boolean,
  ): number {
    const total = this.totalCells();
    const row = this.chords[track] ?? [];
    for (let i = cell + 1; i < total; i++) {
      if (row[i]) return i - cell;
    }
    // If ignoreOwnStart is false and a placement starts at `cell`, we've
    // already returned above on the first neighbour; nothing else to do.
    void ignoreOwnStart;
    return total - cell;
  }

  /**
   * Place a chord at (track, cell) with the given duration (default 1).
   * If another placement already starts inside [cell, cell+duration),
   * it is removed. Duration is clamped to `maxDurationAt`.
   * Setting dyad=null clears whichever placement covers `cell`.
   */
  setChord(
    trackIndex: number,
    cellIndex: number,
    dyad: Dyad | null,
    duration = 1,
  ): void {
    if (trackIndex < 0 || trackIndex >= this.settings.tracks.length) return;
    if (cellIndex < 0 || cellIndex >= this.totalCells()) return;
    const row = this.chords[trackIndex];
    if (!row) return;

    if (dyad === null) {
      const owner = this.placementCovering(trackIndex, cellIndex);
      if (owner !== null) row[owner] = null;
      this.rebuildTrack(trackIndex);
      this.callbacks.onPlacementChanged();
      return;
    }

    // Clear any placement that currently covers `cellIndex` (other than a
    // placement starting exactly at cellIndex, which we'll overwrite).
    const owner = this.placementCovering(trackIndex, cellIndex);
    if (owner !== null && owner !== cellIndex) {
      row[owner] = null;
    }
    // Clear any placement starting strictly inside [cellIndex+1, cellIndex+duration).
    const desired = Math.max(1, Math.floor(duration));
    const maxDur = this.maxDurationAtRaw(trackIndex, cellIndex);
    const actual = Math.max(1, Math.min(desired, maxDur));
    for (let i = cellIndex + 1; i < cellIndex + actual; i++) {
      if (row[i]) row[i] = null;
    }
    row[cellIndex] = { dyad, duration: actual };
    this.rebuildTrack(trackIndex);
    this.callbacks.onPlacementChanged();
  }

  /** Internal raw variant that ignores `ignoreOwnStart`. */
  private maxDurationAtRaw(track: number, cell: number): number {
    const total = this.totalCells();
    const row = this.chords[track] ?? [];
    for (let i = cell + 1; i < total; i++) {
      if (row[i]) return i - cell;
    }
    return total - cell;
  }

  /**
   * Return the start cell of the placement that covers `cell`, or null
   * if no placement covers it. Walks back from `cell` looking for a
   * placement whose span reaches `cell`.
   */
  placementCovering(track: number, cell: number): number | null {
    const row = this.chords[track] ?? [];
    for (let i = cell; i >= 0; i--) {
      const p = row[i];
      if (p) {
        return i + p.duration > cell ? i : null;
      }
    }
    return null;
  }

  setActiveCell(cellIndex: number | null): void {
    const total = this.totalCells();
    const prev = this.activeCell;
    if (prev !== null) {
      for (let t = 0; t < this.settings.tracks.length; t++) {
        this.cellAt(t, prev)?.classList.remove("active");
      }
    }
    this.activeCell = cellIndex;
    if (cellIndex === null || cellIndex < 0 || cellIndex >= total) return;
    for (let t = 0; t < this.settings.tracks.length; t++) {
      this.cellAt(t, cellIndex)?.classList.add("active");
    }
  }

  setSelection(sel: Partial<Selection>): void {
    const next = { ...this.selection, ...sel };
    next.track = Math.max(
      0,
      Math.min(this.settings.tracks.length - 1, next.track),
    );
    next.cell = Math.max(0, Math.min(this.totalCells() - 1, next.cell));
    if (
      next.track === this.selection.track &&
      next.cell === this.selection.cell
    ) {
      this.renderSelection();
      return;
    }
    this.selection = next;
    this.renderSelection();
    this.callbacks.onSelectionChange(next.track, next.cell);
  }

  getSelection(): Selection {
    return { ...this.selection };
  }

  private clampSelection(): void {
    const track = Math.max(
      0,
      Math.min(this.settings.tracks.length - 1, this.selection.track),
    );
    const cell = Math.max(
      0,
      Math.min(this.totalCells() - 1, this.selection.cell),
    );
    this.selection = { track, cell };
  }

  private renderSelection(): void {
    this.root
      .querySelectorAll(".selected")
      .forEach((el) => el.classList.remove("selected"));
    // A covered cell highlights its owner span.
    const owner = this.placementCovering(
      this.selection.track,
      this.selection.cell,
    );
    const cellIndex = owner !== null ? owner : this.selection.cell;
    const cell = this.cellAt(this.selection.track, cellIndex);
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

  private rebuildTrack(trackIndex: number): void {
    const total = this.totalCells();
    const row = this.chords[trackIndex];
    if (!row) return;
    const nextRow: (Placement | null)[] = [];
    for (let i = 0; i < total; i++) nextRow.push(row[i] ?? null);
    this.chords[trackIndex] = nextRow;

    const cellsWrap = this.root.querySelector<HTMLElement>(
      `.tl-row[data-track="${trackIndex}"] .tl-cells`,
    );
    if (cellsWrap) {
      this.renderTrackCells(trackIndex, cellsWrap);
    }
    if (this.activeCell !== null) this.setActiveCell(this.activeCell);
    this.renderSelection();
  }

  private rebuild(): void {
    const total = this.totalCells();
    // Normalize placement durations against the new `total`: clip any
    // that overflow the grid, drop continuations that now overlap.
    for (let t = 0; t < this.settings.tracks.length; t++) {
      const row = this.chords[t] ?? [];
      const next: (Placement | null)[] = [];
      for (let i = 0; i < total; i++) next.push(null);
      for (let i = 0; i < row.length && i < total; i++) {
        const p = row[i];
        if (!p) continue;
        const clipped = Math.max(1, Math.min(p.duration, total - i));
        let dur = clipped;
        for (let j = i + 1; j < i + dur; j++) {
          if (row[j]) {
            dur = j - i;
            break;
          }
        }
        next[i] = { dyad: p.dyad, duration: dur };
      }
      this.chords[t] = next;
    }

    this.root.textContent = "";
    this.root.style.setProperty("--cells", String(total));
    this.root.style.setProperty(
      "--tracks",
      String(this.settings.tracks.length),
    );

    // Header row (beat numbers).
    const header = document.createElement("div");
    header.className = "tl-row tl-header";
    const headerSpacer = document.createElement("div");
    headerSpacer.className = "tl-track-head tl-track-head-spacer";
    header.appendChild(headerSpacer);
    const headerCells = document.createElement("div");
    headerCells.className = "tl-cells tl-cells-header";
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
      const swatch = document.createElement("span");
      swatch.className = "tl-track-swatch";
      swatch.style.background = track.color;
      swatch.title = `Curve color on the torus for ${track.label}`;
      head.appendChild(swatch);
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
      this.renderTrackCells(t, cells);
      row.appendChild(cells);

      this.root.appendChild(row);
    }

    this.renderSelection();
    if (this.activeCell !== null) this.setActiveCell(this.activeCell);
  }

  /**
   * Repopulate one track's cell container. Empty cells render one-per
   * column; a placement renders as a single element spanning
   * `duration` columns with a drag grip on its right edge.
   */
  private renderTrackCells(trackIndex: number, container: HTMLElement): void {
    const total = this.totalCells();
    const row = this.chords[trackIndex] ?? [];
    container.textContent = "";
    const cellsPerBar = this.settings.cellsPerBar;
    const cellsPerBeat = cellsPerBar / this.settings.beatsPerBar;
    let i = 0;
    while (i < total) {
      const p = row[i];
      if (p) {
        const el = document.createElement("div");
        el.className = "tl-cell filled";
        el.dataset.track = String(trackIndex);
        el.dataset.cellIndex = String(i);
        el.dataset.duration = String(p.duration);
        el.style.gridColumn = `span ${p.duration}`;
        el.textContent = dyadName(p.dyad);
        el.title = `${dyadName(p.dyad)} · ${p.duration} cell${p.duration === 1 ? "" : "s"}`;
        if (i % cellsPerBar === 0) el.classList.add("downbeat");
        else if (cellsPerBeat >= 1 && i % cellsPerBeat === 0) {
          el.classList.add("beat");
        }
        this.installCellHandlers(el, trackIndex, i);
        const grip = document.createElement("span");
        grip.className = "tl-cell-grip";
        grip.title = "Drag to extend or shrink";
        grip.setAttribute("aria-hidden", "true");
        this.installGripHandlers(grip, trackIndex, i);
        el.appendChild(grip);
        container.appendChild(el);
        i += p.duration;
      } else {
        const el = document.createElement("div");
        el.className = "tl-cell";
        el.dataset.track = String(trackIndex);
        el.dataset.cellIndex = String(i);
        if (i % cellsPerBar === 0) el.classList.add("downbeat");
        else if (cellsPerBeat >= 1 && i % cellsPerBeat === 0) {
          el.classList.add("beat");
        }
        this.installCellHandlers(el, trackIndex, i);
        container.appendChild(el);
        i += 1;
      }
    }
  }

  private installCellHandlers(
    cell: HTMLElement,
    trackIndex: number,
    cellIndex: number,
  ): void {
    cell.addEventListener("click", (ev) => {
      if (this.dragState) return;
      this.setSelection({ track: trackIndex, cell: cellIndex });
      this.callbacks.onCellClick(trackIndex, cellIndex, ev.shiftKey);
    });
    cell.addEventListener("mouseenter", () => {
      this.callbacks.onCellHover(trackIndex, cellIndex);
    });
    cell.addEventListener("mouseleave", () => {
      this.callbacks.onCellHover(trackIndex, null);
    });
  }

  private installGripHandlers(
    grip: HTMLElement,
    trackIndex: number,
    startCell: number,
  ): void {
    grip.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const placement = this.chords[trackIndex]?.[startCell];
      if (!placement) return;
      const cellsWrap = grip.closest(".tl-cells") as HTMLElement | null;
      if (!cellsWrap) return;
      const rect = cellsWrap.getBoundingClientRect();
      const total = this.totalCells();
      const cellPx = rect.width / total;
      if (!Number.isFinite(cellPx) || cellPx <= 0) return;
      this.dragState = {
        track: trackIndex,
        startCell,
        startDuration: placement.duration,
        pointerStartX: e.clientX,
        cellPx,
        pointerId: e.pointerId,
      };
      grip.setPointerCapture(e.pointerId);
      grip.classList.add("dragging");
    });
    grip.addEventListener("pointermove", (e) => {
      if (!this.dragState) return;
      const {
        track,
        startCell: sc,
        startDuration,
        pointerStartX,
        cellPx,
      } = this.dragState;
      const dx = e.clientX - pointerStartX;
      const deltaCells = Math.round(dx / cellPx);
      const maxDur = this.maxDurationAt(track, sc, true);
      const next = Math.max(1, Math.min(maxDur, startDuration + deltaCells));
      const row = this.chords[track];
      if (!row) return;
      const current = row[sc];
      if (!current || current.duration === next) return;
      row[sc] = { dyad: current.dyad, duration: next };
      this.rebuildTrack(track);
      this.callbacks.onPlacementChanged();
    });
    const endDrag = (e: PointerEvent): void => {
      if (!this.dragState) return;
      try {
        grip.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      grip.classList.remove("dragging");
      this.dragState = null;
    };
    grip.addEventListener("pointerup", endDrag);
    grip.addEventListener("pointercancel", endDrag);
  }
}
