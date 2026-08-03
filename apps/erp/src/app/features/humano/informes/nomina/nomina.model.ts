/**
 * Fila del informe **Nómina** (`POST /general/documento/lista/`,
 * `serializador: 'nomina'`).
 *
 * Una fila por nómina liquidada, con el periodo, el empleado y la liquidación
 * resumida. Es el gemelo de `NominaElectronicaInforme` sobre la clase 701: no
 * trae `estado_electronico` ni `contrato_id` porque a este nivel no aplican.
 *
 * Ojo con las fechas: el serializador devuelve `fecha` (el inicio del periodo)
 * y `fecha_hasta`, no el par `fecha_desde`/`fecha_hasta` que usa la ficha del
 * documento. Por eso la columna `fecha` se rotula "Desde".
 *
 * **Supuestos pendientes de confirmar con backend**: el empleado llega como
 * `tercero_numero_identificacion` / `contacto_nombre`, siguiendo la convención
 * de `DocumentoListRowBase` que ya usan los demás listados de documento del
 * ERP. El legacy los tipaba como `contacto__…`; si el API nuevo mantiene esos
 * nombres, el fix es local: este archivo y `nomina.constants.ts`.
 */
export interface NominaInforme {
  readonly id: number;
  readonly numero: number | string | null;
  /** Inicio del periodo liquidado (`yyyy-MM-dd`). */
  readonly fecha: string | null;
  /** Fin del periodo liquidado. */
  readonly fecha_hasta: string | null;
  readonly tercero_numero_identificacion: string | null;
  readonly contacto_nombre: string | null;
  /** Salario base del contrato al momento de liquidar. */
  readonly salario: number | string | null;
  readonly devengado: number | string | null;
  readonly deduccion: number | string | null;
  /** Neto a pagar: devengado − deducción. */
  readonly total: number | string | null;
  readonly estado_aprobado: boolean;
  readonly estado_anulado: boolean;
}
