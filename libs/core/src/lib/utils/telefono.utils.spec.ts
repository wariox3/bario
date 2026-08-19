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

  it('resuelve el vacío como cadena vacía', () => {
    expect(formatTelefono(null)).toBe('');
    expect(formatTelefono(undefined)).toBe('');
    expect(formatTelefono('')).toBe('');
  });
});
