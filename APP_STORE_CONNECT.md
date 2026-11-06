# App Store Connect — todo lo que hay que pegar

Este archivo es para copiar y pegar. Cada sección corresponde a un campo real del formulario de App Store Connect.

---

## 1. Información de la app

| Campo | Valor |
|---|---|
| Nombre | Afterdune |
| Subtítulo | Previas y fiestas cerca tuyo |
| Bundle ID | `com.afterdune.app` |
| Categoría principal | Redes sociales |
| Categoría secundaria | Estilo de vida |
| Idioma principal | Español (México) o Español (España) — no existe "Español (Argentina)" |

---

## 2. Clasificación por edad

Responder el cuestionario así. El resultado tiene que dar **17+**.

| Pregunta | Respuesta |
|---|---|
| Alcohol, tabaco o drogas (referencias) | Poco frecuente/leve |
| Contenido sexual o desnudos | Ninguno |
| Violencia animada o de fantasía | Ninguno |
| Violencia realista | Ninguno |
| Temas de terror | Ninguno |
| Juegos de azar | No |
| Contenido generado por usuarios sin restricciones | **Sí** |
| La app permite controles parentales | No |

> El "Sí" en contenido generado por usuarios es el que obliga a tener filtro, denuncia, bloqueo y EULA de tolerancia cero. Todo eso está implementado — ver sección 6.

---

## 3. Notas para el revisor (campo "Notes")

```
Afterdune es una app para descubrir y organizar fiestas y previas en la Costa
Atlántica argentina. La app está íntegramente en español (rioplatense).

CUENTA DE PRUEBA
La cuenta de prueba ya tiene contenido cargado: una fiesta publicada, una
solicitud de asistencia pendiente y una conversación con mensajes, para que
puedan recorrer todas las funciones sin tener que crear nada.

CÓMO PROBAR LAS FUNCIONES PRINCIPALES
1. Descubrir: pestaña "Descubrir". Si no aparecen fiestas, tocar la ubicación
   arriba a la izquierda y elegir "Pinamar" a mano — la app no depende del GPS
   para funcionar.
2. Mapa: pestaña "Mapa". El botón de la flecha, abajo a la derecha, pide el
   permiso de ubicación y activa el modo seguimiento.
3. Publicar una fiesta: botón "+" del centro, 4 pasos.
4. Chat: pestaña "Chat" → la conversación con Lucía Demo.

ELIMINACIÓN DE CUENTA (Guideline 5.1.1(v))
Perfil → ícono de engranaje → Cuenta → "Eliminar cuenta". Pide escribir
ELIMINAR para confirmar. Borra el perfil, las fiestas, los mensajes y las
fotos, elimina el usuario de autenticación y revoca el permiso de Sign in with
Apple contra el endpoint de revocación de Apple.

CONTENIDO GENERADO POR USUARIOS (Guideline 1.2)
- Filtro automático: todo texto publicado (fiestas, biografías, nombres de
  usuario y mensajes) pasa por un filtro de contenido, tanto en el cliente como
  en un trigger de base de datos. Para verlo funcionando, intenten publicar
  una fiesta con lenguaje discriminatorio: se rechaza con un mensaje explícito.
- Denunciar: botón de bandera en cada fiesta; menú "..." en cada perfil;
  mantener presionado un mensaje de chat recibido.
- Bloquear: desde el perfil, desde el chat y desde la fiesta, con confirmación.
- EULA de tolerancia cero: casilla obligatoria y separada en el registro, y
  texto permanente en Configuración → Legal → Normas de la comunidad.
- Compromiso de respuesta: revisamos toda denuncia dentro de las 24 horas.

EDAD MÍNIMA
La app es solo para mayores de 18. Se pide fecha de nacimiento en el registro y
la base de datos rechaza cualquier perfil menor de edad con una restricción
(no es solo una validación del cliente).

UBICACIÓN
Solo "mientras se usa la app". Nunca en segundo plano. La dirección exacta de
una fiesta solo se le muestra a quien el organizador ya aceptó; al resto se le
muestra un punto desplazado al azar.

Contacto: soporte@afterdune.app
```

> **Antes de enviar**: correr `node scripts/seed-reviewer-demo.mjs` (ver sección 7) y pegar el usuario y la contraseña que imprime en los campos "Sign-In required → User name / Password".

---

## 4. Descripción (campo "Description")

