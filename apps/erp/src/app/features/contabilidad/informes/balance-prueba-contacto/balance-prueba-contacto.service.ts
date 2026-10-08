import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type { InformeContactoRow, InformeId } from '../../shared/movimiento-informe.types';

/**
 * Servicio HTTP del informe **Balance de prueba por contacto**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe/`,
 * el body común, la paginación por query params— vive en
 * `MovimientoInformeService`; acá solo se declara el discriminador.
 *
 * Bajo cada auxiliar del plan cuelga una fila `TERCERO` por contacto con
 * movimiento en esa cuenta; no baja hasta el asiento. Por eso sus filas son
 * `InformeContactoRow` y no la del auxiliar general.
 */
@Injectable({ providedIn: 'root' })
export class BalancePruebaContactoService extends MovimientoInformeService<InformeContactoRow> {
  protected readonly informe: InformeId = 'balance_prueba_contacto';
}
