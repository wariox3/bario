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
import {
  MOVIMIENTO_ENDPOINT,
  MOVIMIENTO_SERIALIZADOR,
  type Movimiento,
} from '@erp/core/contabilidad';

/** Página del libro de un documento: qué página y de qué tamaño. */
export interface MovimientosPage {
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Lee el **libro contable de un documento**: los movimientos que generó su
 * contabilización, filtrados por `documento`.
 *
 * Es la misma consulta que la del libro completo (`MovimientoService`, en
 * `features/contabilidad/informes/movimiento`) con un filtro fijo; se declara aparte
 * porque este servicio vive en `core/` —lo consume el diálogo de todas las
 * fichas— y `core` no importa features en eager.
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class DocumentoMovimientosService extends BaseHttpService {
  private readonly fileDownload = inject(FileDownloadService);

  listar(documentoId: number, page: MovimientosPage): Observable<PaginatedResponse<Movimiento>> {
    const query: ListQuery = {
      filters: filtroDocumento(documentoId),
      sort: [],
      page: page.page,
      pageSize: page.pageSize,
    };
    return this.post<PaginatedResponse<Movimiento>>(
      `${MOVIMIENTO_ENDPOINT}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  /** Descarga el Excel del libro del documento (todas sus líneas, sin paginar). */
  exportarExcel(documentoId: number): Observable<void> {
    return this.fileDownload.download(`${MOVIMIENTO_ENDPOINT}excel/`, {
      method: 'POST',
      body: {
        filtros: buildFiltros(filtroDocumento(documentoId)),
        ordenamientos: [],
        serializador: MOVIMIENTO_SERIALIZADOR,
      },
      fallbackFilename: `movimientos-documento-${documentoId}.xlsx`,
    });
  }
}

function filtroDocumento(documentoId: number): readonly FilterCondition[] {
  return [{ field: 'documento_id', operator: 'eq', value: documentoId }];
}
