import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';
import { BaseHttpService, FileDownloadService, type PosDocumentoPayload } from '@reddoc/core';

const DOCUMENTO = '/general/documento/';

/**
 * Las operaciones del documento POS que hace la caja: crearlo con sus líneas,
 * aprobarlo, descartarlo si el cobro quedó a medias e imprimirlo.
 *
 * Los pagos van aparte, por `DocumentoPagoService` (`documento-pago/`).
 */
@Injectable({ providedIn: 'root' })
export class VentaPosService extends BaseHttpService {
  private readonly descargas = inject(FileDownloadService);

  /** Crea el documento con sus líneas embebidas y devuelve su id. */
  crear(payload: PosDocumentoPayload): Observable<number> {
    return this.post<{ readonly id: number }>(DOCUMENTO, payload).pipe(map((r) => r.id));
  }

  /** Aprueba el documento. El backend rechaza si los pagos superan el total. */
  aprobar(id: number): Observable<void> {
    return this.post<unknown>(`${DOCUMENTO}aprobar/`, { id }).pipe(map(() => undefined));
  }

  /** Lee si el documento ya quedó aprobado (para retomar un cobro sin aprobarlo dos veces). */
  estaAprobado(id: number): Observable<boolean> {
    return this.get<{ readonly estado_aprobado: boolean }>(`${DOCUMENTO}${id}/`).pipe(
      map((d) => d.estado_aprobado),
    );
  }

  /** Borra un documento sin aprobar (el de un cobro que se descarta). */
  eliminar(id: number): Observable<void> {
    return this.delete(`${DOCUMENTO}${id}/`);
  }

  /**
   * Abre el diálogo de impresión con el PDF que arma el backend según el formato
   * del tipo de documento, sin sacar a la persona de la caja.
   */
  imprimir(id: number): Observable<void> {
    return this.descargas.print(`${DOCUMENTO}imprimir/`, {
      method: 'POST',
      body: { filtros: [{ propiedad: 'id', operador: '=', valor: id }] },
      fallbackFilename: `venta-${id}.pdf`,
    });
  }
}
