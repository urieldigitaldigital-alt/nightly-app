import { moderateFields, moderateText, needsModerationReview, normalizeForModeration } from '../../lib/moderation';

describe('normalizeForModeration', () => {
  it('quita acentos y pasa a minúscula', () => {
    expect(normalizeForModeration('Pedófilo')).toBe('pedofilo');
    expect(normalizeForModeration('ORGÍA')).toBe('orgia');
  });

  it('traduce leetspeak', () => {
    expect(normalizeForModeration('p3d0f1l0')).toBe('pedofilo');
    expect(normalizeForModeration('c0c41n4')).toBe('cocaina');
  });

  it('colapsa letras repetidas pero deja las dobles reales', () => {
    expect(normalizeForModeration('puuuuuto')).toBe('puuto');
    expect(normalizeForModeration('perro')).toBe('perro');
    expect(normalizeForModeration('ella')).toBe('ella');
  });
});

describe('moderateText — bloquea lo que Apple considera inaceptable', () => {
  const blocked = [
    'vendo merca en la previa',
    'Hay pornografía infantil',
    'te voy a matar pendejo',
    'sos un negro de mierda',
    'fiesta con escorts disponibles',
    'consigo falopa para la noche',
    'puto de mierda andate',
  ];

  it.each(blocked)('rechaza: %s', (text) => {
    const result = moderateText(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.severity).toBe('blocked');
  });

  it('atrapa el texto ofuscado con separadores', () => {
    expect(moderateText('p.o.r.n.o.g.r.a.f.i.a infantil').ok).toBe(false);
    expect(moderateText('v3nd0 c0c41n4').ok).toBe(false);
  });

  it('atrapa el estiramiento de letras', () => {
    expect(moderateText('puuuuuto de mieeerda').ok).toBe(false);
    expect(moderateText('vendoooo mercaaa').ok).toBe(false);
  });

  it('devuelve un mensaje accionable, no un código', () => {
    const result = moderateText('vendo cocaina');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/no se puede publicar/i);
      expect(result.message).toMatch(/editalo/i);
    }
  });
});

describe('moderateText — no rompe el habla normal', () => {
  // Si alguno de estos fallara, el filtro estaría censurando a usuarios
  // legítimos, que es peor que dejar pasar un borderline: eso lo agarra la
  // revisión manual, esto se lleva puesto el producto.
  const allowed = [
    'Previa en lo de Juan, traigan birra',
    'Che boludo, venite que está buenísimo',
    'Fiesta en el armario de la abuela (es un chiste)',
    'Cumpleaños de Negro, el perro del barrio',
    'Vamos a la playa de Pinamar a las 23',
    'Cracker de queso y picada',
    'Llevá abrigo que refresca',
    'After en Cariló, entrada libre',
    'Armamos una juntada tranqui',
    'El cuchillo de la torta lo traigo yo',
  ];

  it.each(allowed)('permite: %s', (text) => {
    expect(moderateText(text).ok).toBe(true);
  });

  it('no confunde subcadenas con la palabra completa', () => {
    expect(moderateText('armario').ok).toBe(true);
    expect(moderateText('Armando viene a la fiesta').ok).toBe(true);
    expect(moderateText('cracker').ok).toBe(true);
  });
});

describe('needsModerationReview', () => {
  it('marca lo gris sin bloquearlo', () => {
    expect(moderateText('fiesta con desnudos artísticos').ok).toBe(true);
    expect(needsModerationReview('fiesta con desnudos artísticos')).toBe(true);
  });

  it('no marca contenido normal', () => {
    expect(needsModerationReview('Previa tranqui en casa')).toBe(false);
  });

  it('ignora texto vacío', () => {
    expect(needsModerationReview('')).toBe(false);
    expect(needsModerationReview('   ')).toBe(false);
  });
});

describe('moderateFields', () => {
  it('señala cuál es el campo con el problema', () => {
    const result = moderateFields({ title: 'Previa buena', description: 'vendo merca' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe('description');
  });

  it('ignora campos nulos o indefinidos', () => {
    expect(moderateFields({ title: 'Previa', bio: null, city: undefined }).ok).toBe(true);
  });
});
