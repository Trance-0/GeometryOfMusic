# Geometry of Music

Interactive 3D applets for studying the geometry of musical spaces:
chord lattices, voice-leading graphs, and the orbifolds that carry
them. A teaching / research sandbox organized as a collection of
**experiments**, each one a different space.

Reference books behind the project:

- Julian Hook, *Exploring Musical Spaces*.
- Dmitri Tymoczko, *A Geometry of Music*.
- Arnold Schoenberg, *Theory of Harmony*.

## Where to start

- **[Usage](usage.md)** — drive the app: pick a dyad, place it on the
  timeline, watch the lattice light up as it plays, load a starter
  progression.
- **[Experiments](experiment/index.md)** — one page per musical
  space. Each page explains the space in music-theory terms, in
  mathematical terms, and how the app renders it (or plans to).
- **[Versions](versions/index.md)** — per-round changelog.
- **[Roadmap](TODO.md)** — what's still missing.
- **Deployment**
  - [Cloudflare Pages (app)](deployment/cloudflare-pages.md) — preferred app host.
  - [Vercel (app)](deployment/vercel.md) — alternative app host.
  - [GitHub Pages (docs site)](deployment/github-pages-docs.md) — how
    this docs site is published.
- **[Agent checklist](LLM_CHECK.md)** — end-of-round verification.

## One-paragraph pitch

Musical objects — chords, scales, voice leadings — live in
well-understood geometric spaces. The orbifold of three-note chords
is a twisted triangular prism; the orbifold of two-note chords is a
Möbius strip; pitch-class space is a circle. When you compose, you are
drawing a path through one of these spaces. This app tries to make
the path visible.

The first experiment, [Torus (ordered dyads)](experiment/torus-dyad.md),
is shipped. The rest are scaffolded placeholders in the navbar and
described on their own pages.

## How the app is put together

There is no backend. The entire app is a static Vite + TypeScript
bundle that runs in the browser, plus a separate mkdocs-material
docs site (this site).

Three panels compose the app, separated by a **drag handle** that
resizes the upper 3D view against the lower timeline
(persistent per browser):

1. **Lattice view** (upper 3D panel) — a three.js scene. Left click
   picks a node; middle-drag rotates; right-drag pans; scroll zooms.
   A **Reset view** button and a **Hide torus** checkbox sit on the
   upper-left overlay. Interval-class / track-curve legend is on the
   upper-right.
2. **Transport** (middle) — Play / Stop, BPM, meter, subdivision,
   bars, current-dyad picker, starter-preset loader, and a dark /
   light theme toggle.
3. **Timeline view** (lower panel) — three tracks × (bars × cells
   per bar) cells. Each track has a colored swatch (matching its
   curve on the torus), an instrument selector, and a mute toggle.
   Chords are stored as `Placement` objects (dyad + duration in
   cells); a **drag grip** on the right edge of a placed chord
   extends or shrinks its span, snapping to the grid and stopping
   at the next chord. Full keyboard navigation.

Audio is generated with the Web Audio API — one `SynthEngine`
managing three per-track `GainNode` buses and four oscillator
waveforms (triangle, sine, sawtooth, square) with a short
attack / release envelope.

## Code map

```text
src/
├── main.ts             ← wiring / app state / transport scheduler
├── style.css           ← dark+light themes, three-panel grid, modal
├── chord.ts            ← pitch classes, dyads, interval-class
│                         colors, MIDI ↔ frequency helpers
├── navbar.ts           ← registry of musical spaces (see experiment/)
├── torus-view.ts       ← three.js scene for the Torus (dyads)
│                         experiment: low-poly wireframe, 144 nodes,
│                         voice-leading edges, per-track Catmull-Rom
│                         curves, raycaster pick, hide-torus mode
├── timeline-view.ts    ← DOM grid: 3 tracks, Placement model,
│                         click / keyboard ops, drag-to-extend
├── audio.ts            ← SynthEngine (per-track GainNode buses, 4
│                         oscillator waveforms, envelope)
├── presets.ts          ← starter progressions (I-V-vi-IV, Pachelbel,
│                         12-bar blues, ii-V-I)
├── theme.ts            ← dark / light theme toggle + localStorage
├── tour.ts             ← first-visit welcome modal + ? button re-open
└── resizer.ts          ← drag handle that splits upper vs lower panel
```

## Deployment topology

Two deploy targets, two workflows:

- **App** → Cloudflare Pages (preferred) or Vercel. Both host the
  static Vite build (`dist/`) at a root URL, so the app is built with
  `VITE_BASE=/`. See
  [deployment/cloudflare-pages.md](deployment/cloudflare-pages.md)
  and [deployment/vercel.md](deployment/vercel.md).
- **Docs site** → GitHub Pages. The `docs/` folder is built with
  mkdocs-material and deployed under `/<repo>/`. See
  [deployment/github-pages-docs.md](deployment/github-pages-docs.md).

## Local-dev bootstrap

```bash
git clone --recurse-submodules https://github.com/Trance-0/GeometryOfMusic.git
cd GeometryOfMusic
npm install
npm run dev            # app dev server at http://127.0.0.1:5173
npm run typecheck
npm run build
npm run preview
```

For the docs site:

```bash
pip install mkdocs-material
npm run docs:serve     # http://127.0.0.1:8000
npm run docs:build     # strict build into site/
```
