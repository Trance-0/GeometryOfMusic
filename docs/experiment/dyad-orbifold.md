# Dyad orbifold (Möbius strip)

**Status:** planned, not yet implemented.
**Navbar entry:** `Dyad orbifold (Möbius)`, disabled placeholder.

## What it is, in music-theory terms

A two-note chord, heard as a chord rather than as two assigned voices,
does not care which of the two notes is "on top." A C-major third
`{C, E}` is the same object whether you write it as `(C, E)` or
`(E, C)`. The ordered torus (see [Torus (dyads)](torus-dyad.md)) is
therefore redundant with respect to that symmetry: it stores every
unordered dyad twice.

Folding the torus along the voice-swap symmetry produces a surface
where every unordered dyad is a single point. That surface is a
**Möbius strip**. The boundary of the strip — the crease where the
fold happens — is the **unison axis** where both voices have the same
pitch class.

Why this matters musically:

- Voice-leading distance between two unordered dyads is shorter than
  on the torus: you're allowed to pick whichever voice assignment
  makes the move smaller. Tymoczko calls this "optimal" voice
  leading.
- The Möbius twist is physically meaningful. Walking a full loop
  around the strip brings you back to the same chord *with the voices
  swapped*; two loops bring you back unchanged.

## What it is, in mathematical terms

Start from the ordered-dyad torus

$$T^2 = \\{ (a, b) : a, b \in \mathbb{Z}/12\mathbb{Z} \\}.$$

The symmetric group `S₂` acts on `T²` by swapping coordinates:
`(a, b) ↦ (b, a)`. The quotient

$$T^2 / S_2$$

is a 2-manifold with boundary — the **Möbius strip**. Its fundamental
domain can be chosen as the closed triangle `a ≤ b` with the edges
`a = 0` and `a = b` glued with a reversal of orientation.

Tymoczko shows that this is a special case of a general construction:
the space of `n`-note chords, modulo voice reordering, is the orbifold
`Tⁿ / Sₙ`. For `n = 1` this is just the circle `S¹`; for `n = 2` it is
the Möbius strip; for `n = 3` it is the twisted triangular prism (see
[Triad orbifold](triad-orbifold.md)); and so on.

## What this experiment will render

- The unfolded fundamental domain as a triangular strip with a
  colored boundary marking the unison axis.
- The identification edge drawn explicitly so the Möbius twist is
  readable.
- Progressions drawn as smooth paths; when a path crosses the unison
  axis, it is reflected onto the opposite edge instead of wrapping
  around the torus.

## References

- Dmitri Tymoczko, *A Geometry of Music*, ch. 3 (the main reference).
- Clifton Callender, Ian Quinn, Dmitri Tymoczko,
  *Generalized Voice-Leading Spaces*, Science 320, 2008.
