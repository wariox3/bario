import { partirCelular } from '../celular';

/** Largo de un número telefónico local (Colombia). */
const LARGO_LOCAL = 10;

/** `3105551234` → `310-555-1234`; cualquier otro largo devuelve `null`. */
function agrupar(digitos: string): string | null {
  if (digitos.length !== LARGO_LOCAL) return null;
  return `${digitos.slice(0, 3)}-${digitos.slice(3, 6)}-${digitos.slice(6)}`;
}

/**
 * Agrupa un número telefónico para leerlo: `3105551234` → `310-555-1234`, y
 * `+573105551234` → `+57 310-555-1234`.
 *
 * Los campos de celular conviven en dos formatos: los guardados antes de
 * `lib-phone-input` son dígitos pelados, los nuevos son E.164. Cuando el número
 * trae indicativo se separa con el catálogo de países —no a ojo: `+57` y `+593`
 * no tienen el mismo largo— y se agrupa **solo la parte nacional**, así ambos
 * formatos se leen igual y el indicativo queda a la vista.
 *
 * Solo se agrupa lo que tiene el largo local; cualquier otro número se devuelve
 * tal cual. Un número extranjero partido de a 3-3-4 se leería peor que sin
 * agrupar, y fingir un formato que no le corresponde haría dudar del dato.
 *
 * Es de **presentación**: su salida nunca debe compararse ni enviarse al
 * backend.
 */
export function formatTelefono(valor: string | null | undefined): string {
  if (!valor) return '';

  if (valor.trim().startsWith('+')) {
    const { pais, nacional, enCatalogo } = partirCelular(valor);
    if (!enCatalogo) return valor;
    return `+${pais.indicativo} ${agrupar(nacional) ?? nacional}`;
  }

  return agrupar(valor.replace(/\D/g, '')) ?? valor;
}
