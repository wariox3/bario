import { Injectable } from '@angular/core';
import { type Observable, concatMap, map, of } from 'rxjs';
import { BaseHttpService, toFiniteNumber, type PaginatedResponse } from '@reddoc/core';
import type { PrecioDetalle, PrecioDetalleApi, PrecioDetallePayload } from './precio-detalle.model';
import { toPrecioDetalle } from './precio-detalle.mapper';

/**
 * Recurso de líneas de lista de precios.
 *
 * **Guion medio.** El ERP anterior pega a `general/precio_detalle/` y de ahí lo
 * heredamos, pero el backend lo expone con guion: el nombre viejo no existe y
 * responde 404. Confirmado contra el esquema OpenAPI del contenedor.
 */
const PRECIO_DETALLE_ENDPOINT = '/general/precio-detalle/';

/**
 * Tope de páginas que `listar` encadena.
 *
 * El recorrido termina cuando el backend deja de mandar `next`; esto es solo
 * una red por si `next` viniera siempre lleno, para no colgar la pantalla en un
 * bucle infinito de peticiones.
 */
const MAX_PAGINAS = 50;

/**
 * Líneas de una lista de precios.
 *
 * Cada línea se guarda por su cuenta —crear, actualizar y borrar son
 * inmediatos—, porque son autónomas: no hay totales ni cabecera que dependan de
 * ellas, así que no hay nada que confirmar en lote.
 */
@Injectable({ providedIn: 'root' })
export class PrecioDetalleService extends BaseHttpService {
  /**
   * Todas las líneas de la lista.
   *
   * El listado es paginado y el tamaño de página lo fija el servidor —no hay
   * `page_size` en el contrato—, así que se encadenan las páginas hasta que
   * `next` viene vacío. Quedarse con la primera cortaría la lista en silencio,
   * que es peor que tardar: la tabla se edita línea por línea y una lista
   * incompleta no se distingue de una lista corta.
   *
   * No se sigue la URL de `next` sino que se pide `page + 1`: `next` es
   * absoluta contra el backend y saltaría el proxy `/api`, perdiendo la cookie
   * de sesión y la cabecera de tenant.
   */
  listar(precioId: number): Observable<readonly PrecioDetalle[]> {
    return this.desdePagina(precioId, 1).pipe(map((filas) => filas.map(toPrecioDetalle)));
  }

  /**
   * El precio que un ítem toma dentro de una lista, o `null` si la lista no lo
   * cotiza (sin línea, o con importe vacío/0 — mismo trato que el ERP anterior):
   * el consumidor cae entonces al precio propio del ítem.
   *
   * `GET precio-detalle/?precio_id&item_id`: el backend filtra por ambos, así
   * que la primera página alcanza (una lista cotiza cada ítem a lo sumo una vez).
   */
  consultarPrecioItem(precioId: number, itemId: number): Observable<number | null> {
    return this.get<PaginatedResponse<PrecioDetalleApi>>(PRECIO_DETALLE_ENDPOINT, {
      precio_id: precioId,
      item_id: itemId,
    }).pipe(
      map((res) => {
        const vrPrecio = toFiniteNumber(res.results?.[0]?.vr_precio);
        return vrPrecio != null && vrPrecio > 0 ? vrPrecio : null;
      }),
    );
  }

  crear(payload: PrecioDetallePayload): Observable<PrecioDetalle> {
    return this.post<PrecioDetalleApi>(PRECIO_DETALLE_ENDPOINT, payload).pipe(map(toPrecioDetalle));
  }

  actualizar(id: number, payload: PrecioDetallePayload): Observable<PrecioDetalle> {
    return this.put<PrecioDetalleApi>(`${PRECIO_DETALLE_ENDPOINT}${id}/`, payload).pipe(
      map(toPrecioDetalle),
    );
  }

  /**
   * Importación masiva de líneas desde un Excel.
   *
   * **Este endpoint todavía no existe.** El esquema del contenedor no declara
   * ningún `importar` bajo `precio-detalle`; el único importar del master es
   * `POST general/precio/importar/`, que carga **listas de precio** completas y
   * ni siquiera recibe `precio_id`, así que no puede saber a qué lista entran
   * las filas. Se deja pedido y apuntando al recurso correcto para el día que
   * backend lo publique.
   */
  importar(precioId: number, file: File): Observable<unknown> {
    return this.postFile<unknown>(`${PRECIO_DETALLE_ENDPOINT}importar/`, file, {
      precio_id: precioId,
    });
  }

  eliminar(id: number): Observable<void> {
    return this.delete<void>(`${PRECIO_DETALLE_ENDPOINT}${id}/`);
  }

  /** Una página y, si el backend anuncia más, las que siguen. */
  private desdePagina(precioId: number, page: number): Observable<readonly PrecioDetalleApi[]> {
    return this.get<PaginatedResponse<PrecioDetalleApi>>(PRECIO_DETALLE_ENDPOINT, {
      precio_id: precioId,
      page,
    }).pipe(
      concatMap((respuesta) => {
        const filas = respuesta.results ?? [];
        if (!respuesta.next || page >= MAX_PAGINAS) return of(filas);
        return this.desdePagina(precioId, page + 1).pipe(
          map((siguientes) => [...filas, ...siguientes]),
        );
      }),
    );
  }
}
