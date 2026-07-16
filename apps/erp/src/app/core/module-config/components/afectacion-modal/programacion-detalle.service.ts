import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '@reddoc/core';

/**
 * Fila del calendario de turno, **recortada** a lo que el modal de afectación pinta.
 *
 * El modelo completo (`ProgramacionFila`) vive en `apps/turnos`, que el ERP no puede
 * importar (module boundaries). Como acá solo se lee —una tabla, sin mutaciones—
 * basta con este recorte, igual que `AfectacionDetalleRead`/`AfectacionDocumentoRead`
 * en el propio modal.
 *
 * Cada fila es **un contrato asignado a un puesto**; varias filas pueden compartir
 * `documento_detalle_id` (el mismo puesto con distintos contratos).
 */
export interface ProgramacionFilaRead {
  /** Línea del documento (puesto) a la que pertenece la programación. */
  readonly documento_detalle_id: number;
  readonly puesto_nombre: string | null;
  readonly modalidad_nombre: string | null;
  /** Franja horaria del puesto en formato `HH:mm:ss`. */
  readonly hora_desde: string | null;
  readonly hora_hasta: string | null;
  /** Vigencia de la línea (ISO `YYYY-MM-DD`). Opcionales: el backend puede omitirlas. */
  readonly fecha_desde?: string | null;
  readonly fecha_hasta?: string | null;
  /** Contacto del contrato asignado (el empleado que cubre el puesto). */
  readonly contrato_contacto_nombre_corto: string | null;
  readonly contrato_contacto_numero_identificacion: string | null;
  /**
   * Horas ya programadas (con turno asignado). Se tipan `string | number` y se
   * normalizan con `toFiniteNumber`: turnos las declara `number`, pero el resto de
   * la API manda los decimales como string.
   */
  readonly horas_programadas?: string | number | null;
  readonly horas_diurnas_programadas?: string | number | null;
  readonly horas_nocturnas_programadas?: string | number | null;
}

/** Respuesta de `detalle/`, recortada: solo se leen las filas del calendario. */
interface ProgramacionDetalleResponse {
  readonly filas?: readonly ProgramacionFilaRead[];
}

/**
 * Lectura de las programaciones de una línea (`/api/turno/programacion/`).
 *
 * Existe porque el modal de afectación muestra las programaciones del detalle y el
 * ERP no puede importar el `ProgramacionService` de `apps/turnos` (module
 * boundaries). Endpoint tenant-scoped (default de `BaseHttpService`), como todo
 * `/turno/*`.
 */
@Injectable({ providedIn: 'root' })
export class ProgramacionDetalleService extends BaseHttpService {
  /**
   * Filas del calendario de una línea del documento
   * (`GET /turno/programacion/detalle/?documento=<id>&documento_detalle=<id>`).
   *
   * El backend filtra las filas por `documento_detalle`; `documento` sigue siendo
   * obligatorio. Del resto de la respuesta (cabecera y fechas) no se usa nada.
   */
  listarFilasPorDetalle(
    documentoId: number,
    detalleId: number,
  ): Observable<readonly ProgramacionFilaRead[]> {
    return this.get<ProgramacionDetalleResponse>('/turno/programacion/detalle/', {
      documento: documentoId,
      documento_detalle: detalleId,
    }).pipe(map((res) => res.filas ?? []));
  }
}
