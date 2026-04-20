# Voice-leading lattice

**Status:** planned, not yet implemented.
**Navbar entry:** `Voice-leading lattice`, disabled placeholder.

## What it is, in music-theory terms

Pick a collection of chords (say, all major / minor triads, or all
seventh chords), and connect two chords by an edge if you can move
from one to the other with small voice motion — typically, every
voice moves by at most a semitone. The resulting graph is a
**voice-leading lattice**.

This is the graph that underlies common-practice harmony: you can
hear it as the graph of "natural" progressions. A piece of tonal
music carves a path through this graph, and "good" progressions are
short paths.

Julian Hook (*Exploring Musical Spaces*) treats this construction
abstractly: the lattice depends on the chord set, the voice-leading
size you allow, and the norm you use to measure total voice motion
(taxicab, Euclidean, max, etc.). Different norms pick out different
musical idioms — taxicab for counterpoint, max for "least-change"
analysis.

## What it is, in mathematical terms

Given a chord set `C ⊂ Tⁿ / Sₙ` (see
[Triad orbifold](triad-orbifold.md)) and a norm `‖·‖` on the
tangent space, define a graph

$$G(C, \\varepsilon) = (C, E)$$

where `(c₁, c₂) ∈ E` iff the minimum-cost voice leading from `c₁` to
`c₂` (under `‖·‖`) has cost at most `ε`.

- `‖·‖₁` (taxicab, sum of absolute semitone displacements) gives the
  **displacement** graph used in most contrapuntal analysis.
- `‖·‖∞` (max) gives the **smoothness** graph — two chords connect if
  no voice moves too far.
- `‖·‖₂` (Euclidean) is the metric on the orbifold itself, so this
  graph is a discretization of the orbifold's geodesic ball structure.

For a symmetric chord set (e.g. all major / minor triads), the
voice-leading graph is usually highly regular; the Tonnetz is the
`‖·‖₁` graph for the set of consonant triads at `ε = 2`.

## What this experiment will render

- A selectable chord set: triads (major + minor), seventh chords
  (Mm7 + dim7 + m7), pentads, etc.
- A selectable norm (taxicab, Euclidean, max).
- A selectable distance threshold `ε`.
- The resulting graph as a 3D ball-and-stick model, with edges
  colored by voice-leading size.
- A timeline mode where a placed progression is highlighted as a
  path through the graph and the path cost is displayed.

## References

- Julian Hook, *Exploring Musical Spaces*, chapters on voice
  leading and product spaces.
- Dmitri Tymoczko, *A Geometry of Music*, chapters 3, 7, 8.
