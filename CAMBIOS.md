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

## Fase 6 — Preparación para la App Store

Pasada completa sobre los motivos reales de rechazo, más mapa nativo y layout adaptable.

**Cumplimiento de Apple — contenido generado por usuarios (Guideline 1.2)**

Era el hueco más grande: Apple pide cuatro cosas para cualquier app con contenido de usuarios, y faltaban dos.

- **Filtro de contenido objetable** (`lib/moderation.ts` + migración `0023`). Revisa nombres de fiestas, descripciones, reglas, biografías, nombres de usuario y mensajes. Normaliza el texto antes de comparar (saca acentos, traduce leetspeak como `p3d0f1l0`, aplasta el estiramiento de letras como `puuuuto` y atraviesa separadores como `p.u.t.o`), así que no se esquiva escribiendo raro. Dos niveles: lo inaceptable se rechaza en el momento, lo gris se publica pero abre un reporte automático para revisión. Corre también como trigger en la base, o sea que un cliente modificado no lo puede saltear. La lista de términos vive en una tabla editable sin deploy.
  - Decisión explícita: el insulto coloquial rioplatense ("boludo", "pelotudo") **no** se filtra. El objetivo es el daño, no la grosería, y censurar el habla cotidiana volvería la app inusable. Hay 29 tests, y una buena parte son casos que *no* se tienen que bloquear.
- **EULA de tolerancia cero**: casilla obligatoria y separada en el registro (`app/(auth)/register.tsx`), línea equivalente en el alta por Google/Apple (`app/(auth)/welcome.tsx`, que antes se saltaba la aceptación por completo), pantalla permanente de Normas de la comunidad dentro de la app (`app/community-guidelines.tsx`, legible sin conexión) y sección 2 de los Términos reescritos.
- **Bloquear desde el contenido**: el perfil público no tenía ni denuncia ni bloqueo. Ahora hay una hoja compartida (`components/safety/UserSafetySheet.tsx`) con confirmación en dos pasos, disponible desde el perfil, el chat y la fiesta.
- **Denunciar un mensaje puntual**: mantener presionado un mensaje recibido. Antes, "Reportar" en el chat disparaba una denuncia sin motivo ni confirmación y sin avisarle nada al usuario; ahora pasa por la pantalla de denuncia normal.
- **Compromiso de 24 horas**: escrito en los Términos y en las Normas, y operativo en `/admin` — la cola se ordena por antigüedad y las denuncias que pasaron las 24 horas se marcan en rojo.

**Arreglado**

- `stores/chatOutboxStore.ts`: un mensaje rechazado por el filtro se reintentaba para siempre en cada reconexión, porque la cola trataba todos los fallos como temporales. Ahora distingue el rechazo definitivo del problema de red: muestra el motivo y ofrece descartarlo.
- `app/profile/edit.tsx`: si guardar fallaba, el spinner paraba y no pasaba nada más — el error era completamente silencioso.
- `app/admin/index.tsx`: mostraba "Denunciado por @undefined" para cualquier denuncia sin denunciante.
- **Mapa dependiente de un CDN**: el mapa cargaba MapLibre desde `unpkg.com` dentro de un WebView en cada arranque. Sin internet, con mala conexión o detrás de un firewall corporativo quedaba en negro — un rechazo por Guideline 2.1 esperando a pasar.

**Mapa nativo con comportamiento de GPS**

- Reemplazo del WebView por `@maplibre/maplibre-react-native`. Sin CDN, sin puente de JavaScript por gesto, renderizado nativo.
- El punto de "estás acá" ahora lo dibuja el sistema: se mueve a 60fps entre fix y fix en vez de saltar de GPS en GPS, y muestra el círculo de precisión real.
- Botón de "mi ubicación" en la pestaña Mapa, con modo seguimiento que rota con la brújula y se apaga solo al arrastrar el mapa.
- La navegación paso a paso usa seguimiento *course-up* nativo (el mapa se orienta según hacia dónde te movés de verdad), y la ruta se dibuja con doble línea para que se lea sobre el mapa oscuro.

**Diseño adaptable**

- `hooks/useResponsive.ts`: breakpoints medidos contra el lado corto de la ventana, así un teléfono acostado sigue siendo un teléfono.
- Feed en grilla de hasta 3 columnas en tablet y escritorio, que se recompone al rotar.
- Las pantallas de texto y formularios se centran en una columna de ancho legible en vez de estirarse a todo el ancho de un iPad.
- iPad: las cuatro orientaciones y Split View habilitados (`plugins/withTabletOrientations.js`); el iPhone queda en vertical.

**Nombres de usuario y login** (pedido después de la primera pasada)

- Aviso en vivo mientras se escribe: "@tu_usuario ya está en uso. Probá con otro", con una espera para no consultar en cada tecla. Antes el choque aparecía recién al tocar "Crear cuenta", con el formulario entero ya completo.
- Lista de nombres reservados (`admin`, `soporte`, `afterdune`, nombres de rutas) que nadie puede tomar.
- **Se puede iniciar sesión con el nombre de usuario**, no solo con el email. La traducción de usuario a email pasa del lado del servidor (Edge Function `login`) y el email nunca vuelve al cliente: una función que lo devolviera dejaría que cualquiera recorriera nombres de usuario para juntar direcciones de correo ajenas.

**Resto del cumplimiento**

- **Revocación del token de Apple al eliminar cuenta**, que estaba documentada como no implementada. Ahora está completa: el `authorizationCode` del login se canjea por un refresh token (Edge Function `apple-link`, tabla `apple_credentials` invisible para los clientes), y al borrar la cuenta se firma un JWT ES256 con la clave `.p8` y se llama al endpoint de revocación de Apple. Si faltan las credenciales, degrada sin romper el borrado.
- **Privacy manifest** (`PrivacyInfo.xcprivacy`) con las cuatro APIs de razón requerida y los seis tipos de datos recolectados; verificado en el plist generado por prebuild.
- `ITSAppUsesNonExemptEncryption = false`: evita el cuestionario de exportación en cada subida.
- Android 13+: `POST_NOTIFICATIONS` y `READ_MEDIA_IMAGES`.
- `lib/errors.ts`: un solo traductor de errores a castellano accionable, en vez de un "Algo salió mal" distinto por pantalla.
- `components/AppErrorBoundary.tsx`: pantalla de error con botón de reintentar en lugar de un cierre inexplicable (Guideline 2.1).
- `components/OfflineBanner.tsx`: aviso de sin conexión, para que estar sin internet no se parezca a que la app esté rota.
- `scripts/seed-reviewer-demo.mjs`: cuenta demo con contenido real (fiesta publicada, solicitud pendiente, conversación con mensajes). Crea el contenido *como los usuarios*, pasando por las mismas RLS y triggers que cualquier persona.
- `APP_STORE_CONNECT.md`: notas del revisor, descripción, keywords, clasificación de edad y respuestas de App Privacy, listos para copiar y pegar.

**Pendiente de tu parte**: correr las migraciones `0019` a `0025`, desplegar las tres Edge Functions, cargar los secrets de Apple y hacer el build — ver `PENDIENTES_MANUALES.md`. El build nativo no se pudo compilar en esta Mac porque CocoaPods necesita Ruby ≥ 3.3 y el del sistema es 2.6.

---
*Se completa al cierre de cada fase.*
