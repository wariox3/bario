/**
 * Lo que se muestra al cruzar un contrato del aporte contra las **nóminas ya
 * liquidadas** del periodo.
 *
 * Es solo lectura y solo para explicar: de dónde salió el IBC que el aporte le
 * está cotizando a ese empleado.
 *
 * Nombres verificados contra el schema del backend (`GenDocumento` y
 * `GenDocumentoDetalle`); los importes llegan como decimal en string.
 */

/** Una nómina (documento) del contrato dentro del periodo del aporte. */
export interface NominaDelContrato {
  readonly id: number;
  readonly documento_tipo_nombre: string | null;
  readonly numero: number | string | null;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly salario: number | string | null;
  /** IBC: lo que el aporte usa para cotizar. */
  readonly base_cotizacion: number | string | null;
  /** IBP: la base de prestaciones sociales. */
  readonly base_prestacion: number | string | null;
  readonly devengado: number | string | null;
  readonly deduccion: number | string | null;
  /** Neto de la nómina. */
  readonly total: number | string | null;
}

/** Un concepto liquidado dentro de una de esas nóminas. */
export interface LineaNominaDelContrato {
  readonly id: number;
  /** Id de la nómina a la que pertenece: con él se cruza su tipo y número. */
  readonly documento: number | null;
  readonly concepto_id: number | null;
  readonly concepto_nombre: string | null;
  readonly detalle: string | null;
  readonly porcentaje: number | string | null;
  /** Horas liquidadas (la `H` del ERP anterior). */
  readonly cantidad: number | string | null;
  readonly dias: number | string | null;
  /** Valor de la hora. */
  readonly hora: number | string | null;
  readonly devengado: number | string | null;
  readonly deduccion: number | string | null;
  readonly base_cotizacion: number | string | null;
  readonly base_prestacion: number | string | null;
}

/**
 * Línea con el tipo y el número de su nómina ya resueltos. El detalle no los
 * trae: se cruzan con las nóminas ya cargadas, sin otra petición.
 */
export interface LineaConDocumento extends LineaNominaDelContrato {
  readonly documento_tipo_nombre: string | null;
  readonly documento_numero: number | string | null;
}
