function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function supabaseFetch(path, accessToken) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error("Supabase environment is not configured");

  return fetch(`${supabaseUrl}${path}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return res.status(503).json({ error: "Telegram is not configured" });
  }

  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userResponse = await supabaseFetch("/auth/v1/user", accessToken);
    if (!userResponse.ok) return res.status(401).json({ error: "Unauthorized" });
    const user = await userResponse.json();

    const event = req.body?.event;
    const requestId = Number(req.body?.requestId);
    if (!requestId || !["new_request", "customer_reply"].includes(event)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const requestResponse = await supabaseFetch(
      `/rest/v1/support_requests?id=eq.${encodeURIComponent(requestId)}&select=id,owner_id,requester_email,topic,message,status`,
      accessToken
    );
    if (!requestResponse.ok) return res.status(403).json({ error: "Request not accessible" });
    const requests = await requestResponse.json();
    const supportRequest = requests?.[0];
    if (!supportRequest || supportRequest.owner_id !== user.id) {
      return res.status(403).json({ error: "Request not accessible" });
    }

    let body = supportRequest.message || "";
    if (event === "customer_reply") {
      const messagesResponse = await supabaseFetch(
        `/rest/v1/support_messages?request_id=eq.${encodeURIComponent(requestId)}&sender_type=eq.customer&select=message,created_at&order=created_at.desc&limit=1`,
        accessToken
      );
      if (messagesResponse.ok) {
        const messages = await messagesResponse.json();
        body = messages?.[0]?.message || body;
      }
    }

    const title = event === "new_request" ? "🆕 Новое обращение RITENA" : "💬 Новый ответ пользователя";
    const email = supportRequest.requester_email || user.email || "без email";
    const preview = body.length > 1200 ? `${body.slice(0, 1200)}…` : body;
    const text = [
      `<b>${title}</b>`,
      `#${supportRequest.id} · ${htmlEscape(supportRequest.topic)}`,
      `Пользователь: ${htmlEscape(email)}`,
      "",
      htmlEscape(preview),
    ].join("\n");

    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || req.headers["x-forwarded-host"] || req.headers.host;
    const url = host ? `https://${host}/support-admin/${supportRequest.id}` : null;
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(url ? { reply_markup: { inline_keyboard: [[{ text: "Открыть обращение", url }]] } } : {}),
    };

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!telegramResponse.ok) {
      const details = await telegramResponse.text();
      console.error("Telegram sendMessage failed", telegramResponse.status, details);
      return res.status(502).json({ error: "Telegram delivery failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("support-telegram error", error);
    return res.status(500).json({ error: "Internal error" });
  }
}
