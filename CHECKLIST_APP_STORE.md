# Checklist de requisitos de Apple — Afterdune

Estado en vivo, se actualiza al final de cada fase. ✅ = listo y verificado. ⏳ = en progreso / planeado para una fase posterior. ❌ = todavía no empezado. 🧍 = depende de una acción manual tuya (ver `PENDIENTES_MANUALES.md`).

## Privacidad y legales (Guideline 5.1.1)

| Ítem | Estado | Dónde |
|---|---|---|
| Política de Privacidad específica de Afterdune (no genérica) | ✅ ya menciona DNI, push y Apple | `public/privacy.html` |
| Términos y Condiciones específicos | ✅ | `public/terms.html` |
| Legales hosteados en una URL pública | 🧍 | `nightly-app-seven.vercel.app/terms.html` y `/privacy.html` — confirmar si querés otro dominio |
| Legales enlazados desde Configuración > Legal | ✅ | `app/settings/index.tsx` |
| Aceptación obligatoria (checkbox) en el registro | ✅ | `app/(auth)/register.tsx` |

## Eliminación de cuenta (Guideline 5.1.1(v))

| Ítem | Estado | Dónde |
|---|---|---|
| Ruta Configuración > Cuenta > Eliminar cuenta | ✅ | `app/settings/index.tsx` → `app/settings/delete-account.tsx` |
| Confirmación de dos pasos (escribir "ELIMINAR") | ✅ | `app/settings/delete-account.tsx` |
| Borra perfil, eventos, solicitudes, mensajes (cascade DB) | ✅ | `supabase/functions/delete-account/index.ts` + FKs `ON DELETE CASCADE` |
| Borra archivos en Storage (avatar, fotos de evento, DNI) | ✅ | `delete-account/index.ts` (`removeAllUnderPrefix`) |
| Borra el usuario de Auth | ✅ | `delete-account/index.ts` |
| Revoca token si inició sesión con Apple | 🧍 **no implementado** — requiere la Apple Key (.p8) + Team/Key ID, que no existen en este entorno | ver `PENDIENTES_MANUALES.md` |

## Login (Guideline 4.8)

| Ítem | Estado | Dónde |
|---|---|---|
| Email + contraseña | ✅ | `services/auth.ts` |
| Google | ✅ | `services/auth.ts` |
| Sign in with Apple | ✅ código listo — botón nativo en iOS, requiere habilitar el provider en Supabase | `services/auth.ts` (`signInWithApple`), `components/ui/AppleSignInButton.tsx` |
| Exploración del mapa sin cuenta | ❌ no implementado — decisión de producto para evaluar más adelante, no bloqueante |
| Verificación de email con código de 6 dígitos | ✅ código listo (`app/(auth)/verify-email.tsx`), 🧍 falta activar "Confirm email" en Supabase y mostrar el código en la plantilla del mail | ver `PENDIENTES_MANUALES.md` |

## Contenido generado por usuarios (Guideline 1.2)

| Ítem | Estado | Dónde |
|---|---|---|
| Reportar eventos/perfiles/mensajes | ✅ | `app/report.tsx`, tabla `reports` |
| Revisión de reportes (admin) | ✅ | `app/admin/index.tsx` |
| Enlace a `/admin` desde el menú (solo admins) | ✅ | `app/settings/index.tsx` |
| Bloquear usuarios | ✅ | `app/settings/privacy.tsx`, tabla `blocks` |
| Bloqueo oculta perfil/eventos en discovery | ✅ código listo, 🧍 falta correr la migración en Supabase | `supabase/migrations/0019_hide_blocked_from_discovery.sql` |
| Filtro de palabras ofensivas | ❌ | no incluido en este alcance — moderación reactiva vía reportes |
| Email de soporte visible | ✅ | `app/settings/help.tsx` |

## Edad y seguridad

| Ítem | Estado | Dónde |
|---|---|---|
| Fecha de nacimiento obligatoria | ✅ | `app/(auth)/register.tsx` |
| Bloqueo real de menores de 18 (constraint DB) | ✅ | `supabase/migrations/0002_profiles.sql:30` |
| Clasificación de edad recomendada para App Store Connect | 🧍 | ver abajo |
| Pantalla de consejos de seguridad primera vez que se une a una previa | ❌ | no incluido en este alcance |

**Recomendación de clasificación**: 17+ (referencias a alcohol/vida nocturna + contenido generado por usuarios sin moderación 100% proactiva). Al completar el cuestionario de "Age Rating" en App Store Connect, marcar "Alcohol, Tobacco, or Drug Use or References: Infrequent/Mild" y "User Generated Content: Yes".

## Permisos

| Ítem | Estado | Dónde |
|---|---|---|
| Ubicación: pantalla previa propia | ✅ (onboarding) | `app/(auth)/location-permission.tsx` |
| Fotos: explicación previa al permiso | ✅ | `lib/permissions.ts` (`ensurePhotoLibraryAccess`) |
| Botón "abrir Ajustes" si el permiso fue denegado | ✅ | `lib/permissions.ts` |
| Permiso de cámara declarado pero sin uso real | ✅ corregido — se quitó (no hay captura de cámara en ningún lado de la app hoy) | `app.config.ts` |
| Textos de Info.plist en español, específicos | ✅ | `app.config.ts` |
| Ubicación exacta solo visible tras ser aceptado | ✅ | `event.exactAddress` solo se expone tras `accepted` |
| Ubicación se corta al llegar/cancelar | ✅ (navegación propia) / ❌ (compartida con organizador no existe aún) | Fase 3 |

## Técnico para App Store

| Ítem | Estado | Dónde |
|---|---|---|
| `eas.json` con perfiles de build | ✅ | `eas.json` |
| Versión 1.0.0 + build number | ✅ | `app.config.ts` |
| Ícono 1024x1024 sin transparencia | ✅ (ya generado en sesión anterior) | `assets/icon.png` |
| Launch screen | ✅ | `expo-splash-screen` plugin, `assets/splash-icon.png` |
| Deployment target razonable | ✅ (default SDK 58 ≈ iOS 15.1+) | sin override necesario |
| `PrivacyInfo.xcprivacy` | 🧍 se genera al compilar con EAS (managed workflow) | — |
| Sin placeholders / botones sin acción | ✅ confirmado por auditoría (46/47 pantallas FUNCIONA) | ver `CAMBIOS.md` |
| Cuenta demo para el revisor | ❌ | Fase 6 |
| Descripción, palabras clave, notas para el revisor | ❌ | Fase 6 |

---
*Última actualización: Fase 1 completa.*
