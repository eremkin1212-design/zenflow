import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../theme";

export default function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Переключить тему"
      className="rounded-full p-2.5 bg-[var(--surface-alt)] border border-[var(--line)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--moss)]"
    >
      {dark ? <Moon size={18} className="text-[var(--moss)]" /> : <Sun size={18} className="text-[var(--moss)]" />}
    </button>
  );
}
