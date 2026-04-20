import { dyadName, type Dyad } from "./chord.js";

export interface TimelineSettings {
  bars: number;
  // Beats per bar (top of time signature).
  beatsPerBar: number;
  // Subdivisions per beat (4 -> quarters, 8 -> eighths, 16 -> sixteenths).
  // We interpret the UI "subdivision" as number of cells per bar / 4. So
  // subdivision=16 with 4 beats per bar gives 16 cells per bar.
  cellsPerBar: number;
}

export interface TimelineCallbacks {
  onCellClick(index: number, shift: boolean): void;
  onCellHover(index: number | null): void;
}

export class TimelineView {
  private readonly root: HTMLElement;
  private readonly callbacks: TimelineCallbacks;
  private settings: TimelineSettings;
  private chords: (Dyad | null)[] = [];
  private activeIndex: number | null = null;

  constructor(root: HTMLElement, cb: TimelineCallbacks) {
    this.root = root;
    this.callbacks = cb;
    this.settings = { bars: 4, beatsPerBar: 4, cellsPerBar: 8 };
    this.rebuild();
  }

  configure(settings: Partial<TimelineSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.rebuild();
  }

  totalCells(): number {
    return this.settings.bars * this.settings.cellsPerBar;
  }

  getChords(): ReadonlyArray<Dyad | null> {
    return this.chords;
  }

  setChord(index: number, chord: Dyad | null): void {
    if (index < 0 || index >= this.totalCells()) return;
    this.chords[index] = chord;
    const cell = this.cellAt(index);
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

  setActive(index: number | null): void {
    if (this.activeIndex !== null) {
      const prev = this.cellAt(this.activeIndex);
      prev?.classList.remove("active");
    }
    this.activeIndex = index;
    if (index !== null) {
      const cur = this.cellAt(index);
      cur?.classList.add("active");
      cur?.scrollIntoView({
        behavior: "smooth",
        inline: "nearest",
        block: "nearest",
      });
    }
  }

  private cellAt(index: number): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(
      `[data-cell-index="${index}"]`,
    );
  }

  private rebuild(): void {
    const total = this.totalCells();
    const nextChords: (Dyad | null)[] = [];
    for (let i = 0; i < total; i++) nextChords.push(this.chords[i] ?? null);
    this.chords = nextChords;

    this.root.textContent = "";
    this.root.style.gridTemplateColumns = `repeat(${total}, minmax(42px, 1fr))`;

    const header = document.createElement("div");
    header.className = "beat-row header";
    header.style.display = "contents";
    for (let i = 0; i < total; i++) {
      const cell = document.createElement("div");
      cell.className = "beat-cell header-cell";
      const barIndex = Math.floor(i / this.settings.cellsPerBar) + 1;
      const cellInBar = i % this.settings.cellsPerBar;
      const cellsPerBeat =
        this.settings.cellsPerBar / this.settings.beatsPerBar;
      if (cellInBar === 0) {
        cell.textContent = `${barIndex}`;
      } else if (cellsPerBeat >= 1 && cellInBar % cellsPerBeat === 0) {
        cell.textContent = `${Math.floor(cellInBar / cellsPerBeat) + 1}`;
      }
      this.root.appendChild(cell);
    }

    for (let i = 0; i < total; i++) {
      const cell = document.createElement("div");
      cell.className = "beat-cell";
      const cellsPerBeat =
        this.settings.cellsPerBar / this.settings.beatsPerBar;
      if (cellsPerBeat >= 1 && i % this.settings.cellsPerBar === 0) {
        cell.classList.add("downbeat");
      }
      cell.dataset.cellIndex = String(i);
      const chord = this.chords[i];
      if (chord) {
        cell.classList.add("filled");
        cell.textContent = dyadName(chord);
        cell.title = dyadName(chord);
      }
      cell.addEventListener("click", (ev) => {
        this.callbacks.onCellClick(i, ev.shiftKey);
      });
      cell.addEventListener("mouseenter", () => this.callbacks.onCellHover(i));
      cell.addEventListener("mouseleave", () => this.callbacks.onCellHover(null));
      this.root.appendChild(cell);
    }
  }
}
