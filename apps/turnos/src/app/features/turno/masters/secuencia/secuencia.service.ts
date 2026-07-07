import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Secuencia, SecuenciaPayload } from './secuencia.model';

/** Body de `POST /turno/secuencia/calcular-mes/`. */
export interface SecuenciaCalcularMesPayload {
  readonly secuencia_id: number;
  readonly posicion_inicial: number;
  readonly anio: number;
  readonly mes: number;
}

/** Día calculado por `calcular-mes`. `fecha` en formato ISO `YYYY-MM-DD`. */
export interface SecuenciaMesDia {
  readonly dia: number;
  readonly fecha: string;
  readonly turno_codigo: string;
  readonly turno_id: number;
  readonly turno_nombre: string;
  readonly horas: number;
  readonly horas_diurnas: number;
  readonly horas_nocturnas: number;
  readonly festivo: boolean;
}

/** Respuesta de `POST /turno/secuencia/calcular-mes/`. */
export interface SecuenciaMesCalculado {
  readonly secuencia_id: number;
  readonly anio: number;
  readonly mes: number;
  readonly posicion_inicial: number;
  readonly ciclo_dias: number;
  readonly dias: readonly SecuenciaMesDia[];
}

/**
 * Servicio HTTP de secuencias.
 *
 * Master administrativo del módulo Turno. Vive como feature directo
 * (camino B del enfoque híbrido — ver docs/architecture).
 *
 * Reutiliza `buildListBody` de `@reddoc/core` para enviar el body
 * `{ filtros, ordenamientos }`. La paginación va como query params
 * (`buildListParams`), que es donde el backend la lee.
 *
 * Tenant-scoped por default (`/turno/*` vive en el schema del tenant); no se
 * sobreescribe `tenantScoped`.
 */
@Injectable({ providedIn: 'root' })
export class SecuenciaService extends BaseHttpService {
  private readonly resourcePath = '/turno/secuencia/';

  list(query: ListQuery): Observable<PaginatedResponse<Secuencia>> {
    return this.post<PaginatedResponse<Secuencia>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Secuencia> {
    return this.get<Secuencia>(`${this.resourcePath}${id}/`);
  }

  /**
   * Calcula los turnos de un mes a partir de una secuencia y una posición
   * inicial (`POST /turno/secuencia/calcular-mes/`).
   */
  calcularMes(payload: SecuenciaCalcularMesPayload): Observable<SecuenciaMesCalculado> {
    return this.post<SecuenciaMesCalculado>(`${this.resourcePath}calcular-mes/`, payload);
  }

  create(payload: SecuenciaPayload): Observable<Secuencia> {
    return this.post<Secuencia>(this.resourcePath, payload);
  }

  update(id: number, payload: SecuenciaPayload): Observable<Secuencia> {
    return this.put<Secuencia>(`${this.resourcePath}${id}/`, payload);
  }

  /**
   * Elimina una o varias secuencias.
   * El backend de masters no expone batch-delete, así que paralelizamos
   * DELETEs individuales con `forkJoin`.
   */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) {
      // forkJoin con array vacío completa sin emitir; usamos un Observable que
      // emite inmediatamente para mantener el contrato.
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }
}
