/**
 * Columna de día del calendario de programación, normalizada a partir del string
 * ISO que devuelve el backend (`ProgramacionDetalleResponse.fechas`).
 *  - `clave`: la fecha ISO original (`'2026-06-01'`) — índice para `fila.dias`.
 *  - `etiqueta`: número de día visible en el header (`1`..`31`).
 *  - `inicial`: inicial del día de la semana en español (L M X J V S D).
 *
 * Vive en `libs/core` porque la comparten la ficha de programación (`apps/turnos`)
 * y el modal de afectación (`apps/erp`).
 */
export interface ProgramacionFecha {
  readonly clave: string;
  readonly etiqueta: string;
  readonly inicial: string;
}
