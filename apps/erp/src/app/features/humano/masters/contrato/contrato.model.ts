/**
 * Read-model del contrato tal como lo devuelve el backend.
 *
 * Las FK llegan como id pelado (sin sufijo `_id`) y cada una trae su companion
 * `*_nombre` para pintar la etiqueta en la lista y precargar selects/autocompletes
 * en edición. `salario` llega como string Decimal (`"1723500.000000"`).
 */
export interface Contrato {
  readonly id: number;
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly salario: string | number | null;
  readonly auxilio_transporte: boolean;
  readonly salario_integral: boolean;
  /** Habilita la programación de turnos para este contrato. */
  readonly habilitado_turno: boolean;
  readonly estado_terminado: boolean;
  readonly comentario: string | null;
  readonly fecha_ultimo_pago: string | null;
  readonly fecha_ultimo_pago_prima: string | null;
  readonly fecha_ultimo_pago_cesantia: string | null;
  readonly fecha_ultimo_pago_vacacion: string | null;
  // Foreign keys (id pelado) + companion `*_nombre`
  readonly contrato_tipo: number | null;
  readonly contrato_tipo_nombre: string | null;
  readonly contacto: number | null;
  readonly contacto_nombre: string | null;
  readonly ciudad_contrato: number | null;
  readonly ciudad_contrato_nombre: string | null;
  readonly ciudad_labora: number | null;
  readonly ciudad_labora_nombre: string | null;
  readonly grupo: number | null;
  readonly grupo_nombre: string | null;
  readonly sucursal: number | null;
  readonly sucursal_nombre: string | null;
  readonly riesgo: number | null;
  readonly riesgo_nombre: string | null;
  readonly tipo_cotizante: number | null;
  readonly tipo_cotizante_nombre: string | null;
  readonly subtipo_cotizante: number | null;
  readonly subtipo_cotizante_nombre: string | null;
  readonly cargo: number | null;
  readonly cargo_nombre: string | null;
  readonly salud: number | null;
  readonly salud_nombre: string | null;
  readonly pension: number | null;
  readonly pension_nombre: string | null;
  readonly entidad_salud: number | null;
  readonly entidad_salud_nombre: string | null;
  readonly entidad_pension: number | null;
  readonly entidad_pension_nombre: string | null;
  readonly entidad_cesantias: number | null;
  readonly entidad_cesantias_nombre: string | null;
  readonly entidad_caja: number | null;
  readonly entidad_caja_nombre: string | null;
  readonly tiempo: number | null;
  readonly tiempo_nombre: string | null;
  readonly tipo_costo: number | null;
  readonly tipo_costo_nombre: string | null;
  readonly centro_costo: number | null;
  readonly centro_costo_nombre: string | null;
  readonly motivo_terminacion: number | null;
  readonly motivo_terminacion_nombre: string | null;
}

/**
 * Write-model para crear/editar contrato. Shape provisional — reconciliar con
 * el backend cuando llegue. Las FK van como id pelado (`number | null`).
 */
export interface ContratoPayload {
  readonly fecha_desde: string | null;
  readonly fecha_hasta: string | null;
  readonly salario: number | null;
  readonly auxilio_transporte: boolean;
  readonly salario_integral: boolean;
  readonly habilitado_turno: boolean;
  readonly comentario: string | null;
  readonly fecha_ultimo_pago: string | null;
  readonly fecha_ultimo_pago_prima: string | null;
  readonly fecha_ultimo_pago_cesantia: string | null;
  readonly fecha_ultimo_pago_vacacion: string | null;
  // FK: el backend las espera (y devuelve) sin sufijo `_id`.
  readonly cargo: number | null;
  readonly ciudad_contrato: number | null;
  readonly ciudad_labora: number | null;
  readonly contacto: number | null;
  readonly contrato_tipo: number | null;
  readonly entidad_caja: number | null;
  readonly entidad_cesantias: number | null;
  readonly entidad_pension: number | null;
  readonly entidad_salud: number | null;
  readonly grupo: number | null;
  readonly centro_costo: number | null;
  readonly motivo_terminacion: number | null;
  readonly pension: number | null;
  readonly riesgo: number | null;
  readonly salud: number | null;
  readonly subtipo_cotizante: number | null;
  readonly sucursal: number | null;
  readonly tiempo: number | null;
  readonly tipo_costo: number | null;
  readonly tipo_cotizante: number | null;
}
