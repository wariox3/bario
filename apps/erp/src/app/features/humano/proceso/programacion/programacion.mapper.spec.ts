import { banderasPorDefecto } from './programacion.banderas';
import { diasDelPeriodo, formValueToPayload, programacionToFormValue } from './programacion.mapper';
import type { Programacion } from './programacion.model';
import type { ProgramacionFormRawValue } from './programacion-form.types';

describe('diasDelPeriodo', () => {
  const catalogo = [
    { id: 1, nombre: 'General', periodo_dias: 15 },
    { id: 2, nombre: 'Mensual', periodo_dias: 30 },
  ];

  it('lee periodo_dias de la fila elegida en el select', () => {
    expect(diasDelPeriodo({ id: 1, nombre: 'General', periodo_dias: 15 })).toBe(15);
  });

  it('en edición, sin periodo_dias en el valor, lo busca en el catálogo por id', () => {
    expect(diasDelPeriodo({ id: 2, nombre: 'Mensual' }, catalogo)).toBe(30);
  });

  it('da 0 si el catálogo todavía no cargó o no tiene el grupo', () => {
    expect(diasDelPeriodo({ id: 2, nombre: 'Mensual' })).toBe(0);
    expect(diasDelPeriodo({ id: 9, nombre: 'Otro' }, catalogo)).toBe(0);
  });

  it('da 0 sin grupo elegido', () => {
    expect(diasDelPeriodo(null, catalogo)).toBe(0);
  });

  it('no confunde el nombre del ERP anterior (periodo__dias)', () => {
    expect(diasDelPeriodo({ id: 1, nombre: 'General', periodo__dias: 15 })).toBe(0);
  });
});

describe('formValueToPayload', () => {
  const raw: ProgramacionFormRawValue = {
    ...banderasPorDefecto(),
    nombre: 'Primera quincena',
    fecha_desde: new Date(2026, 9, 1),
    fecha_hasta: new Date(2026, 9, 15),
    comentario: null,
    pago_tipo: { id: 1, nombre: 'Nómina' },
    grupo: { id: 1, nombre: 'General', periodo_dias: 15 },
  };

  it('no manda periodo: el backend lo toma del grupo', () => {
    expect(formValueToPayload(raw)).not.toHaveProperty('periodo');
  });

  it('manda los ids de tipo de pago y grupo', () => {
    const payload = formValueToPayload(raw);
    expect(payload.pago_tipo).toBe(1);
    expect(payload.grupo).toBe(1);
  });

  it('cierra el periodo con fecha_hasta, que el backend exige', () => {
    const payload = formValueToPayload(raw);
    expect(payload.fecha_desde).toBe('2026-10-01');
    expect(payload.fecha_hasta).toBe('2026-10-15');
    expect(payload.fecha_hasta_periodo).toBe('2026-10-15');
  });
});

describe('programacionToFormValue', () => {
  /** Respuesta real de `GET /humano/programacion/1/`. */
  const read: Programacion = {
    ...banderasPorDefecto(),
    id: 1,
    fecha_desde: '2026-10-01',
    fecha_hasta: '2026-10-15',
    fecha_hasta_periodo: '2026-10-15',
    nombre: null,
    dias: 15,
    dias_reales: 15,
    contratos: 0,
    devengado: '0.000000',
    deduccion: '0.000000',
    total: '0.000000',
    estado_aprobado: false,
    estado_generado: false,
    comentario: null,
    grupo: 1,
    grupo_nombre: 'General',
    pago_tipo: 1,
    pago_tipo_nombre: 'Nomina',
    periodo: 1,
    periodo_nombre: 'QUINCENAL',
  };

  it('arma el tipo de pago y el grupo desde las FK sin _id', () => {
    const value = programacionToFormValue(read);
    expect(value.pago_tipo).toEqual({ id: 1, nombre: 'Nomina' });
    expect(value.grupo).toEqual({ id: 1, nombre: 'General' });
  });

  it('convierte las fechas ISO a Date local', () => {
    const value = programacionToFormValue(read);
    expect(value.fecha_desde).toEqual(new Date(2026, 9, 1));
    expect(value.fecha_hasta).toEqual(new Date(2026, 9, 15));
  });

  it('deja vacíos el tipo y el grupo si no vienen', () => {
    const value = programacionToFormValue({ ...read, pago_tipo: null, grupo: null });
    expect(value.pago_tipo).toBeNull();
    expect(value.grupo).toBeNull();
  });
});
