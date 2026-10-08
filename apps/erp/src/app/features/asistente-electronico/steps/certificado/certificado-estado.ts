/** Estado del certificado del contenedor, del más urgente al más tranquilo. */
export type CertificadoEstado = 'sin-certificado' | 'vencido' | 'por-vencer' | 'vigente';

/** Días antes del vencimiento en los que ya se avisa. */
export const DIAS_AVISO = 30;

/**
 * Días completos entre `hoy` y la fecha, negativo si ya pasó. Compara días de
 * calendario, no horas: a las 23:59 de la víspera todavía falta 1 día.
 */
export function diasHasta(fecha: Date, hoy: Date = new Date()): number {
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const hasta = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  return Math.round((hasta.getTime() - desde.getTime()) / 86_400_000);
}

/** Estado según los días que faltan; `null` = no hay certificado. */
export function estadoCertificado(dias: number | null): CertificadoEstado {
  if (dias === null) return 'sin-certificado';
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_AVISO) return 'por-vencer';
  return 'vigente';
}
