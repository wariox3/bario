import { EMPTY, type Observable } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import type { PaginatedResponse } from '../../models/pagination.model';

/** Opciones de `fetchAllPages`. */
export interface FetchAllPagesOptions {
  /**
   * Tope de filas: deja de pedir páginas al alcanzarlo y recorta el sobrante.
   * Para recorridos que, por diseño, procesan como mucho N registros.
   */
  readonly max?: number;
}

interface Paso<T> {
  readonly res: PaginatedResponse<T>;
  readonly page: number;
  readonly acumuladas: number;
}

/**
 * Trae **todas** las filas de un recurso paginado, página por página.
 *
 * El backend pagina siempre de a `LIST_PAGE_SIZE` e ignora cualquier `limit`,
 * así que pedir "1000 de una" devuelve solo la primera página y el resto se
 * pierde callado. Quien necesita el recurso completo (las líneas de un
 * documento, sus pagos, un catálogo para un selector) lo recorre con esto.
 *
 * `fetchPage` recibe la página **1-based** (la del wire). Se sigue mientras la
 * respuesta traiga `next`; las páginas se piden en secuencia, no en paralelo,
 * para no disparar N peticiones de golpe contra un recurso grande.
 */
export function fetchAllPages<T>(
  fetchPage: (page: number) => Observable<PaginatedResponse<T>>,
  options: FetchAllPagesOptions = {},
): Observable<T[]> {
  const max = options.max ?? Number.POSITIVE_INFINITY;
  const paso = (page: number, previas: number): Observable<Paso<T>> =>
    fetchPage(page).pipe(map((res) => ({ res, page, acumuladas: previas + res.results.length })));

  return paso(1, 0).pipe(
    expand(({ res, page, acumuladas }) =>
      res.next && acumuladas < max ? paso(page + 1, acumuladas) : EMPTY,
    ),
    reduce<Paso<T>, T[]>((acc, { res }) => [...acc, ...res.results], []),
    map((filas) => (filas.length > max ? filas.slice(0, max) : filas)),
  );
}
