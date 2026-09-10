-- RITENA security hardening
-- Applied to production on 2026-09-10.

-- 1) Privileged functions are trigger/server-only APIs, not public RPC endpoints.
revoke all on function public.get_due_push_reminders() from public, anon, authenticated;
revoke all on function public.sync_client_visits(bigint) from public, anon, authenticated;
revoke all on function public.sync_client_visits_trigger() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.create_initial_support_message() from public, anon, authenticated;
revoke all on function public.touch_support_request_from_message() from public, anon, authenticated;
revoke all on function public.preserve_completed_appointment_price() from public, anon, authenticated;
revoke all on function public.set_push_subscription_updated_at() from public, anon, authenticated;

alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.preserve_completed_appointment_price() set search_path = public, pg_temp;
alter function public.sync_client_visits(bigint) set search_path = public, pg_temp;
alter function public.sync_client_visits_trigger() set search_path = public, pg_temp;
alter function public.create_initial_support_message() set search_path = public, pg_temp;
alter function public.touch_support_request_from_message() set search_path = public, pg_temp;
alter function public.set_push_subscription_updated_at() set search_path = public, pg_temp;

grant execute on function public.get_due_push_reminders() to service_role;

-- 2) Cross-tenant references are rejected by RLS.
drop policy if exists "own appointments" on public.appointments;
create policy "own appointments"
on public.appointments
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and (
    client_id is null
    or exists (
      select 1 from public.clients c
      where c.id = appointments.client_id
        and c.owner_id = (select auth.uid())
    )
  )
  and (
    service_id is null
    or exists (
      select 1 from public.services s
      where s.id = appointments.service_id
        and s.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "own appointment_services" on public.appointment_services;
create policy "own appointment_services"
on public.appointment_services
for all
to authenticated
using (
  exists (
    select 1 from public.appointments a
    where a.id = appointment_services.appointment_id
      and a.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.appointments a
    where a.id = appointment_services.appointment_id
      and a.owner_id = (select auth.uid())
  )
  and (
    service_id is null
    or exists (
      select 1 from public.services s
      where s.id = appointment_services.service_id
        and s.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "own client_payments" on public.client_payments;
create policy "own client_payments"
on public.client_payments
for all
to authenticated
using (
  exists (
    select 1 from public.clients c
    where c.id = client_payments.client_id
      and c.owner_id = (select auth.uid())
  )
  and (
    appointment_id is null
    or exists (
      select 1 from public.appointments a
      where a.id = client_payments.appointment_id
        and a.owner_id = (select auth.uid())
        and a.client_id = client_payments.client_id
    )
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.id = client_payments.client_id
      and c.owner_id = (select auth.uid())
  )
  and (
    appointment_id is null
    or exists (
      select 1 from public.appointments a
      where a.id = client_payments.appointment_id
        and a.owner_id = (select auth.uid())
        and a.client_id = client_payments.client_id
    )
  )
);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- 3) Server-only tables are inaccessible from public client roles.
revoke all on table public.push_config from anon, authenticated;
revoke all on table public.notification_log from anon, authenticated;
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

-- 4) Avatar object metadata is writable only in /<auth.uid()>/avatar.<image-ext>.
drop policy if exists "authenticated users can upload avatars" on storage.objects;
drop policy if exists "authenticated users can update avatars" on storage.objects;
drop policy if exists "avatar images are publicly accessible" on storage.objects;
drop policy if exists "users can read own avatar metadata" on storage.objects;
drop policy if exists "users can upload own avatars" on storage.objects;
drop policy if exists "users can update own avatars" on storage.objects;
drop policy if exists "users can delete own avatars" on storage.objects;

create policy "users can read own avatar metadata"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.filename(name)) in ('avatar.jpg','avatar.jpeg','avatar.png','avatar.webp','avatar.heic','avatar.heif')
);

create policy "users can upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.filename(name)) in ('avatar.jpg','avatar.jpeg','avatar.png','avatar.webp','avatar.heic','avatar.heif')
);

create policy "users can update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.filename(name)) in ('avatar.jpg','avatar.jpeg','avatar.png','avatar.webp','avatar.heic','avatar.heif')
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.filename(name)) in ('avatar.jpg','avatar.jpeg','avatar.png','avatar.webp','avatar.heic','avatar.heif')
);

create policy "users can delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.filename(name)) in ('avatar.jpg','avatar.jpeg','avatar.png','avatar.webp','avatar.heic','avatar.heif')
);
