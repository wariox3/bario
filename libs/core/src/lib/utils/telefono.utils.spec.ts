import { formatTelefono } from './telefono.utils';

describe('formatTelefono', () => {
  it('agrupa un número local en 3-3-4', () => {
    expect(formatTelefono('3105551234')).toBe('310-555-1234');
  });

  it('agrupa aunque el guardado traiga separadores', () => {
    expect(formatTelefono('310 555 1234')).toBe('310-555-1234');
  });

  // La regla que protege al número extranjero: si no es del largo local se
  // devuelve intacto, en vez de partirlo en grupos que no le corresponden.
  it('deja intacto lo que no tiene el largo local', () => {
    expect(formatTelefono('600123456')).toBe('600123456');
    expect(formatTelefono('573105551234')).toBe('573105551234');
  });

  // Los celulares guardados con `lib-phone-input` vienen en E.164: el
  // indicativo se separa con el catálogo —no a ojo— y se agrupa lo nacional.
  it('separa el indicativo y agrupa la parte nacional de un E.164', () => {
    expect(formatTelefono('+573105551234')).toBe('+57 310-555-1234');
  });

  it('separa indicativos de más de dos dígitos', () => {
    expect(formatTelefono('+593991234567')).toBe('+593 991234567');
  });

  it('deja intacto un E.164 de un país fuera del catálogo', () => {
    expect(formatTelefono('+447911123456')).toBe('+447911123456');
  });

  it('resuelve el vacío como cadena vacía', () => {
    expect(formatTelefono(null)).toBe('');
    expect(formatTelefono(undefined)).toBe('');
    expect(formatTelefono('')).toBe('');
  });
});
