# Pendientes manuales — cosas que solo podés hacer vos

Nada de esto lo puede hacer el código por sí solo: son credenciales, cuentas de terceros y configuración de dashboards.

Ordenado por lo que bloquea el envío primero.

---

## 🔴 Bloqueante — compilar el binario

El código está listo, pero **el build nativo todavía no se compiló ni una vez**, y hasta que eso pase no hay binario para enviar.

En esta Mac no se pudo compilar localmente: CocoaPods necesita Ruby ≥ 3.3 y el Ruby del sistema es 2.6, cuyos headers Apple ya quitó de Xcode 27. Dos caminos:

**Opción A — build en la nube con EAS (recomendado, no toca tu Mac)**

```bash
npx eas login
```
```bash
npx eas build --platform ios --profile production
```

EAS compila en sus servidores, donde el toolchain ya está armado. Es también el camino para el que `eas.json` ya está configurado.

**Opción B — compilar local (si querés poder probar en el simulador)**

Instalar un Ruby moderno con Homebrew y después CocoaPods:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
```bash
brew install ruby cocoapods && npx expo run:ios
```

> Avisame cuando tengas una de las dos andando y seguimos desde ahí: si el build tira algún error de compilación del módulo nativo del mapa, lo arreglo.

---

## ✅ Migraciones de base de datos — HECHO

Las siete (`0019` a `0025`) se aplicaron en el proyecto **nightly** (org Clubbgayoso),
en una sola transacción. Verificado con `node scripts/check-migrations.mjs`.

El filtro de contenido quedó probado contra la base real:

| Texto | Resultado |
|---|---|
| `vendo merca en la previa` | blocked |
| `v3nd0 c0c41n4` (leetspeak) | blocked |
| `Previa tranqui, traigan birra` | pasa |
| `che boludo venite` | pasa |
| `fiesta con desnudos artisticos` | flagged |
| usuario `admin` | reservado |

107 términos cargados en `moderation_terms`.

> **Ojo con la cuenta**: el proyecto vive en una cuenta de Supabase distinta de la
> que se abre por defecto. Si el dashboard dice *"You do not have access to this
> project"*, estás en la cuenta equivocada — hay que entrar con la que es dueña de
> la organización **Clubbgayoso**.

---

## 🔴 Bloqueante — Edge Functions

```bash
npx supabase functions deploy delete-account
```
```bash
npx supabase functions deploy apple-link
```
```bash
npx supabase functions deploy login
```

> `login` es la que permite entrar con nombre de usuario. Sin desplegarla, el login con email sigue funcionando igual, pero el de usuario devuelve error.

---

## 🟡 Sign in with Apple (código listo, faltan las credenciales)

Apple exige revocar el permiso cuando alguien borra su cuenta. El código ya lo hace; necesita cuatro datos.

1. [ ] En **developer.apple.com** → Identifiers → tu App ID (`com.afterdune.app`): habilitar **"Sign In with Apple"**.
2. [ ] Crear un **Services ID** nuevo (distinto del bundle ID), para usar como client ID en Supabase.
3. [ ] Crear una **Key** (Keys → "+") con "Sign In with Apple" habilitado y descargar el `.p8`. **Solo se puede descargar una vez.**
4. [ ] En **Supabase** → Authentication → Providers → Apple: pegar Services ID, Team ID, Key ID y el contenido del `.p8`.

   > ⚠️ **Antes de escribir nada, borrá los dos campos.** Chrome autocompleta ese
   > formulario con basura de su gestor de contraseñas: se vio "Client IDs" relleno
   > con `practicomoderno-rgb's Project` y "Secret Key" con una contraseña guardada
   > cualquiera. Si se guarda así, el login con Apple falla y el error no dice por qué.
5. [ ] En **Supabase** → Edge Functions → Secrets, cargar:
   - `APPLE_TEAM_ID`
   - `APPLE_KEY_ID`
   - `APPLE_CLIENT_ID` (el bundle ID `com.afterdune.app` para el login nativo de iOS)
   - `APPLE_PRIVATE_KEY` (el contenido completo del `.p8`, con las líneas `-----BEGIN/END PRIVATE KEY-----`)

> Sin estos secrets la app funciona igual y la cuenta se borra igual: lo único que no pasa es la notificación de revocación a Apple. El código degrada solo y deja el aviso en el log, nunca falla el borrado.

---

## ✅ Configuración de Supabase Auth — HECHO lo que bloqueaba

- [x] **"Confirm email"**: ya estaba activado. (La versión anterior de este archivo decía que estaba apagado; estaba desactualizada.)
- [x] **Plantilla "Confirm sign up"**: reescrita con el código de 6 dígitos en grande (`{{ .Token }}`, verde sobre panel oscuro, con "vence en 1 hora") y el botón del link debajo como alternativa. Antes mandaba **solo el link**, así que quien se registraba no tenía manera de completar la pantalla que le pide el código.
      Todo el texto va con entidades HTML (`&aacute;` en vez de `á`): pegar acentos directo en el editor de Supabase los rompe (quedan como `Confirm√°`).

Queda pendiente, pero no bloquea el envío:

- [ ] Revisar las otras plantillas (Reset password, Magic link, Invite, Change email) por si todavía dicen "NIGHTLY".
- [ ] Configurar SMTP propio con SPF/DKIM para que los mails no caigan en spam.

---

## 🟡 Cuenta demo para el revisor

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed-reviewer-demo.mjs
```

La service role key está en Supabase → Project Settings → API. El script crea dos cuentas, publica una fiesta, deja una solicitud pendiente y una conversación con mensajes, y al final imprime el usuario y la contraseña para pegar en App Store Connect.

Es idempotente: se puede correr de nuevo antes de cada envío.

---

## 🟡 Dominio de los legales

Hoy apuntan a `nightly-app-seven.vercel.app`, que todavía dice "nightly" aunque la app se llame Afterdune.

- [ ] Decidir si se queda así o se migra a `afterdune.app`.
- [ ] Si se migra: cambiar `webUrl`, `termsUrl` y `privacyUrl` en `constants/brand.ts`, redesplegar, y recién ahí pegar las URLs en App Store Connect.

---

## 🟢 App Store Connect

Todo el texto a pegar está en `APP_STORE_CONNECT.md`.

- [ ] Crear el registro de la app (nombre, bundle ID, categorías).
- [ ] Clasificación de edad → tiene que dar **17+** (respuestas en la sección 2).
- [ ] Cuestionario de App Privacy (respuestas en la sección 6).
- [ ] Pegar las notas del revisor con las credenciales demo (sección 3).
- [ ] Capturas de pantalla: hacen falta de iPhone 6.9" y 6.5", y de iPad 13" (porque `supportsTablet` está en true).
- [ ] Enviar a revisión.

---

## 🟢 EAS

- [ ] Completar `ascAppId` y `appleTeamId` en `eas.json` → `submit.production.ios` (hoy tienen un texto de relleno). El `ascAppId` sale de la URL de la app en App Store Connect.

---
*Última actualización: pasada completa de preparación para la App Store.*
