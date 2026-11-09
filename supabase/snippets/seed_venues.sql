-- Carga inicial del directorio de boliches.
--
-- Esto NO es una migración y no se aplica solo: es un archivo para pegar en
-- el editor SQL de Supabase cuando quieras cargar o actualizar la lista.
-- Está separado a propósito, porque el contenido del directorio es un dato
-- del negocio y no parte del esquema.
--
-- ANTES DE CORRERLO, LEER ESTO:
--
-- Las coordenadas de abajo son aproximadas —ubican la zona, no la puerta— y
-- las cuentas de Instagram están en NULL a propósito. Son negocios reales:
-- poner un usuario de Instagram adivinado manda gente a la cuenta de otro, y
-- una dirección inventada la manda a la casa de alguien. Completá cada
-- `instagram` y cada `address` verificándolos uno por uno, y recién ahí
-- corré el archivo.
--
-- Mientras `instagram` sea NULL, la app oculta el botón en vez de mostrar uno
-- roto, así que es seguro cargar la lista por partes.
--
-- `logo_url` apunta al bucket de Storage. Subí cada logo cuadrado (512×512
-- alcanza) y pegá acá la URL pública.

insert into public.venues (name, slug, lat, lng, city, address, instagram, logo_url, sort_order)
values
  ('Ku Pinamar',      'ku-pinamar',      -37.1002, -56.8571, 'Pinamar',      null, null, null, 10),
  ('Ufo Point',       'ufo-point',       -37.1180, -56.8490, 'Pinamar',      null, null, null, 20),
  ('Sunset Pinamar',  'sunset-pinamar',  -37.0935, -56.8604, 'Pinamar',      null, null, null, 30),
  ('Cariló Beach',    'carilo-beach',    -37.1660, -56.8930, 'Cariló',       null, null, null, 40),
  ('Pueblo Límite',   'pueblo-limite',   -37.2640, -56.9710, 'Villa Gesell', null, null, null, 50)
on conflict (slug) do update set
  -- `do update` y no `do nothing`: así volver a correr el archivo después de
  -- completar los datos actualiza lo que ya estaba cargado, en vez de
  -- ignorarlo en silencio y dejarte pensando por qué no cambió nada.
  name       = excluded.name,
  lat        = excluded.lat,
  lng        = excluded.lng,
  city       = excluded.city,
  address    = coalesce(excluded.address, public.venues.address),
  instagram  = coalesce(excluded.instagram, public.venues.instagram),
  logo_url   = coalesce(excluded.logo_url, public.venues.logo_url),
  sort_order = excluded.sort_order;
