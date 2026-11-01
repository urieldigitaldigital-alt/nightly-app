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

- [ ] Confirmar dónde se hostean `terms.html`/`privacy.html` — la opción más simple es servirlos desde el mismo proyecto Vercel ya en producción (`nightly-app-seven.vercel.app/terms` y `/privacy`). Si preferís otro dominio, avisame.
- [ ] Una vez tengan URL final, las voy a pegar en la app (Configuración > Legal) y en App Store Connect (campo "Privacy Policy URL").

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
*Última actualización: Fase 0.*
