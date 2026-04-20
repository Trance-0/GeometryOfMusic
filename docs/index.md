# Geometry of Music

Interactive 3D applets for studying the geometry of musical spaces: chord
lattices, voice-leading graphs, and the orbifolds that carry them. Built as a
companion sandbox to:

- Julian Hook, *Exploring Musical Spaces*.
- Dmitri Tymoczko, *A Geometry of Music*.
- Arnold Schoenberg, *Theory of Harmony*.

This is a research / teaching prototype, not a DAW. The first round ships one
space — **ordered dyads on a torus** — with more structures scaffolded in the
navbar and listed in [the roadmap](TODO.md).

## Where to start

- **[Usage](usage.md)** — drive the prototype: pick a dyad, place it on the
  timeline, watch the lattice light up as it plays.
- **[How the project works](readme.md)** — architecture, the three views, the
  math behind the torus embedding, the audio path.
- **Deployment**
  - [Cloudflare Pages](deployment/cloudflare-pages.md) — preferred app host.
  - [Vercel](deployment/vercel.md) — alternative app host.
  - [GitHub Pages (docs site)](deployment/github-pages-docs.md) — how this
    docs site is published.
- **[Roadmap](TODO.md)** — what's missing, what's next.
- **[Agent checklist](LLM_CHECK.md)** — end-of-round verification.

## One-paragraph pitch

Musical objects — chords, scales, voice leadings — live in well-understood
geometric spaces. The orbifold of three-note chords is a twisted triangular
prism; the orbifold of two-note chords is a Möbius strip; pitch-class space
is a circle. When you compose, you are drawing a path through one of these
spaces. This app tries to make the path visible.
