import type { Item } from '@erp/features/general/masters/item/item.model';
import { AIU_PORCENTAJES_INICIALES, aiuLineaToFormValue, calcularAiu } from './aiu';

describe('aiu · calcularAiu', () => {
  it('cobra cada concepto como porcentaje del valor base', () => {
    expect(calcularAiu(1_000_000, AIU_PORCENTAJES_INICIALES)).toEqual({
      administracion: 90_000,
      imprevisto: 30_000,
      utilidad: 50_000,
    });
  });

  it('redondea cada concepto a centavos', () => {
    expect(calcularAiu(1234.56, { administracion: 7.5, imprevisto: 0, utilidad: 3.33 })).toEqual({
      administracion: 92.59,
      imprevisto: 0,
      utilidad: 41.11,
    });
  });
});

describe('aiu · aiuLineaToFormValue', () => {
  const utilidad = {
    id: 12,
    codigo: 'U01',
    nombre: 'Utilidad',
    precio: 0,
    impuestos: [
      {
        impuesto: 1,
        impuesto_nombre_extendido: 'IVA 19% ventas',
        impuesto_venta: true,
        impuesto_porcentaje: '19.00',
        impuesto_porcentaje_base: '100.00',
        impuesto_operacion: 1,
      },
      {
        impuesto: 9,
        impuesto_nombre: 'Rete compra',
        impuesto_compra: true,
        impuesto_porcentaje: '2.50',
      },
    ],
  } as unknown as Item;

  it('arma una línea nueva con el precio del AIU, no el del ítem', () => {
    const linea = aiuLineaToFormValue(utilidad, 50_000);
    expect(linea).toMatchObject({
      id: null,
      item: { id: 12, nombre: 'U01 - Utilidad', precio: 50_000 },
      cantidad: 1,
      precio: 50_000,
      descuento: 0,
      documento_detalle_afectado: null,
    });
  });

  it('lleva solo los impuestos de venta del ítem, ya calculados', () => {
    const linea = aiuLineaToFormValue(utilidad, 50_000);
    expect(linea.impuestos_ids).toEqual([1]);
    expect(linea.impuestos_totales).toEqual([{ id: 1, nombre: 'IVA 19% ventas', total: 9_500 }]);
  });

  it('deja el pool de tasas vacío para que la tabla lo siembre del catálogo', () => {
    expect(aiuLineaToFormValue(utilidad, 50_000).impuestos_disponibles).toEqual([]);
  });
});
