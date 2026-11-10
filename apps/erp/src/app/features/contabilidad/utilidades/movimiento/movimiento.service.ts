import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { MOVIMIENTO_ENDPOINT, type Movimiento } from '@erp/core/contabilidad';
import { MOVIMIENTO_UTILIDAD_BASE_FILTERS } from './movimiento.constants';

/** Cuerpo de `eliminar-masivo/`: el asiento de saldo inicial a borrar. */
export interface EliminarSaldoInicialPayload {
  readonly comprobante_id: number;
  readonly numero: number;
}

/** Respuesta de `eliminar-masivo/`: cuántos movimientos borró. */
export interface EliminarSaldoInicialResponse {
  readonly eliminados: number;
}

/**
 * Servicio HTTP de la utilidad **Movimientos**: los movimientos de saldo
 * inicial sobre `/contabilidad/movimiento/`.
 *
 * A diferencia del informe (`movimiento-informe/`), usa el recurso propio del
 * movimiento: ahí viven la lista con `saldo_inicial`, la importación y su
 * plantilla.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class MovimientoUtilidadService extends BaseHttpService {
  /** URL de la acción de exportar (la usa `FileDownloadService`). */
  readonly exportUrl = `${MOVIMIENTO_ENDPOINT}excel/`;

  /** URL de la plantilla de ejemplo de la importación. */
  readonly exampleUrl = `${MOVIMIENTO_ENDPOINT}importar-ejemplo/`;

  list(query: ListQuery): Observable<PaginatedResponse<Movimiento>> {
    return this.post<PaginatedResponse<Movimiento>>(
      `${MOVIMIENTO_ENDPOINT}lista/`,
      buildListBody(query, { baseFilters: MOVIMIENTO_UTILIDAD_BASE_FILTERS }),
      buildListParams(query),
    );
  }

  /**
   * Elimina los movimientos de saldo inicial de un comprobante y número
   * (`POST eliminar-masivo/`). El backend borra el asiento completo para no
   * descuadrar la contabilidad, y si alguno cae en un periodo bloqueado no
   * borra ninguno.
   */
  eliminarSaldoInicial(
    payload: EliminarSaldoInicialPayload,
  ): Observable<EliminarSaldoInicialResponse> {
    return this.post<EliminarSaldoInicialResponse>(
      `${MOVIMIENTO_ENDPOINT}eliminar-masivo/`,
      payload,
      undefined,
      { errorToast: false },
    );
  }

  /** Importación masiva desde un archivo Excel (todo o nada). */
  importar(file: File): Observable<unknown> {
    return this.postFile<unknown>(`${MOVIMIENTO_ENDPOINT}importar/`, file);
  }
}
