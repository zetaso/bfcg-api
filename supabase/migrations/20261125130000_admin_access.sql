-- Admin write access.
-- The API talks to Supabase with the publishable key. For admin requests it forwards the
-- signed-in user's JWT, so these RLS policies are what actually authorise every write.

-- who is an admin: add a row here for each Supabase Auth user allowed to edit the site
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admins enable row level security;

-- a user may only see whether they themselves are an admin
drop policy if exists "Admins read own row" on public.admins;
create policy "Admins read own row"
  on public.admins for select to authenticated
  using (user_id = auth.uid());

grant select on table public.admins to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- write privileges for signed-in users; the policies below restrict them to admins
grant insert, update, delete on table
  public.services,
  public.service_highlights,
  public.testimonials,
  public.site_settings
to authenticated;

-- services: admins also need to see inactive ones
drop policy if exists "Admins read all services" on public.services;
create policy "Admins read all services"
  on public.services for select to authenticated using (public.is_admin());

drop policy if exists "Admins write services" on public.services;
create policy "Admins write services"
  on public.services for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins write service highlights" on public.service_highlights;
create policy "Admins write service highlights"
  on public.service_highlights for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read all testimonials" on public.testimonials;
create policy "Admins read all testimonials"
  on public.testimonials for select to authenticated using (public.is_admin());

drop policy if exists "Admins write testimonials" on public.testimonials;
create policy "Admins write testimonials"
  on public.testimonials for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins write site settings" on public.site_settings;
create policy "Admins write site settings"
  on public.site_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- image storage: public bucket, only admins can upload / replace / delete
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "Public read images" on storage.objects;
create policy "Public read images"
  on storage.objects for select
  using (bucket_id = 'images');

drop policy if exists "Admins upload images" on storage.objects;
create policy "Admins upload images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.is_admin());

drop policy if exists "Admins update images" on storage.objects;
create policy "Admins update images"
  on storage.objects for update to authenticated
  using (bucket_id = 'images' and public.is_admin());

drop policy if exists "Admins delete images" on storage.objects;
create policy "Admins delete images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.is_admin());
