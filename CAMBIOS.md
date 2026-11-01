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

---
*Se completa al cierre de cada fase.*
