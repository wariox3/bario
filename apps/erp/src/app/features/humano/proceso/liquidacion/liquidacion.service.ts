import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  Liquidacion,
  LiquidacionAdicional,
  LiquidacionAdicionalPayload,
  LiquidacionPatch,
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
 * Las acciones (`generar/`, `reliquidar/`, `aprobar/`, `imprimir/`…) identifican
 * la liquidación con `liquidacion_id` en el cuerpo, no con `id` (ver `cuerpoDe`),
 * y responden la liquidación actualizada.
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
    return this.get<Liquidacion>(`${this.resourcePath}${id}/`);
  }

  /**
   * Edita la cabecera por `PATCH`: solo el comentario y las fechas de último
   * pago (`LiquidacionPatch`). Un `PUT` exigiría además `fecha`, el periodo y el
   * contrato, que no se tocan desde acá.
   */
  actualizar(id: number, payload: LiquidacionPatch): Observable<Liquidacion> {
    return this.patch<Liquidacion>(`${this.resourcePath}${id}/`, payload);
  }

  /** Elimina una o varias liquidaciones (DELETE por id, en paralelo). */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  // ── Adicionales ───────────────────────────────────────────────────────────

  /**
   * Todos los adicionales de la liquidación en una sola página, para poder
   * totalizar sin paginar.
   *
   * Va por `POST …/lista/` con el filtro y el orden en el cuerpo: el recurso no
   * publica `GET` en la raíz.
   */
  listarAdicionales(liquidacionId: number): Observable<PaginatedResponse<LiquidacionAdicional>> {
    const query: ListQuery = {
      filters: [{ field: 'liquidacion_id', operator: 'eq', value: liquidacionId }],
      sort: [{ field: 'id', direction: 'asc' }],
      page: 0,
      pageSize: ADICIONALES_LIMITE,
    };
    return this.post<PaginatedResponse<LiquidacionAdicional>>(
      `${LIQUIDACION_ADICIONAL_ENDPOINT}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  obtenerAdicional(id: number): Observable<LiquidacionAdicional> {
    return this.get<LiquidacionAdicional>(`${LIQUIDACION_ADICIONAL_ENDPOINT}${id}/`);
  }

  crearAdicional(payload: LiquidacionAdicionalPayload): Observable<LiquidacionAdicional> {
    return this.post<LiquidacionAdicional>(LIQUIDACION_ADICIONAL_ENDPOINT, payload);
  }

  /**
   * Actualiza un adicional por `PATCH`.
   *
   * El ERP anterior tiene este endpoint en su servicio y **nunca lo llama**: su
   * modal solo crea, así que corregir un valor obliga a borrar y volver a
   * cargarlo. Acá el modal lo usa.
   *
   * ⚠️ El backend todavía no publica `PATCH liquidacion-adicional/{id}/`: se
   * pidió (ver `docs/liquidacion-pendientes.md`).
   */
  actualizarAdicional(
    id: number,
    payload: LiquidacionAdicionalPayload,
  ): Observable<LiquidacionAdicional> {
    return this.patch<LiquidacionAdicional>(`${LIQUIDACION_ADICIONAL_ENDPOINT}${id}/`, payload);
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
  generar(id: number): Observable<Liquidacion> {
    return this.post<Liquidacion>(`${this.resourcePath}generar/`, cuerpoDe(id));
  }

  /** Revierte la liquidación. */
  desgenerar(id: number): Observable<Liquidacion> {
    return this.post<Liquidacion>(`${this.resourcePath}desgenerar/`, cuerpoDe(id));
  }

  /**
   * Recalcula sobre el borrador, sin liquidar en firme.
   *
   * Exclusiva de este proceso. En el legacy el método se llama `reliquiar`, con
   * la `d` comida.
   */
  reliquidar(id: number): Observable<Liquidacion> {
    return this.post<Liquidacion>(`${this.resourcePath}reliquidar/`, cuerpoDe(id));
  }

  aprobar(id: number): Observable<Liquidacion> {
    return this.post<Liquidacion>(`${this.resourcePath}aprobar/`, cuerpoDe(id));
  }

  desaprobar(id: number): Observable<Liquidacion> {
    return this.post<Liquidacion>(`${this.resourcePath}desaprobar/`, cuerpoDe(id));
  }
}

/** Cuerpo con el que las acciones del backend identifican una liquidación. */
export function cuerpoDe(liquidacionId: number): { readonly liquidacion_id: number } {
  return { liquidacion_id: liquidacionId };
}
