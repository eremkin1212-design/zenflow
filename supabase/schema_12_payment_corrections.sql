-- Correct paid appointment amount or switch it to/from a certificate.
-- Includes strict ownership checks and rejects payments involving client balance.
CREATE OR REPLACE FUNCTION public.correct_appointment_payment(p_appointment_id bigint, p_service_total integer, p_method text, p_certificate_number text DEFAULT NULL::text, p_topup_method text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_appointment public.appointments%rowtype;
 v_payment public.client_payments%rowtype;
 v_redemption public.certificate_redemptions%rowtype;
 v_certificate public.certificates%rowtype;
 v_result jsonb;
 v_count integer;
 v_one_service bigint;
begin
 if (select auth.uid()) is null then raise exception 'Необходим вход в аккаунт'; end if;
 if p_service_total is null or p_service_total < 0 or p_service_total > 10000000 then raise exception 'Укажи корректную сумму оплаты'; end if;
 if p_method not in ('Наличные','Карта','Сертификат') then raise exception 'Выбери способ оплаты'; end if;
 select * into v_appointment from public.appointments
  where id=p_appointment_id and owner_id=(select auth.uid()) for update;
 if not found then raise exception 'Запись не найдена'; end if;
 if v_appointment.status <> 'done' then raise exception 'Можно исправить только завершённую запись'; end if;
 select count(*) into v_count from public.client_payments where appointment_id=p_appointment_id;
 if v_count <> 1 then raise exception 'У этой записи несколько платежей или платёж отсутствует. Изменение требует ручной проверки'; end if;
 select * into v_payment from public.client_payments
  where appointment_id=p_appointment_id for update;
 if exists(select 1 from public.client_balance_transactions where appointment_id=p_appointment_id) then
  raise exception 'В оплате использовался баланс клиента. Для безопасной корректировки обратитесь в поддержку';
 end if;
 select * into v_redemption from public.certificate_redemptions
  where appointment_id=p_appointment_id for update;
 if found then
  select * into v_certificate from public.certificates
   where id=v_redemption.certificate_id and owner_id=(select auth.uid()) for update;
  if not found then raise exception 'Исходный сертификат не найден'; end if;
  if v_certificate.status='cancelled' then raise exception 'Исходный сертификат отменён. Обратитесь в поддержку'; end if;
  update public.certificates set
   remaining_amount=case when v_certificate.kind='amount' then remaining_amount+v_redemption.amount_used else remaining_amount end,
   remaining_sessions=remaining_sessions+v_redemption.sessions_used,
   status='active',updated_at=now()
  where id=v_certificate.id;
  delete from public.certificate_redemptions where id=v_redemption.id;
  if not found then raise exception 'Не получилось восстановить остаток сертификата'; end if;
 elsif v_payment.method not in ('Наличные','Карта') then
  raise exception 'Сложная оплата требует ручной проверки (баланс или смешанный платёж)';
 end if;
 if p_method='Сертификат' then
  if nullif(trim(p_certificate_number),'') is null then raise exception 'Введи номер сертификата'; end if;
  delete from public.client_payments where id=v_payment.id;
  if not found then raise exception 'Не удалось изменить исходный платёж'; end if;
  v_result:=public.redeem_certificate_for_appointment(
   upper(trim(p_certificate_number)),p_appointment_id,p_service_total,p_topup_method
  );
  if coalesce((v_result->>'already_paid')::boolean,false) then
    raise exception 'Запись уже оплачена: сертификат не списан';
  end if;
  update public.client_payments set date=v_payment.date where appointment_id=p_appointment_id;
  if v_payment.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
   update public.certificate_redemptions set redemption_date=v_payment.date::date
    where appointment_id=p_appointment_id;
  end if;
 else
  update public.client_payments set amount=p_service_total,method=p_method
   where id=v_payment.id;
  if not found then raise exception 'Не удалось обновить платёж'; end if;
  v_result:=jsonb_build_object('method',p_method,'amount',p_service_total);
 end if;
 update public.appointments set price=p_service_total,full_price=p_service_total
  where id=p_appointment_id;
 select count(*), max(id) into v_count,v_one_service
  from public.appointment_services where appointment_id=p_appointment_id;
 if v_count=1 then
  update public.appointment_services set price=p_service_total where id=v_one_service;
 end if;
 return v_result;
end;
$function$;

revoke all on function public.correct_appointment_payment(bigint,integer,text,text,text) from public, anon;
grant execute on function public.correct_appointment_payment(bigint,integer,text,text,text) to authenticated;
