import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseHttpService, type PaginatedResponse } from '@reddoc/core';
import type { Periodo, PeriodoAccionResultado, PeriodoInconsistencia } from './periodo.model';

/**
 * Acceso HTTP al master Periodo (`/contabilidad/periodo/`). Tenant-scoped por
 * default de `BaseHttpService` (los endpoints viven en el schema del tenant).
 *
 * A diferencia de los masters estándar, Periodo **no pagina**: `listAll()` trae
 * todos los periodos de todos los años y la vista los agrupa por año en cliente.
 */
@Injectable({ providedIn: 'root' })
export class PeriodoService extends BaseHttpService {
  private readonly resourcePath = '/contabilidad/periodo/';

  /**
   * Todos los periodos (todos los años). La vista deriva años y meses de aquí.
   *
   * El endpoint responde paginado (`{ count, results }`), pero el caso vacío puede
   * llegar como cuerpo nulo o como arreglo pelado; normalizamos para devolver
   * **siempre** un arreglo (la vista recorre estos datos en `computed`).
   */
  listAll(): Observable<readonly Periodo[]> {
    return this.get<PaginatedResponse<Periodo> | Periodo[] | null>(this.resourcePath).pipe(
      map((r) => {
        if (r == null) return [];
        if (Array.isArray(r)) return r;
        return r.results ?? [];
      }),
    );
  }

  /** Crea los 12 meses de un año nuevo. El backend genera los registros. */
  crearAnio(anio: number): Observable<PeriodoAccionResultado> {
    return this.post<PeriodoAccionResultado>(`${this.resourcePath}anio-nuevo/`, { anio });
  }

  /** abierto → bloqueado. Devuelve el periodo actualizado (la vista lo parchea). */
  bloquear(id: number): Observable<Periodo> {
    return this.post<Periodo>(`${this.resourcePath}bloquear/`, { id });
  }

  /** bloqueado → abierto. Devuelve el periodo actualizado (la vista lo parchea). */
  desbloquear(id: number): Observable<Periodo> {
    return this.post<Periodo>(`${this.resourcePath}desbloquear/`, { id });
  }

  /** bloqueado → cerrado (prácticamente irreversible; la vista confirma antes). Devuelve el periodo actualizado. */
  cerrar(id: number): Observable<Periodo> {
    return this.post<Periodo>(`${this.resourcePath}cerrar/`, { id });
  }

  /** Inconsistencias contables de un periodo (año + mes). */
  inconsistencias(anio: number, mes: number): Observable<readonly PeriodoInconsistencia[]> {
    return this.post<{ inconsistencia: readonly PeriodoInconsistencia[] }>(
      `${this.resourcePath}inconsistencia/`,
      { anio, mes },
    ).pipe(map((r) => r.inconsistencia ?? []));
  }
}
