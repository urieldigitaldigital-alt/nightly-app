# Plantillas de correo de autenticación

Los correos que manda Supabase cuando alguien se registra, pide recuperar la
contraseña o cambia su email. Se editan acá y se pegan en el panel:

**Authentication → Emails → Templates**, uno por uno.

Supabase no los lee del repo: hay que pegarlos a mano. Están versionados igual
para que exista una única fuente de verdad y para poder ver qué cambió.

## Por qué están escritos así

El HTML de un correo no es el de una página. Lo que parece exagerado abajo es
lo que hace que el correo se vea igual en Gmail, en Outlook y en Mail de iOS:

- **Tablas en vez de flex o grid.** Outlook usa el motor de Word para
  maquetar, y no entiende ninguno de los dos.
- **Estilos en línea, no en `<style>`.** Gmail descarta buena parte de los
  bloques `<style>` cuando reenviás un correo.
- **El logo por URL absoluta y pública**, servido desde el sitio en Vercel.
  Un `data:` URI lo bloquean casi todos los clientes, y una ruta relativa no
  tiene contra qué resolverse dentro de un correo.
- **El botón también como enlace de texto abajo.** Muchos clientes no cargan
  imágenes ni estilos hasta que la persona lo autoriza; si el único camino
  fuera el botón, el correo quedaría inservible hasta ese momento.
- **Fondo oscuro con `bgcolor` además del CSS**, porque algunos clientes
  antiguos ignoran `background-color` en `<td>`.

## Variables

Las reemplaza Supabase al enviar:

| Variable | Qué trae |
|---|---|
| `{{ .ConfirmationURL }}` | El enlace de acción (confirmar, recuperar, etc.) |
| `{{ .Token }}` | El código de seis dígitos, alternativa al enlace |
| `{{ .Email }}` | El correo de quien recibe |
| `{{ .SiteURL }}` | La URL del sitio configurada en el proyecto |

## Archivos

| Archivo | Plantilla de Supabase |
|---|---|
| `confirm-signup.html` | Confirm sign up |
| `reset-password.html` | Reset password |
| `magic-link.html` | Magic link or OTP |
| `change-email.html` | Change email address |

## Lo que falta para que esto sirva de verdad

El remitente está en `onboarding@resend.dev`, que es la dirección de prueba
de Resend: **solo entrega al correo del dueño de la cuenta**. Mientras siga
así, ninguna persona que no seas vos va a recibir estos correos, por más
lindos que queden. Hay que verificar el dominio en Resend y mandar desde una
dirección propia.
