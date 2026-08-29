import type { ErpSelectOption } from '@reddoc/core';
import type { ContratoOption } from '@reddoc/ui';

/**
 * Forma cruda del FormGroup de la novedad (lo que devuelve `form.getRawValue()`).
 * `contrato` guarda un `ContratoOption`; `novedad_tipo` y `novedad_referencia` un
 * `ErpSelectOption`; las fechas se manejan como `Date` (p-datepicker) y los días
 * como `number` (p-inputNumber). Los campos de vacaciones y la referencia están
 * siempre presentes en el grupo; el componente activa/limpia sus validadores
 * según el tipo seleccionado.
 */
export interface NovedadFormRawValue {
  contrato: ContratoOption | null;
  novedad_tipo: ErpSelectOption | null;
  fecha_desde: Date | null;
  fecha_hasta: Date | null;
  detalle: string | null;
  // Vacaciones
  fecha_desde_periodo: Date | null;
  fecha_hasta_periodo: Date | null;
  dias_dinero: number | null;
  dias_disfrutados: number | null;
  // Referencia
  novedad_referencia: ErpSelectOption | null;
}
