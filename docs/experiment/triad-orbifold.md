# Triad orbifold (twisted prism)

**Status:** planned, not yet implemented.
**Navbar entry:** `Triad orbifold`, disabled placeholder.

## What it is, in music-theory terms

A three-voice chord is a multiset of three pitch classes. The same
chord can be voiced many ways: `{C, E, G}` can be a tight C-E-G or a
spread C-G-E or an inverted E-G-C. Collapsing all those voicings into
one chord-object gives the space of **unordered triads**.

That space has a striking shape: a **triangular prism with its ends
glued together after a 120° twist**. Inside the prism:

- The **interior** is triads with three distinct pitch classes.
- The **three faces** are triads with a doubled pitch class (two
  voices on the same note).
- The **three edges** are triads with two doubled pitch classes.
- The **single central axis** is the augmented-triad cycle
  `{C, E, G#}`, `{C#, F, A}`, etc. — unique because the augmented
  triad divides the octave evenly, so cyclic voice rotation is an
  identification.

This is the geometric home of Tymoczko's result that **efficient
voice leading corresponds to short straight-line paths** inside the
prism: the near-neighbour structure of triadic music is literally the
near-neighbour structure of a 3D prism.

## What it is, in mathematical terms

Let `T³ = (Z/12Z)³` embed in `T³` (the 3-torus) and let `S₃` act by
permuting coordinates. The quotient

$$T^3 / S_3$$

is a 3-dimensional orbifold. The fundamental domain is the simplex
`0 ≤ a ≤ b ≤ c < 12`; the three faces of the simplex are the
`a = b`, `b = c`, and `c - a = 12` (wrap-around) faces. Gluing those
faces with the appropriate permutation gives the twisted triangular
prism.

The topology is a twisted `S¹` bundle over a 2-simplex: the direction
along the prism axis is circular (you can transpose a triad by a
semitone 12 times and return to where you started, but with a 120°
twist because the augmented triad is fixed by cyclic permutation).

## What this experiment will render

- The prism interactively, with faces semi-transparent so voicings
  with doubled notes are clearly the boundary.
- Three colored walls showing the three `aᵢ = aⱼ` identifications.
- The augmented-triad axis drawn explicitly as the prism's central
  line.
- Progressions drawn as line segments inside the prism; short
  segments = efficient voice leading, long segments = leaps.
- A switch between the "ordered" view (points in `T³`) and the
  "unordered" view (points in the prism).

## References

- Dmitri Tymoczko, *A Geometry of Music*, ch. 3 (the prism
  construction) and ch. 7 (triadic voice leading).
- Clifton Callender, Ian Quinn, Dmitri Tymoczko,
  *Generalized Voice-Leading Spaces*, Science 320, 2008.
