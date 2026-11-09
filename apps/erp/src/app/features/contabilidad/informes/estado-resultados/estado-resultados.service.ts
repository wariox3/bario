import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type {
  InformeEstadoRow,
  InformeId,
  MovimientoInformeParams,
} from '../../shared/movimiento-informe.types';
import type { PresentacionResultado, ResultadoFormal } from './estado-resultados.types';

const MOVIMIENTO_INFORME_RESULTADO_ENDPOINT = '/contabilidad/movimiento-informe-resultado/';

/**
 * Servicio HTTP del informe **Estado de resultados**.
 *
 * Este informe tiene endpoint propio, sin paginación ni `totales/`: la
 * presentación va en `informe` y cambia la forma de la respuesta de `lista/`.
 * Por eso `lista/` se expone con un método por presentación.
 *
 * De la base solo se reutiliza `exportUrl`, que apunta a su propio Excel.
 */
@Injectable({ providedIn: 'root' })
export class EstadoResultadosService extends MovimientoInformeService<InformeEstadoRow> {
  protected readonly informe: InformeId = 'estado_resultados';

  override readonly exportUrl = `${MOVIMIENTO_INFORME_RESULTADO_ENDPOINT}excel/`;

  /** El endpoint no declara `solo_con_saldo`, por eso no viaja. */
  buildBodyResultado(
    presentacion: PresentacionResultado,
    params: MovimientoInformeParams,
  ): Record<string, unknown> {
    const { fecha_desde, fecha_hasta, filtros } = params;
    return { informe: presentacion, fecha_desde, fecha_hasta, filtros };
  }

  listaBase(params: MovimientoInformeParams): Observable<readonly InformeEstadoRow[]> {
    return this.post<readonly InformeEstadoRow[]>(
      `${MOVIMIENTO_INFORME_RESULTADO_ENDPOINT}lista/`,
      this.buildBodyResultado('base', params),
    );
  }

  listaFormal(params: MovimientoInformeParams): Observable<ResultadoFormal> {
    return this.post<ResultadoFormal>(
      `${MOVIMIENTO_INFORME_RESULTADO_ENDPOINT}lista/`,
      this.buildBodyResultado('formal', params),
    );
  }
}
