import type { InformeCuentasRangoParams } from '../../shared/informe-cuentas.types';

/**
 * Modelo del informe **Base**.
 *
 * Rompe con la forma de sus hermanos: no lista saldos por cuenta sino los
 * **movimientos** que aportan base gravable, uno por línea contable, con el
 * documento que los originó, su tercero y el detalle escrito al contabilizar.
 * Por eso no reusa `<app-saldos-cuenta-table>` ni `SaldoCuentaRow`.
 *
 * También declara **menos parámetros**: solo periodo, rango de cuentas y
 * contacto. Sin las banderas de cierre y de cuentas con movimiento, que a nivel
 * de línea no aplican.
 *
 * **Supuestos pendientes de confirmar con backend**: el endpoint, los nombres de
 * los campos y el del parámetro `contacto_id` — el resto de informes lo llama
 * `contacto` a secas, este es el único que usa el sufijo.
 */

/** Fila del informe: una línea contable con su base gravable. */
export interface BaseMovimientoRow {
  readonly id: number;
  readonly comprobante_nombre: string | null;
  readonly numero: number | string | null;
  /** Fecha del movimiento (`yyyy-MM-dd`). */
  readonly fecha: string | null;
  readonly cuenta_codigo: string | null;
  readonly cuenta_nombre: string | null;
  readonly contacto_id: number | null;
  readonly contacto_numero_identificacion: string | null;
  readonly contacto_nombre_corto: string | null;
  readonly debito: number | null;
  readonly credito: number | null;
  /** Base gravable de la línea — la razón de ser del informe. */
  readonly base: number | null;
  /** Texto escrito al contabilizar. */
  readonly detalle: string | null;
}

/** Parámetros del informe: los del rango más el tercero. Sin las dos banderas. */
export interface InformeBaseParams extends InformeCuentasRangoParams {
  readonly contacto_id: number | null;
}
