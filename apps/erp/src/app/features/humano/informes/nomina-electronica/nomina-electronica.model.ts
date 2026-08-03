/**
 * Fila del informe **Nómina electrónica**
 * (`POST /general/documento/lista/`, `serializador: 'nomina'`).
 *
 * Es una nómina electrónica (documento de clase `702`) con su liquidación
 * resumida y el estado del envío a la DIAN. A diferencia de la nómina detallada
 * —que baja a los conceptos— este informe se queda a nivel documento: una fila
 * por nómina emitida.
 *
 * **Supuestos pendientes de confirmar con backend**: el empleado llega como
 * `tercero_numero_identificacion` / `contacto_nombre`, siguiendo la convención
 * de `DocumentoListRowBase` que ya usan los demás listados de documento del
 * ERP. El legacy los tipaba como `contacto_numero_identificacion` /
 * `contacto_nombre_corto`; si el API nuevo mantiene esos nombres, el fix es
 * local: este archivo y `nomina-electronica.constants.ts`.
 */
export interface NominaElectronicaInforme {
  readonly id: number;
  readonly numero: number | string | null;
  /** Fecha de emisión (`yyyy-MM-dd`). */
  readonly fecha: string | null;
  readonly tercero_numero_identificacion: string | null;
  readonly contacto_nombre: string | null;
  /** Contrato que originó la nómina. */
  readonly contrato_id: number | null;
  /** Salario base del contrato al momento de liquidar. */
  readonly salario: number | string | null;
  /** Ingreso base de cotización (IBC). */
  readonly base_cotizacion: number | string | null;
  /** Ingreso base de prestaciones (IBP). */
  readonly base_prestacion: number | string | null;
  readonly devengado: number | string | null;
  readonly deduccion: number | string | null;
  /** Neto a pagar: devengado − deducción. */
  readonly total: number | string | null;
  readonly estado_aprobado: boolean;
  readonly estado_anulado: boolean;
  /** Si el documento ya fue emitido a la DIAN. */
  readonly estado_electronico: boolean;
}
