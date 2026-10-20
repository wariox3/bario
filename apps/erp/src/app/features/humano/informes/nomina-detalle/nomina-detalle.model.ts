/**
 * Fila del informe **Nómina detallada**
 * (`POST /general/documento-detalle/lista/`; el Excel sale de
 * `documento-detalle-informe/excel/` con `informe: 'nomina_detalle'`).
 *
 * Es un **concepto liquidado** —una línea de nómina— con los datos de su
 * documento padre aplanados (`documento_fecha`, `documento_documento_tipo_nombre`).
 * Mientras la ficha de nómina muestra los conceptos de *un* documento, este
 * informe los recorre todos, así que sirve para cruzar un concepto a través de
 * varias nóminas.
 *
 * El empleado viaja en la propia línea (`contacto_*`). El valor del concepto
 * llega partido en `devengado` y `deduccion`, no con signo.
 *
 * Convención del backend: montos como `string` con cola de decimales
 * (`"250000.000000"`); fechas como `yyyy-MM-dd`. Verificado contra la respuesta
 * real el 2026-10-20. La respuesta trae además los campos comerciales y de
 * programación de la línea, que no se modelan porque el informe no los usa.
 */
export interface NominaDetalleInforme {
  readonly id: number;
  /** Documento (nómina) al que pertenece la línea. */
  readonly documento: number | null;
  readonly documento_documento_tipo_nombre: string | null;
  /** Fecha de la nómina (`yyyy-MM-dd`). */
  readonly documento_fecha: string | null;
  readonly contacto: number | null;
  readonly contacto_numero_identificacion: string | null;
  readonly contacto_nombre_corto: string | null;
  readonly concepto_id: number | null;
  readonly concepto_nombre: string | null;
  /** Texto que el proceso de liquidación escribe en la línea. */
  readonly detalle: string | null;
  readonly porcentaje: string | null;
  readonly dias: number | null;
  /** Valor de la hora aplicado. */
  readonly hora: string | null;
  readonly devengado: string | null;
  readonly deduccion: string | null;
  /** Ingreso base de prestaciones (IBP). */
  readonly base_prestacion: string | null;
  /** Ingreso base de cotización (IBC). */
  readonly base_cotizacion: string | null;
}
