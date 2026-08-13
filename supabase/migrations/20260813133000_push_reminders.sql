create table if not exists public.push_config (
  id boolean primary key default true check (id),
  vapid_public_key text,
  vapid_private_key text,
  vapid_subject text not null default 'mailto:admin@zenflow.app',
  cron_secret text not null default encode(gen_random_bytes(32), 'base64'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_config enable row level security;

alter table public.profiles add column if not exists notify_client boolean not null default true;
alter table public.profiles add column if not exists notify_me boolean not null default true;
alter table public.profiles add column if not exists notify_sound boolean not null default false;

create or replace function public.get_due_push_reminders()
returns table (
  appointment_id bigint,
  owner_id uuid,
  client_name text,
  service_name text,
  appointment_date date,
  start_time text
)
language sql
security definer
set search_path = ''
as $$
  select
    a.id,
    a.owner_id,
    coalesce(c.name, 'Клиент'),
    coalesce(s.name, 'Запись'),
    a.date,
    a.start_time
  from public.appointments a
  left join public.clients c on c.id = a.client_id
  left join public.services s on s.id = a.service_id
  where a.status = 'planned'
    and ((a.date + a.start_time::time)
      between (timezone('Asia/Novosibirsk', now()) + interval '29 minutes')
      and (timezone('Asia/Novosibirsk', now()) + interval '31 minutes'));
$$;
