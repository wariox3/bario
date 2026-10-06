/**
 * Respuesta de `GET general/documento/cartera-resumen/?tipo=`. Cifras de las
 * cuentas por cobrar o por pagar **a una fecha de corte** (hoy). Vencido +
 * vigente = pendiente; un documento sin `fecha_vence` vence en su `fecha`.
 *
 * Ej.: `{"fecha":"2026-10-06","total_pendiente":3090.21,"total_pendiente_vencido":0.0,"total_pendiente_vigente":3090.21}`
 */
export interface CarteraResumen {
  /** Fecha de corte de las cifras (ISO). */
  readonly fecha: string;
  readonly total_pendiente: number;
  /** Lo que venció antes de la fecha de corte. */
  readonly total_pendiente_vencido: number;
  /** Lo que vence en la fecha de corte o después. */
  readonly total_pendiente_vigente: number;
}
