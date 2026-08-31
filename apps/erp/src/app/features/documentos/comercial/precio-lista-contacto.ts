import type { ErpSelectOption } from '@reddoc/core';

/**
 * Lee del contacto seleccionado su **lista de precios** (`precio_id`, campo
 * extra de `general/contacto/seleccionar/` que `lib-contacto-select` conserva
 * en la opción). Es la condición de venta pactada con el cliente: la tabla de
 * detalles la usa para cotizar cada ítem contra esa lista al elegirlo.
 *
 * Un contacto sin lista devuelve `null` y la línea queda con el precio propio
 * del ítem. Ojo con la edición: el documento leído del backend no trae el
 * precio del contacto (`GenDocumento` no lo serializa), así que ahí esto solo
 * aplica si se (re)elige el contacto.
 */
export function precioListaDeContacto(contacto: ErpSelectOption | null): number | null {
  const valor = contacto?.['precio_id'];
  return typeof valor === 'number' ? valor : null;
}
