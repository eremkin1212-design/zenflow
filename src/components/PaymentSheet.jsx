import React, { useState } from "react";
import { X } from "lucide-react";

const DISCOUNTS = [0, 5, 10, 15, 20, 30, 50];

export default function PaymentSheet({ price, onPay, onClose }) {
const full = Math.max(0, Math.round(Number(price) || 0));
const [discount, setDiscount] = useState(0);
const [amount, setAmount] = useState(full);
const [busy, setBusy] = useState(false);

function applyDiscount(percent) {
setDiscount(percent);
setAmount(Math.round(full * (1 - percent / 100)));
}

// Ручная правка суммы сбрасывает скидку: сумма задана напрямую.
function editAmount(value) {
const next = Math.max(0, Math.round(Number(value) || 0));
setAmount(next);
setDiscount(0);
}

async function pay(method) {
setBusy(true);
try {
await onPay(method, amount, discount);
} finally {
setBusy(false);
}
}

const changed = amount !== full;

return (
<div className="rounded-2xl p-3 bg-[var(--surface)] border border-[var(--line)]">
<div className="flex items-center justify-between">
<span className="text-xs text-[var(--ink-soft)]">Сколько заплатили</span>
{onClose && (
<button onClick={onClose} aria-label="Закрыть" className="rounded-full p-1 bg-[var(--surface-alt)]">
<X size={13} />
</button>
)}
</div>

<div className="flex items-center gap-2 mt-2">
<input
type="number"
inputMode="numeric"
value={amount}
onChange={(e) => editAmount(e.target.value)}
className="flex-1 rounded-xl px-3 py-2.5 text-base font-mono bg-[var(--surface-alt)] outline-none"
/>
<span className="text-base font-mono">₽</span>
</div>

{changed && (
<div className="text-[11px] mt-1.5 text-[var(--ink-soft)]">
Полная стоимость {full.toLocaleString("ru-RU")} ₽
{discount > 0 ? ` · скидка ${discount}%` : ""}
{amount < full ? ` · минус ${(full - amount).toLocaleString("ru-RU")} ₽` : ""}
</div>
)}

<div className="flex gap-1.5 mt-2.5 overflow-x-auto">
{DISCOUNTS.map((d) => (
<button
key={d}
onClick={() => applyDiscount(d)}
className="shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-medium border"
style={{
background: discount === d ? "var(--moss)" : "var(--surface-alt)",
color: discount === d ? "var(--on-accent)" : "var(--ink-soft)",
borderColor: discount === d ? "transparent" : "var(--line)",
}}
>
{d === 0 ? "без скидки" : `−${d}%`}
</button>
))}
</div>

<div className="flex gap-2 mt-3">
<button
onClick={() => pay("Наличные")}
disabled={busy}
className="flex-1 rounded-full py-2.5 text-sm font-medium"
style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: busy ? 0.6 : 1 }}
>
Наличные
</button>
<button
onClick={() => pay("Карта")}
disabled={busy}
className="flex-1 rounded-full py-2.5 text-sm font-medium"
style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: busy ? 0.6 : 1 }}
>
Карта
</button>
</div>
</div>
);
}
