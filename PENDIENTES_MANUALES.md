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

## Edge Functions — una desplegada, dos esperando a Apple

- [x] **`login`** — desplegada desde el editor del dashboard y probada contra
      producción (usuario inexistente → 401, falta contraseña → 400). El ingreso
      con nombre de usuario ya funciona.
- [ ] **`apple-link`** y **`delete-account`** — no tiene sentido desplegarlas
      todavía: las dos dependen de los secrets de Apple y sin ellos no hacen nada
      (degradan con un aviso en el log). Además importan `../_shared/apple.ts`,
      que el editor del dashboard no puede resolver porque vive fuera de la
      carpeta de la función. Se despliegan con el CLI junto con los secrets:

      npx supabase login && npx supabase functions deploy apple-link delete-account

      La versión de `delete-account` que está en producción hoy borra cuentas
      correctamente; lo único que le falta es avisarle a Apple.

### Referencia: desplegar desde el dashboard

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

## 🟡 Sign in with Apple — falta solo la Key

Hecho en developer.apple.com (cuenta **Nara Bertini**, Team ID `26FHY23TDL`):

- [x] App ID **`com.afterdune.app`** creado, con **Sign In with Apple** (como
      primary App ID) y **Push Notifications** habilitados.
- [x] Services ID **`com.afterdune.signin`** creado y configurado:
      primary App ID `com.afterdune.app`, dominio
      `hsuiitkeihiyaezixgop.supabase.co` y return URL
      `https://hsuiitkeihiyaezixgop.supabase.co/auth/v1/callback`.

### Lo que falta, y es tuyo

La **Key** no la crea nadie más que vos, porque el `.p8` **se descarga una sola
vez en la vida**: si se crea y no se baja en ese momento queda inservible y
encima ocupa uno de los pocos espacios de key de la cuenta. Además es la clave
con la que se firman los tokens de la app — quien la tenga puede hacerse pasar
por Afterdune.

1. [ ] developer.apple.com → **Keys** → **+**, nombre "Afterdune Sign In",
       marcar **Sign In with Apple**, elegir `com.afterdune.app` como primary
       App ID, y **descargar el `.p8`**. Guardalo en un lugar seguro (está en
       `.gitignore`, no lo pongas en el repo).
2. [ ] Anotá el **Key ID** (lo muestra Apple al crearla, 10 caracteres).
3. [ ] **Supabase** → Authentication → Providers → **Apple**:
       - ⚠️ **Borrá los dos campos antes de escribir.** Chrome los autocompleta
         con basura de su gestor de contraseñas (se vio `practicomoderno-rgb's
         Project` en "Client IDs"). Si se guarda así, el login con Apple falla
         sin decir por qué.
       - **Client IDs**: `com.afterdune.app,com.afterdune.signin`
         (los dos, separados por coma y sin espacio: el primero es el login
         nativo de iOS, el segundo el de web.)
       - **Secret Key**: el contenido completo del `.p8`.
       - Activar **Enable Sign in with Apple** y guardar.
4. [ ] **Supabase** → Edge Functions → **Secrets**:
       - `APPLE_TEAM_ID` = `26FHY23TDL`
       - `APPLE_KEY_ID` = el del paso 2
       - `APPLE_CLIENT_ID` = `com.afterdune.app`
       - `APPLE_PRIVATE_KEY` = el contenido del `.p8`, con las líneas
         `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----` incluidas.

Para comprobar que quedó bien, sin abrir la app:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://hsuiitkeihiyaezixgop.supabase.co/auth/v1/authorize?provider=apple&redirect_to=https://example.com"
```

`302` = funciona. `400` = sigue deshabilitado.

## ✅ Configuración de Supabase Auth — HECHO lo que bloqueaba

- [x] **"Confirm email"**: ya estaba activado. (La versión anterior de este archivo decía que estaba apagado; estaba desactualizada.)
- [x] **Plantilla "Confirm sign up"**: reescrita con el código de 6 dígitos en grande (`{{ .Token }}`, verde sobre panel oscuro, con "vence en 1 hora") y el botón del link debajo como alternativa. Antes mandaba **solo el link**, así que quien se registraba no tenía manera de completar la pantalla que le pide el código.
      Todo el texto va con entidades HTML (`&aacute;` en vez de `á`): pegar acentos directo en el editor de Supabase los rompe (quedan como `Confirm√°`).

Queda pendiente, pero no bloquea el envío:

- [ ] Revisar las otras plantillas (Reset password, Magic link, Invite, Change email) por si todavía dicen "NIGHTLY".
- [ ] Configurar SMTP propio con SPF/DKIM para que los mails no caigan en spam.

---

## ✅ Cuenta demo para el revisor — HECHA

Creada en producción y verificada de punta a punta.

| Campo de App Store Connect | Valor |
|---|---|
| Sign-In required | Sí |
| User name | `appreview@afterdune.app` |
| Password | `AppReview2026!` |

Contenido que ya tiene cargado: una fiesta publicada ("Previa frente al mar",
a 50 km de Pinamar), una solicitud de asistencia pendiente y una conversación
con tres mensajes con la segunda cuenta (`demo.host@afterdune.app`,
`@lucia_demo`).

Verificado: entra por email **y** por `@appreview` (login con nombre de
usuario), el perfil está completo y el onboarding marcado como hecho, así que
el revisor cae directo en el feed.

Para refrescarla antes de un envío:

```bash
node scripts/seed-reviewer-demo.mjs
```

Es idempotente: reutiliza la fiesta y no vuelve a escribir los mensajes. Sin
`SUPABASE_SERVICE_ROLE_KEY` corre igual, en modo solo-contenido, usando las
cuentas que ya existen.

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
