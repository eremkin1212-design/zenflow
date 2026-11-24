-- RITENA: editable completed payments with transactional balance recalculation.
-- The correction uses SECURITY DEFINER with explicit auth.uid() ownership checks,
-- and EXECUTE is granted only to authenticated users.
alter table public.client_payments
 add column if not exists balance_used integer not null default 0,
 add column if not exists balance_deposit integer not null default 0;
do $$
begin
 if not exists(select 1 from pg_constraint where conname='client_payments_balance_used_nonnegative') then
  alter table public.client_payments add constraint client_payments_balance_used_nonnegative check(balance_used>=0);
 end if;
 if not exists(select 1 from pg_constraint where conname='client_payments_balance_deposit_nonnegative') then
  alter table public.client_payments add constraint client_payments_balance_deposit_nonnegative check(balance_deposit>=0);
 end if;
end $$;
with allocations as (
 select p.id,
   coalesce(sum(case when t.kind='use' then -t.amount else 0 end),0)::integer used,
   coalesce(sum(case when t.kind='deposit' then t.amount else 0 end),0)::integer deposited
 from public.client_payments p
 left join public.client_balance_transactions t on t.appointment_id=p.appointment_id
 group by p.id
)
update public.client_payments p
 set balance_used=a.used,balance_deposit=a.deposited
 from allocations a where p.id=a.id
 and (p.balance_used<>a.used or p.balance_deposit<>a.deposited);

