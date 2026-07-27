import { calcularResumen, redondearMoneda, toFiniteNumber, type LineaCalculo } from '@reddoc/core';
import type {
  InventarioDetalleRead,
  InventarioDetallePayload,
} from './inventario-documento-detalle.model';
import type {
  InventarioDetalleFormRawValue,
  OperacionInventario,
  ResumenInventario,
} from './inventario-documento-detalle.types';

/** Valorización de la línea: `cantidad × precio`, redondeada. */
export function lineTotal(
  line: Pick<InventarioDetalleFormRawValue, 'cantidad' | 'precio'>,
): number {
  return redondearMoneda((line.cantidad ?? 0) * (line.precio ?? 0));
}

/**
 * Adapta una línea de inventario al contrato del kernel de resumen. Sin
 * impuestos ni descuento: la base es la valorización de la línea.
 */
export function toLineaCalculo(line: InventarioDetalleFormRawValue): LineaCalculo {
  return { base: lineTotal(line), descuento: 0, impuestos: [] };
}

/**
 * Totales del documento. El monto lo deriva el kernel (redondeo central, front
 * autoritativo); la cantidad se acumula aquí porque no es un concepto fiscal.
 */
export function resumenInventario(
  lines: readonly InventarioDetalleFormRawValue[],
): ResumenInventario {
  const { subtotal, total } = calcularResumen(lines.map(toLineaCalculo));
  const cantidad = lines.reduce((sum, line) => sum + (line.cantidad ?? 0), 0);
  return { cantidad, subtotal, total };
}

/**
 * Normaliza el sentido del movimiento que llega del backend. Cualquier valor
 * distinto de `-1` cae a `1` (suma): es el default del legacy y el único sentido
 * posible en los documentos que no editan la columna.
 */
function toOperacionInventario(value: number | null | undefined): OperacionInventario {
  return value === -1 ? -1 : 1;
}

/** Read-model (GET) → valores de formulario de una línea de inventario. */
export function inventarioDetalleToFormValue(
  read: InventarioDetalleRead,
): InventarioDetalleFormRawValue {
  const precio = toFiniteNumber(read.precio) ?? 0;
  return {
    id: read.id ?? null,
    // `ItemOption.precio` es el costo de la línea: en inventario el autocomplete
    // solo aporta la etiqueta y el monto vigente es el que ya tiene la línea.
    item: read.item != null ? { id: read.item, nombre: read.item_nombre ?? '', precio } : null,
    almacen: read.almacen != null ? { id: read.almacen, nombre: read.almacen_nombre ?? '' } : null,
    operacion_inventario: toOperacionInventario(read.operacion_inventario),
    cantidad: toFiniteNumber(read.cantidad),
    precio,
  };
}

/**
 * Valores del formulario → payload de una línea de inventario (POST/PATCH).
 *
 * `incluirOperacion` lo prende solo el documento que edita el sentido del
 * movimiento (el traslado). En entrada y salida el sentido lo deriva el backend
 * del tipo de documento: mandarlo sería redundante en el mejor caso y
 * contradictorio en el peor.
 */
export function inventarioDetalleToPayload(
  raw: InventarioDetalleFormRawValue,
  incluirOperacion = false,
): InventarioDetallePayload {
  return {
    tipo_registro: 'I',
    item: raw.item?.id ?? null,
    almacen: raw.almacen?.id ?? null,
    ...(incluirOperacion ? { operacion_inventario: raw.operacion_inventario } : {}),
    cantidad: raw.cantidad ?? null,
    precio: (raw.precio ?? 0).toFixed(2),
    total: lineTotal(raw).toFixed(2),
  };
}
