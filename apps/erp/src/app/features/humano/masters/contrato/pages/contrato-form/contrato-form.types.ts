import type { ErpSelectOption } from '@reddoc/core';
import type { EmpleadoOption } from '@erp/core/components/empleado-autocomplete/empleado-autocomplete.component';

/**
 * Forma cruda del FormGroup del contrato (lo que devuelve `form.getRawValue()`).
 * Las FK guardan el `ErpSelectOption` seleccionado (hoy deshabilitadas → null);
 * `contacto` guarda un `EmpleadoOption` (lleva la identificación para el addon);
 * las fechas se manejan como `Date` (p-datepicker); los montos como `number`.
 */
export interface ContratoFormRawValue {
  // Datos del contrato
  readonly contacto: EmpleadoOption | null;
  readonly contrato_tipo: ErpSelectOption | null;
  readonly cargo: ErpSelectOption | null;
  readonly grupo: ErpSelectOption | null;
  readonly sucursal: ErpSelectOption | null;
  readonly tiempo: ErpSelectOption | null;
  readonly fecha_desde: Date | null;
  readonly fecha_hasta: Date | null;
  /** Habilita la programación de turnos para este contrato. */
  readonly habilitado_turno: boolean | null;
  // Remuneración
  readonly salario: number | null;
  readonly auxilio_transporte: boolean | null;
  readonly salario_integral: boolean | null;
  readonly tipo_costo: ErpSelectOption | null;
  readonly centro_costo: ErpSelectOption | null;
  // Seguridad social
  readonly salud: ErpSelectOption | null;
  readonly entidad_salud: ErpSelectOption | null;
  readonly pension: ErpSelectOption | null;
  readonly entidad_pension: ErpSelectOption | null;
  readonly entidad_cesantias: ErpSelectOption | null;
  readonly entidad_caja: ErpSelectOption | null;
  readonly riesgo: ErpSelectOption | null;
  readonly tipo_cotizante: ErpSelectOption | null;
  readonly subtipo_cotizante: ErpSelectOption | null;
  readonly ciudad_contrato: ErpSelectOption | null;
  readonly ciudad_labora: ErpSelectOption | null;
  // Terminación y pagos
  readonly motivo_terminacion: ErpSelectOption | null;
  readonly fecha_ultimo_pago: Date | null;
  readonly fecha_ultimo_pago_prima: Date | null;
  readonly fecha_ultimo_pago_cesantia: Date | null;
  readonly fecha_ultimo_pago_vacacion: Date | null;
  readonly comentario: string | null;
}
