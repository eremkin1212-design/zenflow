import React from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { LayoutGrid, CalendarDays, Users, Wallet, Settings } from "lucide-react";

const NAV = [
  { to: "/", label: "Главная", Icon: LayoutGrid },
  { to: "/calendar", label: "Календарь", Icon: CalendarDays },
  { to: "/clients", label: "Клиенты", Icon: Users },
  { to: "/finance", label: "Финансы", Icon: Wallet },
  { to: "/settings", label: "Настройки", Icon: Settings },
];

function BottomNavContent() {
  return (
    <div
      className="zf-bottom-nav fixed z-[2147483647] bottom-0 left-0 right-0 w-full flex items-center justify-between px-6 py-3 border-t border-[var(--line)] shadow-[0_-6px_18px_rgba(0,0,0,0.08)]"
      style={{ backgroundColor: "var(--nav-bg)", opacity: 1 }}
    >
      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--moss)] ${
              isActive ? "text-[var(--moss)]" : "text-[var(--ink-soft)]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export default function BottomNav() {
  if (typeof document === "undefined") return null;
  return createPortal(<BottomNavContent />, document.body);
}
