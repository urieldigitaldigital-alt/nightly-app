-- Filtrado de contenido objetable del lado del servidor (App Store Guideline 1.2).
--
-- `lib/moderation.ts` hace la misma comprobación en el cliente para dar
-- feedback inmediato, pero un cliente modificado puede saltearla: esto es lo
-- que la vuelve una garantía real. Misma lista de términos, misma
-- normalización.
--
-- Los términos viven en una tabla y no dentro de la función a propósito:
-- moderación necesita poder agregar uno a las tres de la mañana sin esperar
-- un deploy de la app.

create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- Diccionario
-- ---------------------------------------------------------------------------

create table public.moderation_terms (
  term text primary key,
  severity text not null check (severity in ('blocked', 'flagged')),
  -- Por qué está en la lista. Sirve para auditar la lista misma cuando
  -- alguien pregunta por un falso positivo.
  category text not null,
  created_at timestamptz not null default now()
);

comment on table public.moderation_terms is
  'Términos que el filtro de contenido rechaza (blocked) o marca para revisión manual (flagged). Se comparan contra texto normalizado: sin acentos, en minúscula y sin leetspeak.';

alter table public.moderation_terms enable row level security;

-- Solo lectura, y solo para admins: la lista es información de moderación, no
-- un mapa de qué escribir para esquivar el filtro.
create policy moderation_terms_admin_read on public.moderation_terms
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy moderation_terms_admin_write on public.moderation_terms
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Normalización — espejo de normalizeForModeration() en lib/moderation.ts
-- ---------------------------------------------------------------------------

create or replace function public.moderation_normalize(input text)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $$
  select regexp_replace(
           translate(
             lower(unaccent(coalesce(input, ''))),
             '0134578@$¡!',
             'oieastbasii'
           ),
           '(.)\1{2,}', '\1\1', 'g'
         );
$$;

-- Versión con toda repetición aplastada a una sola letra, para que "puuuuto"
-- y "puto" caigan en la misma forma.
create or replace function public.moderation_squash(input text)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $$
  select regexp_replace(coalesce(input, ''), '(.)\1+', '\1', 'g');
$$;

/**
 * Devuelve 'blocked', 'flagged' o null para un texto libre.
 *
 * Tres pasadas, igual que el cliente: el texto normalizado, el texto con las
 * repeticiones aplastadas, y el texto sin separadores (que atrapa
 * "p.u.t.o"). La tercera solo se aplica a términos largos porque ahí ya no
 * hay límites de palabra y uno corto daría falsos positivos.
 */
create or replace function public.moderation_severity(input text)
returns text
language plpgsql
stable
set search_path = public, pg_catalog
as $$
declare
  normalized text;
  squashed text;
  collapsed text;
  hit text;
begin
  if input is null or btrim(input) = '' then
    return null;
  end if;

  normalized := public.moderation_normalize(input);
  squashed := public.moderation_squash(normalized);
  collapsed := regexp_replace(normalized, '[\s._\-*+~''"`^|/\\()\[\]{}<>:;,!?#]+', '', 'g');

  select t.severity into hit
  from public.moderation_terms t
  where
    normalized ~ ('(^|[^a-z0-9ñ])' || t.term || '($|[^a-z0-9ñ])')
    or squashed ~ ('(^|[^a-z0-9ñ])' || public.moderation_squash(t.term) || '($|[^a-z0-9ñ])')
    or (length(replace(t.term, ' ', '')) >= 8 and position(replace(t.term, ' ', '') in collapsed) > 0)
  -- 'blocked' ordena antes que 'flagged' alfabéticamente, así que si un texto
  -- toca las dos listas gana la más severa.
  order by t.severity
  limit 1;

  return hit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reportes automáticos
-- ---------------------------------------------------------------------------

-- Un reporte generado por el filtro no tiene una persona que lo haya hecho.
alter table public.reports alter column reporter_id drop not null;

alter table public.reports
  add column if not exists source text not null default 'user'
    check (source in ('user', 'automatic'));

comment on column public.reports.source is
  'user = alguien tocó "Denunciar". automatic = lo marcó el filtro de contenido y ninguna persona lo revisó todavía.';

