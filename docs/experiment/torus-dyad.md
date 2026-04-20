# Torus (ordered dyads)

**Status:** shipped, round 1.
**Navbar entry:** `Torus (dyads)`.
**Source:** [src/torus-view.ts](https://github.com/Trance-0/GeometryOfMusic/blob/main/src/torus-view.ts),
[src/chord.ts](https://github.com/Trance-0/GeometryOfMusic/blob/main/src/chord.ts).

## What it is, in music-theory terms

The simplest non-trivial chord is a **dyad** — a pair of notes. This
experiment embeds every *ordered* two-note chord over the twelve equal-
tempered pitch classes as a point on a 3D torus.

"Ordered" means `(C, E)` is treated as distinct from `(E, C)`: one voice
has the lower pitch class index, the other has the upper. That matters
because real music has **voices** (a soprano line, a bass line, an inner
part), and their identities are preserved through a progression. When
you play a dyad on the **Lead** track, voice A is "the part the Lead is
singing"; on **Bass**, voice A is "the part the Bass is walking." The
torus records the ordered pair separately so voice-crossing is visible.

Colors on the torus encode **interval class** — the gap in semitones
from voice A up to voice B, mod 12. Perfect fifths and fourths stand
out in cool blue-teal; thirds and sixths in warm yellow-pink; the
tritone is violet; unisons are muted grey. A diagonal band of one color
on the torus is a set of dyads with the same interval class — a voice
moving in parallel motion with its partner.

## What it is, in mathematical terms

Pitch-class space is

$$\mathbb{Z}/12\mathbb{Z}$$

embedded in

$$S^1 = \\{ e^{i\theta}\\;|\\;\theta \in [0, 2\pi) \\}.$$

The space of **ordered** two-note chords is then

$$(\mathbb{Z}/12\mathbb{Z})^2 \subset T^2 = S^1 \times S^1.$$

The natural embedding of `T²` into `R³` is the standard torus

$$
\begin{aligned}
x &= (R + r\cos\varphi) \cos\theta, \\\\
y &= (R + r\cos\varphi) \sin\theta, \\\\
z &= r \sin\varphi,
\end{aligned}
$$

where `θ = 2π·a/12` encodes voice A and `φ = 2π·b/12` encodes voice B.
`R` and `r` are the major and minor radii of the torus (the app uses
`R = 3.2`, `r = 1.3`).

The natural metric for voice leading is the **taxicab** metric on `T²`:
two dyads are adjacent if they differ by exactly one semitone in
exactly one voice. That adjacency is exactly the 4-regular toroidal
grid graph on 144 vertices and 288 edges that the app renders as thin
edges between nodes.

An "interval class" of a dyad `(a, b)` is the diagonal coordinate

$$\mathrm{ic}(a, b) = (b - a) \bmod 12,$$

which is constant along one of the two families of coordinate circles.
That is why the color stripes on the torus run diagonally — they are
level sets of `ic`.

## How the app renders it

- **144 spheres**, one per ordered dyad, positioned via the torus
  embedding above and colored by interval class
  ([src/chord.ts](https://github.com/Trance-0/GeometryOfMusic/blob/main/src/chord.ts)).
- **Torus shell**: a low-poly wireframe (8 radial × 24 tubular) to give
  spatial reference without visually dominating the nodes. Theme-aware
  and toggleable via the **Hide torus** checkbox in the upper-left
  corner — when hidden, only visited nodes plus the three track curves
  remain.
- **Voice-leading edges**: 288 lines between 4-regular neighbours,
  drawn thin and semi-transparent.
- **Per-track curves**: when chords are placed in the timeline, each
  track's chord sequence becomes a smooth Catmull-Rom curve (centripetal
  tension) in the track's color. Gold = Lead, sky blue = Bass, pink =
  Pad. Three curves, three progressions, one surface.
- **Left-click raycaster** picks the nearest node under the pointer and
  sets it as the current dyad. Middle-drag orbits; right-drag pans;
  scroll zooms. **Reset view** snaps the camera back to the start.

## What this experiment makes visible

- Parallel motion (a Bach chorale with every voice moving the same way)
  walks along a single interval-class stripe.
- Contrary motion (two voices diverging) moves *across* stripes —
  the path changes color as interval class changes.
- Voice crossings appear as a sudden jump across the (a = b) diagonal.
- Repeating cadences close a loop on the torus surface; longer
  progressions trace open arcs.

## Limits of the ordered view

Musicians usually hear dyads as **unordered**: they don't care whether
`C-E` is played as soprano-alto or alto-tenor, only that the pitches
are C and E. That is an `S₂` quotient on top of `T²`, yielding the
Möbius strip. See [Dyad orbifold (Möbius)](dyad-orbifold.md) for the
planned next experiment that folds the torus along the voice-swap
symmetry.

## References

- Dmitri Tymoczko, *A Geometry of Music*, ch. 3.
- Julian Hook, *Exploring Musical Spaces*, §§3–4 (pitch-class spaces,
  product spaces).
