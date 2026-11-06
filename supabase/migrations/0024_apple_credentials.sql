-- Refresh tokens de Sign in with Apple, para poder revocar el permiso del
-- lado de Apple cuando alguien elimina su cuenta (requisito de Apple desde
-- junio de 2022, ligado a la Guideline 5.1.1(v)).
--
-- Apple entrega el refresh token una sola vez, al canjear el
-- `authorizationCode` del login, y nunca más. Supabase no lo guarda por su
-- cuenta en el flujo nativo de id_token, así que lo guardamos acá nosotros.

create table public.apple_credentials (
  -- Un usuario, un token: cada login nuevo pisa el anterior.
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.apple_credentials is
  'Refresh token de Apple por usuario. Solo lo leen las Edge Functions con service_role; ningún cliente tiene acceso.';

alter table public.apple_credentials enable row level security;

-- Sin ninguna policy a propósito: con RLS activo y cero policies, la tabla
-- es invisible para cualquier rol que pase por RLS (anon, authenticated).
-- Solo el service_role, que la saltea por definición, puede leerla y
-- escribirla — y ese vive únicamente dentro de las Edge Functions. Un
-- refresh token de Apple es una credencial: el cliente no tiene por qué
-- poder leerla ni siquiera la suya.
revoke all on public.apple_credentials from anon, authenticated;
