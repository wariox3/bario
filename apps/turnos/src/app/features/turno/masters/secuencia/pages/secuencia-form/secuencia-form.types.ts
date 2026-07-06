/**
 * Valor crudo del formulario de secuencia.
 *
 * Los campos por día (`dia_1..dia_31`, días de semana, festivos) son strings de
 * texto libre (código del turno). `dias` es numérico y requerido (el input
 * `type="number"` lo entrega como `number | null` vía `NumberValueAccessor`).
 * `codigo`/`horas` ya no se capturan: no se envían al backend desde el form.
 */
export interface SecuenciaFormRawValue {
  nombre: string | null;
  dias: number | null;
  homologar: boolean;
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
}
