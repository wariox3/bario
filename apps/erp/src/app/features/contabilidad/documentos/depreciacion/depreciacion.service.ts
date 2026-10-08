import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import { CARGAR_ACTIVOS_ENDPOINT } from './depreciacion.constants';

/**
 * Única operación propia de la depreciación: pedirle al backend que **genere las
 * líneas** del documento a partir de los activos fijos del mes.
 *
 * Todo lo demás (cabecera, listado, aprobar) lo cubre el gateway genérico del
 * framework; esto no encaja ahí porque es un endpoint del documento y no una
 * operación CRUD.
 *
 * Tenant-scoped (el default de `BaseHttpService`): el endpoint vive en el schema
 * del tenant, como el resto de `general/documento/`.
 */
@Injectable({ providedIn: 'root' })
export class DepreciacionService extends BaseHttpService {
  /**
   * Genera las líneas del documento desde los activos fijos.
   *
   * Devuelve el documento con su `total` actualizado, pero la respuesta no se
   * usa: el llamador recarga las líneas, que son la fuente autoritativa y las
   * únicas que la pantalla necesita.
   */
  cargarActivos(documentoId: number): Observable<unknown> {
    return this.post<unknown>(CARGAR_ACTIVOS_ENDPOINT, { id: documentoId });
  }
}
