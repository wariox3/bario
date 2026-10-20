import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { Impuesto, ImpuestoActualizado, ImpuestoPayload } from './impuesto.model';

/**
 * Servicio HTTP del catálogo de impuestos.
 *
 * Tenant-scoped: el catálogo es común pero la cuenta contable la elige cada
 * empresa. El listado es el `configuracion/` del recurso: devuelve el catálogo
 * entero, sin paginar y ya ordenado, igual que los tipos de documento.
 */
@Injectable({ providedIn: 'root' })
export class ImpuestoService extends BaseHttpService {
  private readonly resourcePath = '/general/impuesto/';

  /** Todo el catálogo en un arreglo, sin paginar y en el orden del backend. */
  listar(): Observable<Impuesto[]> {
    return this.get<Impuesto[]>(`${this.resourcePath}configuracion/`);
  }

  /** Asigna (o quita, con `null`) la cuenta contable del impuesto. */
  update(id: number, payload: ImpuestoPayload): Observable<ImpuestoActualizado> {
    return this.patch<ImpuestoActualizado>(`${this.resourcePath}${id}/`, payload);
  }
}
