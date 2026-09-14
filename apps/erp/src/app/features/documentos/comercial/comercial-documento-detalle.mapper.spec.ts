import {
  comercialDetalleToFormValue,
  comercialDetalleToPayload,
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
    documento_detalle_afectado: null,
  });

  it('sin líneas suma cero', () => {
    expect(totalCantidad([])).toBe(0);
  });

  it('suma cantidades decimales e ignora la vacía', () => {
    expect(totalCantidad([linea(2), linea(1.5), linea(null)])).toBe(3.5);
  });
});
