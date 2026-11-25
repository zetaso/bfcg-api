-- editable heading for the testimonials section on the home page
insert into public.site_settings (key, section, kind, display_order, label, value) values
  ('testimonials.title',    'Testimonios', 'text',     10, 'Título de la sección', 'Lo que dicen nuestros clientes'),
  ('testimonials.subtitle', 'Testimonios', 'textarea', 20, 'Bajada (vacío = ocultar)', 'Empresas que ya confiaron en nosotros.')
on conflict (key) do nothing;
