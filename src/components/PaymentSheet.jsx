import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISCOUNTS = [0, 5, 10, 15, 20, 30, 50];

export default function PaymentSheet({ price, onPay, onClose, canRememberPrice = false }) {
  const full = Math.max(0, Math.round(Number(price) || 0));
  const [discount, setDiscount] = useState(0);
  const [customPrice, setCustomPrice] = useState(false);
  const [serviceTotalInput, setServiceTotalInput] = useState(String(full));
  const [receivedInput, setReceivedInput] = useState(String(full));
  const [receivedTouched, setReceivedTouched] = useState(false);
  const [rememberPrice, setRememberPrice] = useState(false);
  const [busy, setBusy] = useState(false);

  const serviceTotal = serviceTotalInput === "" ? null : Math.max(0, Math.round(Number(serviceTotalInput) || 0));
  const received = receivedInput === "" ? null : Math.max(0, Math.round(Number(receivedInput) || 0));

  useEffect(() => {
    if (!receivedTouched) setReceivedInput(serviceTotalInput);
  }, [serviceTotalInput, receivedTouched]);

  function applyDiscount(percent) {
    setCustomPrice(false);
    setRememberPrice(false);
    setDiscount(percent);
    setServiceTotalInput(String(Math.round(full * (1 - percent / 100))));
    setReceivedTouched(false);
  }

  function toggleCustomPrice(checked) {
    setCustomPrice(checked);
    setRememberPrice(false);
    setDiscount(0);
    setServiceTotalInput(String(full));
    setReceivedInput(String(full));
    setReceivedTouched(false);
  }

  function editServiceTotal(value) {
    const clean = String(value).replace(/[^0-9]/g, "");
    setServiceTotalInput(clean);
    setDiscount(0);
    setReceivedTouched(false);
  }

  function editReceived(value) {
    const clean = String(value).replace(/[^0-9]/g, "");
    setReceivedInput(clean);
    setReceivedTouched(true);
  }

  async function pay(method) {
    if (serviceTotal === null) {
      window.alert("Укажи стоимость услуги.");
      return;
    }
    if (method === "Наличные" && received === null) {
      window.alert("Укажи, сколько получено наличными.");
      return;
    }
    setBusy(true);
    try {
      await onPay(method, {
        serviceTotal,
        received: method === "Наличные" ? received : serviceTotal,
        discount,
        rememberPrice: customPrice && rememberPrice,
      });
    } finally {
      setBusy(false);
    }
  }

  const priceChanged = serviceTotal !== null && serviceTotal !== full;

  return (
    <div className="rounded-2xl p-3 bg-[var(--surface)] border border-[var(--line)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[var(--ink-soft)]">Оплата</div>
          <div className="text-sm font-medium mt-0.5">Стоимость {full.toLocaleString("ru-RU")} ₽</div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Закрыть" className="rounded-full p-1 bg-[var(--surface-alt)]">
            <X size={13} />
          </button>
        )}
      </div>

      <label className="mt-3 flex items-start gap-2.5 cursor-pointer rounded-xl p-2.5 bg-[var(--surface-alt)]">
        <input
          type="checkbox"
          checked={customPrice}
          onChange={(e) => toggleCustomPrice(e.target.checked)}
          className="w-5 h-5 mt-0.5"
        />
        <span className="text-sm">
          <span className="font-medium">Другая цена для этого клиента</span>
          <span className="block text-[11px] mt-0.5 text-[var(--ink-soft)]">Только после включения можно изменить стоимость услуги.</span>
        </span>
      </label>

      {customPrice && (
        <div className="mt-3">
          <div className="text-xs font-medium text-[var(--ink-soft)]">Стоимость услуги</div>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={serviceTotalInput}
              onChange={(e) => editServiceTotal(e.target.value)}
              placeholder="Введите сумму"
              className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-base font-mono bg-[var(--surface-alt)] outline-none border border-[var(--line)]"
            />
            <span className="text-base font-mono">₽</span>
          </div>
          {canRememberPrice && priceChanged && (
            <label className="mt-2.5 flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={rememberPrice} onChange={(e) => setRememberPrice(e.target.checked)} className="w-4 h-4 mt-0.5" />
              <span className="text-xs text-[var(--ink-soft)]">Запомнить эту цену для следующих записей клиента</span>
            </label>
          )}
        </div>
      )}

      {!customPrice && (
        <div className="mt-3">
          <div className="text-[11px] text-[var(--ink-soft)] mb-1.5">Скидка от текущей стоимости</div>
          <div className="flex gap-1.5 overflow-x-auto">
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
        </div>
      )}

      {priceChanged && (
        <div className="mt-2.5 rounded-xl px-3 py-2 text-xs bg-[var(--moss-soft)] text-[var(--moss)]">
          В финансы пойдёт {Number(serviceTotal || 0).toLocaleString("ru-RU")} ₽, а не {full.toLocaleString("ru-RU")} ₽.
          {discount > 0 ? ` Скидка ${discount}%.` : ""}
        </div>
      )}

      <div className="mt-3">
        <div className="text-xs font-medium text-[var(--ink-soft)]">Получено наличными</div>
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={receivedInput}
            onChange={(e) => editReceived(e.target.value)}
            placeholder="Введите сумму"
            className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-base font-mono bg-[var(--surface-alt)] outline-none"
          />
          <span className="text-base font-mono">₽</span>
        </div>
        <div className="text-[11px] mt-1 text-[var(--ink-soft)]">Для оплаты картой это поле не используется.</div>
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
