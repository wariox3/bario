/**
 * Totales del cruce entre el aporte y las nóminas del contrato, y el cruce de
 * cada línea con su nómina.
 *
 * Módulo puro, testeado en `nominas-contrato.totales.spec.ts`. El ERP anterior
 * repetía diez métodos `calcularTotalX()` idénticos salvo el campo; acá es una
 * función que recibe qué campos sumar.
 */
import { toFiniteNumber } from '@reddoc/core';
import type {
  LineaConDocumento,
  LineaNominaDelContrato,
  NominaDelContrato,
} from './nominas-contrato.model';

/** Suma un campo a lo largo de las filas. Lo no numérico cuenta como cero. */
export function sumar<T>(filas: readonly T[], campo: keyof T): number {
  return filas.reduce((suma, fila) => suma + (toFiniteNumber(fila[campo]) ?? 0), 0);
}

/**
 * Suma varios campos de una vez y devuelve el mapa `campo → total`.
 *
 * Recorre las filas una sola vez por campo pedido; con los pocos registros que
 * tiene un contrato en un periodo, la claridad vale más que el recorrido único.
 */
export function totalesDe<T, K extends keyof T>(
  filas: readonly T[],
  campos: readonly K[],
): Record<K, number> {
  const totales = {} as Record<K, number>;
  for (const campo of campos) totales[campo] = sumar(filas, campo);
  return totales;
}

/**
 * Le pone a cada línea el tipo y el número de su nómina, cruzando por el id del
 * documento contra las nóminas ya cargadas. El detalle no los trae, y pedirlos
 * aparte sería una consulta más por algo que ya está en pantalla.
 *
 * Una línea cuya nómina no vino (no debería pasar: las dos consultas usan el
 * mismo filtro) queda con los dos campos en `null` y se pinta con raya.
 */
export function conDocumento(
  lineas: readonly LineaNominaDelContrato[],
  nominas: readonly NominaDelContrato[],
): LineaConDocumento[] {
  const porId = new Map(nominas.map((nomina) => [nomina.id, nomina]));
  return lineas.map((linea) => {
    const nomina = linea.documento != null ? porId.get(linea.documento) : undefined;
    return {
      ...linea,
      documento_tipo_nombre: nomina?.documento_tipo_nombre ?? null,
      documento_numero: nomina?.numero ?? null,
    };
  });
}
