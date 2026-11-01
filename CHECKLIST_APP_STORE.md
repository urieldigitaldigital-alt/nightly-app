# Checklist de requisitos de Apple — NIGHTLY

Estado en vivo, se actualiza al final de cada fase. ✅ = listo y verificado. ⏳ = en progreso / planeado para una fase posterior. ❌ = todavía no empezado. 🧍 = depende de una acción manual tuya (ver `PENDIENTES_MANUALES.md`).

## Privacidad y legales (Guideline 5.1.1)

| Ítem | Estado | Dónde |
|---|---|---|
| Política de Privacidad específica de NIGHTLY (no genérica) | ✅ contenido / ⏳ falta mencionar DNI y push | `public/privacy.html` |
| Términos y Condiciones específicos | ✅ | `public/terms.html` |
| Legales hosteados en una URL pública | 🧍 | pendiente: confirmar URL final |
| Legales enlazados desde Configuración > Legal | ❌ | Fase 1.3 |
| Aceptación obligatoria (checkbox) en el registro | ❌ | Fase 1.3 |

## Eliminación de cuenta (Guideline 5.1.1(v))

| Ítem | Estado | Dónde |
|---|---|---|
| Ruta Configuración > Cuenta > Eliminar cuenta | ✅ (existe, a mejorar) | `app/profile/edit.tsx` |
| Confirmación de dos pasos (escribir "ELIMINAR") | ❌ | Fase 1.2 |
| Borra perfil, eventos, solicitudes, mensajes (cascade DB) | ✅ | `supabase/functions/delete-account/index.ts` + FKs `ON DELETE CASCADE` |
| Borra archivos en Storage (avatar, fotos de evento, DNI) | ❌ (huérfanos hoy) | Fase 1.2 |
| Borra el usuario de Auth | ✅ | `delete-account/index.ts:37` |
| Revoca token si inició sesión con Apple | ❌ | Fase 1.2 (depende de 1.1) |

## Login (Guideline 4.8)

| Ítem | Estado | Dónde |
|---|---|---|
| Email + contraseña | ✅ | `services/auth.ts` |
| Google | ✅ | `services/auth.ts` |
| Sign in with Apple | ❌ **bloqueante** | Fase 1.1 |
| Exploración del mapa sin cuenta | 🧍 decisión de producto, no implementado — evaluar en Fase 1 |

## Contenido generado por usuarios (Guideline 1.2)

| Ítem | Estado | Dónde |
|---|---|---|
| Reportar eventos/perfiles/mensajes | ✅ | `app/report.tsx`, tabla `reports` |
| Revisión de reportes (admin) | ✅ (pantalla sin enlazar) | `app/admin/index.tsx` |
| Enlace a `/admin` desde el menú de perfil (solo admins) | ❌ | Fase 1 |
| Bloquear usuarios | ✅ | `app/settings/privacy.tsx`, tabla `blocks` |
| Bloqueo oculta perfil/eventos en discovery | ❌ (hueco confirmado) | Fase 1.4 |
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
| Ubicación: pantalla previa propia | ✅ (onboarding) / ❌ (fuera de onboarding) | `app/(auth)/location-permission.tsx` |
| Cámara/fotos: pantalla previa | ❌ | Fase 1.6 |
| Botón "abrir Ajustes" si el permiso fue denegado | ❌ | Fase 1.6 |
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
*Última actualización: Fase 0 completa.*
