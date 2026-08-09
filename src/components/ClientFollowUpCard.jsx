import React from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, MessageCircle } from "lucide-react";

export default function ClientFollowUpCard({ client, followUp }) {
  if (!client || !followUp) return null;
  return (
    <div className="rounded-2xl p-3.5 bg-[var(--moss-soft)] border border-[var(--line)]">
      <div className="flex items-center gap-3">
        <Link to={`/clients/${client.id}`} className="rounded-full flex items-center justify-center shrink-0 font-serif" style={{ width: 42, height: 42, background: "var(--surface)", color: "var(--moss)", fontWeight: 500 }}>
          {client.initials}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/clients/${client.id}`} className="text-sm font-medium truncate block">{client.name}</Link>
          <div className="text-xs mt-0.5 text-[var(--ink-soft)]">
            Обычно каждые {followUp.interval} дн. · прошло {followUp.elapsed} дн.
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Link to={`/appointment/new?clientId=${encodeURIComponent(client.id)}`} className="flex-1 rounded-xl py-2.5 text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
          <CalendarPlus size={14} /> Записать
        </Link>
        <a href={`sms:${client.phone || ""}`} className="rounded-xl px-3 py-2.5 bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center" aria-label={`Написать ${client.name}`}>
          <MessageCircle size={14} />
        </a>
      </div>
    </div>
  );
}
