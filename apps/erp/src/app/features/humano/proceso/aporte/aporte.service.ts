import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
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
   * Página de contratos del aporte. `page` es 1-based, como espera el backend.
   *
   * El legacy pedía `limit: 1000` y aun así mostraba paginador; acá se pagina de
   * verdad.
   */
  listarContratos(
    aporteId: number,
    page: number,
    limit: number,
    filtros: readonly FilterCondition[] = [],
  ): Observable<PaginatedResponse<AporteContrato>> {
    return this.get<PaginatedResponse<AporteContrato>>(APORTE_CONTRATO_ENDPOINT, {
      aporte_id: aporteId,
      page,
      limit,
      ordering: 'contrato_id',
      ...filtrosComoParams(filtros),
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
    return this.post<CargarContratosResultado>(`${this.resourcePath}cargar-contrato/`, { id });
  }

  // ── Líneas liquidadas ─────────────────────────────────────────────────────

  /** Página de líneas liquidadas. Solo lectura: las fabrica el backend al generar. */
  listarDetalles(
    aporteId: number,
    page: number,
    limit: number,
    filtros: readonly FilterCondition[] = [],
  ): Observable<PaginatedResponse<AporteDetalle>> {
    return this.get<PaginatedResponse<AporteDetalle>>(APORTE_DETALLE_ENDPOINT, {
      aporte_contrato__aporte_id: aporteId,
      page,
      limit,
      ...filtrosComoParams(filtros),
    });
  }

  /**
   * Todas las entidades del aporte, sin paginar: los subtotales se calculan
   * sobre el conjunto completo (ver `APORTE_ENTIDADES_LIMITE`).
   */
  listarEntidades(aporteId: number): Observable<PaginatedResponse<AporteEntidad>> {
    return this.get<PaginatedResponse<AporteEntidad>>(APORTE_ENTIDAD_ENDPOINT, {
      aporte_id: aporteId,
      ordering: 'tipo',
      limit: APORTE_ENTIDADES_LIMITE,
    });
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  /** Liquida: calcula las líneas y los acumulados por entidad. */
  generar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}generar/`, { id });
  }

  /** Revierte la liquidación. */
  desgenerar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}desgenerar/`, { id });
  }

  /** Aprueba (cierra) el aporte liquidado. */
  aprobar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}aprobar/`, { id });
  }

  desaprobar(id: number): Observable<unknown> {
    return this.post<unknown>(`${this.resourcePath}desaprobar/`, { id });
  }

  // ── Entregables ───────────────────────────────────────────────────────────

  /**
   * Plano para el operador de PILA: **el entregable del proceso**. Se pide por
   * `POST` con el id en el body, como el resto de las acciones.
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

/**
 * Traduce los filtros de la UI a **query params**.
 *
 * Los tres niveles del aporte se listan por `GET`, no por el `POST …/lista/` de
 * los masters, así que no sirven `buildFiltros`/`buildListBody`, que arman un
 * body. La convención es la misma que aplica `serializeListQuery` de
 * `@reddoc/core`: `campo=valor` para igualdad y `campo__operador=valor` para el
 * resto, al estilo Django REST.
 *
 * No se reutiliza aquella función porque devuelve `HttpParams` con su propia
 * paginación (`page` / `page_size`) y estos endpoints paginan con `limit`.
 */
function filtrosComoParams(filtros: readonly FilterCondition[]): Record<string, string> {
  const params: Record<string, string> = {};
  for (const filtro of filtros) {
    const clave = filtro.operator === 'eq' ? filtro.field : `${filtro.field}__${filtro.operator}`;
    params[clave] = Array.isArray(filtro.value)
      ? filtro.value.join(',')
      : String(filtro.value ?? '');
  }
  return params;
}

/**
 * Las tres exportaciones a Excel del aporte, con el endpoint, el serializador y
 * el filtro de cada una.
 *
 * ⚠️ Los serializadores y los filtros salen del ERP anterior, que además los pedía
 * por **GET con query params**; acá se usan con el `POST …excel/` que es la
 * convención del ERP. Mismo supuesto que arrastran los otros informes portados.
 */
export const APORTE_EXPORTS = {
  /** Los contratos incluidos. */
  contratos: {
    url: `${APORTE_CONTRATO_ENDPOINT}excel/`,
    serializador: 'informe_aporte_contrato',
    filtro: 'aporte_id',
    archivo: 'aporte-contratos.xlsx',
  },
  /** Las líneas liquidadas. */
  detalles: {
    url: `${APORTE_DETALLE_ENDPOINT}excel/`,
    serializador: 'informe_aporte_detalle',
    filtro: 'aporte_contrato__aporte_id',
    archivo: 'aporte-detalles.xlsx',
  },
  /** La cotización por entidad. */
  entidades: {
    url: `${APORTE_ENTIDAD_ENDPOINT}excel/`,
    serializador: 'informe_aporte_entidad',
    filtro: 'aporte_id',
    archivo: 'aporte-entidades.xlsx',
  },
} as const;

/** Clave de una de las tres exportaciones. */
export type AporteExportKey = keyof typeof APORTE_EXPORTS;
