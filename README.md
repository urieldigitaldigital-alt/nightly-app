# NIGHTLY

Descubrí previas, fiestas y eventos cerca tuyo. Pedí acceso, chateá con el organizador y llegá sin perderte.

App móvil (Expo Router + TypeScript) para el lanzamiento en Pinamar, Cariló, Ostende, Valeria del Mar, Villa Gesell y el resto de la Costa Atlántica, con arquitectura pensada para escalar a cualquier ciudad.

## Stack

- **App:** React Native + Expo (SDK 58), TypeScript, Expo Router, React Query, Zustand, React Native Reanimated.
- **Backend:** Supabase (Postgres + PostGIS, Auth, Realtime, Storage, Edge Functions).
- **Mapas / geolocalización:** `react-native-maps` (Google Maps Platform), `expo-location`, Google Directions API opcional.
- **Notificaciones:** Expo Notifications + tabla `device_tokens`.

## Estado real del proyecto — qué funciona hoy

Todo lo que sigue está implementado con lógica real (no hay pantallas decorativas ni botones que no hagan nada) y **ya se verificó contra un Supabase local real** (Docker + `supabase start`):

- Las 13 migraciones corrieron sin errores sobre Postgres real (PostGIS, RLS, triggers, funciones).
- Los 8 tests pgTAP (`supabase/tests/critical_flows.test.sql`) pasan: cupo sin sobreventa bajo concurrencia, autorización solo-organizador, y privacidad de dirección exacta — ejecutable con `npx supabase test db`.
- Registro → creación automática de perfil → onboarding → Descubrir con categorías reales, probado de punta a punta en el navegador.
- Se encontró y corrigió un bug real durante esta verificación: faltaba la ruta `/event/create/index.tsx`, así que "Publicar fiesta" no navegaba a ningún lado.

### Implementado y conectado a Supabase
- Autenticación completa (registro, login, recuperar contraseña, onboarding con verificación de mayoría de edad por fecha de nacimiento, intereses musicales, permisos de ubicación).
- Descubrimiento por radio real con PostGIS (`events_within_radius`), filtros por categoría, gratis/pago, orden por distancia/fecha/popularidad, paginación.
- Mapa interactivo con clustering básico, mismo backend que el feed.
- Publicación de fiestas en 4 pasos, con dirección exacta separada de la ubicación pública (jitter server-side para domicilios privados).
- Sistema de solicitudes con aceptación/rechazo **atómico** (lock a nivel de fila en Postgres — dos aceptaciones simultáneas nunca pueden superar el cupo).
- Chat 1:1 y grupal en tiempo real (Supabase Realtime), con bloqueo/denuncia.
- Guardados, Mis planes, Mis fiestas, Amigos (seguir/seguidores/buscar), Notificaciones en tiempo real, Tendencias, Búsqueda global.
- Navegación "Cómo llegar": mapa con marcador propio + del evento, ETA real vía Google Directions API si está configurada, y hand-off a Google/Apple Maps para la navegación turn-by-turn real (nunca se simula una ruta dibujando una línea).
- Panel administrativo básico (denuncias pendientes, acciones vía Edge Function con `service_role`, auditoría).
- RLS en **todas** las tablas — ningún permiso depende de ocultar un botón en el cliente.

### Lo que falta para producción (no inventado, documentado a propósito)
- **Conectar un proyecto Supabase real en la nube** (hoy corre local, con Docker, solo accesible desde esta Mac) y volver a correr `supabase db push` ahí.
- Generar tipos reales de Supabase (`supabase gen types typescript --linked`) — hoy `types/database.ts` está escrito a mano como referencia.
- Reemplazar el ícono/splash genéricos de Expo por la identidad visual final de NIGHTLY (paleta ya definida en `constants/theme.ts`).
- Cobros/entradas pagas: no hay integración de pagos. `price_cents` existe en el modelo pero no hay checkout.
- Verificación de identidad más fuerte que la fecha de nacimiento (spec lo pide explícitamente) — hoy es solo el primer filtro.
- El mapa no renderiza en el preview web (`react-native-maps` no tiene build de navegador) — funciona normalmente en iOS/Android reales o vía Expo Go. Ver `components/map/PlatformMap.web.tsx`.

