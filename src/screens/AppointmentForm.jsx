import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Plus, X, Check, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import HighlightsBanner from "../components/HighlightsBanner";
import { useAuth } from "../auth";
import { getProfile } from "../data/profile";
import { getServices } from "../data/services";
import { getClients, getClientById, createClient } from "../data/clients";
import { getClientBalance } from "../data/clientBalance";
import { getAppointmentById, getAppointmentServices, getAppointmentPayment, updateAppointmentPayment, createAppointmentOfflineReady, updateAppointment, saveAppointmentServices, completeAppointmentWithBalance, fmtDate } from "../data/appointments";
import { canPickPhoneContact, isContactPickerCancel, pickPhoneContact } from "../lib/contactPicker";

const WEEKDAYS=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const KEYS=["mon","tue","wed","thu","fri","sat","sun"];
const DEFAULT_WEEK=KEYS.map(key=>({key,on:false,start:"10:00",end:"22:00",breakStart:null,breakEnd:null}));
function getWorkingHours(p,date){const w=p?.working_hours;if(Array.isArray(w)) return w.find(x=>x.key===KEYS[(date.getDay()+6)%7])||DEFAULT_WEEK[(date.getDay()+6)%7];const weekly=w?.weekly||DEFAULT_WEEK;return weekly.find(x=>x.key===KEYS[(date.getDay()+6)%7])||DEFAULT_WEEK[(date.getDay()+6)%7];}
function isWorkingDate(schedule,date){if(!schedule)return false;const dates=Array.isArray(schedule)?{}:(schedule.dates||{});const key=fmtDate(date);if(dates[key])return dates[key].on!==false;const weekly=Array.isArray(schedule)?schedule:(schedule.weekly||[]);const item=weekly.find(x=>x.key===KEYS[(date.getDay()+6)%7]);return Boolean(item&&item.on)}
function startOfWeek(d){const x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));x.setHours(0,0,0,0);return x}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function pad(n){return String(n).padStart(2,"0")}
function timeToMin(t){const [h,m]=String(t||"10:00").split(":").map(Number);return h*60+m}
function minToTime(m){return `${pad(Math.floor(m/60))}:${pad(m%60)}`}
function weekDiff(a,b){return Math.round((startOfWeek(b)-startOfWeek(a))/(7*24*60*60*1000))}
export default function AppointmentForm(){
 const {mode}=useParams(); const id=mode==="new"?null:mode; const [params]=useSearchParams(); const navigate=useNavigate(); const today=useMemo(()=>new Date(),[]);
 const [services,setServices]=useState([]),[clients,setClients]=useState([]),[hours,setHours]=useState(null),[client,setClient]=useState(null),[selectedServices,setSelectedServices]=useState([]),[date,setDate]=useState(today),[timeMin,setTimeMin]=useState(600),[notes,setNotes]=useState(""),[payment,setPayment]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[query,setQuery]=useState(""),[quick,setQuick]=useState(false),[quickName,setQuickName]=useState(""),[quickPhone,setQuickPhone]=useState(""),[pickingQuickContact,setPickingQuickContact]=useState(false);
 const [serviceQuery,setServiceQuery]=useState(""),[extraSlots,setExtraSlots]=useState([]);
 const [clientBalance,setClientBalance]=useState(0),[payOpen,setPayOpen]=useState(false),[payMethod,setPayMethod]=useState("Наличные"),[cashReceived,setCashReceived]=useState(""),[useBalance,setUseBalance]=useState(true),[keepChange,setKeepChange]=useState(false);
 const monday=useMemo(()=>{const x=startOfWeek(today);x.setDate(x.getDate()+weekDiff(today,date)*7);return x},[today,date]); const week=useMemo(()=>Array.from({length:7},(_,i)=>addDays(monday,i)),[monday]);
 const duration=selectedServices.reduce((s,x)=>s+Number(x.duration||0),0),price=selectedServices.reduce((s,x)=>s+Number(x.price||0),0); const filtered=clients.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())).slice(0,7);
 const serviceNames=selectedServices.map(s=>s.name).filter(Boolean);
 const appointmentCount=1+extraSlots.length;
 useEffect(()=>{let dead=false;const cid=params.get("client");Promise.all([getServices(),getClients(),id?getAppointmentById(id):Promise.resolve(null),id?getAppointmentServices(id):Promise.resolve([]),id?getAppointmentPayment(id):Promise.resolve(null),!id&&cid?getClientById(cid):Promise.resolve(null)]).then(([sv,cl,a,as,p,linkedClient])=>{if(dead)return;setServices(sv);setClients(cl);if(a){if(a.clients)setClient({id:a.clients.id,name:a.clients.name});setDate(new Date(`${a.date}T12:00:00`));setTimeMin(timeToMin(a.start_time));setNotes(a.notes||"");setPayment(p);if(as?.length)setSelectedServices(as.map(x=>({id:x.service_id,duration:x.duration,price:x.price,name:x.services?.name,color:x.services?.color})));else if(a.services)setSelectedServices([a.services]);}else{const qd=params.get("date"),qt=params.get("time");if(qd)setDate(new Date(`${qd}T12:00:00`));if(qt)setTimeMin(timeToMin(qt));if(linkedClient)setClient({id:linkedClient.id,name:linkedClient.name});else if(cid){const c=cl.find(x=>String(x.id)===cid);if(c)setClient({id:c.id,name:c.name})}}setLoading(false)}).catch(()=>{if(!dead){setError("Не удалось загрузить данные");setLoading(false)}});return()=>{dead=true}},[id,params]);
 const {user}=useAuth();
 useEffect(()=>{if(!user)return;let dead=false;getProfile(user.id).then(p=>{if(!dead)setHours(p?.working_hours||null)}).catch(()=>{});return()=>{dead=true}},[user]);
 useEffect(()=>{let dead=false;if(!client?.id){setClientBalance(0);return()=>{dead=true}}getClientBalance(client.id).then(v=>{if(!dead)setClientBalance(v)}).catch(()=>{if(!dead)setClientBalance(0)});return()=>{dead=true}},[client?.id]);
 const stripRef=useRef(null),stripReady=useRef(false);
 const [stripBase,setStripBase]=useState(()=>addDays(startOfWeek(new Date()),-28));
 const stripDates=useMemo(()=>Array.from({length:240},(_,i)=>addDays(stripBase,i)),[stripBase]);
 useEffect(()=>{const key=fmtDate(date);if(key<fmtDate(stripDates[0])||key>fmtDate(stripDates[stripDates.length-1])){setStripBase(addDays(startOfWeek(date),-28));return}const el=stripRef.current?.querySelector(`[data-d="${key}"]`);el?.scrollIntoView({inline:"center",block:"nearest",behavior:stripReady.current?"smooth":"auto"});if(el)stripReady.current=true},[date,stripDates,loading]);
 const visibleServices=useMemo(()=>{const q=serviceQuery.trim().toLowerCase();if(!q)return services;return services.filter(s=>String(s.name||"").toLowerCase().includes(q)||selectedServices.some(x=>x.id===s.id));},[services,serviceQuery,selectedServices]);
 function toggleService(s){setSelectedServices(prev=>prev.some(x=>x.id===s.id)?prev.filter(x=>x.id!==s.id):[...prev,{id:s.id,name:s.name,color:s.color,duration:s.duration,price:s.price}])}
 function addExtraSlot(){
  setExtraSlots(prev=>{
   const last=prev[prev.length-1];
   const base=last?.date?new Date(`${last.date}T12:00:00`):date;
   const next=addDays(Number.isNaN(base.getTime())?date:base,1);
   return [...prev,{date:fmtDate(next),time:minToTime(timeMin)}];
  });
 }
 function updateExtraSlot(index,patch){setExtraSlots(prev=>prev.map((slot,i)=>i===index?{...slot,...patch}:slot))}
 function removeExtraSlot(index){setExtraSlots(prev=>prev.filter((_,i)=>i!==index))}
 function changeWeek(n){setDate(d=>addDays(d,n*7))} function selectDay(i){setDate(week[i])}
 async function pickQuickContact(){
  setPickingQuickContact(true);
  try{
   const picked=await pickPhoneContact();
   if(!picked)return;
   if(picked.name)setQuickName(picked.name);
   if(picked.phone)setQuickPhone(picked.phone);
  }catch(err){
   if(!isContactPickerCancel(err))window.alert("Не удалось открыть контакты");
  }finally{
   setPickingQuickContact(false);
  }
 }
 async function addQuick(){if(!quickName.trim())return;try{const c=await createClient({name:quickName,phone:quickPhone});setClients(x=>[...x,c]);setClient({id:c.id,name:c.name});setQuick(false);setQuickName("");setQuickPhone("")}catch{window.alert("Не удалось создать клиента")}}
 async function save(){
  setError("");
  if(!client){setError("Выберите клиента");return}
  if(!selectedServices.length){setError("Выберите хотя бы одну услугу");return}
  const slots=[{date:fmtDate(date),time:minToTime(timeMin)},...extraSlots];
  if(slots.some(slot=>!slot.date||!slot.time)){setError("Укажите дату и время для каждой записи");return}
  const slotKeys=slots.map(slot=>`${slot.date}|${slot.time}`);
  if(new Set(slotKeys).size!==slotKeys.length){setError("Одинаковая дата и время выбраны несколько раз");return}
  setSaving(true);
  try{
   const basePayload={client_id:client.id,service_id:selectedServices[0].id,duration,price,notes};
   let a;
   const clientMeta=clients.find(c=>String(c.id)===String(client.id))||client;
   if(id){
    a=await updateAppointment(id,{...basePayload,date:fmtDate(date),start_time:minToTime(timeMin)});
    await saveAppointmentServices(a.id,selectedServices);

    let forceQueue=typeof navigator!=="undefined"&&navigator.onLine===false;
    for(const slot of extraSlots){
     const added=await createAppointmentOfflineReady(
      {...basePayload,date:slot.date,start_time:slot.time,status:"planned"},
      selectedServices,
      {client:clientMeta,forceQueue}
     );
     if(added?._offline) forceQueue=true;
    }
   }else{
    let forceQueue=typeof navigator!=="undefined"&&navigator.onLine===false;
    for(const slot of slots){
     a=await createAppointmentOfflineReady(
      {...basePayload,date:slot.date,start_time:slot.time,status:"planned"},
      selectedServices,
      {client:clientMeta,forceQueue}
     );
     if(a?._offline) forceQueue=true;
    }
   }
   if(payment)await updateAppointmentPayment(payment.id,price);
   navigate("/calendar");
  }catch{
   setError("Не удалось сохранить запись");
   setSaving(false);
  }
 }
 async function cancel(){if(!id||!window.confirm("Отменить запись?"))return;try{await updateAppointment(id,{status:"cancelled"});navigate("/calendar")}catch{setError("Не удалось отменить")}}
 function openPayment(method){const used=clientBalance>0?Math.min(clientBalance,price):0;const due=Math.max(0,price-used);setPayMethod(method);setUseBalance(clientBalance>0);setKeepChange(false);setCashReceived(String(due));setPayOpen(true);setError("")}
 const balanceUsed=useBalance?Math.min(Math.max(clientBalance,0),price):0;
 const amountDue=Math.max(0,price-balanceUsed);
 const receivedValue=payMethod==="Наличные"?Math.max(0,Number(cashReceived)||0):amountDue;
 const change=Math.max(0,receivedValue-amountDue);
 async function confirmPayment(){if(!id)return;if(payMethod==="Наличные"&&receivedValue<amountDue){setError(`Не хватает ${(amountDue-receivedValue).toLocaleString("ru-RU")} ₽`);return}setSaving(true);setError("");try{await completeAppointmentWithBalance({id,client_id:client?.id,price},{method:payMethod,received:receivedValue,useBalance,keepChange});navigate("/calendar")}catch(e){setError(e?.message||"Не удалось принять оплату");setSaving(false)}}
 if(loading)return <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center text-sm text-[var(--ink-soft)]">Загружаем…</div>;
 return <><div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans"><div className="max-w-sm mx-auto pb-28">
  <div className="flex items-center justify-between px-5 pt-7 pb-2"><button onClick={()=>navigate(-1)} className="rounded-full p-2.5 bg-[var(--surface-alt)]"><ArrowLeft size={18}/></button><div className="text-lg font-serif">{id?"Редактирование записи":"Новая запись"}</div><ThemeToggle/></div>
  {payment&&<div className="mx-5 mt-4 rounded-2xl p-3 bg-[var(--moss-soft)] text-sm"><div className="flex items-center justify-between"><span className="font-medium">Оплачено</span><span className="font-mono">{Number(payment.amount).toLocaleString("ru-RU")} ₽</span></div><div className="text-xs mt-1 text-[var(--ink-soft)]">{payment.method}</div><div className="mt-2 pt-2 border-t border-[var(--line)]"><div className="text-xs font-medium mb-1">Услуги</div><div className="text-xs text-[var(--ink-soft)]">{serviceNames.length ? serviceNames.join(" · ") : "Услуги не найдены"}</div><div className="text-xs mt-1 text-[var(--ink-soft)]">{selectedServices.length} {selectedServices.length===1?"услуга":"услуг"} · {duration} мин</div></div><div className="text-xs mt-2 text-[var(--ink-soft)]">Оплата сохраняется даже при изменении даты, времени или состава услуг.</div></div>}
  <div className="mx-5 mt-5"><div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Клиент</div>{client?<div className="rounded-2xl p-3.5 flex justify-between bg-[var(--moss-soft)]"><div className="text-sm font-medium">{client.name}<div className="mt-1 text-xs text-[var(--ink-soft)]">Баланс: {clientBalance.toLocaleString("ru-RU")} ₽</div><div className="mt-1.5"><HighlightsBanner text={clients.find((c) => c.id === client.id)?.highlights} compact /></div></div><button onClick={()=>setClient(null)} className="text-xs text-[var(--moss)]">Изменить</button></div>:<><div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--line)]"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск клиента" className="flex-1 bg-transparent outline-none text-sm"/></div><div className="flex gap-2 mt-2 overflow-x-auto">{filtered.map(c=><button key={c.id} onClick={()=>setClient({id:c.id,name:c.name})} className="shrink-0 rounded-full px-3 py-2 text-sm bg-[var(--surface-alt)]">{c.name}</button>)}<button onClick={()=>setQuick(true)} className="shrink-0 rounded-full px-3 py-2 text-sm border border-dashed border-[var(--line)]"><Plus size={14} className="inline"/> Новый</button></div>{quick&&<div className="mt-2 rounded-2xl p-3 bg-[var(--surface)] border border-[var(--line)]">{canPickPhoneContact()&&<button type="button" onClick={pickQuickContact} disabled={pickingQuickContact} className="w-full rounded-xl p-2.5 mb-2 flex items-center justify-center gap-2 bg-[var(--moss-soft)] text-sm font-medium" style={{opacity:pickingQuickContact?.6:1}}><UserPlus size={15}/>{pickingQuickContact?"Открываем контакты…":"Выбрать из контактов"}</button>}<input value={quickName} onChange={e=>setQuickName(e.target.value)} placeholder="Имя" className="w-full rounded-xl p-2 mb-2 bg-[var(--surface-alt)] outline-none"/><input value={quickPhone} onChange={e=>setQuickPhone(e.target.value)} placeholder="Телефон" className="w-full rounded-xl p-2 mb-2 bg-[var(--surface-alt)] outline-none"/><div className="flex gap-2"><button onClick={()=>setQuick(false)} className="flex-1 rounded-full py-2 bg-[var(--surface-alt)]">Отмена</button><button onClick={addQuick} disabled={pickingQuickContact} className="flex-1 rounded-full py-2 bg-[var(--moss)] text-[var(--on-accent)]" style={{opacity:pickingQuickContact?.6:1}}>Сохранить</button></div></div>}</>}</div>
  <div className="mx-5 mt-5"><div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Услуги <span className="text-xs">· можно выбрать несколько</span></div>{services.length > 6 && <div className="flex items-center gap-2 rounded-2xl px-3 py-2 mb-2.5 bg-[var(--surface)] border border-[var(--line)]"><Search size={15} className="text-[var(--ink-soft)]" /><input value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} placeholder="Поиск услуги" className="flex-1 bg-transparent outline-none text-sm" />{serviceQuery && <button onClick={() => setServiceQuery("")} aria-label="Очистить" className="p-1"><X size={14} className="text-[var(--ink-soft)]" /></button>}</div>}<div className="grid grid-cols-2 gap-2.5">{visibleServices.map(s=>{const active=selectedServices.some(x=>x.id===s.id);return <button key={s.id} onClick={()=>toggleService(s)} className="rounded-2xl p-3 text-left border" style={{background:active?`${s.color}26`:"var(--surface)",borderColor:active?s.color:"var(--line)"}}><span className="w-2.5 h-2.5 rounded-full inline-block" style={{background:s.color}}/><div className="text-sm font-medium mt-1">{s.name}</div><div className="text-xs text-[var(--ink-soft)]">{s.duration} мин · {s.price.toLocaleString("ru-RU")} ₽</div>{active&&<div className="text-[11px] mt-1 text-[var(--moss)]">Выбрано</div>}</button>})}</div>{selectedServices.length>0&&<div className="rounded-2xl p-3 mt-3 bg-[var(--surface-alt)] text-sm flex justify-between"><span>{selectedServices.length} услуг · {duration} мин</span><b>{price.toLocaleString("ru-RU")} ₽</b></div>}</div>
  <div className="mx-5 mt-5"><div className="flex items-center justify-between mb-3"><button onClick={()=>setDate(x=>addDays(x,-1))} className="p-2 rounded-full bg-[var(--surface-alt)]"><ChevronLeft size={17}/></button><div className="text-sm font-medium capitalize">{date.toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</div><button onClick={()=>setDate(x=>addDays(x,1))} className="p-2 rounded-full bg-[var(--surface-alt)]"><ChevronRight size={17}/></button></div><div ref={stripRef} className="zf-strip flex gap-1 overflow-x-auto" style={{scrollbarWidth:"none"}}>{stripDates.map(sd=>{const active=sd.toDateString()===date.toDateString();const isToday=sd.toDateString()===new Date().toDateString();const work=isWorkingDate(hours,sd);const first=sd.getDate()===1;return <button key={sd.toISOString()} data-d={fmtDate(sd)} onClick={()=>setDate(sd)} className="shrink-0 w-10 rounded-xl py-2 flex flex-col items-center gap-0.5" style={{background:active?"var(--moss)":"transparent",color:active?"var(--on-accent)":"var(--ink-soft)"}}><span className="text-[10px] uppercase">{first?sd.toLocaleDateString("ru-RU",{month:"short"}).replace(".",""):WEEKDAYS[(sd.getDay()+6)%7]}</span><span className="text-sm font-medium" style={{color:active?"inherit":isToday?"var(--clay)":"var(--ink)"}}>{sd.getDate()}</span><span className="w-1 h-1 rounded-full" style={{background:work?(active?"var(--on-accent)":"var(--moss)"):"transparent"}}/></button>})}</div><style>{`.zf-strip::-webkit-scrollbar{display:none}`}</style><div className="mt-3 flex items-center gap-2"><input type="time" value={minToTime(timeMin)} onChange={e=>setTimeMin(timeToMin(e.target.value))} className="flex-1 rounded-xl p-3 bg-[var(--surface)] border border-[var(--line)] font-mono"/><button onClick={()=>setDate(new Date())} className="rounded-xl px-3 py-3 bg-[var(--surface-alt)] text-sm">Сегодня</button></div></div>
  <div className="mx-5 mt-5">
   <div className="flex items-start justify-between gap-3 mb-3"><div><div className="text-sm font-medium text-[var(--ink-soft)]">{id?"Добавить ещё записи":"Несколько записей"}</div><div className="text-xs mt-1 text-[var(--ink-soft)]">{id?"Создать новые записи этому же клиенту на другие дни":"Один клиент и услуги, но разные даты и время"}</div></div><div className="shrink-0 rounded-full px-2.5 py-1 text-xs font-mono bg-[var(--moss-soft)] text-[var(--moss)]">{id?extraSlots.length:appointmentCount}</div></div>
   <div className="rounded-2xl p-3 bg-[var(--surface)] border border-[var(--line)]"><div className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">{id?"Текущая запись":"Основная запись"}</div><div className="text-sm font-medium mt-1 capitalize">{date.toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})} · {minToTime(timeMin)}</div></div>
   {extraSlots.length>0&&<div className="mt-2.5 space-y-2">{extraSlots.map((slot,i)=><div key={i} className="flex items-center gap-2 rounded-2xl p-2.5 bg-[var(--surface)] border border-[var(--line)]"><input type="date" value={slot.date} onChange={e=>updateExtraSlot(i,{date:e.target.value})} className="min-w-0 flex-[1.45] rounded-xl px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--line)] text-sm"/><input type="time" value={slot.time} onChange={e=>updateExtraSlot(i,{time:e.target.value})} className="min-w-0 flex-1 rounded-xl px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--line)] font-mono text-sm"/><button onClick={()=>removeExtraSlot(i)} aria-label="Удалить дополнительную запись" className="shrink-0 rounded-full p-2 bg-[var(--clay-soft)]"><X size={15}/></button></div>)}</div>}
   <button disabled={extraSlots.length>=23} onClick={addExtraSlot} className="w-full mt-3 rounded-full py-2.5 text-sm border border-dashed border-[var(--line)] bg-[var(--surface-alt)]" style={{opacity:extraSlots.length>=23?.5:1}}><Plus size={15} className="inline mr-1"/> {id?"Добавить ещё запись":"Добавить ещё дату"}</button>
   {extraSlots.length>0&&<div className="text-xs mt-2 text-[var(--ink-soft)]">{id?"Будет добавлено новых записей: "+extraSlots.length:"При сохранении будет создано записей: "+appointmentCount}</div>}
  </div>
  <div className="mx-5 mt-5"><div className="text-sm font-medium mb-2 text-[var(--ink-soft)]">Заметка</div><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Например: меньше давления…" className="w-full min-h-24 rounded-2xl p-3 bg-[var(--surface)] border border-[var(--line)] outline-none text-sm"/></div>
  {error&&<div className="mx-5 mt-3 text-sm text-[var(--clay)]">{error}</div>}
  <div className="mx-5 mt-5 flex gap-2">{id&&<button onClick={cancel} className="rounded-full px-4 py-3 bg-[var(--clay-soft)]"><X size={16}/></button>}<button disabled={saving} onClick={save} className="flex-1 rounded-full py-3 font-medium" style={{background:"var(--moss)",color:"var(--on-accent)",opacity:saving?.6:1}}>{saving?"Сохраняем…":id&&extraSlots.length?"Сохранить + добавить · "+extraSlots.length:!id&&appointmentCount>1?"Создать записи · "+appointmentCount:"Сохранить"}</button></div>
  {id&&!payment&&<div className="mx-5 mt-3 flex gap-2"><button onClick={()=>openPayment("Наличные")} className="flex-1 rounded-full py-2.5 text-sm bg-[var(--surface-alt)]"><Check size={14} className="inline mr-1"/> Оплатить наличными</button><button onClick={()=>openPayment("Карта")} className="flex-1 rounded-full py-2.5 text-sm bg-[var(--surface-alt)]">Оплатить картой</button></div>}
 </div></div>
 {payOpen&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35"><div className="w-full max-w-sm rounded-t-[28px] p-5 pb-7 bg-[var(--paper)] text-[var(--ink)] shadow-2xl"><div className="flex items-center justify-between"><div><div className="text-lg font-serif">Оплата</div><div className="text-xs mt-1 text-[var(--ink-soft)]">{client?.name}</div></div><button onClick={()=>setPayOpen(false)} className="rounded-full p-2 bg-[var(--surface-alt)]"><X size={18}/></button></div><div className="mt-4 rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)]"><div className="flex justify-between text-sm"><span>Стоимость</span><b>{price.toLocaleString("ru-RU")} ₽</b></div>{clientBalance>0&&<label className="mt-3 flex items-center justify-between gap-3 cursor-pointer"><div><div className="text-sm font-medium">Использовать баланс</div><div className="text-xs text-[var(--ink-soft)]">Доступно {clientBalance.toLocaleString("ru-RU")} ₽</div></div><input type="checkbox" checked={useBalance} onChange={e=>setUseBalance(e.target.checked)} className="w-5 h-5"/></label>}{balanceUsed>0&&<div className="mt-2 flex justify-between text-sm text-[var(--moss)]"><span>С баланса</span><span>−{balanceUsed.toLocaleString("ru-RU")} ₽</span></div>}<div className="mt-3 pt-3 border-t border-[var(--line)] flex justify-between text-sm font-medium"><span>Осталось оплатить</span><span>{amountDue.toLocaleString("ru-RU")} ₽</span></div></div>{payMethod==="Наличные"&&<div className="mt-4"><div className="text-sm font-medium mb-2">Получено наличными</div><input inputMode="numeric" value={cashReceived} onChange={e=>{setCashReceived(e.target.value.replace(/[^0-9]/g,""));setKeepChange(false)}} className="w-full rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--line)] font-mono text-lg" placeholder={String(amountDue)}/>{receivedValue<amountDue&&<div className="mt-2 text-xs text-[var(--danger)]">Не хватает {(amountDue-receivedValue).toLocaleString("ru-RU")} ₽</div>}{change>0&&<div className="mt-3 rounded-2xl p-3 bg-[var(--moss-soft)]"><div className="flex justify-between text-sm font-medium"><span>Сдача</span><span>{change.toLocaleString("ru-RU")} ₽</span></div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>setKeepChange(false)} className="rounded-xl py-2.5 text-xs border" style={{background:!keepChange?"var(--moss)":"var(--surface)",color:!keepChange?"var(--on-accent)":"var(--ink)",borderColor:!keepChange?"transparent":"var(--line)"}}>Вернуть сдачу</button><button onClick={()=>setKeepChange(true)} className="rounded-xl py-2.5 text-xs border" style={{background:keepChange?"var(--moss)":"var(--surface)",color:keepChange?"var(--on-accent)":"var(--ink)",borderColor:keepChange?"transparent":"var(--line)"}}>Оставить на балансе</button></div>{keepChange&&<div className="mt-2 text-xs text-[var(--ink-soft)]">После оплаты баланс клиента будет {(clientBalance-balanceUsed+change).toLocaleString("ru-RU")} ₽</div>}</div>}</div>}<button disabled={saving||receivedValue<amountDue} onClick={confirmPayment} className="w-full mt-5 rounded-full py-3.5 font-medium" style={{background:"var(--moss)",color:"var(--on-accent)",opacity:(saving||receivedValue<amountDue)?.55:1}}>{saving?"Проводим оплату…":`Подтвердить · ${price.toLocaleString("ru-RU")} ₽`}</button></div></div>}
 </>
}
