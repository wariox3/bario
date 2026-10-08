import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/** Endpoint de cabeceras de documento, dueño de las acciones de contabilización. */
const DOCUMENTO_ENDPOINT = '/general/documento/';

/**
 * Contabiliza y descontabiliza documentos.
 *
 * Es **una sola pareja de endpoints para todo el ERP**, sin discriminar por tipo
 * de documento: `general/documento/contabilizar/` y `descontabilizar/`, ambos con
 * `{ ids }`. Por eso vive en `core/` y no en un feature: lo usan la utilidad
 * masiva de Contabilidad (muchos ids) y el diálogo "Contabilidad" de cada ficha
 * de detalle (un solo id).
 *
 * El payload `{ ids }` está verificado contra el ERP anterior, que llama a estos
 * mismos endpoints así (`comun/services/documento/documento.service.ts`), tanto
 * desde la utilidad masiva como desde las opciones de una ficha (`{ ids: [id] }`).
 *
 * Tenant-scoped por defecto (lo hereda de `BaseHttpService`).
 */
@Injectable({ providedIn: 'root' })
export class DocumentoContabilizacionService extends BaseHttpService {
  /** Genera el movimiento contable de los documentos indicados. */
  contabilizar(ids: readonly number[]): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}contabilizar/`, { ids });
  }

  /** Revierte la contabilización de los documentos indicados. */
  descontabilizar(ids: readonly number[]): Observable<unknown> {
    return this.post<unknown>(`${DOCUMENTO_ENDPOINT}descontabilizar/`, { ids });
  }
}
