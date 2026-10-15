import { supabase } from "../lib/supabaseClient";
import { getClientBalance } from "./clientBalance";
import { setClientServicePrice } from "./clientServicePrices";
import {
  makeOfflineId,
  queuePendingAppointment,
  removePendingAppointment,
  getPendingAppointments,
  getPendingAppointmentsRange,
  pendingToAppointment,
  cacheAppointments,
  getCachedAppointmentsRange,
  emitAppointmentsSynced,
} from "./offlineStore";

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

async function currentOwnerId(){
  const {data}=await supabase.auth.getSession();
  return data?.session?.user?.id || null;
}

function sortAppointments(list){
  return [...list].sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))||String(a.start_time||"").localeCompare(String(b.start_time||"")));
}

export async function getAppointmentsRange(startDate,endDate){
  const startKey=fmtDate(startDate),endKey=fmtDate(endDate);
  const ownerId=await currentOwnerId();
  const pending=ownerId?getPendingAppointmentsRange(ownerId,startKey,endKey):[];
  if(typeof navigator!=="undefined"&&navigator.onLine===false){
    const cached=ownerId?getCachedAppointmentsRange(ownerId,startKey,endKey):[];
    return sortAppointments([...cached,...pending]);
  }
  try{
    const {data,error}=await withTimeout(supabase.from("appointments").select(SELECT).gte("date",startKey).lte("date",endKey).order("date").order("start_time"),5000);
    if(error)throw error;
    const remote=data||[];
    if(ownerId) cacheAppointments(ownerId,remote);
    const remoteOfflineIds=new Set(remote.map(a=>a.offline_id).filter(Boolean));
    return sortAppointments([...remote,...pending.filter(a=>!remoteOfflineIds.has(a.offline_id))]);
  }catch(error){
    if(!ownerId)throw error;
    const cached=getCachedAppointmentsRange(ownerId,startKey,endKey);
    const cachedOfflineIds=new Set(cached.map(a=>a.offline_id).filter(Boolean));
    return sortAppointments([...cached,...pending.filter(a=>!cachedOfflineIds.has(a.offline_id))]);
  }
}
export async function getAppointmentById(id){const {data,error}=await supabase.from("appointments").select(SELECT).eq("id",id).maybeSingle();if(error)throw error;return data;}
export async function getAppointmentServices(appointmentId){const {data,error}=await supabase.from("appointment_services").select("id,appointment_id,service_id,duration,price,services(id,name,color,duration,price)").eq("appointment_id",appointmentId).order("id");if(error)throw error;return data||[];}
export async function getAppointmentPayment(appointmentId){const {data,error}=await supabase.from("client_payments").select("id,amount,method,date,discount_percent").eq("appointment_id",appointmentId).order("id",{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data;}

export async function updateAppointmentPayment(paymentId){const {data,error}=await supabase.from("client_payments").select("*").eq("id",paymentId).single();if(error)throw error;return data;}

export async function createAppointment(payload){const normalized={...payload,full_price:Number(payload.full_price ?? payload.price ?? 0)};const {data,error}=await runWriteWithAuthRetry(()=>supabase.from("appointments").insert(normalized).select(SELECT).single());if(error)throw error;return data;}

export async function createAppointmentIdempotent(payload){
  const ownerId=await currentOwnerId();
  if(!ownerId) throw new Error("Сессия пользователя недоступна");
  const offlineId=payload?.offline_id;
  if(!offlineId) return createAppointment(payload);
  const normalized={...payload,owner_id:ownerId,offline_id:offlineId,full_price:Number(payload.full_price ?? payload.price ?? 0)};
  const result=await runWriteWithAuthRetry(()=>supabase
    .from("appointments")
    .upsert(normalized,{onConflict:"owner_id,offline_id",ignoreDuplicates:true})
    .select(SELECT)
    .maybeSingle());
  if(result?.error){result.error.status=result.status;throw result.error;}
  if(result?.data) return result.data;
  const {data,error}=await supabase.from("appointments").select(SELECT).eq("owner_id",ownerId).eq("offline_id",offlineId).maybeSingle();
  if(error)throw error;
  if(!data)throw new Error("Не удалось подтвердить синхронизацию записи");
  return data;
}

function isLikelyNetworkError(error){
  if(typeof navigator!=="undefined" && navigator.onLine===false) return true;
  const message=String(error?.message||error||"").toLowerCase();
  return error?.name==="TypeError"||message.includes("failed to fetch")||message.includes("network")||message.includes("load failed")||message.includes("timeout")||message.includes("offline")||message.includes("fetch failed");
}

function withTimeout(promise,ms=9000){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("offline timeout")),ms)});
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}

