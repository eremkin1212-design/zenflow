-- Идентификатор офлайн-записи нужен для безопасной повторной синхронизации.
-- Один и тот же локальный UUID не может создать две записи у одного владельца.

alter table public.appointments
  add column if not exists offline_id uuid;

create unique index if not exists appointments_owner_offline_id_uidx
  on public.appointments (owner_id, offline_id);
