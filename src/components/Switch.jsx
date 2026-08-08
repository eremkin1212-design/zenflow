import React from "react";

export default function Switch({ on, onChange, label }) {
  return (
    <button
      onClick={onChange}
      aria-pressed={on}
      aria-label={label}
      className="relative rounded-full w-[42px] h-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--moss)]"
      style={{ background: on ? "var(--moss)" : "var(--line)" }}
    >
      <span
        className="absolute rounded-full w-[18px] h-[18px] top-[3px] transition-all"
        style={{ left: on ? 21 : 3, background: "var(--on-accent)" }}
      />
    </button>
  );
}
