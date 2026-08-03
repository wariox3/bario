import { Injectable } from '@angular/core';
import { InformeCuentasService } from '../../shared/informe-cuentas.service';
import type { InformeCuentasRangoContactoParams } from '../../shared/informe-cuentas.types';
import type { CertificadoRetencionRow } from './certificado-retencion.model';

/**
 * Endpoint del informe. El mismo path sirve las tres operaciones —consultar,
 * Excel y PDF— discriminadas por una bandera en el body.
 */
export const CERTIFICADO_RETENCION_ENDPOINT =
  '/contabilidad/movimiento/informe-certificado-retencion/';

/**
 * Servicio HTTP del informe **Certificado de retención**.
 *
 * Toda la mecánica (POST con `{ parametros }`, respuesta `{ registros }` sin
 * paginar) vive en `InformeCuentasService`; acá solo se declara el endpoint.
 *
 * **Supuesto pendiente de confirmar con backend**: el path y que acepte
 * `contacto_id`.
 */
@Injectable({ providedIn: 'root' })
export class CertificadoRetencionService extends InformeCuentasService<
  CertificadoRetencionRow,
  InformeCuentasRangoContactoParams
> {
  protected readonly endpoint = CERTIFICADO_RETENCION_ENDPOINT;
}
