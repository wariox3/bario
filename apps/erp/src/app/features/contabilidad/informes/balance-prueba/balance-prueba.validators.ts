import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { toIsoDate } from '@reddoc/core';

/**
 * Validador **a nivel de formulario** del rango de fechas del balance.
 *
 * Dos reglas, ambas del informe original:
 *  - `fecha_desde` no puede ser posterior a `fecha_hasta` → `rangoInvertido`.
 *  - Ambas deben caer en el **mismo año** → `anioDistinto`. Es una regla
 *    contable, no una arbitrariedad: el saldo anterior se calcula contra la
 *    apertura del ejercicio, así que un rango a caballo entre dos años daría
 *    un balance que no cuadra.
 *
 * Se aplica al `FormGroup` (no a un control) porque necesita los dos valores.
 * Cuando lleguen los demás informes contables —que comparten estos parámetros—
 * conviene subirlo a `features/contabilidad/shared/`.
 */
export function rangoFechasMismoAnio(desde: string, hasta: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const inicio = group.get(desde)?.value as Date | null;
    const fin = group.get(hasta)?.value as Date | null;
    if (!inicio || !fin) return null;

    // Compara por fecha ISO, no por timestamp: los datepicker traen la hora del
    // momento de selección y dos fechas del mismo día no serían iguales.
    const isoInicio = toIsoDate(inicio);
    const isoFin = toIsoDate(fin);
    if (!isoInicio || !isoFin) return null;

    if (isoInicio > isoFin) return { rangoInvertido: true };
    if (inicio.getFullYear() !== fin.getFullYear()) return { anioDistinto: true };
    return null;
  };
}
