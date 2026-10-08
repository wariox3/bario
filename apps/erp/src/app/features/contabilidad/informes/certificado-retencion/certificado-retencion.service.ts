import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type { InformeCertificadoRow, InformeId } from '../../shared/movimiento-informe.types';

/**
 * Servicio HTTP del informe **Certificado de retención**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe/`,
 * el body común, la paginación por query params— vive en
 * `MovimientoInformeService`; acá solo se declara el discriminador.
 *
 * Es uno de los cuatro **planos**: no recorre el plan de cuentas, así que no
 * trae jerarquía ni subtotales y `totales/` suma todas sus filas.
 */
@Injectable({ providedIn: 'root' })
export class CertificadoRetencionService extends MovimientoInformeService<InformeCertificadoRow> {
  protected readonly informe: InformeId = 'certificado_retencion';
}
