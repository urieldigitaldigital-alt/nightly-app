// Genera las plantillas de correo a partir de una sola estructura.
//
// Los cuatro correos son el mismo diseño con distinto texto. Tenerlos como
// cuatro archivos escritos a mano garantizaba que, al cambiar un color o el
// pie, tres quedaran viejos sin que nadie se diera cuenta hasta verlo en una
// bandeja de entrada.
//
// Correr con:  node supabase/templates/build.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// El logo tiene que ser una URL pública y absoluta: los clientes de correo
// bloquean los `data:` URI y no tienen contra qué resolver una ruta relativa.
const SITE = 'https://nightly-app-seven.vercel.app';
const LOGO = `${SITE}/icon-192.png`;

const ACCENT = '#22D3EE';
const ON_ACCENT = '#031016';
const BG = '#05070A';
const CARD = '#0B1015';
const TEXT = '#FFFFFF';
const TEXT_2 = '#A3B1C2';
const TEXT_3 = '#64748B';
const LINE = 'rgba(255,255,255,0.08)';

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * @param {object} o
 * @param {string} o.name      Nombre de la plantilla en Supabase
 * @param {string} o.file      Archivo de salida
 * @param {string} o.heading   Titular
 * @param {string} o.body      Párrafo de introducción
 * @param {string} o.cta       Texto del botón
 * @param {boolean} o.showCode Si muestra el código de seis dígitos
 * @param {string} o.footnote  Aclaración final (vencimiento, qué hacer si no fuiste vos)
 */
function render(o) {
  return `<!-- Afterdune — ${o.name} -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}" style="background-color:${BG};margin:0;padding:32px 12px;font-family:${FONT};">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

        <tr>
          <td align="center" style="padding-bottom:24px;">
            <img src="${LOGO}" width="72" height="72" alt="Afterdune" style="display:block;border:0;border-radius:18px;" />
          </td>
        </tr>

        <tr>
          <td bgcolor="${CARD}" style="background-color:${CARD};border:1px solid ${LINE};border-radius:24px;padding:36px 32px;">

            <p style="margin:0 0 8px;color:${ACCENT};font-size:13px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;">Afterdune</p>

            <h1 style="margin:0 0 16px;color:${TEXT};font-size:26px;line-height:32px;font-weight:700;">${o.heading}</h1>

            <p style="margin:0 0 24px;color:${TEXT_2};font-size:15px;line-height:23px;">${o.body}</p>

            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
              <tr>
                <td bgcolor="${ACCENT}" style="background-color:${ACCENT};border-radius:999px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:15px 36px;color:${ON_ACCENT};font-size:15px;font-weight:700;text-decoration:none;border-radius:999px;">${o.cta}</a>
                </td>
              </tr>
            </table>
${
  o.showCode
    ? `
            <!-- El código sirve cuando el enlace se rompe al pasar por un
                 filtro corporativo, que es más común de lo que parece. -->
            <p style="margin:0 0 6px;color:${TEXT_3};font-size:13px;line-height:20px;">O ingresá este código en la app:</p>
            <p style="margin:0 0 24px;color:${TEXT};font-size:26px;font-weight:700;letter-spacing:6px;font-family:'SF Mono',Menlo,Consolas,monospace;">{{ .Token }}</p>
`
    : ''
}
            <hr style="border:0;border-top:1px solid ${LINE};margin:0 0 20px;" />

            <p style="margin:0 0 12px;color:${TEXT_3};font-size:12px;line-height:19px;">
              Si el botón no funciona, copiá y pegá este enlace en tu navegador:
            </p>
            <p style="margin:0 0 20px;font-size:12px;line-height:19px;word-break:break-all;">
              <a href="{{ .ConfirmationURL }}" style="color:${ACCENT};text-decoration:underline;">{{ .ConfirmationURL }}</a>
            </p>

            <p style="margin:0;color:${TEXT_3};font-size:12px;line-height:19px;">${o.footnote}</p>

          </td>
        </tr>

        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0 0 6px;color:${TEXT_3};font-size:12px;">Afterdune · Pinamar y la Costa Atlántica</p>
            <p style="margin:0;font-size:12px;">
              <a href="${SITE}/privacy.html" style="color:${TEXT_3};text-decoration:underline;">Privacidad</a>
              &nbsp;·&nbsp;
              <a href="${SITE}/terms.html" style="color:${TEXT_3};text-decoration:underline;">Términos</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
`;
}

const TEMPLATES = [
  {
    name: 'Confirm sign up',
    file: 'confirm-signup.html',
    heading: 'Confirmá tu cuenta',
    body: 'Tocá el botón para activar tu cuenta y empezar a ver las previas, los afters y los boliches que hay cerca tuyo.',
    cta: 'Confirmar mi cuenta',
    showCode: true,
    footnote:
      'El enlace vence en 24 horas. Si no creaste ninguna cuenta en Afterdune, ignorá este correo: sin confirmar, no se activa nada.',
  },
  {
    name: 'Reset password',
    file: 'reset-password.html',
    heading: 'Recuperá tu contraseña',
    body: 'Pediste cambiar la contraseña de tu cuenta. Tocá el botón para elegir una nueva.',
    cta: 'Cambiar mi contraseña',
    showCode: true,
    footnote:
      'El enlace vence en una hora. Si no pediste esto, podés ignorar el correo: tu contraseña actual sigue funcionando y nadie puede cambiarla sin este enlace.',
  },
  {
    name: 'Magic link or OTP',
    file: 'magic-link.html',
    heading: 'Tu acceso a Afterdune',
    body: 'Tocá el botón para entrar a tu cuenta. No hace falta contraseña.',
    cta: 'Entrar a Afterdune',
    showCode: true,
    footnote:
      'El enlace vence en una hora y sirve una sola vez. Si no pediste entrar, ignorá este correo y no compartas el código con nadie.',
  },
  {
    name: 'Change email address',
    file: 'change-email.html',
    heading: 'Confirmá tu correo nuevo',
    body: 'Pediste cambiar el correo de tu cuenta a esta dirección. Tocá el botón para confirmarlo.',
    cta: 'Confirmar el cambio',
    showCode: false,
    footnote:
      'Hasta que confirmes, tu cuenta sigue usando el correo anterior. Si no pediste este cambio, ignorá el correo y revisá tu cuenta.',
  },
];

for (const t of TEMPLATES) {
  writeFileSync(join(HERE, t.file), render(t), 'utf8');
  console.log(`✓ ${t.file}`);
}
