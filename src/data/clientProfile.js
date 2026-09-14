import { supabase } from "../lib/supabaseClient";

function initialsFromName(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export async function updateClientProfile(clientId, { name, phone }) {
  const cleanName = String(name || "").trim();
  const cleanPhone = String(phone || "").trim();
  if (!clientId) throw new Error("Клиент не найден");
  if (!cleanName) throw new Error("Имя клиента не может быть пустым");

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: cleanName,
      phone: cleanPhone,
      initials: initialsFromName(cleanName),
    })
    .eq("id", clientId)
    .select("id,name,phone,initials")
    .single();

  if (error) throw error;
  return data;
}
