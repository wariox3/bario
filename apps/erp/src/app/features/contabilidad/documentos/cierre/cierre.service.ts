import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import { CARGAR_CIERRE_ENDPOINT, ELIMINAR_DETALLES_ENDPOINT } from './cierre.constants';
import type { CargarCierrePayload } from './cierre.model';

/**
 * Las dos operaciones propias del cierre contable, que el gateway genérico del
 * framework no cubre porque son endpoints del documento y no CRUD.
 *
 * Tenant-scoped (el default de `BaseHttpService`): los dos endpoints viven en el
 * schema del tenant, como el resto de `general/`.
 */
@Injectable({ providedIn: 'root' })
export class CierreService extends BaseHttpService {
  /**
   * Genera las líneas del cierre: traslada los saldos de las cuentas de
   * resultado del rango a la cuenta de cierre.
   *
   * La respuesta no se usa: el llamador recarga las líneas, que son la fuente
   * autoritativa.
   */
  cargarCierre(payload: CargarCierrePayload): Observable<unknown> {
    return this.post<unknown>(CARGAR_CIERRE_ENDPOINT, payload);
  }

  /** Borra todas las líneas del documento de un golpe. */
  eliminarDetalles(documentoId: number): Observable<unknown> {
    return this.post<unknown>(ELIMINAR_DETALLES_ENDPOINT, { documento_id: documentoId });
  }
}
