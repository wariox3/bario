import { NOVEDAD_TIPO_REFERENCIA_ID, NOVEDAD_TIPO_VACACIONES_ID } from './novedad.constants';
import { diasDeNovedad, esVacaciones, requiereReferencia } from './novedad.rules';

const fecha = (iso: string): Date => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};

describe('diasDeNovedad', () => {
  // El caso del reporte: el ERP anterior muestra 8 y el nuevo mostraba 0.
  it('cuenta los dos extremos', () => {
    expect(diasDeNovedad(fecha('2026-08-24'), fecha('2026-08-31'))).toBe(8);
  });

  it('un solo día también cuenta uno', () => {
    expect(diasDeNovedad(fecha('2026-08-24'), fecha('2026-08-24'))).toBe(1);
  });

  it('cruza el fin de mes y el fin de año', () => {
    expect(diasDeNovedad(fecha('2026-08-30'), fecha('2026-09-02'))).toBe(4);
    expect(diasDeNovedad(fecha('2026-12-30'), fecha('2027-01-02'))).toBe(4);
  });

  it('no cuenta nada si falta una fecha o el rango está invertido', () => {
    expect(diasDeNovedad(null, fecha('2026-08-31'))).toBeNull();
    expect(diasDeNovedad(fecha('2026-08-24'), null)).toBeNull();
    expect(diasDeNovedad(fecha('2026-08-31'), fecha('2026-08-24'))).toBeNull();
  });
});

describe('esVacaciones', () => {
  it('solo reconoce el tipo vacaciones del catálogo', () => {
    expect(esVacaciones(NOVEDAD_TIPO_VACACIONES_ID)).toBe(true);
    expect(esVacaciones(NOVEDAD_TIPO_VACACIONES_ID + 1)).toBe(false);
    expect(esVacaciones(null)).toBe(false);
  });
});

describe('requiereReferencia', () => {
  // La referencia se filtra por contrato y por tipo: sin uno de los dos no hay
  // lista que ofrecer, así que el campo ni se muestra (igual que en el ERP anterior).
  it('pide tipo con referencia y contrato elegido', () => {
    expect(requiereReferencia(NOVEDAD_TIPO_REFERENCIA_ID, 10)).toBe(true);
    expect(requiereReferencia(NOVEDAD_TIPO_REFERENCIA_ID, null)).toBe(false);
    expect(requiereReferencia(NOVEDAD_TIPO_VACACIONES_ID, 10)).toBe(false);
    expect(requiereReferencia(null, 10)).toBe(false);
  });
});
