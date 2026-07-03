import {
  calcularImpuestosLinea,
  redondearMoneda,
  toFiniteNumber,
  type ImpuestoLinea,
  type LineaCalculo,
  type TasaImpuesto,
} from '@reddoc/core';
import type { Item } from '@erp/features/general/masters/item/item.model';
import type { LineaPendienteApi } from '@erp/core/module-config';
import type {
  ComercialDetalleRead,
  ComercialDetallePayload,
} from './comercial-documento-detalle.model';
import type {
  ComercialDetalleFormRawValue,
  ImpuestoSeleccionarOption,
} from './comercial-documento-detalle.types';

/** Subtotal bruto de la línea: `cantidad × precio`. */
export function lineBruto(line: Pick<ComercialDetalleFormRawValue, 'cantidad' | 'precio'>): number {
  return (line.cantidad ?? 0) * (line.precio ?? 0);
}

/** Monto del descuento: `bruto × desc%/100`, redondeado. */
export function lineDescuento(
  line: Pick<ComercialDetalleFormRawValue, 'cantidad' | 'precio' | 'descuento'>,
): number {
  return redondearMoneda(lineBruto(line) * ((line.descuento ?? 0) / 100));
}

/** Base gravable: `bruto − descuento`. */
export function lineBase(
  line: Pick<ComercialDetalleFormRawValue, 'cantidad' | 'precio' | 'descuento'>,
): number {
  return lineBruto(line) - lineDescuento(line);
}

/** Suma de los montos de impuesto ya calculados de la línea. */
export function lineImpuesto(
  line: Pick<ComercialDetalleFormRawValue, 'impuestos_totales'>,
): number {
  return line.impuestos_totales.reduce((s, i) => s + i.total, 0);
}

/** Neto de la línea: `base + impuesto`. */
export function lineNeto(
  line: Pick<
    ComercialDetalleFormRawValue,
    'cantidad' | 'precio' | 'descuento' | 'impuestos_totales'
  >,
): number {
  return lineBase(line) + lineImpuesto(line);
}

/**
 * Recalcula los montos de impuesto de la línea: `calcularImpuestosLinea(base,
 * tasas)` sobre las tasas disponibles del ítem intersectadas con las elegidas.
 */
export function recomputeImpuestosLinea(
  line: Pick<
    ComercialDetalleFormRawValue,
    'cantidad' | 'precio' | 'descuento' | 'impuestos_ids' | 'impuestos_disponibles'
  >,
): ImpuestoLinea[] {
  const ids = new Set(line.impuestos_ids);
  const tasas = line.impuestos_disponibles.filter((t) => ids.has(t.id));
  return calcularImpuestosLinea(lineBase(line), tasas);
}

/** Adapta una línea comercial al contrato mínimo del kernel de resumen. */
export function toLineaCalculo(line: ComercialDetalleFormRawValue): LineaCalculo {
  return {
    base: lineBruto(line),
    descuento: lineDescuento(line),
    impuestos: line.impuestos_totales,
  };
}

/** Opción del catálogo `impuesto/seleccionar/` → `TasaImpuesto` (base 100 por defecto). */
export function tasaFromImpuestoOption(opt: ImpuestoSeleccionarOption): TasaImpuesto {
  return {
    id: opt.id,
    nombre: opt.nombre,
    porcentaje: parseFloat(opt.porcentaje ?? '0'),
    porcentajeBase: parseFloat(opt.porcentaje_base ?? '100'),
  };
}

/**
 * Tasas de **venta o compra** del ítem (opcionalmente acotadas a `ids`) como
 * `TasaImpuesto[]`. El `modo` selecciona el flag del ítem a filtrar
 * (`impuesto_venta` vs `impuesto_compra`): un documento comercial de venta usa
 * los de venta; uno de compra, los de compra.
 */
export function tasasDelItem(
  item: Item,
  modo: 'venta' | 'compra',
  ids?: readonly number[],
): TasaImpuesto[] {
  const idSet = ids ? new Set(ids) : null;
  return (item.impuestos ?? [])
    .filter(
      (imp) =>
        (modo === 'venta' ? imp.impuesto_venta : imp.impuesto_compra) &&
        (!idSet || idSet.has(imp.impuesto)),
    )
    .map((imp) => ({
      id: imp.impuesto,
      nombre: imp.impuesto_nombre ?? '',
      porcentaje: parseFloat(imp.impuesto_porcentaje ?? '0'),
      porcentajeBase: parseFloat(imp.impuesto_porcentaje_base ?? '100'),
    }));
}

/** Read-model (GET) → valores de formulario de una línea comercial. */
export function comercialDetalleToFormValue(
  read: ComercialDetalleRead,
): ComercialDetalleFormRawValue {
  const precio = toFiniteNumber(read.precio) ?? 0;
  return {
    id: read.id ?? null,
    item: read.item != null ? { id: read.item, nombre: read.item_nombre ?? '', precio } : null,
    cantidad: toFiniteNumber(read.cantidad),
    precio,
    descuento: toFiniteNumber(read.descuento) ?? 0,
    impuestos_ids: (read.impuestos ?? []).map((imp) => imp.impuesto),
    impuestos_totales: (read.impuestos ?? []).map((imp) => ({
      id: imp.impuesto,
      nombre: imp.impuesto_nombre ?? '',
      total: Math.round(parseFloat(imp.total ?? '0')),
    })),
    // Se rellenan al re-seleccionar el ítem; vacías preservan los montos cargados.
    impuestos_disponibles: [],
    detalle: read.detalle ?? null,
    documento_detalle_afectado: read.documento_detalle_afectado ?? null,
  };
}

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
    nombre: imp.impuesto_nombre ?? '',
    porcentaje: parseFloat(imp.impuesto_porcentaje ?? '0'),
    porcentajeBase: parseFloat(imp.impuesto_porcentaje_base ?? '100'),
  }));
  const base = (cantidad ?? 0) * precio;
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
    documento_detalle_afectado: row.id,
  };
}

/** Valores del formulario → payload de una línea comercial (POST/PATCH). */
export function comercialDetalleToPayload(
  raw: ComercialDetalleFormRawValue,
): ComercialDetallePayload {
  return {
    item: raw.item?.id ?? null,
    cantidad: raw.cantidad ?? null,
    precio: (raw.precio ?? 0).toFixed(2),
    descuento: (raw.descuento ?? 0).toFixed(2),
    detalle: raw.detalle?.trim() || null,
    impuestos_ids: raw.impuestos_ids,
    documento_detalle_afectado: raw.documento_detalle_afectado,
  };
}
