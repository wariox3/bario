import {
  calcularImpuestosLinea,
  redondearMoneda,
  toFiniteNumber,
  type ComercialDetalleFormRawValue,
  type TasaImpuesto,
} from '@reddoc/core';
import type { LineaPendienteApi } from '@erp/core/module-config';

/**
 * Adapta una **fila pendiente** (`POST documento-detalle/pendiente/`) a una línea
 * **nueva** del formulario para "importar desde documento". La fila ya trae todo
 * (item, precio, cantidad, impuestos), así que no se requiere lectura extra:
 *  - construye el `ItemOption` desde `item_id`/`item_nombre`/`precio`;
 *  - mapea los impuestos a tasas y calcula sus montos con el kernel
 *    (`calcularImpuestosLinea`) — front autoritativo;
 *  - `id = null` para que la línea se cree (POST), no se actualice (PATCH);
 *  - fija `documento_detalle_afectado = id` (línea origen) para descontar su pendiente.
 *
 * Caso simple (decidido): cantidad y precio salen directos de la fila; el reparto
 * parcial cuando `afectado > 0` queda fuera de esta primera versión.
 */
export function pendienteLineaToFormValue(row: LineaPendienteApi): ComercialDetalleFormRawValue {
  const precio = toFiniteNumber(row.precio) ?? 0;
  const cantidad = toFiniteNumber(row.cantidad);
  const tasas: TasaImpuesto[] = row.impuestos.map((imp) => ({
    id: imp.impuesto,
    nombre: imp.impuesto_nombre_extendido ?? imp.impuesto_nombre ?? '',
    porcentaje: parseFloat(imp.impuesto_porcentaje ?? '0'),
    porcentajeBase: parseFloat(imp.impuesto_porcentaje_base ?? '100'),
    // La fila pendiente manda la operación; el default solo cubre su ausencia.
    operacion: imp.impuesto_operacion ?? 1,
  }));
  const base = redondearMoneda((cantidad ?? 0) * precio);
  return {
    id: null,
    item: { id: row.item_id, nombre: row.item_nombre, precio },
    cantidad,
    precio,
    descuento: 0,
    impuestos_ids: tasas.map((tasa) => tasa.id),
    impuestos_totales: calcularImpuestosLinea(base, tasas),
    impuestos_disponibles: tasas,
    detalle: null,
    // La fila pendiente no trae almacén: la línea importada nace sin él.
    almacen: null,
    documento_detalle_afectado: row.id,
  };
}
