/**
 * Filtro de contenido objetable (App Store Guideline 1.2 — User-Generated
 * Content).
 *
 * Apple pide, para cualquier app con contenido generado por usuarios, "un
 * método para filtrar contenido objetable". Esto es ese método del lado del
 * cliente: da feedback inmediato al usuario mientras escribe. La red de
 * seguridad real está en la base de datos (`supabase/migrations/0023_content_moderation.sql`),
 * que corre la misma lógica en un trigger y por lo tanto no se puede saltear
 * con un cliente modificado.
 *
 * Dos niveles, a propósito:
 *
 * - `blocked`  → no se publica nunca. Reservado para lo que Apple considera
 *                inaceptable sin matices: insultos discriminatorios, contenido
 *                sexual con menores, oferta de sexo pago o de drogas, amenazas
 *                explícitas.
 * - `flagged`  → se publica, pero crea un reporte automático para que
 *                moderación lo revise. Para lo que es grosero pero no
 *                necesariamente una violación.
 *
 * Lo que NO se filtra, también a propósito: el insulto coloquial rioplatense
 * ("boludo", "pelotudo", "la concha de la lora") es registro cotidiano acá y
 * bloquearlo volvería la app inusable sin aportar nada a la seguridad. El
 * objetivo es el daño, no la grosería.
 */

export type ModerationSeverity = 'blocked' | 'flagged';

export type ModerationResult =
  | { ok: true }
  | { ok: false; severity: ModerationSeverity; matched: string; message: string };

/**
 * Términos que impiden publicar. Se comparan contra el texto normalizado
 * (sin acentos, sin leetspeak, sin caracteres de relleno), así que acá van en
 * su forma "plana": sin tildes y en minúscula.
 */
const BLOCKED_TERMS: readonly string[] = [
  // Insultos discriminatorios — raciales, étnicos y religiosos
  'negro de mierda',
  'negros de mierda',
  'sudaca',
  'nigger',
  'nigga',
  'negrata',
  'spic',
  'kike',
  'chink',
  'paki de mierda',
  'bolita de mierda',
  'paragua de mierda',
  'peruca de mierda',
  'judio de mierda',
  'judios de mierda',
  'heil hitler',
  'sieg heil',
  'white power',
  'muerte a los judios',
  'camara de gas',

  // Insultos discriminatorios — orientación sexual e identidad de género
  'puto de mierda',
  'putos de mierda',
  'trava de mierda',
  'travesti de mierda',
  'faggot',
  'tranny',
  'maricon de mierda',
  'maricones de mierda',
  'muerte a los putos',

  // Capacidad / salud mental usados como agravio
  'mogolico de mierda',
  'retrasado mental de mierda',

  // Contenido sexual con menores — tolerancia cero
  'pornografia infantil',
  'porno infantil',
  'pedofilia',
  'pedofilo',
  'child porn',
  'childporn',
  'cp infantil',
  'menores desnudos',
  'nena virgen',
  'nene virgen',
  'loli hentai',
  'jailbait',

  // Oferta de sexo pago / explotación
  'sexo por plata',
  'sexo por dinero',
  'trabajo sexual pago',
  'escort disponible',
  'escorts disponibles',
  'prostitucion',
  'prostituta disponible',
  'trata de personas',

  // Venta de drogas
  'vendo cocaina',
  'venta de cocaina',
  'vendo merca',
  'venta de merca',
  'vendo falopa',
  'vendo pastillas',
  'vendo extasis',
  'vendo mdma',
  'vendo lsd',
  'vendo tusi',
  'vendo porro',
  'vendo marihuana',
  'venta de marihuana',
  'dealer disponible',
  'paso merca',
  'consigo merca',
  'consigo falopa',

  // Amenazas y violencia explícita
  'te voy a matar',
  'los voy a matar',
  'te voy a violar',
  'la voy a violar',
  'lo voy a violar',
  'te voy a cagar a tiros',
  'voy a tirar un tiro',
  'bomba en el lugar',
  'poner una bomba',
  'tiroteo masivo',
  'i will kill you',
  'kill yourself',
  'matate',
  'andate a matar',
  'suicidate',
];

/**
 * Términos que se publican pero quedan marcados para revisión manual.
 * Sexo explícito, drogas y violencia mencionados sin ser una oferta directa:
 * puede ser legítimo (una fiesta temática, una advertencia) o no, y eso lo
 * decide una persona, no una lista de palabras.
 */
const FLAGGED_TERMS: readonly string[] = [
  'cocaina',
  'merca',
  'falopa',
  'tusi',
  'ketamina',
  'mdma',
  'extasis',
  'lsd',
  'crack',
  'heroina',
  'metanfetamina',
  'orgia',
  'sexo grupal',
  'swinger',
  'desnudos',
  'desnudas',
  'striptease',
  'solo mujeres lindas',
  'solo chicas lindas',
  'sin ropa',
  'arma',
  'armas',
  'cuchillo',
  'pelea arreglada',
];

/**
 * Secuencias que, de aparecer, suelen venir de un intento de ofuscación más
 * que de una palabra real. Se usan solo para la pasada "sin separadores".
 */
