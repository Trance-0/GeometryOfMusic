# Using the app

Tour of the prototype. For the architecture, see [readme.md](readme.md); for
the roadmap, [TODO.md](TODO.md).

On first visit a **welcome modal** walks through mouse, keyboard, and theme
shortcuts. You can reopen it any time from the **?** button in the top-right
corner.

## Panel layout

```text
┌────────────────────────────────────────────┐
│ navbar · help button (?)                   │
├────────────────────────────────────────────┤
│ [reset view]                               │
│        3D torus lattice (upper panel)      │
│        left click: pick node               │
│        middle drag: rotate                 │
│        right drag: pan                     │
│        scroll: zoom                        │
│                                   [legend] │
├════════════════════════════════════════════┤  ← drag to resize
│ transport · theme toggle                   │
│ current dyad · placement hints             │
├────────────────────────────────────────────┤
│        timeline (lower panel)              │
│        3 tracks × beat grid                │
└────────────────────────────────────────────┘
```

The thick bar between the 3D view and the transport is a drag handle:
**drag** it up or down to resize the upper and lower panels; **double-click**
to reset to the default split. Your chosen ratio is remembered per browser.

## Mouse controls on the 3D view

| Gesture         | Action                                              |
|-----------------|-----------------------------------------------------|
| Left click      | Select the clicked node as the current dyad.        |
| Middle drag     | Orbit the camera.                                   |
| Right drag      | Pan the camera.                                     |
| Scroll wheel    | Zoom (dolly).                                       |
| Touch, 1 finger | Orbit.                                              |
| Touch, 2 finger | Pan + pinch-zoom.                                   |

The **Reset view** button in the upper-left corner of the 3D view returns
the camera and orbit target to the starting framing.

## Keyboard shortcuts

Inside the **timeline** (click it once to focus):

| Key                | Action                                                  |
|--------------------|---------------------------------------------------------|
| ← / →              | Move the selection cursor one cell left / right.        |
| ↑ / ↓              | Move the selection cursor to the previous / next track. |
| Enter, Space       | Place the current dyad at the selected cell.            |
| Backspace, Delete  | Clear the selected cell.                                |

Outside the timeline (but not inside another input):

| Key       | Action                       |
|-----------|------------------------------|
| Space, P  | Toggle Play / Pause.         |
| Escape    | Close the welcome modal.     |

## Three tracks, four instruments, three curves

The lower panel has three tracks. Each track has an instrument selector,
a mute toggle, and a **colored swatch** that matches the curve drawn
through its progression on the torus:

| Track | Curve color | Default instrument |
|-------|-------------|--------------------|
| Lead  | Gold        | Triangle lead      |
| Bass  | Sky blue    | Sine bass          |
| Pad   | Pink        | Saw pad            |

Available instruments: **Triangle**, **Sine**, **Sawtooth**, **Square**.
All are raw Web Audio oscillators with a short attack/release envelope;
the point is tonal distinction, not fidelity. Mute a track to skip it
during playback without losing its chord data.

Tracks play in parallel — one step of the scheduler triggers every
un-muted track's chord that starts at that cell. Each track's placed
chords are linked on the torus by a smooth (Catmull-Rom) curve in the
track's color, so the three progressions appear as three distinct
paths on the surface.

## Chord durations — drag-to-extend

Every placed chord occupies one or more **cells** (the smallest unit of
the subdivision). The default is one cell. To hold a chord longer:

1. Hover the chord. A subtle right-edge grip appears.
2. **Drag the right edge** to the right (extend) or to the left
   (shrink). The chord snaps to grid boundaries — integer numbers of
   cells only.
3. The drag **stops at the next chord** on that track. You can never
   overwrite or overlap an existing chord by extending through it;
   clear the neighbour first if you need the room.

Holding a chord multiplies its audio duration by the cell count: a
chord spanning 8 cells plays one long held note that lasts 8 ×
(step duration) instead of eight separate attacks. This is what the
preset templates use — each preset chord spans the exact number of
cells of its original notation.

## Starter templates

The **Preset** menu in the first transport row drops familiar
progressions into the timeline, properly voiced across the three
tracks with appropriate chord durations:

- **I–V–vi–IV (C major)** — the "axis of awesome" pop progression
  behind *Let It Be*, *Don't Stop Believin'*, *With or Without You*,
  and many, many others. Four bars, one chord per bar.
- **Pachelbel's Canon (D major)** — the eight-chord ground bass
  (D · A · Bm · F#m · G · D · G · A) compressed to four bars, one
  chord every half note.
- **12-bar blues (C)** — the canonical I-IV-V blues form with
  dominant-seventh voicings on the IV and V chords and a V7
  turnaround at the end.
- **ii–V–I (C major)** — jazz turnaround Dm7 → G7 → Cmaj7 with the
  resolution held over two bars.

Each preset updates the meter, bar count, and subdivision to match its
notation, clears the timeline first, and then writes the chord spans
across all three tracks. You can edit any cell afterward or drag the
durations to reshape the rhythm.

## Workflow

1. **Pick a dyad.** Either:
   - Set **Voice A / Voice B / Octave** in the transport, or
   - **Left-click** a node on the torus.
2. **Select a cell.** Click a cell in the timeline, or use the arrow keys
   to move the cursor.
3. **Place.** Click the cell again, press **Enter**, or **Space** while the
   timeline has focus.
4. **Configure transport.** BPM, meter (3/4 · 4/4 · 6/8), subdivision
   (1/4 · 1/8 · 1/16), bars (1–16).
5. **Play.** Press **Play** (or Space outside the timeline). Each step:
   - every un-muted track's dyad plays on its instrument,
   - the torus node for the last dyad this step glows,
   - the playhead outlines the active cell.
6. **Read the torus.** The yellow polyline traces the full progression in
   order (the first non-null dyad of each step is what the path connects).

## Theme

The **Light theme / Dark theme** button at the right of the transport row
toggles the interface. The preference is remembered per browser. The 3D
view re-tints to match.

## What is not available yet

Most of the navbar entries are disabled placeholders (Tonnetz, Möbius dyad
orbifold, triad orbifold, voice-leading lattice, Schoenberg regions). See
[TODO.md](TODO.md) for the priority order of what we build next.
