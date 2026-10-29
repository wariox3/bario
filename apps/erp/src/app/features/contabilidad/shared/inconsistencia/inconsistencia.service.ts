import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import {
  BaseHttpService,
  FileDownloadService,
  buildFiltros,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { InconsistenciaGuardada } from './inconsistencia.model';

export const INCONSISTENCIA_ENDPOINT = '/contabilidad/inconsistencia/';

/**
 * Recurso `inconsistencia/`: las filas las escriben `periodo/analizar` y
 * `periodo/bloquear`; acá se leen, se exportan y se resuelven. Lo usan la
 * utilidad Inconsistencias y el modal del master de periodos.
 */
@Injectable({ providedIn: 'root' })
export class InconsistenciaService extends BaseHttpService {
  private readonly fileDownload = inject(FileDownloadService);

  /** Una página (0-based) de lo guardado del periodo. No vuelve a analizar. */
  listar(periodoId: number, page: number): Observable<PaginatedResponse<InconsistenciaGuardada>> {
    const query: ListQuery = { filters: filtroPeriodo(periodoId), sort: [], page };
    return this.post<PaginatedResponse<InconsistenciaGuardada>>(
      `${INCONSISTENCIA_ENDPOINT}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  /** Descarga el Excel de lo guardado del periodo (todas sus filas, sin paginar). */
  exportarExcel(periodoId: number): Observable<void> {
    return this.fileDownload.download(`${INCONSISTENCIA_ENDPOINT}excel/`, {
      method: 'POST',
      body: { filtros: buildFiltros(filtroPeriodo(periodoId)), ordenamientos: [] },
      fallbackFilename: `inconsistencias-periodo-${periodoId}.xlsx`,
    });
  }

  /**
   * Corrige la inconsistencia y la borra (204). Solo para las de tipo
   * `resolver_automatico`. No cambia el `estado_inconsistencia` del periodo:
   * para eso hay que volver a analizarlo.
   */
  resolver(id: number): Observable<void> {
    return this.post<void>(`${INCONSISTENCIA_ENDPOINT}resolver/`, { id });
  }
}

function filtroPeriodo(periodoId: number): readonly FilterCondition[] {
  return [{ field: 'periodo_id', operator: 'eq', value: periodoId }];
}
