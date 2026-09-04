import React from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LayoutGrid, CalendarDays, Users, Wallet, Settings, CircleHelp } from "lucide-react";

const NAV = [
  { to: "/", label: "Главная", Icon: LayoutGrid },
  { to: "/calendar", label: "Календарь", Icon: CalendarDays },
  { to: "/clients", label: "Клиенты", Icon: Users },
  { to: "/finance", label: "Финансы", Icon: Wallet },
  { to: "/settings", label: "Настройки", Icon: Settings },
];

export default function BottomNav() {
  const location = useLocation();
  const nav = (
    <>
      {location.pathname === "/settings" && (
        <div className="fixed z-[2147483646] left-0 right-0 max-w-sm mx-auto bottom-[82px] px-5 flex justify-end pointer-events-none">
          <Link
            to="/support"
            className="pointer-events-auto rounded-full px-4 py-2.5 flex items-center gap-2 text-xs font-medium border border-[var(--line)] shadow-[0_8px_22px_rgba(0,0,0,0.12)]"
            style={{ background: "var(--surface)", color: "var(--moss)" }}
          >
            <CircleHelp size={16} />
            Поддержка
          </Link>
        </div>
      )}

      <div
        className="zf-bottom-nav fixed z-[2147483647] bottom-0 left-0 right-0 max-w-sm mx-auto flex items-center justify-between px-6 py-3 border-t border-[var(--line)] shadow-[0_-6px_18px_rgba(0,0,0,0.08)]"
        style={{ backgroundColor: "var(--nav-bg)", opacity: 1, pointerEvents: "auto" }}
      >
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => {
              const active = isActive || (to === "/settings" && location.pathname.startsWith("/support"));
              return `flex flex-col items-center gap-1 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--moss)] ${
                active ? "text-[var(--moss)]" : "text-[var(--ink-soft)]"
              }`;
            }}
          >
            {({ isActive }) => {
              const active = isActive || (to === "/settings" && location.pathname.startsWith("/support"));
              return (
                <>
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </>
  );

  return typeof document === "undefined" ? nav : createPortal(nav, document.body);
}
