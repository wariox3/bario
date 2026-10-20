import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ConceptoNomina, ConceptoNominaPayload } from './concepto-nomina.model';

/**
 * Servicio HTTP de los conceptos de nómina.
 *
 * `configuracion/` devuelve todas las filas en un arreglo, sin paginar.
 */
@Injectable({ providedIn: 'root' })
export class ConceptoNominaService extends BaseHttpService {
  private readonly resourcePath = '/humano/concepto-nomina/';

  listar(): Observable<ConceptoNomina[]> {
    return this.get<ConceptoNomina[]>(`${this.resourcePath}configuracion/`);
  }

  /** Cambia el concepto que la nómina usa para este rubro. */
  update(id: number, payload: ConceptoNominaPayload): Observable<unknown> {
    return this.patch<unknown>(`${this.resourcePath}${id}/`, payload);
  }
}
