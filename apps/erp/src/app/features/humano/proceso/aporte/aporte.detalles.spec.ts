import { APORTE_DETALLE_ABREVIATURAS, APORTE_DETALLE_COLUMNS } from './aporte.detalles';

describe('APORTE_DETALLE_COLUMNS', () => {
  it('no repite campos', () => {
    const campos = APORTE_DETALLE_COLUMNS.map((columna) => columna.field);
    expect(new Set(campos).size).toBe(campos.length);
  });

  it('formatea las novedades como Sí/— en vez del Sí/No por defecto', () => {
    const booleanas = APORTE_DETALLE_COLUMNS.filter((columna) => columna.type === 'boolean');
    expect(booleanas.length).toBeGreaterThan(0);
    for (const columna of booleanas) {
      expect(columna.booleanKeyPrefix).toBe('entities.aporte.detalles.novedad');
    }
  });

  it('abre con la identificación del empleado y cierra con el total', () => {
    // El orden es el del ERP anterior: es la tabla que se compara contra el plano.
    expect(APORTE_DETALLE_COLUMNS[0].field).toBe('id');
    expect(APORTE_DETALLE_COLUMNS.at(-1)?.field).toBe('cotizacion_total');
  });
});

describe('APORTE_DETALLE_ABREVIATURAS', () => {
  it('explica solo las columnas abreviadas, no las de nombre legible', () => {
    const siglas = APORTE_DETALLE_ABREVIATURAS.map((abreviatura) => abreviatura.siglaKey);
    expect(siglas).toContain('entities.aporte.detalles.siglas.dP');
    expect(siglas).not.toContain('entities.aporte.detalles.siglas.empleado');
    expect(siglas).not.toContain('entities.aporte.detalles.siglas.total');
  });

  it('cada abreviatura corresponde a una columna de la tabla', () => {
    // Es la garantía de que leyenda y encabezados no puedan divergir.
    const encabezados = new Set(APORTE_DETALLE_COLUMNS.map((columna) => columna.headerKey));
    for (const { siglaKey } of APORTE_DETALLE_ABREVIATURAS) {
      expect(encabezados.has(siglaKey)).toBe(true);
    }
  });
});
