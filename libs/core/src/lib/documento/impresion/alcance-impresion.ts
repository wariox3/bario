import type { ListQuery } from '../../data-list';

/**
 * Por encima de este número de documentos se pide confirmación: un PDF de
 * cientos de documentos tarda y conviene que sea a propósito.
 */
export const UMBRAL_CONFIRMACION_IMPRESION = 50;

/** Qué hacer al pedir "Imprimir" o "Imprimir zip" desde un listado. */
export type AlcanceImpresion =
  /** Ni selección ni filtros: se avisa en vez de imprimir todo el tipo. */
  | { readonly tipo: 'sin-criterio' }
  /** Los filtros no dejan ningún documento. */
  | { readonly tipo: 'vacio' }
  | {
      readonly tipo: 'imprimir';
      /** El query a mandar: con selección, suma `id in [...]`. */
      readonly query: ListQuery;
      readonly cantidad: number;
      readonly confirmar: boolean;
    };

/**
 * Regla única de qué se imprime desde un listado de documentos (ERP y POS):
 *  - Con filas marcadas, solo esas.
 *  - Sin selección, todo lo que cumple los filtros, no solo la página.
 *  - Sin selección ni filtros, nada.
 *
 * `query.filters` son solo los de la persona; los implícitos del listado (el
 * tipo de documento) los suma quien arma el body y no habilitan la acción.
 */
export function alcanceImpresion(
  query: ListQuery,
  seleccion: readonly (string | number)[],
  totalCount: number,
): AlcanceImpresion {
  if (seleccion.length === 0 && query.filters.length === 0) return { tipo: 'sin-criterio' };

  const cantidad = seleccion.length > 0 ? seleccion.length : totalCount;
  if (cantidad === 0) return { tipo: 'vacio' };

  return {
    tipo: 'imprimir',
    query:
      seleccion.length > 0
        ? {
            ...query,
            filters: [...query.filters, { field: 'id', operator: 'in', value: seleccion }],
          }
        : query,
    cantidad,
    confirmar: cantidad > UMBRAL_CONFIRMACION_IMPRESION,
  };
}
