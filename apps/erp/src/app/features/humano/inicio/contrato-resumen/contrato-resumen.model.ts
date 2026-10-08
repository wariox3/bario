/**
 * Respuesta de `GET humano/contrato/resumen/`. Cifras de los contratos **a una
 * fecha de corte** (hoy): cuántos hay, cuántos siguen activos y cuántos se
 * terminaron, más los ingresos y retiros del mes de esa fecha.
 *
 * Ej.: `{"fecha":"2026-10-08","contratos":42,"contratos_activos":38,"contratos_terminados":4,"ingresos_mes":5,"retiros_mes":2}`
 */
export interface ContratoResumen {
  /** Fecha de corte de las cifras (ISO). */
  readonly fecha: string;
  /** Todos los contratos: activos + terminados. */
  readonly contratos: number;
  readonly contratos_activos: number;
  readonly contratos_terminados: number;
  /** Contratos que empezaron en el mes de la fecha de corte. */
  readonly ingresos_mes: number;
  /** Contratos que terminaron en el mes de la fecha de corte. */
  readonly retiros_mes: number;
}
