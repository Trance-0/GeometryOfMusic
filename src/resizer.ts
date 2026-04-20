interface ResizerConfig {
  app: HTMLElement;
  handle: HTMLElement;
  storageKey?: string;
  minFraction: number;
  maxFraction: number;
  defaultFraction: number;
}

/**
 * Drag handle that resizes the upper panel vs the lower panel of a
 * three-row flex container. Writes `--upper-fraction` on the app element.
 * The transport bar keeps its intrinsic height; the rest of the vertical
 * space is split between lattice and timeline panels.
 */
export function mountResizer(cfg: ResizerConfig): void {
  const { app, handle, storageKey, minFraction, maxFraction, defaultFraction } =
    cfg;
  let frac = defaultFraction;
  if (storageKey) {
    const saved = Number.parseFloat(localStorage.getItem(storageKey) ?? "");
    if (Number.isFinite(saved)) frac = saved;
  }
  const apply = (): void => {
    const clamped = Math.max(minFraction, Math.min(maxFraction, frac));
    frac = clamped;
    app.style.setProperty("--upper-fraction", String(clamped));
    if (storageKey) localStorage.setItem(storageKey, String(clamped));
  };
  apply();

  let dragging = false;
  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add("dragging");
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = app.getBoundingClientRect();
    if (rect.height <= 0) return;
    const y = e.clientY - rect.top;
    frac = y / rect.height;
    apply();
  });
  const endDrag = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  handle.addEventListener("dblclick", () => {
    frac = defaultFraction;
    apply();
  });
}
