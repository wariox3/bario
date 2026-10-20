import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { Concepto } from './concepto.model';

/**
 * Servicio HTTP del catálogo de conceptos para la configuración.
 *
 * `configuracion/` devuelve todas las filas en un arreglo, sin paginar y en el
 * orden del catálogo.
 */
@Injectable({ providedIn: 'root' })
export class ConceptoConfiguracionService extends BaseHttpService {
  private readonly resourcePath = '/humano/concepto/';

  listar(): Observable<Concepto[]> {
    return this.get<Concepto[]>(`${this.resourcePath}configuracion/`);
  }
}
