-- Boliches: lugares fijos con logo e Instagram, para mostrarlos en el mapa y
-- en su propia pantalla ordenados por cercanía.
--
-- Hasta ahora "boliche" era un `venue_type` de un evento, es decir un dato de
-- una fiesta puntual. Esto es otra cosa: el lugar existe aunque esa noche no
-- haya nada publicado, y es lo que alguien busca cuando llega a Pinamar y
-- quiere saber qué hay.
--
-- El directorio lo carga el equipo, no los usuarios. Es deliberado: son
-- negocios reales con su nombre y su marca, y dejar que cualquiera los dé de
-- alta abre la puerta a que se hagan pasar por uno, a que se carguen
-- direcciones falsas y a tener que moderar una cola nueva. Para Apple es
-- además la diferencia entre un directorio y contenido generado por
-- usuarios, con todo lo que la guía 1.2 exige de lo segundo.

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,

  -- Mismo esquema que `events`: las dos columnas sueltas son las que se leen
  -- y escriben, y la geografía se deriva sola para poder indexarla.
  lat double precision not null,
  lng double precision not null,
  location geography(point, 4326) generated always as (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) stored,

  logo_url text,
  -- Solo el usuario, sin arroba ni URL. `lib/instagram.ts` normaliza del
  -- lado del cliente; esto impide que entre otra cosa aunque alguien escriba
  -- directo contra la base.
  instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),

  address text,
  city text not null default 'Pinamar',
  description text,

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index venues_location_idx on public.venues using gist (location);
create index venues_city_idx on public.venues (city) where is_active;

create trigger venues_set_updated_at
  before update on public.venues
  for each row execute function public.set_updated_at();

alter table public.venues enable row level security;

-- Cualquiera, con sesión o sin ella, puede ver los activos: la pantalla de
-- boliches tiene que funcionar antes de registrarse.
create policy "los boliches activos son públicos"
  on public.venues for select
  using (is_active or public.is_admin());

create policy "solo el equipo administra boliches"
  on public.venues for all
  using (public.is_admin())
  with check (public.is_admin());

-- Los boliches cercanos, ordenados por distancia.
--
-- El cálculo va en la base y no en el cliente por la misma razón que en los
-- eventos: con el índice GiST, PostGIS descarta de entrada todo lo que está
-- fuera del radio en vez de traer la tabla entera y medir cada fila.
create or replace function public.venues_nearby(
  origin_lat double precision,
  origin_lng double precision,
  radius_km double precision default 50
)
returns table (
  id uuid,
  name text,
  slug text,
  lat double precision,
  lng double precision,
  logo_url text,
  instagram text,
  address text,
  city text,
  description text,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with origin as (
    select ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography as geo
  )
  select
    v.id, v.name, v.slug, v.lat, v.lng, v.logo_url, v.instagram,
    v.address, v.city, v.description,
    ST_Distance(v.location, origin.geo) as distance_m
  from public.venues v, origin
  where v.is_active
    and ST_DWithin(v.location, origin.geo, radius_km * 1000)
  order by v.sort_order, distance_m;
$$;

grant execute on function public.venues_nearby(double precision, double precision, double precision)
  to anon, authenticated;
