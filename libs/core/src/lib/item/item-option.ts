import type { ErpSelectOption } from '../data';
import { toFiniteNumber } from '../utils/currency.utils';

/**
 * Opción de ítem para las líneas de detalle de un documento. Extiende
 * `ErpSelectOption` con `precio` para autollenar el precio de la línea al
 * seleccionar. La consumen las familias de documentos (servicio, comercial…).
 */
export interface ItemOption extends ErpSelectOption {
  readonly precio: number;
}

/**
 * Fila cruda del endpoint `general/item/seleccionar/`. `precio` llega como
 * string con cola de ceros (`"120600.000000"`); se normaliza en `toItemOption`.
 */
export interface ItemApiRow {
  readonly id: number;
  readonly codigo?: string;
  readonly nombre?: string;
  readonly precio?: number | string;
}

/** Endpoint de selección de ítems. */
export const ITEM_SELECCIONAR_ENDPOINT = '/general/item/seleccionar/';

/**
 * Construye la opción `{ id, nombre: 'código - nombre', precio }`. Exportado
 * para quien agrega ítems por fuera del autocomplete (p. ej. el lector de
 * código de barras) y necesita el mismo shape/etiqueta en la línea.
 */
export function toItemOption(row: ItemApiRow): ItemOption {
  const label = [row.codigo, row.nombre].filter(Boolean).join(' - ');
  return { id: row.id, nombre: label || row.nombre || '', precio: toFiniteNumber(row.precio) ?? 0 };
}
