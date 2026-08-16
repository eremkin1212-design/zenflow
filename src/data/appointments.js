import { supabase } from "../lib/supabaseClient";

export function fmtDate(d) {
const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
return `${y}-${m}-${day}`;
}
const SELECT = "*, clients(id,name,phone,color), services(id,name,color,duration,price), appointment_services(services(name))";
export async function getAppointmentsRange(startDate,endDate){const {data,error}=await supabase.from("appointments").select(SELECT).gte("date",fmtDate(startDate)).lte("date",fmtDate(endDate)).order("date").order("start_time");if(error)throw error;return data;}
export async function getAppointmentById(id){const {data,error}=await supabase.from("appointments").select(SELECT).eq("id",id).maybeSingle();if(error)throw error;return data;}
export async function getAppointmentServices(appointmentId){const {data,error}=await supabase.from("appointment_services").select("id,appointment_id,service_id,duration,price,services(id,name,color,duration,price)").eq("appointment_id",appointmentId).order("id");if(error)throw error;return data||[];}
export async function getAppointmentPayment(appointmentId){const {data,error}=await supabase.from("client_payments").select("id,amount,method,date").eq("appointment_id",appointmentId).order("id",{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data;}
export async function updateAppointmentPayment(paymentId,amount){const {data,error}=await supabase.from("client_payments").update({amount}).eq("id",paymentId).select().single();if(error)throw error;return data;}
export async function createAppointment(payload){const {data,error}=await supabase.from("appointments").insert(payload).select(SELECT).single();if(error)throw error;return data;}
export async function updateAppointment(id,fields){const {data,error}=await supabase.from("appointments").update(fields).eq("id",id).select(SELECT).single();if(error)throw error;return data;}
export async function saveAppointmentServices(appointmentId,services){const {error:delError}=await supabase.from("appointment_services").delete().eq("appointment_id",appointmentId);if(delError)throw delError;if(!services?.length)return[];const rows=services.map(s=>({appointment_id:appointmentId,service_id:s.id??s.service_id,duration:Number(s.duration)||0,price:Number(s.price)||0}));const {data,error}=await supabase.from("appointment_services").insert(rows).select();if(error)throw error;return data||[];}

export async function completeAppointment(appointment,method,amount,discount){
// amount — сколько реально заплатили, discount — скидка в процентах.
const __full=Number(appointment.price)||0;
const __paid=Number.isFinite(Number(amount))&&Number(amount)>=0?Math.round(Number(amount)):__full;
  if(!appointment) throw new Error("Запись не найдена");
  const updated=await updateAppointment(appointment.id,{status:"done",price:__paid});
  const clientId=appointment.client_id??appointment.clients?.id;
  if(clientId){
    // Идемпотентность: повторное завершение/двойной клик не создаёт второй платёж.
    const { data: existing, error: lookupError } = await supabase
      .from("client_payments")
      .select("id,amount,method,date")
      .eq("appointment_id",appointment.id)
      .limit(1)
      .maybeSingle();
    if(lookupError) throw lookupError;
    if(!existing){
      const {error}=await supabase.from("client_payments").insert({client_id:clientId,appointment_id:appointment.id,amount:__paid,discount_percent:Number(discount)||0,method,date:fmtDate(new Date())});
      if(error) throw error;
    }
  }
  return updated;
}

// Сдвиг даты для повторов. Для месяца день сохраняется, но не «уползает»
// на следующий месяц: 31 января + 1 месяц = 28/29 февраля.
export function shiftRepeatDate(base,unit,step){
const d=new Date(base);
if(unit==="month"){
const day=d.getDate();
d.setDate(1);
d.setMonth(d.getMonth()+step);
const lastDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
d.setDate(Math.min(day,lastDay));
return d;
}
const days=unit==="2weeks"?14:7;
d.setDate(d.getDate()+step*days);
return d;
}

// Создаёт серию записей: первую на выбранную дату и остальные с шагом.
// Услуги копируются в каждую запись.
export async function createAppointmentSeries(payload,services,repeat){
const total=Math.max(1,Number(repeat?.count)||1);
const unit=repeat?.unit||"week";
const base=new Date(`${payload.date}T12:00:00`);
const created=[];
for(let i=0;i<total;i++){
const date=i===0?base:shiftRepeatDate(base,unit,i);
const appointment=await createAppointment({...payload,date:fmtDate(date)});
await saveAppointmentServices(appointment.id,services);
created.push(appointment);
}
return created;
}
