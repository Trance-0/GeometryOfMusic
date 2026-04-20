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

Three views compose the app:

1. **Lattice view** (upper 3D panel). A `TorusView` built with three.js. 144
   ordered dyad nodes are placed on the surface of a torus at angle
   `(2π·a/12, 2π·b/12)` (voice A along the major circle, voice B along the
   minor circle). Nodes are colored by interval class. Adjacent nodes — those
   that differ by a semitone in exactly one voice — are connected with edges,
   giving the 12×12 toroidal grid graph.
2. **Transport** (middle). Play / Stop, BPM, meter (3/4, 4/4, 6/8), subdivision
   (1/4, 1/8, 1/16), bar count, and a current-dyad picker (voice A, voice B,
   octave).
3. **Timeline view** (lower panel). A grid of cells, one per subdivision.
   Clicking a cell writes the current dyad into that beat; clicking a filled
   cell clears it. A playhead outlines the active cell during playback.

Audio is generated with the Web Audio API. `DyadSynth` maintains a single
`AudioContext`, plays each scheduled dyad as two triangle-wave oscillators
with a short attack/release envelope, and stops cleanly when the user stops
transport.

The navbar lists the musical spaces we want to eventually cover. Only
**Torus (dyads)** is enabled in this round; the rest are disabled placeholders
that describe the structure they will host.

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
├── style.css           ← dark UI, three-panel grid layout
├── chord.ts            ← pitch classes, dyads, interval-class colors,
│                         MIDI ↔ frequency helpers
├── navbar.ts           ← navbar registry of musical spaces
├── torus-view.ts       ← three.js scene for the torus + dyad lattice
├── timeline-view.ts    ← DOM grid for placing dyads on beats
└── audio.ts            ← DyadSynth (Web Audio, 2 voices, triangle + envelope)
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
