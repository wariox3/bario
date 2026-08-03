import { Injectable } from '@angular/core';
import { InformeCuentasService } from '../../shared/informe-cuentas.service';
import type { SaldoCuentaRow } from '../../shared/informe-cuentas.types';

/**
 * Endpoint del informe. El mismo path sirve las tres operaciones —consultar,
 * Excel y PDF— discriminadas por una bandera en el body.
 */
export const AUXILIAR_CUENTA_ENDPOINT = '/contabilidad/movimiento/informe-auxiliar-cuenta/';

/**
 * Servicio HTTP del informe **Auxiliar de cuenta**.
 *
 * Toda la mecánica (POST con `{ parametros }`, respuesta `{ registros }` sin
 * paginar) vive en `InformeCuentasService`; acá solo se declara el endpoint.
 *
 * **Supuesto pendiente de confirmar con backend**: el path, y sobre todo la
 * forma de la fila — ver la nota de la página sobre qué devuelve este informe.
 */
@Injectable({ providedIn: 'root' })
export class AuxiliarCuentaService extends InformeCuentasService<SaldoCuentaRow> {
  protected readonly endpoint = AUXILIAR_CUENTA_ENDPOINT;
}
