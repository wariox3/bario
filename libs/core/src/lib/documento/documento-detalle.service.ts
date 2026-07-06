import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '../services/base-http.service';
import type { PaginatedResponse } from '../models/pagination.model';

/** Endpoint CRUD de líneas de documento (compartido por todos los documentos). */
const DOCUMENTO_DETALLE_ENDPOINT = '/general/documento-detalle/';

/**
 * Tamaño de página al traer las líneas de un documento. Un documento real no
 * llega a este volumen de líneas, así que pedimos todo en una sola página y
 * evitamos paginar la edición.
 */
const DETALLE_PAGE_SIZE = 1000;

/**
 * CRUD de **líneas de documento** (`/api/general/documento-detalle/`).
 *
 * Las líneas son transversales a todo documento transaccional del framework
 * (camino A): factura, nota crédito, nota débito, contrato servicio, etc. Todas
 * transaccionan igual (POST con el `documento` FK, PATCH por `id`), así que el
 * CRUD vive aquí —en el framework— y no duplicado en cada feature.
 *
 * Es **agnóstico del documento**: el body viaja como `object` genérico y el tipo
 * de lectura se parametriza por llamada (`crear<MiDetalleRead>(…)`); los tipos
 * concretos de cada documento se quedan en su feature.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoDetalleService extends BaseHttpService {
  /**
   * Lista las líneas de un documento (`GET …documento-detalle/?documento_id=`).
   *
   * Desde que la cabecera (`GET documento/:id/`) dejó de embeber `detalles`, la
   * edición trae las líneas en una segunda petición a este endpoint. Respuesta
   * paginada estándar (`PaginatedResponse`); devolvemos solo los `results`.
   */
  listarPorDocumento<TRead = unknown>(documentoId: number): Observable<TRead[]> {
    return this.get<PaginatedResponse<TRead>>(DOCUMENTO_DETALLE_ENDPOINT, {
      documento_id: documentoId,
      limit: DETALLE_PAGE_SIZE,
    }).pipe(map((res) => [...res.results]));
  }

  /** Trae una línea por su `id` (`GET …documento-detalle/<id>/`). */
  obtenerPorId<TRead = unknown>(id: number): Observable<TRead> {
    return this.get<TRead>(`${DOCUMENTO_DETALLE_ENDPOINT}${id}/`);
  }

  /**
   * Lista las líneas que **afectan** a una línea dada vía
   * `POST …documento-detalle/lista/` con body
   * `{ filtros: [{ propiedad: 'documento_detalle_afectado_id', operador: '=', valor }] }`
   * (misma convención de filtros que el listado de documentos). Pueden ser varias,
   * por eso es lista. La paginación viaja como query param (`?limit=`); respuesta
   * paginada estándar (`count`/`results`), devolvemos `results`.
   */
  listarPorAfectado<TRead = unknown>(afectadoId: number): Observable<TRead[]> {
    return this.post<PaginatedResponse<TRead>>(
      `${DOCUMENTO_DETALLE_ENDPOINT}lista/`,
      {
        filtros: [{ propiedad: 'documento_detalle_afectado_id', operador: '=', valor: afectadoId }],
      },
      { limit: DETALLE_PAGE_SIZE },
    ).pipe(map((res) => [...res.results]));
  }

  /** Crea una línea asociada al documento `documentoId`. Devuelve la línea creada. */
  crear<TRead = unknown>(documentoId: number, payload: object): Observable<TRead> {
    return this.post<TRead>(DOCUMENTO_DETALLE_ENDPOINT, { ...payload, documento: documentoId });
  }

  /**
   * Alta **masiva** de líneas en un documento existente
   * (`POST /general/documento-detalle/masivo/`). Una sola request para N líneas;
   * la usa "importar desde documento" en modo edición.
   *
   * La forma de la respuesta del backend está pendiente de confirmar (¿devuelve
   * las líneas creadas o solo un OK?); por eso el tipo de lectura se parametriza
   * por llamada y el default es `unknown`.
   */
  crearMasivo<TRead = unknown>(
    documentoId: number,
    detalles: readonly object[],
  ): Observable<TRead> {
    return this.post<TRead>(`${DOCUMENTO_DETALLE_ENDPOINT}masivo/`, {
      documento: documentoId,
      detalles,
    });
  }

  /** Actualiza una línea existente por su `id`. */
  actualizar<TRead = unknown>(id: number, payload: object): Observable<TRead> {
    return this.patch<TRead>(`${DOCUMENTO_DETALLE_ENDPOINT}${id}/`, payload);
  }

  /** Elimina una línea existente por su `id`. */
  eliminar(id: number): Observable<void> {
    return this.delete(`${DOCUMENTO_DETALLE_ENDPOINT}${id}/`);
  }
}
