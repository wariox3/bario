import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { DocumentoContabilizacionService } from '@erp/core/contabilidad';
import type { ContabilizarRow, DescontabilizarCriterio } from './contabilizar.model';
import { DESCONTABILIZAR_LIMITE } from './contabilizar.constants';

/** Endpoint de cabeceras de documento (compartido por toda la familia). */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/** Resultado de buscar candidatos a descontabilizar. */
export interface CandidatosDescontabilizar {
  /** Ids que se van a procesar (tope `DESCONTABILIZAR_LIMITE`). */
  readonly ids: readonly number[];
  /** Cuántos documentos cumplen el criterio en total, según el backend. */
  readonly total: number;
}

/**
 * Servicio HTTP de la utilidad **Contabilizar**.
 *
 * Cuatro responsabilidades sobre `/general/documento/`:
 *  - `listar`: página de documentos pendientes de contabilizar.
 *  - `contabilizar`: manda los ids seleccionados **en una sola petición**.
 *  - `buscarParaDescontabilizar`: resuelve el rango del modal a una lista de ids.
 *  - `descontabilizar`: manda esos ids, también en una sola petición.
 *
 * Contabilizar y descontabilizar **delegan** en `DocumentoContabilizacionService`
 * (`@erp/core/contabilidad`): son los mismos endpoints que usa el diálogo
 * "Contabilidad" de las fichas de detalle, y el payload `{ ids }` se declara en
 * un solo lugar. Acá queda lo propio de la utilidad: listar pendientes y
 * resolver el criterio del modal a ids.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class ContabilizarService extends BaseHttpService {
  private readonly contabilizacion = inject(DocumentoContabilizacionService);

  /**
   * Lista documentos combinando los filtros permanentes (`baseFilters`) con los
   * filtros/orden/paginación del `ListQuery` del usuario.
   */
  listar(
    query: ListQuery,
    baseFilters: readonly FilterCondition[],
  ): Observable<PaginatedResponse<ContabilizarRow>> {
    return this.post<PaginatedResponse<ContabilizarRow>>(
      `${DOCUMENTO_ENDPOINT}lista/`,
      buildListBody(query, { baseFilters }),
      buildListParams(query),
    );
  }

  /** Contabiliza los documentos indicados. */
  contabilizar(ids: readonly number[]): Observable<unknown> {
    return this.contabilizacion.contabilizar(ids);
  }

  /** Revierte la contabilización de los documentos indicados. */
  descontabilizar(ids: readonly number[]): Observable<unknown> {
    return this.contabilizacion.descontabilizar(ids);
  }

  /**
   * Traduce el criterio del modal (rango de fechas, de números y tipo) a la
   * lista de documentos **ya contabilizados** que le corresponden.
   *
   * El ERP anterior hacía exactamente esto —consultar y quedarse con los ids—,
   * solo que con un `GET` de query params; acá va por la convención de listados
   * del ERP. También devuelve el `total`, para poder avisar cuando el criterio
   * abarca más documentos de los que entran en el tope.
   */
  buscarParaDescontabilizar(
    criterio: DescontabilizarCriterio,
  ): Observable<CandidatosDescontabilizar> {
    const filters: FilterCondition[] = [
      { field: 'estado_contabilizado', operator: 'eq', value: true },
      { field: 'fecha', operator: 'gte', value: criterio.fecha_desde },
      { field: 'fecha', operator: 'lte', value: criterio.fecha_hasta },
    ];

    if (criterio.documento_tipo_id !== null) {
      filters.push({
        field: 'documento_tipo_id',
        operator: 'eq',
        value: criterio.documento_tipo_id,
      });
    }
    if (criterio.numero_desde !== null) {
      filters.push({ field: 'numero', operator: 'gte', value: criterio.numero_desde });
    }
    if (criterio.numero_hasta !== null) {
      filters.push({ field: 'numero', operator: 'lte', value: criterio.numero_hasta });
    }

    const query: ListQuery = {
      filters,
      sort: [],
      page: 0,
      pageSize: DESCONTABILIZAR_LIMITE,
    };

    return this.post<PaginatedResponse<ContabilizarRow>>(
      `${DOCUMENTO_ENDPOINT}lista/`,
      buildListBody(query),
      buildListParams(query),
    ).pipe(
      map((response) => ({
        ids: (response.results ?? []).map((row) => row.id),
        total: response.count ?? 0,
      })),
    );
  }
}