## Configuración

```bash
npm install
cp .env.example .env
```

Completá `.env`:

| Variable | Para qué | Dónde conseguirla |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Backend | Dashboard de Supabase → Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Backend | Idem |
| `GOOGLE_MAPS_IOS_API_KEY` / `GOOGLE_MAPS_ANDROID_API_KEY` | Mapa | Google Maps Platform (Maps SDK) |
| `EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY` | ETA real en "Cómo llegar" (opcional) | Google Maps Platform (Directions API) |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Push notifications | `eas init` en expo.dev |

Sin las variables de Supabase, la app arranca igual pero el Descubrir/Mapa muestran un estado explícito de "backend no configurado" — nunca datos de prueba disfrazados de reales.

> El `.env` de este repo ya apunta a un Supabase **local** (`http://127.0.0.1:54321`, levantado con `supabase start`) — solo funciona en esta Mac mientras Docker esté corriendo. Para que ande desde cualquier dispositivo, cambiá esas dos variables por las de un proyecto real en supabase.com.

### Base de datos

```bash
npx supabase init          # ya hecho en este repo
npx supabase start         # requiere Docker Desktop corriendo
npx supabase db reset      # aplica supabase/migrations/*.sql en orden
```

O contra un proyecto ya creado en supabase.com:

```bash
npx supabase link --project-ref <tu-ref>
npx supabase db push
```

Luego desplegá las dos Edge Functions:

```bash
npx supabase functions deploy delete-account
npx supabase functions deploy admin-moderate
```

Ambas necesitan `SUPABASE_SERVICE_ROLE_KEY` como secret (nunca en el cliente).

### Correr la app

```bash
npx expo start
```

### Tests

```bash
npm test          # Jest — lógica pura (formato, clustering, polyline, mappers)
npm run typecheck # tsc --noEmit
```

Los tests de backend (`supabase/tests/critical_flows.test.sql`, pgTAP) corren con `npx supabase test db` una vez que haya un Postgres local levantado.

## Estructura

```
app/                  rutas (Expo Router): (auth), (tabs), event/, chat/, profile/, settings/, admin/
components/           sistema de diseño (ui/) + componentes de dominio (event/, map/, chat/)
constants/             tokens de marca, paleta, categorías, ciudades de lanzamiento
features/*             (reservado para lógica de dominio que crezca más allá de hooks/services)
hooks/                 data-fetching con React Query
services/              única capa que habla con Supabase (auth, events, requests, chat, ...)
stores/                estado global con Zustand (auth, ubicación, wizard de creación)
lib/                   cliente de Supabase, formateo, clustering, mapeo DB → dominio
types/                 modelos de dominio + tipos de la base (escritos a mano)
supabase/
  migrations/           13 migraciones SQL, en orden, con RLS y funciones
  functions/            Edge Functions (delete-account, admin-moderate)
  tests/                pgTAP
tests/logic/            Jest — lógica pura
```

## Decisiones de arquitectura que vale la pena conocer

- **Privacidad de dirección:** la dirección exacta vive en `event_locations_private`, separada de `events`. Para domicilios privados (`casa`/`quinta`) el punto público (`events.lat/lng`, el que se ve en el mapa) se genera con un offset determinístico server-side — nunca es el punto real, y nunca se expone sin que el organizador acepte la solicitud.
- **Cupo sin overbooking:** `accept_event_request()` hace `SELECT ... FOR UPDATE` sobre la fila del evento antes de contar asistentes, así que dos aceptaciones simultáneas para el último lugar se serializan en vez de competir.
- **Roles y verificación nunca se auto-otorgan:** un trigger (`prevent_privilege_escalation`) bloquea que un usuario cambie su propio `role` o `is_organizer_verified` vía una actualización normal. Esas columnas solo cambian desde la Edge Function `admin-moderate`, con `service_role`.
- **Sin tipos generados reales:** `types/database.ts` está escrito a mano porque no hubo forma de correr `supabase gen types` contra un proyecto real en este entorno. El cliente de Supabase se usa sin el genérico `Database` a propósito (ver comentario en `lib/supabase.ts`) — con tipos a mano, el genérico de postgrest-js producía falsos `never` en cascada en vez de seguridad real.
