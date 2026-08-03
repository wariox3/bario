import { Injectable } from '@angular/core';
import { InformeCuentasService } from '../../shared/informe-cuentas.service';
import type {
  InformeCuentasMovimientoParams,
  SaldoCuentaContactoRow,
} from '../../shared/informe-cuentas.types';

/**
 * Endpoint del informe. Sirve la consulta y el Excel, discriminados por una
 * bandera en el body. **No sirve PDF**: el ERP anterior tenía ese método
 * comentado, así que la página no ofrece el botón.
 *
 * Ojo con el nombre: la pantalla se llama "auxiliar por contacto" pero su
 * endpoint dice `tercero`. Es el mismo concepto, igual que en el balance.
 */
export const AUXILIAR_CONTACTO_ENDPOINT = '/contabilidad/movimiento/informe-auxiliar-tercero/';

/**
 * Servicio HTTP del informe **Auxiliar por contacto**.
 *
 * Toda la mecánica (POST con `{ parametros }`, respuesta `{ registros }` sin
 * paginar) vive en `InformeCuentasService`; acá solo se declara el endpoint.
 *
 * **Supuestos pendientes de confirmar con backend**: el path, que acepte los
 * parámetros `contacto`, `numero` y `comprobante`, y si el endpoint sirve PDF
 * (el legacy no lo pedía).
 */
@Injectable({ providedIn: 'root' })
export class AuxiliarContactoService extends InformeCuentasService<
  SaldoCuentaContactoRow,
  InformeCuentasMovimientoParams
> {
  protected readonly endpoint = AUXILIAR_CONTACTO_ENDPOINT;
}
