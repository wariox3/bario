import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { ValidarCreditosResult } from './validar-creditos.model';

/** Endpoint del proceso: recalcula los saldos de los créditos y corrige los que no cuadran. */
export const VALIDAR_CREDITOS_ENDPOINT = '/humano/credito/validar/';

/**
 * Servicio HTTP del proceso **Validar créditos**.
 *
 * El backend recalcula `abono` (lo descontado por el crédito en nóminas aprobadas
 * y sin anular), `cuota_actual` y `saldo` (`total - abono`) de todos los créditos,
 * corrige los que no cuadran y responde cuántos corrigió. No lleva parámetros: el
 * cuerpo va vacío.
 *
 * `tenantScoped` queda en su default `true`, como el resto de `/humano/...`.
 */
@Injectable({ providedIn: 'root' })
export class ValidarCreditosService extends BaseHttpService {
  validar(): Observable<ValidarCreditosResult> {
    return this.post<ValidarCreditosResult>(VALIDAR_CREDITOS_ENDPOINT, {});
  }
}
