import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "zenflow-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return false;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark") return true;
    if (saved === "light") return false;
  } catch {}
  return false;
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    } catch {}
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, setDark, toggle: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