const SEPARATOR_RUN = /[\s._\-*+~'"`^|/\\()[\]{}<>:;,!?#]+/g;

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '¡': 'i',
  '!': 'i',
};

/**
 * Lleva el texto a una forma comparable: minúsculas, sin acentos, sin
 * leetspeak y sin letras repetidas de relleno ("puuuuto" → "puto").
 *
 * La reducción de repeticiones deja como máximo dos letras iguales seguidas
 * porque el español las usa de verdad ("perro", "ella") — tres o más siempre
 * son énfasis u ofuscación.
 */
export function normalizeForModeration(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    // Quita los diacríticos que NFD acaba de separar de su letra base.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$¡!]/g, (c) => LEET_MAP[c] ?? c)
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escapa un término para usarlo dentro de un RegExp literal. */
function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Busca un término respetando límites de palabra, para que "arma" no se active
 * con "armario" ni "crack" con "cracker".
 *
 * No alcanza con `\b` de JavaScript: funciona sobre `[A-Za-z0-9_]`, y el texto
 * ya viene normalizado sin acentos, así que la ñ es el único caso raro —
 * se la trata como letra con la clase explícita de abajo.
 */
function containsTerm(haystack: string, term: string): boolean {
  const pattern = new RegExp(`(^|[^a-z0-9ñ])${escapeRegExp(term)}($|[^a-z0-9ñ])`, 'i');
  return pattern.test(haystack);
}

/** Reduce toda repetición a una sola letra: "puuuuto" → "puto", "perro" → "pero". */
function squashRepeats(text: string): string {
  return text.replace(/(.)\1+/g, '$1');
}

function findMatch(normalized: string, collapsed: string, terms: readonly string[]): string | null {
  // `normalizeForModeration` deja hasta dos letras iguales seguidas porque el
  // español las usa de verdad, pero eso significa que "puuuuto" llega acá como
  // "puuto" y no coincide con "puto". Esta tercera forma aplasta las
  // repeticiones de los dos lados a la vez, así que "perro" → "pero" no
  // importa: ningún término de la lista se escribe así tampoco.
  const squashed = squashRepeats(normalized);

  for (const term of terms) {
    if (containsTerm(normalized, term)) return term;
    if (containsTerm(squashed, squashRepeats(term))) return term;
    // Última pasada contra el texto sin separadores, que atrapa
    // "p.u.t.o d.e m.i.e.r.d.a". Solo para términos largos: en el texto
    // colapsado desaparecen los límites de palabra, y un término corto daría
    // falsos positivos con facilidad.
    const collapsedTerm = term.replace(/\s+/g, '');
    if (collapsedTerm.length >= 8 && collapsed.includes(collapsedTerm)) return term;
  }
  return null;
}

const BLOCKED_MESSAGE =
  'Este texto no se puede publicar: incluye lenguaje discriminatorio, sexual o violento que va contra las normas de la comunidad. Editalo para continuar.';

/**
 * Evalúa un texto libre escrito por un usuario.
 *
 * @param text  El contenido a revisar.
 * @param opts.allowFlagged  Si es `true` (el valor por defecto), el contenido
 *   de nivel `flagged` pasa y se marca para revisión en vez de rechazarse.
 */
export function moderateText(text: string, opts: { allowFlagged?: boolean } = {}): ModerationResult {
  const { allowFlagged = true } = opts;
  if (!text || !text.trim()) return { ok: true };

  const normalized = normalizeForModeration(text);
  const collapsed = normalized.replace(SEPARATOR_RUN, '');

  const blocked = findMatch(normalized, collapsed, BLOCKED_TERMS);
  if (blocked) {
    return { ok: false, severity: 'blocked', matched: blocked, message: BLOCKED_MESSAGE };
  }

  const flagged = findMatch(normalized, collapsed, FLAGGED_TERMS);
  if (flagged && !allowFlagged) {
    return { ok: false, severity: 'flagged', matched: flagged, message: BLOCKED_MESSAGE };
  }

  return { ok: true };
}

/**
 * `true` si el texto debería quedar en la cola de revisión manual aunque se
 * haya publicado. Lo usan los servicios para abrir un reporte automático.
 */
export function needsModerationReview(text: string): boolean {
  if (!text || !text.trim()) return false;
  const normalized = normalizeForModeration(text);
  const collapsed = normalized.replace(SEPARATOR_RUN, '');
  return findMatch(normalized, collapsed, FLAGGED_TERMS) !== null;
}

/**
 * Revisa varios campos de una vez y devuelve el primer problema, con el
 * nombre del campo para poder señalarlo en el formulario.
 */
export function moderateFields(
  fields: Record<string, string | null | undefined>
): { ok: true } | { ok: false; field: string; message: string } {
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    const result = moderateText(value);
    if (!result.ok) return { ok: false, field, message: result.message };
  }
  return { ok: true };
}

/** Clase de error que los servicios lanzan cuando el filtro rechaza un texto. */
export class ContentBlockedError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ContentBlockedError';
    this.field = field;
  }
}
