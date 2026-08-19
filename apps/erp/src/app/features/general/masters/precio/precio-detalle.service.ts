import { Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { PrecioDetalle, PrecioDetallePayload } from './precio-detalle.model';

/** Recurso de líneas de lista de precios. Guion bajo: así lo expone el backend. */
const PRECIO_DETALLE_ENDPOINT = '/general/precio_detalle/';

/** Respuesta del listado. */
interface PrecioDetalleListResponse {
  readonly results: readonly PrecioDetalle[];
}

/**
 * Líneas de una lista de precios.
 *
 * Cada línea se guarda por su cuenta —crear, actualizar y borrar son
 * inmediatos—, porque son autónomas: no hay totales ni cabecera que dependan de
 * ellas, así que no hay nada que confirmar en lote.
 *
 * **Supuestos pendientes de confirmar con backend** (portados del ERP anterior,
 * que pega contra estos mismos paths): el recurso lleva guion bajo, filtra por
 * `precio_id` y responde `{ results }`.
 */
@Injectable({ providedIn: 'root' })
export class PrecioDetalleService extends BaseHttpService {
  /**
   * Líneas de la lista, ordenadas por id: el orden de carga es el que el usuario
   * ve, y sin `ordering` el backend no garantiza ninguno.
   */
  listar(precioId: number): Observable<readonly PrecioDetalle[]> {
    return this.get<PrecioDetalleListResponse>(PRECIO_DETALLE_ENDPOINT, {
      precio_id: precioId,
      ordering: 'id',
    }).pipe(map((respuesta) => respuesta.results ?? []));
  }

  crear(payload: PrecioDetallePayload): Observable<PrecioDetalle> {
    return this.post<PrecioDetalle>(PRECIO_DETALLE_ENDPOINT, payload);
  }

  actualizar(id: number, payload: PrecioDetallePayload): Observable<PrecioDetalle> {
    return this.put<PrecioDetalle>(`${PRECIO_DETALLE_ENDPOINT}${id}/`, payload);
  }

  /**
   * Importación masiva de líneas desde un Excel. `precio_id` viaja como campo
   * del multipart: dice a qué lista entran las filas del archivo.
   */
  importar(precioId: number, file: File): Observable<unknown> {
    return this.postFile<unknown>(`${PRECIO_DETALLE_ENDPOINT}importar/`, file, {
      precio_id: precioId,
    });
  }

  eliminar(id: number): Observable<void> {
    return this.delete<void>(`${PRECIO_DETALLE_ENDPOINT}${id}/`);
  }
}
