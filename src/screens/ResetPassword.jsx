import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate("/");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-serif" style={{ fontWeight: 500 }}>ZenFlow</div>
          <div className="text-sm mt-1 text-[var(--ink-soft)]">Новый пароль</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Новый пароль" autoComplete="new-password" minLength={6}
            className="w-full rounded-2xl p-3.5 text-sm bg-[var(--surface)] border border-[var(--line)] outline-none"
          />
          {error && <div className="text-sm text-[var(--danger)]">{error}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-full py-3.5 text-sm font-medium mt-1"
            style={{ background: "var(--clay)", color: "#FBF9F3", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Секунду…" : "Сохранить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
