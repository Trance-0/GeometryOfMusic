const STORAGE_KEY = "gom.tour.seen.v1";

interface Handles {
  modal: HTMLElement;
  closeBtn: HTMLElement;
  dontShow: HTMLInputElement | null;
}

function getHandles(): Handles | null {
  const modal = document.getElementById("tour-modal");
  const closeBtn = document.getElementById("tour-close");
  const dontShow = document.getElementById(
    "tour-dont-show",
  ) as HTMLInputElement | null;
  if (!modal || !closeBtn) return null;
  return { modal, closeBtn, dontShow };
}

export function showTour(): void {
  const h = getHandles();
  if (!h) return;
  h.modal.classList.remove("hidden");
  h.modal.setAttribute("aria-hidden", "false");
  (h.closeBtn as HTMLButtonElement).focus?.();
}

export function hideTour(persistDismissal: boolean): void {
  const h = getHandles();
  if (!h) return;
  h.modal.classList.add("hidden");
  h.modal.setAttribute("aria-hidden", "true");
  if (persistDismissal) {
    localStorage.setItem(STORAGE_KEY, "1");
  }
}

export function installTour(): void {
  const h = getHandles();
  if (!h) return;

  const onClose = (): void => {
    const persist = h.dontShow?.checked ?? true;
    hideTour(persist);
  };
  h.closeBtn.addEventListener("click", onClose);

  const backdrop = h.modal.querySelector(".modal-backdrop");
  backdrop?.addEventListener("click", onClose);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !h.modal.classList.contains("hidden")) {
      onClose();
    }
  });

  if (!localStorage.getItem(STORAGE_KEY)) {
    showTour();
  }
}
