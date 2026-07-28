import { Injectable } from '@angular/core';
import { InformeCuentasService } from '../../shared/informe-cuentas.service';
import type { SaldoCuentaRow } from '../../shared/informe-cuentas.types';

/**
 * Endpoint del informe. El mismo path sirve las tres operaciones —consultar,
 * Excel y PDF— discriminadas por una bandera en el body.
 */
export const BALANCE_PRUEBA_ENDPOINT = '/contabilidad/movimiento/informe-balance-prueba/';

/**
 * Servicio HTTP del informe **Balance de prueba**.
 *
 * Toda la mecánica (POST con `{ parametros }`, respuesta `{ registros }` sin
 * paginar) vive en `InformeCuentasService`; acá solo se declara el endpoint.
 *
 * **Supuesto pendiente de confirmar con backend**: el path.
 */
@Injectable({ providedIn: 'root' })
export class BalancePruebaService extends InformeCuentasService<SaldoCuentaRow> {
  protected readonly endpoint = BALANCE_PRUEBA_ENDPOINT;
}
