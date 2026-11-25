-- Editable site text lives in site_settings.
-- section / kind / display_order describe each row so an admin form can be
-- generated from the table itself (no code changes to expose a new field).

alter table public.site_settings
  add column if not exists section text not null default 'general',
  add column if not exists kind text not null default 'text'
    check (kind in ('text', 'textarea', 'markdown', 'url', 'email')),
  add column if not exists display_order int4 not null default 0;

-- keep updated_at current on every edit
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- seed current site content; existing rows (already edited) are left alone
insert into public.site_settings (key, section, kind, display_order, label, value) values
  ('hero.title',            'Portada',   'text',     10, 'Título principal',            'Asesórate con expertos'),
  ('hero.subtitle',         'Portada',   'textarea', 20, 'Bajada',                      'Con experiencia trazamos el camino, con visión proyectamos el futuro y con estrategia impulsamos el éxito de tu empresa.'),
  ('hero.cta_label',        'Portada',   'text',     30, 'Texto del botón',             'Contáctanos'),
  ('hero.standards_label',  'Portada',   'text',     40, 'Título de logos',             'Aplicamos estándares'),

  ('about.title',           'Nosotros',  'text',     10, 'Título de la sección',        '¿Quienes somos?'),
  ('about.years',           'Nosotros',  'text',     20, 'Años de experiencia (número)', '16'),
  ('about.years_label',     'Nosotros',  'text',     30, 'Texto bajo el número',        'AÑOS'),
  ('about.body',            'Nosotros',  'markdown', 40, 'Texto (usa **negrita** y líneas en blanco para separar párrafos)',
     E'Somos una empresa de consultoría y capacitación con más de **16 años de experiencia**, brindamos asesorías, consultorías y capacitaciones personalizadas, diseñadas a medida de las necesidades de cada organización.\n\nNos involucramos directamente con los colaboradores, gestionando las acciones necesarias para promover la mejora continua y fortalecer la estructura organizacional.'),
  ('about.cta_label',       'Nosotros',  'text',     50, 'Texto del botón',             'Conoce nuestros servicios'),

  ('services.title',        'Servicios', 'text',     10, 'Título de la sección',        'Nuestros Servicios'),
  ('services.subtitle',     'Servicios', 'textarea', 20, 'Bajada',                      'Asesoría especializada adaptada a las necesidades de tu organización.'),
  ('services.cta_label',    'Servicios', 'text',     30, 'Texto del botón en cada servicio', 'Ver más'),

  ('contact.title',         'Contacto',  'text',     10, 'Título de la sección',        'Contáctanos'),
  ('contact.form_title',    'Contacto',  'text',     20, 'Título del formulario',       'Escríbenos'),
  ('contact.submit_label',  'Contacto',  'text',     30, 'Texto del botón enviar',      'Enviar'),
  ('contact.channels_title','Contacto',  'text',     40, 'Título de canales',           'Canales'),
  ('contact.email',         'Contacto',  'email',    50, 'Correo (vacío = ocultar)',    'contacto@bfcg.cl'),
  ('contact.whatsapp_url',  'Contacto',  'url',      60, 'Enlace WhatsApp (vacío = ocultar)',  'https://wa.me/56944123994'),
  ('contact.linkedin_url',  'Contacto',  'url',      70, 'Enlace LinkedIn (vacío = ocultar)',  'https://www.linkedin.com/company/bfcg-consultoria-e-ingenieria-spa'),
  ('contact.instagram_url', 'Contacto',  'url',      80, 'Enlace Instagram (vacío = ocultar)', 'https://www.instagram.com/bfcgasesoria/'),

  ('footer.company_name',   'Pie de página', 'text', 10, 'Nombre de la empresa',        'BFCG Consultoría e Ingeniería SPA'),
  ('footer.rights',         'Pie de página', 'text', 20, 'Texto de derechos',           'Todos los derechos reservados.')
on conflict (key) do nothing;
