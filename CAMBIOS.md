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

---
*Se completa al cierre de cada fase.*
