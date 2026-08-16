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
// BOM обязан быть самым первым символом файла, иначе Excel не поймёт кодировку.
return `${BOM}${head}\n${body}\n`;
}


// Excel надёжнее всего открывает HTML-таблицу с явно указанной кодировкой:
// в отличие от CSV, тут не зависит от системных настроек разделителя и языка.
function toXls(headers, rows) {
const head = headers.map((h) => `<th>${escapeHtml(h.title)}</th>`).join("");
const body = rows
.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(h.value(row))}</td>`).join("")}</tr>`)
.join("");
return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function escapeHtml(value) {
if (value === null || value === undefined) return "";
return String(value)
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;");
}

function downloadXls(name, content) {
download(name, content, "application/vnd.ms-excel");
}

function download(name, content, mime) {
const blob = new Blob([content], { type: `${mime || "text/csv"};charset=utf-8` });
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


// ── Описание таблиц ─────────────────────────────────────────────────────

const TABLES = {
clients: {
label: "Клиенты",
table: "clients",
select: "id,name,phone,visits,cancellations,avg_check,last_visit,favorite_service",
order: "name",
columns: [
{ title: "Имя", value: (r) => r.name },
{ title: "Телефон", value: (r) => r.phone },
{ title: "Посещений", value: (r) => r.visits },
{ title: "Отмен", value: (r) => r.cancellations },
{ title: "Средний чек", value: (r) => r.avg_check },
{ title: "Последний визит", value: (r) => r.last_visit },
{ title: "Частая услуга", value: (r) => r.favorite_service },
],
},
appointments: {
label: "Записи",
table: "appointments",
select: "id,date,start_time,duration,price,status,notes,clients(name),appointment_services(services(name))",
order: "date",
columns: [
{ title: "Дата", value: (r) => r.date },
{ title: "Время", value: (r) => r.start_time },
{ title: "Минут", value: (r) => r.duration },
{ title: "Клиент", value: (r) => r.clients?.name },
{ title: "Услуги", value: (r) => (r.appointment_services || []).map((x) => x.services?.name).filter(Boolean).join(", ") },
{ title: "Сумма", value: (r) => r.price },
{ title: "Статус", value: (r) => (r.status === "done" ? "проведена" : r.status === "cancelled" ? "отменена" : "запланирована") },
{ title: "Заметка", value: (r) => r.notes },
],
},
payments: {
label: "Оплаты",
table: "client_payments",
select: "id,date,amount,method,discount_percent,clients(name)",
order: "date",
columns: [
{ title: "Дата", value: (r) => r.date },
{ title: "Клиент", value: (r) => r.clients?.name },
{ title: "Сумма", value: (r) => r.amount },
{ title: "Способ", value: (r) => r.method },
{ title: "Скидка, %", value: (r) => r.discount_percent },
],
},
expenses: {
label: "Расходы",
table: "expenses",
select: "id,date,title,subtitle,amount",
order: "date",
columns: [
{ title: "Дата", value: (r) => r.date },
{ title: "Название", value: (r) => r.title },
{ title: "Комментарий", value: (r) => r.subtitle },
{ title: "Сумма", value: (r) => r.amount },
],
},
services: {
label: "Услуги",
table: "services",
select: "id,name,duration,price",
order: "name",
columns: [
{ title: "Название", value: (r) => r.name },
{ title: "Минут", value: (r) => r.duration },
{ title: "Цена", value: (r) => r.price },
],
},
};

// format: "xls" (по умолчанию, надёжно открывается в Excel и Numbers) или "csv"
export async function exportTable(key, format = "xls") {
const spec = TABLES[key];
if (!spec) throw new Error("unknown-table");

const rows = await fetchAll(spec.table, spec.select, spec.order);
const name = `zenflow-${spec.label.toLowerCase()}-${stamp()}`;

if (format === "csv") {
download(`${name}.csv`, toCsv(spec.columns, rows), "text/csv");
} else {
downloadXls(`${name}.xls`, toXls(spec.columns, rows));
}
return rows.length;
}

export const EXPORTS = Object.entries(TABLES).map(([key, spec]) => ({ key, label: spec.label }));
