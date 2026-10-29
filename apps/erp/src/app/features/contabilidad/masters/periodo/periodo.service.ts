import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseHttpService, fetchAllPages, type PaginatedResponse } from '@reddoc/core';
import type { InconsistenciaGuardada } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.model';
import type { Periodo, PeriodoAccionResultado, PeriodoOpcion } from './periodo.model';

/**
 * Acceso HTTP al master Periodo (`/contabilidad/periodo/`). Tenant-scoped por
 * default de `BaseHttpService` (los endpoints viven en el schema del tenant).
 *
 * A diferencia de los masters estándar, la vista de Periodo no pagina: `listAll()`
 * recorre todas las páginas del endpoint y la vista agrupa por año en cliente.
 */
@Injectable({ providedIn: 'root' })
export class PeriodoService extends BaseHttpService {
  private readonly resourcePath = '/contabilidad/periodo/';

  /**
   * Todos los periodos (todos los años). La vista deriva años y meses de aquí.
   *
   * El endpoint pagina de a 25 y un año son 13 periodos: con dos años ya hay
   * segunda página, así que se recorren todas. El caso vacío puede llegar como
   * cuerpo nulo o como arreglo pelado; se normaliza a una página para devolver
   * **siempre** un arreglo (la vista recorre estos datos en `computed`).
   */
  listAll(): Observable<readonly Periodo[]> {
    return fetchAllPages((page) =>
      this.get<PaginatedResponse<Periodo> | Periodo[] | null>(this.resourcePath, { page }).pipe(
        map((r): PaginatedResponse<Periodo> => {
          if (r == null) return { count: 0, next: null, previous: null, results: [] };
          if (Array.isArray(r)) return { count: r.length, next: null, previous: null, results: r };
          return { ...r, results: r.results ?? [] };
        }),
      ),
    );
  }

  /**
   * Un periodo como está en el backend: para reconciliar la vista tras una acción
   * fallida. Sin toast propio: corre de fondo y el fallo de la acción ya se avisó.
   */
  obtener(id: number): Observable<Periodo> {
    return this.get<Periodo>(`${this.resourcePath}${id}/`, undefined, { errorToast: false });
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
