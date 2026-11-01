# Cambios — rama `release/app-store`

Resumen por fase de todo lo agregado, modificado y eliminado rumbo al envío a revisión de Apple.

## Fase 0 — Preparación

**Agregado**
- `eas.json`: perfiles de build `development`/`preview`/`production`.
- `CHECKLIST_APP_STORE.md`, `PENDIENTES_MANUALES.md`, `CAMBIOS.md` (este archivo).

**Modificado**
- `app.config.ts`: versión `0.1.0` → `1.0.0`, agregado `ios.buildNumber: '1'` y `android.versionCode: 1`. Los tres textos de permisos (ubicación, cámara, fotos) se unificaron en constantes únicas reutilizadas tanto en `ios.infoPlist` como en los plugins `expo-location`/`expo-image-picker` — antes había dos versiones ligeramente distintas del mismo texto, y el plugin de `expo-image-picker` no tenía `cameraPermission` explícito (lo que lo habría hecho caer a un texto en inglés por defecto, pisando el de `ios.infoPlist`).

**Eliminado**
- Nada.

## Fase 1 — Requisitos de Apple

**Agregado**
- `services/auth.ts`: `signInWithApple()` — botón nativo en iOS (`expo-apple-authentication` + `signInWithIdToken`, sin salir a un navegador), y el mismo flujo de redirect OAuth que ya usaba Google en web/Android. Cae en el mismo flujo de "confirmar fecha de nacimiento" que Google, sin cambios de backend.
- `components/ui/AppleSignInButton.tsx`: botón oficial de Apple en iOS, botón genérico (igual al de Google) en el resto de plataformas. Agregado a `welcome.tsx` y `login.tsx`.
- `app/settings/delete-account.tsx`: pantalla de eliminar cuenta con confirmación real (escribir "ELIMINAR"), reemplaza el `Alert.alert` que había antes.
- `lib/permissions.ts`: `ensurePhotoLibraryAccess()` — explica por qué se pide el permiso de fotos antes de mostrar el diálogo del sistema, y ofrece "Abrir Ajustes" si ya fue denegado. Se usa en los 4 lugares donde la app elige una foto (perfil, onboarding, portada de evento, DNI).
- `supabase/migrations/0019_hide_blocked_from_discovery.sql`: bloquear a alguien ahora también oculta su perfil y sus fiestas publicadas del feed/mapa/búsqueda del que bloqueó (antes solo impedía mensajes y solicitudes).
- Sección "Legal" (Términos/Privacidad) y sección "Cuenta" (Eliminar cuenta) nuevas en `app/settings/index.tsx`; enlace a `/admin` visible solo para cuentas con rol admin.
- Checkbox real de aceptación de Términos/Privacidad en `app/(auth)/register.tsx` (antes era solo texto, sin acción).

**Modificado**
- `supabase/functions/delete-account/index.ts`: ahora borra también los archivos en Storage que las cascadas de la base de datos no alcanzan (avatar, fotos de portada/galería de los eventos que organizó, foto de DNI) antes de borrar el usuario.
- `public/privacy.html`: ahora menciona explícitamente la foto de DNI (por qué se pide, que se borra sola) y el token de notificaciones push, que antes no estaban mencionados pese a recolectarse. Agregado Apple junto a Google como proveedor de login.
- `app.config.ts`: se quitó el permiso de cámara (`NSCameraUsageDescription` / `CAMERA` en Android) — la app nunca usa la cámara en ningún lado (solo elige fotos de la galería), y declarar un permiso sin uso real es en sí mismo un motivo de objeción en la revisión de Apple. Si en algún momento querés agregar "sacar una foto" como opción (no solo elegir de la galería), avisame — es una función nueva, no estaba en el alcance de esta fase.

**Eliminado**
- El `Alert.alert` de confirmación de borrado de cuenta en `app/profile/edit.tsx` (reemplazado por la pantalla dedicada).
- El permiso de cámara declarado sin uso real (ver arriba).

**Pendiente de tu parte** (ver `PENDIENTES_MANUALES.md`): habilitar Sign in with Apple en Supabase con las credenciales de Apple Developer, correr la migración `0019` en el SQL Editor de Supabase, y confirmar las URLs finales de los legales.

## Pasada de correcciones (post-Fase 1)

**Agregado**
- `supabase/migrations/0020_expire_finished_events.sql`: las fiestas ahora pasan a "finalizada" automáticamente apenas pasa su hora de fin (o 6 horas después de empezar si no se puso hora de fin), vía un cron que corre cada 10 minutos — antes el estado `'finished'` existía en la base pero nada lo usaba nunca, así que un evento corto podía seguir visible en el mapa/feed horas después de terminar. También se corrigió el filtro de `events_within_radius` para excluir estos eventos de inmediato, sin esperar al próximo ciclo del cron.
- Botón de volver en `app/event/[id]/directions.tsx`: la pantalla de navegación no tenía ninguna forma visible de volver atrás antes de tocar "Iniciar navegación" (solo un botón de cerrar que aparecía recién una vez iniciada la navegación).

**Modificado**
- `app/event/[id]/directions.tsx`: los marcadores del mapa de navegación ahora muestran tu foto de perfil real y la foto de portada de la fiesta, en vez de puntos de colores lisos.
- `app/event/[id]/index.tsx`: la galería de fotos tenía un ancho fijo de 390px que se cortaba en pantallas más angostas (iPhone SE/7/8, muchos Android) — ahora se mide el ancho real de la pantalla.
- `app/trending.tsx`: de paso se corrigió un parámetro (`pageSize`) que se le pasaba a `useEventsFeed` pero que ese hook nunca usó — no tenía efecto, quedó limpio.

**Eliminado — función de "guardar fiesta" completa, a pedido**
- Pantalla `app/saved.tsx`, `hooks/useSavedEvents.ts`, `services/saved.ts`.
- El botón de guardar (ícono de marcador) en las tarjetas de evento (`components/event/EventCard.tsx`) y en el detalle de la fiesta.
- La entrada "Guardados" del menú de perfil.
- El campo `isSaved` de `EventDetail` y su consulta asociada en `services/events.ts`.
- La tabla `saved_events` en la base de datos **no se borró** (solo se dejó de usar desde la app) — si en algún momento querés borrarla también, avisame y preparo esa migración.

---
*Se completa al cierre de cada fase.*
