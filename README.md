# Geometry of Music

Interactive 3D applets for studying the geometry of musical spaces — chord
lattices, voice-leading graphs, and the orbifolds that carry them. A small
joint project by Zheyuan Wu and Prof. Renato Feres.

The first prototype ships one space: **ordered two-note chords embedded on a
torus**, with a timeline you can compose into and a synth that plays the
result. The navbar scaffolds the other spaces (Tonnetz, orbifolds, Schoenberg
function regions, Hook's voice-leading lattices) we plan to add in later
rounds.

References behind the project:

- Julian Hook, *Exploring Musical Spaces*.
- Dmitri Tymoczko, *A Geometry of Music: Harmony and Counterpoint in the
  Extended Common Practice*.
- Arnold Schoenberg, *Theory of Harmony*.

## Quick start

```bash
git clone --recurse-submodules https://github.com/Trance-0/GeometryOfMusic.git
cd GeometryOfMusic
npm install
npm run dev                            # http://127.0.0.1:5173
```

Useful scripts:

| Command               | What it does                                   |
|-----------------------|------------------------------------------------|
| `npm run dev`         | Vite dev server with hot reload.               |
| `npm run typecheck`   | `tsc --noEmit`, strict.                        |
| `npm run build`       | Production bundle in `dist/`.                  |
| `npm run preview`     | Serve the built bundle locally.                |
| `npm run deploy:cf`   | Build + push `dist/` to Cloudflare Pages.      |
| `npm run docs:serve`  | Live mkdocs-material server for the docs site. |
| `npm run docs:build`  | Strict mkdocs build.                           |

## How to drive the app

See [docs/usage.md](docs/usage.md) for the full tour. Short version:

1. Pick a dyad (voice A, voice B, octave).
2. Click cells on the timeline to place the current dyad.
3. Press **Play**. The torus lights up each node as it plays and traces the
   progression as a polyline on the surface.

## Deployment

Two separate deploys, two docs pages:

- **App** → Cloudflare Pages (preferred) or Vercel.
  See [docs/deployment/cloudflare-pages.md](docs/deployment/cloudflare-pages.md)
  and [docs/deployment/vercel.md](docs/deployment/vercel.md).
- **Docs site** → GitHub Pages, built with mkdocs-material.
  See [docs/deployment/github-pages-docs.md](docs/deployment/github-pages-docs.md).

The app deploy workflow is `.github/workflows/deploy-app.yml`; the docs
deploy workflow is `.github/workflows/deploy-docs.yml`.

## What's next

Tracked in [docs/TODO.md](docs/TODO.md). Highlights: dyad orbifold (Möbius),
triad orbifold, classical Tonnetz, Schoenberg region graph, MIDI import /
export.

## Repo layout

```
.
├── index.html                  single app entry
├── src/                        TypeScript sources
├── docs/                       mkdocs site (deployed to GitHub Pages)
├── AGENTS.md/                  git submodule: canonical agent rules
├── CLAUDE.md                   single-line include of AGENTS.md/AGENTS.md
├── mkdocs.yml                  docs site config
├── vite.config.ts              app bundler config
├── package.json                scripts + deps
└── .github/workflows/          deploy-app.yml, deploy-docs.yml
```

Agent rules live in the [AGENTS.md submodule](AGENTS.md/AGENTS.md); the
project-local end-of-round checklist is
[docs/LLM_CHECK.md](docs/LLM_CHECK.md).

## License

MIT — see [LICENSE](LICENSE).
