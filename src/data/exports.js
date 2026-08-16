import { supabase } from "../lib/supabaseClient";

// Excel на Windows корректно открывает CSV, только если разделитель объявлен
// явно, а файл начинается с BOM. Иначе кириллица превращается в кракозябры.
const SEP = ";";
const BOM = "\uFEFF";

function cell(value) {
if (value === null || value === undefined) return "";
const text = String(value);
if (text.includes(SEP) || text.includes('"') || text.includes("\n")) {
return `"${text.replace(/"/g, '""')}"`;
}
return text;
}

function toCsv(headers, rows) {
const head = headers.map((h) => cell(h.title)).join(SEP);
const body = rows.map((row) => headers.map((h) => cell(h.value(row))).join(SEP)).join("\n");
return `${BOM}sep=${SEP}\n${head}\n${body}\n`;
}

function download(name, content) {
const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = name;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
const d = new Date();
const p = (n) => String(n).padStart(2, "0");
return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function fetchAll(table, select, order) {
const { data, error } = await supabase.from(table).select(select).order(order, { ascending: true });
if (error) throw error;
return data || [];
}

export async function exportClients() {
const rows = await fetchAll("clients", "id,name,phone,visits,cancellations,avg_check,last_visit,favorite_service,created_at", "name");
download(
`zenflow-клиенты-${stamp()}.csv`,
toCsv(
[
{ title: "Имя", value: (r) => r.name },
{ title: "Телефон", value: (r) => r.phone },
{ title: "Посещений", value: (r) => r.visits },
{ title: "Отмен", value: (r) => r.cancellations },
{ title: "Средний чек", value: (r) => r.avg_check },
{ title: "Последний визит", value: (r) => r.last_visit },
{ title: "Частая услуга", value: (r) => r.favorite_service },
],
rows
)
);
return rows.length;
}

export async function exportAppointments() {
const rows = await fetchAll(
"appointments",
"id,date,start_time,duration,price,status,notes,clients(name),appointment_services(services(name))",
"date"
);
download(
`zenflow-записи-${stamp()}.csv`,
toCsv(
[
{ title: "Дата", value: (r) => r.date },
{ title: "Время", value: (r) => r.start_time },
{ title: "Минут", value: (r) => r.duration },
{ title: "Клиент", value: (r) => r.clients?.name },
{
title: "Услуги",
value: (r) => (r.appointment_services || []).map((x) => x.services?.name).filter(Boolean).join(", "),
},
{ title: "Сумма", value: (r) => r.price },
{
title: "Статус",
value: (r) => (r.status === "done" ? "проведена" : r.status === "cancelled" ? "отменена" : "запланирована"),
},
{ title: "Заметка", value: (r) => r.notes },
],
rows
)
);
return rows.length;
}

export async function exportPayments() {
const rows = await fetchAll("client_payments", "id,date,amount,method,discount_percent,clients(name)", "date");
download(
`zenflow-оплаты-${stamp()}.csv`,
toCsv(
[
{ title: "Дата", value: (r) => r.date },
{ title: "Клиент", value: (r) => r.clients?.name },
{ title: "Сумма", value: (r) => r.amount },
{ title: "Способ", value: (r) => r.method },
{ title: "Скидка, %", value: (r) => r.discount_percent },
],
rows
)
);
return rows.length;
}

export async function exportExpenses() {
const rows = await fetchAll("expenses", "id,date,title,subtitle,amount", "date");
download(
`zenflow-расходы-${stamp()}.csv`,
toCsv(
[
{ title: "Дата", value: (r) => r.date },
{ title: "Название", value: (r) => r.title },
{ title: "Комментарий", value: (r) => r.subtitle },
{ title: "Сумма", value: (r) => r.amount },
],
rows
)
);
return rows.length;
}

export async function exportServices() {
const rows = await fetchAll("services", "id,name,duration,price,color", "name");
download(
`zenflow-услуги-${stamp()}.csv`,
toCsv(
[
{ title: "Название", value: (r) => r.name },
{ title: "Минут", value: (r) => r.duration },
{ title: "Цена", value: (r) => r.price },
],
rows
)
);
return rows.length;
}

export const EXPORTS = [
{ key: "clients", label: "Клиенты", run: exportClients },
{ key: "appointments", label: "Записи", run: exportAppointments },
{ key: "payments", label: "Оплаты", run: exportPayments },
{ key: "expenses", label: "Расходы", run: exportExpenses },
{ key: "services", label: "Услуги", run: exportServices },
];
