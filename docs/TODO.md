# TODO

Pending version 0.1

Tracked out of the scope of round 1 (the torus-dyad prototype). Items are
grouped by the book chapter or geometric structure they implement. Order
inside each group is rough priority.

## Near term — finish what the prototype implies

- [ ] Persist timeline state to `localStorage` so reloading keeps the
      current progression. (Theme and panel-split fractions are already
      persisted; chord data is not.)
- [ ] Export progression as MIDI (or at least as a JSON scratch format).
- [ ] Import a MIDI file and project its dyads onto the torus.
- [x] Pick a chord directly from the torus (left-click a node → sets the
      current dyad). — *round 2*
- [x] Drag the right edge of a placed chord to extend / shrink its
      duration; stops at the next chord. — *round 3*
- [x] Starter templates: I-V-vi-IV, Pachelbel, 12-bar blues, ii-V-I.
      — *round 3*
- [x] Three distinct curve colors on the torus, one per track, using
      Catmull-Rom interpolation. — *round 3*
- [x] Highlight every currently-sounding dyad (not just one) during
      playback. — *round 5*
- [x] Close each track's curve head-to-tail (loop playback matches
      loop visualization). — *round 5*
- [x] Red progress indicator (marker + connecting line across tracks)
      during playback. — *round 5*
- [x] Color each node with its track's color on its trajectory (first
      track wins on shared nodes). — *round 5*
- [x] Preset dropdown shows the loaded preset's name until the user
      edits; reverts to placeholder on edit. — *round 5*
- [x] Fix drag-to-extend so rebuilds don't drop pointer capture and
      chord data survives arbitrary drags. — *round 5*
- [x] Fix mute/unmute closure bug; replace text with volume icon. —
      *round 5*
- [ ] Undo / redo for timeline edits.
- [ ] Transpose button (± semitone) that rotates the torus path, not just
      the underlying notes.
- [ ] Per-track volume sliders (currently only mute / unmute).
- [ ] More than three tracks; add / remove tracks from the UI.
- [ ] Swing / groove templates rather than rigid grid playback.
- [ ] Extra instrument voices — at least one inharmonic (FM bell /
      plucked-string Karplus-Strong) on top of the four basic waveforms.
- [ ] More starter templates (Hallelujah, Autumn Leaves, minor blues,
      tritone-sub turnaround, chromatic mediant walk).
- [ ] Keyboard shortcut for drag-to-extend (`Shift + →` extends the
      selected chord by one cell; `Shift + ←` shrinks it).

## Hook — *Exploring Musical Spaces*

- [ ] Pitch-class circle `S¹` view: the simplest space, good landing view
      for first-time users.
- [ ] Voice-leading lattice for ordered n-tuples (n = 2, 3, 4) with a
      selectable norm (taxicab, Euclidean, max).
- [ ] Interval cycles (C3, C4, C6 etc.) rendered as closed paths on `T²`.
- [ ] Fourier / DFT-of-pitch-class-set visualization as magnitude polygon
      (Hook ch. on Quinn / Amiot).

## Tymoczko — *A Geometry of Music*

- [ ] **Dyad orbifold** `T²/S₂`: Möbius strip for unordered dyads. Requires
      a real quotient — use an unfolded fundamental domain and render the
      identification with a colored boundary.
- [ ] **Triad orbifold** `T³/S₃`: twisted triangular prism. Render the
      prism, color by consonance, and let the user walk a three-voice
      progression through it.
- [ ] Efficient voice-leading between chord *types* (set classes), not just
      concrete chords.
- [ ] Tymoczko's "cross-sections" visualization: slicing the orbifold at a
      fixed sum-class.

## Schoenberg — *Theory of Harmony*

- [ ] Function-based region graph (T, D, S) with modulation paths.
- [ ] Roman-numeral analysis overlay: given a key, label each placed chord
      with its functional role.
- [ ] Cadence recognizer that highlights authentic / plagal / deceptive
      endings.

## Neo-Riemannian

- [ ] Classic Tonnetz: triangular lattice of triads, P/L/R operations as
      colored edges, rendered as a torus.
- [ ] PLR compound operations (Cube Dance, Power Towers, Waller graph).

## App / infra

- [ ] Replace the ad-hoc in-`main.ts` state with a small store (signals or
      plain pub/sub). The wiring is already dense enough to justify it.
- [ ] Unit tests for `chord.ts` pure functions (`dyadInterval`, `dyadKey`,
      `midiToFrequency`).
- [ ] Playwright smoke test that loads the app, clicks a cell, presses
      Play, and confirms the playhead advances.
- [ ] Accessibility pass: keyboard-only timeline navigation, live-region
      announcements for the currently playing chord.
- [ ] Mobile-friendly gesture layer for the 3D view.

## Deploy / docs

- [ ] `/examples/` page in the docs site with pre-loaded progressions
      ("ii–V–I", "tritone substitution", "chromatic mediant walk").
- [ ] PDF export of the docs site for offline reading.
- [ ] Versioned docs (`docs/versions/<semver>.md`) once we cut 0.1.0.
