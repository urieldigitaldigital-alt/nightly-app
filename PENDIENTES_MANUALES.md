# Pendientes manuales — cosas que solo podés hacer vos

Nada de esto lo puede hacer el código por sí solo (credenciales, cuentas de terceros, configuración de dashboards). Se completa a medida que cada fase lo necesita.

## Fase 0

- [ ] **Proyecto EAS**: correr `eas login` y `eas init` (o confirmarme el `EXPO_PUBLIC_EAS_PROJECT_ID` si ya existe un proyecto EAS creado) para que `eas build` tenga dónde compilar.

## Fase 1 — Sign in with Apple

- [ ] En **developer.apple.com** → Certificates, Identifiers & Profiles → Identifiers → tu App ID (`com.nightly.app`): habilitar la capability **"Sign In with Apple"**.
- [ ] Crear un **Services ID** nuevo (distinto del bundle ID de la app) para usar como client ID de Apple en Supabase.
- [ ] Crear una **Key** (Keys → "+") con "Sign In with Apple" habilitado, descargar el archivo `.p8` (solo se puede descargar una vez).
- [ ] En el dashboard de **Supabase** → Authentication → Providers → Apple: pegar el Services ID, Team ID, Key ID y el contenido del archivo `.p8`.
- [ ] Guardar el archivo `.p8` en un lugar seguro (no se commitea a git) — hace falta también para revocar tokens al eliminar una cuenta.

## Fase 1 — Legales

- [x] Ya enlazadas desde la app (Configuración > Legal) apuntando a `nightly-app-seven.vercel.app/terms.html` y `/privacy.html` (se sirven solas desde el mismo despliegue de Vercel, sin configuración extra). Si preferís otro dominio, avisame y actualizo `constants/brand.ts`.
- [ ] Pegar esas mismas URLs en App Store Connect (campo "Privacy Policy URL") cuando crees el registro de la app.

## Fase 1 — Revocación de token de Apple al eliminar cuenta

- [ ] **No implementado todavía, a propósito.** Revocar el acceso en el lado de Apple cuando alguien elimina su cuenta requiere: el archivo `.p8` de la Key de Apple (el mismo de la sección anterior), el Team ID y el Key ID, para firmar un JWT y llamar al endpoint de revocación de Apple desde `supabase/functions/delete-account/index.ts`. Eliminar la cuenta en Supabase ya funciona igual sin esto (el usuario pierde el acceso a la app), solo falta notificarle a Apple que el permiso fue revocado. Decime cuando tengas las credenciales de la sección anterior y lo agrego — es un cambio chico una vez que exista el `.p8`.

## Fase 1 — Migración de base de datos pendiente

- [ ] Correr `supabase/migrations/0019_hide_blocked_from_discovery.sql` en el **SQL Editor del dashboard de Supabase** (Database → SQL Editor → pegar el contenido del archivo → Run). No tengo una conexión directa a tu base de datos desde acá, así que cada migración nueva que vaya agregando en las próximas fases la vas a tener que correr vos de la misma forma — te voy a avisar el nombre exacto del archivo cada vez.

## Fase 4 — Email

- [ ] Configurar el remitente de los emails de Supabase Auth (Authentication → Email Templates / SMTP settings) con un dominio propio y sus registros SPF/DKIM, para que los códigos de verificación no caigan en spam. Si no tenés un proveedor de email transaccional (Resend, Postmark, etc.) todavía, decime y te recomiendo uno gratis para este volumen.
- [ ] Opcional: personalizar la plantilla HTML del email de verificación desde el dashboard de Supabase con el logo/colores de NIGHTLY.

## Fase 6 — Cuenta demo y envío

- [ ] Te voy a dejar acá mismo las credenciales de una cuenta demo (usuario + contraseña) con una previa de ejemplo y un chat de ejemplo, para que las copies en el campo "Notas para el revisor" de App Store Connect.
- [ ] Crear el registro de la app en **App Store Connect** (nombre, bundle ID `com.nightly.app`, categoría, clasificación de edad — recomendación en `CHECKLIST_APP_STORE.md`).
- [ ] Completar el cuestionario de **App Privacy** en App Store Connect (te dejo el borrador de respuestas en `CHECKLIST_APP_STORE.md`).
- [ ] Pegar la URL de la Política de Privacidad en App Store Connect.
- [ ] Correr `eas submit` (o subirlo manualmente desde Xcode/Transporter) cuando el build esté listo — este paso final de envío lo hacés vos, yo dejo todo preparado para que sea un solo comando.

---
*Última actualización: Fase 1.*
