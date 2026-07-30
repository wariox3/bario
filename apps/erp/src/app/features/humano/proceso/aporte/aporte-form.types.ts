import type { ErpSelectOption } from '@reddoc/core';
import type { Presentacion } from './aporte.model';

/**
 * Valores crudos del formulario de cabecera (`form.getRawValue()`).
 *
 * El periodo se declara como año + mes, no como rango de fechas: el backend
 * calcula `fecha_desde` / `fecha_hasta` a partir de ellos.
 */
export interface AporteFormRawValue {
  readonly sucursal: ErpSelectOption | null;
  readonly anio: number | null;
  readonly mes: number | null;
  readonly presentacion: Presentacion;
  readonly entidad_riesgo: ErpSelectOption | null;
  readonly entidad_sena: ErpSelectOption | null;
  readonly entidad_icbf: ErpSelectOption | null;
}
