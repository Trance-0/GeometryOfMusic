export interface MusicalSpace {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
}

export const SPACES: readonly MusicalSpace[] = [
  {
    id: "torus-dyad",
    label: "Torus (dyads)",
    description:
      "Ordered pitch-class pairs embedded on T² = S¹ × S¹, with voice-leading edges.",
    enabled: true,
  },
  {
    id: "tonnetz",
    label: "Tonnetz (triads)",
    description:
      "Neo-Riemannian P/L/R lattice of major and minor triads on a torus.",
    enabled: false,
  },
  {
    id: "mobius-dyad",
    label: "Dyad orbifold (Möbius)",
    description:
      "Unordered two-note chords: T²/S₂ quotient forming a Möbius strip.",
    enabled: false,
  },
  {
    id: "triad-orbifold",
    label: "Triad orbifold",
    description:
      "Unordered three-note chords: T³/S₃ triangular prism (Tymoczko, ch. 3).",
    enabled: false,
  },
  {
    id: "voice-leading",
    label: "Voice-leading lattice",
    description:
      "Chords connected by minimal common-tone and semitone voice leadings (Hook).",
    enabled: false,
  },
  {
    id: "harmonic-functions",
    label: "Harmonic functions",
    description:
      "Schoenberg region-based progression graph over tonic / dominant / subdominant.",
    enabled: false,
  },
];

export function mountNavbar(
  root: HTMLElement,
  onSelect: (id: string) => void,
): void {
  root.textContent = "";
  for (const space of SPACES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = space.label;
    btn.title = space.enabled
      ? space.description
      : `Coming soon: ${space.description}`;
    btn.dataset.spaceId = space.id;
    btn.disabled = !space.enabled;
    if (space.id === "torus-dyad") btn.classList.add("active");
    btn.addEventListener("click", () => {
      if (!space.enabled) return;
      root
        .querySelectorAll<HTMLButtonElement>("button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onSelect(space.id);
    });
    root.appendChild(btn);
  }
}
