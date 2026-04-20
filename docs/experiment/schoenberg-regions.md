# Harmonic functions (Schoenberg regions)

**Status:** planned, not yet implemented.
**Navbar entry:** `Harmonic functions`, disabled placeholder.

## What it is, in music-theory terms

Schoenberg, in *Structural Functions of Harmony* and the earlier
*Theory of Harmony*, organizes tonal space around **functional
regions** rather than individual chords. The three core functions
are:

- **Tonic (T)** — the home region, where cadences resolve. Typically
  I, but also vi and iii as tonic substitutes.
- **Dominant (D)** — the tension region that demands resolution.
  Typically V, viio, and their derivatives.
- **Subdominant (S)** — the departure region that prepares the
  dominant. Typically IV, ii, and bVI borrowings.

A piece of tonal music is a walk through these regions, with
modulations modeled as shifts of the "home" key itself. Schoenberg's
charts plot related keys as regions adjacent to the main key along
the circle of fifths and along parallel-mode axes (C major ↔ A minor,
C major ↔ C minor).

This is a lower-resolution, higher-semantic view than the Tonnetz:
it doesn't say what triangle on the Tonnetz you are on, it says what
**role** the chord is playing in the current tonal context.

## What it is, in mathematical terms

Formally: a labeled directed graph where

- nodes are `(key, function)` pairs (e.g. `(C major, T)`,
  `(G major, D)`, `(D minor, S)`),
- edges are allowed progressions (T → D, T → S, S → D, D → T,
  pivot-chord modulations),
- edge weights optionally encode cadential strength.

Embedding this graph on the circle of fifths plus a parallel-mode
axis gives Schoenberg's classical "regional chart" — the circle
crossed with a short `+mode` dimension.

The mathematics is lighter than the orbifold constructions but the
**labeling** problem (given a chord in isolation, which function does
it serve?) is a non-trivial assignment problem that depends on
context. This experiment treats assignment as a user choice first,
then offers an auto-labeler that uses key context.

## What this experiment will render

- The circle of fifths with tonic / dominant / subdominant rings.
- A key selector that rotates the diagram to a new tonic.
- A Roman-numeral overlay on each placed chord in the timeline,
  inferred from the current key.
- A cadence recognizer that highlights authentic (V → I), plagal
  (IV → I), half (X → V), and deceptive (V → vi) endings.
- A modulation visualizer: pivot chords between adjacent regions
  light up as the pivot chord occurs in the progression.

## References

- Arnold Schoenberg, *Theory of Harmony*.
- Arnold Schoenberg, *Structural Functions of Harmony*.
- Dmitri Tymoczko, *A Geometry of Music*, ch. 4 (on how functional
  harmony sits on top of voice-leading geometry).
