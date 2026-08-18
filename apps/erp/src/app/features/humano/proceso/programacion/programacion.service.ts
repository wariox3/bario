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
  CargarContratosResultado,
  GenerarResultado,
  Programacion,
  ProgramacionDetalle,
  ProgramacionPayload,
} from './programacion.model';

/** Endpoint del proceso. */
export const PROGRAMACION_ENDPOINT = '/humano/programacion/';

/**
 * Endpoint de los renglones.
 *
 * El ERP anterior lo nombra `programacion_detalle` (con guion bajo); acá va con
 * **guion**, que es la convención de endpoints de este ERP — la misma que ya usa
 * `documento-detalle`.
 */
export const PROGRAMACION_DETALLE_ENDPOINT = '/humano/programacion-detalle/';

/**
 * Servicio de la **programación de nómina**: el CRUD del proceso, sus renglones y
 * las acciones del ciclo de vida.
 *
 * Los métodos están agrupados por etapa para que el ciclo se lea en el archivo.
 * **Quién puede llamar a cada uno lo decide `programacion.estado.ts`**, no este
 * servicio: acá solo vive el transporte.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class ProgramacionService extends BaseHttpService {
  private readonly resourcePath = PROGRAMACION_ENDPOINT;

  /** URL de la exportación del listado (la usa `FileDownloadService`). */
  readonly exportUrl = `${PROGRAMACION_ENDPOINT}excel/`;

  // ── CRUD de la cabecera ───────────────────────────────────────────────────

  list(query: ListQuery): Observable<PaginatedResponse<Programacion>> {
    return this.post<PaginatedResponse<Programacion>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Programacion> {
    return this.get<Programacion>(`${this.resourcePath}${id}/`);
  }

  create(payload: ProgramacionPayload): Observable<Programacion> {
    return this.post<Programacion>(this.resourcePath, payload);
  }

  update(id: number, payload: ProgramacionPayload): Observable<Programacion> {
    return this.put<Programacion>(`${this.resourcePath}${id}/`, payload);
  }

  /** Elimina una o varias programaciones (DELETE por id, en paralelo). */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  // ── Renglones ─────────────────────────────────────────────────────────────

  /**
   * Página de renglones. `page` es 1-based, como espera el backend.
   *
   * El legacy pedía `limit: 1000` para traerlos todos de una; acá se pagina de
   * verdad: una programación de una empresa grande no cabe en una página.
   */
  listarRenglones(
    programacionId: number,
    page: number,
    limit: number,
  ): Observable<PaginatedResponse<ProgramacionDetalle>> {
    return this.get<PaginatedResponse<ProgramacionDetalle>>(PROGRAMACION_DETALLE_ENDPOINT, {
      programacion_id: programacionId,
      page,
      limit,
      ordering: 'contrato_id',
    });
  }

  /** Trae un renglón por id (lo usa el modal de edición). */
  obtenerRenglon(id: number): Observable<ProgramacionDetalle> {
    return this.get<ProgramacionDetalle>(`${PROGRAMACION_DETALLE_ENDPOINT}${id}/`);
  }

  /** Ajusta un renglón (horas, días de transporte, banderas del empleado). */
  actualizarRenglon(id: number, payload: object): Observable<ProgramacionDetalle> {
    return this.put<ProgramacionDetalle>(`${PROGRAMACION_DETALLE_ENDPOINT}${id}/`, payload);
  }

  /** Quita renglones de la programación (DELETE por id, en paralelo). */
  eliminarRenglones(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    const deletions = ids.map((id) => this.delete<void>(`${PROGRAMACION_DETALLE_ENDPOINT}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  /** Trae los contratos del grupo como renglones de la programación. */
  cargarContratos(id: number): Observable<CargarContratosResultado> {
    return this.post<CargarContratosResultado>(`${this.resourcePath}cargar-contrato/`, { id });
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  /** Liquida: **crea los documentos de nómina**, uno por renglón. */
  generar(id: number): Observable<GenerarResultado> {
    return this.post<GenerarResultado>(`${this.resourcePath}generar/`, { id });
  }

  /** Revierte la liquidación: **borra los documentos de nómina**. */
  desgenerar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}desgenerar/`, { id });
  }

  /** Aprueba (contabiliza) las nóminas generadas. */
  aprobar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}aprobar/`, { id });
  }

  desaprobar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}desaprobar/`, { id });
  }

  /**
   * Notifica a los empleados.
   *
   * TODO(backend): confirmar si es idempotente (¿reenvía a quien ya se notificó?).
   */
  notificar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}notificar/`, { id });
  }

  // ── Importación e impresión ───────────────────────────────────────────────

  /**
   * Importa las horas del periodo desde un Excel.
   *
   * El legacy nombra la acción `importar_horas/`; acá va con **guion**, como el
   * resto de los endpoints. El `programacion_id` viaja como campo del multipart.
   */
  importarHoras(id: number, file: File): Observable<unknown> {
    return this.postFile<unknown>(`${this.resourcePath}importar-horas/`, file, {
      programacion_id: id,
    });
  }

  /** URL del PDF de la programación (la usa `FileDownloadService`). */
  readonly imprimirUrl = `${PROGRAMACION_ENDPOINT}imprimir/`;

  /** URL del PDF con todas las nóminas generadas. */
  readonly imprimirNominasUrl = `${PROGRAMACION_ENDPOINT}imprimir-nominas/`;

  /** Busca el documento de nómina que generó un renglón. */
  nominaDelRenglon(renglonId: number): Observable<PaginatedResponse<{ id: number }>> {
    return this.get<PaginatedResponse<{ id: number }>>(DOCUMENTO_ENDPOINT, {
      programacion_detalle_id: renglonId,
      limit: 1,
    });
  }
}

/** Endpoint genérico de documentos: por ahí salen las nóminas generadas. */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Las tres exportaciones a Excel de la programación, con el endpoint, el
 * serializador y el filtro de cada una.
 *
 * ⚠️ Los tres serializadores y los tres filtros salen del ERP anterior, que además
 * los pedía por **GET con query params**; acá se usan con el `POST …excel/` que es
 * la convención del ERP. Mismo supuesto que arrastran los otros informes portados.
 *
 * Las dos últimas apuntan al endpoint genérico de documentos porque lo que exportan
 * son las **nóminas generadas**, no los renglones de la programación.
 */
export const PROGRAMACION_EXPORTS = {
  /** Los renglones de la programación. */
  renglones: {
    url: `${PROGRAMACION_DETALLE_ENDPOINT}excel/`,
    serializador: 'informe_programacion_detalle',
    filtro: 'programacion_id',
    archivo: 'programacion-renglones.xlsx',
  },
  /** Las nóminas generadas (una fila por documento). */
  nomina: {
    url: `${DOCUMENTO_ENDPOINT}excel/`,
    serializador: 'informe_nomina',
    filtro: 'programacion_detalle__programacion_id',
    archivo: 'nominas.xlsx',
  },
  /** Los conceptos de las nóminas generadas (una fila por línea). */
  nominaDetalle: {
    url: '/general/documento-detalle/excel/',
    serializador: 'informe_nomina_detalle',
    filtro: 'documento__programacion_detalle__programacion_id',
    archivo: 'nominas-detalle.xlsx',
  },
} as const;

/** Clave de una de las tres exportaciones. */
export type ProgramacionExportKey = keyof typeof PROGRAMACION_EXPORTS;
