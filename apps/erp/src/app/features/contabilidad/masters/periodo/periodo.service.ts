import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseHttpService, fetchAllPages, type PaginatedResponse } from '@reddoc/core';
import type {
  InconsistenciaGuardada,
  Periodo,
  PeriodoAccionResultado,
  PeriodoInconsistencia,
  PeriodoOpcion,
} from './periodo.model';

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

  /**
   * Inconsistencias que impedirían bloquear el periodo. **No lo bloquea ni toca
   * su estado**: lista vacía significa que se puede bloquear.
   */
  inconsistencias(id: number): Observable<readonly PeriodoInconsistencia[]> {
    return this.get<{ inconsistencias: readonly PeriodoInconsistencia[] }>(
      `${this.resourcePath}${id}/inconsistencias/`,
    ).pipe(map((r) => r.inconsistencias ?? []));
  }

  /** Periodos sin bloquear: los únicos que todavía se pueden analizar. Todas las páginas. */
  abiertos(): Observable<PeriodoOpcion[]> {
    return fetchAllPages((page) =>
      this.get<PaginatedResponse<PeriodoOpcion>>(`${this.resourcePath}seleccionar/`, {
        estado_bloqueado: false,
        page,
      }),
    );
  }

  /**
   * Corre el mismo análisis que `bloquear`, **sin bloquear**: reemplaza las
   * inconsistencias guardadas del periodo, actualiza su `estado_inconsistencia`
   * y responde lo guardado, paginado de a 25. Cada página vuelve a analizar:
   * es lo que expone el backend. `count` en 0: el periodo se puede bloquear.
   */
  analizar(id: number, page: number): Observable<PaginatedResponse<InconsistenciaGuardada>> {
    return this.post<PaginatedResponse<InconsistenciaGuardada>>(
      `${this.resourcePath}${id}/analizar/`,
      {},
      { page },
    );
  }
}
