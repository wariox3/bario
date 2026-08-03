/**
 * Modelo del informe **Certificado de retención**.
 *
 * Lo que se le certifica a cada tercero: cuánto se le retuvo en el periodo y
 * sobre qué base, agrupado por cuenta de retención. No tiene columnas de saldo
 * —no es un corte contable sino un resumen fiscal por tercero—, por eso no
 * reusa `<app-saldos-cuenta-table>`.
 *
 * **Supuestos pendientes de confirmar con backend**: el endpoint, los nombres de
 * los campos y que el tercero viaje como `contacto_id` (mismo caso que el
 * informe *base*; el resto de informes lo llama `contacto`).
 */
export interface CertificadoRetencionRow {
  readonly contacto_numero_identificacion: string | null;
  readonly contacto_nombre_corto: string | null;
  readonly cuenta_codigo: string | null;
  readonly cuenta_nombre: string | null;
  /** Base sobre la que se calculó la retención. */
  readonly base_retenido: number | string | null;
  /** Valor retenido. */
  readonly retenido: number | string | null;
}
