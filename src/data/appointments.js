import { supabase } from "../lib/supabaseClient";
import { getClientBalance } from "./clientBalance";

export function fmtDate(d) {
const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0");
return `${y}-${m}-${day}`;
}
const SELECT = "*, clients(id,name,phone,color,highlights), services(id,name,color,duration,price), appointment_services(services(name))";

function isExpiredAuthError(error,status){
const code=String(error?.code||"");
const message=String(error?.message||"").toLowerCase();
return Number(status)===401||code==="PGRST301"||message.includes("jwt expired")||message.includes("invalid jwt")||message.includes("token is expired");
}

async function runWriteWithAuthRetry(operation){
let result=await operation();
if(result?.error&&isExpiredAuthError(result.error,result.status)){
const {error:refreshError}=await supabase.auth.refreshSession();
if(!refreshError) result=await operation();
}
return result;
}

export async function getAppointmentsRange(startDate,endDate){const {data,error}=await supabase.from("appointments").select(SELECT).gte("date",fmtDate(startDate)).lte("date",fmtDate(endDate)).order("date").order("start_time");if(error)throw error;return data;}
export async function getAppointmentById(id){const {data,error}=await supabase.from("appointments").select(SELECT).eq("id",id).maybeSingle();if(error)throw error;return data;}
export async function getAppointmentServices(appointmentId){const {data,error}=await supabase.from("appointment_services").select("id,appointment_id,service_id,duration,price,services(id,name,color,duration,price)").eq("appointment_id",appointmentId).order("id");if(error)throw error;return data||[];}
export async function getAppointmentPayment(appointmentId){const {data,error}=await supabase.from("client_payments").select("id,amount,method,date,discount_percent").eq("appointment_id",appointmentId).order("id",{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data;}

export async function updateAppointmentPayment(paymentId){const {data,error}=await supabase.from("client_payments").select("*").eq("id",paymentId).single();if(error)throw error;return data;}

export async function createAppointment(payload){const normalized={...payload,full_price:Number(payload.full_price ?? payload.price ?? 0)};const {data,error}=await runWriteWithAuthRetry(()=>supabase.from("appointments").insert(normalized).select(SELECT).single());if(error)throw error;return data;}
export async function updateAppointment(id,fields){const {data,error}=await runWriteWithAuthRetry(()=>supabase.from("appointments").update(fields).eq("id",id).select(SELECT).single());if(error)throw error;return data;}
export async function saveAppointmentServices(appointmentId,services){const {error:delError}=await supabase.from("appointment_services").delete().eq("appointment_id",appointmentId);if(delError)throw delError;if(!services?.length)return[];const rows=services.map(s=>({appointment_id:appointmentId,service_id:s.id??s.service_id,duration:Number(s.duration)||0,price:Number(s.price)||0}));const {data,error}=await supabase.from("appointment_services").insert(rows).select();if(error)throw error;return data||[];}

export async function completeAppointmentWithBalance(appointment,{method,received,useBalance=true,keepChange=false,serviceTotal}={}){
  if(!appointment?.id) throw new Error("Запись не найдена");
  const total=Math.max(0,Math.round(Number(serviceTotal ?? appointment.full_price ?? appointment.price)||0));
  const args={
    p_appointment_id:appointment.id,
    p_service_total:total,
    p_method:method||"Наличные",
    p_received:Number.isFinite(Number(received))?Math.round(Number(received)):null,
    p_use_balance:Boolean(useBalance),
    p_keep_change:Boolean(keepChange),
  };
  const {data,error,status}=await runWriteWithAuthRetry(()=>supabase.rpc("complete_appointment_with_balance",args));
  if(error){error.status=status;throw error;}
  return data;
}

export async function completeAppointment(appointment,method,amount,discount){
  if(!appointment) throw new Error("Запись не найдена");
  const full=Math.max(0,Math.round(Number(appointment.full_price ?? appointment.price)||0));
  const entered=Number.isFinite(Number(amount))&&Number(amount)>=0?Math.round(Number(amount)):full;
  const discountPercent=Math.max(0,Math.round(Number(discount)||0));
  const serviceTotal=discountPercent>0?Math.round(full*(1-discountPercent/100)):full;
  const clientId=appointment.client_id??appointment.clients?.id;
  const balance=clientId?Math.max(0,await getClientBalance(clientId)):0;
  const balanceUsed=Math.min(balance,serviceTotal);
  const dueAfterBalance=Math.max(0,serviceTotal-balanceUsed);

  // Быстрая оплата на главном экране и в календаре теперь всегда учитывает
  // существующий баланс клиента. Введённая сумма для наличных — это сколько
  // реально дал клиент, а не новая стоимость услуги.
  if(balance>0||(method==="Наличные"&&entered>serviceTotal)){
    const received=method==="Наличные"
      ? (discountPercent>0?dueAfterBalance:entered)
      : dueAfterBalance;
    await completeAppointmentWithBalance(
      {...appointment,price:serviceTotal,full_price:serviceTotal},
      {method,received,useBalance:true,keepChange:method==="Наличные",serviceTotal}
    );
    // RPC хранит итоговую стоимость сеанса в price. Исходную стоимость до скидки
    // возвращаем в full_price, чтобы история скидок оставалась корректной.
    if(full!==serviceTotal){
      await updateAppointment(appointment.id,{full_price:full});
    }
    return getAppointmentById(appointment.id);
  }

  const updated=await updateAppointment(appointment.id,{status:"done",price:serviceTotal,full_price:full});
  if(clientId){
    const { data: existing, error: lookupError } = await supabase
      .from("client_payments")
      .select("id,amount,method,date,discount_percent")
      .eq("appointment_id",appointment.id)
      .limit(1)
      .maybeSingle();
    if(lookupError) throw lookupError;
    if(!existing){
      const {error}=await supabase.from("client_payments").insert({client_id:clientId,appointment_id:appointment.id,amount:serviceTotal,discount_percent:discountPercent,method,date:fmtDate(new Date())});
      if(error) throw error;
    }
  }
  return updated;
}

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
