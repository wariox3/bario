import type { ErpSelectOption } from '@reddoc/core';

/**
 * Lee del contacto seleccionado su **lista de precios** (`precio_id`). Es la
 * condición de venta pactada con el cliente: la tabla de detalles la usa para
 * cotizar cada ítem contra esa lista al elegirlo.
 *
 * La clave es la misma se haya elegido el contacto en el autocomplete (campo
 * extra de `general/contacto/seleccionar/`, que `lib-contacto-select` conserva
 * en la opción) o se haya abierto el documento en edición (`contacto_precio_id`
 * del read, que `documentoContactoToOption` traduce a `precio_id`).
 *
 * Un contacto sin lista devuelve `null` y la línea queda con el precio propio
 * del ítem.
 */
export function precioListaDeContacto(contacto: ErpSelectOption | null): number | null {
  const valor = contacto?.['precio_id'];
  return typeof valor === 'number' ? valor : null;
}
