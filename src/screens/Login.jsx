import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("signin"); // signin | signup | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Готово! Входим…");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Письмо со ссылкой для восстановления отправлено на почту.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Неверный email или пароль" : err.message);
    } finally {
      setLoading(false);
    }
  }

  const titleByMode = { signin: "Вход", signup: "Регистрация", forgot: "Восстановление пароля" };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-serif" style={{ fontWeight: 500 }}>ZenFlow</div>
          <div className="text-sm mt-1 text-[var(--ink-soft)]">Рабочее пространство специалиста</div>
        </div>

        {mode !== "forgot" && (
          <div className="flex rounded-full p-1 mb-5 bg-[var(--surface-alt)] border border-[var(--line)]">
            {[["signin", "Вход"], ["signup", "Регистрация"]].map(([key, label]) => (
              <button key={key} type="button" onClick={() => { setMode(key); setError(""); setInfo(""); }} className="flex-1 rounded-full py-2 text-sm font-medium"
                style={{ background: mode === key ? "var(--moss)" : "transparent", color: mode === key ? "var(--on-accent)" : "var(--ink-soft)" }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === "forgot" && (
          <div className="text-sm font-medium mb-4 text-center text-[var(--ink-soft)]">{titleByMode[mode]}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" autoComplete="email"
            className="w-full rounded-2xl p-3.5 text-sm bg-[var(--surface)] border border-[var(--line)] outline-none"
          />

          {mode !== "forgot" && (
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль" autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              className="w-full rounded-2xl p-3.5 text-sm bg-[var(--surface)] border border-[var(--line)] outline-none"
            />
          )}

          {mode === "signin" && (
            <button type="button" onClick={() => { setMode("forgot"); setError(""); setInfo(""); }} className="text-xs text-left text-[var(--moss)]">
              Забыли пароль?
            </button>
          )}

          {error && <div className="text-sm text-[var(--danger)]">{error}</div>}
          {info && <div className="text-sm text-[var(--moss)]">{info}</div>}

          <button type="submit" disabled={loading} className="w-full rounded-full py-3.5 text-sm font-medium mt-1"
            style={{ background: "var(--clay)", color: "#FBF9F3", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Секунду…" : mode === "signup" ? "Создать аккаунт" : mode === "forgot" ? "Отправить письмо" : "Войти"}
          </button>

          {mode === "forgot" && (
            <button type="button" onClick={() => { setMode("signin"); setError(""); setInfo(""); }} className="text-sm text-center text-[var(--ink-soft)]">
              ← Вернуться ко входу
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
