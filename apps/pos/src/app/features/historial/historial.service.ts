import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import {
  BaseHttpService,
  FileDownloadService,
  buildListBody,
  buildListParams,
  type AdvancedListBody,
  type DocumentoListRowBase,
  type ListQuery,
  type PaginatedResponse,
} from '@reddoc/core';
import { HISTORIAL_FILTRO_BASE, HISTORIAL_FORMATO_EXCEL } from './historial.constants';

/** Fila del historial: la del listado de documentos, más los flags que pinta. */
export interface VentaHistorial extends DocumentoListRowBase {
  readonly estado_electronico?: boolean;
}

const DOCUMENTO = '/general/documento/';

/**
 * Ventas de caja del tenant (`POST documento/lista/` acotado a los tipos POS).
 * Los filtros del usuario se suman al filtro base del tipo de documento; las
 * descargas (`imprimir/`, `imprimir-zip/`, `excel/`) mandan ese mismo body;
 * el Excel suma su `formato_excel`.
 */
@Injectable({ providedIn: 'root' })
export class HistorialService extends BaseHttpService {
  private readonly descargas = inject(FileDownloadService);

  list(query: ListQuery): Observable<PaginatedResponse<VentaHistorial>> {
    return this.post<PaginatedResponse<VentaHistorial>>(
      `${DOCUMENTO}lista/`,
      this.body(query),
      buildListParams(query),
    );
  }

  /** Un solo PDF con todas las ventas del query. */
  imprimir(query: ListQuery): Observable<void> {
    return this.descargar('imprimir', query, 'ventas.pdf');
  }

  /** Un ZIP con un PDF por venta. */
  imprimirZip(query: ListQuery): Observable<void> {
    return this.descargar('imprimir-zip', query, 'ventas.zip');
  }

  /** El Excel con las columnas de venta POS (`formato_excel`), no el genérico. */
  exportarExcel(query: ListQuery): Observable<void> {
    return this.descargar('excel', query, 'ventas.xlsx', {
      formato_excel: HISTORIAL_FORMATO_EXCEL,
    });
  }

  /** Sin toast global: el historial avisa con el mensaje que mande el backend. */
  private descargar(
    accion: string,
    query: ListQuery,
    fallbackFilename: string,
    extra: Readonly<Record<string, unknown>> = {},
  ): Observable<void> {
    return this.descargas.download(`${DOCUMENTO}${accion}/`, {
      method: 'POST',
      body: { ...this.body(query), ...extra },
      fallbackFilename,
      errorToast: false,
    });
  }

  private body(query: ListQuery): AdvancedListBody {
    return buildListBody(query, { baseFilters: [HISTORIAL_FILTRO_BASE] });
  }
}
