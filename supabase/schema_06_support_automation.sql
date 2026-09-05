-- Support conversation automation
-- 1) Reopen resolved tickets when either side continues the conversation.
-- 2) Auto-resolve tickets 10 minutes after the latest support reply if the customer stays silent.

create or replace function public.touch_support_request_from_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.support_requests
  set last_message_at = new.created_at,
      updated_at = now(),
      status = case
        when new.sender_type = 'customer' and status = 'resolved' then 'in_progress'
        when new.sender_type = 'support' and status in ('new', 'resolved') then 'in_progress'
        else status
      end
  where id = new.request_id;
  return new;
end;
$$;

create or replace function public.auto_resolve_support_requests()
returns integer
language plpgsql
set search_path to 'public'
as $$
declare
  affected integer;
begin
  update public.support_requests r
  set status = 'resolved',
      updated_at = now()
  where r.status = 'in_progress'
    and exists (
      select 1
      from public.support_messages latest
      where latest.id = (
        select m.id
        from public.support_messages m
        where m.request_id = r.id
        order by m.created_at desc, m.id desc
        limit 1
      )
        and latest.sender_type = 'support'
        and latest.created_at <= now() - interval '10 minutes'
    );

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.auto_resolve_support_requests() from public, anon, authenticated;

select cron.schedule(
  'auto-resolve-support-after-10m',
  '* * * * *',
  $$select public.auto_resolve_support_requests();$$
);
