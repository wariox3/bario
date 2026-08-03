import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  LIST_PAGINATION_PARAMS,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  Liquidacion,
  LiquidacionAdicional,
  LiquidacionAdicionalPayload,
} from './liquidacion.model';

/** Endpoint del proceso. */
export const LIQUIDACION_ENDPOINT = '/humano/liquidacion/';

/**
 * Endpoint de los adicionales.
 *
 * El ERP anterior lo nombra `liquidacion_adicional` (con guion bajo); acá va con
 * **guion**, que es la convención de endpoints de este ERP.
 */
export const LIQUIDACION_ADICIONAL_ENDPOINT = '/humano/liquidacion-adicional/';

/**
 * Serializador de la cabecera. Sin él el backend devuelve la liquidación cruda,
 * sin los campos del contrato ni del empleado.
 *
 * TODO(backend): confirmar el nombre y que se acepte como query param del `GET`.
 */
const SERIALIZADOR_DETALLE = 'detalle';

/**
 * Tope de adicionales por liquidación. Son unos pocos conceptos cargados a mano,
 * no un listado: se traen todos para poder totalizar sin paginar.
 */
const ADICIONALES_LIMITE = 200;

/**
 * Servicio de la **liquidación**: la consulta de la cabecera, sus adicionales y
 * las acciones del ciclo de vida.
 *
 * **No expone `create`.** La liquidación la fabrica el backend al terminar un
 * contrato; desde acá solo se consulta, se ajusta y se liquida. Tampoco hay
 * `update` de cabecera: los únicos números que se tocan a mano son los
 * adicionales.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class LiquidacionService extends BaseHttpService {
  private readonly resourcePath = LIQUIDACION_ENDPOINT;

  /** URL de la exportación del listado (la usa `FileDownloadService`). */
  readonly exportUrl = `${LIQUIDACION_ENDPOINT}excel/`;

  /** URL del PDF de la liquidación. Disponible en las tres etapas. */
  readonly imprimirUrl = `${LIQUIDACION_ENDPOINT}imprimir/`;

  // ── Cabecera ──────────────────────────────────────────────────────────────

  list(query: ListQuery): Observable<PaginatedResponse<Liquidacion>> {
    return this.post<PaginatedResponse<Liquidacion>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Liquidacion> {
    return this.get<Liquidacion>(`${this.resourcePath}${id}/`, {
      serializador: SERIALIZADOR_DETALLE,
    });
  }

  /** Elimina una o varias liquidaciones (DELETE por id, en paralelo). */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  // ── Adicionales ───────────────────────────────────────────────────────────

  /** Todos los adicionales de la liquidación, sin paginar. */
  listarAdicionales(liquidacionId: number): Observable<PaginatedResponse<LiquidacionAdicional>> {
    return this.get<PaginatedResponse<LiquidacionAdicional>>(LIQUIDACION_ADICIONAL_ENDPOINT, {
      liquidacion_id: liquidacionId,
      ordering: 'id',
      [LIST_PAGINATION_PARAMS.page]: 1,
      [LIST_PAGINATION_PARAMS.size]: ADICIONALES_LIMITE,
    });
  }

  obtenerAdicional(id: number): Observable<LiquidacionAdicional> {
    return this.get<LiquidacionAdicional>(`${LIQUIDACION_ADICIONAL_ENDPOINT}${id}/`);
  }

  crearAdicional(payload: LiquidacionAdicionalPayload): Observable<LiquidacionAdicional> {
    return this.post<LiquidacionAdicional>(LIQUIDACION_ADICIONAL_ENDPOINT, payload);
  }

  /**
   * Actualiza un adicional.
   *
   * El ERP anterior tiene este endpoint en su servicio y **nunca lo llama**: su
   * modal solo crea, así que corregir un valor obliga a borrar y volver a
   * cargarlo. Acá el modal lo usa.
   */
  actualizarAdicional(
    id: number,
    payload: LiquidacionAdicionalPayload,
  ): Observable<LiquidacionAdicional> {
    return this.put<LiquidacionAdicional>(`${LIQUIDACION_ADICIONAL_ENDPOINT}${id}/`, payload);
  }

  /**
   * Quita adicionales.
   *
   * Va en un solo `forkJoin` para que la pantalla se refresque **una vez** al
   * final. El legacy además recargaba fuera del `subscribe`, así que pedía los
   * datos antes de que terminaran los DELETE.
   */
  eliminarAdicionales(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    const deletions = ids.map((id) => this.delete<void>(`${LIQUIDACION_ADICIONAL_ENDPOINT}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  /** Liquida: calcula prestaciones y totales. */
  generar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}generar/`, { id });
  }

  /** Revierte la liquidación. */
  desgenerar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}desgenerar/`, { id });
  }

  /**
   * Recalcula sobre el borrador, sin liquidar en firme.
   *
   * Exclusiva de este proceso. En el legacy el método se llama `reliquiar`, con
   * la `d` comida.
   */
  reliquidar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}reliquidar/`, { id });
  }

  aprobar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}aprobar/`, { id });
  }

  desaprobar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}desaprobar/`, { id });
  }
}
