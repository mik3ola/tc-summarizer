"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to apply theme to document
function applyThemeToDocument(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // Also toggle .dark class for Tailwind's dark: variant
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    // Check localStorage first; if the user hasn't made an explicit choice,
    // fall back to the operating system's preference.
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
      applyThemeToDocument(stored);
    } else {
      const defaultTheme: Theme = mql.matches ? "dark" : "light";
      setThemeState(defaultTheme);
      applyThemeToDocument(defaultTheme);
    }

    // Live-follow OS preference changes — only if the user hasn't explicitly
    // overridden via the toggle (i.e. nothing stored in localStorage).
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("theme")) return;
      const next: Theme = e.matches ? "dark" : "light";
      setThemeState(next);
      applyThemeToDocument(next);
    };
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyThemeToDocument(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: "dark", toggleTheme: () => {}, setTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
