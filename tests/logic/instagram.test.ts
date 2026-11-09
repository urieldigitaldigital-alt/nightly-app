import { instagramHandle, instagramUrl } from '@/lib/instagram';

describe('instagramHandle', () => {
  it('deja pasar un usuario ya limpio', () => {
    expect(instagramHandle('ufopointpinamar')).toBe('ufopointpinamar');
  });

  it('saca la arroba', () => {
    expect(instagramHandle('@ufopointpinamar')).toBe('ufopointpinamar');
  });

  it('saca la URL completa', () => {
    expect(instagramHandle('https://www.instagram.com/ufopointpinamar/')).toBe('ufopointpinamar');
    expect(instagramHandle('http://instagram.com/ufopointpinamar')).toBe('ufopointpinamar');
    expect(instagramHandle('instagram.com/ufopointpinamar')).toBe('ufopointpinamar');
  });

  it('saca los parámetros de seguimiento que agrega Instagram al compartir', () => {
    expect(instagramHandle('https://www.instagram.com/ufopointpinamar/?igsh=MWx5abc123')).toBe('ufopointpinamar');
  });

  it('acepta punto y guion bajo, que Instagram permite', () => {
    expect(instagramHandle('ufo.point_pinamar')).toBe('ufo.point_pinamar');
  });

  it('recorta los espacios de alrededor', () => {
    expect(instagramHandle('  @ufopoint  ')).toBe('ufopoint');
  });

  it('devuelve null cuando no hay nada cargado', () => {
    expect(instagramHandle(null)).toBeNull();
    expect(instagramHandle(undefined)).toBeNull();
    expect(instagramHandle('')).toBeNull();
    expect(instagramHandle('   ')).toBeNull();
    expect(instagramHandle('@')).toBeNull();
  });

  it('rechaza un enlace que no es de Instagram en vez de inventar un usuario', () => {
    // Sin esta validación, de acá saldría el "usuario" `facebook.com` y
    // armaríamos un enlace roto que recién falla cuando alguien lo toca.
    expect(instagramHandle('https://facebook.com/ufopoint')).toBeNull();
    expect(instagramHandle('no es un usuario')).toBeNull();
  });

  it('rechaza un usuario más largo de lo que Instagram permite', () => {
    expect(instagramHandle('a'.repeat(31))).toBeNull();
    expect(instagramHandle('a'.repeat(30))).toBe('a'.repeat(30));
  });
});

describe('instagramUrl', () => {
  it('arma el enlace universal, que abre la app si está instalada', () => {
    expect(instagramUrl('@ufopoint')).toBe('https://www.instagram.com/ufopoint/');
  });

  it('devuelve null si no hay cuenta, para poder ocultar el botón', () => {
    expect(instagramUrl(null)).toBeNull();
    expect(instagramUrl('https://facebook.com/ufopoint')).toBeNull();
  });
});
