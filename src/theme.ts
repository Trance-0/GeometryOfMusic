export type Theme = "dark" | "light";

const STORAGE_KEY = "gom.theme";

export function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

export function applyTheme(t: Theme): void {
  document.body.dataset.theme = t;
  localStorage.setItem(STORAGE_KEY, t);
}

export function mountThemeToggle(
  btn: HTMLButtonElement,
  onChange?: (t: Theme) => void,
): void {
  const update = (): void => {
    const t = (document.body.dataset.theme as Theme) ?? "dark";
    btn.textContent = t === "dark" ? "Light theme" : "Dark theme";
    btn.title =
      t === "dark" ? "Switch to light theme" : "Switch to dark theme";
    btn.setAttribute("aria-label", btn.title);
  };
  update();
  btn.addEventListener("click", () => {
    const current = (document.body.dataset.theme as Theme) ?? "dark";
    const next: Theme = current === "dark" ? "light" : "dark";
    applyTheme(next);
    update();
    onChange?.(next);
  });
}