drop function if exists public.correct_appointment_payment(bigint,integer,text,text,text);
CREATE OR REPLACE FUNCTION public.correct_appointment_payment(p_appointment_id bigint, p_service_total integer, p_method text, p_certificate_number text DEFAULT NULL::text, p_topup_method text DEFAULT NULL::text, p_balance_used integer DEFAULT 0, p_balance_deposit integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_owner uuid := (select auth.uid());
 v_a public.appointments%rowtype;
 v_p public.client_payments%rowtype;
 v_r public.certificate_redemptions%rowtype;
 v_c public.certificates%rowtype;
 v_result jsonb;
 v_count integer;
 v_service_row bigint;
 v_balance integer;
 v_available integer;
 v_old_net integer;
 v_new_net integer;
 v_delta integer;
 v_due integer;
 v_used integer;
 v_deposit integer;
 v_method_label text;
begin
 if v_owner is null then raise exception 'Необходимо войти в аккаунт'; end if;
 if p_service_total is null or p_service_total < 0 or p_service_total > 10000000 then
   raise exception 'Укажи корректную сумму оплаты';
 end if;
 if p_method is null or p_method not in ('Наличные','Карта','Сертификат') then
   raise exception 'Выбери способ оплаты';
 end if;
 if p_balance_used is null or p_balance_used < 0 or p_balance_used > 10000000
    or p_balance_deposit is null or p_balance_deposit < 0 or p_balance_deposit > 10000000 then
   raise exception 'Укажи корректную сумму списания и пополнения баланса';
 end if;
 select * into v_a from public.appointments
  where id=p_appointment_id and owner_id=v_owner for update;
 if not found then raise exception 'Запись не найдена'; end if;
 if v_a.status <> 'done' then raise exception 'Можно изменить оплату только завершённой записи'; end if;
 perform 1 from public.clients where id=v_a.client_id and owner_id=v_owner for update;
 if not found then raise exception 'Клиент записи не найден'; end if;
 select count(*) into v_count from public.client_payments
  where appointment_id=p_appointment_id;
 if v_count <> 1 then raise exception 'Для этой записи обнаружено несколько платежей. Проверь историю оплат'; end if;
 select * into v_p from public.client_payments
  where appointment_id=p_appointment_id and client_id=v_a.client_id for update;
 if not found then raise exception 'Платёж не принадлежит клиенту записи'; end if;
 select count(*) into v_count from public.certificate_redemptions
  where appointment_id=p_appointment_id;
 if v_count > 1 then raise exception 'У записи несколько списаний сертификатов. Проверь историю'; end if;
 select * into v_r from public.certificate_redemptions
  where appointment_id=p_appointment_id and owner_id=v_owner for update;
 if v_count=1 and not found then raise exception 'Списание сертификата не принадлежит текущему владельцу'; end if;

 -- Existing balance allocations are stored on the payment.
 -- Every correction posts ONLY the net difference as an audit transaction.
 v_used:=case when p_method='Сертификат' then 0 else p_balance_used end;
 v_deposit:=case when p_method='Сертификат' then 0 else p_balance_deposit end;
 if p_method='Сертификат' and (p_balance_used<>0 or p_balance_deposit<>0) then
   raise exception 'Сертификат и внутренний баланс нельзя списать одновременно';
 end if;
 if p_method <> 'Сертификат' then
   if v_used>p_service_total then raise exception 'Нельзя списать с баланса больше стоимости сеанса'; end if;
   if v_deposit>0 and p_method<>'Наличные' then
     raise exception 'Оставить сдачу на балансе можно только при оплате наличными';
   end if;
 else
   if nullif(trim(p_certificate_number),'') is null then raise exception 'Введи номер сертификата или абонемента'; end if;
 end if;

 select coalesce(sum(amount),0)::integer into v_balance
 from public.client_balance_transactions
 where owner_id=v_owner and client_id=v_a.client_id;
 v_available:=v_balance+v_p.balance_used-v_p.balance_deposit;
 -- A correction is valid if the resulting balance never becomes negative.
 -- This also allows unchanged allocations when an earlier deposit was spent later.
 if v_balance+v_p.balance_used-v_p.balance_deposit-v_used+v_deposit<0 then
   raise exception 'Недостаточно средств для перерасчёта баланса. Уменьши списание или верни часть сдачи на баланс';
 end if;
 v_old_net:=v_p.balance_deposit-v_p.balance_used;
 v_new_net:=v_deposit-v_used;
 v_delta:=v_new_net-v_old_net;
 if v_balance+v_delta<0 then
   raise exception 'Недостаточно средств для корректировки остатка клиента';
 end if;

 -- Restore any old certificate redemption; its history row is then replaced
 -- in the SAME database transaction, so failure rolls everything back.
 if v_count=1 then
   select * into v_c from public.certificates
    where id=v_r.certificate_id and owner_id=v_owner for update;
   if not found then raise exception 'Исходный сертификат не найден'; end if;
   if v_c.status='cancelled' then
     raise exception 'Ранее использованный сертификат отменён. Сначала восстанови сертификат';
   end if;
   if (v_c.kind='amount' and v_c.remaining_amount+v_r.amount_used>v_c.initial_amount)
     or (v_c.kind<>'amount' and v_c.remaining_sessions+v_r.sessions_used>v_c.initial_sessions) then
     raise exception 'Невозможно восстановить сертификат: остаток превышает исходный';
   end if;
   update public.certificates
   set remaining_amount=case when v_c.kind='amount' then remaining_amount+v_r.amount_used else remaining_amount end,
       remaining_sessions=remaining_sessions+v_r.sessions_used,
       status='active', updated_at=now()
   where id=v_c.id;
   delete from public.certificate_redemptions where id=v_r.id;
   if not found then raise exception 'Не удалось вернуть списание сертификата'; end if;
 elsif v_p.method not in ('Наличные','Карта') and v_p.method not like 'Баланс %' then
   raise exception 'Не удалось определить предыдущий способ оплаты. Проверь историю';
 end if;

 if v_delta<>0 then
   insert into public.client_balance_transactions
    (owner_id,client_id,appointment_id,amount,kind,method,note)
   values(v_owner,v_a.client_id,p_appointment_id,v_delta,'adjustment',
     'Корректировка оплаты',
     format('Изменение оплаты: с баланса %s → %s ₽, сдача %s → %s ₽',
       v_p.balance_used,v_used,v_p.balance_deposit,v_deposit));
 end if;

 if p_method='Сертификат' then
   delete from public.client_payments where id=v_p.id;
   if not found then raise exception 'Не удалось заменить старую оплату'; end if;
   v_result:=public.redeem_certificate_for_appointment(
     upper(trim(p_certificate_number)),p_appointment_id,p_service_total,p_topup_method);
   if coalesce((v_result->>'already_paid')::boolean,false) then
     raise exception 'Запись уже оплачена: сертификат не списан';
   end if;
   update public.client_payments
      set date=v_p.date, balance_used=0, balance_deposit=0
      where appointment_id=p_appointment_id;
   if v_p.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
     update public.certificate_redemptions set redemption_date=v_p.date::date
      where appointment_id=p_appointment_id;
   end if;
 else
   v_due:=p_service_total-v_used;
   v_method_label:=case
     when v_used>0 and v_due>0 then format('Баланс %s ₽ + %s %s ₽',v_used,p_method,v_due)
     when v_used>0 then format('Баланс %s ₽',v_used)
     else p_method
   end;
   update public.client_payments
   set amount=p_service_total,method=v_method_label,
       balance_used=v_used,balance_deposit=v_deposit
   where id=v_p.id;
   if not found then raise exception 'Не удалось обновить оплату'; end if;
   v_result:=jsonb_build_object(
      'amount',p_service_total,'method',v_method_label,
      'balance_used',v_used,'balance_deposit',v_deposit,'balance_after',v_balance+v_delta);
 end if;
 update public.appointments set price=p_service_total,full_price=p_service_total
  where id=p_appointment_id;
 select count(*),max(id) into v_count,v_service_row
  from public.appointment_services where appointment_id=p_appointment_id;
 if v_count=1 then
   update public.appointment_services set price=p_service_total where id=v_service_row;
 end if;
 return v_result;
end;
$function$;
revoke all on function public.correct_appointment_payment(bigint,integer,text,text,text,integer,integer) from public,anon;
grant execute on function public.correct_appointment_payment(bigint,integer,text,text,text,integer,integer) to authenticated;

CREATE OR REPLACE FUNCTION public.complete_appointment_with_balance(p_appointment_id bigint, p_service_total integer, p_method text, p_received integer DEFAULT NULL::integer, p_use_balance boolean DEFAULT true, p_keep_change boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_appointment public.appointments%rowtype;
  v_balance integer := 0;
  v_used integer := 0;
  v_due integer := 0;
  v_received integer := 0;
  v_change integer := 0;
  v_deposit integer := 0;
  v_method_label text;
  v_existing_payment_id bigint;
  v_today text := to_char(timezone('Asia/Novosibirsk', now()), 'YYYY-MM-DD');
begin
  if p_service_total is null or p_service_total < 0 then
    raise exception 'Некорректная сумма услуги';
  end if;

  select a.* into v_appointment
  from public.appointments a
  where a.id = p_appointment_id
  for update;

  if not found then
    raise exception 'Запись не найдена';
  end if;

  perform 1 from public.clients c where c.id = v_appointment.client_id for update;

  select cp.id into v_existing_payment_id
  from public.client_payments cp
  where cp.appointment_id = p_appointment_id
  order by cp.id desc
  limit 1;

  select coalesce(sum(t.amount), 0)::integer into v_balance
  from public.client_balance_transactions t
  where t.client_id = v_appointment.client_id;

  if v_existing_payment_id is not null then
    return jsonb_build_object(
      'already_paid', true,
      'balance_before', v_balance,
      'used_balance', 0,
      'amount_due', 0,
      'received', 0,
      'change', 0,
      'deposited', 0,
      'balance_after', v_balance
    );
  end if;

  if p_use_balance then
    v_used := least(greatest(v_balance, 0), p_service_total);
  end if;
  v_due := p_service_total - v_used;

  if p_method = 'Наличные' then
    v_received := coalesce(p_received, v_due);
    if v_received < v_due then
      raise exception 'Недостаточно наличных: нужно %', v_due;
    end if;
    v_change := greatest(v_received - v_due, 0);
    if p_keep_change then v_deposit := v_change; end if;
  else
    v_received := v_due;
    v_change := 0;
    v_deposit := 0;
  end if;

  update public.appointments
  set status = 'done',
      price = p_service_total,
      full_price = p_service_total
  where id = p_appointment_id;

  if v_used > 0 then
    insert into public.client_balance_transactions(owner_id, client_id, appointment_id, amount, kind, method, note)
    values ((select auth.uid()), v_appointment.client_id, p_appointment_id, -v_used, 'use', 'Баланс', 'Списано в оплату сеанса');
  end if;

  if v_deposit > 0 then
    insert into public.client_balance_transactions(owner_id, client_id, appointment_id, amount, kind, method, note)
    values ((select auth.uid()), v_appointment.client_id, p_appointment_id, v_deposit, 'deposit', p_method, 'Сдача оставлена на следующий сеанс');
  end if;

  v_method_label := case
    when v_used > 0 and v_due > 0 then format('Баланс %s ₽ + %s %s ₽', v_used, p_method, v_due)
    when v_used > 0 and v_due = 0 then format('Баланс %s ₽', v_used)
    else p_method
  end;

  insert into public.client_payments(client_id, appointment_id, amount, discount_percent, method, date, balance_used, balance_deposit)
  values (v_appointment.client_id, p_appointment_id, p_service_total, 0, v_method_label, v_today, v_used, v_deposit);

  return jsonb_build_object(
    'already_paid', false,
    'balance_before', v_balance,
    'used_balance', v_used,
    'amount_due', v_due,
    'received', v_received,
    'change', v_change,
    'deposited', v_deposit,
    'balance_after', v_balance - v_used + v_deposit
  );
end;
$function$;
