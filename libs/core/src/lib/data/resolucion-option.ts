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

/** Lo que el read de un documento (`GenDocumento`) trae de su resolución. */
export interface ResolucionRead {
  readonly resolucion?: number | null;
  readonly resolucion_prefijo?: string | null;
  readonly resolucion_numero?: string | null;
}

/**
 * La resolución de un documento leído como opción de selector: el read no trae
 * `nombre`, sino prefijo y número sueltos, que es de donde `resolucionLabel`
 * arma la etiqueta. `null` si el documento no tiene resolución.
 */
export function resolucionDesdeRead(read: ResolucionRead): ErpSelectOption | null {
  if (read.resolucion == null) return null;
  return {
    id: read.resolucion,
    nombre: '',
    prefijo: read.resolucion_prefijo ?? '',
    numero: read.resolucion_numero ?? '',
  };
}

/**
 * La resolución de un documento leído como texto de ficha (`SETP 18760000001`).
 * Vacío si no tiene: la ficha no inventa un `#id` como hace el selector.
 */
export function resolucionTexto(read: ResolucionRead): string {
  return [read.resolucion_prefijo, read.resolucion_numero].filter(Boolean).join(' ');
}
