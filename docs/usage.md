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

## Three tracks, four instruments

The lower panel has three tracks. Each track has an instrument selector
and a mute toggle in its header:

| Default track | Default instrument |
|---------------|--------------------|
| Lead          | Triangle lead      |
| Bass          | Sine bass          |
| Pad           | Saw pad            |

Available instruments: **Triangle**, **Sine**, **Sawtooth**, **Square**. All
are raw Web Audio oscillators with a short attack/release envelope; the
point is tonal distinction, not fidelity. Mute a track to skip it during
playback without losing its chord data.

Tracks play in parallel — one step of the scheduler triggers every
un-muted track's dyad at that cell.

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
