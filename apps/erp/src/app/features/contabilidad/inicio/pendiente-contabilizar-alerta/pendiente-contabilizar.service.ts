import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

export const PENDIENTE_CONTABILIZAR_ENDPOINT = '/contabilidad/tablero/pendiente-contabilizar/';

/** Respuesta de `GET contabilidad/tablero/pendiente-contabilizar/`. */
export interface PendienteContabilizar {
  /** Periodo consultado, `AAAAMM`. */
  readonly periodo_id: number;
  /** Documentos aprobados, no anulados y sin contabilizar con fecha contable en el periodo. */
  readonly cantidad: number;
}

/** Cuántos documentos del periodo quedan sin contabilizar. */
@Injectable({ providedIn: 'root' })
export class PendienteContabilizarService extends BaseHttpService {
  obtener(periodoId: number): Observable<PendienteContabilizar> {
    return this.get<PendienteContabilizar>(PENDIENTE_CONTABILIZAR_ENDPOINT, {
      periodo_id: periodoId,
    });
  }
}
