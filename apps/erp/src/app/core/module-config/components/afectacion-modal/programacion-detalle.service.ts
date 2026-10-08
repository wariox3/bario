import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseHttpService } from '@reddoc/core';

/**
 * Celda de un día del calendario, recortada: el modal solo pinta el código del
 * turno. (El resaltado de festivos NO sale de acá: las celdas solo existen si ese
 * día tiene programación, así que un festivo sin turno no tendría celda. Los
 * festivos se piden aparte con `FestivoService`, igual que en la ficha de turnos.)
 */
export interface ProgramacionDiaCeldaRead {
  readonly turno_codigo: string | null;
  readonly festivo?: boolean | null;
}

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
  /** Contacto del contrato asignado (el empleado que cubre el puesto). */
  readonly contrato_contacto_nombre_corto: string | null;
  /**
   * Horas ya programadas (con turno asignado). Se tipan `string | number` y se
   * normalizan con `toFiniteNumber`: turnos las declara `number`, pero el resto de
   * la API manda los decimales como string.
   */
  readonly horas_programadas?: string | number | null;
  readonly horas_diurnas_programadas?: string | number | null;
  readonly horas_nocturnas_programadas?: string | number | null;
  /** Mapa fecha ISO → celda del día. La clave es la misma que trae `fechas`. */
  readonly dias?: Record<string, ProgramacionDiaCeldaRead | null>;
}

/**
 * Calendario de una línea: las columnas (`fechas`, ISO `YYYY-MM-DD`) y una fila
 * por contrato asignado. Recorte de la respuesta de `detalle/` (su cabecera
 * `documento` no se usa acá).
 */
export interface ProgramacionCalendarioRead {
  readonly fechas: readonly string[];
  readonly filas: readonly ProgramacionFilaRead[];
}

/** Respuesta cruda de `detalle/` (los campos llegan opcionales). */
interface ProgramacionDetalleResponse {
  readonly fechas?: readonly string[];
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
   * Calendario de una línea del documento
   * (`GET /turno/programacion/detalle/?documento=<id>&documento_detalle=<id>`).
   *
   * El backend filtra las filas por `documento_detalle`; `documento` sigue siendo
   * obligatorio. De la respuesta se usan las columnas (`fechas`) y las filas; la
   * cabecera `documento` no.
   */
  obtenerCalendarioDelDetalle(
    documentoId: number,
    detalleId: number,
  ): Observable<ProgramacionCalendarioRead> {
    return this.get<ProgramacionDetalleResponse>('/turno/programacion/detalle/', {
      documento: documentoId,
      documento_detalle: detalleId,
    }).pipe(map((res) => ({ fechas: res.fechas ?? [], filas: res.filas ?? [] })));
  }
}
