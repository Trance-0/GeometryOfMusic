# LLM_CHECK — Geometry of Music

End-of-round checklist. Canonical template source:
[AGENTS.md/docs/LLM_CHECK.md](../AGENTS.md/docs/LLM_CHECK.md). This file is
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

Refer to [AGENTS.md/docs/LLM_CHECK.md §2](../AGENTS.md/docs/LLM_CHECK.md)
for the canonical checklist. The items that need extra care in this repo:

- [ ] `npm run typecheck` passes (strict TypeScript).
- [ ] `npm run build` produces a `dist/` that previews correctly
      (`npm run preview`).
- [ ] `npm run docs:build` passes `--strict` (mkdocs-material installed).
- [ ] Deployment docs under `docs/deployment/` match the commands in
      `package.json` and `.github/workflows/`.
- [ ] `README.md`, `docs/readme.md`, and `docs/usage.md` still describe
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
- 2026-04-20: Wrote `docs/readme.md`, `docs/usage.md`, `docs/TODO.md`,
  `docs/LLM_CHECK.md`, and deployment guides for CF Pages, Vercel, and
  GitHub Pages (docs). Root `README.md` kept brief with links into
  `docs/`.
