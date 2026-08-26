/** Largo de un número telefónico local (Colombia). */
const LARGO_LOCAL = 10;

/**
 * Agrupa un número telefónico para leerlo: `3105551234` → `310-555-1234`.
 *
 * Solo actúa sobre los números del largo local; cualquier otro se devuelve tal
 * cual. Un número extranjero agrupado de a 3-3-4 se leería peor que sin agrupar,
 * y fingir un formato que no le corresponde haría dudar del dato.
 *
 * Es de **presentación**: lo que se guarda son los dígitos pelados. Su salida
 * nunca debe compararse ni enviarse al backend.
 */
export function formatTelefono(valor: string | null | undefined): string {
  if (!valor) return '';
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length !== LARGO_LOCAL) return valor;
  return `${digitos.slice(0, 3)}-${digitos.slice(3, 6)}-${digitos.slice(6)}`;
}
