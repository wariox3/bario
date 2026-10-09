import { calcularImpuestosLinea, type TasaImpuesto } from '@reddoc/core';
import {
  comercialDetalleToFormValue,
  comercialDetalleToPayload,
  lineaReferenciaToFormValue,
  precioUnitarioConImpuestos,
  precioUnitarioSinImpuestos,
  totalCantidad,
} from './comercial-documento-detalle.mapper';
import type { ComercialDetalleRead } from './comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from './comercial-documento-detalle.types';

/**
 * El contrato del descuento contra `GenDocumentoDetalle`: se **escribe**
 * `porcentaje_descuento` y se **lee** de ahí. El `descuento` del read es el
 * monto que calculó el backend (read-only), no el porcentaje: confundirlos
 * hacía que el descuento no se guardara y que la ficha pintara un monto donde
 * va un porcentaje.
 */
describe('comercial detalle · descuento', () => {
  const raw: ComercialDetalleFormRawValue = {
    id: 7,
    item: { id: 3, nombre: 'Ítem', precio: 1000 },
    cantidad: 2,
    precio: 1000,
    descuento: 10,
    impuestos_ids: [1],
    impuestos_totales: [],
    impuestos_disponibles: [],
    detalle: null,
    almacen: null,
    documento_detalle_afectado: null,
  };

  it('manda el porcentaje en `porcentaje_descuento` (el campo escribible)', () => {
    const payload = comercialDetalleToPayload(raw);
    expect(payload.porcentaje_descuento).toBe('10.00');
    expect('descuento' in payload).toBe(false);
  });

  it('lee el porcentaje de `porcentaje_descuento`, no del monto `descuento`', () => {
    const read: ComercialDetalleRead = {
      id: 7,
      item: 3,
      cantidad: '2.00',
      precio: '1000.00',
      porcentaje_descuento: '10.00',
      // Monto calculado por el backend: 2 × 1000 × 10% = 200.
      descuento: '200.00',
    };
    expect(comercialDetalleToFormValue(read).descuento).toBe(10);
  });

  it('cae a 0 cuando la línea llega sin porcentaje', () => {
    const read: ComercialDetalleRead = { id: 1, item: 3, cantidad: '1', precio: '100' };
    expect(comercialDetalleToFormValue(read).descuento).toBe(0);
  });
});

/** Fila «Total cantidad» del resumen: suma las cantidades y trata la vacía como cero. */
describe('comercial detalle · total cantidad', () => {
  const linea = (cantidad: number | null): ComercialDetalleFormRawValue => ({
    id: null,
    item: null,
    cantidad,
    precio: 0,
    descuento: 0,
    impuestos_ids: [],
    impuestos_totales: [],
    impuestos_disponibles: [],
    detalle: null,
    almacen: null,
    documento_detalle_afectado: null,
  });

  it('sin líneas suma cero', () => {
    expect(totalCantidad([])).toBe(0);
  });

  it('suma cantidades decimales e ignora la vacía', () => {
    expect(totalCantidad([linea(2), linea(1.5), linea(null)])).toBe(3.5);
  });
});

/**
 * Popover «precio con impuestos incluidos»: invierte el kernel. Los impuestos que
 * suman son aditivos sobre la misma base, así que el precio base es
 * `final / (1 + Σ fracciones)`; las retenciones no hacen parte del precio final.
 */
