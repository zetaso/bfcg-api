-- ensure all roles can use the public schema
grant usage on schema public to anon, authenticated, service_role;

-- give the backend (service_role) full permissions on all tables
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- give public visitors (anon) read-only access to active content
grant select on table public.services to anon, authenticated;
grant select on table public.service_highlights to anon, authenticated;
grant select on table public.testimonials to anon, authenticated;
grant select on table public.site_settings to anon, authenticated;