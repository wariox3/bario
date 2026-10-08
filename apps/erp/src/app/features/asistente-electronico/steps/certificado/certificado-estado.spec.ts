import { DIAS_AVISO, diasHasta, estadoCertificado } from './certificado-estado';

const HOY = new Date(2026, 9, 7, 15, 30); // 7 oct 2026, a media tarde

describe('diasHasta', () => {
  it('cuenta días de calendario, no horas', () => {
    expect(diasHasta(new Date(2026, 9, 8), new Date(2026, 9, 7, 23, 59))).toBe(1);
  });

  it('es 0 el mismo día y negativo si ya pasó', () => {
    expect(diasHasta(new Date(2026, 9, 7), HOY)).toBe(0);
    expect(diasHasta(new Date(2026, 9, 4), HOY)).toBe(-3);
  });

  it('no se corre con el cambio de horario', () => {
    expect(diasHasta(new Date(2027, 2, 28), new Date(2027, 2, 1))).toBe(27);
  });
});

describe('estadoCertificado', () => {
  it('sin fecha no hay certificado', () => {
    expect(estadoCertificado(null)).toBe('sin-certificado');
  });

  it('vencido desde el día siguiente al vencimiento', () => {
    expect(estadoCertificado(-1)).toBe('vencido');
    expect(estadoCertificado(0)).toBe('por-vencer');
  });

  it('por vencer hasta el umbral de aviso inclusive', () => {
    expect(estadoCertificado(DIAS_AVISO)).toBe('por-vencer');
    expect(estadoCertificado(DIAS_AVISO + 1)).toBe('vigente');
  });
});
