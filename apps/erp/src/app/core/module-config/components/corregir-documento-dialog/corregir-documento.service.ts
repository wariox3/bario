import { Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { BaseHttpService, type PaginatedResponse } from '@reddoc/core';
import type {
  ActualizarContabilidadPayload,
  CorregirCabeceraRead,
  CorregirLineaRead,
} from './corregir-documento';

const DOCUMENTO_ENDPOINT = '/general/documento/';
const DETALLE_ENDPOINT = '/general/documento-detalle/';
/** Mismo tope que `DocumentoDetalleService.listarPorDocumento`: todas las líneas de una. */
const DETALLE_LIMIT = 1000;

/**
 * HTTP de **Corregir documento** (la corrección contable): lee cabecera y
 * líneas, y guarda todo en un solo `actualizar-contabilidad/`.
 */
@Injectable({ providedIn: 'root' })
export class CorregirDocumentoService extends BaseHttpService {
  cabecera(documentoId: number): Observable<CorregirCabeceraRead> {
    return this.get<CorregirCabeceraRead>(`${DOCUMENTO_ENDPOINT}${documentoId}/`);
  }

  lineas(documentoId: number): Observable<CorregirLineaRead[]> {
    return this.get<PaginatedResponse<CorregirLineaRead>>(DETALLE_ENDPOINT, {
      documento_id: documentoId,
      limit: DETALLE_LIMIT,
    }).pipe(map((res) => [...res.results]));
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
