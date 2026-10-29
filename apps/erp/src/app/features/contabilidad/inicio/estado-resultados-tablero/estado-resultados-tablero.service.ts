import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { EstadoResultadosTablero } from './estado-resultados-tablero.model';

export const ESTADO_RESULTADOS_ENDPOINT = '/contabilidad/tablero/estado-resultados/';

/** Estado de resultados de un rango de fechas, con el mismo rango del año anterior. */
@Injectable({ providedIn: 'root' })
export class EstadoResultadosTableroService extends BaseHttpService {
  obtener(rango: {
    readonly fecha_desde: string;
    readonly fecha_hasta: string;
  }): Observable<EstadoResultadosTablero> {
    return this.get<EstadoResultadosTablero>(ESTADO_RESULTADOS_ENDPOINT, { ...rango });
  }
}
