import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { createClient } from "../data/clients";
import { canPickPhoneContact, isContactPickerCancel, pickPhoneContact } from "../lib/contactPicker";

export default function ClientForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickingContact, setPickingContact] = useState(false);
  const [error, setError] = useState("");
  const canPickContact = canPickPhoneContact();

  async function handlePickContact() {
    setPickingContact(true);
    setError("");
    try {
      const picked = await pickPhoneContact();
      if (!picked) return;
      if (picked.name) setName(picked.name);
      if (picked.phone) setPhone(picked.phone);
      if (!picked.name && !picked.phone) {
        setError("У выбранного контакта не удалось получить имя или номер телефона.");
      }
    } catch (err) {
      if (!isContactPickerCancel(err)) {
        setError("Не удалось открыть контакты. Попробуй ещё раз.");
      }
    } finally {
      setPickingContact(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { setError("Введите имя клиента"); return; }
    setSaving(true);
    setError("");
    try {
      const created = await createClient({ name, phone });
      navigate(`/clients/${created.id}`);
    } catch {
      setError("Не удалось сохранить. Проверь подключение и попробуй снова.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-10">
        <div className="flex items-center justify-between px-5 pt-7 pb-2">
          <button onClick={() => navigate(-1)} aria-label="Назад" className="rounded-full p-2.5 bg-[var(--surface-alt)] border border-[var(--line)]">
            <ArrowLeft size={18} />
          </button>
          <div className="text-lg font-serif" style={{ fontWeight: 500 }}>Новый клиент</div>
          <ThemeToggle />
        </div>

        <div className="mx-5 mt-5 flex flex-col gap-4">
          {canPickContact && (
            <button
              type="button"
              onClick={handlePickContact}
              disabled={pickingContact}
              className="w-full rounded-2xl p-3.5 flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--line)] text-sm font-medium"
              style={{ opacity: pickingContact ? 0.6 : 1 }}
            >
              <UserPlus size={17} className="text-[var(--moss)]" />
              {pickingContact ? "Открываем контакты…" : "Выбрать из телефонной книги"}
            </button>
          )}

          <div>
            <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Имя</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Мария Соколова"
              className="w-full rounded-2xl p-3.5 text-sm bg-[var(--surface)] border border-[var(--line)] outline-none"
            />
          </div>
          <div>
            <div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Телефон <span style={{ opacity: 0.6 }}>(необязательно)</span></div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 900 000-00-00"
              inputMode="tel"
              autoComplete="tel"
              className="w-full rounded-2xl p-3.5 text-sm bg-[var(--surface)] border border-[var(--line)] outline-none"
            />
          </div>

          {error && <div className="text-sm text-[var(--danger)]">{error}</div>}

          <button
            onClick={handleSave}
            disabled={saving || pickingContact}
            className="w-full rounded-full py-3.5 text-sm font-medium mt-2"
            style={{ background: "var(--clay)", color: "#FBF9F3", opacity: saving || pickingContact ? 0.6 : 1 }}
          >
            {saving ? "Сохраняем…" : "Сохранить клиента"}
          </button>
        </div>
      </div>
    </div>
  );
}
