import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService, buildFiltros, type PaginatedResponse } from '@reddoc/core';
import type { DocumentoElectronicoError } from './documento-electronico.types';

/**
 * Errores de emisión de un documento electrónico. Genérico: sirve igual para
 * una factura de venta que para un documento soporte de compra.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoElectronicoErrorService extends BaseHttpService {
  /**
   * Errores del último intento de emitir un documento: `POST
   * documento-electronico-error/lista/` filtrando por `documento_id`.
   */
  errores(documentoId: number): Observable<PaginatedResponse<DocumentoElectronicoError>> {
    return this.post<PaginatedResponse<DocumentoElectronicoError>>(
      '/general/documento-electronico-error/lista/',
      {
        filtros: buildFiltros([{ field: 'documento_id', operator: 'eq', value: documentoId }]),
        ordenamientos: [],
      },
    );
  }
}
