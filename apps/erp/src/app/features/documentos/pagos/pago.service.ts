import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService, type PaginatedResponse } from '@reddoc/core';
import { DOCUMENTO_PAGO_ENDPOINT } from './pago.constants';
import type { PagoPayload, PagoRead } from './pago.model';

/**
 * Tamaño de página al traer los pagos de un documento: un documento real no llega
 * a este volumen, así que se piden todos de una.
 */
const PAGO_PAGE_SIZE = 1000;

/**
 * Pagos de documento (`/api/general/documento-pago/`).
 *
 * Reglas del backend que conviene tener presentes:
 * - Crear, editar y eliminar solo con el documento **modificable** (sin aprobar), y
 *   solo si su tipo cobra. La cuenta bancaria necesita cuenta contable.
 * - Que la suma no supere el total **no** se valida al registrar: se valida al aprobar.
 * - Anular es para un documento aprobado y sin contabilizar; en uno sin aprobar el
 *   pago se elimina. El pago de una nota crédito no se anula: se desaprueba la nota.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoPagoService extends BaseHttpService {
  /** Pagos de un documento (`GET …?documento_id=`), anulados incluidos. */
  listarPorDocumento(documentoId: number): Observable<PagoRead[]> {
    return this.get<PaginatedResponse<PagoRead>>(DOCUMENTO_PAGO_ENDPOINT, {
      documento_id: documentoId,
      limit: PAGO_PAGE_SIZE,
    }).pipe(map((res) => [...res.results]));
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

  /** Anula un pago de un documento aprobado y sin contabilizar. Responde el pago anulado. */
  anular(id: number): Observable<PagoRead> {
    return this.post<PagoRead>(`${DOCUMENTO_PAGO_ENDPOINT}anular/`, { id });
  }
}
