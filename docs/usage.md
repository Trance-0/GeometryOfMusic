# Using the app

This is a quick tour. For the architecture, see [readme.md](readme.md).

## The three panels

```
┌────────────────────────────────────────────┐
│ navbar: choose a musical space             │
├────────────────────────────────────────────┤
│                                            │
│        upper panel: 3D torus lattice       │
│        (drag to orbit, scroll to zoom)     │
│                                            │
├────────────────────────────────────────────┤
│  transport: Play / Stop / BPM / meter /    │
│  subdivision / bars / current dyad         │
├────────────────────────────────────────────┤
│                                            │
│        lower panel: beat-grid timeline     │
│                                            │
└────────────────────────────────────────────┘
```

## Step 1 — pick a dyad

In the **Current dyad** block, set:

- **Voice A** — the lower voice (pitch class 0–11, i.e. C through B).
- **Voice B** — the upper voice.
- **Octave** — the octave at which voice A is voiced for audio playback.
  Voice B plays in the same octave unless that would cross voice A, in which
  case you will hear a crossed dyad (this is intentional — voice crossings
  are musically meaningful in the torus embedding).

The chord name updates live next to the pickers, e.g. `C–E · maj 3rd`. The
matching node on the torus glows and scales up so you can see where that
dyad sits in the lattice.

## Step 2 — place it on the timeline

Click any cell in the lower timeline to drop the current dyad there. Click
the cell again to clear it. Each filled cell shows the dyad name; hover to
read the full tooltip.

The cell grid updates with the transport:

- **Meter** changes how many beats make up one bar (`3/4`, `4/4`, `6/8`).
- **Subdivision** changes how many cells fit into one beat (`1/4` → 1 cell,
  `1/8` → 2 cells, `1/16` → 4 cells).
- **Bars** changes the total length of the timeline.

Changing any of these rebuilds the grid, keeping the dyads you already
placed at their original cell index when possible.

## Step 3 — play it

Press **Play**. The app:

1. Resumes the audio context (required by browsers the first time).
2. Walks the timeline one cell at a time at `60000 / BPM / cellsPerBeat`
   milliseconds per cell.
3. For each cell with a dyad, plays both notes through a Web Audio synth and
   glows the matching node on the torus.
4. Draws a line on the torus through every placed dyad in order, so the full
   progression traces out as a path on the surface.

**Stop** halts playback and returns the playhead to the start. **Play**
toggles to **Pause** while running.

## Step 4 — read the torus

Nodes are colored by interval class (see the legend in the upper-right of
the 3D view):

- *Tritone, minor 6th, major 7th* — dissonant, saturated colors.
- *Perfect 4th / 5th* — teal / blue, the classic consonant dyads.
- *Major / minor 3rd and 6th* — warm yellow / orange / pink.
- *Unison* — neutral grey, on the main diagonal.

Edges connect dyads that differ by a single semitone in exactly one voice.
That is the standard voice-leading adjacency on the torus. A short
progression that sounds "smooth" will draw short edges; one that sounds
"jumpy" will cross the surface with long chords.

The yellow polyline overlays the full progression so you can see the path
at a glance even when no chord is currently playing.

## Keyboard and mouse tips

- **Drag** the 3D view to orbit. **Scroll** to zoom. **Right-drag** to pan.
- **Shift + click** a timeline cell to overwrite it without toggling.
- Changing the current dyad while playback is running does not retroactively
  rewrite scheduled cells — only cells you click while the new dyad is
  selected take the new value.

## What is not yet available

Most of the navbar is deliberately disabled. Those are the next spaces to
build: see [TODO.md](TODO.md) for the priority order.
