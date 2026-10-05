import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  type AdvancedListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import type {
  Aporte,
  AporteContrato,
  AporteDetalle,
  AporteEntidad,
  AportePayload,
  CargarContratosResultado,
} from './aporte.model';

/** Endpoint del proceso. */
export const APORTE_ENDPOINT = '/humano/aporte/';

/**
 * Endpoints de los tres niveles del aporte.
 *
 * El ERP anterior los nombra con guion bajo (`aporte_contrato`, `aporte_detalle`,
 * `aporte_entidad`); acá van con **guion**, que es la convención de endpoints de
 * este ERP.
 */
export const APORTE_CONTRATO_ENDPOINT = '/humano/aporte-contrato/';
export const APORTE_DETALLE_ENDPOINT = '/humano/aporte-detalle/';
export const APORTE_ENTIDAD_ENDPOINT = '/humano/aporte-entidad/';

/**
 * Tope al pedir las entidades del aporte.
 *
 * Los subtotales por tipo y el total general se calculan sobre **todo** el
 * conjunto: son la plata que la empresa va a pagar. El legacy los sacaba de una
 * página de 50 registros, así que con más entidades las cifras quedaban mal.
 *
 * Un aporte tiene decenas de entidades, no miles (EPS, AFP, ARL, cajas, SENA e
 * ICBF), así que traerlas todas es barato. Si algún día no alcanza, el agrupado
 * debe darlo el backend — no subir este número.
 */
export const APORTE_ENTIDADES_LIMITE = 1000;

