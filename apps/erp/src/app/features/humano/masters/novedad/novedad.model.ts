/**
 * Novedad de empleado (HumNovedad).
 *
 * Ausencia/vacaciones/licencia atada a un contrato. Shape de lectura del backend:
 * las FK (`contrato`, `novedad_tipo`, `novedad_referencia`) llegan como id pelado
 * (sin sufijo `_id`) + companion `*_nombre`. La mayoría de los campos numéricos
 * (`pago_*`, `total`, `base_cotizacion*`, `hora_*`, `dias_*`) los **calcula el
 * backend** a partir del tipo, las fechas y el contrato; no se editan desde el
 * formulario. Los montos pueden llegar como string Decimal → se normalizan en el
 * mapper donde se usan.
 */
export interface Novedad {
  readonly id: number;
  // Fechas
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly fecha_desde_periodo: string | null;
  readonly fecha_hasta_periodo: string | null;
  readonly fecha_desde_empresa: string | null;
  readonly fecha_hasta_empresa: string | null;
  readonly fecha_desde_entidad: string | null;
  readonly fecha_hasta_entidad: string | null;
  // Días (editables en vacaciones + calculados)
  readonly dias_disfrutados: number | null;
  readonly dias_disfrutados_reales: number | null;
  readonly dias_dinero: number | null;
  readonly dias: number | null;
  readonly dias_empresa: number | null;
  readonly dias_entidad: number | null;
  readonly dias_acumulados: number | null;
  // Montos calculados por el backend
  readonly pago_disfrute: string | number | null;
  readonly pago_dinero: string | number | null;
  readonly pago_dia_disfrute: string | number | null;
  readonly pago_dia_dinero: string | number | null;
  readonly base_cotizacion_propuesto: string | number | null;
  readonly base_cotizacion: string | number | null;
  readonly hora_empresa: string | number | null;
  readonly hora_entidad: string | number | null;
  readonly pago_empresa: string | number | null;
  readonly pago_entidad: string | number | null;
  readonly total: string | number | null;
  readonly prorroga: boolean;
  readonly detalle: string | null;
  // Foreign keys (id pelado) + companion `*_nombre`
  readonly contrato: number | null;
  readonly contrato_nombre: string | null;
  /**
   * Cédula del empleado del contrato, para el addon del autocomplete en edición.
   *
   * TODO(backend): nombre **asumido**. El companion del nombre es
   * `contrato_nombre` (que ya es el nombre del empleado, no el del contrato), así
   * que se sigue el mismo patrón `<fk>_<campo>`. Opcional: hasta que el backend lo
   * exponga llega `undefined` y el addon degrada a vacío, como hoy.
   */
  readonly contrato_numero_identificacion?: string | null;
  readonly novedad_tipo: number | null;
  readonly novedad_tipo_nombre: string | null;
  readonly novedad_referencia: number | null;
  readonly novedad_referencia_nombre: string | null;
}

/**
 * Payload para crear o actualizar una novedad. Solo los campos editables; las FK
 * van como id pelado. Los campos de vacaciones se envían siempre con defaults
 * seguros (0 / null) cuando el tipo no es vacaciones — el backend recalcula el
 * resto (pagos, totales, días empresa/entidad, base de cotización).
 */
export interface NovedadPayload {
  fecha_desde: string | null;
  fecha_hasta: string | null;
  contrato: number | null;
  novedad_tipo: number | null;
  detalle: string | null;
  // Vacaciones
  fecha_desde_periodo: string | null;
  fecha_hasta_periodo: string | null;
  dias_dinero: number;
  dias_disfrutados: number;
  dias_disfrutados_reales: number;
  // Referencia
  novedad_referencia: number | null;
}
