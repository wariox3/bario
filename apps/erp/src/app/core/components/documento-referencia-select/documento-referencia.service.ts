import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/** Endpoint dedicado a buscar el documento que referencia una nota. */
const SELECCIONAR_REFERENCIA_ENDPOINT = '/general/documento/seleccionar-referencia/';

/** Lo que el select lee de cada documento referenciable. */
export interface DocumentoReferenciaApi {
  readonly id: number;
  readonly numero?: number | string | null;
  readonly fecha?: string | null;
  /** Nombre del tipo (`FACTURA ELECTRÓNICA DE VENTA`), para distinguir los resultados. */
  readonly documento_tipo_nombre?: string | null;
}

/** Respuesta paginada, como los demás `seleccionar/` del backend. */
interface DocumentoReferenciaApiResponse {
  readonly results: readonly DocumentoReferenciaApi[];
}

/**
 * Busca los documentos que una nota puede referenciar con
 * `GET general/documento/seleccionar-referencia/`: los del contacto y de la
 * clase indicada (`100` = factura de venta), filtrados por `search` (número).
 * Qué documentos son referenciables (aprobados, operación…) lo decide el backend.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoReferenciaService extends BaseHttpService {
  buscar(
    contactoId: number,
    documentoClaseId: number,
    search: string,
  ): Observable<readonly DocumentoReferenciaApi[]> {
    const params: Record<string, string | number> = {
      contacto_id: contactoId,
      documento_clase_id: documentoClaseId,
    };
    if (search) params['search'] = search;

    return this.get<DocumentoReferenciaApiResponse>(SELECCIONAR_REFERENCIA_ENDPOINT, params).pipe(
      map((res) => res.results),
    );
  }
}
