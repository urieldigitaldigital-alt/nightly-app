# Checklist de requisitos de Apple — Afterdune

Estado en vivo. ✅ = listo y verificado. 🧍 = depende de una acción manual tuya (ver `PENDIENTES_MANUALES.md`). ❌ = no implementado.

Para los textos que hay que pegar en App Store Connect, ver `APP_STORE_CONNECT.md`.

## Privacidad y legales (Guideline 5.1.1)

| Ítem | Estado | Dónde |
|---|---|---|
| Política de Privacidad específica de Afterdune | ✅ | `public/privacy.html` |
| Términos de Uso completos (10 secciones) | ✅ reescritos | `public/terms.html` |
| Legales hosteados en una URL pública | 🧍 | confirmar dominio final en `constants/brand.ts` |
| Legales enlazados desde Configuración > Legal | ✅ | `app/settings/index.tsx` |
| Aceptación obligatoria en el registro | ✅ | `app/(auth)/register.tsx` |
| Aceptación también en el alta por Google/Apple | ✅ | `app/(auth)/welcome.tsx` |

## Eliminación de cuenta (Guideline 5.1.1(v))

| Ítem | Estado | Dónde |
|---|---|---|
| Ruta Configuración > Cuenta > Eliminar cuenta | ✅ | `app/settings/delete-account.tsx` |
| Confirmación de dos pasos (escribir "ELIMINAR") | ✅ | ídem |
| Borra perfil, eventos, solicitudes, mensajes | ✅ | `supabase/functions/delete-account/index.ts` + cascadas |
| Borra archivos en Storage (avatar, fotos, DNI) | ✅ | `delete-account/index.ts` |
| Borra el usuario de Auth | ✅ | ídem |
| **Revoca el token de Apple** | ✅ implementado | `_shared/apple.ts`, `apple-link/`, migración `0024` — 🧍 necesita las credenciales `.p8` |

## Contenido generado por usuarios (Guideline 1.2)

Los cuatro requisitos de Apple, completos:

| Ítem | Estado | Dónde |
|---|---|---|
| **Filtro de contenido objetable** | ✅ nuevo | `lib/moderation.ts` (cliente) + `0023_content_moderation.sql` (triggers) |
| Filtro aplicado a fiestas, perfiles y mensajes | ✅ | `services/events.ts`, `profiles.ts`, `chat.ts` |
| Filtro imposible de saltear desde el cliente | ✅ | triggers en `events`, `messages`, `profiles` |
| Lista de términos editable sin deploy | ✅ | tabla `moderation_terms` |
| **EULA de tolerancia cero** | ✅ nuevo | casilla propia en el registro + `app/community-guidelines.tsx` + sección 2 de los Términos |
| **Denunciar desde el contenido** | ✅ | fiesta, perfil (menú "..."), mensaje (mantener presionado) |
| **Bloquear desde el contenido** | ✅ nuevo | perfil, chat y fiesta, con confirmación — `components/safety/UserSafetySheet.tsx` |
| Compromiso de revisión en 24h | ✅ | Términos sec. 3, Normas de la comunidad, y aviso de vencido en `/admin` |
| Cola de moderación ordenada por antigüedad | ✅ | `services/admin.ts` |
| Reportes automáticos del filtro | ✅ | `reports.source = 'automatic'` |
| Email de soporte visible | ✅ | `app/settings/help.tsx` |

## Login (Guideline 4.8)

| Ítem | Estado | Dónde |
|---|---|---|
| Email + contraseña | ✅ | `services/auth.ts` |
| Google | ✅ | ídem |
| Sign in with Apple | ✅ código listo | 🧍 falta habilitar el provider en Supabase |
| Verificación de email con código de 6 dígitos | ✅ código listo | 🧍 falta activar "Confirm email" en Supabase |
| Login con nombre de usuario además de email | ✅ nuevo | `supabase/functions/login/`, migración `0025` |
| Aviso de "usuario ya en uso" mientras se escribe | ✅ nuevo | `app/(auth)/register.tsx`, RPC `is_username_available` |
| El email nunca se expone al resolver un usuario | ✅ | la traducción pasa solo del lado del servidor |

## Edad y seguridad

| Ítem | Estado | Dónde |
|---|---|---|
| Fecha de nacimiento obligatoria | ✅ | `app/(auth)/register.tsx` |
| Bloqueo real de menores (restricción en la base) | ✅ | `0002_profiles.sql:30` |
| Clasificación 17+ | 🧍 | respuestas en `APP_STORE_CONNECT.md` sec. 2 |
| Dirección exacta solo para invitados aceptados | ✅ | jitter server-side |

## Permisos

| Ítem | Estado | Dónde |
|---|---|---|
| Ubicación: pantalla previa propia | ✅ | `app/(auth)/location-permission.tsx` |
| Fotos: explicación previa al permiso | ✅ | `lib/permissions.ts` |
| Botón "abrir Ajustes" si fue denegado | ✅ | ídem |
| Textos de Info.plist en español y específicos | ✅ verificado en el plist generado | `app.config.ts` |
| Sin permisos declarados que no se usen | ✅ | sin cámara, sin ubicación en segundo plano |
| Android 13+: `POST_NOTIFICATIONS`, `READ_MEDIA_IMAGES` | ✅ nuevo | `app.config.ts` |

## Técnico

| Ítem | Estado | Dónde |
|---|---|---|
| `PrivacyInfo.xcprivacy` con APIs y datos declarados | ✅ nuevo, verificado en el plist generado | `app.config.ts` → `ios.privacyManifests` |
| `ITSAppUsesNonExemptEncryption = false` | ✅ nuevo | evita el cuestionario de exportación en cada build |
| iPad: las cuatro orientaciones + Split View | ✅ nuevo | `plugins/withTabletOrientations.js` |
| Layout adaptable (grilla en tablet, ancho de lectura) | ✅ nuevo | `hooks/useResponsive.ts`, `components/ui/Screen.tsx` |
| Mapa sin dependencias de CDN en runtime | ✅ nuevo | MapLibre nativo reemplazó al WebView + unpkg |
| Pantalla de error en vez de cierre (Guideline 2.1) | ✅ nuevo | `components/AppErrorBoundary.tsx` |
| Aviso de sin conexión | ✅ nuevo | `components/OfflineBanner.tsx` |
| Mensajes de error traducidos y accionables | ✅ nuevo | `lib/errors.ts` |
| Entitlements (Sign in with Apple + push) | ✅ verificado | generados por prebuild |
| Cuenta demo con contenido real | ✅ script listo | 🧍 correr `scripts/seed-reviewer-demo.mjs` |
| Notas del revisor, descripción, keywords | ✅ | `APP_STORE_CONNECT.md` |
| Compilación nativa verificada en simulador | 🧍 **pendiente** | CocoaPods no se puede instalar en esta Mac (Ruby 2.6) — ver `PENDIENTES_MANUALES.md` |

---
*Última actualización: pasada completa de preparación para la App Store.*
