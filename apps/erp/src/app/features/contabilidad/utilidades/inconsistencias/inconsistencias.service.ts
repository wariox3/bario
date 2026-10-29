import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

export const INCONSISTENCIA_ENDPOINT = '/contabilidad/inconsistencia/';

/**
 * Recurso `inconsistencia/`: las filas las escriben `periodo/analizar` y
 * `periodo/bloquear`; acá solo se resuelven.
 */
@Injectable({ providedIn: 'root' })
export class InconsistenciasService extends BaseHttpService {
  /**
   * Corrige la inconsistencia y la borra (204). Solo para las de tipo
   * `resolver_automatico`. No cambia el `estado_inconsistencia` del periodo:
   * para eso hay que volver a analizarlo.
   */
  resolver(id: number): Observable<void> {
    return this.post<void>(`${INCONSISTENCIA_ENDPOINT}resolver/`, { id });
  }
}
