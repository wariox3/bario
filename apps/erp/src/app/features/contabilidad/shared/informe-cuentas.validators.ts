import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { toIsoDate } from '@reddoc/core';

/**
 * Valida que `desde` no sea posterior a `hasta` → error `rangoInvertido`.
 *
 * Se aplica al `FormGroup` (no a un control) porque necesita los dos valores.
 */
export function rangoFechas(desde: string, hasta: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null =>
    compararRango(group, desde, hasta).rangoInvertido ? { rangoInvertido: true } : null;
}

/**
 * Como `rangoFechas`, más la exigencia de que ambas fechas caigan en el **mismo
 * año** → error `anioDistinto`.
 *
 * Es una regla contable, no una arbitrariedad: el saldo anterior se calcula
 * contra la apertura del ejercicio, así que un rango a caballo entre dos años
 * daría un informe que no cuadra. La usa el balance de prueba; los auxiliares
 * del ERP anterior solo validaban el orden.
 */
export function rangoFechasMismoAnio(desde: string, hasta: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const { rangoInvertido, anioDistinto } = compararRango(group, desde, hasta);
    if (rangoInvertido) return { rangoInvertido: true };
    if (anioDistinto) return { anioDistinto: true };
    return null;
  };
}

/**
 * Compara los dos extremos del rango. Devuelve las dos banderas de una vez para
 * que los validadores de arriba solo decidan cuál reportar.
 */
function compararRango(
  group: AbstractControl,
  desde: string,
  hasta: string,
): { rangoInvertido: boolean; anioDistinto: boolean } {
  const sinError = { rangoInvertido: false, anioDistinto: false };

  const inicio = group.get(desde)?.value as Date | null;
  const fin = group.get(hasta)?.value as Date | null;
  if (!inicio || !fin) return sinError;

  // Compara por fecha ISO, no por timestamp: los datepicker traen la hora del
  // momento de selección y dos fechas del mismo día no serían iguales.
  const isoInicio = toIsoDate(inicio);
  const isoFin = toIsoDate(fin);
  if (!isoInicio || !isoFin) return sinError;

  return {
    rangoInvertido: isoInicio > isoFin,
    anioDistinto: inicio.getFullYear() !== fin.getFullYear(),
  };
}
