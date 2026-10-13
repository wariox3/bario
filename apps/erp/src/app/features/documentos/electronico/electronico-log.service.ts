import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ElectronicoLogResponse } from './electronico-log.model';

/**
 * Consulta del rastro electrónico de un documento (correos, eventos de entrega y
 * validaciones DIAN). Es una consulta, pero el backend la expone como `POST`
 * con `{ id }` en el cuerpo.
 */
@Injectable({ providedIn: 'root' })
export class ElectronicoLogService extends BaseHttpService {
  consultar(documentoId: number): Observable<ElectronicoLogResponse> {
    return this.post<ElectronicoLogResponse>('/general/documento/electronico-log/', {
      id: documentoId,
    });
  }
}
