# LLM_CHECK — Geometry of Music

End-of-round checklist. Canonical template source:
[AGENTS.md/docs/LLM_CHECK.md](https://github.com/Trance-0/AGENTS.md/blob/main/docs/LLM_CHECK.md). This file is
the project-local copy; when in doubt, defer to the template.

Project-specific notes live at the bottom in *Current round log*.

## 1. Common mistakes seen in prior rounds

General footguns from the canonical template apply; the project-specific
ones below come from the initial prototype round.

1. **Vite `base` not matching the deploy target.** Cloudflare Pages and
   Vercel serve the app at `/`, so `VITE_BASE=/` (the default). If you later
   decide to mirror the app onto GitHub Pages at `/<repo>/`, export
   `VITE_BASE=/GeometryOfMusic/` before `npm run build`. A mismatch here
   produces a blank page with 404s on every bundled asset — the classic
   project-Pages failure mode.
2. **AudioContext autoplay blocking.** Browsers suspend the context until a
   user gesture. `DyadSynth.resume()` is awaited inside the Play handler;
   do not call `playDyad` before `resume()` resolves, or the first chord
   will silently drop.
3. **Time-signature / subdivision math.** `cellsPerBar = cellsPerBeat ×
   beatsPerBar`. When you change meter, always recompute `cellsPerBar`
   before calling `timeline.configure`. Skipping this step desyncs the
   playhead.
4. **Three.js material disposal.** Every time a progression path is
   rebuilt, the old `THREE.Line` must be removed from the scene *and* its
   geometry + material disposed. Forgetting the dispose leaks GPU memory.
5. **GitHub Pages deploy for docs only.** The Pages workflow in this repo
   publishes `docs/` (via mkdocs), **not** the app. If you ever add an
   app-to-Pages workflow, put it in a separate file and use
   `paths:` filters so doc-only changes don't rebuild the app.

## 2. Round-end checklist

Refer to
[AGENTS.md/docs/LLM_CHECK.md §2](https://github.com/Trance-0/AGENTS.md/blob/main/docs/LLM_CHECK.md#2-round-end-checklist)
for the canonical checklist. The items that need extra care in this repo:

- [ ] `npm run typecheck` passes (strict TypeScript).
- [ ] `npm run build` produces a `dist/` that previews correctly
      (`npm run preview`).
- [ ] `npm run docs:build` passes `--strict` (mkdocs-material installed).
- [ ] Deployment docs under `docs/deployment/` match the commands in
      `package.json` and `.github/workflows/`.
- [ ] `README.md`, `docs/index.md`, and `docs/usage.md` still describe
      what actually ships. If you added or removed a UI control, all three
      must be touched in the same commit.
- [ ] `.gitignore` covers `node_modules/`, `dist/`, `site/`, `.vite/`,
      `.wrangler/`, and `.env*` with real values. Checked with
      `git diff --cached --name-only`.
- [ ] No `.env` file with real credentials is staged. Cloudflare /
      Vercel tokens live in GitHub Actions secrets, not in files.
- [ ] `AGENTS.md/` submodule is pointed at a known commit and not
      modified locally.

## 3. Current round log

Append, do not rewrite.

- 2026-04-20: **Round 6** — layout pass.
  - Hamburger nav on mobile. New `#nav-toggle` in the topbar, hidden
    above 720 px. Under 720 px, `#space-nav` becomes a full-width
    dropdown with `.open` toggled on click. Selecting a space or
    clicking outside auto-closes. `.brand-title` is hidden under
    720 px to reclaim space.
  - OrbitControls button swap. `mouseButtons.RIGHT = ROTATE`,
    `mouseButtons.MIDDLE = PAN`. Right-drag rotates like Blender;
    middle-drag pans; left is still the raycaster; scroll still
    zooms. The canvas already suppresses the browser context menu
    (round 2), so right-drag rotation is unobstructed.
  - Tour modal, transport hint, and `docs/usage.md` updated to
    match the new mapping. Tour line about Reset view now points at
    the top-right location.
  - Reset view + Hide torus moved to the top-right of the 3D view.
    The old `.lattice-overlay-tl` container was removed; a single
    `.lattice-overlay-tr` now contains a `.lattice-controls` flex
    row (button + checkbox on one row) and the legend stacked
    directly under it. Absolute positioning on `.legend` stripped.
  - Docs: wrote `docs/versions/0.0.6.md`, appended
    `docs/versions/index.md`, added to `mkdocs.yml` nav, ticked
    `docs/TODO.md`, appended this log.
- 2026-04-20: **Round 5** — playback visibility + timeline edit
  robustness.
  - `TorusView.highlightDyads(dyads)` replaces the single-dyad
    highlight during playback so every sounding track lights up its
    node. `playStep` now collects placements whose span covers the
    current cell, not just those starting at it, so held chords stay
    glowing for their whole duration.
  - `CatmullRomCurve3(pts, true, "centripetal")`: each track's
    progression is now a closed loop head-to-tail, matching the
    looping playback.
  - New `TorusView.setPlayhead(dyads)` renders a red marker at each
    currently-sounding dyad plus a red line connecting them when
    two+ tracks are active. Cleared on stop.
  - Nodes on a track's curve take the track's color; first-listed
    track wins on shared nodes. Unused nodes revert to interval-class
    color.
  - `state.currentPresetId` + `state.loadingPreset` flags added.
    The preset dropdown now keeps the loaded preset's name until the
    user edits anything, at which point `refreshPaths` clears it
    back to the "— Starter templates —" placeholder. Load itself is
    guarded so intermediate setChord calls don't self-clear.
  - Drag-to-extend bug fix: `installGripHandlers` used to
    `setPointerCapture` on the grip element itself, then call
    `rebuildTrack` on every accepted move — which destroyed the
    capturing element and dropped the drag. The pointermove /
    pointerup listeners are now on `document` so rebuilds don't
    break the drag. Clamp is still `[1, maxDurationAt]`.
  - Mute button: closure-captured `track` object became stale after
    rebuild, so the second click flipped the wrong value. Both the
    mute click handler and the instrument-selector change handler
    now read `this.settings.tracks[t]` live. Text `mute` / `unmute`
    swapped for SVG speaker icons (muted has an X), 24×22 footprint
    so the row stays within the 168px track header.
  - Added `body.resizing-cell` CSS so the ew-resize cursor stays
    active during the document-level drag.
  - Docs: wrote `docs/versions/0.0.5.md`, appended to
    `docs/versions/index.md`, ticked the new items in `docs/TODO.md`,
    appended this log entry.
- 2026-04-20: **Round 4** — minimal-mode toggle on the 3D view, plus
  a docs reorganization into per-experiment and per-version folders.
  - `TorusView.setMinimalMode(hide)` added. When hide=true the torus
    shell and the voice-leading grid edges become invisible, and
    every node that is not part of a current track path becomes
    invisible. The currently highlighted node stays visible so
    picker / keyboard selection still works even if the selected
    chord is not yet on any track.
  - `TorusView.setTrackPaths` now also rebuilds the set of "used"
    dyad keys so node visibility recomputes whenever the timeline
    changes.
  - New **Hide torus** checkbox in the upper-left overlay of the 3D
    view, next to **Reset view**. State persists in `gom.hideTorus`.
  - Docs reorganized: `docs/readme.md` was deleted. Its content was
    split across `docs/index.md` (landing + top-level architecture)
    and `docs/experiment/torus-dyad.md` (the torus-specific math /
    theory / rendering notes).
  - New `docs/experiment/` (name chosen to match the folder the user
    created) with one page per musical space, each with three
    sections: music-theory reading, mathematical reading, and how
    the app renders it (or plans to). Pages: `torus-dyad.md`
    (shipped), `tonnetz.md`, `dyad-orbifold.md`,
    `triad-orbifold.md`, `voice-leading.md`,
    `schoenberg-regions.md`, plus `index.md` as the overview.
  - New `docs/versions/` with one page per pre-0.1 round
    (0.0.1 through 0.0.4) plus an `index.md` overview. Each page
    summarizes the visible changes of the round for humans.
  - `mkdocs.yml` nav updated: new **Experiments** and **Versions**
    sections, old `readme.md` entry removed, MathJax loader added
    for the TeX-formatted math on the experiment pages.
  - Dangling `readme.md` references in `docs/usage.md`,
    `docs/LLM_CHECK.md`, and the round-2 log fixed or
    reinterpreted.
- 2026-04-20: **Round 3** — per-track curves, durations, starter
  templates, wireframe cleanup.
  - `TorusView.setProgressionPath` replaced with `setTrackPaths` that
    takes one `{ color, dyads }` entry per track and draws a
    Catmull-Rom (centripetal) curve in that color. Three tracks →
    three curves (gold / sky blue / pink).
  - Torus wireframe reduced from `TorusGeometry(R, r, 48, 96)` to
    `(R, r, 8, 24)` and made theme-aware: `applySceneTheme` now also
    retints the shell and the voice-leading edge lines. In light
    theme the shell is a subtle grey at lower opacity; in dark theme
    it is close to the earlier color. This addresses the complaint
    that the light-theme wireframe looked too dense.
  - `TrackRow.color` added; timeline track headers render a colored
    swatch that matches the torus curve so the link is visible from
    the lower panel.
  - Timeline data model upgraded from per-cell `Dyad | null` to
    per-cell `Placement | null` where `Placement = { dyad, duration
    in cells }`. Each placement renders as one DOM element spanning
    `duration` columns; empty cells render individually.
  - Drag-to-extend grip on the right edge of every placed chord.
    Pointer capture, pointer-per-cell math, grid snap, hard stop at
    the next placement on the same track.
  - Scheduler now multiplies per-cell step duration by
    `placement.duration` so a held chord plays as one long note
    instead of repeated attacks.
  - `src/presets.ts` shipped with four starter progressions:
    I–V–vi–IV (C), Pachelbel's Canon (D), 12-bar blues (C),
    ii–V–I (C). Each chord is voiced across lead / bass / pad with
    durations matching the original notation. A Preset dropdown in
    the first transport row loads them (clears the timeline and
    updates meter / bars / subdivision first).
  - `docs/usage.md` rewritten to document curves, durations,
    drag-to-extend, and the preset menu; `docs/index.md` and
    `docs/TODO.md` updated; this log entry appended.
  - Verified: `npm run typecheck` clean; `npm run build` clean
    (dist JS grew from ~497 KB to ~509 KB gzipped 132 KB — over the
    500 KB Vite warning threshold; acceptable for a three.js app
    and not worth splitting yet).
- 2026-04-20: **Round 2** — addressed visible regressions and expanded the
  interaction surface.
  - Fixed the torus / node axis mismatch: the shell mesh no longer rotates
    by π/2 around X; both the wireframe and `toroidalPosition` now live in
    the XY plane, so the nodes sit exactly on the wireframe.
  - Remapped OrbitControls: left click is consumed by a raycaster that
    picks a dyad node and sets the current dyad; middle-drag rotates;
    right-drag pans; scroll zooms. Touch mapping kept (one-finger rotate,
    two-finger pan + zoom).
  - Added a **Reset view** overlay button in the upper-left of the 3D
    view that snaps camera + orbit target back to the starting framing.
  - Timeline expanded to **three tracks** (Lead / Bass / Pad with
    Triangle / Sine / Saw as defaults). Each track has an instrument
    selector (4 waveforms) and a mute toggle. Added keyboard navigation:
    arrow keys move a selection cursor, Enter places the current dyad,
    Backspace clears.
  - Added a **drag-to-resize** handle between the 3D view and the
    transport; fraction persisted in `gom.upper.fraction`. Double-click
    the handle to reset.
  - Added a **theme toggle** (dark / light) on the right of the
    transport's first row; preference persisted in `gom.theme`. The 3D
    scene re-tints via `TorusView.applySceneTheme()`.
  - Added a **first-run welcome modal** with mouse / keyboard /
    track / theme tips; "Don't show again" checkbox persists via
    `gom.tour.seen.v1`. The **?** button in the top bar reopens it.
  - Audio: `DyadSynth` replaced with `SynthEngine` — a multi-track mixer
    with a per-track gain bus and four waveform instruments. Dropped the
    old single-voice API.
  - `TODO.md` updated: ticked off the "pick from torus" item; added
    track-count, per-track volume, swing, and FM/Karplus-Strong items.
- 2026-04-20: Initialized repo as a Vite + TypeScript prototype. Added
  `AGENTS.md` as a git submodule per owner request. Wrote the first space
  (**Torus / ordered dyads**): `TorusView` (three.js torus with 144 nodes +
  voice-leading edges + progression path), `TimelineView` (DOM grid, bars /
  meter / subdivision), `DyadSynth` (Web Audio, 2 voices, triangle +
  envelope), `mountNavbar` with placeholders for Tonnetz / orbifolds /
  Schoenberg functions. Timeline preloads a C–E / F–A / G–B / C–E
  progression so Play has content out of the box.
- 2026-04-20: Added deployment plumbing. `deploy-app.yml` builds the app
  and pushes `dist/` to Cloudflare Pages (project name
  `geometry-of-music`). `deploy-docs.yml` builds `docs/` with
  mkdocs-material and publishes to GitHub Pages under `/GeometryOfMusic/`.
  Alternative Vercel instructions documented but no workflow yet.
- 2026-04-20: Wrote `docs/index.md`, `docs/usage.md`, `docs/TODO.md`,
  `docs/LLM_CHECK.md`, and deployment guides for CF Pages, Vercel, and
  GitHub Pages (docs). Root `README.md` kept brief with links into
  `docs/`.
