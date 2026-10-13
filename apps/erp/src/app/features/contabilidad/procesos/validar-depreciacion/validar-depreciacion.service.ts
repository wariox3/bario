import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ValidarDepreciacionResult } from './validar-depreciacion.model';

/** Endpoint del proceso: recalcula la depreciación de los activos y corrige la que no cuadra. */
export const VALIDAR_DEPRECIACION_ENDPOINT = '/general/documento/depreciacion-validar/';

/**
 * Servicio HTTP del proceso **Validar depreciación**.
 *
 * El backend recalcula `depreciacion_acumulada` (suma de las líneas de depreciación
 * en documentos aprobados y sin anular) y `depreciacion_saldo` de todos los activos,
 * corrige los que no cuadran y responde solo si corrió (`{ ejecutado }`). No lleva
 * parámetros: el cuerpo va vacío.
 *
 * `tenantScoped` queda en su default `true`, como el resto de `/general/...`.
 */
@Injectable({ providedIn: 'root' })
export class ValidarDepreciacionService extends BaseHttpService {
  validar(): Observable<ValidarDepreciacionResult> {
    return this.post<ValidarDepreciacionResult>(VALIDAR_DEPRECIACION_ENDPOINT, {});
  }
}