export async function createAppointmentOfflineReady(payload,services,{client,forceQueue=false}={}){
  const ownerId=await currentOwnerId();
  if(!ownerId) throw new Error("Сессия пользователя недоступна");
  const offlineId=payload?.offline_id||makeOfflineId();
  const normalized={...payload,offline_id:offlineId,full_price:Number(payload.full_price ?? payload.price ?? 0)};
  const item={
    offlineId,
    payload:normalized,
    services:(services||[]).map(s=>({
      id:s.id??s.service_id,
      service_id:s.id??s.service_id,
      name:s.name,
      color:s.color,
      duration:Number(s.duration)||0,
      price:Number(s.price)||0,
    })),
    client:client?{id:client.id,name:client.name,phone:client.phone||"",color:client.color,highlights:client.highlights||""}:null,
  };
  if(forceQueue||(typeof navigator!=="undefined"&&navigator.onLine===false)){
    queuePendingAppointment(ownerId,item);
    return pendingToAppointment(item);
  }
  try{
    const appointment=await withTimeout(createAppointmentIdempotent(normalized));
    await withTimeout(saveAppointmentServices(appointment.id,services));
    return appointment;
  }catch(error){
    if(isLikelyNetworkError(error)){
      queuePendingAppointment(ownerId,item);
      return pendingToAppointment(item);
    }
    throw error;
  }
}

export async function syncOfflineAppointments(){
  if(typeof navigator!=="undefined"&&navigator.onLine===false) return {synced:0,remaining:null};
  const ownerId=await currentOwnerId();
  if(!ownerId) return {synced:0,remaining:null};
  const pending=getPendingAppointments(ownerId);
  let synced=0;
  for(const item of pending){
    try{
      const appointment=await createAppointmentIdempotent(item.payload);
      await saveAppointmentServices(appointment.id,item.services||[]);
      removePendingAppointment(ownerId,item.offlineId);
      synced+=1;
    }catch(error){
      if(isLikelyNetworkError(error)) break;
      break;
    }
  }
  if(synced>0) emitAppointmentsSynced();
  return {synced,remaining:getPendingAppointments(ownerId).length};
}

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

export async function completeAppointment(appointment,method,options={}){
  if(!appointment) throw new Error("Запись не найдена");

  // Быстрая оплата: стоимость услуги и сумма, которую клиент передал,
  // являются разными величинами. В финансы всегда идёт serviceTotal.
  const currentPrice=Math.max(0,Math.round(Number(appointment.price ?? appointment.full_price)||0));
  const discountPercent=Math.max(0,Math.round(Number(options?.discount)||0));
  const serviceTotal=Math.max(
    0,
    Math.round(
      Number.isFinite(Number(options?.serviceTotal))
        ? Number(options.serviceTotal)
        : discountPercent>0
          ? currentPrice*(1-discountPercent/100)
          : currentPrice
    )
  );
  const clientId=appointment.client_id??appointment.clients?.id;
  const methodName=method||"Наличные";
  const balance=clientId?Math.max(0,await getClientBalance(clientId)):0;
  const balanceUsed=Math.min(balance,serviceTotal);
  const dueAfterBalance=Math.max(0,serviceTotal-balanceUsed);
  const received=methodName==="Наличные"
    ? Math.max(0,Math.round(Number(options?.received ?? dueAfterBalance)||0))
    : dueAfterBalance;

  if(methodName==="Наличные"&&received<dueAfterBalance){
    throw new Error(`Не хватает ${(dueAfterBalance-received).toLocaleString("ru-RU")} ₽`);
  }

  await completeAppointmentWithBalance(
    {...appointment,price:serviceTotal,full_price:serviceTotal},
    {
      method:methodName,
      received,
      useBalance:true,
      keepChange:methodName==="Наличные"&&received>dueAfterBalance,
      serviceTotal,
    }
  );

  // Если запись была создана до появления list_price, сохраняем исходную
  // стоимость, чтобы индивидуальная цена не стирала цену общего прайса.
  if(appointment.list_price==null){
    await supabase.from("appointments").update({list_price:currentPrice}).eq("id",appointment.id);
  }

  // Для одной услуги синхронизируем цену строки услуги с фактической
  // стоимостью визита, чтобы карточка клиента не показывала старую сумму.
  const {data:serviceRows,error:serviceRowsError}=await supabase
    .from("appointment_services")
    .select("id,service_id")
    .eq("appointment_id",appointment.id)
    .order("id")
    .limit(2);
  if(!serviceRowsError&&serviceRows?.length===1){
    await supabase.from("appointment_services").update({price:serviceTotal}).eq("id",serviceRows[0].id);
  }

  if(discountPercent>0&&currentPrice!==serviceTotal){
    await updateAppointment(appointment.id,{full_price:currentPrice});
  }

  if(options?.rememberPrice&&clientId){
    const serviceId=serviceRows?.length===1
      ? serviceRows[0].service_id
      : appointment.service_id??appointment.services?.id;
    if(serviceId&&(!serviceRows||serviceRows.length<=1)){
      await setClientServicePrice(clientId,serviceId,serviceTotal);
    }
  }

  return getAppointmentById(appointment.id);
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
