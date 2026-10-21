import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  type BackendFilter,
  BaseHttpService,
  fetchAllPages,
  type PaginatedResponse,
} from '@reddoc/core';

/** Endpoint de cabeceras de documento (compartido por todos los documentos). */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Lectura de **cabeceras de documento** (`/api/general/documento/`).
 *
 * Agnóstico del tipo de documento: complementa al `ENTITY_DATA_GATEWAY` (que
 * necesita un `EntityConfig`) para los puntos que solo tienen el id del
 * documento —p. ej. el modal de afectación, que a partir de una línea necesita
 * el `documento_tipo_nombre` de su documento—. El tipo de lectura se parametriza
 * por llamada.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoService extends BaseHttpService {
  /** Trae la cabecera de un documento por su `id` (`GET …documento/<id>/`). */
  obtenerPorId<TRead = unknown>(id: number): Observable<TRead> {
    return this.get<TRead>(`${DOCUMENTO_ENDPOINT}${id}/`);
  }

  /**
   * Trae **varias** cabeceras de una sola vez (`POST …documento/lista/` con el
   * filtro `id in`). La usa quien parte de un puñado de líneas y necesita a qué
   * documento pertenece cada una: el número y la fecha no viajan en la línea.
   *
   * Recorre las páginas: con más de 25 ids una sola página dejaría cabeceras
   * afuera. El llamador ya deduplica.
   */
  listarPorIds<TRead = unknown>(ids: readonly number[]): Observable<TRead[]> {
    return this.listarPorFiltros<TRead>([{ propiedad: 'id', operador: 'in', valor: ids }]);
  }

  /** **Todas** las cabeceras que cumplen `filtros` (`POST …documento/lista/`). */
  listarPorFiltros<TRead = unknown>(filtros: readonly BackendFilter[]): Observable<TRead[]> {
    return fetchAllPages((page) =>
      this.post<PaginatedResponse<TRead>>(`${DOCUMENTO_ENDPOINT}lista/`, { filtros }, { page }),
    );
  }
}
