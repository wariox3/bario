/**
 * Secuencia: patrón mensual de turnos del módulo Turno. Define, para cada uno de
 * los 31 días del mes (`dia_1..dia_31`) y por día de semana
 * (`lunes..domingo`, `festivo`, `domingo_festivo`), el turno/código asignado, más
 * los totales calculados (`horas`, `dias`) y los flags `homologar` /
 * `estado_inactivo`.
 *
 * Shape de lectura de `POST /turno/secuencia/lista/` y `GET /turno/secuencia/:id/`.
 * Los campos por día llegan como string (código del turno) o `null` cuando el día
 * no tiene asignación.
 */
export interface Secuencia {
  readonly id: number;
  readonly nombre: string;
  readonly codigo: string;
  readonly dia_1: string | null;
  readonly dia_2: string | null;
  readonly dia_3: string | null;
  readonly dia_4: string | null;
  readonly dia_5: string | null;
  readonly dia_6: string | null;
  readonly dia_7: string | null;
  readonly dia_8: string | null;
  readonly dia_9: string | null;
  readonly dia_10: string | null;
  readonly dia_11: string | null;
  readonly dia_12: string | null;
  readonly dia_13: string | null;
  readonly dia_14: string | null;
  readonly dia_15: string | null;
  readonly dia_16: string | null;
  readonly dia_17: string | null;
  readonly dia_18: string | null;
  readonly dia_19: string | null;
  readonly dia_20: string | null;
  readonly dia_21: string | null;
  readonly dia_22: string | null;
  readonly dia_23: string | null;
  readonly dia_24: string | null;
  readonly dia_25: string | null;
  readonly dia_26: string | null;
  readonly dia_27: string | null;
  readonly dia_28: string | null;
  readonly dia_29: string | null;
  readonly dia_30: string | null;
  readonly dia_31: string | null;
  readonly lunes: string | null;
  readonly martes: string | null;
  readonly miercoles: string | null;
  readonly jueves: string | null;
  readonly viernes: string | null;
  readonly sabado: string | null;
  readonly domingo: string | null;
  readonly festivo: string | null;
  readonly domingo_festivo: string | null;
  readonly horas: number | null;
  readonly dias: number | null;
  readonly homologar: boolean;
  readonly estado_inactivo: boolean;
}

/**
 * Write-model para create/update de secuencia.
 *
 * Incluye los códigos de turno por día del mes (`dia_1..dia_31`) y por día de
 * semana (`lunes..domingo`, `festivo`, `domingo_festivo`), el total editable
 * (`dias`) y el flag `homologar`. `codigo`/`horas` ya no se envían desde el
 * formulario; `estado_inactivo` no se captura: lo gestiona el backend (alta → activo).
 */
export interface SecuenciaPayload {
  nombre: string;
  dia_1: string | null;
  dia_2: string | null;
  dia_3: string | null;
  dia_4: string | null;
  dia_5: string | null;
  dia_6: string | null;
  dia_7: string | null;
  dia_8: string | null;
  dia_9: string | null;
  dia_10: string | null;
  dia_11: string | null;
  dia_12: string | null;
  dia_13: string | null;
  dia_14: string | null;
  dia_15: string | null;
  dia_16: string | null;
  dia_17: string | null;
  dia_18: string | null;
  dia_19: string | null;
  dia_20: string | null;
  dia_21: string | null;
  dia_22: string | null;
  dia_23: string | null;
  dia_24: string | null;
  dia_25: string | null;
  dia_26: string | null;
  dia_27: string | null;
  dia_28: string | null;
  dia_29: string | null;
  dia_30: string | null;
  dia_31: string | null;
  lunes: string | null;
  martes: string | null;
  miercoles: string | null;
  jueves: string | null;
  viernes: string | null;
  sabado: string | null;
  domingo: string | null;
  festivo: string | null;
  domingo_festivo: string | null;
  dias: number | null;
  homologar: boolean;
}
