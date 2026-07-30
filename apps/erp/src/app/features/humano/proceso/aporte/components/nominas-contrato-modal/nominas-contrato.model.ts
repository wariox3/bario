/**
 * Lo que se muestra al cruzar un contrato del aporte contra las **nóminas ya
 * liquidadas** del periodo.
 *
 * Es solo lectura y solo para explicar: de dónde salió el IBC que el aporte le
 * está cotizando a ese empleado.
 *
 * ⚠️ Los nombres de campo salen del ERP anterior y del resto de listados de
 * documento de este ERP; no están verificados contra el backend.
 */

/** Una nómina del contrato dentro del periodo del aporte. */
export interface NominaDelContrato {
  readonly id: number;
  readonly numero: number | string | null;
  readonly fecha: string | null;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly salario: number | string | null;
  /** IBC: lo que el aporte usa para cotizar. */
  readonly base_cotizacion: number | string | null;
  /** IBP: la base de prestaciones sociales. */
  readonly base_prestacion: number | string | null;
  readonly devengado: number | string | null;
  readonly deduccion: number | string | null;
  readonly total: number | string | null;
}

/** Un concepto liquidado dentro de una de esas nóminas. */
export interface LineaNominaDelContrato {
  readonly id: number;
  readonly documento: number | null;
  readonly documento__numero: number | string | null;
  readonly concepto__nombre: string | null;
  readonly dias: number | null;
  readonly hora: number | null;
  readonly devengado: number | string | null;
  readonly deduccion: number | string | null;
  readonly base_cotizacion: number | string | null;
  readonly base_prestacion: number | string | null;
  readonly total: number | string | null;
}