```
Afterdune es donde arranca la noche en la Costa.

Descubrí previas, fiestas y eventos que están pasando cerca tuyo, dentro del
radio que vos elijas. Pinamar, Cariló, Ostende, Valeria del Mar, Villa Gesell
y toda la Costa Atlántica.

QUÉ PODÉS HACER

Encontrar planes cerca
Un mapa en vivo y un feed ordenado por distancia, fecha o popularidad. Filtrá
por tipo: previa, after, quinta, bar, boliche.

Pedir lugar y que te confirmen
Nada de direcciones dando vueltas por grupos de WhatsApp. Pedís lugar, el
organizador confirma, y recién ahí te aparece la dirección exacta.

Llegar sin perderte
Navegación paso a paso con tu ubicación en vivo, tiempo estimado real y la
opción de compartir dónde estás con el organizador mientras vas en camino.

Organizar la tuya
Publicá tu fiesta en cuatro pasos, poné un cupo, revisá quién pide lugar y
aceptá a quien quieras. Tu dirección exacta queda privada hasta que vos
decidís.

Hablar con quien va
Chat en tiempo real, uno a uno o grupal, con fotos.

SEGURIDAD
Afterdune es solo para mayores de 18 años. Tenemos tolerancia cero con el
contenido objetable y los usuarios abusivos: filtro automático de contenido,
denuncia desde cualquier pantalla, bloqueo inmediato y revisión de todas las
denuncias dentro de las 24 horas.

Afterdune no organiza los eventos publicados por usuarios. Usá tu criterio,
avisale a alguien de confianza adónde vas y no compartas tu dirección con
desconocidos.
```

## 5. Palabras clave (campo "Keywords", máximo 100 caracteres)

```
fiestas,previas,eventos,noche,boliche,after,pinamar,carilo,gesell,costa,salir,juntada
```

(85 caracteres de 100. Sin espacios después de las comas: Apple los cuenta.)

## Texto promocional (campo "Promotional Text", máximo 170 caracteres)

```
Temporada 2026 en la Costa. Encontrá previas y fiestas cerca tuyo, pedí lugar y llegá sin perderte. Solo para mayores de 18.
```

## URL de soporte y de marketing

| Campo | Valor |
|---|---|
| Support URL | https://nightly-app-seven.vercel.app |
| Privacy Policy URL | https://nightly-app-seven.vercel.app/privacy.html |
| Marketing URL (opcional) | https://nightly-app-seven.vercel.app |

> ⚠️ Si vas a usar un dominio propio (`afterdune.app`), cambialo primero en `constants/brand.ts` y volvé a desplegar, porque esas URLs también son las que la app abre desde Configuración.

---

## 6. Cuestionario de App Privacy

Para cada tipo de dato: **sí se recolecta**, **se vincula a la identidad del usuario**, **no se usa para seguimiento**.

| Tipo de dato | ¿Se recolecta? | Propósito | Vinculado | Seguimiento |
|---|---|---|---|---|
| Dirección de email | Sí | Funcionalidad de la app | Sí | No |
| Nombre | Sí | Funcionalidad de la app | Sí | No |
| Ubicación precisa | Sí | Funcionalidad de la app | Sí | No |
| Fotos o videos | Sí | Funcionalidad de la app | Sí | No |
| Otro contenido del usuario | Sí | Funcionalidad de la app | Sí | No |
| ID de usuario | Sí | Funcionalidad de la app | Sí | No |
| Datos de uso | No | — | — | — |
| Identificadores de publicidad | No | — | — | — |
| Historial de compras | No | — | — | — |
| Datos de diagnóstico | No | — | — | — |

**"¿Usás datos para hacer seguimiento?"** → **No**.

> Estas respuestas tienen que coincidir con `ios.privacyManifests` en `app.config.ts`, que es lo que termina en el archivo `PrivacyInfo.xcprivacy` del binario. Si cambiás una, cambiá la otra.

### Sobre la foto de DNI

La app permite subir una foto del DNI para que el organizador verifique la identidad de quien asiste. En el cuestionario entra como **"Fotos o videos"** y además conviene aclararlo en las notas del revisor si Apple pregunta. La foto se guarda en un bucket privado, solo la ve el organizador de esa fiesta, y se borra automáticamente a los pocos días de terminado el evento.

---

## 7. Checklist de envío

Correr en este orden:

1. **Migraciones de base de datos** — en el SQL Editor de Supabase, en orden:
   - `supabase/migrations/0019_hide_blocked_from_discovery.sql`
   - `supabase/migrations/0020_expire_finished_events.sql`
   - `supabase/migrations/0021_live_locations.sql`
   - `supabase/migrations/0022_chat_images.sql`
   - `supabase/migrations/0023_content_moderation.sql`
   - `supabase/migrations/0024_apple_credentials.sql`
   - `supabase/migrations/0025_username_login.sql`

2. **Edge Functions**:
   ```bash
   npx supabase functions deploy delete-account
   ```
   ```bash
   npx supabase functions deploy apple-link
   ```
   ```bash
   npx supabase functions deploy login
   ```

3. **Secrets de las funciones** (Supabase → Edge Functions → Secrets):
   `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_CLIENT_ID`, `APPLE_PRIVATE_KEY`
   (el contenido del `.p8`, completo, incluyendo las líneas `-----BEGIN/END-----`).

4. **Cuenta demo**:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed-reviewer-demo.mjs
   ```

5. **Build y envío**:
   ```bash
   npx eas build --platform ios --profile production
   ```
   ```bash
   npx eas submit --platform ios --profile production
   ```

6. En App Store Connect: pegar las secciones 1 a 6 de este archivo, subir las capturas y enviar a revisión.
