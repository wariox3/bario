import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ListQuery, ListResponse } from '../data-list';
import type { EntityConfig } from './entity-config.types';

/**
 * Contrato para acceder a la API de una entidad.
 *
 * Los componentes base dependen de esta abstracción, no de `HttpClient`.
 * Permite:
 *   - Testear componentes con un gateway en memoria, sin red.
 *   - Cambiar el transporte (HTTP, WebSocket, GraphQL) sin tocar componentes.
 *   - Encapsular en un solo lugar las diferencias entre `kind` (p. ej. el
 *     endpoint genérico de documentos vs el endpoint propio de masters).
 *
 * Aplica DIP: el framework define el contrato, la app inyecta la implementación.
 */
export interface EntityDataGateway {
  /** Lista paginada y filtrada de registros. */
  list(entity: EntityConfig, query: ListQuery): Observable<ListResponse>;

  /** Trae un único registro por id. */
  getById(entity: EntityConfig, id: string | number): Observable<unknown>;

  /** Crea un registro nuevo. */
  create(entity: EntityConfig, payload: unknown): Observable<unknown>;

  /** Actualiza un registro existente. */
  update(entity: EntityConfig, id: string | number, payload: unknown): Observable<unknown>;

  /**
   * Elimina uno o varios registros.
   *
   * La implementación decide si el backend soporta batch o si hay que
   * paralelizar DELETEs individuales. El componente base no necesita saber.
   */
  remove(entity: EntityConfig, ids: readonly (string | number)[]): Observable<void>;

  /**
   * Exporta a Excel los registros que cumplen `query` (mismos filtros y orden
   * que la lista, sin paginar) y dispara la descarga en el navegador.
   * Devuelve `Observable<void>`: el caller solo necesita saber cuándo terminó.
   */
  exportExcel(entity: EntityConfig, query: ListQuery): Observable<void>;

  /**
   * Aprueba un documento vía `POST <endpoint>/aprobar/` con body `{ id }`.
   * Devuelve el documento actualizado por el backend.
   */
  aprobar(entity: EntityConfig, id: string | number): Observable<unknown>;

  /**
   * Desaprueba (revierte la aprobación de) un documento vía
   * `POST <endpoint>/desaprobar/` con body `{ id }`. Devuelve el documento
   * actualizado por el backend.
   */
  desaprobar(entity: EntityConfig, id: string | number): Observable<unknown>;

  /**
   * Descarga el PDF de un documento vía `POST <endpoint>/imprimir/` (id en
   * `filtros`) y dispara la descarga en el navegador. Devuelve `Observable<void>`:
   * el caller solo necesita saber cuándo terminó.
   */
  imprimir(entity: EntityConfig, id: string | number): Observable<void>;
}

/**
 * Token de inyección del gateway.
 *
 * La app concreta provee la implementación en `app.config.ts`
 * (por default `HttpEntityDataGateway`). Tests pueden proveer un fake.
 */
export const ENTITY_DATA_GATEWAY = new InjectionToken<EntityDataGateway>('ENTITY_DATA_GATEWAY');
