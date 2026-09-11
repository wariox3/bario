import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import {
  BaseHttpService,
  DocumentoDetalleService,
  buildFiltros,
  buildListBody,
  buildListParams,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { DocumentoService } from '@erp/core/module-config/data/documento.service';
import { CREDITO_PAGO_FILTER_FIELD } from './credito.constants';
import type {
  Credito,
  CreditoPayload,
  CreditoPago,
  CreditoPagoDocumentoRead,
  CreditoPagoLineaRead,
} from './credito.model';

@Injectable({ providedIn: 'root' })
export class CreditoService extends BaseHttpService {
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly documentoService = inject(DocumentoService);

  private readonly resourcePath = '/humano/credito/';

  list(query: ListQuery): Observable<PaginatedResponse<Credito>> {
    return this.post<PaginatedResponse<Credito>>(
      this.resourcePath + 'lista/',
      buildListBody(query),
      buildListParams(query),
    );
  }

  getById(id: number): Observable<Credito> {
    return this.get<Credito>(`${this.resourcePath}${id}/`);
  }

  create(payload: CreditoPayload): Observable<Credito> {
    return this.post<Credito>(this.resourcePath, payload);
  }

  update(id: number, payload: CreditoPayload): Observable<Credito> {
    return this.put<Credito>(`${this.resourcePath}${id}/`, payload);
  }

  remove(ids: readonly number[]): Observable<void> {
    if (ids.length === 0) {
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }
    const deletions = ids.map((id) => this.delete<void>(`${this.resourcePath}${id}/`));
    return forkJoin(deletions).pipe(map(() => undefined));
  }

  /**
   * Pagos aplicados al crédito: cada descuento hecho al empleado en una nómina.
   *
   * **No hay entidad de pagos en el backend**: son líneas de documento que
   * apuntan al crédito, así que se piden al `lista/` de `documento-detalle`
   * filtrando por la FK. Es lo mismo que hacía el ERP anterior, que además
   * pedía un serializador propio (`credito_pago`) que la API nueva ya no tiene.
   *
   * La línea no trae el número ni la fecha de su nómina, así que van en una
   * segunda petición a las cabeceras. Si esa falla, los pagos se muestran igual
   * sin esas dos columnas: el valor descontado es lo que se viene a ver.
   *
   * ⚠️ Dos supuestos sin confirmar, anotados en `humano/PENDIENTES.md`: que
   * `credito_id` sea filtrable, y de qué campo sale el valor del descuento.
   */
  pagos(id: number): Observable<readonly CreditoPago[]> {
    return this.detalleService
      .listarPorFiltros<CreditoPagoLineaRead>(
        buildFiltros([{ field: CREDITO_PAGO_FILTER_FIELD, operator: 'eq', value: id }]),
      )
      .pipe(switchMap((lineas) => this.conCabeceras(lineas)));
  }

  /** Completa cada línea con el número y la fecha del documento que la generó. */
  private conCabeceras(
    lineas: readonly CreditoPagoLineaRead[],
  ): Observable<readonly CreditoPago[]> {
    const ids = [...new Set(lineas.map((l) => l.documento).filter((d): d is number => d != null))];
    if (ids.length === 0) return of(lineas.map((l) => toCreditoPago(l)));

    return this.documentoService.listarPorIds<CreditoPagoDocumentoRead>(ids).pipe(
      map((cabeceras) => {
        const porId = new Map(cabeceras.map((c) => [c.id, c]));
        return lineas.map((l) =>
          toCreditoPago(l, l.documento != null ? porId.get(l.documento) : undefined),
        );
      }),
      catchError(() => of(lineas.map((l) => toCreditoPago(l)))),
    );
  }
}

/**
 * Línea + cabecera → fila de la card.
 *
 * El valor sale de `pago`, que es como lo llamaba el ERP anterior, y se cae a
 * `total` mientras el serializador actual no exponga el primero.
 */
function toCreditoPago(
  linea: CreditoPagoLineaRead,
  documento?: CreditoPagoDocumentoRead,
): CreditoPago {
  return {
    id: linea.id,
    pago: linea.pago ?? linea.total ?? null,
    fecha: documento?.fecha ?? null,
    documento: documento?.numero ?? null,
  };
}