describe('comercial detalle · precio con impuestos incluidos', () => {
  const IVA_19: TasaImpuesto = {
    id: 1,
    nombre: 'IVA 19%',
    porcentaje: 19,
    porcentajeBase: 100,
    operacion: 1,
  };
  const CONSUMO_8: TasaImpuesto = {
    id: 2,
    nombre: 'Consumo 8%',
    porcentaje: 8,
    porcentajeBase: 100,
    operacion: 1,
  };
  const RETEFUENTE: TasaImpuesto = {
    id: 3,
    nombre: 'Retefuente 2.5%',
    porcentaje: 2.5,
    porcentajeBase: 100,
    operacion: -1,
  };
  const IVA_AIU: TasaImpuesto = {
    id: 4,
    nombre: 'IVA 19% AIU',
    porcentaje: 19,
    porcentajeBase: 10,
    operacion: 1,
  };

  const linea = (tasas: readonly TasaImpuesto[], ids = tasas.map((t) => t.id)) => ({
    impuestos_ids: ids,
    impuestos_disponibles: tasas,
  });

  /** Neto de una unidad calculado hacia adelante con el kernel (solo lo que suma). */
  const netoUnitario = (precio: number, tasas: readonly TasaImpuesto[]): number =>
    calcularImpuestosLinea(precio, tasas)
      .filter((imp) => imp.total > 0)
      .reduce((s, imp) => s + imp.total, precio);

  it('quita el IVA de un precio final', () => {
    expect(precioUnitarioSinImpuestos(10000, linea([IVA_19]))).toBe(8403.36);
  });

  it('con varias tasas divide por la suma, no en cadena como el legacy', () => {
    const base = precioUnitarioSinImpuestos(10000, linea([IVA_19, CONSUMO_8]));
    expect(base).toBe(7874.02);
    // En cadena (10000 / 1.19 / 1.08) daría 7780.67, que el kernel no devuelve a 10000.
    expect(netoUnitario(base, [IVA_19, CONSUMO_8])).toBe(10000);
  });

  it('ignora las retenciones: no hacen parte del precio final', () => {
    expect(precioUnitarioSinImpuestos(10000, linea([IVA_19, RETEFUENTE]))).toBe(8403.36);
    expect(precioUnitarioConImpuestos({ precio: 8403.36, ...linea([IVA_19, RETEFUENTE]) })).toBe(
      10000,
    );
  });

  it('respeta el porcentaje de base (AIU)', () => {
    // IVA 19% sobre el 10% de la base ⇒ fracción 0.019.
    expect(precioUnitarioSinImpuestos(10000, linea([IVA_AIU]))).toBe(9813.54);
  });

  it('solo cuenta las tasas elegidas en la línea', () => {
    expect(precioUnitarioSinImpuestos(10000, linea([IVA_19, CONSUMO_8], [1]))).toBe(8403.36);
  });

  it('sin impuestos deja el precio igual', () => {
    expect(precioUnitarioSinImpuestos(10000, linea([]))).toBe(10000);
    expect(precioUnitarioSinImpuestos(10000, linea([IVA_19], []))).toBe(10000);
  });

  it('una tasa sin operación cuenta como impuesto que suma', () => {
    const sinOperacion: TasaImpuesto = {
      id: 1,
      nombre: 'IVA 19%',
      porcentaje: 19,
      porcentajeBase: 100,
    };
    expect(precioUnitarioSinImpuestos(10000, linea([sinOperacion]))).toBe(8403.36);
  });

  it('siembra el popover con el precio final de la línea, redondeado a centavos', () => {
    expect(precioUnitarioConImpuestos({ precio: 8403.36, ...linea([IVA_19]) })).toBe(10000);
    expect(precioUnitarioConImpuestos({ precio: 1000, ...linea([IVA_19, CONSUMO_8]) })).toBe(1270);
  });

  it('una línea sin precio siembra cero', () => {
    expect(precioUnitarioConImpuestos({ precio: null, ...linea([IVA_19]) })).toBe(0);
  });

  it('ida y vuelta conserva el precio base', () => {
    const tasas = linea([IVA_19, CONSUMO_8]);
    const final = precioUnitarioConImpuestos({ precio: 2941.18, ...tasas });
    expect(precioUnitarioSinImpuestos(final, tasas)).toBe(2941.18);
  });
});

/**
 * "Cargar líneas" de la nota: copia la línea de la factura como línea nueva. Sin
 * `id` (se crea, no pisa la de la factura) y sin pool de tasas, para que la tabla
 * lo siembre y recalcule los montos.
 */
describe('comercial detalle · línea de la factura referencia', () => {
  const read: ComercialDetalleRead = {
    id: 40,
    item: 3,
    item_nombre: 'Ítem',
    cantidad: '2.00',
    precio: '1000.00',
    porcentaje_descuento: '10.00',
    detalle: 'Nota de la línea',
    almacen: 5,
    almacen_nombre: 'Principal',
    documento_detalle_afectado: 12,
    impuestos: [
      { impuesto: 1, impuesto_nombre: 'IVA 19%', total: '342.00', impuesto_operacion: 1 },
    ],
  };

  it('se crea como línea nueva, sin id ni vínculo con otra línea', () => {
    const linea = lineaReferenciaToFormValue(read);
    expect(linea.id).toBeNull();
    expect(linea.documento_detalle_afectado).toBeNull();
    expect(linea.impuestos_disponibles).toEqual([]);
  });

  it('conserva ítem, cantidad, precio, descuento, impuestos, nota y almacén', () => {
    const linea = lineaReferenciaToFormValue(read);
    expect(linea.item).toEqual({ id: 3, nombre: 'Ítem', precio: 1000 });
    expect(linea.cantidad).toBe(2);
    expect(linea.precio).toBe(1000);
    expect(linea.descuento).toBe(10);
    expect(linea.impuestos_ids).toEqual([1]);
    expect(linea.detalle).toBe('Nota de la línea');
    expect(linea.almacen).toEqual({ id: 5, nombre: 'Principal' });
  });
});
