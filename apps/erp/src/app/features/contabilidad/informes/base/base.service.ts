import { Injectable } from '@angular/core';
import { InformeCuentasService } from '../../shared/informe-cuentas.service';
import type { BaseMovimientoRow, InformeBaseParams } from './base.model';

/**
 * Endpoint del informe. Sirve la consulta y el Excel, discriminados por una
 * bandera en el body. **No sirve PDF**: el ERP anterior ni siquiera ponía el
 * botón en esta pantalla.
 */
export const INFORME_BASE_ENDPOINT = '/contabilidad/movimiento/informe-base/';

/**
 * Servicio HTTP del informe **Base**.
 *
 * Toda la mecánica (POST con `{ parametros }`, respuesta `{ registros }` sin
 * paginar) vive en `InformeCuentasService`; acá solo se declara el endpoint.
 *
 * **Supuestos pendientes de confirmar con backend**: el path y que acepte
 * `contacto_id`.
 */
@Injectable({ providedIn: 'root' })
export class InformeBaseService extends InformeCuentasService<
  BaseMovimientoRow,
  InformeBaseParams
> {
  protected readonly endpoint = INFORME_BASE_ENDPOINT;
}
