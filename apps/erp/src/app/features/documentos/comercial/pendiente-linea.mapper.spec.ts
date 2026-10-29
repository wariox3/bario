import { lineNeto } from '@reddoc/core';
import type { LineaPendienteApi } from '@erp/core/module-config';
import { pendienteLineaToFormValue } from './pendiente-linea.mapper';

/** Remisión con 10 % de descuento e IVA 19 %, como la responde `pendiente/`. */
function remision(overrides: Partial<LineaPendienteApi> = {}): LineaPendienteApi {
  return {
    id: 493,
    documento: 155,
    documento_numero: 7,
    documento_fecha: '2026-10-23',
    documento_documento_tipo_nombre: 'REMISION',
    contacto_id: 2,
    contacto_nombre_corto: 'COLORMAX PINTURAS S.A.S',
    item_id: 6,
    item_nombre: 'BROCHA 2 PULGADAS',
    cantidad: '1.000000',
    precio: '11900.000000',
    porcentaje_descuento: '10.000000',
    descuento: '1190.000000',
    total: '12744.900000',
    afectado: '0.000000',
    pendiente: '12744.900000',
    impuestos: [
      {
        impuesto: 1,
        impuesto_nombre: 'IVA 19%',
        impuesto_nombre_extendido: 'IVA Ventas 19%',
        impuesto_porcentaje: '19.00',
        impuesto_porcentaje_base: '100.00',
        impuesto_operacion: 1,
      },
    ],
    ...overrides,
  };
}

describe('pendienteLineaToFormValue', () => {
  it('hereda el porcentaje de descuento de la línea origen', () => {
    expect(pendienteLineaToFormValue(remision()).descuento).toBe(10);
  });

  it('calcula el impuesto sobre la base descontada y cuadra con el total de la remisión', () => {
    const linea = pendienteLineaToFormValue(remision());
    expect(linea.impuestos_totales.map((i) => i.total)).toEqual([2034.9]);
    expect(lineNeto(linea)).toBe(12744.9);
  });

  it('cuadra también con la segunda remisión', () => {
    const linea = pendienteLineaToFormValue(
      remision({ id: 41, precio: '70000.000000', descuento: '7000.000000', total: '74970.000000' }),
    );
    expect(lineNeto(linea)).toBe(74970);
  });

  it('sin porcentaje de descuento la línea nace en 0', () => {
    const linea = pendienteLineaToFormValue(remision({ porcentaje_descuento: undefined }));
    expect(linea.descuento).toBe(0);
    expect(lineNeto(linea)).toBe(14161);
  });

  it('apunta a la línea origen y nace sin id', () => {
    const linea = pendienteLineaToFormValue(remision());
    expect(linea.id).toBeNull();
    expect(linea.documento_detalle_afectado).toBe(493);
  });
});
