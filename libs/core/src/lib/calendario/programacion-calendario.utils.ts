import { INICIALES_DIA_SEMANA_ES, fromIsoDate } from '../utils/date.utils';
import type { ProgramacionFecha } from './programacion-calendario.types';

/**
 * Convierte un string ISO `YYYY-MM-DD` (como llegan en
 * `ProgramacionDetalleResponse.fechas`) a la columna normalizada del calendario
 * (`ProgramacionFecha`): día visible e inicial del día de semana. La comparten la
 * ficha de programación y la vista previa del prototipo (turnos) y el modal de
 * afectación (erp).
 */
export function toProgramacionFecha(iso: string): ProgramacionFecha {
  const date = fromIsoDate(iso);
  const dow = date ? date.getDay() : 0;
  return {
    clave: iso,
    etiqueta: iso.slice(8, 10).replace(/^0/, ''),
    inicial: INICIALES_DIA_SEMANA_ES[dow],
  };
}

/**
 * Reglas de resaltado de columna de día (dueño único; antes duplicadas en 5
 * templates). `esFestivoDia` lo aporta el caller según su propio set (claves ISO
 * en el grid/editar/prototipo, día-número en agregar-contrato): el domingo cuenta
 * como festivo, y el sábado solo se raya si NO es además festivo.
 */
export function esColumnaFestiva(inicial: string, esFestivoDia: boolean): boolean {
  return inicial === 'D' || esFestivoDia;
}
export function esColumnaSabado(inicial: string, esFestivoDia: boolean): boolean {
  return inicial === 'S' && !esFestivoDia;
}
