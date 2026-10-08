import type { ErpSelectOption } from '@reddoc/core';

/**
 * Forma cruda del FormGroup del activo (lo que devuelve `form.getRawValue()`).
 * Las FK guardan el `ErpSelectOption` seleccionado; las fechas se manejan como
 * `Date` (p-datepicker) y los montos/contadores como `number` (p-inputNumber).
 */
export interface ActivoFormRawValue {
  nombre: string | null;
  codigo: string | null;
  marca: string | null;
  serie: string | null;
  modelo: number | null;
  fecha_compra: Date | null;
  fecha_activacion: Date | null;
  fecha_baja: Date | null;
  duracion: number | null;
  valor_compra: number | null;
  depreciacion_inicial: number | null;
  activo_grupo: ErpSelectOption | null;
  metodo_depreciacion: ErpSelectOption | null;
  cuenta_gasto: ErpSelectOption | null;
  cuenta_depreciacion: ErpSelectOption | null;
  centro_costo: ErpSelectOption | null;
}
