-- ZenFlow: рабочее время с перерывами (в профиле) + фото профиля
-- Выполнить в Supabase → SQL Editor → Run

alter table profiles add column if not exists working_hours jsonb default '[
  {"key":"mon","label":"Понедельник","on":true,"start":"09:00","end":"20:00","breakStart":"13:00","breakEnd":"14:00"},
  {"key":"tue","label":"Вторник","on":true,"start":"09:00","end":"20:00","breakStart":"13:00","breakEnd":"14:00"},
  {"key":"wed","label":"Среда","on":true,"start":"09:00","end":"20:00","breakStart":"13:00","breakEnd":"14:00"},
  {"key":"thu","label":"Четверг","on":true,"start":"09:00","end":"20:00","breakStart":"13:00","breakEnd":"14:00"},
  {"key":"fri","label":"Пятница","on":true,"start":"09:00","end":"20:00","breakStart":"13:00","breakEnd":"14:00"},
  {"key":"sat","label":"Суббота","on":true,"start":"10:00","end":"16:00","breakStart":null,"breakEnd":null},
  {"key":"sun","label":"Воскресенье","on":false,"start":"10:00","end":"16:00","breakStart":null,"breakEnd":null}
]'::jsonb;

alter table profiles add column if not exists avatar_url text;

-- Хранилище для фото профиля
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar images are publicly accessible" on storage.objects;
create policy "avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "authenticated users can upload avatars" on storage.objects;
create policy "authenticated users can upload avatars"
  on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

drop policy if exists "authenticated users can update avatars" on storage.objects;
create policy "authenticated users can update avatars"
  on storage.objects for update using (bucket_id = 'avatars' and auth.uid() is not null);