create or replace function public.moderation_flag(
  p_target_type text,
  p_target_id uuid,
  p_excerpt text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.reports (reporter_id, target_type, target_id, reason, details, source)
  values (
    null,
    p_target_type,
    p_target_id,
    'Marcado automáticamente por el filtro de contenido',
    left(coalesce(p_excerpt, ''), 500),
    'automatic'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- El prefijo del mensaje es un contrato con el cliente: `userFacingError()` en
-- `lib/errors.ts` lo reconoce y muestra el texto que sigue tal cual, en vez de
-- un error genérico.
create or replace function public.moderation_guard_event()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  combined text;
  severity text;
begin
  combined := concat_ws(' ', new.title, new.description, new.rules);
  severity := public.moderation_severity(combined);

  if severity = 'blocked' then
    raise exception 'CONTENT_BLOCKED: Este texto no se puede publicar: incluye lenguaje discriminatorio, sexual o violento que va contra las normas de la comunidad. Editalo para continuar.'
      using errcode = 'check_violation';
  end if;

  if severity = 'flagged' then
    perform public.moderation_flag('event', new.id, combined);
  end if;

  return new;
end;
$$;

create or replace function public.moderation_guard_message()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  severity text;
begin
  severity := public.moderation_severity(new.body);

  if severity = 'blocked' then
    raise exception 'CONTENT_BLOCKED: Este mensaje no se puede enviar: incluye lenguaje discriminatorio, sexual o violento que va contra las normas de la comunidad.'
      using errcode = 'check_violation';
  end if;

  if severity = 'flagged' then
    perform public.moderation_flag('message', new.id, new.body);
  end if;

  return new;
end;
$$;

create or replace function public.moderation_guard_profile()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  combined text;
  severity text;
begin
  combined := concat_ws(' ', new.username, new.display_name, new.bio);
  severity := public.moderation_severity(combined);

  if severity = 'blocked' then
    raise exception 'CONTENT_BLOCKED: Ese nombre o biografía no se puede usar: incluye lenguaje discriminatorio, sexual o violento que va contra las normas de la comunidad.'
      using errcode = 'check_violation';
  end if;

  if severity = 'flagged' then
    perform public.moderation_flag('profile', new.id, combined);
  end if;

  return new;
end;
$$;

-- AFTER y no BEFORE para eventos y mensajes: `moderation_flag` necesita que
-- la fila ya exista para poder apuntarle el reporte. El `raise` en el camino
-- de 'blocked' aborta la transacción igual, así que la fila rechazada nunca
-- llega a persistirse.
create trigger moderation_guard_event_trg
  after insert or update of title, description, rules on public.events
  for each row execute function public.moderation_guard_event();

create trigger moderation_guard_message_trg
  after insert on public.messages
  for each row execute function public.moderation_guard_message();

create trigger moderation_guard_profile_trg
  after insert or update of username, display_name, bio on public.profiles
  for each row execute function public.moderation_guard_profile();

-- ---------------------------------------------------------------------------
-- Semilla del diccionario
-- ---------------------------------------------------------------------------

insert into public.moderation_terms (term, severity, category) values
  -- Discriminación: origen, etnia, religión
  ('negro de mierda', 'blocked', 'discriminacion'),
  ('negros de mierda', 'blocked', 'discriminacion'),
  ('sudaca', 'blocked', 'discriminacion'),
  ('nigger', 'blocked', 'discriminacion'),
  ('nigga', 'blocked', 'discriminacion'),
  ('negrata', 'blocked', 'discriminacion'),
  ('spic', 'blocked', 'discriminacion'),
  ('kike', 'blocked', 'discriminacion'),
  ('chink', 'blocked', 'discriminacion'),
  ('paki de mierda', 'blocked', 'discriminacion'),
  ('bolita de mierda', 'blocked', 'discriminacion'),
  ('paragua de mierda', 'blocked', 'discriminacion'),
  ('peruca de mierda', 'blocked', 'discriminacion'),
  ('judio de mierda', 'blocked', 'discriminacion'),
  ('judios de mierda', 'blocked', 'discriminacion'),
  ('heil hitler', 'blocked', 'odio'),
  ('sieg heil', 'blocked', 'odio'),
  ('white power', 'blocked', 'odio'),
  ('muerte a los judios', 'blocked', 'odio'),
  ('camara de gas', 'blocked', 'odio'),
  -- Discriminación: orientación sexual e identidad de género
  ('puto de mierda', 'blocked', 'discriminacion'),
  ('putos de mierda', 'blocked', 'discriminacion'),
  ('trava de mierda', 'blocked', 'discriminacion'),
  ('travesti de mierda', 'blocked', 'discriminacion'),
  ('faggot', 'blocked', 'discriminacion'),
  ('tranny', 'blocked', 'discriminacion'),
  ('maricon de mierda', 'blocked', 'discriminacion'),
  ('maricones de mierda', 'blocked', 'discriminacion'),
  ('muerte a los putos', 'blocked', 'odio'),
  ('mogolico de mierda', 'blocked', 'discriminacion'),
  ('retrasado mental de mierda', 'blocked', 'discriminacion'),
  -- Menores
  ('pornografia infantil', 'blocked', 'menores'),
  ('porno infantil', 'blocked', 'menores'),
  ('pedofilia', 'blocked', 'menores'),
  ('pedofilo', 'blocked', 'menores'),
  ('child porn', 'blocked', 'menores'),
  ('childporn', 'blocked', 'menores'),
  ('cp infantil', 'blocked', 'menores'),
  ('menores desnudos', 'blocked', 'menores'),
  ('nena virgen', 'blocked', 'menores'),
  ('nene virgen', 'blocked', 'menores'),
  ('loli hentai', 'blocked', 'menores'),
  ('jailbait', 'blocked', 'menores'),
  -- Explotación sexual
  ('sexo por plata', 'blocked', 'explotacion'),
  ('sexo por dinero', 'blocked', 'explotacion'),
  ('trabajo sexual pago', 'blocked', 'explotacion'),
  ('escort disponible', 'blocked', 'explotacion'),
  ('escorts disponibles', 'blocked', 'explotacion'),
  ('prostitucion', 'blocked', 'explotacion'),
  ('prostituta disponible', 'blocked', 'explotacion'),
  ('trata de personas', 'blocked', 'explotacion'),
  -- Venta de drogas
  ('vendo cocaina', 'blocked', 'drogas'),
  ('venta de cocaina', 'blocked', 'drogas'),
  ('vendo merca', 'blocked', 'drogas'),
  ('venta de merca', 'blocked', 'drogas'),
  ('vendo falopa', 'blocked', 'drogas'),
  ('vendo pastillas', 'blocked', 'drogas'),
  ('vendo extasis', 'blocked', 'drogas'),
  ('vendo mdma', 'blocked', 'drogas'),
  ('vendo lsd', 'blocked', 'drogas'),
  ('vendo tusi', 'blocked', 'drogas'),
  ('vendo porro', 'blocked', 'drogas'),
  ('vendo marihuana', 'blocked', 'drogas'),
  ('venta de marihuana', 'blocked', 'drogas'),
  ('dealer disponible', 'blocked', 'drogas'),
  ('paso merca', 'blocked', 'drogas'),
  ('consigo merca', 'blocked', 'drogas'),
  ('consigo falopa', 'blocked', 'drogas'),
  -- Violencia y amenazas
  ('te voy a matar', 'blocked', 'violencia'),
  ('los voy a matar', 'blocked', 'violencia'),
  ('te voy a violar', 'blocked', 'violencia'),
  ('la voy a violar', 'blocked', 'violencia'),
  ('lo voy a violar', 'blocked', 'violencia'),
  ('te voy a cagar a tiros', 'blocked', 'violencia'),
  ('voy a tirar un tiro', 'blocked', 'violencia'),
  ('bomba en el lugar', 'blocked', 'violencia'),
  ('poner una bomba', 'blocked', 'violencia'),
  ('tiroteo masivo', 'blocked', 'violencia'),
  ('i will kill you', 'blocked', 'violencia'),
  ('kill yourself', 'blocked', 'autolesion'),
  ('matate', 'blocked', 'autolesion'),
  ('andate a matar', 'blocked', 'autolesion'),
  ('suicidate', 'blocked', 'autolesion'),
  -- Para revisión manual
  ('cocaina', 'flagged', 'drogas'),
  ('merca', 'flagged', 'drogas'),
  ('falopa', 'flagged', 'drogas'),
  ('tusi', 'flagged', 'drogas'),
  ('ketamina', 'flagged', 'drogas'),
  ('mdma', 'flagged', 'drogas'),
  ('extasis', 'flagged', 'drogas'),
  ('lsd', 'flagged', 'drogas'),
  ('crack', 'flagged', 'drogas'),
  ('heroina', 'flagged', 'drogas'),
  ('metanfetamina', 'flagged', 'drogas'),
  ('orgia', 'flagged', 'sexual'),
  ('sexo grupal', 'flagged', 'sexual'),
  ('swinger', 'flagged', 'sexual'),
  ('desnudos', 'flagged', 'sexual'),
  ('desnudas', 'flagged', 'sexual'),
  ('striptease', 'flagged', 'sexual'),
  ('solo mujeres lindas', 'flagged', 'discriminacion'),
  ('solo chicas lindas', 'flagged', 'discriminacion'),
  ('sin ropa', 'flagged', 'sexual'),
  ('arma', 'flagged', 'violencia'),
  ('armas', 'flagged', 'violencia'),
  ('cuchillo', 'flagged', 'violencia'),
  ('pelea arreglada', 'flagged', 'violencia')
on conflict (term) do nothing;
