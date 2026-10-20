import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type {
  DocumentoTipo,
  DocumentoTipoActualizado,
  DocumentoTipoPayload,
} from './documento-tipo.model';

/**
 * Servicio HTTP del catálogo de tipos de documento.
 *
 * Tenant-scoped (cada empresa configura los suyos). El listado es el
 * `configuracion/` del recurso: devuelve el catálogo entero, sin paginar y ya
 * ordenado, porque son pocas filas fijas.
 */
@Injectable({ providedIn: 'root' })
export class DocumentoTipoService extends BaseHttpService {
  private readonly resourcePath = '/general/documento-tipo/';

  /** Todo el catálogo en un arreglo, sin paginar y en el orden del backend. */
  listar(): Observable<DocumentoTipo[]> {
    return this.get<DocumentoTipo[]>(`${this.resourcePath}configuracion/`);
  }

  /**
   * Actualiza lo configurable del tipo. Va por PATCH y no por PUT: el PUT exige
   * `consecutivo` y no admite omitir nada, y acá siempre mandamos los campos
   * juntos pero sin comprometernos a que el backend los siga exigiendo.
   */
  update(id: number, payload: DocumentoTipoPayload): Observable<DocumentoTipoActualizado> {
    return this.patch<DocumentoTipoActualizado>(`${this.resourcePath}${id}/`, payload);
  }
}
