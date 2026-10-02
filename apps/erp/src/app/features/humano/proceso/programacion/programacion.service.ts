import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  type AdvancedListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type { Programacion, ProgramacionDetalle, ProgramacionPayload } from './programacion.model';

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
 * Las acciones sobre una programación (`cargar-contrato/`, `generar/`,
 * `eliminar-detalle/`…) la identifican con `programacion_id` en el cuerpo, no con
 * `id`, y responden la programación ya actualizada.
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
   * Página de renglones de una programación, ordenados por contrato.
   *
   * Va por `POST …/lista/` con el filtro y el orden en el cuerpo: el recurso no
   * acepta `GET` en la raíz (responde 405). `page` es 0-based, como en todo
   * `ListQuery`; `buildListParams` lo pasa a 1-based para el backend.
   *
   * El legacy pedía `limit: 1000` para traerlos todos de una; acá se pagina de
   * verdad: una programación de una empresa grande no cabe en una página.
   */
  listarRenglones(
    programacionId: number,
    page: number,
    pageSize: number,
  ): Observable<PaginatedResponse<ProgramacionDetalle>> {
    const query: ListQuery = {
      filters: [{ field: 'programacion_id', operator: 'eq', value: programacionId }],
      sort: [{ field: 'contrato_id', direction: 'asc' }],
      page,
      pageSize,
    };
    return this.post<PaginatedResponse<ProgramacionDetalle>>(
      `${PROGRAMACION_DETALLE_ENDPOINT}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  /** Trae un renglón por id (lo usa el modal de edición). */
  obtenerRenglon(id: number): Observable<ProgramacionDetalle> {
    return this.get<ProgramacionDetalle>(`${PROGRAMACION_DETALLE_ENDPOINT}${id}/`);
  }

  /**
   * Ajusta un renglón (horas, días de transporte, banderas del empleado, bases y
   * valor propuesto). `PATCH` porque el modal manda solo lo que edita según el
   * tipo de pago; un `PUT` exigiría además `contrato` y `programacion`.
   */
  actualizarRenglon(id: number, payload: object): Observable<ProgramacionDetalle> {
    return this.patch<ProgramacionDetalle>(`${PROGRAMACION_DETALLE_ENDPOINT}${id}/`, payload);
  }

  /**
   * Quita renglones de la programación, todos en una petición.
   *
   * ⚠️ Sin `ids` el backend borra **todos** los renglones de la programación. Una
   * lista vacía no se manda: que no haya nada seleccionado nunca debe vaciarla.
   */
  eliminarRenglones(programacionId: number, ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    return this.post<Programacion>(`${this.resourcePath}eliminar-detalle/`, {
      programacion_id: programacionId,
      ids,
    }).pipe(map(() => undefined));
  }

  /**
   * Trae los contratos del grupo que le aplican según el tipo de pago. Los que ya
   * tienen renglón no se tocan. Responde la programación con su `contratos` al día.
   */
  cargarContratos(id: number): Observable<Programacion> {
    return this.post<Programacion>(`${this.resourcePath}cargar-contrato/`, cuerpoDe(id));
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  /** Liquida: **crea los documentos de nómina**, uno por renglón. */
  generar(id: number): Observable<Programacion> {
    return this.post<Programacion>(`${this.resourcePath}generar/`, cuerpoDe(id));
  }

  /** Revierte la liquidación: **borra los documentos de nómina**. */
  desgenerar(id: number): Observable<Programacion> {
    return this.post<Programacion>(`${this.resourcePath}desgenerar/`, cuerpoDe(id));
  }

  /**
   * Aprueba las nóminas generadas: abona los créditos y mueve la fecha de último
   * pago de los contratos.
   */
  aprobar(id: number): Observable<Programacion> {
    return this.post<Programacion>(`${this.resourcePath}aprobar/`, cuerpoDe(id));
  }

  desaprobar(id: number): Observable<Programacion> {
    return this.post<Programacion>(`${this.resourcePath}desaprobar/`, cuerpoDe(id));
  }

  /**
   * Notifica a los empleados.
   *
   * TODO(backend): confirmar si es idempotente (¿reenvía a quien ya se notificó?).
   */
  notificar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}notificar/`, cuerpoDe(id));
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

  /**
   * Busca el documento de nómina que generó un renglón.
   *
   * Por `POST documento/lista/`: el `GET` de la raíz solo acepta `page` e ignora
   * cualquier otro parámetro, así que con él la búsqueda devolvía el primer
   * documento de la empresa —la nómina de otro empleado— sin dar error.
   */
  nominaDelRenglon(renglonId: number): Observable<PaginatedResponse<{ id: number }>> {
    const query: ListQuery = {
      filters: [{ field: 'programacion_detalle_id', operator: 'eq', value: renglonId }],
      sort: [],
      page: 0,
      pageSize: 1,
    };
    return this.post<PaginatedResponse<{ id: number }>>(
      `${DOCUMENTO_ENDPOINT}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }
}

/** Cuerpo con el que las acciones del backend identifican una programación. */
export function cuerpoDe(programacionId: number): { readonly programacion_id: number } {
  return { programacion_id: programacionId };
}

/** Endpoint genérico de documentos: por ahí salen las nóminas generadas. */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Las tres exportaciones a Excel de la programación, con el endpoint, el
 * serializador y el filtro de cada una. El cuerpo lo arma `cuerpoExportacion`.
 *
 * ⚠️ Los tres serializadores salen del ERP anterior, que los pedía por **GET con
 * query params**; acá van en el `POST …excel/`, como en el resto de informes.
 * `programacion-detalle/excel/` y `documento-detalle/excel/` todavía no están
 * publicados en el backend: solo el de nóminas (`documento/excel/`) responde.
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

/**
 * Cuerpo del `POST …excel/` de una exportación: el filtro que la acota a esta
 * programación, en el formato de `filtros` del backend, más su serializador.
 *
 * El filtro **tiene** que ir dentro de `filtros`. Suelto en el cuerpo
 * (`{ programacion_detalle__programacion_id: 7 }`) el backend lo ignora sin
 * error y exporta las nóminas de toda la empresa.
 */
export function cuerpoExportacion(
  clave: ProgramacionExportKey,
  programacionId: number,
): AdvancedListBody & { readonly serializador: string } {
  const config = PROGRAMACION_EXPORTS[clave];
  const query: ListQuery = {
    filters: [{ field: config.filtro, operator: 'eq', value: programacionId }],
    sort: [],
    page: 0,
    pageSize: 0,
  };
  return { ...buildListBody(query), serializador: config.serializador };
}
