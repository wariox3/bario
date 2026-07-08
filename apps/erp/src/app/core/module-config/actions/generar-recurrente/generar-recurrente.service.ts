import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/** Endpoint que genera documentos reales a partir de plantillas recurrentes. */
const GENERAR_RECURRENTE_ENDPOINT = '/general/documento/generar-recurrente/';

/** Respuesta de `POST /general/documento/generar-recurrente/`. */
export interface GenerarRecurrenteResponse {
  /** Ids de los documentos creados a partir de las plantillas enviadas. */
  readonly documentos_creados: readonly number[];
}

/**
 * Servicio HTTP de la acción "generar recurrente".
 *
 * Genera facturas reales a partir de las plantillas recurrentes cuyos `ids` se
 * envían. `tenantScoped` queda en su default `true`: el endpoint vive en el
 * schema del tenant, igual que el resto del framework de documentos (`/general/...`).
 */
@Injectable({ providedIn: 'root' })
export class GenerarRecurrenteService extends BaseHttpService {
  generar(ids: readonly (string | number)[]): Observable<GenerarRecurrenteResponse> {
    return this.post<GenerarRecurrenteResponse>(GENERAR_RECURRENTE_ENDPOINT, { ids });
  }
}
