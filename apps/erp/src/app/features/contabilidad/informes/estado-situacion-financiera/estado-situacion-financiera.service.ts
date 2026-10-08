import { Injectable } from '@angular/core';
import { MovimientoInformeService } from '../../shared/movimiento-informe.service';
import type { InformeEstadoRow, InformeId } from '../../shared/movimiento-informe.types';

/**
 * Servicio HTTP del informe **Estado de situación financiera**.
 *
 * Toda la mecánica —las tres acciones sobre `/contabilidad/movimiento-informe/`,
 * el body común, la paginación por query params— vive en
 * `MovimientoInformeService`; acá solo se declara el discriminador.
 *
 * Comparte forma exacta con el estado de resultados: mismas columnas, mismo
 * único importe. Lo único que cambia es qué clases del plan cubre — aquel acota
 * a las de resultado y este no acota.
 */
@Injectable({ providedIn: 'root' })
export class EstadoSituacionFinancieraService extends MovimientoInformeService<InformeEstadoRow> {
  protected readonly informe: InformeId = 'estado_situacion_financiera';
}
