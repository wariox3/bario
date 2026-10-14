import { aCabeceraElectronica, cambiosCabeceraElectronica } from './corregir-electronico';

const ORIGINAL = aCabeceraElectronica({
  numero: '125',
  fecha: '2026-08-05',
  fecha_vence: '2026-09-04',
  resolucion: 7,
  resolucion_prefijo: 'FE',
  resolucion_numero: '1876',
  documento_concepto_correccion: 3,
  documento_concepto_correccion_nombre: 'Rebaja total aplicada',
});

describe('aCabeceraElectronica', () => {
  it('normaliza número, fechas, la resolución con prefijo y número y el concepto', () => {
    expect(ORIGINAL).toEqual({
      numero: 125,
      resolucion: { id: 7, nombre: '', prefijo: 'FE', numero: '1876' },
      fecha: new Date(2026, 7, 5),
      fechaVence: new Date(2026, 8, 4),
      conceptoCorreccion: { id: 3, nombre: 'Rebaja total aplicada' },
    });
  });

  it('deja vacío lo que no vino', () => {
    expect(aCabeceraElectronica({})).toEqual({
      numero: null,
      resolucion: null,
      fecha: null,
      fechaVence: null,
      conceptoCorreccion: null,
    });
  });
});

describe('cambiosCabeceraElectronica', () => {
  it('no manda nada si nada cambió, aunque la fecha sea otra instancia del mismo día', () => {
    expect(
      cambiosCabeceraElectronica(ORIGINAL, { ...ORIGINAL, fecha: new Date(2026, 7, 5, 15, 30) }),
    ).toBeNull();
  });

  it('manda solo lo que cambió, con las fechas en ISO', () => {
    expect(
      cambiosCabeceraElectronica(ORIGINAL, {
        ...ORIGINAL,
        numero: 126,
        fechaVence: new Date(2026, 9, 4),
      }),
    ).toEqual({ numero: 126, fecha_vence: '2026-10-04' });
  });

  it('manda la resolución nueva por id', () => {
    expect(
      cambiosCabeceraElectronica(ORIGINAL, { ...ORIGINAL, resolucion: { id: 8, nombre: '' } }),
    ).toEqual({ resolucion: 8 });
  });

  it('manda el concepto de corrección nuevo por id', () => {
    expect(
      cambiosCabeceraElectronica(ORIGINAL, {
        ...ORIGINAL,
        conceptoCorreccion: { id: 5, nombre: 'Otros' },
      }),
    ).toEqual({ documento_concepto_correccion: 5 });
  });
});
