import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { fetchAllPages } from '../../data-list/data/fetch-all-pages';
import { BaseHttpService } from '../../services/base-http.service';
import type { PaginatedResponse } from '../../models/pagination.model';
import { DOCUMENTO_PAGO_ENDPOINT } from './pago.constants';
import type { PagoPayload, PagoRead } from './pago.model';

/**
 * Pagos de documento (`/api/general/documento-pago/`).
 *
 * Reglas del backend que conviene tener presentes:
 * - Crear, editar y eliminar solo con el documento **modificable** (sin aprobar), y
 *   solo si su tipo cobra. La cuenta bancaria necesita cuenta contable.
 * - Que la suma no supere el total **no** se valida al registrar: se valida al aprobar.
 * - El backend también expone `anular/`, pero el ERP no ofrece anular pagos.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoPagoService extends BaseHttpService {
  /**
   * Pagos de un documento (`GET …?documento_id=`), anulados incluidos. Recorre
   * todas las páginas: el backend pagina de a 25 sin importar el `limit`.
   */
  listarPorDocumento(documentoId: number): Observable<PagoRead[]> {
    return fetchAllPages((page) =>
      this.get<PaginatedResponse<PagoRead>>(DOCUMENTO_PAGO_ENDPOINT, {
        documento_id: documentoId,
        page,
      }),
    );
  }

  /** Registra un pago; el backend recalcula `documento.pago`. */
  crear(payload: PagoPayload): Observable<PagoRead> {
    return this.post<PagoRead>(DOCUMENTO_PAGO_ENDPOINT, payload);
  }

  /** Edita un pago de un documento modificable. */
  actualizar(id: number, payload: PagoPayload): Observable<PagoRead> {
    return this.patch<PagoRead>(`${DOCUMENTO_PAGO_ENDPOINT}${id}/`, payload);
  }

  /** Elimina un pago de un documento modificable. */
  eliminar(id: number): Observable<void> {
    return this.delete(`${DOCUMENTO_PAGO_ENDPOINT}${id}/`);
  }
}
