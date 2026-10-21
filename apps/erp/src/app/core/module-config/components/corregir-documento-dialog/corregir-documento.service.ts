import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService, fetchAllPages, type PaginatedResponse } from '@reddoc/core';
import type {
  ActualizarContabilidadPayload,
  CorregirCabeceraRead,
  CorregirLineaRead,
} from './corregir-documento';

const DOCUMENTO_ENDPOINT = '/general/documento/';
const DETALLE_ENDPOINT = '/general/documento-detalle/';

/**
 * HTTP de **Corregir documento** (la corrección contable): lee cabecera y
 * líneas, y guarda todo en un solo `actualizar-contabilidad/`.
 */
@Injectable({ providedIn: 'root' })
export class CorregirDocumentoService extends BaseHttpService {
  cabecera(documentoId: number): Observable<CorregirCabeceraRead> {
    return this.get<CorregirCabeceraRead>(`${DOCUMENTO_ENDPOINT}${documentoId}/`);
  }

  /** Todas las líneas del documento, recorriendo las páginas. */
  lineas(documentoId: number): Observable<CorregirLineaRead[]> {
    return fetchAllPages((page) =>
      this.get<PaginatedResponse<CorregirLineaRead>>(DETALLE_ENDPOINT, {
        documento_id: documentoId,
        page,
      }),
    );
  }

  /**
   * Sede y datos contables de las líneas en una sola petición. Sin el toast
   * del interceptor: el aviso lo da el diálogo, con el motivo del backend.
   */
  actualizarContabilidad(payload: ActualizarContabilidadPayload): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}actualizar-contabilidad/`, payload, undefined, {
      errorToast: false,
    });
  }
}
