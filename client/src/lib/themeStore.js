const STORAGE_KEY = "nebula-theme";
const VALID_THEMES = ["standard", "cyberpunk"];

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.includes(stored)) return stored;
  } catch {
    // Storage can be blocked in privacy modes or unavailable during tests.
  }
  return "standard";
}

export function applyTheme(theme) {
  const nextTheme = VALID_THEMES.includes(theme) ? theme : "standard";

  try {
    localStorage.setItem(STORAGE_KEY, nextTheme);
  } catch {
    // Theme still applies even when persistence is unavailable.
  }

  const root = document.documentElement;
  const body = document.body;

  root.dataset.theme = nextTheme;
  root.classList.add("theme-switching");

  body.classList.forEach(cls => {
    if (cls.startsWith("theme-")) body.classList.remove(cls);
  });
  if (nextTheme === "cyberpunk") body.classList.add("theme-cyberpunk");

  globalThis.clearTimeout?.(applyTheme.switchTimer);
  applyTheme.switchTimer = globalThis.setTimeout?.(() => {
    root.classList.remove("theme-switching");
  }, 280);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
