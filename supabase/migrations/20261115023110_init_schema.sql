-- core services table
create table if not exists public.services (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  short_description text not null,
  full_description text,
  price_text text,
  duration_text text,
  image_url text,
  is_active boolean default true,
  display_order int4 default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- service highlights (deliverables, process steps, or faqs per service)
create table if not exists public.service_highlights (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references public.services(id) on delete cascade not null,
  item_type text default 'benefit', -- 'benefit', 'step', 'faq'
  title text,
  content text not null,
  display_order int4 default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- client testimonials
create table if not exists public.testimonials (
  id uuid default gen_random_uuid() primary key,
  service_id uuid references public.services(id) on delete set null, -- Optional link to a specific service
  client_name text not null,
  client_role text, -- e.g., "Dueña de Pyme", "Paciente"
  quote text not null,
  is_featured boolean default true,
  display_order int4 default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- static site content and contact info (hero, bio, whatsApp, booking status)
create table if not exists public.site_settings (
  key text primary key,
  label text not null,
  value text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- enable row level security (RLS)
alter table public.services enable row level security;
alter table public.service_highlights enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_settings enable row level security;

-- public read policies (allows anyone visiting the site to read active data)
create policy "Public read active services" 
  on public.services for select using (is_active = true);

create policy "Public read service highlights" 
  on public.service_highlights for select using (true);

create policy "Public read featured testimonials" 
  on public.testimonials for select using (is_featured = true);

create policy "Public read site settings" 
  on public.site_settings for select using (true);