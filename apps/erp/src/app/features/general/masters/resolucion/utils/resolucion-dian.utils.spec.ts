import type { Resolucion, ResolucionDian } from '../resolucion.model';
import { marcarImportadas, prefijosYNumerosDe } from './resolucion-dian.utils';

function dian(id: number, prefijo: string, numero: string): ResolucionDian {
  return {
    id,
    emisor: 6,
    tipo_factura: 1,
    numero_resolucion: numero,
    fecha_resolucion: '2026-06-29',
    prefijo,
    rango_desde: 1,
    rango_hasta: 100,
    consecutivo_actual: 1,
    vigente_desde: '2019-01-19',
    vigente_hasta: '2030-01-19',
    activa: true,
  };
}

function local(prefijo: string, numero: string): Resolucion {
  return {
    id: 1,
    prefijo,
    numero,
    consecutivo_desde: 1,
    consecutivo_hasta: 100,
    fecha_desde: null,
    fecha_hasta: null,
    venta: true,
    compra: false,
    estado_validado: true,
    estado_inactivo: false,
  };
}

describe('resolucion-dian.utils', () => {
  it('marca importada solo la que coincide en prefijo y número', () => {
    const filas = marcarImportadas(
      [dian(17, 'SETP', '111'), dian(18, 'SEDS', '222')],
      [local('SETP', '111')],
    );

    expect(filas.map((f) => f.importada)).toEqual([true, false]);
  });

  it('no marca un cruce de prefijo de una fila con el número de otra', () => {
    const filas = marcarImportadas(
      [dian(17, 'SETP', '111'), dian(18, 'SEDS', '222')],
      [local('SETP', '222')],
    );

    expect(filas.map((f) => f.importada)).toEqual([false, false]);
  });

  it('ignora los espacios de los extremos al comparar', () => {
    const [fila] = marcarImportadas([dian(17, 'SETP ', '111')], [local('SETP', ' 111')]);

    expect(fila.importada).toBe(true);
  });

  it('devuelve prefijos y números sin repetir', () => {
    expect(
      prefijosYNumerosDe([dian(1, 'SETP', '111'), dian(2, 'SETP', '111'), dian(3, 'SEDS', '222')]),
    ).toEqual({ prefijos: ['SETP', 'SEDS'], numeros: ['111', '222'] });
  });
});
