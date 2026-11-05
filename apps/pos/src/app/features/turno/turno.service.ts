import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, map, of, throwError } from 'rxjs';
import {
  BaseHttpService,
  FileDownloadService,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { formatFechaHora } from './turno.format';
import type {
  AbrirTurnoPayload,
  CerrarTurnoPayload,
  Turno,
  TurnoConDetalles,
  TurnoFila,
  TurnoResumen,
} from './turno.model';

const RECURSO = '/venta/turno/';

/**
 * Turnos de caja: el listado, el abierto de quien consulta, abrir y cerrar,
 * su resumen y el PDF del cierre.
 */
@Injectable({ providedIn: 'root' })
export class TurnoService extends BaseHttpService {
  private readonly descargas = inject(FileDownloadService);

  list(query: ListQuery): Observable<PaginatedResponse<TurnoFila>> {
    return this.post<PaginatedResponse<Turno>>(
      `${RECURSO}lista/`,
      buildListBody(query),
      buildListParams(query),
    ).pipe(map((pagina) => ({ ...pagina, results: pagina.results.map(aFila) })));
  }

  /**
   * El turno abierto de quien hace la petición, o `null` si no tiene. El
   * backend responde 404 cuando no hay: no es un error, es el estado normal
   * antes de abrir, así que va sin toast global.
   */
  abierto(): Observable<Turno | null> {
    return this.get<Turno>(`${RECURSO}abierto/`, undefined, { errorToast: false }).pipe(
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && err.status === HttpStatusCode.NotFound
          ? of(null)
          : throwError(() => err),
      ),
    );
  }

  abrir(payload: AbrirTurnoPayload): Observable<Turno> {
    return this.post<Turno>(`${RECURSO}abrir/`, payload);
  }

  /** El turno con su arqueo (`detalles` vacío mientras está abierto). */
  getById(id: number): Observable<TurnoConDetalles> {
    return this.get<TurnoConDetalles>(`${RECURSO}${id}/`);
  }

  /** Guarda el arqueo y cierra el turno; devuelve el turno con sus detalles. */
  cerrar(payload: CerrarTurnoPayload): Observable<TurnoConDetalles> {
    return this.post<TurnoConDetalles>(`${RECURSO}cerrar/`, payload);
  }

  /** Lo vendido y lo esperado por cuenta (pagos más la base): lo que se cuenta al cerrar. */
  resumen(id: number): Observable<TurnoResumen> {
    return this.get<TurnoResumen>(`${RECURSO}${id}/resumen/`);
  }

  /**
   * Abre el diálogo de impresión con el informe en rollo de 80 mm. Con el turno
   * abierto sale como pre-cierre (lo esperado, sin contado ni diferencia). Sin
   * toast global: quien imprime avisa con su propio mensaje.
   */
  imprimir(id: number): Observable<void> {
    return this.descargas.print(`${RECURSO}${id}/imprimir/`, {
      method: 'GET',
      fallbackFilename: `turno-${id}.pdf`,
      errorToast: false,
    });
  }
}

/** En un turno la hora importa tanto como el día: la tabla de fechas solo pinta el día. */
function aFila(turno: Turno): TurnoFila {
  return {
    ...turno,
    apertura: formatFechaHora(turno.fecha_apertura),
    cierre: formatFechaHora(turno.fecha_cierre),
  };
}
