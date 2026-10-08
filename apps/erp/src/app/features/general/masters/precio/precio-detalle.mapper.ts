import { toFiniteNumber } from '@reddoc/core';
import type { ItemOption } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import type { PrecioDetalle, PrecioDetalleApi, PrecioDetallePayload } from './precio-detalle.model';

/**
 * Adaptadores entre el recurso `general/precio-detalle/` y lo que consume la
 * tabla de ítems de una lista de precios.
 *
 * Existe porque el contrato y la pantalla no hablan el mismo idioma: el importe
 * viaja como string decimal, los datos del ítem vienen aplanados con prefijo, y
 * el autocomplete espera su propia opción. Traducir es responsabilidad de acá,
 * no del servicio (que solo habla HTTP) ni del componente (que solo orquesta).
 */

/** Read-model (GET) → línea normalizada para la tabla. */
export function toPrecioDetalle(fila: PrecioDetalleApi): PrecioDetalle {
  return {
    id: fila.id,
    precio: fila.precio,
    item: fila.item,
    itemNombre: fila.item_nombre ?? '',
    itemCodigo: fila.item_codigo ?? '',
    itemReferencia: fila.item_referencia ?? '',
    vrPrecio: toFiniteNumber(fila.vr_precio) ?? 0,
  };
}

/**
 * Línea → opción del autocomplete de ítems.
 *
 * La etiqueta se arma «código - nombre» igual que el autocomplete cuando busca,
 * para que una línea leída del servidor y una recién elegida se vean iguales.
 * Devuelve `null` cuando la línea no tiene ítem: el backend admite esas líneas
 * y hay que poder pintarlas vacías en vez de inventar un ítem sin id.
 */
export function precioDetalleToItemOption(detalle?: PrecioDetalle): ItemOption | null {
  if (!detalle || detalle.item === null) return null;
  const etiqueta = [detalle.itemCodigo, detalle.itemNombre].filter(Boolean).join(' - ');
  return { id: detalle.item, nombre: etiqueta || detalle.itemNombre, precio: detalle.vrPrecio };
}

/**
 * Valores de la fila → write-model (`POST`/`PUT`).
 *
 * El importe sale como string con dos decimales: es lo que declara el contrato
 * para su `DecimalField` y lo que valida contra `^-?\d{0,8}(?:\.\d{0,2})?$`.
 * Mandarlo como número lo dejaría a merced de la notación exponencial y de la
 * cola de decimales binarios.
 */
export function toPrecioDetallePayload(
  precioId: number,
  itemId: number,
  vrPrecio: number | null,
): PrecioDetallePayload {
  return {
    precio: precioId,
    item: itemId,
    vr_precio: (vrPrecio ?? 0).toFixed(2),
  };
}
