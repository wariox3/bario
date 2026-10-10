import { calcularImpuestosLinea, redondearMoneda } from '@reddoc/core';
import {
  toItemOption,
  type ItemOption,
} from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import type { Item } from '@erp/features/general/masters/item/item.model';
import { tasasDelItem } from './comercial-documento-detalle.mapper';
import type { ComercialDetalleFormRawValue } from './comercial-documento-detalle.types';

/**
 * **AIU** (Administración, Imprevistos y Utilidad): esquema de los contratos de
 * obra en el que la factura cobra, además del valor base, tres conceptos que
 * son un porcentaje de ese valor. Cada concepto se liquida con su propio ítem
 * (configurados en Configuración › Venta › AIU), y son los impuestos de cada
 * ítem —con su `porcentaje_base`— los que deciden sobre qué parte cae el IVA.
 */
export const AIU_CONCEPTOS = ['administracion', 'imprevisto', 'utilidad'] as const;

export type AiuConcepto = (typeof AIU_CONCEPTOS)[number];

/** Porcentaje (0–100) del valor base que cobra cada concepto. */
export type AiuPorcentajes = Readonly<Record<AiuConcepto, number>>;

/**
 * Porcentajes con que abre el modal, los que traía fijos el ERP anterior. Por
 * ahora el modal los muestra **bloqueados**; la idea es que sean solo un punto
 * de partida editable, porque el AIU cambia de un contrato a otro y el backend
 * aún no guarda unos propios de la empresa.
 */
export const AIU_PORCENTAJES_INICIALES: AiuPorcentajes = {
  administracion: 9,
  imprevisto: 3,
  utilidad: 5,
};

/** Una línea que el AIU agrega a la factura: el ítem y su precio ya calculado. */
export interface AiuLinea {
  readonly item: ItemOption;
  readonly precio: number;
}

/** Valor de cada concepto: `valorBase × porcentaje / 100`, redondeado a centavos. */
export function calcularAiu(
  valorBase: number,
  porcentajes: AiuPorcentajes,
): Readonly<Record<AiuConcepto, number>> {
  const valor = (concepto: AiuConcepto): number =>
    redondearMoneda((valorBase * porcentajes[concepto]) / 100);
  return {
    administracion: valor('administracion'),
    imprevisto: valor('imprevisto'),
    utilidad: valor('utilidad'),
  };
}

/**
 * Línea nueva de la factura para un ítem del AIU, con cantidad 1 y el precio
 * calculado.
 *
 * Se arma directamente, sin pasar por la selección del ítem en la tabla: esa
 * tubería cotiza contra la lista de precios del contacto y pisaría el valor del
 * AIU (lo que le pasaba al ERP anterior). Los impuestos son los de venta del
 * ítem; el pool de tasas va vacío para que la tabla lo siembre del catálogo y
 * recalcule, como con las líneas del documento de referencia.
 */
export function aiuLineaToFormValue(item: Item, precio: number): ComercialDetalleFormRawValue {
  const tasas = tasasDelItem(item, 'venta');
  return {
    id: null,
    item: toItemOption({ id: item.id, codigo: item.codigo, nombre: item.nombre, precio }),
    cantidad: 1,
    precio,
    descuento: 0,
    impuestos_ids: tasas.map((tasa) => tasa.id),
    impuestos_totales: calcularImpuestosLinea(redondearMoneda(precio), tasas),
    impuestos_disponibles: [],
    detalle: null,
    almacen: null,
    documento_detalle_afectado: null,
  };
}
