import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, LogOut, Trash2, Check, Camera, Pencil, X } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import BottomNav from "../components/BottomNav";
import Switch from "../components/Switch";
import { useTheme } from "../theme";
import { useAuth } from "../auth";
import { getServices, createService, updateService, deleteService } from "../data/services";
import { getProfile, updateProfile, uploadAvatar } from "../data/profile";

const DEFAULT_DAYS = [
  { key: "mon", label: "Понедельник", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "tue", label: "Вторник", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "wed", label: "Среда", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "thu", label: "Четверг", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "fri", label: "Пятница", on: true, start: "09:00", end: "20:00", breakStart: "13:00", breakEnd: "14:00" },
  { key: "sat", label: "Суббота", on: true, start: "10:00", end: "16:00", breakStart: null, breakEnd: null },
  { key: "sun", label: "Воскресенье", on: false, start: "10:00", end: "16:00", breakStart: null, breakEnd: null },
];

const COLOR_OPTIONS = ["#7C9A86", "#B98572", "#9C8FB0", "#C6A15B", "#6B8CAE"];

function Row({ left, right, sub }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm">{left}</div>
        {sub && <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function TimeField({ label, value, onChange }) {
  return (
    <div className="flex-1">
      <div className="text-[10px] mb-1 text-[var(--ink-soft)]">{label}</div>
      <input
        type="time" value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl p-2 text-sm bg-[var(--surface)] border border-[var(--line)] outline-none font-mono"
      />
    </div>
  );
}

export default function Settings() {
  const { dark, setDark } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: "", role: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [days, setDays] = useState(DEFAULT_DAYS);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursDirty, setHoursDirty] = useState(false);

  const [notify, setNotify] = useState({ client: true, me: true, sound: false });

  const [services, setServices] = useState([]);
  const [servicesStatus, setServicesStatus] = useState("loading");
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({ name: "", duration: 60, price: 0, color: COLOR_OPTIONS[0] });
  const [savingService, setSavingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then((p) => {
      setProfile(p);
      setProfileDraft({ name: p?.name || "", role: p?.role || "Специалист", phone: p?.phone || "" });
      if (p?.working_hours?.length) setDays(p.working_hours);
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    getServices()
      .then((data) => { if (!cancelled) { setServices(data); setServicesStatus("ready"); } })
      .catch(() => { if (!cancelled) setServicesStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const updated = await updateProfile(user.id, profileDraft);
      setProfile(updated);
      setEditingProfile(false);
    } catch {
      window.alert("Не удалось сохранить профиль. Проверь подключение.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.id, file);
      const updated = await updateProfile(user.id, { avatar_url: url });
      setProfile(updated);
    } catch {
      window.alert("Не удалось загрузить фото. Проверь подключение.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  function updateDay(key, fields) {
    setDays((prev) => prev.map((d) => (d.key === key ? { ...d, ...fields } : d)));
    setHoursDirty(true);
  }

  async function handleSaveHours() {
    setSavingHours(true);
    try {
      await updateProfile(user.id, { working_hours: days });
      setHoursDirty(false);
    } catch {
      window.alert("Не удалось сохранить рабочее время. Проверь подключение.");
    } finally {
      setSavingHours(false);
    }
  }

  async function handleAddService() {
    if (!newService.name.trim()) return;
    setSavingService(true);
    try {
      const created = await createService(newService);
      setServices((prev) => [...prev, created]);
      setNewService({ name: "", duration: 60, price: 0, color: COLOR_OPTIONS[0] });
      setShowAddService(false);
    } catch {
      window.alert("Не удалось сохранить услугу. Проверь подключение.");
    } finally {
      setSavingService(false);
    }
  }

  function startEditService(s) {
    setEditingServiceId(s.id);
    setEditDraft({ name: s.name, duration: s.duration, price: s.price, color: s.color });
  }

  async function handleSaveServiceEdit() {
    setSavingService(true);
    try {
      const updated = await updateService(editingServiceId, editDraft);
      setServices((prev) => prev.map((s) => (s.id === editingServiceId ? updated : s)));
      setEditingServiceId(null);
    } catch {
      window.alert("Не удалось сохранить изменения. Проверь подключение.");
    } finally {
      setSavingService(false);
    }
  }

  async function handleDeleteService(id, name) {
    if (!window.confirm(`Удалить услугу «${name}»?`)) return;
    try {
      await deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      window.alert("Не удалось удалить. Проверь подключение и попробуй снова.");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans transition-colors">
      <div className="max-w-sm mx-auto relative pb-24">
        <div className="flex items-center justify-between px-5 pt-7 pb-3">
          <div className="text-2xl font-serif" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>Настройки</div>
          <ThemeToggle />
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />

        {editingProfile ? (
          <div className="mx-5 rounded-2xl p-4 flex flex-col gap-2.5 bg-[var(--surface)] border border-[var(--line)]">
            <input value={profileDraft.name} onChange={(e) => setProfileDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Имя" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" />
            <input value={profileDraft.role} onChange={(e) => setProfileDraft((d) => ({ ...d, role: e.target.value }))} placeholder="Роль (например, Массажист)" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" />
            <input value={profileDraft.phone} onChange={(e) => setProfileDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="Телефон" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" />
            <div className="flex gap-2 mt-1">
              <button onClick={() => setEditingProfile(false)} className="flex-1 rounded-full py-2.5 text-sm font-medium bg-[var(--surface-alt)]">Отмена</button>
              <button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 rounded-full py-2.5 text-sm font-medium flex items-center justify-center gap-1.5" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: savingProfile ? 0.6 : 1 }}>
                <Check size={15} /> {savingProfile ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-5 rounded-2xl p-4 flex items-center gap-3 bg-[var(--surface)] border border-[var(--line)]">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="relative rounded-full shrink-0" style={{ width: 52, height: 52 }} aria-label="Изменить фото профиля">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center font-serif" style={{ background: "var(--moss-soft)", color: "var(--moss)", fontWeight: 500 }}>
                  {(profile?.name || user?.email || "??").slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full p-1 bg-[var(--moss)]" style={{ color: "var(--on-accent)" }}>
                <Camera size={11} />
              </span>
            </button>
            <button onClick={() => setEditingProfile(true)} className="flex-1 text-left">
              <div className="text-sm font-medium">{profile?.name || "Без имени"}</div>
              <div className="text-xs mt-0.5 text-[var(--ink-soft)]">{profile?.role || "Специалист"}{profile?.phone ? ` · ${profile.phone}` : ""}</div>
            </button>
            <ChevronRight size={16} className="text-[var(--ink-soft)]" />
          </div>
        )}

        {/* working hours */}
        <div className="mx-5 mt-6">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium text-[var(--ink-soft)]">Рабочее время</div>
            {hoursDirty && (
              <button onClick={handleSaveHours} disabled={savingHours} className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--moss)" }}>
                <Check size={13} /> {savingHours ? "Сохраняем…" : "Сохранить"}
              </button>
            )}
          </div>
          <div className="rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
            {days.map((d, i) => (
              <div key={d.key} className="py-3" style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{d.label}</span>
                  <Switch on={d.on} onChange={() => updateDay(d.key, { on: !d.on })} label={d.label} />
                </div>

                {d.on ? (
                  <div className="mt-2.5 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <TimeField label="Начало" value={d.start} onChange={(v) => updateDay(d.key, { start: v })} />
                      <TimeField label="Окончание" value={d.end} onChange={(v) => updateDay(d.key, { end: v })} />
                    </div>
                    {d.breakStart != null ? (
                      <div className="flex gap-2 items-end">
                        <TimeField label="Перерыв с" value={d.breakStart} onChange={(v) => updateDay(d.key, { breakStart: v })} />
                        <TimeField label="Перерыв до" value={d.breakEnd} onChange={(v) => updateDay(d.key, { breakEnd: v })} />
                        <button onClick={() => updateDay(d.key, { breakStart: null, breakEnd: null })} aria-label="Убрать перерыв" className="rounded-xl p-2 mb-0 bg-[var(--surface-alt)]">
                          <X size={14} className="text-[var(--danger)]" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => updateDay(d.key, { breakStart: "13:00", breakEnd: "14:00" })} className="text-xs font-medium text-left" style={{ color: "var(--moss)" }}>
                        + Добавить перерыв
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs mt-1 text-[var(--ink-soft)]">Выходной</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* services */}
        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-1 text-[var(--ink-soft)]">Услуги и стоимость</div>

          {servicesStatus === "loading" && <div className="text-sm text-center py-6 text-[var(--ink-soft)]">Загружаем услуги…</div>}
          {servicesStatus === "error" && <div className="text-sm text-center py-6 text-[var(--clay)]">Не удалось загрузить услуги</div>}

          {servicesStatus === "ready" && (
            <>
              <div className="rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
                {services.map((s, i) => (
                  <div key={s.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                    {editingServiceId === s.id ? (
                      <div className="py-3 flex flex-col gap-2">
                        <input value={editDraft.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" value={editDraft.duration} onChange={(e) => setEditDraft((d) => ({ ...d, duration: Number(e.target.value) || 0 }))} placeholder="Минуты" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" />
                          <input type="number" value={editDraft.price} onChange={(e) => setEditDraft((d) => ({ ...d, price: Number(e.target.value) || 0 }))} placeholder="Цена ₽" className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none" />
                        </div>
                        <div className="flex items-center gap-2">
                          {COLOR_OPTIONS.map((c) => (
                            <button key={c} onClick={() => setEditDraft((d) => ({ ...d, color: c }))} className="rounded-full" style={{ width: 20, height: 20, background: c, boxShadow: editDraft.color === c ? "0 0 0 2px var(--ink)" : "none" }} />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingServiceId(null)} className="flex-1 rounded-full py-2 text-sm font-medium bg-[var(--surface-alt)]">Отмена</button>
                          <button onClick={handleSaveServiceEdit} disabled={savingService} className="flex-1 rounded-full py-2 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)" }}>
                            {savingService ? "Сохраняем…" : "Сохранить"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Row
                        left={<span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />{s.name}</span>}
                        sub={`${s.duration} мин`}
                        right={
                          <span className="flex items-center gap-1.5 text-sm">
                            <span className="font-mono">{s.price.toLocaleString("ru-RU")} ₽</span>
                            <button onClick={() => startEditService(s)} aria-label={`Изменить ${s.name}`} className="p-1"><Pencil size={14} className="text-[var(--moss)]" /></button>
                            <button onClick={() => handleDeleteService(s.id, s.name)} aria-label={`Удалить ${s.name}`} className="p-1"><Trash2 size={14} className="text-[var(--danger)]" /></button>
                          </span>
                        }
                      />
                    )}
                  </div>
                ))}
                {services.length === 0 && <div className="text-sm text-center py-4 text-[var(--ink-soft)]">Услуг пока нет</div>}
              </div>

              {showAddService ? (
                <div className="mt-2.5 rounded-2xl p-3.5 flex flex-col gap-2.5 bg-[var(--surface)] border border-[var(--line)]">
                  <input
                    value={newService.name}
                    onChange={(e) => setNewService((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Название услуги"
                    className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="number" value={newService.duration}
                      onChange={(e) => setNewService((s) => ({ ...s, duration: Number(e.target.value) || 0 }))}
                      placeholder="Минуты"
                      className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none"
                    />
                    <input
                      type="number" value={newService.price}
                      onChange={(e) => setNewService((s) => ({ ...s, price: Number(e.target.value) || 0 }))}
                      placeholder="Цена ₽"
                      className="w-full rounded-xl p-2.5 text-sm bg-[var(--surface-alt)] outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c} onClick={() => setNewService((s) => ({ ...s, color: c }))}
                        aria-label={`Цвет ${c}`}
                        className="rounded-full"
                        style={{ width: 22, height: 22, background: c, boxShadow: newService.color === c ? "0 0 0 2px var(--ink)" : "none" }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setShowAddService(false)} className="flex-1 rounded-full py-2.5 text-sm font-medium bg-[var(--surface-alt)]">Отмена</button>
                    <button onClick={handleAddService} disabled={savingService} className="flex-1 rounded-full py-2.5 text-sm font-medium" style={{ background: "var(--moss)", color: "var(--on-accent)", opacity: savingService ? 0.6 : 1 }}>
                      {savingService ? "Сохраняем…" : "Сохранить"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddService(true)} className="mt-2.5 w-full rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-1.5 border border-dashed border-[var(--line)] text-[var(--moss)]">
                  <Plus size={15} /> Добавить услугу
                </button>
              )}
            </>
          )}
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-1 text-[var(--ink-soft)]">Уведомления</div>
          <div className="rounded-2xl px-4 bg-[var(--surface)] border border-[var(--line)]">
            <Row left="Напоминание клиенту" sub="За 2 часа до записи" right={<Switch on={notify.client} onChange={() => setNotify((n) => ({ ...n, client: !n.client }))} label="Напоминание клиенту" />} />
            <div style={{ borderTop: "1px solid var(--line)" }}>
              <Row left="Напоминание мне" sub="За 30 минут до записи" right={<Switch on={notify.me} onChange={() => setNotify((n) => ({ ...n, me: !n.me }))} label="Напоминание мне" />} />
            </div>
            <div style={{ borderTop: "1px solid var(--line)" }}>
              <Row left="Звук уведомлений" right={<Switch on={notify.sound} onChange={() => setNotify((n) => ({ ...n, sound: !n.sound }))} label="Звук уведомлений" />} />
            </div>
          </div>
        </div>

        <div className="mx-5 mt-6">
          <div className="text-sm font-medium mb-1 text-[var(--ink-soft)]">Тема</div>
          <div className="flex rounded-full p-1 bg-[var(--surface-alt)] border border-[var(--line)]">
            {[["light", "Светлая", false], ["dark", "Тёмная", true]].map(([key, label, val]) => (
              <button key={key} onClick={() => setDark(val)} className="flex-1 rounded-full py-2 text-sm font-medium"
                style={{ background: dark === val ? "var(--moss)" : "transparent", color: dark === val ? "var(--on-accent)" : "var(--ink-soft)" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-5 mt-6">
          <button onClick={handleSignOut} className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "var(--clay-soft)", color: "var(--clay)" }}>
            <LogOut size={16} /> Выйти из аккаунта
          </button>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
