// helper marker component for calendar picker dots
export default function CalendarPickerDot({ active }) { return <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: active ? "var(--on-accent)" : "var(--moss)" }} />; }
