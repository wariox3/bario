import { Injectable } from '@angular/core';
import { InformeCuentasService } from '../../shared/informe-cuentas.service';
import type {
  InformeCuentasMovimientoParams,
  SaldoCuentaMovimientoRow,
} from '../../shared/informe-cuentas.types';

/**
 * Endpoint del informe. Sirve la consulta y el Excel, discriminados por una
 * bandera en el body. **No sirve PDF**: el ERP anterior tenía ese método
 * comentado, así que la página no ofrece el botón.
 */
export const AUXILIAR_GENERAL_ENDPOINT = '/contabilidad/movimiento/informe-auxiliar-general/';

/**
 * Servicio HTTP del informe **Auxiliar general**.
 *
 * Toda la mecánica (POST con `{ parametros }`, respuesta `{ registros }` sin
 * paginar) vive en `InformeCuentasService`; acá solo se declara el endpoint.
 *
 * **Supuestos pendientes de confirmar con backend**: el path, que acepte los
 * parámetros `contacto`, `numero` y `comprobante`, y si el endpoint sirve PDF
 * (el legacy no lo pedía).
 */
@Injectable({ providedIn: 'root' })
export class AuxiliarGeneralService extends InformeCuentasService<
  SaldoCuentaMovimientoRow,
  InformeCuentasMovimientoParams
> {
  protected readonly endpoint = AUXILIAR_GENERAL_ENDPOINT;
}
