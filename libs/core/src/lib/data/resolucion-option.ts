import type { ErpSelectOption } from './erp-select-data.service';

/**
 * Etiqueta de una resolución de facturación: `prefijo número`, que es como se la
 * nombra en la DIAN. El endpoint `resolucion/seleccionar/` **no devuelve `nombre`**
 * —solo `id`, `prefijo` y `numero`—, así que sin esto el desplegable pintaría
 * opciones en blanco. Cae al `nombre` de una opción sembrada y, en última
 * instancia, al id. Va con `filterBy="prefijo,numero"`.
 */
export function resolucionLabel(option: ErpSelectOption): string {
  const prefijo = typeof option['prefijo'] === 'string' ? option['prefijo'] : '';
  const numero = typeof option['numero'] === 'string' ? option['numero'] : '';
  const compuesto = [prefijo, numero].filter(Boolean).join(' ');
  return compuesto || option.nombre || `#${option.id}`;
}

/**
 * Filtro del `resolucion/seleccionar/` que deja fuera las resoluciones
 * inactivas: sin él, el desplegable ofrece también las vencidas o dadas de
 * baja. Va en todo selector de resolución, junto al de módulo
 * (`{ ...RESOLUCION_ACTIVA_PARAMS, venta: 'True' }`).
 */
export const RESOLUCION_ACTIVA_PARAMS = { estado_inactivo: 'False' } as const;
