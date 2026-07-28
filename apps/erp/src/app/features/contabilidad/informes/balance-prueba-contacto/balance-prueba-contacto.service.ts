import { Injectable } from '@angular/core';
import { InformeCuentasService } from '../../shared/informe-cuentas.service';
import type {
  InformeCuentasContactoParams,
  SaldoCuentaContactoRow,
} from '../../shared/informe-cuentas.types';

/**
 * Endpoint del informe. El mismo path sirve las tres operaciones —consultar,
 * Excel y PDF— discriminadas por una bandera en el body.
 *
 * Ojo con el nombre: la pantalla del ERP anterior se llamaba "balance de prueba
 * por contacto" pero su endpoint dice `tercero`. Es el mismo concepto.
 */
export const BALANCE_PRUEBA_CONTACTO_ENDPOINT =
  '/contabilidad/movimiento/informe-balance-prueba-tercero/';

/**
 * Servicio HTTP del informe **Balance de prueba por contacto**.
 *
 * Toda la mecánica (POST con `{ parametros }`, respuesta `{ registros }` sin
 * paginar) vive en `InformeCuentasService`; acá solo se declara el endpoint.
 *
 * **Supuesto pendiente de confirmar con backend**: el path y que acepte el
 * parámetro `contacto`.
 */
@Injectable({ providedIn: 'root' })
export class BalancePruebaContactoService extends InformeCuentasService<
  SaldoCuentaContactoRow,
  InformeCuentasContactoParams
> {
  protected readonly endpoint = BALANCE_PRUEBA_CONTACTO_ENDPOINT;
}
