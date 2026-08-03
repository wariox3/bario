import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  BaseHttpService,
  buildListBody,
  buildListParams,
  type FilterCondition,
  type ListQuery,
} from '@reddoc/core';
import type { CarteraTipo, DocumentoPendienteApi } from './agregar-documento.types';

/** Endpoint genérico de documentos (mismo `lista/` que usa el framework camino A). */
const DOCUMENTO_LISTA_ENDPOINT = '/general/documento/lista/';

/**
 * Serializador liviano del backend para el cruce: devuelve `pendiente` y la
 * cuenta de cruce del tipo. ⚠️ Asumido: que `lista/` acepte el query param
 * `serializador` igual que el GET del legacy.
 */
const SERIALIZADOR_ADICIONAR = 'adicionar';

/** Respuesta paginada cruda del backend (Django REST). */
interface DocumentoPendienteApiResponse {
  readonly count: number;
  readonly results: readonly DocumentoPendienteApi[];
}

/** Página de documentos pendientes ya normalizada para la tabla del modal. */
export interface DocumentosPendientesPage {
  readonly results: readonly DocumentoPendienteApi[];
  readonly totalCount: number;
}

/**
 * Filtro que define la familia de cartera: solo tipos de documento que mueven
 * CxC (`documento_tipo__cobrar`) o CxP (`documento_tipo__pagar`).
 */
function carteraFilter(carteraTipo: CarteraTipo): FilterCondition {
  return {
    field: carteraTipo === 'cobrar' ? 'documento_tipo__cobrar' : 'documento_tipo__pagar',
    operator: 'eq',
    value: true,
  };
}

/**
 * Acceso a los **documentos pendientes de cruce** que alimentan el modal de
 * "agregar documento" (pago/egreso). Usa la misma convención de listas del ERP
 * (body `{ filtros, ordenamientos }` + paginación por query params) con los
 * helpers autoritativos de `@reddoc/core`, espejo de `ImportarDocumentoService`.
 */
@Injectable({ providedIn: 'root' })
export class AgregarDocumentoService extends BaseHttpService {
  /**
   * Lista documentos con saldo pendiente de la familia indicada.
   * `POST /general/documento/lista/?serializador=adicionar` con los filtros
   * base (`documento_tipo__cobrar|pagar = true`, `pendiente > 0`) antepuestos a
   * los del `query` → traduce `count` a `totalCount`.
   */
  listarPendientes(
    carteraTipo: CarteraTipo,
    query: ListQuery,
  ): Observable<DocumentosPendientesPage> {
    const baseFilters: readonly FilterCondition[] = [
      carteraFilter(carteraTipo),
      { field: 'pendiente', operator: 'gt', value: 0 },
    ];
    return this.post<DocumentoPendienteApiResponse>(
      DOCUMENTO_LISTA_ENDPOINT,
      buildListBody(query, { baseFilters }),
      { ...buildListParams(query), serializador: SERIALIZADOR_ADICIONAR },
    ).pipe(map((res) => ({ results: res.results, totalCount: res.count })));
  }
}
