import { Injectable } from '@angular/core';
import { InformeCuentasService } from '../../shared/informe-cuentas.service';
import type { EstadoFinancieroRow, InformePeriodoParams } from '../../shared/informe-cuentas.types';

/**
 * Endpoint del informe. Sirve la consulta y el Excel, discriminados por una
 * bandera en el body. **No sirve PDF**: el ERP anterior no ponía el botón.
 */
export const ESTADO_SITUACION_FINANCIERA_ENDPOINT =
  '/contabilidad/movimiento/informe-estado-situacion-financiera/';

/**
 * Servicio HTTP del informe **Estado de situación financiera**.
 *
 * Toda la mecánica (POST con `{ parametros }`, respuesta `{ registros }` sin
 * paginar) vive en `InformeCuentasService`; acá solo se declara el endpoint.
 *
 * **Supuestos pendientes de confirmar con backend**: el path y que le baste el
 * periodo (el ERP anterior mandaba además rango de cuentas y contacto, pero
 * siempre vacíos porque su pantalla no los ofrecía).
 */
@Injectable({ providedIn: 'root' })
export class EstadoSituacionFinancieraService extends InformeCuentasService<
  EstadoFinancieroRow,
  InformePeriodoParams
> {
  protected readonly endpoint = ESTADO_SITUACION_FINANCIERA_ENDPOINT;
}
