import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Contrato, ContratoPayload } from './contrato.model';

@Injectable({ providedIn: 'root' })
export class ContratoService extends BaseHttpService {
  private readonly resourcePath = '/humano/contrato/';

  list(query: ListQuery): Observable<PaginatedResponse<Contrato>> {
    return this.post<PaginatedResponse<Contrato>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Contrato> {
    return this.get<Contrato>(`${this.resourcePath}${id}/`);
  }

  create(payload: ContratoPayload): Observable<Contrato> {
    return this.post<Contrato>(this.resourcePath, payload);
  }

  update(id: number, payload: ContratoPayload): Observable<Contrato> {
    return this.put<Contrato>(`${this.resourcePath}${id}/`, payload);
  }

  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) {
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  // ── Terminación ───────────────────────────────────────────────────────────

  /**
   * Termina el contrato.
   *
   * **No es un `update` más**: el backend cierra el contrato y con eso **fabrica
   * la liquidación** del empleado. Por eso vive acá y no en el formulario, y por
   * eso la pantalla confirma diciendo qué va a pasar.
   */
  terminar(payload: TerminarContratoPayload): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}terminar/`, payload);
  }

  /**
   * Fechas de último pago con las que arranca la liquidación.
   *
   * Deciden **desde cuándo** se liquida cada prestación, así que se cargan antes
   * de terminar el contrato: corregirlas después obliga a reliquidar.
   *
   * ⚠️ El ERP anterior las guarda con un `PUT` sobre el propio contrato y las lee
   * con `serializador=parametros_iniciales`. Acá se reusa `update` para no
   * inventar un endpoint; ver el pendiente en `humano/PENDIENTES.md`.
   */
  guardarParametrosIniciales(
    id: number,
    payload: ParametrosInicialesPayload,
  ): Observable<Contrato> {
    return this.patch<Contrato>(`${this.resourcePath}${id}/`, payload);
  }
}

/** Lo que pide `terminar/`: cuándo y por qué se cierra el contrato. */
export interface TerminarContratoPayload {
  readonly id: number;
  readonly fecha_terminacion: string | null;
  readonly motivo_terminacion: number | null;
}

/** Las cuatro fechas de último pago del contrato. */
export interface ParametrosInicialesPayload {
  readonly fecha_ultimo_pago: string | null;
  readonly fecha_ultimo_pago_prima: string | null;
  readonly fecha_ultimo_pago_cesantia: string | null;
  readonly fecha_ultimo_pago_vacacion: string | null;
}
