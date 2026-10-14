/**
 * Pesos del algoritmo del dígito de verificación (DV) del NIT colombiano.
 * El peso del dígito en el índice `i` (izquierda→derecha) de un número de
 * longitud `n` es `PESOS[n - i - 1]`.
 */
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const;

/**
 * Calcula el dígito de verificación de un número de identificación mediante
 * el checksum módulo-11 del NIT colombiano.
 *
 * Regla de negocio: el DV solo aplica a números puramente numéricos. Si el
 * número está vacío, contiene caracteres no numéricos (ej. un pasaporte
 * alfanumérico) o excede el rango de la tabla de pesos, retorna `'0'`.
 */
export function calcularDigitoVerificacion(numeroIdentificacion: string): string {
  const numero = numeroIdentificacion?.trim() ?? '';
  if (numero === '' || !/^\d+$/.test(numero) || numero.length > PESOS.length) {
    return '0';
  }

  let suma = 0;
  for (let i = 0; i < numero.length; i++) {
    suma += Number(numero.charAt(i)) * PESOS[numero.length - i - 1];
  }

  const residuo = suma % 11;
  return residuo > 1 ? String(11 - residuo) : String(residuo);
}
