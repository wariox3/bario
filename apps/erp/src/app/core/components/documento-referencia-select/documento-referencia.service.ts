import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  BaseHttpService,
  LIST_PAGINATION_PARAMS,
  buildFiltros,
  type FilterCondition,
} from '@reddoc/core';
import type { CarteraTipo } from '@erp/core/module-config';

/** Mismo `lista/` de documentos que usan el framework y el cruce de cartera. */
const DOCUMENTO_LISTA_ENDPOINT = '/general/documento/lista/';

/** Cuántas facturas trae cada búsqueda: el desplegable no pagina. */
const REFERENCIA_PAGE_SIZE = 20;

/** Lo que el select lee de cada documento referenciable. */
export interface DocumentoReferenciaApi {
  readonly id: number;
  readonly numero?: number | string | null;
  readonly fecha?: string | null;
  readonly total?: string | number | null;
  readonly contacto?: number | null;
  readonly documento_tipo_operacion?: number | null;
  readonly estado_aprobado?: boolean;
}

interface DocumentoReferenciaApiResponse {
  readonly results: readonly DocumentoReferenciaApi[];
}

/**
 * Busca los documentos que una nota puede referenciar: las facturas aprobadas del
 * contacto, de la familia de cartera indicada (`cobrar` en venta, `pagar` en
 * compra). Usa `POST documento/lista/` con los filtros que ya probó el cruce de
 * cartera (`contacto_id`, `documento_tipo__cobrar|pagar`) más los que el legacy
 * aplicaba a la referencia (`documento_tipo__operacion = 1`, aprobada).
 *
 * El backend ignora en silencio un filtro que no tenga declarado y devuelve la
 * lista sin filtrar, así que el resultado se vuelve a acotar en el cliente: nunca
 * se ofrece un documento de otro contacto, no aprobado o que no sea factura.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoReferenciaService extends BaseHttpService {
  buscar(
    contactoId: number,
    cartera: CarteraTipo,
    numero: string,
  ): Observable<readonly DocumentoReferenciaApi[]> {
    const filtros: FilterCondition[] = [
      { field: 'contacto_id', operator: 'eq', value: contactoId },
      {
        field: cartera === 'cobrar' ? 'documento_tipo__cobrar' : 'documento_tipo__pagar',
        operator: 'eq',
        value: true,
      },
      { field: 'documento_tipo__operacion', operator: 'eq', value: 1 },
      { field: 'estado_aprobado', operator: 'eq', value: true },
    ];
    // `numero` es entero en el backend: se busca exacto, y solo si lo tecleado es un número.
    if (/^\d+$/.test(numero)) filtros.push({ field: 'numero', operator: 'eq', value: numero });

    return this.post<DocumentoReferenciaApiResponse>(
      DOCUMENTO_LISTA_ENDPOINT,
      { filtros: buildFiltros(filtros), ordenamientos: ['-id'] },
      { [LIST_PAGINATION_PARAMS.page]: 1, [LIST_PAGINATION_PARAMS.size]: REFERENCIA_PAGE_SIZE },
    ).pipe(
      map((res) =>
        res.results.filter(
          (doc) =>
            doc.contacto === contactoId &&
            doc.estado_aprobado === true &&
            (doc.documento_tipo_operacion == null || doc.documento_tipo_operacion === 1),
        ),
      ),
    );
  }
}
