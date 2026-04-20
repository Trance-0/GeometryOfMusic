# How the project works

Human-facing summary of the codebase. For day-to-day use, see
[usage.md](usage.md). For what's still missing, see [TODO.md](TODO.md).

## Problem it solves

Music-theory books (Hook, Tymoczko, Schoenberg) describe the space of chords
as a geometric object. The learner sees *diagrams*; they rarely get to *move*
through the space with their hands. This app provides a minimal interactive
sandbox for doing exactly that, starting with the simplest interesting case:
two-note chords embedded on a torus.

## System in words

There is no backend. The entire app is a static Vite + TypeScript bundle that
runs in the browser.

Three panels compose the app, separated by a **drag handle** that lets you
resize the upper 3D view against the lower timeline. The fraction is
persisted per browser as `gom.upper.fraction` in `localStorage`.

1. **Lattice view** (upper 3D panel). A `TorusView` built with three.js. 144
   ordered dyad nodes are placed on the surface of a torus at angle
   `(2π·a/12, 2π·b/12)` (voice A along the major circle, voice B along the
   minor circle). Nodes are colored by interval class. Adjacent nodes — those
   that differ by a semitone in exactly one voice — are connected with edges,
   giving the 12×12 toroidal grid graph. Both the wireframe shell and the
   nodes live in the XY plane so their axes agree (an earlier round rotated
   the shell by π/2 around X, which desynchronized them).
   - **Left click** raycasts onto the nearest node and sets the current
     dyad; `OrbitControls.mouseButtons.LEFT` is set to `-1` so the orbit
     itself never consumes the click.
   - **Middle drag** rotates (remapped from the default left-drag).
   - **Right drag** pans.
   - **Scroll** zooms.
   - A **Reset view** overlay button in the upper-left snaps the camera
     back to the initial framing.
2. **Transport** (middle). Play / Stop, BPM, meter (3/4, 4/4, 6/8),
   subdivision (1/4, 1/8, 1/16), bar count, a current-dyad picker
   (voice A, voice B, octave), and a **dark / light theme toggle** on the
   right side of the first row.
3. **Timeline view** (lower panel). Three tracks × (bars × cells-per-bar)
   cells. Each track has a colored swatch (matching the track's curve
   color on the torus), an instrument selector, and a mute toggle.
   Chords are stored as `Placement` objects (dyad + duration in cells);
   the grid renders each placement as a single element that spans the
   right number of columns, with a **drag-to-extend grip** on its right
   edge. Click-to-place / click-to-clear works on any cell (clicking a
   cell covered by a span edits the owning span). Full keyboard
   navigation: arrows move the selection cursor, Enter places the
   current dyad, Backspace clears. A first-row transport control
   **Preset** drop-down loads starter progressions
   (I-V-vi-IV, Pachelbel, 12-bar blues, ii-V-I) across all three
   tracks with their natural chord durations.

Audio is generated with the Web Audio API. `SynthEngine` maintains one
`AudioContext`, three `GainNode` track buses, and four oscillator
waveforms (`triangle`, `sine`, `sawtooth`, `square`). Each scheduled step
triggers every un-muted track's dyad on its track bus; envelopes are
short attack / short release so successive chords don't click.

The navbar lists the musical spaces we want to eventually cover. Only
**Torus (dyads)** is enabled in this round; the rest are disabled
placeholders that describe the structure they will host.

## First-visit tour

`installTour()` shows a modal on first load (keyed as
`gom.tour.seen.v1`). It explains mouse controls, keyboard shortcuts, the
three tracks, the resize handle, and the theme toggle. The **?** button
in the top-right reopens it. The "Don't show this on next start"
checkbox is enabled by default; unchecking it makes the modal reappear
next time.

## Runtime shape

- Language: TypeScript (strict mode).
- Framework: none. Plain DOM + three.js.
- Package manager: npm.
- Build tool: Vite 5.
- Docs: mkdocs-material (built by GitHub Actions).

## Code map

```text
src/
├── main.ts             ← wiring / app state / transport scheduler
├── style.css           ← dark+light themes, three-panel grid + modal
├── chord.ts            ← pitch classes, dyads, interval-class colors,
│                         MIDI ↔ frequency helpers
├── navbar.ts           ← navbar registry of musical spaces
├── torus-view.ts       ← three.js scene: torus shell (low-poly,
│                         theme-tinted), 144 nodes, voice-leading
│                         edges, per-track Catmull-Rom curves,
│                         left-click raycaster, reset-view camera snap
├── timeline-view.ts    ← DOM grid for 3 tracks; Placement (dyad +
│                         duration in cells), click / keyboard ops,
│                         drag-to-extend span handle with grid snap
├── audio.ts            ← SynthEngine (Web Audio, per-track buses,
│                         4 oscillator waveforms, envelope)
├── presets.ts          ← starter progressions (I-V-vi-IV, Pachelbel,
│                         12-bar blues, ii-V-I) voiced across 3 tracks
├── theme.ts            ← dark / light theme toggle + localStorage
├── tour.ts             ← first-visit welcome modal + ? button re-open
└── resizer.ts          ← drag handle that splits upper vs lower panel
```

Root files:

- `index.html` — single HTML entry.
- `vite.config.ts` — sets `base` from `VITE_BASE` for GitHub Pages subpaths.
- `tsconfig.json` — strict, ES2022, bundler resolution.
- `package.json` — build, typecheck, preview, CF Pages deploy scripts.
- `mkdocs.yml` — docs site config.

## Deployment topology

Two deploy targets, picked for their respective strengths:

- **App** → Cloudflare Pages (preferred) or Vercel. Both host the static
  Vite build (`dist/`) at a root URL, so the app is built with `VITE_BASE=/`.
  See [deployment/cloudflare-pages.md](deployment/cloudflare-pages.md) and
  [deployment/vercel.md](deployment/vercel.md).
- **Docs site** → GitHub Pages. The `docs/` folder is built with
  mkdocs-material and deployed under `/<repo>/`. The workflow sets
  `site_url` / base automatically. See
  [deployment/github-pages-docs.md](deployment/github-pages-docs.md).

## Local-dev bootstrap

Exact commands, in order:

```bash
git clone --recurse-submodules https://github.com/Trance-0/GeometryOfMusic.git
cd GeometryOfMusic
npm install
npm run dev            # app dev server at http://127.0.0.1:5173
npm run typecheck      # tsc --noEmit
npm run build          # production bundle into dist/
npm run preview        # preview the built bundle locally
```

For the docs site:

```bash
pip install mkdocs-material
npm run docs:serve     # http://127.0.0.1:8000
npm run docs:build     # strict build into site/
```

## Math behind the torus (one-page version)

Pitch-class space is the circle `Z/12Z` embedded in `S¹`. The space of
ordered two-note chords over twelve equal-tempered pitch classes is then
`(Z/12Z)² ⊂ T² = S¹ × S¹`. The natural voice-leading metric is the taxicab
metric on `T²`: two dyads are adjacent when they differ by exactly one
semitone in exactly one voice. That gives the toroidal grid graph this app
renders — 144 vertices, 288 edges, 4-regular.

Unordered dyads live on the quotient `T²/S₂`, which is a Möbius strip (see
Tymoczko, ch. 3). Implementing that quotient correctly is one of the next
features; see [TODO.md](TODO.md).

Interval class is the diagonal coordinate `ic(a, b) = (b − a) mod 12`. It is
constant along one family of grid lines on `T²`, which is why interval
coloring produces a clean diagonal striping pattern when you look at the
torus head-on.
