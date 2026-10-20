/**
 * Fila del informe **Cuentas por cobrar corte**
 * (`POST /general/documento-informe/lista/`, `informe: 'cobrar_corte'`).
 *
 * Mismos campos de identificación que `cuenta-cobrar`, pero los montos que
 * dependen de los pagos llegan **a la fecha de corte** con sufijo `_corte`:
 * `pendiente_corte` es lo que quedaba por cobrar ese día, no el saldo vivo.
 *
 * Convención del backend: montos como `string` con cola de decimales
 * (`"178500.000000"`); fechas como `yyyy-MM-dd`. Verificado contra la respuesta
 * real el 2026-10-20.
 */
export interface CuentaCobrarCorte {
  readonly id: number;
  readonly numero: number | null;
  readonly fecha: string | null;
  readonly fecha_vence: string | null;
  readonly documento_tipo_id: number | null;
  readonly documento_tipo_nombre: string | null;
  readonly contacto_id: number | null;
  readonly contacto_nombre_corto: string | null;
  readonly contacto_numero_identificacion: string | null;
  readonly sector_id: number | null;
  readonly sector_nombre: string | null;
  readonly sede_id: number | null;
  readonly sede_nombre: string | null;
  readonly subtotal: string | null;
  readonly impuesto: string | null;
  readonly total: string | null;
  /** Monto cruzado del documento hasta el corte. */
  readonly afectado_corte: string | null;
  /** Pagos aplicados al documento hasta el corte. */
  readonly pago_corte: string | null;
  /** Saldo por cobrar al corte. */
  readonly pendiente_corte: string | null;
  /** Vencimiento considerado al corte (`yyyy-MM-dd`). */
  readonly vence_corte: string | null;
  /** Días de vencido al corte; negativo si aún no vence. */
  readonly dias_vencido: number | null;
  /** Rango de edad de la cartera (`vigente`, `1_30`, …). */
  readonly edad: string | null;
}
