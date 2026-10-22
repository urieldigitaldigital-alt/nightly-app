insert into public.event_categories (slug, label, sort_order) values
  ('previa', 'Previas', 10),
  ('fiesta_privada', 'Fiestas privadas', 20),
  ('fiesta_publica', 'Fiestas públicas', 30),
  ('evento', 'Eventos', 40),
  ('musica_electronica', 'Música electrónica', 50),
  ('reggaeton', 'Reggaetón', 60),
  ('musica_comercial', 'Música comercial', 70),
  ('beach_party', 'Beach parties', 80),
  ('quinta', 'Quinta', 90),
  ('bar', 'Bar', 100),
  ('boliche', 'Boliche', 110),
  ('reunion_social', 'Reuniones sociales', 120)
on conflict (slug) do nothing;
