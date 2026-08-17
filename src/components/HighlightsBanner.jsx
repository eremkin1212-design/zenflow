import React from "react";
import { AlertTriangle } from "lucide-react";

// Показывает особенности клиента там, где их важно увидеть до сеанса:
// в календаре и при создании записи. Правится в карточке клиента.
export default function HighlightsBanner({ text, compact }) {
const value = String(text || "").trim();
if (!value) return null;

return (
<div className="rounded-xl px-3 py-2 flex items-start gap-2" style={{ background: "var(--clay-soft)" }}>
<AlertTriangle size={compact ? 13 : 14} className="shrink-0 mt-0.5" style={{ color: "var(--clay)" }} />
<div className="min-w-0">
{!compact && (
<div className="text-[11px] font-medium" style={{ color: "var(--clay)" }}>Важно помнить</div>
)}
<div className={`${compact ? "text-[11px]" : "text-xs mt-0.5"} leading-relaxed whitespace-pre-wrap`}>{value}</div>
</div>
</div>
);
}
