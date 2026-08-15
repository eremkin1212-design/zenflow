import { supabase } from "../lib/supabaseClient";
import { fmtDate } from "./appointments";

// Разбивка по услугам за период: берём строки услуг завершённых записей.
export async function getServiceBreakdown(startDate, endDate) {
const { data, error } = await supabase
.from("appointment_services")
.select("price,duration,services(name,color),appointments!inner(date,status)")
.gte("appointments.date", fmtDate(startDate))
.lte("appointments.date", fmtDate(endDate))
.eq("appointments.status", "done");
if (error) throw error;
return data || [];
}

// Завершённые записи за период — для выручки, сеансов и загрузки.
export async function getDoneAppointments(startDate, endDate) {
const { data, error } = await supabase
.from("appointments")
.select("id,date,start_time,duration,price,client_id,clients(name)")
.gte("date", fmtDate(startDate))
.lte("date", fmtDate(endDate))
.eq("status", "done")
.order("date");
if (error) throw error;
return data || [];
}

// Вся история визитов — нужна, чтобы понять, кто давно не приходил.
export async function getVisitHistory() {
const { data, error } = await supabase
.from("appointments")
.select("client_id,date,price,clients(name)")
.eq("status", "done")
.order("date", { ascending: true });
if (error) throw error;
return data || [];
}
