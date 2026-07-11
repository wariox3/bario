import { INICIALES_DIA_SEMANA_ES, fromIsoDate } from '@reddoc/core';
import type { ProgramacionFecha } from './programacion.model';

/**
 * Convierte un string ISO `YYYY-MM-DD` (como llegan en
 * `ProgramacionDetalleResponse.fechas`) a la columna normalizada del calendario
 * (`ProgramacionFecha`): día visible, inicial del día de semana y si es fin de
 * semana. Lo comparten la ficha de programación y la vista previa del prototipo.
 */
export function toProgramacionFecha(iso: string): ProgramacionFecha {
  const date = fromIsoDate(iso);
  const dow = date ? date.getDay() : 0;
  return {
    clave: iso,
    etiqueta: iso.slice(8, 10).replace(/^0/, ''),
    inicial: INICIALES_DIA_SEMANA_ES[dow],
    finDeSemana: dow === 0 || dow === 6,
  };
}
