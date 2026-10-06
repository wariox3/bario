import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import type { CarteraTipo } from '@erp/core/module-config';
import type { ValidarSaldosPayload, ValidarSaldosResult } from './validar-saldos.model';

/** Endpoint del proceso: recalcula los saldos y corrige los que no cuadran. */
export const VALIDAR_SALDOS_ENDPOINT = '/general/documento/cartera-validar/';

/**
 * Servicio HTTP del proceso **Validar saldos**.
 *
 * El backend recalcula `pago`, `afectado` y `pendiente` desde su origen, corrige
 * los que no cuadran y responde solo si corrió (`{ ejecutado }`). Cartera revisa
 * las cuentas por cobrar (`cobrar`) y Tesorería las por pagar (`pagar`).
 *
 * `tenantScoped` queda en su default `true`, como el resto de `/general/...`.
 */
@Injectable({ providedIn: 'root' })
export class ValidarSaldosService extends BaseHttpService {
  validar(tipo: CarteraTipo): Observable<ValidarSaldosResult> {
    const payload: ValidarSaldosPayload = { tipo };
    return this.post<ValidarSaldosResult>(VALIDAR_SALDOS_ENDPOINT, payload);
  }
}
