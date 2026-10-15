import React, { useEffect, useState } from "react";
import { ArrowLeft, Gift, Search, X } from "lucide-react";
import { certificateDisplayStatus, getCertificateByNumber, normalizeCertificateNumber } from "../data/certificates";

const DISCOUNTS = [0, 5, 10, 15, 20, 30, 50];

function money(value) {
  return Number(value || 0).toLocaleString("ru-RU");
}

function certStatusText(certificate) {
  const status = certificateDisplayStatus(certificate);
  if (status === "expired") return "Срок действия истёк";
  if (status === "used") return "Сертификат уже использован";
  if (status === "cancelled") return "Сертификат отменён";
  return "";
}

export default function PaymentSheet({
  price,
  appointment,
  onPay,
  onCertificatePay,
  onClose,
  canRememberPrice = false,
}) {
  const full = Math.max(0, Math.round(Number(price) || 0));
  const [discount, setDiscount] = useState(0);
  const [customPrice, setCustomPrice] = useState(false);
  const [serviceTotalInput, setServiceTotalInput] = useState(String(full));
  const [receivedInput, setReceivedInput] = useState(String(full));
  const [receivedTouched, setReceivedTouched] = useState(false);
  const [rememberPrice, setRememberPrice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("regular");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [certificateError, setCertificateError] = useState("");
  const [certificateLoading, setCertificateLoading] = useState(false);

  const serviceTotal = serviceTotalInput === "" ? null : Math.max(0, Math.round(Number(serviceTotalInput) || 0));
  const received = receivedInput === "" ? null : Math.max(0, Math.round(Number(receivedInput) || 0));
  const priceChanged = serviceTotal !== null && serviceTotal !== full;

  const appointmentClientId = appointment?.client_id ?? appointment?.clients?.id ?? null;
  const appointmentServiceId = appointment?.service_id ?? appointment?.services?.id ?? null;
  const appointmentServiceCount = Array.isArray(appointment?.appointment_services)
    ? appointment.appointment_services.length || (appointmentServiceId ? 1 : 0)
    : appointmentServiceId ? 1 : 0;

  const certificateDue = certificate && serviceTotal !== null && certificate.kind === "amount"
    ? Math.max(0, serviceTotal - Number(certificate.remaining_amount || 0))
    : 0;

  useEffect(() => {
    if (!receivedTouched) setReceivedInput(serviceTotalInput);
  }, [serviceTotalInput, receivedTouched]);

  useEffect(() => {
    setCertificate(null);
    setCertificateError("");
  }, [serviceTotalInput]);

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
      window.alert(customPrice ? "Укажи сумму оплаты." : "Укажи стоимость услуги.");
      return;
    }
    if (!customPrice && method === "Наличные" && received === null) {
      window.alert("Укажи, сколько получено наличными.");
      return;
    }
    setBusy(true);
    try {
      await onPay(method, {
        serviceTotal,
        received: customPrice ? serviceTotal : method === "Наличные" ? received : serviceTotal,
        discount,
        rememberPrice: customPrice && rememberPrice,
      });
    } finally {
      setBusy(false);
    }
  }

  async function findCertificate() {
    if (serviceTotal === null) {
      setCertificateError("Сначала укажи стоимость сеанса.");
      return;
    }
    const number = normalizeCertificateNumber(certificateNumber);
    if (!number) {
      setCertificateError("Введи номер сертификата.");
      return;
    }
    setCertificateLoading(true);
    setCertificateError("");
    setCertificate(null);
    try {
      const found = await getCertificateByNumber(number);
      if (!found) {
        setCertificateError("Сертификат с таким номером не найден.");
        return;
      }
      const statusMessage = certStatusText(found);
      if (statusMessage) {
        setCertificateError(statusMessage);
        setCertificate(found);
        return;
      }
      if (found.client_id && appointmentClientId && Number(found.client_id) !== Number(appointmentClientId)) {
        setCertificateError(`Сертификат привязан к другому клиенту: ${found.clients?.name || "другой клиент"}.`);
        setCertificate(found);
        return;
      }
      if (found.kind !== "amount") {
        if (appointmentServiceCount !== 1 || !appointmentServiceId) {
          setCertificateError("Сертификат на услугу можно применить только к записи с одной услугой.");
          setCertificate(found);
          return;
        }
        if (Number(found.service_id) !== Number(appointmentServiceId)) {
          setCertificateError(`Этот сертификат действует на другую услугу: ${found.services?.name || "другая услуга"}.`);
          setCertificate(found);
          return;
        }
        if (Number(found.remaining_sessions || 0) <= 0) {
          setCertificateError("На сертификате не осталось сеансов.");
          setCertificate(found);
          return;
        }
      } else if (Number(found.remaining_amount || 0) <= 0) {
        setCertificateError("На сертификате нет остатка.");
        setCertificate(found);
        return;
      }
      setCertificate(found);
      setCertificateNumber(found.number);
    } catch (error) {
      setCertificateError(error?.message || "Не удалось проверить сертификат.");
    } finally {
      setCertificateLoading(false);
    }
  }

  async function payCertificate(topupMethod = null) {
    if (!certificate || certificateError || serviceTotal === null || !onCertificatePay) return;
    if (certificateDue > 0 && !topupMethod) {
      setCertificateError("Выбери способ доплаты.");
      return;
    }
    setBusy(true);
    try {
      await onCertificatePay({
        certificateNumber: certificate.number,
        serviceTotal,
        topupMethod: certificateDue > 0 ? topupMethod : null,
      });
    } finally {
      setBusy(false);
    }
  }

  if (mode === "certificate") {
    return (
      <div className="rounded-2xl p-3 bg-[var(--surface)] border border-[var(--line)]">
        <div className="flex items-center justify-between">
          <button onClick={() => { setMode("regular"); setCertificateError(""); }} className="rounded-full p-1.5 bg-[var(--surface-alt)]" aria-label="Назад">
            <ArrowLeft size={14} />
          </button>
          <div className="text-sm font-medium">Оплата сертификатом</div>
          {onClose ? <button onClick={onClose} className="rounded-full p-1.5 bg-[var(--surface-alt)]" aria-label="Закрыть"><X size={13} /></button> : <span className="w-7" />}
        </div>

        <div className="mt-3 rounded-xl px-3 py-2.5 bg-[var(--surface-alt)]">
          <div className="text-[11px] text-[var(--ink-soft)]">Стоимость сеанса</div>
          <div className="font-mono text-base mt-0.5">{money(serviceTotal || 0)} ₽</div>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={certificateNumber}
            onChange={(e) => { setCertificateNumber(e.target.value.toUpperCase()); setCertificate(null); setCertificateError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") findCertificate(); }}
            placeholder="RT-000001"
            autoCapitalize="characters"
            className="min-w-0 flex-1 rounded-xl px-3 py-2.5 font-mono text-sm bg-[var(--surface-alt)] outline-none border border-[var(--line)]"
          />
          <button onClick={findCertificate} disabled={certificateLoading} className="rounded-xl px-3 bg-[var(--moss)] text-[var(--on-accent)]" aria-label="Найти сертификат" style={{ opacity: certificateLoading ? .6 : 1 }}>
            <Search size={16} />
          </button>
        </div>

        {certificateError && <div className="mt-2 rounded-xl px-3 py-2 text-xs bg-[var(--clay-soft)] text-[var(--clay)]">{certificateError}</div>}

        {certificate && !certificateError && (
          <div className="mt-3 rounded-2xl p-3 border border-[var(--line)] bg-[var(--surface-alt)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-sm font-medium">{certificate.number}</div>
                <div className="text-xs mt-1 text-[var(--ink-soft)]">
                  {certificate.kind === "amount" ? "Сертификат на сумму" : certificate.kind === "service" ? "Сертификат на услугу" : "Абонемент"}
                </div>
              </div>
              <Gift size={17} className="text-[var(--moss)]" />
            </div>

            {certificate.kind === "amount" ? (
              <div className="mt-3">
                <div className="text-xs text-[var(--ink-soft)]">Остаток</div>
                <div className="text-lg font-mono">{money(certificate.remaining_amount)} ₽</div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="text-xs text-[var(--ink-soft)]">{certificate.services?.name || "Услуга"}</div>
                <div className="text-lg font-mono">Осталось {certificate.remaining_sessions} из {certificate.initial_sessions}</div>
              </div>
            )}

            {certificate.clients?.name && <div className="text-xs mt-2 text-[var(--ink-soft)]">Клиент: {certificate.clients.name}</div>}
            {certificate.expires_at && <div className="text-xs mt-1 text-[var(--ink-soft)]">Действует до {new Date(`${certificate.expires_at}T12:00:00`).toLocaleDateString("ru-RU")}</div>}

            {certificate.kind === "amount" && certificateDue > 0 ? (
              <div className="mt-3">
                <div className="rounded-xl px-3 py-2 text-xs bg-[var(--moss-soft)] text-[var(--moss)]">
                  С сертификата спишется {money(Math.min(Number(certificate.remaining_amount || 0), serviceTotal || 0))} ₽ · доплата {money(certificateDue)} ₽
                </div>
                <div className="text-[11px] mt-2 text-[var(--ink-soft)]">Как доплатит клиент?</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => payCertificate("Наличные")} disabled={busy} className="flex-1 rounded-full py-2.5 text-sm font-medium bg-[var(--moss)] text-[var(--on-accent)]" style={{ opacity: busy ? .6 : 1 }}>Наличные</button>
                  <button onClick={() => payCertificate("Карта")} disabled={busy} className="flex-1 rounded-full py-2.5 text-sm font-medium bg-[var(--moss)] text-[var(--on-accent)]" style={{ opacity: busy ? .6 : 1 }}>Карта</button>
                </div>
              </div>
            ) : (
              <button onClick={() => payCertificate(null)} disabled={busy} className="w-full mt-3 rounded-full py-2.5 text-sm font-medium bg-[var(--moss)] text-[var(--on-accent)]" style={{ opacity: busy ? .6 : 1 }}>
                {busy ? "Списываем…" : "Оплатить сертификатом"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

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
          <div className="text-xs font-medium text-[var(--ink-soft)]">Сумма оплаты</div>
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

      {!customPrice && <div className="mt-3">
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
        <div className="text-[11px] mt-1 text-[var(--ink-soft)]">Нужно только для наличных, если клиент дал сумму больше стоимости.</div>
      </div>}

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

      {onCertificatePay && (
        <button
          onClick={() => { setMode("certificate"); setCertificateError(""); setCertificate(null); }}
          disabled={busy}
          className="w-full mt-2 rounded-full py-2.5 text-sm font-medium flex items-center justify-center gap-2 bg-[var(--surface-alt)] border border-[var(--line)]"
        >
          <Gift size={15} /> Сертификат
        </button>
      )}
    </div>
  );
}
