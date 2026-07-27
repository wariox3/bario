import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { HistorialMovimiento } from './historial-movimiento.model';

/** Endpoint del informe: las líneas de documento (acción `lista/`). */
export const HISTORIAL_MOVIMIENTO_ENDPOINT = '/general/documento-detalle/';

/**
 * Serializador que aplana la línea con los datos de su documento padre y
 * agrega `cantidad_operada`. Sin él el backend devuelve la línea cruda.
 *
 * TODO(backend): confirmar el nombre en el API nuevo y que viaje en el body del
 * POST (el legacy lo mandaba como query param de un GET).
 */
export const HISTORIAL_MOVIMIENTO_SERIALIZADOR = 'informe_inventario';

/**
 * Filtros implícitos del informe, no declarados en la UI:
 *
 * - `inventario` — solo líneas de ítems que manejan inventario (una compra de
 *   servicios no movió stock).
 * - `documento__estado_aprobado` — solo documentos aprobados: los borradores
 *   todavía no afectaron el inventario, así que mostrarlos daría un historial
 *   que no cuadra con los saldos.
 *
 * Van **antes** de los filtros del usuario, así que este no los puede pisar.
 */
const HISTORIAL_MOVIMIENTO_BASE_FILTERS: readonly FilterCondition[] = [
  { field: 'inventario', operator: 'eq', value: true },
  { field: 'documento__estado_aprobado', operator: 'eq', value: true },
];

/**
 * Servicio HTTP del informe **Historial de movimientos**.
 *
 * Informe de solo lectura sobre las líneas de documento. **No expone
 * exportación**: el ERP legacy tenía el botón de Excel apagado en este informe
 * (a diferencia de los otros tres del módulo).
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class HistorialMovimientoService extends BaseHttpService {
  private readonly resourcePath = HISTORIAL_MOVIMIENTO_ENDPOINT;

  list(query: ListQuery): Observable<PaginatedResponse<HistorialMovimiento>> {
    return this.post<PaginatedResponse<HistorialMovimiento>>(
      this.resourcePath + 'lista/',
      {
        ...buildListBody(query, { baseFilters: HISTORIAL_MOVIMIENTO_BASE_FILTERS }),
        serializador: HISTORIAL_MOVIMIENTO_SERIALIZADOR,
      },
      buildListParams(query),
    );
  }
}
