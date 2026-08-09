import { supabase } from "../lib/supabaseClient";

export function fmtDate(d) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const SELECT = "*, clients(id,name,phone,color), services(id,name,color,duration,price)";
export async function getAppointmentsRange(startDate,endDate){const {data,error}=await supabase.from("appointments").select(SELECT).gte("date",fmtDate(startDate)).lte("date",fmtDate(endDate)).order("date").order("start_time");if(error)throw error;return data;}
export async function getAppointmentById(id){const {data,error}=await supabase.from("appointments").select(SELECT).eq("id",id).maybeSingle();if(error)throw error;return data;}
export async function getAppointmentServices(appointmentId){const {data,error}=await supabase.from("appointment_services").select("id,appointment_id,service_id,duration,price,services(id,name,color,duration,price)").eq("appointment_id",appointmentId).order("id");if(error)throw error;return data||[];}
export async function getAppointmentPayment(appointmentId){const {data,error}=await supabase.from("client_payments").select("id,amount,method,date").eq("appointment_id",appointmentId).order("id",{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data;}
export async function updateAppointmentPayment(paymentId,amount){const {data,error}=await supabase.from("client_payments").update({amount}).eq("id",paymentId).select().single();if(error)throw error;return data;}
export async function createAppointment(payload){const {data,error}=await supabase.from("appointments").insert(payload).select(SELECT).single();if(error)throw error;return data;}
export async function updateAppointment(id,fields){const {data,error}=await supabase.from("appointments").update(fields).eq("id",id).select(SELECT).single();if(error)throw error;return data;}
export async function saveAppointmentServices(appointmentId,services){const {error:delError}=await supabase.from("appointment_services").delete().eq("appointment_id",appointmentId);if(delError)throw delError;if(!services?.length)return[];const rows=services.map(s=>({appointment_id:appointmentId,service_id:s.id??s.service_id,duration:Number(s.duration)||0,price:Number(s.price)||0}));const {data,error}=await supabase.from("appointment_services").insert(rows).select();if(error)throw error;return data||[];}
export async function completeAppointment(appointment,method){const updated=await updateAppointment(appointment.id,{status:"done"});const clientId=appointment.client_id??appointment.clients?.id;if(clientId){const {error}=await supabase.from("client_payments").insert({client_id:clientId,appointment_id:appointment.id,amount:appointment.price,method,date:fmtDate(new Date())});if(error)throw error;}return updated;}
