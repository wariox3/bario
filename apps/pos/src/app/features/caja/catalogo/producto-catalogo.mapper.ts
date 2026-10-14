import { toFiniteNumber, type Item } from '@reddoc/core';
import type { ProductoCatalogo } from './producto-catalogo.model';

/**
 * `Item` del backend → producto del catálogo.
 *
 * El stock solo limita si el ítem maneja `inventario` y **no** admite
 * `negativo`; en cualquier otro caso `disponible` queda `null` y la caja vende
 * sin tope. Los montos llegan como string decimal y se normalizan acá.
 */
export function itemToProductoCatalogo(item: Item): ProductoCatalogo {
  const controlaStock = item.inventario && !item.negativo;
  return {
    id: item.id,
    codigo: item.codigo ?? '',
    nombre: item.nombre,
    precio: toFiniteNumber(item.precio) ?? 0,
    favorito: item.favorito,
    disponible: controlaStock ? (toFiniteNumber(item.disponible) ?? 0) : null,
    imagenUrl: item.imagen_principal_url_miniatura ?? item.imagen_principal_url ?? null,
  };
}

/**
 * ¿El ítem se puede ofrecer en la caja? La consulta ya pide `venta = true` e
 * `inactivo = false`, pero el backend descarta en silencio los filtros que no
 * declara: esta es la red por si alguno no estuviera en su lista blanca.
 */
export function esVendible(item: Item): boolean {
  return item.venta !== false && item.inactivo !== true;
}
