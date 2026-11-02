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

## Rebranding — NIGHTLY → Afterdune

**Modificado**
- Nombre, bundle ID (`com.afterdune.app`), scheme (`afterdune://`), íconos (recortados del logo real provisto, no el diseño programático anterior), splash screens, páginas legales y todas las referencias de código ("NIGHTLY" → "Afterdune") en 14 archivos de fuente.
- Plantilla de email "Confirm sign up" en Supabase actualizada al nuevo nombre.

**Pendiente de tu parte**: `soporte@afterdune.app` es un placeholder — avisame la dirección real cuando la tengas. El resto de las plantillas de email (Reset password, Magic link, etc.) todavía quedan por revisar — ver `PENDIENTES_MANUALES.md`.

## Fase 2B — Pantalla completa sin huecos + animación de apertura

**Agregado**
- `components/SplashAnimation.tsx`: animación propia de apertura (logo con spring/pulse, haptics, se funde con el splash nativo para que el cambio sea invisible), con fallback estático para "reducir movimiento" activado.
- `expo-keep-awake` activado solo mientras hay navegación activa en `app/event/[id]/directions.tsx` (se apaga al llegar o cancelar).

**Modificado**
- `app/_layout.tsx`: reestructurado para mostrar siempre el árbol completo de la app debajo de la animación de apertura, en vez de una pantalla de carga separada — evita parpadeos y huecos negros en la transición.

## Fase 3 — Ubicación compartida en vivo (organizador ↔ invitado)

**Agregado**
- `supabase/migrations/0021_live_locations.sql`: tabla `live_locations` con RLS (un invitado solo escribe su propia posición y solo si tiene una solicitud aceptada en ese evento; el organizador solo lee invitados aceptados a sus propias fiestas), purga automática de posiciones viejas vía `pg_cron`.
- `services/liveLocation.ts`: publicar/leer/suscribirse a la posición en vivo.
- `app/event/[id]/directions.tsx`: antes de arrancar la navegación, se pregunta si el invitado quiere compartir su ubicación con el organizador (opt-in explícito); si acepta, publica su posición cada 8 segundos mientras navega, y la corta al llegar o cancelar.
- `app/event/[id]/requests.tsx`: el organizador ahora ve un mini-mapa con los invitados aceptados que están en camino, con un contador ("N personas vienen en camino").

**Pendiente de tu parte**: correr la migración `0021` en el SQL Editor de Supabase (ver `PENDIENTES_MANUALES.md`).

## Fase 4 — Verificación de email con código de 6 dígitos

**Agregado**
- `app/(auth)/verify-email.tsx`: pantalla con 6 casillas, autocompletado de iOS (`textContentType="oneTimeCode"`), reenvío con cuenta regresiva de 60s, mensajes de error traducidos (código vencido / incorrecto).
- `services/auth.ts`: `verifySignupCode` y `resendSignupCode`, usando `verifyOtp`/`resend` de Supabase Auth.

**Modificado**
- `app/(auth)/register.tsx`: si el registro no devuelve sesión (confirmación de email activada), redirige a `verify-email` en vez de mostrar un error estático.
- `app/(auth)/login.tsx`: si el login falla por "email not confirmed", redirige a `verify-email` con el email ya cargado en vez de solo mostrar el error.

**Pendiente de tu parte**: activar "Confirm email" en el dashboard de Supabase y mostrar el código de 6 dígitos en la plantilla del email (hoy solo tiene el link) — ver `PENDIENTES_MANUALES.md`. Sin esto, el flujo nuevo queda construido y probado pero no se dispara en producción.

## Fase 5 — Chat a nivel WhatsApp

**Arreglado**
- `app/chat/[id].tsx`: el input se vaciaba antes de confirmar el envío — si `sendMessage` fallaba (sin internet, error de servidor), el mensaje se perdía sin ningún aviso. Ahora cada mensaje pasa por una cola local (`stores/chatOutboxStore.ts`): aparece al instante con un ícono de "enviando", y si falla queda marcado en rojo con "No se envió · Reintentar" (toco para reintentar a mano, o se reintenta solo apenas vuelve la conexión).

**Agregado**
- **Recibos de lectura reales**: la burbuja de cada mensaje propio muestra ✓ (enviado) o ✓✓ celeste (leído), calculado a partir de `conversation_members.last_read_at` del otro integrante — sin agregar una tabla nueva, ese dato ya existía y se actualiza solo al abrir el chat.
- **Fotos en el chat**: botón para adjuntar una foto desde la galería (bucket privado `chat-images`, solo visible para los integrantes de esa conversación), con miniatura en la burbuja y un visor a pantalla completa con pinch-to-zoom (`components/ui/ImageViewerModal.tsx`, reutilizable para otras fotos de la app más adelante).
- **Cola offline**: los mensajes (texto o foto) escritos sin conexión quedan guardados en el dispositivo y se envían solos apenas vuelve internet (`hooks/useChatOutboxFlush.ts`, usando `@react-native-community/netinfo` para detectar la reconexión), sin que el usuario tenga que hacer nada ni se pierda el mensaje si cierra la app.
- **Indicador "Escribiendo..."**: aparece en el header del chat mientras el otro integrante está tipeando, vía un canal de Realtime efímero (nunca se guarda en la base).
- **Tap en notificación push navega correctamente**: el listener de `hooks/usePushNotifications.ts` estaba vacío — ahora usa la misma lógica de ruteo que ya tenía `app/notifications.tsx` (extraída a `lib/notificationRouting.ts` para no duplicarla), así que tocar un push de mensaje/solicitud/evento lleva directo a la pantalla correcta.

**Pendiente de tu parte**: correr la migración `0022_chat_images.sql` en el SQL Editor de Supabase (ver `PENDIENTES_MANUALES.md`).

---
*Se completa al cierre de cada fase.*
