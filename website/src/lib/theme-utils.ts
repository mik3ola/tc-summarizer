export type Theme = "light" | "dark";

/**
 * Parse an explicit user theme preference from localStorage.
 * Only "light" / "dark" count; anything else is treated as unset.
 */
export function parseStoredTheme(stored: string | null | undefined): Theme | null {
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

/**
 * Initial theme on mount: explicit stored preference wins; otherwise OS preference.
 */
export function resolveInitialTheme(
  stored: string | null | undefined,
  prefersDark: boolean
): Theme {
  const parsed = parseStoredTheme(stored);
  if (parsed) return parsed;
  return prefersDark ? "dark" : "light";
}

/**
 * Whether live OS preference changes should update the UI.
 * Historical ThemeProvider: any non-empty localStorage "theme" value blocks follow
 * (even invalid values), matching `if (localStorage.getItem("theme")) return`.
 */
export function shouldFollowSystemTheme(stored: string | null | undefined): boolean {
  return !stored;
}

/** Toggle helper used by the theme control. */
export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}
