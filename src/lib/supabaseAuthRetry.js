import { supabase } from "./supabaseClient";

function isAuthError(error, status) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return Number(status) === 401 ||
    code === "PGRST301" ||
    message.includes("jwt expired") ||
    message.includes("invalid jwt") ||
    message.includes("token is expired");
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("network timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function runSupabaseRequest(operation, { timeoutMs = 4000 } = {}) {
  let result = await withTimeout(Promise.resolve().then(operation), timeoutMs);
  if (result?.error && isAuthError(result.error, result.status)) {
    try {
      const refreshed = await withTimeout(supabase.auth.refreshSession(), Math.min(timeoutMs, 4000));
      if (!refreshed?.error) {
        result = await withTimeout(Promise.resolve().then(operation), timeoutMs);
      }
    } catch {
      // Caller will fall back to cached data when available.
    }
  }
  return result;
}