/**
 * Servicio del **aporte a seguridad social**: el CRUD de la cabecera, los tres
 * niveles de renglones y las acciones del ciclo de vida.
 *
 * Los métodos están agrupados por etapa para que el ciclo se lea en el archivo.
 * Las acciones (`cargar-contrato/`, `generar/`, `aprobar/`, `plano-operador/`…)
 * identifican el aporte con `aporte_id` en el cuerpo, no con `id` (ver
 * `cuerpoDe`).
 *
 * **Quién puede llamar a cada uno lo decide `aporte.estado.ts`**, no este
 * servicio: acá solo vive el transporte.
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class AporteService extends BaseHttpService {
  private readonly resourcePath = APORTE_ENDPOINT;

  /** URL de la exportación del listado (la usa `FileDownloadService`). */
  readonly exportUrl = `${APORTE_ENDPOINT}excel/`;

  // ── CRUD de la cabecera ───────────────────────────────────────────────────

  list(query: ListQuery): Observable<PaginatedResponse<Aporte>> {
    return this.post<PaginatedResponse<Aporte>>(
      `${this.resourcePath}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Aporte> {
    return this.get<Aporte>(`${this.resourcePath}${id}/`);
  }

  create(payload: AportePayload): Observable<Aporte> {
    return this.post<Aporte>(this.resourcePath, payload);
  }

  update(id: number, payload: AportePayload): Observable<Aporte> {
    return this.put<Aporte>(`${this.resourcePath}${id}/`, payload);
  }

  /** Elimina uno o varios aportes (DELETE por id, en paralelo). */
  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  // ── Contratos incluidos ───────────────────────────────────────────────────

  /**
   * Página de contratos del aporte, ordenados por contrato.
   *
   * Los tres niveles del aporte van por `POST …/lista/` con el filtro y el orden
   * en el cuerpo: el recurso no publica `GET` en la raíz. `page` es 0-based, como
   * en todo `ListQuery`; `buildListParams` lo pasa a 1-based para el backend.
   *
   * `filtros` son los que elige la persona en la tabla; van **después** del del
   * aporte, que no se puede pisar.
   */
  listarContratos(
    aporteId: number,
    page: number,
    pageSize: number,
    filtros: readonly FilterCondition[] = [],
  ): Observable<PaginatedResponse<AporteContrato>> {
    return this.listar<AporteContrato>(APORTE_CONTRATO_ENDPOINT, {
      filters: [{ field: 'aporte_id', operator: 'eq', value: aporteId }, ...filtros],
      sort: [{ field: 'contrato_id', direction: 'asc' }],
      page,
      pageSize,
    });
  }

  /**
   * Quita contratos del aporte.
   *
   * Va en un solo `forkJoin` para que la pantalla se refresque **una vez** al
   * final: el legacy disparaba N peticiones y cada una recargaba la tabla y
   * sacaba su propio toast.
   */
  eliminarContratos(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) return of(undefined);
    const deletions = ids.map((id) => this.delete<void>(`${APORTE_CONTRATO_ENDPOINT}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  /** Trae los contratos vigentes del periodo como renglones del aporte. */
  cargarContratos(id: number): Observable<CargarContratosResultado> {
    return this.post<CargarContratosResultado>(
      `${this.resourcePath}cargar-contrato/`,
      cuerpoDe(id),
    );
  }

  // ── Líneas liquidadas ─────────────────────────────────────────────────────

  /**
   * Página de líneas liquidadas. Solo lectura: las fabrica el backend al generar.
   * Cuelgan del contrato del aporte, así que el filtro cruza por él.
   */
  listarDetalles(
    aporteId: number,
    page: number,
    pageSize: number,
    filtros: readonly FilterCondition[] = [],
  ): Observable<PaginatedResponse<AporteDetalle>> {
    return this.listar<AporteDetalle>(APORTE_DETALLE_ENDPOINT, {
      filters: [
        { field: 'aporte_contrato__aporte_id', operator: 'eq', value: aporteId },
        ...filtros,
      ],
      sort: [{ field: 'aporte_contrato_id', direction: 'asc' }],
      page,
      pageSize,
    });
  }

  /**
   * Todas las entidades del aporte en una sola página: los subtotales se calculan
   * sobre el conjunto completo (ver `APORTE_ENTIDADES_LIMITE`). El orden por
   * `tipo` es el que usa el agrupado.
   */
  listarEntidades(aporteId: number): Observable<PaginatedResponse<AporteEntidad>> {
    return this.listar<AporteEntidad>(APORTE_ENTIDAD_ENDPOINT, {
      filters: [{ field: 'aporte_id', operator: 'eq', value: aporteId }],
      sort: [{ field: 'tipo', direction: 'asc' }],
      page: 0,
      pageSize: APORTE_ENTIDADES_LIMITE,
    });
  }

  /** `POST …/lista/` de uno de los tres niveles. */
  private listar<T>(endpoint: string, query: ListQuery): Observable<PaginatedResponse<T>> {
    return this.post<PaginatedResponse<T>>(
      `${endpoint}lista/`,
      buildListBody(query),
      buildListParams(query),
    );
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  /** Liquida: calcula las líneas y los acumulados por entidad. Responde el aporte. */
  generar(id: number): Observable<Aporte> {
    return this.post<Aporte>(`${this.resourcePath}generar/`, cuerpoDe(id));
  }

  /** Revierte la liquidación. */
  desgenerar(id: number): Observable<Aporte> {
    return this.post<Aporte>(`${this.resourcePath}desgenerar/`, cuerpoDe(id));
  }

  /** Aprueba (cierra) el aporte liquidado. */
  aprobar(id: number): Observable<Aporte> {
    return this.post<Aporte>(`${this.resourcePath}aprobar/`, cuerpoDe(id));
  }

  desaprobar(id: number): Observable<Aporte> {
    return this.post<Aporte>(`${this.resourcePath}desaprobar/`, cuerpoDe(id));
  }

  // ── Entregables ───────────────────────────────────────────────────────────

  /**
   * Plano para el operador de PILA: **el entregable del proceso**. Se pide por
   * `POST` con `cuerpoDe(id)`, como el resto de las acciones.
   */
  readonly planoOperadorUrl = `${APORTE_ENDPOINT}plano-operador/`;

  /**
   * PDF del aporte.
   *
   * ⚠️ El legacy imprime pegándole a `general/documento/imprimir/` con
   * `documento_tipo_id: 1` fijo y el id del aporte como `documento_id`. El aporte
   * **no es un documento**, así que esa llamada apunta a otra cosa o está rota; no
   * se porta. Se asume el endpoint propio del proceso.
   *
   * TODO(backend): confirmar la URL real de impresión del aporte.
   */
  readonly imprimirUrl = `${APORTE_ENDPOINT}imprimir/`;
}

/** Cuerpo con el que las acciones del backend identifican un aporte. */
export function cuerpoDe(aporteId: number): { readonly aporte_id: number } {
  return { aporte_id: aporteId };
}

/**
 * Exportaciones a Excel del aporte: el endpoint, el serializador, el filtro que
 * la acota al aporte abierto y el nombre del archivo. Viven en el "Excel ▾" de la
 * pestaña de contratos, como en la programación.
 *
 * ⚠️ El backend todavía no publica `aporte-detalle/excel/`: se pidió (ver
 * `docs/aporte-seguridad-social-pendientes.md`). El serializador sale del ERP
 * anterior.
 */
export const APORTE_EXPORTS = {
  /** Las líneas liquidadas. */
  detalle: {
    url: `${APORTE_DETALLE_ENDPOINT}excel/`,
    serializador: 'informe_aporte_detalle',
    filtro: 'aporte_contrato__aporte_id',
    archivo: 'aporte-detalle.xlsx',
  },
} as const;

/** Clave de una de las exportaciones. */
export type AporteExportKey = keyof typeof APORTE_EXPORTS;

/**
 * Cuerpo de un `POST …excel/`: la convención del ERP —`{ filtros, ordenamientos }`
 * como en un `lista/`— más el serializador que elige la forma del reporte.
 */
export function cuerpoExportacion(
  clave: AporteExportKey,
  aporteId: number,
): AdvancedListBody & { readonly serializador: string } {
  const config = APORTE_EXPORTS[clave];
  const query: ListQuery = {
    filters: [{ field: config.filtro, operator: 'eq', value: aporteId }],
    sort: [],
    page: 0,
    pageSize: 0,
  };
  return { ...buildListBody(query), serializador: config.serializador };
}
