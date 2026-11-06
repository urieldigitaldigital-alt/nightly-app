-- Dos cosas para que el nombre de usuario sea una identidad de verdad y no
-- solo una etiqueta: poder saber si está libre *antes* de mandar el
-- formulario, y poder iniciar sesión con él.
--
-- La unicidad ya estaba garantizada desde 0002_profiles.sql (`username text
-- not null unique`), y el formato solo admite minúsculas, así que no hace
-- falta nada extra para evitar duplicados por mayúsculas. Lo que faltaba era
-- la consulta previa.

-- ---------------------------------------------------------------------------
-- Disponibilidad
-- ---------------------------------------------------------------------------

/**
 * ¿Está libre este nombre de usuario?
 *
 * SECURITY DEFINER para que funcione también en el registro, donde todavía no
 * hay sesión y las policies de `profiles` no dejarían leer nada.
 *
 * No filtra información: los nombres de usuario son públicos por definición
 * (aparecen en cada perfil y en cada fiesta), así que saber que uno está
 * ocupado no revela nada que no se pueda ver entrando a `/@usuario`.
 *
 * Devuelve false para los formatos inválidos en vez de tirar error, así el
 * cliente tiene una sola forma de mostrar "no se puede usar este".
 */
create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  normalized text;
begin
  normalized := lower(btrim(coalesce(p_username, '')));

  if normalized !~ '^[a-z0-9_.]{3,24}$' then
    return false;
  end if;

  -- Palabras que no puede tomar cualquiera: se usan en rutas, en soporte o
  -- para hacerse pasar por la app.
  if normalized in (
    'admin', 'administrador', 'afterdune', 'soporte', 'support', 'ayuda',
    'help', 'root', 'sistema', 'system', 'moderacion', 'moderador', 'staff',
    'oficial', 'official', 'about', 'settings', 'config', 'login', 'signup',
    'register', 'search', 'event', 'events', 'profile', 'chat', 'map', 'me'
  ) then
    return false;
  end if;

  return not exists (select 1 from public.profiles p where p.username = normalized);
end;
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Login con nombre de usuario
-- ---------------------------------------------------------------------------

/**
 * Traduce un nombre de usuario al id de la cuenta.
 *
 * Deliberadamente devuelve el id y no el email: el email es un dato privado y
 * una función que lo devolviera dejaría que cualquiera recorriera nombres de
 * usuario para juntar direcciones de correo. La Edge Function `login` es la
 * única que resuelve el email, del lado del servidor, y solo lo usa para
 * iniciar sesión — nunca lo manda de vuelta al cliente.
 *
 * Sin GRANT para anon/authenticated: solo la llama el service_role desde la
 * Edge Function.
 */
create or replace function public.user_id_for_username(p_username text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select p.id from public.profiles p where p.username = lower(btrim(p_username));
$$;

revoke execute on function public.user_id_for_username(text) from anon, authenticated;
