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
import type { ComercialDetalleFormRawValue } from './comercial-documento-detalle.types';

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

/** Redondeo a 2 decimales para precios unitarios (el precio admite centavos). */
function redondearPrecio(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Fracción total de los impuestos de la línea que **suman** (`operacion > 0`),
 * p. ej. IVA 19% sobre base 100 → `0.19`. Las retenciones no participan: no
 * hacen parte de un precio final al público — se descuentan al pagar.
 */
function fraccionImpuestosPositivos(
  line: Pick<ComercialDetalleFormRawValue, 'impuestos_ids' | 'impuestos_disponibles'>,
): number {
  const ids = new Set(line.impuestos_ids);
  return line.impuestos_disponibles
    .filter((t) => ids.has(t.id) && (t.operacion ?? 1) > 0)
    .reduce((s, t) => s + (t.porcentaje / 100) * (t.porcentajeBase / 100), 0);
}

/**
 * Precio unitario **final** (con los impuestos que suman) que produce el precio
 * actual de la línea: `precio × (1 + Σ fracciones)`. Siembra el campo del
 * popover "precio con impuestos incluidos".
 */
export function precioUnitarioConImpuestos(
  line: Pick<ComercialDetalleFormRawValue, 'precio' | 'impuestos_ids' | 'impuestos_disponibles'>,
): number {
  return redondearPrecio((line.precio ?? 0) * (1 + fraccionImpuestosPositivos(line)));
}

/**
 * Deshace los impuestos de la línea de un precio unitario final: la inversa
 * exacta del kernel. Los impuestos son **aditivos sobre la misma base** (así los
 * calcula `calcularImpuestosLinea`), por eso se divide por `1 + Σ fracciones` —
 * no en cadena tasa por tasa como hacía el legacy, que con varias tasas era
 * inconsistente con su propio cálculo hacia adelante.
 */
export function precioUnitarioSinImpuestos(
  precioFinal: number,
  line: Pick<ComercialDetalleFormRawValue, 'impuestos_ids' | 'impuestos_disponibles'>,
): number {
  return redondearPrecio(precioFinal / (1 + fraccionImpuestosPositivos(line)));
}

/** Adapta una línea comercial al contrato mínimo del kernel de resumen. */
export function toLineaCalculo(line: ComercialDetalleFormRawValue): LineaCalculo {
  return {
    base: lineBruto(line),
    descuento: lineDescuento(line),
    impuestos: line.impuestos_totales,
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
      nombre: imp.impuesto_nombre_extendido ?? imp.impuesto_nombre ?? '',
      porcentaje: parseFloat(imp.impuesto_porcentaje ?? '0'),
      porcentajeBase: parseFloat(imp.impuesto_porcentaje_base ?? '100'),
      operacion: imp.impuesto_operacion ?? 1,
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
    impuestos_totales: (read.impuestos ?? []).map((imp) => {
      // El backend guarda el monto sin signo. Si el serializer ya manda la
      // operación, el signo sale de ahí; si no (hoy), queda como llegó y la
      // tabla de edición lo corrige contra el catálogo (`normalizarImpuestosLeidos`).
      const parsed = Math.round(parseFloat(imp.total ?? '0'));
      const total =
        imp.impuesto_operacion == null
          ? parsed
          : Math.abs(parsed) * (imp.impuesto_operacion < 0 ? -1 : 1);
      return {
        id: imp.impuesto,
        nombre: imp.impuesto_nombre_extendido ?? imp.impuesto_nombre ?? '',
        total,
      };
    }),
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
    nombre: imp.impuesto_nombre_extendido ?? imp.impuesto_nombre ?? '',
    porcentaje: parseFloat(imp.impuesto_porcentaje ?? '0'),
    porcentajeBase: parseFloat(imp.impuesto_porcentaje_base ?? '100'),
    // El serializador de pendientes aún no manda la operación: default suma
    // (una retención importada quedaría positiva — gap del backend, reportado).
    operacion: imp.impuesto_operacion ?? 1,
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
